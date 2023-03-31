export default class WebSocketResponse {
	#data;
	#id;
	#error;
	constructor(data, id, error = null) {
		if (typeof id !== 'string')
			throw new TypeError('id must be a string.');
		if (error !== null && typeof error !== 'string')
			throw new TypeError('error must be a string.');
		this.#data = data;
		this.#id = id;
		this.#error = error;
	}
	get data() {
		return this.#data;
	}
	get id() {
		return this.#id;
	}
	get error() {
		return this.#error;
	}
	toJSON() {
		return {
			type: this.constructor.name,
			data: this.data,
			id: this.id,
			error: this.error
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an object.');
		return new this(
			config.data,
			config.id,
			config.error
		);
	}
}
