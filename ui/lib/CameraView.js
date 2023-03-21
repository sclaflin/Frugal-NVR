import { html, css, LitElement } from 'lit';
import { NeedsMixin } from './NeedsMixin';
import { NeedsCamerasMixin } from './NeedsCamerasMixin';
import { NeedsConfigMixin } from './NeedsConfigMixin';
import { NeedsAPIMixin } from './NeedsAPIMixin';
import baseStyle from './base-style';
import Mpegts from 'mpegts.js';
import Camera from './Camera';
import './SegmentsView';
import './EventsView';

export default class CameraView extends NeedsAPIMixin(NeedsCamerasMixin(NeedsConfigMixin(NeedsMixin(LitElement)))) {
	#player;
	#updateInterval;

	static properties = {
		cameraIndex: { type: Number, attribute: 'camera-index' },
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
			.stats {
				display: flex;
				flex-wrap: wrap;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				gap: 1em;
			}
			.stats > div {
				text-align: center;
			}
		`
	];
	async updateCamera(camera) {
		try {
			if (!(camera instanceof Camera))
				throw new TypeError('camera must be a Camera object.');

			await camera.updateSegments();
			await camera.updateSegmentsSize();
			await camera.updateEvents();

			this.requestUpdate();
		}
		catch (err) {
			console.error(err);
		}
	}
	async gotCameras() {
		await this.updateCamera(this.cameras.items[this.cameraIndex]);
		await this.play();
	}
	async play(objectURL) {
		if (objectURL && typeof objectURL !== 'string')
			throw new TypeError('objectURL must be a string.');
		if (!Mpegts.getFeatureList().mseLivePlayback || !this.config)
			return;
		const camera = this.cameras.items[this.cameraIndex];
		this.#player?.destroy();
		this.#player = Mpegts.createPlayer({
			type: 'flv',
			isLive: !!objectURL,
			url: objectURL || `${this.config.streamUrl}live/${camera.nameSanitized}.flv`
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
		this.shadowRoot.querySelector('frugal-segments').currentDate = start;
		const objectURL = await this.api.getClip(this.cameras.items[this.cameraIndex], start, stop);
		this.play(objectURL);
	}
	async download(start, stop) {
		if (!this.api)
			return;
		this.currentDate = start;

		const objectURL = await this.api.getDownload(this.cameras.items[this.cameraIndex], start, stop);
		const link = document.createElement('a');
		link.href = objectURL;
		const _date = new Date(start * 1000);
		const date = `${_date.getFullYear()}${`0${_date.getMonth()+1}`.slice(-2)}${_date.getDate()}`;
		const time = `${_date.getHours()}${_date.getMinutes()}${_date.getSeconds()}`;
		link.download = `${this.cameras.items[this.cameraIndex].nameSanitized}_${date}_${time}.mp4`;
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
		const camera = this.cameras?.items[this.cameraIndex];
		const retainHours = camera?.retainHours || 0;
		const start = camera?.segments?.items[0]?.date || Math.round(Date.now() / 1000);
		const eventCount = camera?.events?.items.length || 0;
		const segmentCount = camera?.segments?.items.length || 0;
		const segmentsSize = camera?.segmentsSize || 0;

		// calculate the total time recorded
		const segmentsTime = new Date(0);
		const now = Math.round(Date.now() / 1000);
		const lastSegment = camera?.segments?.items.slice(-1)[0];
		const accruedSegmentTime = now - (lastSegment?.truncated ? lastSegment.date : now);
		segmentsTime.setSeconds((camera?.segments?.duration || 0) + accruedSegmentTime);
		const segmentsDuration = segmentsTime.toISOString().substring(11, 19);

		return html`
			<div class="video-parent">
				<video class="border rounded shadow" controls muted></video>
				<div class="video-overlay rounded dark-bg">
					<div class="events-label">${eventCount} Motion Events</div>
					<div class="events-wrapper scrollable">
						<frugal-events
							camera-index=${this.cameraIndex}
							event-count=${eventCount}
							current-date=${this.currentDate}
							@clip=${e => { const { start, stop } = e.detail; this.showClip(start, stop); }}
						></frugal-events>
					</div>
				</div>
			</div>
			<fieldset class="border rounded padded-most">
				<legend>Timeline</legend>
				<frugal-segments
					start-date=${start}
					segment-count=${segmentCount}
					@currentDate=${e => this.currentDate = e.detail.currentDate}
					@clip=${e => { const { start, stop } = e.detail; this.showClip(start, stop); }}
					@live=${() => this.play()}
					@download=${(e) => this.download(e.detail.start, e.detail.stop)}
				></frugal-segments>
			</fieldset>
			<fieldset class="border rounded padded-most">
				<legend>Stats</legend>
				<div class="stats">
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
	async attributeChangedCallback(...args) {
		super.attributeChangedCallback(...args);

		if (args[0] === 'camera-index' && this.cameras) {
			await this.updateCamera(this.cameras.items[this.cameraIndex]);
			const segments = this.shadowRoot.querySelector('frugal-segments');
			if (segments.maxDate === segments.currentDate)
				await this.play();
			else await this.showClip(segments.currentDate, segments.currentDate + segments.clipDuration);
		}
	}
	connectedCallback() {
		super.connectedCallback();
		this.#updateInterval = setInterval(async () => {
			if (this.cameras)
				await this.updateCamera(this.cameras.items[this.cameraIndex]);
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
