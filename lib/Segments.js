import fs from 'fs/promises';
import { spawn } from 'child_process';
import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import Iterable from './Iterable.js';
import Segment from './Segment.js';
import Logger from './Logger.js';
import { stringToDate } from './Util.js';
import ProcessToken from './ProcessToken.js';
import * as constants from './constants.js';

function randomString(length) {
	return [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
}

export default class Segments extends Iterable {
	#db;
	#name;
	#tempPath;
	#ffmpegPath;
	#mediainfoPath;
	#path;
	#retainHours;

	get db() {
		return this.#db;
	}
	set db(v) {
		if (!(v instanceof Database))
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
	get tempPath() {
		return this.#tempPath;
	}
	set tempPath(v) {
		if (typeof v !== 'string')
			throw new TypeError('tempPath must be a string.');
		this.#tempPath = v;
	}
	get ffmpegPath() {
		return this.#ffmpegPath;
	}
	set ffmpegPath(v) {
		if (typeof v !== 'string')
			throw new TypeError('ffmpegPath must be a string.');
		this.#ffmpegPath = v;
	}
	get mediainfoPath() {
		return this.#mediainfoPath;
	}
	set mediainfoPath(v) {
		if (typeof v !== 'string')
			throw new TypeError('mediainfoPath must be a string.');
		this.#mediainfoPath = v;
	}
	get nameSanitized() {
		return this.name.replace(/[^a-zA-Z0-9]+/g, '_');
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
	#processStartHandler = processToken => this.emit('processStart', processToken);
	#processStopHandler = processToken => this.emit('processStop', processToken);
	add(...items) {
		if (items.filter(item => !(item instanceof Segment)) > 0)
			throw new TypeError('all arguments must be a Segment object.');

		super.add(...items);
		for (const item of items) {
			item.on('processStart', this.#processStartHandler);
			item.on('processStop', this.#processStopHandler);
		}
	}
	remove(...items) {
		super.remove(...items);
		for (const item of items) {
			item.off('processStart', this.#processStartHandler);
			item.off('processStop', this.#processStopHandler);
		}
	}
	async load() {
		if (!this.path)
			throw new Error('No path assigned.');

		Logger.info(`Loading segments for ${this.name}...`);
		// collect all db records
		const currentSegments = (await this.db.all(SQL`
			SELECT *
			FROM Segment AS s
			WHERE s.Camera = ${this.name}
		`))
			.map(record => Segment.fromObject({
				db: this.db,
				name: record.Camera,
				path: record.Path,
				tempPath: this.tempPath,
				ffmpegPath: this.ffmpegPath,
				mediainfoPath: this.mediainfoPath,
				date: record.Date,
				duration: record.Duration,
				bytes: record.Bytes,
				truncated: record.Truncated === 1,
				segmentId: record.SegmentId
			}));

		// collect all segment files
		const files = (await fs.readdir(this.path))
			.filter(file => (
				// make sure the file fits our pattern
				constants.SEGMENTS_SEQUENCE_REGEX.test(file)
			))
			.sort();

		// remove existing segments without a corresponding file
		const toDelete = currentSegments.filter(segment =>
			files.find(file => segment.path === `${this.path}/${file}`) === undefined
		);
		for (const segment of toDelete) {
			const index = currentSegments.indexOf(segment);
			if (index >= 0)
				currentSegments.splice(index, 1);
			segment.delete();
		}

		// update existing segments
		for (const segment of currentSegments) {
			// skip if bytes are recorded and the segment isn't truncated
			if (segment.bytes > 0 && !segment.truncated)
				continue;

			// repair the segment if truncated and not the last segment (it may
			// still be being written to)
			if (segment.truncated && segment !== currentSegments.slice(-1))
				this.emit('segmentRepair', segment);
		}

		// generate segments without a corresponding file
		const newSegments = files
			.filter(file => currentSegments.find(segment => `${this.path}/${file}` === segment.path) === undefined)
			.map(file => Segment.fromObject({
				db: this.db,
				name: this.name,
				path: `${this.path}/${file}`,
				tempPath: this.tempPath,
				ffmpegPath: this.ffmpegPath,
				mediainfoPath: this.mediainfoPath,
				date: Math.floor(stringToDate(file.match(constants.SEGMENTS_SEQUENCE_REGEX)[1]).getTime() / 1000)
			}));

		for (const segment of newSegments) {
			Logger.info(`Adding ${segment.path}...`);
			// collect additional data about the segment
			await segment.getMediaInfo();
			await segment.getBytes();
			await segment.upsert();
		}

		this.clear();
		this.add(...currentSegments, ...newSegments);
	}
	async splice(segment, offset, duration) {
		if (!(segment instanceof Segment))
			throw new TypeError('segment must be a Segment object.');
		if (!Number.isInteger(offset))
			throw new TypeError('offset must be an integer.');
		if (!Number.isInteger(duration))
			throw new TypeError('duration must be an integer.');

		const id = `splice_${randomString(32)}`;
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
				`${this.tempPath}/${this.nameSanitized}/${id}.mkv`
			];
			const ffmpeg = spawn(this.ffmpegPath, args);
			this.emit('processStart', new ProcessToken(ffmpeg.pid, 'ffmpeg'));
			ffmpeg.stderr.on('data', buff =>
				Logger.info(`${this.name} ffmpeg splice stderr: ${buff.toString()}`)
			);
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					this.emit('processStop', new ProcessToken(ffmpeg.pid, 'ffmpeg'));
					if (code !== 0)
						reject(new Error(`ffmpeg splice closed with exit code: ${code}`));
					else resolve();
				});
			});

			return Segment.fromObject({
				db: this.db,
				name: this.name,
				path: `${this.tempPath}/${this.nameSanitized}/${id}.mkv`,
				tempPath: this.tempPath,
				ffmpegPath: this.ffmpegPath,
				mediainfoPath: this.mediainfoPath,
				date: segment.date + offset
			});
		}
		catch (err) {
			await fs.rm(`${this.tempPath}/${this.nameSanitized}/${id}.mkv`, { force: true });
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

		let id = `concat_${randomString(32)}`;
		try {
			await fs.writeFile(`${this.tempPath}/${this.nameSanitized}/${id}.txt`, `${segments.map(segment => `file '${segment.path}'`).join('\n')}\n`);

			const args = [
				'-hide_banner',
				'-y',
				'-loglevel', 'error',
				'-f', 'concat',
				'-safe', '0',
				'-i', `${this.tempPath}/${this.nameSanitized}/${id}.txt`,
				'-c', 'copy',
				`${this.tempPath}/${this.nameSanitized}/${id}.${format}`
			];
			const ffmpeg = spawn(this.ffmpegPath, args);
			this.emit('processStart', new ProcessToken(ffmpeg.pid, 'ffmpeg'));
			ffmpeg.stderr.on('data', buff =>
				Logger.info(`${this.name} ffmpeg concat stderr: ${buff.toString()}`)
			);
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					this.emit('processStop', new ProcessToken(ffmpeg.pid, 'ffmpeg'));
					if (code !== 0)
						reject(new Error(`ffmpeg concat closed with exit code: ${code}`));
					else resolve();
				});
			});

			return Segment.fromObject({
				db: this.db,
				name: this.name,
				path: `${this.tempPath}/${this.nameSanitized}/${id}.${format}`,
				tempPath: this.tempPath,
				ffmpegPath: this.ffmpegPath,
				mediainfoPath: this.mediainfoPath,
				date: segments[0].date
			});
		}
		catch (err) {
			await fs.rm(`${this.tempPath}/${this.nameSanitized}/${id}.${format}`, { force: true });
			throw err;
		}
		finally {
			await fs.rm(`${this.tempPath}/${this.nameSanitized}/${id}.txt`, { force: true });
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
		// await this.load();
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
		if (this.items.length === 0)
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
