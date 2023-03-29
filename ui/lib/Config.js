export default class Config {
	#apiUrl;
	#webSocketUrl;
	#streamUrl;
	constructor(apiUrl, webSocketUrl, streamUrl) {
		if (!(apiUrl instanceof URL))
			throw new TypeError('apiUrl must be a URL object.');
		if (!(webSocketUrl instanceof URL))
			throw new TypeError('webSocketUrl must be a URL object.');
		if (!(streamUrl instanceof URL))
			throw new TypeError('streamUrl must be a URL object.');

		this.#apiUrl = apiUrl;
		this.#webSocketUrl = webSocketUrl;
		this.#streamUrl = streamUrl;
	}
	get apiUrl() {
		return this.#apiUrl;
	}
	get webSocketUrl() {
		return this.#webSocketUrl;
	}
	get streamUrl() {
		return this.#streamUrl;
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			new URL(config.apiUrl),
			new URL(config.webSocketUrl),
			new URL(config.streamUrl)
		);
	}
}
