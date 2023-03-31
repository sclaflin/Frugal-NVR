import Iterable from './Iterable.js';
import MotionEvent from './MotionEvent.js';

export default class MotionEvents extends Iterable {
	add(...items) {
		if (items.filter(item => !(item instanceof MotionEvent)) > 0)
			throw new TypeError('all arguments must be a MotionEvent object.');

		super.add(...items);
	}
}
