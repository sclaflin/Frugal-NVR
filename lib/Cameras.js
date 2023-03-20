import Iterable from './Iterable.js';
import Camera from './Camera.js';

export default class Cameras extends Iterable {
	add(...items) {
		if (items.filter(item => !(item instanceof Camera)) > 0)
			throw new TypeError('all arguments must be a Camera object.');

		super.add(...items);
	}
}
