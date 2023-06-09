import { LitElement, html, css } from 'lit';
import baseStyle from './base-style';
import Segments from './Segments';
import MotionEvents from '../../lib/MotionEvents';
import './Slider';
import './TimelineView';

export default class SegmentsView extends LitElement {
	#maxDateInterval = null;
	#maxDate = Math.floor(Date.now() / 1000);
	#segments;
	#motionEvents;

	static properties = {
		startDate: { type: Number, attribute: 'start-date' },
		currentDate: { type: Number, attribute: 'current-date' },
		clipDuration: { type: Number, attribute: 'clip-duration' }
	};

	static styles = [
		baseStyle,
		css`
			.top-row {
				display: flex;
				flex-wrap: wrap;
				flex-direction: row;
				align-items: center;
				gap: 1em;
			}
			.bottom-row {
				display: flex;
				flex-wrap: wrap;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				gap: 0.5em;
			}
			.slider-date {
				flex: 1;
			}
			input {
				width: 3em;
			}
			frugal-timeline {
				margin: 0 0.5em;
			}
			.pulse {
				display: inline-block;
				animation: pulse 1s infinite;
				background-color: rgba(255, 0, 0, 1);
				border-radius: 50%;
				width: 1em;
				height: 1em;
			}
			@keyframes pulse {
				0% {
					transform-scale(0.9);
					box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
				}
				70% {
					transform-scale(1);
					box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
				}
				100% {
					transform-scale(0.9);
				}
			}
		`
	];
	constructor() {
		super();

		this.currentDate = this.maxDate;
		this.clipDuration = 60;
	}
	get maxDate() {
		return this.#maxDate;
	}
	set maxDate(v) {
		if (!Number.isInteger(v))
			throw new TypeError('maxDate must be an integer.');
		this.#maxDate = v;
	}
	get isLive() {
		return this.maxDate === this.currentDate;
	}
	get segments() {
		return this.#segments;
	}
	set segments(v) {
		if (v && !(v instanceof Segments))
			throw new TypeError('segments must be a Segments object.');
		this.#segments = v;
		this.requestUpdate();
	}
	get motionEvents() {
		return this.#motionEvents;
	}
	set motionEvents(v) {
		if (v && !(v instanceof MotionEvents))
			throw new TypeError('motionEvents must be a MotionEvents object.');
		this.#motionEvents = v;
		this.requestUpdate();
	}
	connectedCallback() {
		super.connectedCallback();
		this.#maxDateInterval = setInterval(() => this.updateMaxDate(), 1000);
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		clearInterval(this.#maxDateInterval);
		this.#maxDateInterval = null;
	}
	updateMaxDate() {
		this.maxDate = Math.round(Date.now() / 1000);
		const slider = this.shadowRoot.querySelector('frugal-slider');

		// is the slider the current max value?
		if (!slider.value || Number(slider.value) === Number(slider.getAttribute('max'))) {
			// update to the current max value
			this.currentDate = this.maxDate;
			this.dispatchEvent(new CustomEvent('currentDate', {
				bubbles: true,
				composed: true,
				detail: {
					currentDate: this.currentDate
				}
			}));
		}
	}
	viewDate(value) {
		if (!Number.isInteger(value))
			throw new TypeError('value must be an integer.');

		// clamp the requested date to the available range
		this.currentDate = value > this.maxDate ?
			this.maxDate :
			(value < this.startDate ? this.startDate : value);

		this.dispatchEvent(new CustomEvent('currentDate', {
			bubbles: true,
			composed: true,
			detail: {
				currentDate: this.currentDate
			}
		}));

		if (this.currentDate === this.maxDate) {
			this.dispatchEvent(new CustomEvent('live', {
				bubbles: true,
				composed: true
			}));
		}
		else {
			this.dispatchEvent(new CustomEvent('clip', {
				bubbles: true,
				composed: true,
				detail: {
					start: this.currentDate,
					stop: this.currentDate + this.clipDuration
				}
			}));
		}
	}
	download() {
		this.dispatchEvent(new CustomEvent('download', {
			bubbles: true,
			composed: true,
			detail: {
				start: this.currentDate,
				stop: this.currentDate + this.clipDuration
			}
		}));
	}
	handleLiveButton() {
		const slider = this.shadowRoot.querySelector('frugal-slider');
		slider.value = this.maxDate;
		this.dispatchEvent(new CustomEvent('live', {
			bubbles: true,
			composed: true
		}));
	}
	render() {
		return html`
			<div class="top-row">
				<div class="slider-date">${new Date(this.currentDate * 1000).toLocaleString()}</div>
				<div>
					Clip Duration
					<input 
						type="number"
						class="clip-duration border rounded"
						value=${this.clipDuration}
						@change=${e => this.clipDuration = Number(e.target.value)}
					/>
				</div>
				${!this.isLive ? html`<a class="download-button border rounded padded-more shadow clickable dark-bg" @click=${() => this.download()}>Download</a>` : ''}
				<a class="live-button border rounded padded-more shadow clickable dark-bg" @click=${() => this.viewDate(this.maxDate)}>
					Live ${this.isLive ? html`<div class="pulse"></div>` : ''}
				</a>
			</div>
			<div class="timeline padded-more">
				<frugal-slider
					min=${this.startDate}
					max=${this.maxDate}
					value=${this.currentDate}
					@input=${e => this.currentDate = Number(e.composedPath()[0].value)}
					@change=${e => this.viewDate(Number(e.target.value))}
				></frugal-slider>
				<frugal-timeline
					.segments=${this.segments}
					.motionEvents=${this.motionEvents}
				></frugal-timeline>
			</div>
			<div class="bottom-row">
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate - 86400)}>-1d</a>
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate - 3600)}>-60m</a>
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate - 300)}>-5m</a>
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate - 60)}>-1m</a>
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate + 60)}>+1m</a>
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate + 300)}>+5m</a>
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate + 3600)}>+60m</a>
				<a class="border rounded padded shadow clickable dark-bg" @click=${() => this.viewDate(this.currentDate + 86400)}>+1d</a>
			</div>
		`;
	}
}
customElements.define('frugal-segments', SegmentsView);
