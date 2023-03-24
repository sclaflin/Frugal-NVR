import Iterable from '../../lib/Iterable';
import Segment from './Segment';

export default class Segments extends Iterable {
	add(...items) {
		if (items.filter(item => !(item instanceof Segment)) > 0)
			throw new TypeError('all arguments must be a Segment object.');

		super.add(...items);
	}
	get duration() {
		if(this.items.length === 0)
			return 0;
		const now = Math.round(Date.now() / 1000);
		const lastSegment = this.items.slice(-1)[0];
		const accruedSegmentTime = now - (lastSegment?.truncated ? lastSegment.date : now);
		return this.items.slice(0, -1).reduce((p, c) => p + c.duration, 0) + accruedSegmentTime;
	}
	get durationString() {
		const duration = this.duration;
		const durationParts = [
			{ value: Math.floor(duration / (24 * 60 * 60)), label: 'd' },
			{ value: Math.floor((duration % (24 * 60 * 60)) / (60 * 60)), label: 'h' },
			{ value: Math.floor(((duration % (24 * 60 * 60)) % (60 * 60)) / 60), label: 'm' },
			{ value: Math.floor((((duration % (24 * 60 * 60)) % (60 * 60)) % 60)), label: 's' }
		];
		const index = durationParts.findIndex(v => v.value !== 0);
		return durationParts.slice(index, index + 2).map(v => `${v.value}${v.label}`).join(' ');
	}
	get bytes() {
		return this.items.reduce((p, c) => p + c.bytes, 0);
	}
}
