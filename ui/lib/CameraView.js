import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import Mpegts from 'mpegts.js';
import Config from './Config';
import Camera from './Camera';
import API from './API';
import './SegmentsView';
import './EventsView';

// Turn off the noise. ;)
Mpegts.LoggingControl.enableVerbose = false;

export default class CameraView extends LitElement {
	#config;
	#api;
	#camera;
	#player;
	#updateInterval;

	static properties = {
		currentDate: { type: Number, attribute: 'current-date' }
	};
	static styles = [
		baseStyle,
		css`
			.video-parent {
				position: relative;
			}
			video {
				width: 100%;
			}
			.video-overlay {
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
			.video-overlay:hover,
			.video-overlay:active {
				right: 1em;
				left: 1em;
				height: calc(100% - 2em);
			}
			.video-overlay:hover .events-label,
			.video-overlay:active .events-label {
				display: none;
			}
			.video-overlay:hover .events-wrapper,
			.video-overlay:active .events-wrapper {
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
	get config() {
		return this.#config;
	}
	set config(v) {
		if(v && !(v instanceof Config))
			throw new TypeError('config must be a Config object.');
		this.#config = v;
	}
	get api() {
		return this.#api;
	}
	set api(v) {
		if(v && !(v instanceof API))
			throw new TypeError('api must be an API object.');
		this.#api = v;
	}
	get camera() {
		return this.#camera;
	}
	set camera(v) {
		if(v && !(v instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		this.#camera = v;

		(async () => {
			await this.updateCamera();
			const segments = this.shadowRoot.querySelector('frugal-segments');
			if (segments.maxDate === segments.currentDate)
				await this.play();
			else await this.showClip(segments.currentDate, segments.currentDate + segments.clipDuration);
		})();
	}
	async updateCamera() {
		try {
			await this.camera.updateSegments();
			await this.camera.updateEvents();

			this.requestUpdate();
		}
		catch (err) {
			console.error(err);
		}
	}
	async play(objectURL) {
		if (objectURL && typeof objectURL !== 'string')
			throw new TypeError('objectURL must be a string.');
		if (!Mpegts.getFeatureList().mseLivePlayback || !this.config)
			return;
		this.#player?.destroy();
		this.#player = Mpegts.createPlayer({
			type: 'flv',
			isLive: !!objectURL,
			url: objectURL || `${this.config.streamUrl}live/${this.camera.nameSanitized}.flv`
		});

		const videoElement = this.renderRoot.querySelector('video');
		this.#player.attachMediaElement(videoElement);
		this.#player.load();
		await this.#player.play();
	}
	async showClip(start, stop) {
		if (!this.api)
			return;
		this.currentDate = start;
		// make sure segments view is updated with the clip start
		const segments = this.shadowRoot.querySelector('frugal-segments');
		segments.currentDate = start;
		segments.clipDuration = stop - start;
		const objectURL = await this.api.getClip(this.camera, start, stop);
		this.play(objectURL);
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
		const eventCount = this.camera?.events?.items.length || 0;
		const segmentCount = this.camera?.segments?.items.length || 0;
		const segmentsSize = this.camera?.segments?.bytes || 0;

		// calculate the total time recorded
		const segmentsTime = new Date(0);
		const now = Math.round(Date.now() / 1000);
		const lastSegment = this.camera?.segments?.items.slice(-1)[0];
		const accruedSegmentTime = now - (lastSegment?.truncated ? lastSegment.date : now);
		segmentsTime.setSeconds((this.camera?.segments?.duration || 0) + accruedSegmentTime);
		const segmentsDuration = segmentsTime.toISOString().substring(11, 19);

		return html`
			<div class="video-parent">
				<video class="border rounded shadow" controls muted></video>
				<div class="video-overlay rounded dark-bg">
					<div class="events-label">${eventCount} Motion Events</div>
					<div class="events-wrapper scrollable">
						<frugal-events
							current-date=${this.currentDate}
							.events=${this.camera?.events}
							@clip=${e => { const { start, stop } = e.detail; this.showClip(start, stop); }}
						></frugal-events>
					</div>
				</div>
			</div>
			<fieldset class="border rounded padded-most">
				<legend>Timeline</legend>
				<frugal-segments
					.segments=${this.camera?.segments}
					.events=${this.camera?.events}
					start-date=${start}
					segment-count=${segmentCount}
					@currentDate=${e => this.currentDate = e.detail.currentDate}
					@clip=${e => { const { start, stop } = e.detail; this.showClip(start, stop); }}
					@live=${() => this.play()}
					@download=${(e) => this.download(e.detail.start, e.detail.stop)}
				></frugal-segments>
			</fieldset>
			<fieldset class="border rounded padded-most">
				<legend>Storage</legend>
				<div class="storage">
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Disk</div>
						<div class="value">${Math.round(segmentsSize / 1024 / 1024 / 1024 * 100) / 100} GiB</div>
					</div>
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Time</div>
						<div class="value">${segmentsDuration}</div>
					</div>
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Retention</div>
						<div class="value">${retainHours} H</div>
					</div>
					<div class="badge border rounded shadow dark-bg">
						<div class="header">Segments</div>
						<div class="value">${segmentCount}</div>
					</div>
				</div>
			</fieldset>
		`;
	}
	connectedCallback() {
		super.connectedCallback();
		this.#updateInterval = setInterval(async () => {
			if(this.camera)
				await this.updateCamera();
		}, 5000);
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		if (this.#updateInterval) {
			clearTimeout(this.#updateInterval);
			this.#updateInterval = null;
		}
		this.#player?.destroy();
	}
}
customElements.define('frugal-camera-view', CameraView);
