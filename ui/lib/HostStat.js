import CPUStats from './CPUStats';
import ProcessStats from './ProcessStats';
import MemStat from './MemStat';

export default class HostStat {
	#cpus;
	#procs;
	#mem;
	constructor(cpus, procs, mem) {
		if(!(cpus instanceof CPUStats))
			throw new TypeError('cpus must be a CPUStats object.');
		if(!(procs instanceof ProcessStats))
			throw new TypeError('procs must be a ProcessStats object.');
		if(!(mem instanceof MemStat))
			throw new TypeError('mem must be a MemStat object.');

		this.#cpus = cpus;
		this.#procs = procs;
		this.#mem = mem;
	}
	get cpus() {
		return this.#cpus;
	}
	get procs() {
		return this.#procs;
	}
	get mem() {
		return this.#mem;
	}
	static fromObject(config) {
		if(config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			CPUStats.fromArray(config.cpus),
			ProcessStats.fromArray(config.procs),
			MemStat.fromObject({
				free: config.mem.free || parseInt(config.mem.MemFree),
				total: config.mem.total || parseInt(config.mem.MemTotal)
			})
		);
	}
}