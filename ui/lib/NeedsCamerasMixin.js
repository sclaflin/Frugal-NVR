import { Need } from './NeedsMixin';
import Cameras from './Cameras';

export const NeedsCamerasMixin = superclass => class extends superclass {
	#cameras;
	constructor() {
		super();

		this.needs.add(new Need(Cameras, 'cameras'));
	}
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if (!(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');
		this.#cameras = v;
		this.gotCameras();
	}
	async gotCameras() { }
};
