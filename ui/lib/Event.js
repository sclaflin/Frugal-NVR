export default class Event {
	#start;
	#stop;
	constructor(start, stop) {
		if (!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		if (!Number.isInteger(stop))
			throw new TypeError('stop must be an integer.');

		this.#start = start;
		this.#stop = stop;
	}
	get start() {
		return this.#start;
	}
	get stop() {
		return this.#stop;
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
