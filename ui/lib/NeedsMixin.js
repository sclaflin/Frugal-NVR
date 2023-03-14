import Iterable from './Iterable';

export const NeedsMixin = superclass => class extends superclass {
	#needs;
	constructor() {
		super();
		this.#needs = new Needs();
	}
	get needs() {
		return this.#needs;
	}
	getNeeds() {
		this.dispatchEvent(new CustomEvent('needs', { 
			bubbles: true,
			composed: true,
			detail: { needs: this.needs, target: this }
		}));
	}
	firstUpdated(changedProperties) {
		super.firstUpdated(changedProperties);

		this.getNeeds();
	}
};

class Needs extends Iterable {
	add(...items) {
		if(items.filter(v => !(v instanceof Need)) > 0)
			throw new TypeError('all arguments must be Need objects.');
		super.add(...items);
	}
}

export class Need {
	#type;
	#property;
	constructor(type, property) {
		if(typeof type !== 'function')
			throw new TypeError('type must be a function.');
		if(typeof property !== 'string')
			throw new TypeError('property must be a string.');

		this.#type = type;
		this.#property = property;
	}
	get type() {
		return this.#type;
	}
	get property() {
		return this.#property;
	}
}