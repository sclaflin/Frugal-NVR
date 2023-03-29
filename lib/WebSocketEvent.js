export default class WebSocketEvent {
	#name;
	#data;
	constructor(name, data = null) {
		if(typeof name !== 'string')
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
			type: this.constructor.name,
			name: this.name,
			data: this.data
		};
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.name,
			config.data
		);
	}
}
