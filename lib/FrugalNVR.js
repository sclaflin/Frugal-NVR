import sqlite3 from 'sqlite3';
import { open as openDb, Database } from 'sqlite';
import deepmerge from 'deepmerge';
import FrugalNodeMediaServer from './FrugalNodeMediaServer.js';
import Cameras from './Cameras.js';
import Camera from './Camera.js';
import WebUI from './WebUI.js';
import WebSocketEvent from './WebSocketEvent.js';
import * as constants from './constants.js';

export default class FrugalNVR {
	#started = false;
	#cameras;
	#db;
	#webUI;
	#nodeMediaServer;
	#pruneTimeout;
	#pids = [process.pid];
	#processingSegmentUpdates = false;
	#segmentUpdateQueue = [];
	#processingSegmentRepairs = false;
	#segmentRepairQueue = [];

	constructor(cameras, db, webUI, nodeMediaServer) {
		if (!(cameras instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');
		if (!(db instanceof Database))
			throw new TypeError('db must be a sqlite.Database object.');
		if (webUI && !(webUI instanceof WebUI))
			throw new TypeError('webUI must be a WebUI object.');
		if (!(nodeMediaServer instanceof FrugalNodeMediaServer))
			throw new TypeError('nodeMediaServer must be a FrugalNodeMediaServer object.');

		this.#cameras = cameras;
		this.#db = db;
		this.#webUI = webUI || null;
		this.#nodeMediaServer = nodeMediaServer;
		this.webUI.pids = this.#pids;
		this.cameras.on('processStart', pid => this.#pids.push(pid));
		this.cameras.on('processStop', pid => this.#pids.splice(this.#pids.indexOf(pid), 1));
		this.cameras.on('segmentUpdate', segment => {
			if (this.#segmentUpdateQueue.indexOf(segment) !== -1)
				return;
			this.#segmentUpdateQueue.push(segment);
			this.processSegmentUpdates();
		});
		this.cameras.on('segmentRepair', segment => {
			if (this.#segmentRepairQueue.indexOf(segment) !== -1)
				return;
			this.#segmentRepairQueue.push(segment);
			this.processSegmentRepairs();
		});
	}
	get started() {
		return this.#started;
	}
	get cameras() {
		return this.#cameras;
	}
	get db() {
		return this.#db;
	}
	get webUI() {
		return this.#webUI;
	}
	get nodeMediaServer() {
		return this.#nodeMediaServer;
	}
	async processSegmentUpdates() {
		// bail if we're already processing updates or repairs
		if (this.#processingSegmentUpdates || this.#processingSegmentRepairs)
			return;
		this.#processingSegmentUpdates = true;
		while (this.#segmentUpdateQueue.length > 0) {
			const segment = this.#segmentUpdateQueue.shift();
			try {
				console.log(`Updating segment ${segment.path}. ${this.#segmentUpdateQueue.length} left in queue.`);
				await segment.getMediaInfo();
				await segment.getBytes();
				await segment.upsert();
				this.webUI.sendEvent(WebSocketEvent.fromObject({
					name: 'segment.update',
					data: segment
				}));
			}
			catch (err) {
				console.error(`Failed to update ${segment?.path}: ${err.stack}`);
			}
		}
		this.#processingSegmentUpdates = false;
	}
	async processSegmentRepairs() {
		if (this.#processingSegmentRepairs) return;
		this.#processingSegmentRepairs = true;
		while (this.#segmentRepairQueue.length > 0) {
			const segment = this.#segmentRepairQueue.shift();
			try {
				console.log(`Repairing segment ${segment.path}. ${this.#segmentRepairQueue.length} left in queue.`);
				// update the mediainfo for this segment
				await segment.getMediaInfo();
				// still truncated?
				if(segment.truncated)
					await segment.repair();
				// ship it!
				this.#segmentUpdateQueue.push(segment);
			}
			catch (err) {
				console.error(`Failed to repair ${segment?.path}: ${err.stack}`);
			}
		}
		this.#processingSegmentRepairs = false;
		this.processSegmentUpdates();
	}
	schedulePrune() {
		if (this.#pruneTimeout)
			return;
		const nextHour = new Date();
		nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

		this.#pruneTimeout = setTimeout(async () => {
			try {
				this.#pruneTimeout = null;
				for (const camera of this.cameras.items) {
					await camera.pruneData();
					await camera.segments.prune();
				}
			}
			catch (err) {
				console.error('Scheduled prune failure: ', err.stack);
			}
			finally {
				this.schedulePrune();
			}
		}, nextHour.getTime() - Date.now());
	}
	cancelPrune() {
		clearTimeout(this.#pruneTimeout);
		this.#pruneTimeout = null;
	}
	async start() {
		this.#started = true;
		this.schedulePrune();
		this.nodeMediaServer.run();
		await this.webUI?.start();
		await Promise.all(this.cameras.items.map(camera => camera.start()));
	}
	async stop() {
		this.#started = false;
		this.#segmentUpdateQueue.length = 0;
		this.#segmentRepairQueue.length = 0;
		this.cancelPrune();
		for (const camera of this.cameras.items)
			camera.stop();
		await this.webUI?.stop();
		this.nodeMediaServer.stop();
		await this.db.close();
	}
	static async fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		// open the database
		const db = await openDb({
			filename: `${config?.dbPath || constants.DEFAULT_DB_PATH}/${constants.DB_FILENAME}`,
			driver: sqlite3.Database
		});

		// run the migrations
		await db.migrate({
			migrationsPath: constants.DB_MIGRATION_PATH
		});

		//create the cameras
		const cameras = new Cameras();
		for (const v of config.cameras) {
			console.log(`Initializing ${v.name}...`);
			const camera = await Camera.fromObject(deepmerge(
				{
					videoPath: config?.videoPath,
					retainHours: config?.retainHours,
					generateThumbs: config?.webUI?.overview?.enable,
					thumbnailWidth: config?.webUI?.overview?.thumbnailWidth,
					segmentUpdateFrequency: config?.segmentUpdateFrequency,
					onvif: config?.onvif
				},
				v
			));
			camera.db = db;
			cameras.add(camera);
		}

		// create the webUI, if required
		let webUI;
		if (!!config?.webUI?.enable === 'boolean' ?
			config?.webUI?.enable :
			constants.WEB_UI_DEFAULT_ENABLE
		) {
			webUI = WebUI.fromObject({
				port: config?.webUI?.port
			});
			webUI.db = db;
			webUI.cameras = cameras;
			// assign the webUI to each camera
			cameras.items.forEach(camera => camera.webUI = webUI);
		}

		const nms = new FrugalNodeMediaServer(
			deepmerge(constants.NMS_CONFIG, config.mediaServer)
		);

		return new this(
			cameras,
			db,
			webUI,
			nms
		);
	}
}
