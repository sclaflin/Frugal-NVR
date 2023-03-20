import Camera from './Camera';
import HostStat from './HostStat';
import Segment from './Segment';
import Segments from './Segments';
import Event from './Event';
import Events from './Events';

export default class API {
	#url;
	constructor(url) {
		if(!(url instanceof URL))
			throw new TypeError('url must be a URL object.');
		this.#url = url;
	}
	get url() {
		return this.#url;
	}
	async getCameras() {
		const response = await fetch(`${this.url}cameras`);
		return await response.json();
	}
	async getStats() {
		const response = await fetch(`${this.url}stats`);
		return HostStat.fromObject(await response.json());
	}
	async generateThumbs() {
		const response = await fetch(`${this.url}generate-thumbs`);
		return await response.json();
	}
	async getSegments(camera) {
		if(!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.url}camera/${camera.nameSanitized}/segments`);
		const segments = new Segments();
		segments.add(...(await response.json()).map(v => Segment.fromObject(v)));
		return segments;
	}
	async getSegmentsSize(camera) {
		if(!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.url}camera/${camera.nameSanitized}/segments/bytes`);
		return await response.json();
	}
	async getThumb(camera) {
		if(!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		const response = await fetch(`${this.url}camera/${camera.nameSanitized}/thumb`);
		return await URL.createObjectURL(await response.blob());
	}
	async getClip(camera, start, stop) {
		if(!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		if(!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		if(!Number.isInteger(stop))
			throw new TypeError('stop must be an integer.');
		const response = await fetch(`${this.url}camera/${camera.nameSanitized}/clip/${start}/${stop}`);
		return await URL.createObjectURL(await response.blob());
	}
	async getMotion(camera, start) {
		if(!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		if(!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		const response = await fetch(`${this.url}camera/${camera.nameSanitized}/motion/${start}`);
		const events = new Events();
		events.add(...(await response.json()).map(v => Event.fromObject(v)));
		return events;
	}
}