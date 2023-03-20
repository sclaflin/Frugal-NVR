export default class CPUStat {
	#cpu;
	#guest;
	#guest_nice;
	#idle;
	#iowait;
	#irq;
	#nice;
	#softirq;
	#steal;
	#system;
	#user;

	constructor(cpu, guest, guest_nice, idle, iowait, irq, nice, softirq, steal, system, user) {
		if (typeof cpu !== 'string')
			throw new TypeError('cpu must be a string.');
		if (typeof guest !== 'string')
			throw new TypeError('guest must be a string.');
		if (typeof guest_nice !== 'string')
			throw new TypeError('guest_nice must be a string.');
		if (typeof idle !== 'string')
			throw new TypeError('idle must be a string.');
		if (typeof iowait !== 'string')
			throw new TypeError('iowait must be a string.');
		if (typeof irq !== 'string')
			throw new TypeError('irq must be a string.');
		if (typeof nice !== 'string')
			throw new TypeError('nice must be a string.');
		if (typeof softirq !== 'string')
			throw new TypeError('softirq must be a string.');
		if (typeof steal !== 'string')
			throw new TypeError('steal must be a string.');
		if (typeof system !== 'string')
			throw new TypeError('system must be a string.');
		if (typeof user !== 'string')
			throw new TypeError('user must be a string.');

		this.#cpu = cpu;
		this.#guest = guest;
		this.#guest_nice = guest_nice;
		this.#idle = idle;
		this.#iowait = iowait;
		this.#irq = irq;
		this.#nice = nice;
		this.#softirq = softirq;
		this.#steal = steal;
		this.#system = system;
		this.#user = user;
	}
	get cpu() {
		return this.#cpu;
	}
	get guest() {
		return this.#guest;
	}
	get guest_nice() {
		return this.#guest_nice;
	}
	get idle() {
		return this.#idle;
	}
	get iowait() {
		return this.#iowait;
	}
	get irq() {
		return this.#irq;
	}
	get nice() {
		return this.#nice;
	}
	get softirq() {
		return this.#softirq;
	}
	get steal() {
		return this.#steal;
	}
	get system() {
		return this.#system;
	}
	get user() {
		return this.#user;
	}
	static fromObject(obj) {
		if (obj === null || typeof obj !== 'object')
			throw new TypeError('obj must be an object.');
		return new this(
			obj.cpu,
			obj.guest,
			obj.guest_nice,
			obj.idle,
			obj.iowait,
			obj.irq,
			obj.nice,
			obj.softirq,
			obj.steal,
			obj.system,
			obj.user
		);
	}
}
