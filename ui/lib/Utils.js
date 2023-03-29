export function durationString(duration) {
	if (!Number.isInteger(duration))
		throw new TypeError('duration must be an integer.');
	const durationParts = [
		{ value: Math.floor(duration / (24 * 60 * 60)), label: 'D' },
		{ value: Math.floor((duration % (24 * 60 * 60)) / (60 * 60)), label: 'H' },
		{ value: Math.floor(((duration % (24 * 60 * 60)) % (60 * 60)) / 60), label: 'M' },
		{ value: Math.floor((((duration % (24 * 60 * 60)) % (60 * 60)) % 60)), label: 'S' }
	];
	let index = durationParts.findIndex(v => v.value !== 0);
	if(index === -1) index = durationParts.length - 1;
	return durationParts.slice(index, index + 2).map(v => `${v.value}${v.label}`).join(' ');
}
export function bytesString(bytes, scale = 0) {
	if (!Number.isInteger(bytes))
		throw new TypeError('bytes must be an integer.');
	if (!Number.isInteger(scale))
		throw new TypeError('scale must be an integer.');

	const kibibyte = 2 ** 10;
	const mebibyte = 2 ** 20;
	const gibibyte = 2 ** 30;
	const tebibyte = 2 ** 40;
	const byteScales = [
		{ value: Math.round(bytes / tebibyte * 10 ** scale) / 10 ** scale, label: 'TiB' },
		{ value: Math.round(bytes % tebibyte / gibibyte * 10 ** scale) / 10 ** scale, label: 'GiB' },
		{ value: Math.round(bytes % tebibyte % gibibyte / mebibyte * 10 ** scale) / 10 ** scale, label: 'MiB' },
		{ value: Math.round(bytes % tebibyte % gibibyte % mebibyte / kibibyte * 10 ** scale) / 10 ** scale, label: 'KiB' },
		{ value: bytes % tebibyte % gibibyte % mebibyte % kibibyte, label: 'B' }
	];
	const byteScale = byteScales.find(v => v.value > 0) || byteScales.slice(-1)[0];
	return Object.values(byteScale).join(' ');
}
