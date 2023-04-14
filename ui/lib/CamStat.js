export default class CamStat {
	#bytes;
	#duration;
	#segments;

	constructor(bytes, duration, segments) {
		if (!Number.isInteger(bytes))
			throw new TypeError('bytes must be an integer.');
		if (!Number.isInteger(duration))
			throw new TypeError('duration must be an integer.');
		if (!Number.isInteger(segments))
			throw new TypeError('segments must be an integer.');

		this.#bytes = bytes;
		this.#duration = duration;
		this.#segments = segments;
	}
	get bytes() {
		return this.#bytes;
	}
	get duration() {
		return this.#duration;
	}
	get segments() {
		return this.#segments;
	}
	static fromObject(obj) {
		if (obj === null || typeof obj !== 'object')
			throw new TypeError('obj must be an object.');
		return new this(
			obj.bytes,
			obj.duration,
			obj.segments
		);
	}
}
