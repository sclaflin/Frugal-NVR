import Iterable from './Iterable.js';

export default class WebSocketRequest {
	#command;
	#args;
	constructor(command, args) {
		if(typeof command !== 'string')
			throw new TypeError('command must be a string.');
		if(!(args instanceof Iterable))
			throw new TypeError('args must be an Iterable object.');

		this.#command = command;
		this.#args = args;
	}	
	get command() {
		return this.#command;
	}
	get args() {
		return this.#args;
	}
	toJSON() {
		return {
			type: this.constructor.name,
			command: this.command,
			args: this.args
		};
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.command,
			config.args || new Iterable()
		);
	}
}
