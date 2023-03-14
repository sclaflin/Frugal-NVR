export default class Segment {
	#path;
	#date;
	constructor(path, date) {
		if(typeof path !== 'string')
			throw new TypeError('path must be a string.');
		if(!Number.isInteger(date))
			throw new TypeError('date must be an integer.');

		this.#path = path;
		this.#date = date;
	}
	get path() {
		return this.#path;
	}
	get date() {
		return this.#date;
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.path,
			config.date
		);
	}
}