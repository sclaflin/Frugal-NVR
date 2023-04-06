import { Database } from 'sqlite';
import express from 'express';
import cors from 'cors';
import http from 'http';
import websocket from 'websocket';
import * as constants from './constants.js';
import Cameras from './Cameras.js';
import { getStats } from './Util.js';
import WebSocketEvent from './WebSocketEvent.js';
import WebSocketRequest from './WebSocketRequest.js';
import WebSocketResponse from './WebSocketResponse.js';
import Logger from './Logger.js';
import ProcessToken from './ProcessToken.js';

export default class WebUI {
	#port;
	#app;
	#http;
	#wsServer;
	#webSockets = [];
	#db;
	#cameras = [];
	#processTokens = [];
	constructor(port = constants.WEB_UI_DEFAULT_PORT) {
		if (!Number.isInteger(port))
			throw new TypeError('port must be an Integer.');

		this.#port = port;
		this.#app = express();
		this.#http = http.createServer(this.#app);
		this.#wsServer = new websocket.server({
			httpServer: this.http,
			autoAcceptConnections: false
		});

		this.wsServer.on('request', async req => {
			try {
				//TODO: add websocket authentication
				const webSocket = req.accept('frugal-nvr', req.origin);
				this.#webSockets.push(webSocket);
				// send initial camera data
				this.sendEvent(WebSocketEvent.fromObject({
					name: 'cameras.init',
					data: this.cameras
				}), [webSocket]);

				webSocket.on('message', async message => {
					if (message.type === 'utf8')
						this.handleUTF8Message(webSocket, message);
				});
				webSocket.on('close', () => {
					const index = this.#webSockets.indexOf(webSocket);
					if(index >= 0)
						this.#webSockets.splice(index, 1);
				});
			}
			catch (err) {
				Logger.error(`Websocket request error: ${err.stack}`);
			}
		});

		this.#app.use(cors());
		this.#app.use('/web', express.static('web'));

		this.#app.get('/', async (req, res) => {
			res.redirect('/web');
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
				Logger.error(`Failed to create clip for ${req.params.name} ${req.params.start} - ${req.params.stop}: ${err.stack}`);
				if (!res.headersSent) {
					res.status(500).json(err.message);
				}
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
				Logger.error(`Failed to create download for ${req.params.name} ${req.params.start} - ${req.params.stop}: ${err.stack}`);
				if (!res.headersSent)
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
		if (!(v instanceof Database))
			throw new TypeError('db must be a sqlite.Database object.');
		this.#db = v;
	}
	get processTokens() {
		return this.#processTokens;
	}
	set processTokens(v) {
		if (!Array.isArray(v))
			throw new TypeError('processTokens must be an array.');
		if (v.filter(processToken => !(processToken instanceof ProcessToken)) > 0)
			throw new TypeError('all items of processTokens must be a ProcessToken object.');
		this.#processTokens = v;
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
	get http() {
		return this.#http;
	}
	get wsServer() {
		return this.#wsServer;
	}
	get webSockets() {
		return this.#webSockets;
	}
	async handleUTF8Message(webSocket, message) {
		let request;
		try {
			const obj = JSON.parse(message.utf8Data);
			if (obj.type === 'WebSocketRequest') {
				request = WebSocketRequest.fromObject(obj);
				switch (request.command) {
					case 'camera.getThumb': {
						const camera = this.cameras.items.find(v => v.name === request.detail.name);
						const response = WebSocketResponse.fromObject({
							id: request.id,
							data: `data:image/jpeg;base64,${camera?.thumb?.toString('base64')}`
						});
						webSocket.sendUTF(JSON.stringify(response));
						break;
					}
					case 'camera.setPTZPosition': {
						const camera = this.cameras.items.find(v => v.name === request.detail.name);
						const response = WebSocketResponse.fromObject({
							id: request.id,
							data: await new Promise((resolve, reject) => {
								camera.cam.relativeMove(request.detail.position, (err, message) => {
									if (err) return reject(err);
									resolve(message);
								});
							})
						});
						webSocket.sendUTF(JSON.stringify(response));
						break;
					}
					case 'camera.reboot': {
						const camera = this.cameras.items.find(v => v.name === request.detail.name);
						const response = WebSocketResponse.fromObject({
							id: request.id,
							data: await new Promise((resolve, reject) => {
								camera.cam.systemReboot((err, message) => {
									if (err) return reject(err);
									resolve(message);
								});
							})
						});
						webSocket.sendUTF(JSON.stringify(response));
						break;
					}
					case 'frugal.getStats': {
						const stats = await getStats(...this.processTokens);
						stats.cams = this.cameras.items.map(camera => ({
							bytes: camera.segments.bytes,
							segments: camera.segments.items.length,
							duration: camera.segments.duration
						}));
						const response = WebSocketResponse.fromObject({
							id: request.id,
							data: stats
						});
						webSocket.sendUTF(JSON.stringify(response));
						break;
					}
					case 'frugal.generateThumbs': {
						const response = WebSocketResponse.fromObject({
							id: request.id,
							data: !!this.cameras.items[0]?.generateThumbs
						});
						webSocket.sendUTF(JSON.stringify(response));
						break;
					}
				}
			}
		}
		catch (err) {
			console.error(err);
			const response = WebSocketResponse.fromObject({
				id: request.id,
				error: err.message
			});
			webSocket.sendUTF(JSON.stringify(response));
		}
	}
	sendEvent(event, webSockets = this.webSockets) {
		if (!(event instanceof WebSocketEvent))
			throw new TypeError('event must be a WebSocketEvent object.');
		if (!Array.isArray(webSockets))
			throw new TypeError('webSockets must be an array.');
		if (webSockets.find(v => !(v instanceof websocket.connection)) > 0)
			throw new TypeError('all values must be a WebSocket.connection object.');
		for (const websocket of webSockets)
			websocket.sendUTF(JSON.stringify(event));
	}
	async start() {
		await new Promise(resolve => {
			this.http.listen(this.port, resolve);
			Logger.info(`Web UI listening on port ${this.port}`);
		});
	}
	async stop() {
		this.#wsServer.shutDown();
		await new Promise(resolve => this.http.close(resolve));
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.port
		);
	}
}
