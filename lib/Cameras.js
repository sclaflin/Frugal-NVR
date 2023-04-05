import Iterable from './Iterable.js';
import Camera from './Camera.js';

export default class Cameras extends Iterable {
	#processStartHandler = (pid, camera) => this.emit('processStart', pid, camera);
	#processStopHandler = (pid, camera) => this.emit('processStop', pid, camera);
	#recordHandler = (record, camera) => this.emit('record', record, camera);
	#motionHandler = (motion, camera) => this.emit('motion', motion, camera);
	#thumbHandler = camera => this.emit('thumb', camera);
	#segmentUpdateHandler = segment => this.emit('segmentUpdate', segment);
	#segmentRepairHandler = segment => this.emit('segmentRepair', segment);
	add(...items) {
		if (items.filter(item => !(item instanceof Camera)) > 0)
			throw new TypeError('all arguments must be a Camera object.');

		super.add(...items);
		for (const item of items) {
			item.on('processStart', this.#processStartHandler);
			item.on('processStop', this.#processStopHandler);
			item.on('record', this.#recordHandler);
			item.on('motion', this.#motionHandler);
			item.on('thumb', this.#thumbHandler);
			item.on('segmentUpdate', this.#segmentUpdateHandler);
			item.on('segmentRepair', this.#segmentRepairHandler);
		}
	}
	remove(...items) {
		super.remove(...items);
		for (const item of items) {
			item.off('processStart', this.#processStartHandler);
			item.off('processStop', this.#processStopHandler);
			item.off('record', this.#recordHandler);
			item.off('motion', this.#motionHandler);
			item.off('thumb', this.#thumbHandler);
			item.off('segmentUpdate', this.#segmentUpdateHandler);
			item.off('segmentRepair', this.#segmentRepairHandler);
		}
	}
}
