import { spawn } from 'child_process';
import { EventEmitter } from 'node:events';
import { URL } from 'node:url';
import fs from 'fs/promises';
import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Cam } from 'onvif';
import { FSWatcher } from 'chokidar';
import sharp from 'sharp';
import * as constants from './constants.js';
import Segments from './Segments.js';
import OnvifEvent from './OnvifEvent.js';

export default class Camera extends EventEmitter {
	#name;
	#videoPath;
	#watcher;
	#retainHours;
	#generateThumbs;
	#segments;
	#db;
	#cam;

	#watcherEventHandler;
	#camEventHandler;
	#ffmpegSplitter;
	#ffmpegFrameGrabber;
	#retryTimeout;
	#running = false;
	#thumb;
	#thumbnailWidth;

	constructor(
		name,
		videoPath = constants.CAM_DEFAULT_VIDEO_PATH,
		watcher,
		cam,
		retainHours = constants.CAM_DEFAULT_RETAIN_HOURS,
		generateThumbs = constants.CAM_DEFAULT_GENERATE_THUMBS,
		thumbnailWidth = constants.CAM_DEFAULT_THUMBNAIL_WIDTH
	) {
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');
		if (typeof videoPath !== 'string')
			throw new TypeError('videoPath must be a string.');
		if (!(watcher instanceof FSWatcher))
			throw new TypeError('watcher must be an FSWatcher object.');
		if (!(cam instanceof Cam))
			throw new TypeError('cam must be an onvif.Cam object.');
		if (!Number.isInteger(retainHours))
			throw new TypeError('retainHours must be an integer.');
		if (typeof generateThumbs !== 'boolean')
			throw new TypeError('generateThumbs must be a boolean.');
		if (!Number.isInteger(thumbnailWidth))
			throw new TypeError('thumbnailWidth must be an integer.');

		super();

		this.#name = name;
		this.#videoPath = videoPath;
		this.#watcher = watcher;
		this.#watcher = watcher;
		this.#cam = cam;
		this.#retainHours = retainHours;
		this.#generateThumbs = generateThumbs;
		this.#thumbnailWidth = thumbnailWidth;
		this.#segments = new Segments();
		this.segments.name = this.nameSanitized;
		this.segments.path = `${this.videoPath}/${this.nameSanitized}`;
		this.segments.retainHours = this.retainHours;

		this.#watcherEventHandler = async (path) => {
			// allow enough time for the file write to complete
			// before attempting to process it
			setTimeout(async () => {
				try {
					await this.processWatcherEvent(path);
				}
				catch (err) {
					console.error(`File watcher processing error: ${err.stack}`);
				}
			}, 100);
		};
		this.#camEventHandler = async (msg) => {
			try {
				await this.processCamEvent(msg);
			}
			catch (err) {
				console.error(`Cam event processing error: ${err.stack}`);
			}
		};
	}
	get name() {
		return this.#name;
	}
	get nameSanitized() {
		return this.name.replace(/[^a-zA-Z0-9]+/g, '_');
	}
	async getSource() {
		const { uri } = await new Promise((resolve, reject) => {
			this.cam.getStreamUri({ protocol: 'RTSP' }, (err, stream) => {
				if (err) return reject(err);
				return resolve(stream);
			});
		});

		const url = new URL(uri);
		url.username = this.cam.username;
		url.password = this.cam.password;

		return url;
	}
	get videoPath() {
		return this.#videoPath;
	}
	get retainHours() {
		return this.#retainHours;
	}
	get generateThumbs() {
		return this.#generateThumbs;
	}
	get thumbnailWidth() {
		return this.#thumbnailWidth;
	}
	get segments() {
		return this.#segments;
	}
	get db() {
		return this.#db;
	}
	set db(v) {
		if (!(v instanceof Database))
			throw new TypeError('db must be a sqlite.Database object.');
		this.#db = v;
	}
	get watcher() {
		return this.#watcher;
	}
	get cam() {
		return this.#cam;
	}
	get thumb() {
		return this.#thumb;
	}
	toJSON() {
		return {
			name: this.#name,
			videoPath: this.#videoPath,
			retainHours: this.#retainHours
		};
	}
	async processWatcherEvent(path) {
		const regex = new RegExp(`^/dev/shm/${this.nameSanitized}/([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2})\\.jpg$`);
		if (!regex.test(path))
			return;
		try {
			this.#thumb = await sharp(path)
				.resize(this.thumbnailWidth)
				.jpeg()
				.toBuffer();
		}
		catch (err) {
			console.error(err);
		}
		finally {
			await fs.unlink(path);
		}
	}
	async processCamEvent(msg) {
		// Extract Event Details
		// Events have a Topic
		// Events have (optionally) a Source, a Key and Data fields
		// The Source,Key and Data fields can be single items or an array of items
		// The Source,Key and Data fields can be of type SimpleItem or a Complex Item

		//    - Topic
		//    - Message/Message/$
		//    - Message/Message/Source...
		//    - Message/Message/Key...
		//    - Message/Message/Data/SimpleItem/[index]/$/name   (array of items)
		// OR - Message/Message/Data/SimpleItem/$/name   (single item)
		//    - Message/Message/Data/SimpleItem/[index]/$/value   (array of items)
		// OR - Message/Message/Data/SimpleItem/$/value   (single item)

		// console.log(JSON.stringify(msg, null , '\t'));
		const message = msg?.message?.message || null;

		// simpleItem can be a single item or an array of items. Normalise to an array.
		const _source = message?.source?.simpleItem || [];
		const source = Array.isArray(_source) ? _source : [_source];
		const _data = message?.data?.simpleItem || [];
		const data = Array.isArray(_data) ? _data : [_data];
		const event = OnvifEvent.fromObject({
			// source: tns1:MediaControl/tnsavg:ConfigurationUpdateAudioEncCfg
			// target: MediaControl/ConfigurationUpdateAudioEncCfg
			topic: msg?.topic?._
				.split('/')
				.map(v => v.split(':').pop())
				.join('/'),
			// the time stamp appears to be off by an hour 
			// even though the time shown on the camera (Amcrest) is correct
			// use the current system time instead.
			time: new Date(), //message?.$?.UtcTime || null,
			property: message?.$?.PropertyOperation || null,
			source: source.map(v => ({
				name: v?.$?.Name,
				value: v?.$?.Value
			})),
			data: data.map(v => ({
				name: v?.$?.Name,
				value: v?.$?.Value
			}))
		});

		await this.recordOnvifEvent(event);
	}
	async recordOnvifEvent(event) {
		if (!this.db)
			throw new Error('db not assigned.');
		if (!(event instanceof OnvifEvent))
			throw new TypeError('event must be an OnvifEvent object.');

		const { lastID } = await this.db.run(SQL`
			INSERT INTO Event (
				Camera
				,Topic
				,Time
				,Property
			)
			VALUES (
				${this.name}
				,${event.topic}
				,${Math.round(event.time.getTime() / 1000)}
				,${event.property}
			);
		`);
		for (const source of event.source) {
			await this.db.run(SQL`
				INSERT INTO EventSource (
					EventId
					,Name
					,Value
				)
				VALUES (
					${lastID}
					,${source.name}
					,${source.value}
				);
			`);
		}
		for (const data of event.data) {
			await this.db.run(SQL`
				INSERT INTO EventData (
					EventId
					,Name
					,Value
				)
				VALUES (
					${lastID}
					,${data.name}
					,${data.value}
				);
			`);
		}

	}
	async getMotionEvents(start, stop, timePadding = constants.CAM_DEFAULT_TIME_PADDING) {
		if (!this.db)
			throw new Error('db not assigned.');
		if (!Number.isInteger(start))
			throw new TypeError('start must be an integer.');
		if (!Number.isInteger(stop))
			throw new TypeError('stop must be an integer.');

		return await this.db.all(SQL`
			WITH RECURSIVE MotionEvent(Camera, Time, Value, RowNum) AS (
				SELECT
					e.Camera
					,e.Time
					,ed.Value
					,ROW_NUMBER() OVER(ORDER BY Time ASC, Value DESC) AS RowNum
				FROM Event AS e
				INNER JOIN EventData AS ed
					ON ed.EventId = e.EventId
					AND ed.Name = 'State'
				WHERE e.Topic = 'VideoSource/MotionAlarm'
				AND e.Time BETWEEN ${start} AND ${stop}
				AND e.Camera = ${this.name}
			)
			SELECT
				me.Time - ${timePadding} AS start
				,me2.Time + ${timePadding} AS stop
			FROM MotionEvent AS me
			LEFT JOIN MotionEvent AS me2
				ON me2.RowNum = me.RowNum + 1
			WHERE me.Value = 1
			AND me2.Time - me.Time >= ${constants.CAM_MINIMUM_CLIP_LENGTH};
		`);
	}
	async pruneData() {
		if (!this.db)
			throw new Error('db not assigned.');

		const pruneTime = Math.round(Date.now() / 1000) - (constants.SECONDS_PER_HOUR * this.retainHours) - constants.CAM_RETENTION_OVERLAP;
		await this.db.run(SQL`
			DELETE
			FROM Event AS e
			WHERE e.Camera = ${this.name}
			AND e.Time < ${pruneTime}	
		`);
	}
	async restart() {
		if (this.#retryTimeout) {
			console.log('Camera restart already pending.');
			return;
		}
		console.log('Scheduling camera restart.');
		this.#retryTimeout = setTimeout(
			async () => {
				try {
					this.#retryTimeout = null;
					console.log('Restarting camera.');
					await this.start();
				}
				catch (err) {
					console.error(err);
				}
			},
			constants.CAM_RETRY_DELAY * 1000
		);
	}
	async start() {
		try {
			if (this.#retryTimeout)
				return;
			if (this.#running)
				this.stop();
			this.#running = true;
			// make sure the path exists
			await fs.mkdir(`/dev/shm/${this.nameSanitized}`, { recursive: true });
			// listen to onvif camera events
			this.cam.on('event', this.#camEventHandler);
			// make sure the path exists
			await fs.mkdir(`${this.videoPath}/${this.nameSanitized}`, { recursive: true });
			const splitterArgs = [
				// don't show the noisy ffmpeg banner
				'-hide_banner',
				// overwrite output files
				'-y',
				// only complain on errors
				'-loglevel', 'error',
				// force tcp
				'-rtsp_transport', 'tcp',
				// set a disconnect timeout (microseconds)
				'-stimeout', '10000000',
				// rebuild the timestamps in the video feed
				'-use_wallclock_as_timestamps', '1',
				// video source
				'-i', `${await this.getSource()}`,

				// write to disk
				// passthrough video & audio
				'-vcodec', 'copy',
				'-acodec', 'copy',
				// split the stream into smaller segments
				'-f', 'segment',
				// resets timestamps to zero for each segment
				'-reset_timestamps', '1',
				// how long the segment should be
				'-segment_time', constants.CAM_SEGMENT_LENGTH,
				// start and finish the segments at rounded times
				'-segment_atclocktime', '1',
				// output to mkv
				'-segment_format', 'mkv',
				// name the file according to current time
				'-strftime', '1',
				`${this.videoPath}/${this.nameSanitized}/%Y-%m-%dT%H:%M:%S.mkv`,

				// stream to RTMP server
				'-acodec', 'copy',
				'-vcodec', 'copy',
				'-f', 'flv',
				`rtmp://localhost/live/${this.nameSanitized}`
			];
			// additional output if we're generating thumbnails
			if (this.generateThumbs) {
				splitterArgs.push(
					// stream to stdout
					'-acodec', 'copy',
					'-vcodec', 'copy',
					'-f', 'h264',
					'pipe:1'
				);
				// listen to file watcher events
				this.watcher.on('add', this.#watcherEventHandler);
				// start paying attention to /dev/shm
				this.watcher.add('/dev/shm');
			}
			this.#ffmpegSplitter = spawn('ffmpeg', splitterArgs);
			this.#ffmpegSplitter.stderr.on('data', buff => console.error(`FFMPEG splitter stderr: ${buff.toString()}`));
			this.#ffmpegSplitter.on('close', code => {
				this.#ffmpegSplitter = null;
				if (this.#running) {
					console.error(`FFMPEG spliiter closed unexpectedly. Exit code: ${code}`);
					this.emit('failed', code);
					this.restart();
				}
			});

			// separate ffmpeg to capture still images
			// this is more efficient because it allows
			// us to drop non-key frames and avoid extra
			// processing.
			if (this.generateThumbs) {
				const grabberArgs = [
					// don't show the noisy ffmpeg banner
					'-hide_banner',
					// only complain on errors
					'-loglevel', 'error',
					// input stream is h264
					'-f', 'h264',
					// throw out non-key frames
					'-skip_frame', 'nokey',
					// set stdin as the source
					'-i', 'pipe:',
					// set variable frame rate
					'-vsync', 'vfr',
					// ???
					'-frame_pts', 'true',
					// name the file according to current time
					'-strftime', '1',
					// output dat file
					`/dev/shm/${this.nameSanitized}/%Y-%m-%dT%H:%M:%S.jpg`,
				];
				this.#ffmpegFrameGrabber = spawn('ffmpeg', grabberArgs);
				this.#ffmpegFrameGrabber.stderr.on('data', buff => console.error(`FFMPEG grabber stderr: ${buff.toString()}`));
				this.#ffmpegFrameGrabber.on('close', code => {
					this.#ffmpegFrameGrabber = null;
					if (this.#running) {
						console.error(`FFMPEG grabber closed unexpectedly. Exit code: ${code}`);
						this.emit('failed', code);
					}
				});

				// pipe the splitter into the grabber
				this.#ffmpegSplitter.stdout.pipe(this.#ffmpegFrameGrabber.stdin);
			}
		}
		catch (err) {
			console.error(`Failed to start: ${err.stack}`);
			this.restart();
		}
	}
	stop() {
		this.#running = false;
		// stop listening to watcher file events
		this.watcher.close();
		this.watcher.off('add', this.#watcherEventHandler);

		// stop listening to onvif camera events
		this.cam.off('event', this.#camEventHandler);

		if (this.#retryTimeout) {
			clearTimeout(this.#retryTimeout);
			this.#retryTimeout = null;
		}

		if (this.#ffmpegSplitter)
			this.#ffmpegSplitter.stdin.write('q');
	}
	static async fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		const cam = await new Promise((resolve, reject) => {
			const cam = new Cam(config.onvif, err => {
				if (err) reject(err);
				else resolve(cam);
			});
		});

		const watcher = new FSWatcher({
			ignored: /(^|[/\\])\../, // ignore dotfiles
			persistent: true
		});

		return new this(
			config.name,
			config.videoPath,
			watcher,
			cam,
			config.retainHours,
			config.generateThumbs,
			config.thumbnailWidth
		);
	}
}
