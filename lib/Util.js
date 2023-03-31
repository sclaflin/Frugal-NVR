import fs from 'fs/promises';
import procfs from 'procfs-stats';
import pidusage from 'pidusage';

const CPU_PATTERN = /^cpu([0-9]+)$/;

export async function getPids() {
	return (await fs.readdir('/proc'))
		.filter(v => Number(v))
		.map(v => Number(v));
}
export async function getStats(...pids) {
	if (pids.filter(pid => !Number.isInteger(pid)) > 0)
		throw new TypeError('all arguments must be an integer.');

	const procs = Object.values(await pidusage(pids)).filter(v => !!v);
	for (const proc of procs) {
		const ps = procfs(proc.pid);
		const status = await new Promise((resolve) => {
			ps.status((err, obj) => {
				resolve(obj);
			});
		});
		proc.name = status?.Name || '';
	}

	const _cpus = await new Promise((resolve, reject) =>
		procfs.cpu((err, obj) => {
			if (err) return reject(err);
			resolve(obj);
		})
	);

	const cpus = Object.keys(_cpus)
		.filter(key => CPU_PATTERN.test(key))
		.map(key => ({
			..._cpus[key],
			cpu: key.match(CPU_PATTERN)[1]
		}));

	const mem = await new Promise((resolve, reject) => {
		procfs.meminfo((err, obj) => {
			if (err) return reject(err);
			resolve(obj);
		});
	});

	return { procs, cpus, mem };
}
