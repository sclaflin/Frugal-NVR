import { Need } from './NeedsMixin';
import Config from './Config';

export const NeedsConfigMixin = superclass => class extends superclass {
	#config;
	constructor() {
		super();

		this.needs.add(new Need(Config, 'config'));
	}
	get config() {
		return this.#config;
	}
	set config(v) {
		if (!(v instanceof Config))
			throw new TypeError('config must be a Config object.');
		this.#config = v;
		this.gotConfig();
	}
	async gotConfig() {}
};
