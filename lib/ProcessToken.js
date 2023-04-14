export default class ProcessToken {
	#pid;
	#name;
	constructor(pid, name) {
		if (!Number.isInteger(pid))
			throw new TypeError('pid must be an integer.');
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');

		this.#pid = pid;
		this.#name = name;
	}
	get pid() {
		return this.#pid;
	}
	get name() {
		return this.#name;
	}
}
