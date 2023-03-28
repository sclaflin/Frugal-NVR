import { Database } from 'sqlite';
import express from 'express';
import cors from 'cors';
import * as constants from './constants.js';
import Cameras from './Cameras.js';
import { getPids, getStats } from './Util.js';

export default class WebUI {
	#port;
	#app;
	#db;
	#server;
	#cameras = [];
	constructor(port = constants.WEB_UI_DEFAULT_PORT) {
		if (!Number.isInteger(port))
			throw new TypeError('port must be an Integer.');

		this.#port = port;
		this.#app = express();

		this.#app.use(cors());
		this.#app.use('/web', express.static('web'));

		this.#app.get('/', async (req, res) => {
			res.redirect('/web');
		});
		this.#app.get('/stats', async (req, res) => {
			try {
				const stats = await getStats(...await getPids());
				stats.cams = this.cameras.items.map(camera => ({
					bytes: camera.segments.bytes,
					segments: camera.segments.items.length,
					duration: camera.segments.duration
				}));
				return res.json(stats);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/generate-thumbs', async (req, res) => {
			try {
				res.json(this.cameras.items.length > 0 && this.cameras.items[0].generateThumbs);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/cameras', async (req, res) => {
			try {
				res.json(this.cameras);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name', async (req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				return res.json(camera);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name/thumb', async (req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				res.contentType('image/jpeg');
				return res.send(camera.thumb);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name/segments', async (req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				return res.json(camera.segments);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name/motion', async (req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				
				return res.json(await camera.getMotionEvents());
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name/clip/:start/:stop', async (req, res) => {
			let clip;
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				const start = Number(req.params.start);
				const stop = Number(req.params.stop);
				if (isNaN(start) || isNaN(stop))
					return res.status(400).json('Invalid seconds.');
				clip = await camera.segments.clip(constants.VIDEO_CONTAINER_FLV, start, stop);
				await new Promise((resolve, reject) => {
					res.sendFile(clip.path, err => {
						if (err) return reject(err);
						resolve();
					});
				});
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
			finally {
				await clip?.delete();
			}
		});
		this.#app.get('/camera/:name/download/:start/:stop', async (req, res) => {
			let clip;
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				const start = Number(req.params.start);
				const stop = Number(req.params.stop);
				if (isNaN(start) || isNaN(stop))
					return res.status(400).json('Invalid seconds.');
				clip = await camera.segments.clip(constants.VIDEO_CONTAINER_MP4, start, stop);
				await new Promise((resolve, reject) => {
					res.sendFile(clip.path, err => {
						if (err) return reject(err);
						resolve();
					});
				});
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
			finally {
				await clip?.delete();
			}
		});
		this.#app.put('/camera/:name/ptz/position', express.json(), async(req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				const message = await new Promise((resolve, reject) => {
					camera.cam.relativeMove(req.body, (err, message) => {
						if(err) return reject(err);
						resolve(message);
					});
				});
				return res.json(message);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name/capabilities', async(req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				return res.json(Object.keys(camera.cam.capabilities));
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name/reboot', async(req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if (!camera)
					return res.status(404).json('Camera not found.');
				const message = await new Promise((resolve, reject) => {
					camera.cam.systemReboot((err, message) => {
						if(err) return reject(err);
						resolve(message);
					});
				});
				return res.json(message);
			}
			catch (err) {
				console.error(err);
				if (!res.headersSent)
					res.status(500).json(err.message);
			}
		});
	}
	get port() {
		return this.#port;
	}
	get db() {
		return this.#db;
	}
	set db(v) {
		if (!(v instanceof Database))
			throw new TypeError('db must be a sqlite.Database object.');
		this.#db = v;
	}
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if (!(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');

		this.#cameras = v;
	}
	get app() {
		return this.#app;
	}
	async start() {
		await new Promise(resolve => {
			this.#server = this.app.listen(this.port, resolve);
			console.log(`Web UI listening on port ${this.port}`);
		});
	}
	async stop() {
		await new Promise(resolve => this.#server.close(resolve));
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.port
		);
	}
}
