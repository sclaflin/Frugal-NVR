export default class Segment {
	#name;
	#path;
	#date;
	#duration;
	#bytes;
	#truncated;
	#segmentId;
	constructor(name, path, date, duration = 0, bytes = 0, truncated = true, segmentId = null) {
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');
		if (typeof path !== 'string')
			throw new TypeError('path must be a string.');
		if (!Number.isInteger(date))
			throw new TypeError('date must be an integer.');

		this.#name = name;
		this.#path = path;
		this.#date = date;
		this.duration = duration;
		this.bytes = bytes;
		this.truncated = truncated;
		this.segmentId = segmentId;
	}
	get name() {
		return this.#name;
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
	set duration(v) {
		if (!Number.isInteger(v))
			throw new TypeError('duration must be an integer.');
		this.#duration = v;
	}
	get bytes() {
		return this.#bytes;
	}
	set bytes(v) {
		if (!Number.isInteger(v))
			throw new TypeError('bytes must be an integer.');
		this.#bytes = v;
	}
	get truncated() {
		return this.#truncated;
	}
	set truncated(v) {
		if (typeof v !== 'boolean')
			throw new TypeError('truncated must be a boolean.');
		this.#truncated = v;
	}
	get segmentId() {
		return this.#segmentId;
	}
	set segmentId(v) {
		if (v !== null && !Number.isInteger(v))
			throw new TypeError('segmentId must be an integer.');
		this.#segmentId = v;
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.name,
			config.path,
			config.date,
			config.duration,
			config.bytes,
			config.truncated,
			config.segmentId
		);
	}
}
