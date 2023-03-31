import fs from 'fs/promises';
import path from 'path';
import EventEmitter from 'events';
import { spawn } from 'child_process';
import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import Logger from './Logger.js';

export default class Segment extends EventEmitter {
	#db;
	#name;
	#path;
	#date;
	#duration;
	#bytes;
	#truncated;
	#segmentId;
	constructor(db, name, path, date = 0, duration = 0, bytes = 0, truncated = true, segmentId = null) {
		if (!(db instanceof Database))
			throw new TypeError('db must be a Database instance.');
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');
		if (typeof path !== 'string')
			throw new TypeError('path must be a string.');
		if (!Number.isInteger(date))
			throw new TypeError('date must be an integer.');
		if (!Number.isInteger(duration))
			throw new TypeError('duration must be an integer.');
		if (!Number.isInteger(bytes))
			throw new TypeError('bytes must be an integer.');
		if (typeof truncated !== 'boolean')
			throw new TypeError('truncated must be a boolean.');
		if (segmentId !== null && !Number.isInteger(segmentId))
			throw new TypeError('segmentId must be an integer.');

		super();

		this.#db = db;
		this.#name = name;
		this.#path = path;
		this.#date = date;
		this.#duration = duration;
		this.#bytes = bytes;
		this.#truncated = truncated;
		this.#segmentId = segmentId;
	}
	get db() {
		return this.#db;
	}
	get name() {
		return this.#name;
	}
	get nameSanitized() {
		return this.name.replace(/[^a-zA-Z0-9]+/g, '_');
	}
	get path() {
		return this.#path;
	}
	get date() {
		return this.#date;
	}
	get duration() {
		return this.#duration;
	}
	get bytes() {
		return this.#bytes;
	}
	get truncated() {
		return this.#truncated;
	}
	get segmentId() {
		return this.#segmentId;
	}
	async getBytes() {
		this.#bytes = (await fs.stat(this.path)).size;
	}
	async getMediaInfo() {
		const args = [
			'--Output=JSON',
			this.path
		];
		const mediainfo = spawn('mediainfo', args);
		this.emit('processStart', mediainfo.pid);
		mediainfo.stderr.on('data', buff => 
			Logger.warn(`${this.name} mediainfo stderr: ${buff.toString()}`)
		);
		const outBuffs = [];
		mediainfo.stdout.on('data', buff => outBuffs.push(buff));
		await new Promise((resolve, reject) => {
			mediainfo.on('close', code => {
				this.emit('processStop', mediainfo.pid);
				if (code !== 0)
					return reject(new Error(`mediainfo closed with exit code: ${code}`));
				resolve();
			});
		});
		let info = JSON.parse(Buffer.concat(outBuffs).toString());
		this.#truncated = info?.media?.track?.['0']?.extra?.IsTruncated === 'Yes';
		this.#duration = Math.round(Number(info?.media?.track?.['0']?.Duration || 0));
	}
	async delete() {
		await fs.rm(this.path, { force: true });
		await this.db.run(SQL`
			DELETE
			FROM Segment AS s
			WHERE s.SegmentId = ${this.segmentId}
		`);
	}
	async upsert() {
		if (this.segmentId === null) {
			const result = await this.db.run(SQL`
				INSERT INTO Segment (
					Camera
					,Path
					,Date
					,Duration
					,Bytes
					,Truncated
				)
				VALUES (
					${this.name}
					,${this.path}
					,${this.date}
					,${this.duration}
					,${this.bytes}
					,${this.truncated}
				)
			`);
			this.#segmentId = result.lastID;
		}
		else {
			await this.db.run(SQL`
				UPDATE Segment AS s
				SET
					Duration = ${this.duration}
					,Bytes = ${this.bytes}
					,Truncated = ${this.truncated}
				WHERE s.SegmentId = ${this.segmentId}
			`);
		}
	}
	async repair() {
		const fileName = path.basename(this.path, '.mkv');
		try {
			// ffmpeg -hide_banner -y -loglevel error -i file:2023-03-21T09\:30\:01.mkv -c copy out.mkv
			const args = [
				'-hide_banner',
				'-y',
				'-loglevel', 'error',
				'-i', this.path,
				'-c', 'copy',
				`/dev/shm/${this.nameSanitized}/${fileName}-repaired.mkv`
			];
			const ffmpeg = spawn('ffmpeg', args);
			this.emit('processStart', ffmpeg.pid);
			ffmpeg.stderr.on('data', buff =>
				Logger.warn(`${this.name} ffmpeg repair stderr: ${buff.toString()}`)
			);
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					this.emit('processStop', ffmpeg.pid);
					if (code !== 0)
						return reject(new Error(`ffmpeg repair closed with exit code: ${code}`));
					resolve();
				});
			});
			// pause until file is flushed to disk
			// const fh = await fs.open(`/dev/shm/${fileName}-repaired.mkv`);
			// await fh.sync();
			// await fh.close();
			await new Promise(resolve => setTimeout(resolve, 100));
			await fs.copyFile(`/dev/shm/${this.nameSanitized}/${fileName}-repaired.mkv`, this.path);
			await new Promise(resolve => setTimeout(resolve, 100));
			return true;
		}
		catch (err) {
			Logger.error(`Failed to repair ${this.path}: ${err.stack}`);
			return false;
		}
		finally {
			// attempt to clean up
			try { await fs.unlink(`/dev/shm/${this.nameSanitized}/${fileName}-repaired.mkv`); }
			catch (err) { /* nope! */ }
		}
	}
	toJSON() {
		return {
			name: this.#name,
			path: this.#path,
			date: this.#date,
			duration: this.#duration,
			bytes: this.#bytes,
			truncated: this.#truncated,
			segmentId: this.#segmentId
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.db,
			config.name,
			config.path,
			config.date,
			config.duration,
			config.bytes,
			config.truncated,
			config.segmentId
		);
	}
}
