import CPUStat from './CPUStat';
import ProcessStats from './ProcessStats';
import MemStat from './MemStat';
import CamStats from './CamStats';

export default class HostStat {
	#cpu;
	#procs;
	#mem;
	#cams;
	constructor(cpu, procs, mem, cams) {
		if (!(cpu instanceof CPUStat))
			throw new TypeError('cpu must be a CPUStat object.');
		if (!(procs instanceof ProcessStats))
			throw new TypeError('procs must be a ProcessStats object.');
		if (!(mem instanceof MemStat))
			throw new TypeError('mem must be a MemStat object.');
		if (!(cams instanceof CamStats))
			throw new TypeError('cams must be a CamStats object.');

		this.#cpu = cpu;
		this.#procs = procs;
		this.#mem = mem;
		this.#cams = cams;
	}
	get cpu() {
		return this.#cpu;
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
			CPUStat.fromObject(config.cpu),
			ProcessStats.fromArray(config.procs),
			MemStat.fromObject({
				free: config.mem.free || parseInt(config.mem.MemFree),
				total: config.mem.total || parseInt(config.mem.MemTotal)
			}),
			CamStats.fromArray(config.cams)
		);
	}
}
