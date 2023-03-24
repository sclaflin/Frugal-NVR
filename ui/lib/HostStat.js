import CPUStats from './CPUStats';
import ProcessStats from './ProcessStats';
import MemStat from './MemStat';
import CamStats from './CamStats';

export default class HostStat {
	#cpus;
	#procs;
	#mem;
	#cams;
	constructor(cpus, procs, mem, cams) {
		if (!(cpus instanceof CPUStats))
			throw new TypeError('cpus must be a CPUStats object.');
		if (!(procs instanceof ProcessStats))
			throw new TypeError('procs must be a ProcessStats object.');
		if (!(mem instanceof MemStat))
			throw new TypeError('mem must be a MemStat object.');
		if (!(cams instanceof CamStats))
			throw new TypeError('cams must be a CamStats object.');

		this.#cpus = cpus;
		this.#procs = procs;
		this.#mem = mem;
		this.#cams = cams;
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
	get cams() {
		return this.#cams;
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			CPUStats.fromArray(config.cpus),
			ProcessStats.fromArray(config.procs),
			MemStat.fromObject({
				free: config.mem.free || parseInt(config.mem.MemFree),
				total: config.mem.total || parseInt(config.mem.MemTotal)
			}),
			CamStats.fromArray(config.cams)
		);
	}
}
