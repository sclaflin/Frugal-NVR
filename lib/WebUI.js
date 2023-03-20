import { Database } from 'sqlite';
import express from 'express';
import cors from 'cors';
import Cameras from './Cameras.js';
import { getPids, getStats } from './Util.js';

export default class WebUI {
	#port;
	#app;
	#db;
	#server;
	#cameras = [];
	constructor(port) {
		if(!Number.isInteger(port))
			throw new TypeError('port must be an Integer.');
		
		this.#port = port;
		this.#app = express();
		
		this.#app.use(cors());
		this.#app.use('/web', express.static('web'));

		this.#app.get('/', async(req, res) => {
			res.redirect('/web');
		});
		this.#app.get('/stats', async(req, res) => {
			try {
				return res.json(await getStats(...await getPids()));
			}
			catch(err) {
				console.error(err);
				if(!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/generate-thumbs', async(req, res) => {
			res.json(this.cameras.items.length > 0 && this.cameras.items[0].generateThumbs);
		});
		this.#app.get('/cameras', async (req, res) => {
			res.json(this.cameras);
		});
		this.#app.get('/camera/:name', async(req, res) => {
			const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
			if(!camera)
				return res.status(404).json('Camera not found.');
			return res.json(camera);
		});
		this.#app.get('/camera/:name/thumb', async(req, res) => {
			const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
			if(!camera)
				return res.status(404).json('Camera not found.');
			res.contentType('image/jpeg');
			return res.send(camera.thumb);
		});
		this.#app.get('/camera/:name/segments', async(req, res) => {
			const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
			if(!camera)
				return res.status(404).json('Camera not found.');
			await camera.segments.load();
			return res.json(camera.segments);
		});
		this.#app.get('/camera/:name/segments/bytes', async(req, res) => {
			const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
			if(!camera)
				return res.status(404).json('Camera not found.');
			return res.json(await camera.segments.diskBytes());
		});
		this.#app.get('/camera/:name/motion/:date', async(req, res) => {
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if(!camera)
					return res.status(404).json('Camera not found.');
				const date = Number(req.params.date);
				if(isNaN(date))
					return res.status(400).json('Invalid milliseconds.');
				return res.json(await camera.getMotionEvents(date, Math.round(Date.now() / 1000)));
			}
			catch(err) {
				console.error(err);
				if(!res.headersSent)
					res.status(500).json(err.message);
			}
		});
		this.#app.get('/camera/:name/clip/:start/:stop', async(req, res) => {
			let clip;
			try {
				const camera = this.cameras.items.find(camera => camera.nameSanitized === req.params.name);
				if(!camera)
					return res.status(404).json('Camera not found.');
				const start = Number(req.params.start);
				const stop = Number(req.params.stop);
				if(isNaN(start) || isNaN(stop))
					return res.status(400).json('Invalid seconds.');
				clip = await camera.segments.clip(start, stop);
				await new Promise((resolve, reject) => {
					res.sendFile(clip.path, err => {
						if(err) return reject(err);
						resolve();
					});
				});
			}
			catch(err) {
				console.error(err);
				if(!res.headersSent)
					res.status(500).json(err.message);
			}
			finally {
				await clip?.delete();
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
		if(!(v instanceof Database))
			throw new TypeError('db must be a sqlite.Database object.');
		this.#db = v;
	}
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if(!(v instanceof Cameras))
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
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.port
		);
	}
}