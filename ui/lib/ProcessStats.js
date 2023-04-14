import Iterable from '../../lib/Iterable';
import ProcessStat from './ProcessStat';

export default class ProcessStats extends Iterable {
	add(...items) {
		if (items.filter(item => !(item instanceof ProcessStat)) > 0)
			throw new TypeError('all arguments must be a ProcessStat object.');

		super.add(...items);
	}
	cpu(name) {
		return this.items
			.filter(v => !name || v.name === name)
			.map(v => v.cpu)
			.reduce((p, c) => p + c, 0);
	}
	memory(name) {
		return this.items
			.filter(v => !name || v.name === name)
			.map(v => v.memory)
			.reduce((p, c) => p + c, 0);
	}
	count(name) {
		return this.items
			.filter(v => !name || v.name === name)
			.length;
	}
	static fromArray(arr) {
		if (!Array.isArray(arr))
			throw new TypeError('arr must be an Array.');
		const stats = new this();
		stats.add(...arr.map(v => ProcessStat.fromObject(v)));
		return stats;
	}
}
