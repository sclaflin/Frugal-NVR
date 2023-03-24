import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { Database } from 'sqlite';
import SQL from 'sql-template-strings';

export default class Segment {
	#db;
	#name;
	#path;
	#date;
	#duration;
	#bytes;
	#truncated;
	constructor(db, name, path, date) {
		if (!(db instanceof Database))
			throw new TypeError('db must be a Database instance.');
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');
		if (typeof path !== 'string')
			throw new TypeError('path must be a string.');
		if (!Number.isInteger(date))
			throw new TypeError('date must be an integer.');

		this.#db = db;
		this.#name = name;
		this.#path = path;
		this.#date = date;
	}
	async delete() {
		await fs.rm(this.path, { force: true });
		await this.db.run(SQL`
			DELETE
			FROM Segment AS s
			WHERE s.Path = ${this.path}
		`);
	}
	get db() {
		return this.#db;
	}
	get name() {
		return this.#name;
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
	async getBytes() {
		this.#bytes = (await fs.stat(this.path)).size;
	}
	async getMediaInfo() {
		const args = [
			'--Output=JSON',
			this.path
		];
		const mediainfo = spawn('mediainfo', args);
		mediainfo.stderr.on('data', buff => console.error(`mediainfo stderr: ${buff.toString()}`));
		const outBuffs = [];
		mediainfo.stdout.on('data', buff => outBuffs.push(buff));
		await new Promise((resolve, reject) => {
			mediainfo.on('close', code => {
				if (code !== 0)
					return reject(new Error(`mediainfo closed with exit code: ${code}`));
				resolve();
			});
		});
		let info = JSON.parse(Buffer.concat(outBuffs).toString());
		this.#truncated = info?.media?.track?.['0']?.extra?.IsTruncated === 'Yes';
		this.#duration = Math.round(Number(info?.media?.track?.['0']?.Duration || 0));
	}
	async load() {
		const record = await this.db.get(SQL`
			SELECT *
			FROM Segment AS s
			WHERE s.Path = ${this.path}
		`);

		if (!record) {
			await this.getMediaInfo();
			await this.getBytes();
			await this.db.run(SQL`
				INSERT INTO Segment (
					Camera
					,Path
					,Time
					,Bytes
					,Truncated
				)
				VALUES (
					${this.name}
					,${this.path}
					,${this.duration}
					,${this.bytes}
					,${this.truncated}
				)
			`);
		}
		else if (record.Bytes === 0 || record.Truncated) {
			await this.getMediaInfo();
			await this.getBytes();
			await this.db.run(SQL`
				UPDATE Segment AS s
				SET
					Time = ${this.duration}
					,Bytes = ${this.bytes}
					,Truncated = ${this.truncated}
				WHERE s.Path = ${this.path}
			`);
		}
		else {
			this.#duration = record.Time;
			this.#bytes = record.Bytes;
			this.#truncated = record.Truncated === 1;
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
				`/dev/shm/${fileName}-repaired.mkv`
			];
			const ffmpeg = spawn('ffmpeg', args);
			ffmpeg.stderr.on('data', buff => console.error(`ffmpeg repair stderr: ${buff.toString()}`));
			await new Promise((resolve, reject) => {
				ffmpeg.on('close', code => {
					if (code !== 0)
						return reject(new Error(`ffmpeg repair closed with exit code: ${code}`));
					resolve();
				});
			});
			await fs.copyFile(`/dev/shm/${fileName}-repaired.mkv`, this.path);
			return true;
		}
		catch (err) {
			console.error(err);
			return false;
		}
		finally {
			// attempt to clean up
			try { await fs.unlink(`/dev/shm/${fileName}-repaired.mkv`); }
			catch (err) { /* nope! */ }
		}
	}
	toJSON() {
		return {
			path: this.#path,
			date: this.#date,
			bytes: this.#bytes,
			duration: this.#duration,
			truncated: this.#truncated
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		return new this(
			config.db,
			config.name,
			config.path,
			config.date
		);
	}
}
