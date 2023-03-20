export default class MemStat {
	#free;
	#total;
	constructor(free, total) {
		if (!Number.isInteger(free))
			throw new TypeError('free must be an integer.');
		if (!Number.isInteger(total))
			throw new TypeError('total must be an integer.');
		this.#free = free;
		this.#total = total;
	}
	get free() {
		return this.#free;
	}
	get total() {
		return this.#total;
	}
	static fromObject(obj) {
		if (obj === null || typeof obj !== 'object')
			throw new TypeError('obj must be an object.');
		return new this(
			obj.free,
			obj.total
		);
	}
}
