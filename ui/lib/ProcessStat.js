export default class ProcessStat {
	#cpu;
	#ctime;
	#elapsed;
	#memory;
	#pid;
	#ppid;
	#timestamp;
	#name;
	
	constructor(cpu, ctime, elapsed, memory, pid, ppid, timestamp, name) {
		if(typeof cpu !== 'number')
			throw new TypeError('cpu must be a number.');
		if(!Number.isInteger(ctime))
			throw new TypeError('ctime must be an integer.');
		if(typeof elapsed !== 'number')
			throw new TypeError('elapsed must be a number.');
		if(!Number.isInteger(memory))
			throw new TypeError('memory must be an integer.');
		if(!Number.isInteger(pid))
			throw new TypeError('pid must be an integer.');
		if(!Number.isInteger(ppid))
			throw new TypeError('ppid must be an integer.');
		if(!Number.isInteger(timestamp))
			throw new TypeError('timestamp must be an integer.');
		if(typeof name !== 'string')
			throw new TypeError('name must be a string.');

		this.#cpu = cpu;
		this.#ctime = ctime;
		this.#elapsed = elapsed;
		this.#memory = memory;
		this.#pid = pid;
		this.#ppid = ppid;
		this.#timestamp = timestamp;
		this.#name = name;
	}
	get cpu() {
		return this.#cpu;
	}
	get ctime() {
		return this.#ctime;
	}
	get elapsed() {
		return this.#elapsed;
	}
	get memory() {
		return this.#memory;
	}
	get pid() {
		return this.#pid;
	}
	get ppid() {
		return this.#ppid;
	}
	get timestamp() {
		return this.#timestamp;
	}
	get name() {
		return this.#name;
	}
	static fromObject(obj) {
		if(obj === null || typeof obj !== 'object')
			throw new TypeError('obj must be an object.');
		return new this(
			obj.cpu,
			obj.ctime,
			obj.elapsed,
			obj.memory,
			obj.pid,
			obj.ppid,
			obj.timestamp,
			obj.name
		);
	}
}