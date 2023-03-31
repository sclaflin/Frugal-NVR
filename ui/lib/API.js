import EventEmitter from 'events';
import Cameras from './Cameras';
import Camera from './Camera';
import Segment from './Segment';
import MotionEvent from '../../lib/MotionEvent';
import WebSocketRequest from '../../lib/WebSocketRequest';
import WebSocketResponse from '../../lib/WebSocketResponse';

export default class API extends EventEmitter {
	#apiUrl;
	#webSocketUrl;
	#cameras;
	#queuedRequests = [];
	#pendingRequests = [];
	#connected = false;
	#webSocket;

	constructor(apiUrl, webSocketUrl, cameras) {
		if (!(apiUrl instanceof URL))
			throw new TypeError('apiUrl must be a URL object.');
		if (!(webSocketUrl instanceof URL))
			throw new TypeError('webSocketUrl must be a URL object.');
		if (!(cameras instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');

		super();

		this.#apiUrl = apiUrl;
		this.#webSocketUrl = webSocketUrl;
		this.#cameras = cameras;
	}
	get apiUrl() {
		return this.#apiUrl;
	}
	get webSocketUrl() {
		return this.#webSocketUrl;
	}
	get cameras() {
		return this.#cameras;
	}
	async connect() {
		if (this.#connected)
			throw new Error('already connected');

		// loop until connected
		// eslint-disable-next-line no-constant-condition
		while (true) {
			this.#webSocket = new WebSocket(this.webSocketUrl, 'frugal-nvr');
			// delay returning until connected
			const connected = await new Promise((resolve) => {
				const handler = (event) => {
					this.#webSocket.removeEventListener('open', handler);
					this.#webSocket.removeEventListener('close', handler);
					resolve(event.type === 'open');
				};
				this.#webSocket.addEventListener('open', handler);
				this.#webSocket.addEventListener('close', handler);
			});
			if (connected) break;
			else await new Promise(resolve => setTimeout(resolve, 3000));
		}

		this.#connected = true;
		this.#queuedRequests.slice(0).forEach(request => {
			this.#queuedRequests.splice(this.#queuedRequests.indexOf(request), 1);
			this.#pendingRequests.push(request);
			this.#webSocket.send(JSON.stringify(request));
		});
		this.#webSocket.addEventListener('message', this.#handleMessage);
		this.#webSocket.addEventListener('close', this.#handleClose);
	}
	get connected() {
		return this.#connected;
	}
	#handleClose = async () => {
		this.#connected = false;
		this.#webSocket.removeEventListener('message', this.#handleMessage);
		this.#webSocket.removeEventListener('close', this.#handleClose);
		this.#webSocket = null;
		this.emit('disconnect');
		setTimeout(() => this.connect(), 3000);
	};
	#handleMessage = async (event) => {
		const obj = JSON.parse(event.data);
		if (obj.type === 'WebSocketEvent') {
			switch (obj.name) {
				case 'cameras.init':
					this.cameras.clear();
					this.cameras.add(...obj.data.map(v => Camera.fromObject(v)));
					break;
				case 'segment.update': {
					const camera = this.cameras.items.find(camera => camera.name === obj.data.name);
					const segment = camera.segments.items.find(segment => segment.segmentId === obj.data.segmentId);
					segment.bytes = obj.data.bytes;
					segment.duration = obj.data.duration;
					segment.truncated = obj.data.truncated;
					break;
				}
				case 'segment.add': {
					const segment = Segment.fromObject(obj.data);
					const camera = this.cameras.items.find(camera => camera.name === segment.name);
					camera.segments.add(segment);
					break;
				}
				case 'motionEvent.start': {
					const motionEvent = MotionEvent.fromObject({
						start: obj.data.date,
						stop: null
					});
					const camera = this.cameras.items.find(camera => camera.name === obj.data.name);
					camera.motionEvents.add(motionEvent);
					break;
				}
				case 'motionEvent.stop': {
					const camera = this.cameras.items.find(camera => camera.name === obj.data.name);
					const motionEvent = camera.motionEvents.items.slice(-1)[0];

					if (motionEvent.isActive)
						motionEvent.stop = obj.data.date;
					break;
				}
				case 'thumbnail.update': {
					const camera = this.cameras.items.find(camera => camera.name === obj.data.name);
					camera.thumb = obj.data.thumbnail;
					break;
				}
			}
		}
		else if (obj.type === 'WebSocketResponse') {
			const response = WebSocketResponse.fromObject(obj);
			const index = this.#pendingRequests.findIndex(v => v.id === response.id);
			if(index >= 0) {
				const request = this.#pendingRequests.splice(index, 1)[0];
				request.callback(response);
			}
		}
	};
	async sendRequest(request) {
		if (!(request instanceof WebSocketRequest))
			throw new TypeError('request must be a WebSocketRequest object.');
		if (!this.connected)
			this.#queuedRequests.push(request);
		else {
			this.#pendingRequests.push(request);
			this.#webSocket.send(JSON.stringify(request));
		}
	}
	async getClip(camera, start, stop) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		if (!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		if (!Number.isInteger(stop))
			throw new TypeError('stop must be an integer.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/clip/${start}/${stop}`);
		if (!response.ok)
			throw new Error(await response.json());
		return await URL.createObjectURL(await response.blob());
	}
	async getDownload(camera, start, stop) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		if (!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		if (!Number.isInteger(stop))
			throw new TypeError('stop must be an integer.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/download/${start}/${stop}`);
		if (!response.ok)
			throw new Error(await response.json());
		return await URL.createObjectURL(await response.blob());
	}
	async reboot(camera) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/reboot`);
		if (!response.ok)
			throw new Error(await response.json());
		return await response.json();
	}
}
