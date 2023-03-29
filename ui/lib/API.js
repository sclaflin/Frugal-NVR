import Camera from './Camera';
import HostStat from './HostStat';
import Segment from './Segment';
import Segments from './Segments';
import Event from './Event';
import Events from './Events';
import PTZPosition from './PTZPosition';

export default class API {
	#apiUrl;
	#webSocketUrl;
	#webSocket;
	constructor(apiUrl, webSocketUrl) {
		if (!(apiUrl instanceof URL))
			throw new TypeError('apiUrl must be a URL object.');
		if (!(webSocketUrl instanceof URL))
			throw new TypeError('webSocketUrl must be a URL object.');
		this.#apiUrl = apiUrl;
		this.#webSocketUrl = webSocketUrl;
		this.#webSocket = new WebSocket(this.webSocketUrl, 'frugal-nvr');
	}
	get apiUrl() {
		return this.#apiUrl;
	}
	get webSocketUrl() {
		return this.#webSocketUrl;
	}
	async getCameras() {
		const response = await fetch(`${this.apiUrl}cameras`);
		return await response.json();
	}
	async getStats() {
		const response = await fetch(`${this.apiUrl}stats`);
		return HostStat.fromObject(await response.json());
	}
	async generateThumbs() {
		const response = await fetch(`${this.apiUrl}generate-thumbs`);
		return await response.json();
	}
	async getSegments(camera) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/segments`);
		const segments = new Segments();
		segments.add(...(await response.json()).map(v => Segment.fromObject(v)));
		return segments;
	}
	async getThumb(camera) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/thumb`);
		return await URL.createObjectURL(await response.blob());
	}
	async getClip(camera, start, stop) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		if (!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		if (!Number.isInteger(stop))
			throw new TypeError('stop must be an integer.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/clip/${start}/${stop}`);
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
		return await URL.createObjectURL(await response.blob());
	}
	async getMotion(camera) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/motion`);
		const events = new Events();
		events.add(...(await response.json()).map(v => Event.fromObject(v)));
		return events;
	}
	async getCapabilities(camera) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/capabilities`);
		return await response.json();
	}
	async setPTZPosition(position, camera) {
		if(!(position instanceof PTZPosition))
			throw new TypeError('position must be a PTZPosition object.');
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const requestOptions = {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(position)
		};
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/ptz/position`, requestOptions);
		return await response.json();
	}
	async reboot(camera) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.apiUrl}camera/${camera.nameSanitized}/reboot`);
		return await response.json();
	}
}
