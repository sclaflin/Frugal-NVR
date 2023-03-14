export default class Config {
	#apiUrl;
	#streamUrl;
	constructor(apiUrl, streamUrl) {
		if(!(apiUrl instanceof URL))
			throw new TypeError('apiUrl must be a URL object.');
		if(!(streamUrl instanceof URL))
			throw new TypeError('streamUrl must be a URL object.');

		this.#apiUrl = apiUrl;
		this.#streamUrl = streamUrl;
	}
	get apiUrl() {
		return this.#apiUrl;
	}
	get streamUrl() {
		return this.#streamUrl;
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			new URL(config.apiUrl),
			new URL(config.streamUrl)
		);
	}
}