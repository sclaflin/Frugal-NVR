import { Need } from './NeedsMixin';
import API from './API';

export const NeedsAPIMixin = superclass => class extends superclass {
	#api;
	constructor() {
		super();

		this.needs.add(new Need(API, 'api'));
	}
	get api() {
		return this.#api;
	}
	set api(v) {
		if (!(v instanceof API))
			throw new TypeError('api must be an API object.');
		this.#api = v;
		this.gotAPI();
	}
	async gotAPI() { }
};
