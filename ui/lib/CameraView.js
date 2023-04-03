import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import Mpegts from 'mpegts.js';
import Config from './Config';
import Camera from './Camera';
import API from './API';
import { durationString, bytesString } from './Utils';
import './SegmentsView';
import './MotionEventsView';
import './CameraControlView';
import './PTZView';

// Turn off the noise. ;)
Mpegts.LoggingControl.enableVerbose = false;

export default class CameraView extends LitElement {
	#config;
	#api;
	#camera;
	#player;
	#currentDate;
	#isLive;

	static styles = [
		baseStyle,
		css`
			.video-parent {
				position: relative;
			}
			video {
				width: 100%;
			}
			frugal-ptz {
				position: absolute;
				height: 6em;
				width: 6em;
				top: calc(50% - 3em);
				right: 1em;
			}
			.events-overlay {
				position: absolute;
				top: 1em;
				right: calc(50% - 5em);
				left: calc(50% - 5em);
				height: 1.25em;
				transition: height 0.25s,
					left 0.25s 0.25s,
					right 0.25s 0.25s;
			}
			.events-wrapper {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				left: 0;
				margin: 1em;
				opacity: 0;
				transition: opacity 0.25s 0.25s;
			}
			.events-label {
				text-align: center;
				vertical-align: middle;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
			.events-overlay:hover,
			.events-overlay:active {
				right: 1em;
				left: 1em;
				height: calc(100% - 2em);
			}
			.events-overlay:hover .events-label,
			.events-overlay:active .events-label {
				display: none;
			}
			.events-overlay:hover .events-wrapper,
			.events-overlay:active .events-wrapper {
				opacity: 1;
			}
			.storage {
				display: flex;
				flex-wrap: wrap;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				gap: 1em;
			}
			.storage > div {
				text-align: center;
			}
		`
	];
	#fullScrenHandler = (e) => {
		if(e.key === 'Enter') {
			if(!document.fullscreenElement) {
				const composite = this.shadowRoot.querySelector('video');
				composite.requestFullscreen().catch((err) => {
					alert(
						`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
					);
				});
			} else {
				document.exitFullscreen();
			}
		}
	};
	get config() {
		return this.#config;
	}
	set config(v) {
		if (v && !(v instanceof Config))
			throw new TypeError('config must be a Config object.');
		this.#config = v;
	}
	get api() {
		return this.#api;
	}
	set api(v) {
		if (v && !(v instanceof API))
			throw new TypeError('api must be an API object.');
		this.#api = v;
	}
	get camera() {
		return this.#camera;
	}
	set camera(v) {
		if (v && !(v instanceof Camera))
			throw new TypeError('camera must be a Camera object.');

		const lastCamera = this.camera;
		this.#camera = v;

		if (lastCamera !== this.camera) {
			setTimeout(async () => {
				const segments = this.shadowRoot.querySelector('frugal-segments');
				if (segments.maxDate === segments.currentDate)
					await this.play();
				else await this.showClip(segments.currentDate, segments.currentDate + segments.clipDuration);
			}, 0);
		}
	}
	get currentDate() {
		return this.#currentDate;
	}
	set currentDate(v) {
		if (!Number.isInteger(v))
			throw new TypeError('currentDate must be an integer.');
		this.#currentDate = v;

		this.requestUpdate();
	}
	get isLive() {
		return this.#isLive;
	}
	set isLive(v) {
		if (typeof v !== 'boolean')
			throw new TypeError('isLive must be a boolean.');
		this.#isLive = v;

		this.requestUpdate();
	}
	async play(objectURL) {
		if (objectURL && typeof objectURL !== 'string')
			throw new TypeError('objectURL must be a string.');
		if (!Mpegts.getFeatureList().mseLivePlayback || !this.config)
			return;
		this.isLive = !objectURL;
		this.#player?.destroy();
		this.#player = Mpegts.createPlayer({
			type: 'flv',
			isLive: this.isLive,
			url: objectURL || `${this.config.streamUrl}live/${this.camera.nameSanitized}.flv`
		});

		const videoElement = this.renderRoot.querySelector('video');
		this.#player.attachMediaElement(videoElement);
		this.#player.load();
		await this.#player.play();
	}
	async showClip(start, stop) {
		try {
			if (!this.api)
				return;
			this.currentDate = start;
			// make sure segments view is updated with the clip start
			const segments = this.shadowRoot.querySelector('frugal-segments');
			segments.currentDate = start;
			// segments.clipDuration = stop - start;
			const objectURL = await this.api.getClip(this.camera, start, stop);
			this.play(objectURL);
		}
		catch (err) {
			console.error(err);
			this.dispatchEvent(new CustomEvent('notify', {
				bubbles: true,
				composed: true,
				detail: {
					title: 'API Error',
					content: err.message
				}
			}));
		}
	}
	async download(start, stop) {
		if (!this.api)
			return;
		this.currentDate = start;

		const objectURL = await this.api.getDownload(this.camera, start, stop);
		const link = document.createElement('a');
		link.href = objectURL;
		const _date = new Date(start * 1000);
		const date = `${_date.getFullYear()}${`0${_date.getMonth() + 1}`.slice(-2)}${_date.getDate()}`;
		const time = `${_date.getHours()}${_date.getMinutes()}${_date.getSeconds()}`;
		link.download = `${this.camera.nameSanitized}_${date}_${time}.mp4`;
		link.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window
			})
		);
		setTimeout(() => {
			// For Firefox it is necessary to delay revoking the ObjectURL
			window.URL.revokeObjectURL(objectURL);
			link.remove();
		}, 100);
	}
	render() {
		const retainHours = this.camera?.retainHours || 0;
		const start = this.camera?.segments?.items[0]?.date || Math.round(Date.now() / 1000);
		const eventCount = this.camera?.motionEvents?.items.length || 0;
		const segmentCount = this.camera?.segments?.items.length || 0;
		const segmentsSize = this.camera?.segments?.bytes || 0;
		const duration = this.camera?.segments?.duration || 0;

		return html`
			<div class="video-parent">
				<video class="border rounded shadow" controls muted></video>
				${(this.camera?.capabilities?.indexOf('PTZ') >= 0 && this.isLive) ? html`<frugal-ptz .camera=${this.camera}></frugal-ptz>` : ''}
				<div class="events-overlay rounded dark-bg">
					<div class="events-label">${eventCount} Motion Events</div>
					<div class="events-wrapper scrollable">
						<frugal-motion-events
							current-date=${this.currentDate}
							.motionEvents=${this.camera?.motionEvents}
							@clip=${e => this.showClip(e.detail.start, e.detail.stop)}
						></frugal-motion-events>
					</div>
				</div>
			</div>
			<fieldset class="border rounded padded-most">
				<legend>Timeline</legend>
				<frugal-segments
					.segments=${this.camera?.segments}
					.motionEvents=${this.camera?.motionEvents}
					start-date=${start}
					segment-count=${segmentCount}
					@currentDate=${e => this.currentDate = e.detail.currentDate}
					@clip=${e => this.showClip(e.detail.start, e.detail.stop)}
					@live=${() => this.play()}
					@download=${(e) => this.download(e.detail.start, e.detail.stop)}
				></frugal-segments>
			</fieldset>
			<fieldset class="border rounded padded-most">
				<legend>Storage</legend>
				<div class="storage">
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Disk</div>
						<div class="value">${bytesString(segmentsSize)}</div>
					</div>
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Duration</div>
						<div class="value">${durationString(duration)}</div>
					</div>
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Retention</div>
						<div class="value">${durationString(retainHours * 60 * 60)}</div>
					</div>
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Segments</div>
						<div class="value">${segmentCount}</div>
					</div>
				</div>
			</fieldset>
			<fieldset class="border rounded padded-most">
				<legend>Control</legend>
				<frugal-camera-control .camera=${this.camera}></frugal-camera-control>
			</fieldset>
		`;
	}
	connectedCallback() {
		super.connectedCallback();
		document.addEventListener('keydown', this.#fullScrenHandler);
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		this.#player?.destroy();
		document.removeEventListener('keydown', this.#fullScrenHandler);
	}
}
customElements.define('frugal-camera-view', CameraView);
