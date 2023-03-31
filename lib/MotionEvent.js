export default class MotionEvent {
	#start;
	#stop;
	constructor(start, stop) {
		this.start = start;
		this.stop = stop;
	}
	get start() {
		return this.#start;
	}
	set start(v) {
		if (!Number.isInteger(v))
			throw new TypeError('start must be an integer.');
		this.#start = v;
	}
	get isActive() {
		return !this.stop;
	}
	get stop() {
		return this.#stop;
	}
	set stop(v) {
		if (v !== null && !Number.isInteger(v))
			throw new TypeError('stop must be an integer.');
		this.#stop = v;
	}
	toJSON() {
		return {
			start: this.start,
			stop: this.stop
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an object.');
		return new this(
			config.start,
			config.stop
		);
	}
}
