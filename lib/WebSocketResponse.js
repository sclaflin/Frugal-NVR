export default class WebSocketResponse {
	#data;
	#id;
	#error;
	static get type() {
		return 'WebSocketResponse';
	}
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
			type: this.constructor.type,
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
