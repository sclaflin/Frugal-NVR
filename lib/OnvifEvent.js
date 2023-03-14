export default class OnvifEvent {
	#topic;
	#time;
	#property;
	#source = [];
	#data = [];
	constructor(topic, time, property, source, data) {
		if(typeof topic !== 'string')
			throw new TypeError('topic must be a string.');
		if(!(time instanceof Date))
			throw new TypeError('time must be a Date object.');
		if(typeof property !== 'string')
			throw new TypeError('propery must be a string.');
		if(!Array.isArray(source))
			throw new TypeError('source must be an Array.');
		if(source.filter(v => !(v instanceof NameValuePair)) > 0)
			throw new TypeError('source array must only contain NameValuePair instances.');
		if(!Array.isArray(data))
			throw new TypeError('data must be an Array.');
		if(data.filter(v => !(v instanceof NameValuePair)) > 0)
			throw new TypeError('data array must only contain NameValuePair instances.');

		this.#topic = topic;
		this.#time = time;
		this.#property = property;
		this.#source.push(...source);
		this.#data.push(...data);
	}
	get topic() {
		return this.#topic;
	}
	get time() {
		return this.#time;
	}
	get property() {
		return this.#property;
	}
	get source() {
		return this.#source.slice();
	}
	get data() {
		return this.#data.slice();
	}
	toJSON() {
		return {
			topic: this.topic,
			time: this.time,
			property: this.property,
			source: this.source,
			data: this.data
		};
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.topic,
			config.time,
			config.property,
			(config.source || []).map(v => NameValuePair.fromObject(v)),
			(config.data || []).map(v => NameValuePair.fromObject(v))
		);
	}
}

export class NameValuePair {
	#name;
	#value;
	constructor(name, value) {
		if(typeof name !== 'string')
			throw new TypeError('name must be a string.');
		
		this.#name = name;
		this.#value = value;
	}
	get name() {
		return this.#name;
	}
	get value() {
		return this.#value;
	}
	toJSON() {
		return {
			name: this.name,
			value: this.value
		};
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.name,
			config.value
		);
	}
}