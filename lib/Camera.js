import { spawn } from 'child_process';
import { EventEmitter } from 'node:events';
import { URL } from 'node:url';
import path from 'node:path';
import fs from 'fs/promises';
import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Cam } from 'onvif';
import { FSWatcher } from 'chokidar';
import * as systeminformation from 'systeminformation';
import * as constants from './constants.js';
import Segments from './Segments.js';
import OnvifEvent from './OnvifEvent.js';
import Segment from './Segment.js';
import WebUI from './WebUI.js';
import WebSocketEvent from './WebSocketEvent.js';
import MotionEvents from './MotionEvents.js';
import MotionEvent from './MotionEvent.js';
import Logger from './Logger.js';
import { stringToDate } from './Util.js';
import ProcessToken from './ProcessToken.js';

const defaultThumb = await fs.readFile('./images/smpte.jpeg');
const platform = (await systeminformation.osInfo()).platform.toUpperCase();

export default class Camera extends EventEmitter {
	#name;
	#tempPath;
	#ffmpegPath;
	#mediainfoPath;
	#videoPath;
	#watcher;
	#retainHours;
	#generateThumbs;
	#segments;
	#motionEvents;
	#db;
	#cam;
	#webUI;

	#ffmpegSplitter;
	#ffmpegFrameGrabber;
	#retryTimeout;
	#running = false;
	#thumb;
	#thumbnailWidth;
	#segmentUpdateFrequency;
	#segmentChangeTimeout;

	constructor(
		name,
		tempPath,
		ffmpegPath = constants.DEFAULT_FFMPEG_PATH,
		mediainfoPath = constants.DEFAULT_MEDIAINFO_PATH,
		videoPath = constants.CAM_DEFAULT_VIDEO_PATH,
		watcher,
		cam,
		retainHours = constants.CAM_DEFAULT_RETAIN_HOURS,
		generateThumbs = constants.CAM_DEFAULT_GENERATE_THUMBS,
		thumbnailWidth = constants.CAM_DEFAULT_THUMBNAIL_WIDTH,
		segmentUpdateFrequency = constants.SEGMENT_UPDATE_FREQUENCY
	) {
		if (typeof name !== 'string')
			throw new TypeError('name must be a string.');
		if (typeof tempPath !== 'string')
			throw new TypeError('tempPath must be a string.');
		if (typeof ffmpegPath !== 'string')
			throw new TypeError('ffmpegPath must be a string.');
		if (typeof mediainfoPath !== 'string')
			throw new TypeError('mediainfoPath must be a string.');
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
		if (!Number.isInteger(segmentUpdateFrequency))
			throw new TypeError('segmentUpdateFrequency must be an integer.');

		super();

		this.#name = name;
		this.#tempPath = tempPath;
		this.#ffmpegPath = ffmpegPath;
		this.#mediainfoPath = mediainfoPath;
		this.#videoPath = videoPath;
		this.#watcher = watcher;
		this.#cam = cam;
		this.#retainHours = retainHours;
		this.#generateThumbs = generateThumbs;
		this.#thumbnailWidth = thumbnailWidth;
		this.#thumb = defaultThumb;
		this.#segmentUpdateFrequency = segmentUpdateFrequency;
		this.#segments = new Segments();
		this.segments.name = this.name;

		this.segments.path = `${this.videoPath}/${this.nameSanitized}`;
		this.segments.tempPath = this.tempPath;
		this.segments.ffmpegPath = this.ffmpegPath;
		this.segments.mediainfoPath = this.mediainfoPath;
		this.segments.retainHours = this.retainHours;
		this.segments.on('processStart', processToken => this.emit('processStart', processToken, this));
		this.segments.on('processStop', processToken => this.emit('processStop', processToken, this));
		this.segments.on('segmentRepair', segment => this.emit('segmentRepair', segment));
		this.#motionEvents = new MotionEvents();
	}
	get name() {
		return this.#name;
	}
	get tempPath() {
		return this.#tempPath;
	}
	get nameSanitized() {
		return this.name.replace(/[^a-zA-Z0-9]+/g, '_');
	}
	get ffmpegPath() {
		return this.#ffmpegPath;
	}
	get mediainfoPath() {
		return this.#mediainfoPath;
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
	get segmentUpdateFrequency() {
		return this.#segmentUpdateFrequency;
	}
	get segments() {
		return this.#segments;
	}
	get motionEvents() {
		return this.#motionEvents;
	}
	get db() {
		return this.#db;
	}
	set db(v) {
		if (!(v instanceof Database))
			throw new TypeError('db must be a sqlite.Database object.');
		this.#db = v;
		this.segments.db = this.db;
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
	get webUI() {
		return this.#webUI;
	}
	set webUI(v) {
		if (!(v instanceof WebUI))
			throw new TypeError('webUI must be a WebUI object.');
		this.#webUI = v;
	}
	toJSON() {
		return {
			name: this.name,
			videoPath: this.videoPath,
			retainHours: this.retainHours,
			segments: this.segments,
			motionEvents: this.motionEvents,
			capabilities: Object.keys(this.cam.capabilities)
		};
	}
	#processWatcherEvent = async (event, filePath) => {
		// normalize slashes
		filePath = filePath.replace(/\\/g, '/');
		// handle thumbnails
		const imageRegex = new RegExp(`^${this.tempPath}/${this.nameSanitized}/([0-9]{4}[0-9]{2}[0-9]{2}T[0-9]{2}[0-9]{2}[0-9]{2})\\.jpg$`);
		if (imageRegex.test(filePath)) {
			if (event !== 'add') return;
			setTimeout(async () => {
				try {
					this.#thumb = await fs.readFile(filePath);
					this.emit('thumb', this);
				}
				catch (err) {
					Logger.error(`Failed process thumbnail for ${this.name}: ${err.stack}`);
				}
				finally {
					await fs.unlink(filePath);
				}
			}, 100);
		}

		// handle segments
		const segmentRegex = new RegExp(`^${this.videoPath}/${this.nameSanitized}/([0-9]{4}[0-9]{2}[0-9]{2}T[0-9]{2}[0-9]{2}[0-9]{2})\\.mkv$`);
		if (segmentRegex.test(filePath)) {
			if (event === 'add') {
				const file = path.basename(filePath);
				const segment = Segment.fromObject({
					db: this.db,
					name: this.name,
					path: filePath,
					tempPath: this.tempPath,
					ffmpegPath: this.ffmpegPath,
					mediainfoPath: this.mediainfoPath,
					date: Math.floor(stringToDate(file.match(constants.SEGMENTS_SEQUENCE_REGEX)[1]).getTime() / 1000)
				});
				// add the new segment
				await segment.upsert();
				this.segments.add(segment);
				this.webUI?.sendEvent(WebSocketEvent.fromObject({
					name: 'segment.add',
					data: segment
				}));
			}
			else if (event === 'change' && !this.#segmentChangeTimeout) {
				this.#segmentChangeTimeout = setTimeout(async () => {
					this.emit('segmentUpdate', this.segments.items.find(segment => segment.path === filePath));
					this.#segmentChangeTimeout = null;
				}, this.segmentUpdateFrequency * 1000);
			}
		}
	};
	#processCamEvent = async (msg) => {
		try {
			if (!this.db)
				throw new Error('db not assigned.');
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

			// was this a motion event that changed?
			if (event.topic === 'VideoSource/MotionAlarm' && event.property === 'Changed') {
				const motion = event.data.find(v => v.name === 'State').value;
				if (motion) {
					this.motionEvents.add(MotionEvent.fromObject({
						start: Math.round(event.time.getTime() / 1000) - constants.CAM_DEFAULT_TIME_PADDING,
						stop: null
					}));
				}
				else {
					const motionEvent = this.motionEvents.items.slice(-1)[0];
					if (motionEvent.isActive)
						motionEvent.stop = Math.round(event.time.getTime() / 1000) + constants.CAM_DEFAULT_TIME_PADDING;
				}
				this.emit('motion', motion, this);
				// send
				this.webUI?.sendEvent(WebSocketEvent.fromObject({
					name: `motionEvent.${motion ? 'start' : 'stop'}`,
					data: {
						name: this.name,
						date: Math.round(event.time.getTime() / 1000) + (motion ? -constants.CAM_DEFAULT_TIME_PADDING : constants.CAM_DEFAULT_TIME_PADDING)
					}
				}));
			}
		}
		catch (err) {
			Logger.error(`Cam event processing error for ${this.name}: ${err.stack}`);
		}
	};
	async loadMotionEvents(timePadding = constants.CAM_DEFAULT_TIME_PADDING) {
		if (!this.db)
			throw new Error('db not assigned.');
		this.motionEvents.clear();
		this.motionEvents.add(...(await this.db.all(SQL`
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
		`)).map(record => MotionEvent.fromObject(record)));
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
			Logger.warn(`Camera restart already pending for ${this.name}`);
			return;
		}
		Logger.info(`Scheduling camera restart for ${this.name}`);
		this.#retryTimeout = setTimeout(
			async () => {
				try {
					this.#retryTimeout = null;
					Logger.info(`Restarting camera for ${this.name}`);
					await this.start();
				}
				catch (err) {
					Logger.error(`Failed to restart camera for ${this.name}: ${err.stack}`);
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
			// make sure the temp path exists
			await fs.mkdir(`${this.tempPath}/${this.nameSanitized}`, { recursive: true });
			// recursively remove any files in the temp path
			for(const file of await fs.readdir(`${this.tempPath}/${this.nameSanitized}`))
				await fs.rm(`${this.tempPath}/${this.nameSanitized}/${file}`, { recursive: true, force: true });
			// make sure the video path exists
			await fs.mkdir(`${this.videoPath}/${this.nameSanitized}`, { recursive: true });
			// load the segments
			await this.segments.load();
			// load existing motion events
			await this.loadMotionEvents();
			// listen to file watcher events
			this.watcher.on('all', this.#processWatcherEvent);
			// start paying attention to video path
			this.watcher.add(`${this.videoPath}/${this.nameSanitized}`);
			// listen to onvif camera events
			this.cam.on('event', this.#processCamEvent);
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
				platform !== constants.PLATFORM_WINDOWS ? '-stimeout' : '-timeout', '10000000',
				// '-timeout', '10000000',
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
				`${this.videoPath}/${this.nameSanitized}/%Y%m%dT%H%M%S.mkv`,

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

				// start paying attention to tempPath
				this.watcher.add(`${this.tempPath}/${this.nameSanitized}`);
			}
			this.#ffmpegSplitter = spawn(this.ffmpegPath, splitterArgs);
			this.emit('processStart', new ProcessToken(this.#ffmpegSplitter.pid, 'ffmpeg'), this);
			this.emit('record', true, this);
			this.#ffmpegSplitter.stderr.on('data', buff => 
				Logger.warn(`${this.name} FFMPEG splitter stderr: ${buff.toString()}`)
			);
			this.#ffmpegSplitter.on('close', code => {
				this.emit('processStop', new ProcessToken(this.#ffmpegSplitter.pid, 'ffmpeg'), this);
				this.emit('record', false, this);
				this.#ffmpegSplitter = null;
				if (this.#running) {
					Logger.error(`${this.name} FFMPEG spliiter closed unexpectedly. Exit code: ${code}`);
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
					// resize the image
					'-filter:v', `scale=${this.thumbnailWidth}:-1`,
					// set the jpeg quality
					'-qscale:v', '4',
					// name the file according to current time
					'-strftime', '1',
					// output dat file
					`${this.tempPath}/${this.nameSanitized}/%Y%m%dT%H%M%S.jpg`,
				];
				this.#ffmpegFrameGrabber = spawn(this.ffmpegPath, grabberArgs);
				this.emit('processStart', new ProcessToken(this.#ffmpegFrameGrabber.pid, 'ffmpeg'), this);
				this.#ffmpegFrameGrabber.stderr.on('data', buff => 
					Logger.warn(`${this.name} FFMPEG grabber stderr: ${buff.toString()}`)
				);
				this.#ffmpegFrameGrabber.on('close', code => {
					this.emit('processStop', new ProcessToken(this.#ffmpegFrameGrabber.pid, 'ffmpeg'), this);
					this.#thumb = defaultThumb;
					this.#ffmpegFrameGrabber = null;
					if (this.#running) {
						Logger.error(`${this.name} FFMPEG grabber closed unexpectedly. Exit code: ${code}`);
						this.emit('failed', code);
					}
				});

				// pipe the splitter into the grabber
				this.#ffmpegSplitter.stdout.pipe(this.#ffmpegFrameGrabber.stdin);
			}
		}
		catch (err) {
			Logger.error(`${this.name} Failed to start: ${err.stack}`);
			this.restart();
		}
	}
	stop() {
		this.#running = false;
		// stop listening to watcher file events
		this.watcher.close();
		this.watcher.off('add', this.#processWatcherEvent);

		// stop listening to onvif camera events
		this.cam.off('event', this.#processCamEvent);

		if (this.#retryTimeout) {
			clearTimeout(this.#retryTimeout);
			this.#retryTimeout = null;
		}

		if (this.#segmentChangeTimeout) {
			clearTimeout(this.#segmentChangeTimeout);
			this.#segmentChangeTimeout = null;
		}

		if (this.#ffmpegSplitter)
			this.#ffmpegSplitter.stdin.write('q');
	}
	static async fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');

		Logger.info(`Connecting to ${config.name} via ONVIF...`);
		const cam = await new Promise((resolve, reject) => {
			const cam = new Cam(config.onvif, err => {
				if (err) reject(err);
				else resolve(cam);
			});
		});
		// call getCapabilities (populates on the cam object)
		Logger.info(`Querying ${config.name} for capabilities...`);
		await new Promise((resolve, reject) => {
			cam.getCapabilities(err => {
				if (err) return reject(err);
				resolve();
			});
		});

		Logger.info(`Initializing ${config.name} file watcher...`);
		const watcher = new FSWatcher({
			ignored: /(^|[/\\])\../, // ignore dotfiles
			persistent: true,
			ignoreInitial: true
		});

		return new this(
			config.name,
			config.tempPath,
			config.ffmpegPath,
			config.mediainfoPath,
			config.videoPath,
			watcher,
			cam,
			config.retainHours,
			config.generateThumbs,
			config.thumbnailWidth,
			config.segmentUpdateFrequency
		);
	}
}
