import Iterable from '../../lib/Iterable';
import Camera from './Camera';

export default class Cameras extends Iterable {
	#thumbHandler = (camera) => this.emit('thumb', camera);
	#motionStartHandler = (camera) => this.emit('motionStart', camera);
	#motionStopHandler = (camera) => this.emit('motionStop', camera);
	add(...items) {
		if (items.filter(item => !(item instanceof Camera)) > 0)
			throw new TypeError('all arguments must be a Camera object.');

		for (const item of items) {
			item.on('thumb', this.#thumbHandler);
			item.on('motionStart', this.#motionStartHandler);
			item.on('motionStop', this.#motionStopHandler);
		}

		super.add(...items);
	}
	remove(...items) {
		for (const item of items) {
			item.off('thumb', this.#thumbHandler);
			item.off('motionStart', this.#motionStartHandler);
			item.off('motionStop', this.#motionStopHandler);
		}

		super.remove(...items);
	}
}
