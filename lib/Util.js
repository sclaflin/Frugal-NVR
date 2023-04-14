import fs from 'fs/promises';
import pidusage from 'pidusage';
import * as systeminformation from 'systeminformation';
import ProcessToken from './ProcessToken.js';

const STRING_DATE_PATTERN = /^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})$/;

export async function getPids() {
	return (await fs.readdir('/proc'))
		.filter(v => Number(v))
		.map(v => Number(v));
}
export async function getStats(...processTokens) {
	if (processTokens.filter(v => !(v instanceof ProcessToken)) > 0)
		throw new TypeError('all arguments must be a ProcessToken object.');


	const procs = Object.values(await pidusage(processTokens.map(processToken => processToken.pid)))
		.filter(v => !!v)
		.map(v => ({
			...v,
			name: processTokens.find(processToken => processToken.pid === v.pid).name
		}));
	const cpu = await systeminformation.cpu();
	const mem = await systeminformation.mem();
	
	return { procs, cpu, mem };
}
export function stringToDate(string) {
	if(typeof string !== 'string')
		throw new TypeError('string must be a string.');
	if(!STRING_DATE_PATTERN.test(string))
		throw new TypeError('invalid date pattern');
	const [,year,month,day,hour,minute, second] = string.match(STRING_DATE_PATTERN);
	return new Date(year, month - 1, day, hour, minute, second);
}
