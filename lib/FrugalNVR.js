import sqlite3 from 'sqlite3';
import { open as openDb, Database } from 'sqlite';
import NodeMediaServer from 'node-media-server';
import deepmerge from 'deepmerge';
import Cameras from './Cameras.js';
import Camera from './Camera.js';
import WebUI from './WebUI.js';
import * as constants from './constants.js';

export default class FrugalNVR {
	#started = false;
	#cameras = [];
	#db;
	#webUI;
	#nodeMediaServer;
	#pruneTimeout;

	constructor(cameras, db, webUI, nodeMediaServer) {
		if(!(cameras instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');
		if(!(db instanceof Database))
			throw new TypeError('db must be a sqlite.Database object.');
		if(webUI && !(webUI instanceof WebUI))
			throw new TypeError('webUI must be a WebUI object.');
		if(!(nodeMediaServer instanceof NodeMediaServer))
			throw new TypeError('nodeMediaServer must be a NodeMediaServer object.');
		
		this.#cameras.push(...cameras);
		this.#db = db;
		this.#webUI = webUI || null;
		this.#nodeMediaServer = nodeMediaServer;
	}
	get started() {
		return this.#started;
	}
	get cameras() {
		return this.#cameras.slice();
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
	schedulePrune() {
		if(this.#pruneTimeout)
			return;
		const nextHour = new Date();
		nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

		this.#pruneTimeout = setTimeout(async () => {
			try {
				this.#pruneTimeout = null;
				for(const camera of this.cameras) {
					await camera.pruneData();
					await camera.segments.prune();
				}
			}
			catch(err) {
				console.error('Scheduled prune failure: ', err.stack);
			}
			finally {
				this.schedulePrune();
			}
		}, nextHour.getTime() - Date.now());
	}
	cancelPrune() {
		clearTimeout(this.#pruneTimeout);
	}
	async start() {
		this.#started = true;
		this.schedulePrune();
		this.nodeMediaServer.run();
		await this.webUI?.start();
		for(const camera of this.cameras)
			camera.start();
	}
	async stop() {
		this.#started = false;
		this.cancelPrune();
		for(const camera of this.cameras)
			camera.stop();
		await this.webUI?.stop();
		this.nodeMediaServer.stop();
	}
	static async fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		const videoPath = config?.videoPath || constants.DEFAULT_VIDEO_PATH;
		const retainHours = config?.retainHours || constants.DEFAULT_RETAIN_HOURS;
		const dbPath = config?.dbPath || constants.DEFAULT_DB_PATH;
		const enableWebUI = typeof config?.webUI?.enable === 'boolean' ?
			config?.webUI?.enable :
			constants.DEFAULT_ENABLE_WEB_UI;
		const enableOverview = typeof config?.webUI?.overview?.enable === 'boolean' ?
			config?.webUI?.overview?.enable :
			true;
		const overviewStillsPath = config?.webUI?.overview?.stillsPath || constants.DEFAULT_STILLS_PATH;
		
		// open the database
		const db = await openDb({
			filename: `${dbPath}/${constants.DB_FILENAME}`,
			driver: sqlite3.Database
		});

		// run the migrations
		await db.migrate({
			migrationsPath: constants.DB_MIGRATION_PATH
		});

		//create the cameras
		const cameras = new Cameras();
		cameras.add(...await Promise.all(config.cameras.map(async v => {
			// combine global onvif with camera onvif
			v.onvif = {
				...config.onvif,
				...v.onvif
			};
			const camera = await Camera.fromObject({
				generateThumbs: enableOverview,
				retainHours,
				videoPath,
				stillsPath: overviewStillsPath,
				...v
			});
			camera.db = db;

			return camera;
		})));

		// create the webUI, if required
		let webUI;
		if(enableWebUI) {
			webUI = WebUI.fromObject({
				...constants.WEB_UI_CONFIG,
				...config?.webUI
			});
			webUI.db = db;
			webUI.cameras = cameras;
		}

		const nms = new NodeMediaServer(
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