export default class WebSocketEvent {
	#name;
	#data;
	static get type() {
		return 'WebSocketEvent';
	}
	constructor(name, data = null) {
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');

		this.#name = name;
		this.#data = data;
	}
	get name() {
		return this.#name;
	}
	get data() {
		return this.#data;
	}
	toJSON() {
		return {
			type: this.constructor.type,
			name: this.name,
			data: this.data
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.name,
			config.data
		);
	}
}
