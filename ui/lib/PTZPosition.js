export default class PTZPosition {
	#x;
	#y;
	#zoom;
	constructor(x, y, zoom) {
		this.x = x;
		this.y = y;
		this.zoom = zoom;
	}
	get x() {
		return this.#x;
	}
	set x(v) {
		if(typeof v !== 'number')
			throw new TypeError('x must be a number.');
		this.#x = v;
	}
	get y() {
		return this.#y;
	}
	set y(v) {
		if(typeof v !== 'number')
			throw new TypeError('y must be a number.');
		this.#y = v;
	}
	get zoom() {
		return this.#zoom;
	}
	set zoom(v) {
		if(typeof v !== 'number')
			throw new TypeError('zoom must be a number.');
		this.#zoom = v;
	}
	toJSON() {
		return {
			x: this.x,
			y: this.y,
			zoom: this.zoom
		};
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an object.');
		return new this(
			config.x,
			config.y,
			config.zoom
		);
	}
}
