import EventEmitter from 'events';
import API from './API';
import MotionEvents from '../../lib/MotionEvents';
import MotionEvent from '../../lib/MotionEvent';
import Segment from './Segment';
import Segments from './Segments';

export default class Camera extends EventEmitter {
	#name;
	#videoPath;
	#retainHours;
	#api;
	#capabilities;
	#thumb;
	#segments;
	#activeMotion = false;
	#motionEvents;
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
		this.#segments = new Segments();
		this.#motionEvents = new MotionEvents();
		this.#capabilities = [];
		this.motionEvents.on('add', (...motionEvents) => {
			if(motionEvents.find(motionEvent => motionEvent.stop === null)) {
				this.#activeMotion = true;
				this.emit('motionStart', this);
			}
		});
		this.motionEvents.on('stop', () => {
			this.#activeMotion = false;
			this.emit('motionStop', this);
		});
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
	get thumb() {
		return this.#thumb;
	}
	set thumb(v) {
		if (typeof v !== 'string')
			throw new TypeError('thumb must be a string.');
		this.#thumb = v;
		this.emit('thumb');
	}
	get segments() {
		return this.#segments;
	}
	get motionEvents() {
		return this.#motionEvents;
	}
	get capabilities() {
		return this.#capabilities;
	}
	get activeMotion() {
		return this.#activeMotion;
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
		const camera = new this(
			config.name,
			config.videoPath,
			config.retainHours
		);
		camera.segments.add(...config.segments.map(v => Segment.fromObject(v)));
		camera.motionEvents.add(...config.motionEvents.map(v => MotionEvent.fromObject(v)));
		camera.capabilities.push(...config.capabilities);
		return camera;
	}
}
