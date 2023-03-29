export default class WebSocketResponse {
	#data;
	constructor(data) {
		this.#data = data;
	}
	get data() {
		return this.#data;
	}
	toJSON() {
		return {
			type: this.constructor.name,
			data: this.data
		};
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'boolean')
			throw new TypeError('config must be a boolean.');
		return new this(
			config.data
		);
	}
}
