export function durationString(duration) {
	if (!Number.isInteger(duration))
		throw new TypeError('duration must be an integer.');
	const durationParts = [
		{ value: Math.floor(duration / (24 * 60 * 60)), label: 'd' },
		{ value: Math.floor((duration % (24 * 60 * 60)) / (60 * 60)), label: 'h' },
		{ value: Math.floor(((duration % (24 * 60 * 60)) % (60 * 60)) / 60), label: 'm' },
		{ value: Math.floor((((duration % (24 * 60 * 60)) % (60 * 60)) % 60)), label: 's' }
	];
	const index = durationParts.findIndex(v => v.value !== 0);
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
		{ value: Math.round(bytes % tebibyte / gibibyte * 10 ** scale) / 10 ** scale, label: 'Gib' },
		{ value: Math.round(bytes % tebibyte % gibibyte / mebibyte * 10 ** scale) / 10 ** scale, label: 'MiB' },
		{ value: Math.round(bytes % tebibyte % gibibyte % mebibyte / kibibyte * 10 ** scale) / 10 ** scale, label: 'KiB' },
		{ value: bytes % tebibyte % gibibyte % mebibyte % kibibyte, label: 'B' }
	];
	return Object.values(byteScales.find(v => v.value > 0)).join(' ');
}