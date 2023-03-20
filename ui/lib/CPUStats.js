import Iterable from './Iterable';
import CPUStat from './CPUStat';

export default class CPUStats extends Iterable {
	add(...items) {
		if (items.filter(item => !(item instanceof CPUStat)) > 0)
			throw new TypeError('all arguments must be a CPUStat object.');

		super.add(...items);
	}
	// cpu, us, sy, ni, id, wa, hi, si
	us() {
		return this.items
			.map(v => v.us)
			.reduce((p, c) => p + c, 0);
	}
	sy() {
		return this.items
			.map(v => v.sy)
			.reduce((p, c) => p + c, 0);
	}
	ni() {
		return this.items
			.map(v => v.ni)
			.reduce((p, c) => p + c, 0);
	}
	id() {
		return this.items
			.map(v => v.id)
			.reduce((p, c) => p + c, 0);
	}
	wa() {
		return this.items
			.map(v => v.wa)
			.reduce((p, c) => p + c, 0);
	}
	hi() {
		return this.items
			.map(v => v.hi)
			.reduce((p, c) => p + c, 0);
	}
	si() {
		return this.items
			.map(v => v.si)
			.reduce((p, c) => p + c, 0);
	}
	count() {
		return this.items.length;
	}
	static fromArray(arr) {
		if (!Array.isArray(arr))
			throw new TypeError('arr must be an Array.');
		const stats = new this();
		stats.add(...arr.map(v => CPUStat.fromObject(v)));
		return stats;
	}
}
