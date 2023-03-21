import fs from 'fs/promises';
import { spawn } from 'child_process';
import crypto from 'node:crypto';
import Iterable from './Iterable.js';
import Segment from './Segment.js';
import * as constants from './constants.js';

export default class Segments extends Iterable {
	#name;
	#path;
	#retainHours;

	get name() {
		return this.#name;
	}
	set name(v) {
		if (typeof v !== 'string')
			throw new TypeError('name must be a string.');

		this.#name = v;
	}
	get path() {
		return this.#path;
	}
	set path(v) {
		if (typeof v !== 'string')
			throw new TypeError('path must be a string.');
		this.#path = v;
	}
	get retainHours() {
		return this.#retainHours;
	}
	set retainHours(v) {
		if (!Number.isInteger(v))
			throw new TypeError('retainHours must be an integer.');
		this.#retainHours = v;
	}
	add(...items) {
		if (items.filter(item => !(item instanceof Segment)) > 0)
			throw new TypeError('all arguments must be a Segment object.');

		super.add(...items);
	}
	async load() {
		if (!this.path)
			throw new Error('No path assigned.');

		this.clear();

		this.add(...(await fs.readdir(this.path))
			.filter(file => constants.SEGMENTS_SEQUENCE_REGEX.test(file))
			.map(file => Segment.fromObject({
				path: `${this.path}/${file}`,
				date: Math.floor((new Date(file.match(constants.SEGMENTS_SEQUENCE_REGEX)[1])).getTime() / 1000)
			}))
			.sort((a, b) => a.date - b.date)
		);
	}
	async splice(segment, offset, duration) {
		if (!(segment instanceof Segment))
			throw new TypeError('segment must be a Segment object.');
		if (!Number.isInteger(offset))
			throw new TypeError('offset must be an integer.');
		if (!Number.isInteger(duration))
			throw new TypeError('duration must be an integer.');

		const id = `splice_${crypto.randomBytes(8).toString('hex')}`;
		try {
			const errBuffs = [];
			// ffmpeg -ss 10 -i videos/20230310T131417.mkv -t 5 -acodec copy -vcodec copy output.mkv
			const args = [
				// don't show the noisy ffmpeg banner
				'-hide_banner',
				'-y',
				'-ss', offset,
				'-i', segment.path,
				'-t', duration,
				'-acodec', 'copy',
				'-vcodec', 'copy',
				`/dev/shm/${this.name}/${id}.mkv`
			];
			const ffmpeg = spawn('ffmpeg', args);
			ffmpeg.stderr.on('data', buff => errBuffs.push(buff));
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					if (code !== 0)
						reject(new Error(Buffer.concat(errBuffs).toString()));
					else resolve();
				});
			});

			return Segment.fromObject({
				path: `/dev/shm/${this.name}/${id}.mkv`,
				date: segment.date + offset
			});
		}
		catch (err) {
			await fs.rm(`/dev/shm/${this.name}/${id}.mkv`, { force: true });
			throw err;
		}
	}
	async concat(format = constants.VIDEO_CONTAINER_FLV, ...segments) {
		if (!this.path)
			throw new Error('No path assigned.');
		if (constants.VIDEO_CONTAINERS.indexOf(format) === -1)
			throw new TypeError('invalid container format.');
		if (segments.filter(segment => !(segment instanceof Segment)) > 0)
			throw new TypeError('all arguments must be a Segment object.');

		let id = `concat_${crypto.randomBytes(8).toString('hex')}`;
		try {
			await fs.writeFile(`/dev/shm/${this.name}/${id}.txt`, `${segments.map(segment => `file '${segment.path}'`).join('\n')}\n`);

			const errBuffs = [];
			const args = [
				// don't show the noisy ffmpeg banner
				'-hide_banner',
				'-y',
				'-f', 'concat',
				'-safe', '0',
				'-i', `/dev/shm/${this.name}/${id}.txt`,
				'-c', 'copy',
				`/dev/shm/${this.name}/${id}.${format}`
			];
			const ffmpeg = spawn('ffmpeg', args);
			ffmpeg.stderr.on('data', buff => errBuffs.push(buff));
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					if (code !== 0)
						reject(new Error(Buffer.concat(errBuffs).toString()));
					else resolve();
				});
			});

			return Segment.fromObject({
				path: `/dev/shm/${this.name}/${id}.${format}`,
				date: segments[0].date
			});
		}
		catch (err) {
			await fs.rm(`/dev/shm/${this.name}/${id}.${format}`, { force: true });
			throw err;
		}
		finally {
			await fs.rm(`/dev/shm/${this.name}/${id}.txt`, { force: true });
		}
	}
	async clip(format = constants.VIDEO_CONTAINER_FLV, start, stop) {
		if (constants.VIDEO_CONTAINERS.indexOf(format) === -1)
			throw new TypeError('invalid container format.');
		if (!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		if (!Number.isInteger(stop))
			throw new TypeError('stop must be an integer.');

		let spliceStartSegment, spliceEndSegment, concatSegment;
		try {
			await this.load();

			// locate the first and last segments containing our start and stop dates
			let firstSegment, lastSegment;
			for (const segment of this) {
				if (segment.date <= start)
					firstSegment = segment;

				if (segment.date < stop)
					lastSegment = segment;
			}

			// no segments located? Bail.
			if (!firstSegment && !lastSegment)
				throw new Error('No captured video for that date range.');

			// if the first segment couldn't be found, use the last segment
			if (!firstSegment)
				firstSegment = lastSegment;

			// capture the range of segments including and between the first and last segments
			const segments = this.items.slice(
				this.items.indexOf(firstSegment),
				this.items.indexOf(lastSegment) + 1
			);

			// calculate the amount of video to splice out of the first segment
			let offset = start - firstSegment.date;
			let duration = stop - start;
			spliceStartSegment = await this.splice(segments[0], offset, duration);
			// replace the first segment with the spliced video
			segments.splice(0, 1, spliceStartSegment);

			// calculate the amount of video to splice out of the last segment
			offset = 0;
			duration = stop - lastSegment.date;
			spliceEndSegment = await this.splice(segments[segments.length - 1], offset, duration);
			// replace the last segment with the spliced video
			segments.splice(-1, 1, spliceEndSegment);

			// concat the segments into a single video
			concatSegment = await this.concat(format, ...segments);

			return concatSegment;
		}
		catch (err) {
			// clean up in case of error
			await concatSegment?.delete();
			throw err;
		}
		finally {
			// clean up our mess
			await spliceStartSegment?.delete();
			await spliceEndSegment?.delete();
		}
	}
	async prune() {
		await this.load();
		for (const segment of this.items) {
			if (Math.round(Date.now() / 1000) - (constants.SECONDS_PER_DAY * this.retainHours) - constants.SEGMENTS_DAILY_OVERLAP > segment.date)
				segment.delete();
		}
	}
	async diskBytes() {
		await this.load();
		let bytes = 0;
		for (const segment of this.items)
			bytes += await segment.diskBytes();

		return bytes;
	}
	toJSON() {
		return this.items;
	}
}
