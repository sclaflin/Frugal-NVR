import Iterable from './Iterable';
import Camera from './Camera';

export default class Cameras extends Iterable {
	#thumbHandler;
	constructor() {
		super();

		this.#thumbHandler = (camera) => this.emit('thumb', camera);
	}
	add(...items) {
		if(items.filter(item => !(item instanceof Camera)) > 0)
			throw new TypeError('all arguments must be a Camera object.');
		
		for(const item of items)
			item.on('thumb', this.#thumbHandler);

		super.add(...items);
	}
	remove(...items) {
		for(const item of items)
			item.off('thumb', this.#thumbHandler);

		super.remove(...items);
	}
}