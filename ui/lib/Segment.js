export default class Segment {
	#path;
	#date;
	#duration;
	#truncated;
	constructor(path, date, duration, truncated) {
		if (typeof path !== 'string')
			throw new TypeError('path must be a string.');
		if (!Number.isInteger(date))
			throw new TypeError('date must be an integer.');
		if (!Number.isInteger(duration))
			throw new TypeError('duration must be an integer.');
		if (typeof truncated !== 'boolean')
			throw new TypeError('truncated must be a boolean.');

		this.#path = path;
		this.#date = date;
		this.#duration = duration;
		this.#truncated = truncated;
	}
	get path() {
		return this.#path;
	}
	get date() {
		return this.#date;
	}
	get duration() {
		return this.#duration;
	}
	get truncated() {
		return this.#truncated;
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.path,
			config.date,
			config.duration,
			config.truncated
		);
	}
}
