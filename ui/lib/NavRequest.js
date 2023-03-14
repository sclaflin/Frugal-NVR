import { VIEWS } from './Constants';

export default class NavRequest {
	#view;
	#data;
	constructor(view, data) {
		if(VIEWS.indexOf(view) === -1)
			throw new Error('Invalid view requested.');
			
		this.#view = view;
		this.#data = data;
	}
	get view() {
		return this.#view;
	}
	get data() {
		return this.#data;
	}
}