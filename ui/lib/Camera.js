import EventEmitter from 'events';
import API from './API';
import PTZPosition from './PTZPosition';

export default class Camera extends EventEmitter {
	#name;
	#videoPath;
	#retainHours;
	#api;
	#capabilities;
	#thumb;
	#segments;
	#events;
	constructor(name, videoPath, retainHours) {
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');
		if (typeof videoPath !== 'string')
			throw new TypeError('videoPath must be a string.');
		if (!Number.isInteger(retainHours))
			throw new TypeError('retainHours must be an integer.');

		super();

		this.#name = name;
		this.#videoPath = videoPath;
		this.#retainHours = retainHours;
	}
	get name() {
		return this.#name;
	}
	get nameSanitized() {
		return this.name.replace(/[^a-zA-Z0-9]+/g, '_');
	}
	get videoPath() {
		return this.#videoPath;
	}
	get retainHours() {
		return this.#retainHours;
	}
	get api() {
		return this.#api;
	}
	set api(v) {
		if (!(v instanceof API))
			throw new TypeError('api must be an API object.');
		this.#api = v;
	}
	async updateThumb() {
		this.#thumb = await this.api.getThumb(this);
	}
	get thumb() {
		return this.#thumb;
	}
	async updateSegments() {
		this.#segments = await this.api.getSegments(this);
	}
	get segments() {
		return this.#segments;
	}
	async updateEvents() {
		this.#events = await this.api.getMotion(this, this.segments.items?.[0].date);
	}
	get events() {
		return this.#events;
	}
	async getCapabilities() {
		this.#capabilities = await this.api.getCapabilities(this);
	}
	get capabilities() {
		return this.#capabilities;
	}
	async setPTZPosition(position) {
		if(!(position instanceof PTZPosition))
			throw new TypeError('position must be a Position object.');
		return await this.api.setPTZPosition(position, this);
	}
	async reboot() {
		return await this.api.reboot(this);
	}
	toJSON() {
		return {
			name: this.name,
			videoPath: this.videoPath,
			retainHours: this.retainHours
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.name,
			config.videoPath,
			config.retainHours
		);
	}
}
