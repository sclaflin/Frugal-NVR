import Iterable from './Iterable.js';
import Camera from './Camera.js';

export default class Cameras extends Iterable {
	#processStartHandler = pid => this.emit('processStart', pid);
	#processStopHandler = pid => this.emit('processStop', pid);
	add(...items) {
		if (items.filter(item => !(item instanceof Camera)) > 0)
			throw new TypeError('all arguments must be a Camera object.');

		super.add(...items);
		for (const item of items) {
			item.on('processStart', this.#processStartHandler);
			item.on('processStop', this.#processStopHandler);
		}
	}
	remove(...items) {
		super.remove(...items);
		for (const item of items) {
			item.off('processStart', this.#processStartHandler);
			item.off('processStop', this.#processStopHandler);
		}
	}
}
