import Iterable from './Iterable.js';
import MotionEvent from './MotionEvent.js';

export default class MotionEvents extends Iterable {
	#stopHandler = (item) => this.emit('stop', item);
	add(...items) {
		if (items.filter(item => !(item instanceof MotionEvent)) > 0)
			throw new TypeError('all arguments must be a MotionEvent object.');

		super.add(...items);

		for (const item of items)
			item.on('stop', this.#stopHandler);
	}
	remove(...items) {
		super.remove(...items);

		for (const item of items)
			item.off('stop', this.#stopHandler);
	}
}
