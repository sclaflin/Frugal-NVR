export default class CPUStat {
	#cores;

	constructor(cores) {
		if (!Number.isInteger(cores))
			throw new TypeError('cores must be an integer.');

		this.#cores = cores;
	}
	get cores() {
		return this.#cores;
	} static fromObject(obj) {
		if (obj === null || typeof obj !== 'object')
			throw new TypeError('obj must be an object.');
		return new this(
			obj.cores
		);
	}
}
