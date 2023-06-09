function noop() { }
function randomString(length) {
	return [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
}

export default class WebSocketRequest {
	#command;
	#detail;
	#callback;
	#id;
	static get type() {
		return 'WebSocketRequest';
	}
	constructor(command, detail = {}, callback = noop, id = (randomString(32))) {
		if (typeof command !== 'string')
			throw new TypeError('command must be a string.');
		if (typeof detail !== 'object')
			throw new TypeError('detail must be an object.');
		if (typeof callback !== 'function')
			throw new TypeError('callback must be a function.');
		if (typeof id !== 'string')
			throw new TypeError('id must be a string.');

		this.#command = command;
		this.#detail = detail;
		this.#callback = callback;
		this.#id = id;
	}
	get command() {
		return this.#command;
	}
	get detail() {
		return this.#detail;
	}
	get callback() {
		return this.#callback;
	}
	get id() {
		return this.#id;
	}
	toJSON() {
		return {
			type: this.constructor.type,
			command: this.command,
			detail: this.detail,
			id: this.id
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.command,
			config.detail,
			config.callback,
			config.id
		);
	}
}
