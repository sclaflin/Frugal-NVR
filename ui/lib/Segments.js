import Iterable from './Iterable';
import Segment from './Segment';

export default class Segments extends Iterable {
	add(...items) {
		if (items.filter(item => !(item instanceof Segment)) > 0)
			throw new TypeError('all arguments must be a Segment object.');

		super.add(...items);
	}
	get duration() {
		return this.items.reduce((p, c) => p + c.duration, 0);
	}
	get bytes() {
		return this.items.reduce((p, c) => p + c.bytes, 0);
	}
}
