import Iterable from '../../lib/Iterable';
import CamStat from './CamStat';

export default class CamStats extends Iterable {
	add(...items) {
		if(items.filter(item => !(item instanceof CamStat)) > 0)
			throw new TypeError('all arguments must be a CamStat object.');
			
		super.add(...items);
	}
	get bytes() {
		return this.items
			.map(v => v.bytes)
			.reduce((p, c) => p + c, 0);
	}
	get duration() {
		return this.items
			.map(v => v.duration)
			.reduce((p, c) => p + c, 0);
	}
	get segments() {
		return this.items
			.map(v => v.segments)
			.reduce((p, c) => p + c, 0);
	}
	get count() {
		return this.items.length;
	}
	static fromArray(arr) {
		if(!Array.isArray(arr))
			throw new TypeError('arr must be an Array.');
		const stats = new this();
		stats.add(...arr.map(v => CamStat.fromObject(v)));
		return stats;
	}
}
