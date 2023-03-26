import fs from 'fs/promises';
import { spawn } from 'child_process';
import crypto from 'node:crypto';
import { Database } from 'sqlite';
import Iterable from './Iterable.js';
import Segment from './Segment.js';
import * as constants from './constants.js';

export default class Segments extends Iterable {
	#db;
	#name;
	#path;
	#retainHours;

	get db() {
		return this.#db;
	}
	set db(v) {
		if(!(v instanceof Database))
			throw new TypeError('db must be a Database instance.');
		this.#db = v;
	}
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
		// reload the last segment's info in the likely event it was still open
		// for writing
		this.items.slice(-1)[0]?.load();

		// collect all segment files
		const files = (await fs.readdir(this.path))
			.filter(file => (
				// make sure the file fits our pattern
				constants.SEGMENTS_SEQUENCE_REGEX.test(file) &&
				// make sure we don't already have it
				!this.items.find(item => item.path === `${this.path}/${file}`)
			))
			.sort();

		const segments = [];
		for(const file of files) {
			const segment = Segment.fromObject({
				db: this.db,
				name: this.name,
				path: `${this.path}/${file}`,
				date: Math.floor((new Date(file.match(constants.SEGMENTS_SEQUENCE_REGEX)[1])).getTime() / 1000)
			});
			await segment.load();
			// is this segment incomplete and is it NOT the last segment
			if (segment.truncated && files.indexOf(file) < files.length - 1) {
				// attempt to repair and reload
				if (await segment.repair())
					await segment.load();
			}
			segments.push(segment);
		}
		this.add(...segments);
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
			// ffmpeg -ss 10 -i videos/20230310T131417.mkv -t 5 -acodec copy -vcodec copy output.mkv
			const args = [
				'-hide_banner',
				'-y',
				'-loglevel', 'error',
				'-ss', offset,
				'-i', segment.path,
				'-t', duration,
				'-acodec', 'copy',
				'-vcodec', 'copy',
				`/dev/shm/${this.name}/${id}.mkv`
			];
			const ffmpeg = spawn('ffmpeg', args);
			ffmpeg.stderr.on('data', buff => console.error(`ffmpeg splice stderr: ${buff.toString()}`));
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					if (code !== 0)
						reject(new Error(`ffmpeg splice closed with exit code: ${code}`));
					else resolve();
				});
			});

			return Segment.fromObject({
				db: this.db,
				name: this.name,
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

			const args = [
				'-hide_banner',
				'-y',
				'-loglevel', 'error',
				'-f', 'concat',
				'-safe', '0',
				'-i', `/dev/shm/${this.name}/${id}.txt`,
				'-c', 'copy',
				`/dev/shm/${this.name}/${id}.${format}`
			];
			const ffmpeg = spawn('ffmpeg', args);
			ffmpeg.stderr.on('data', buff => console.error(`ffmpeg concat stderr: ${buff.toString()}`));
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					if (code !== 0)
						reject(new Error(`ffmpeg concat closed with exit code: ${code}`));
					else resolve();
				});
			});

			return Segment.fromObject({
				db: this.db,
				name: this.name,
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
			if (Math.round(Date.now() / 1000) - (constants.SECONDS_PER_HOUR * this.retainHours) - constants.SEGMENTS_DAILY_OVERLAP > segment.date) {
				await segment.delete();
				this.remove(segment);
			}
		}
	}
	get bytes() {
		return this.items.reduce((p, c) => p + c.bytes, 0);
	}
	get duration() {
		if(this.items.length === 0)
			return 0;
		const now = Math.round(Date.now() / 1000);
		const lastSegment = this.items.slice(-1)[0];
		const accruedSegmentTime = now - (lastSegment?.truncated ? lastSegment.date : now);
		return this.items.slice(0, -1).reduce((p, c) => p + c.duration, 0) + accruedSegmentTime;
	}
	toJSON() {
		return this.items;
	}
}
