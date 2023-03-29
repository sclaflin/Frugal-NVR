import { LitElement, html, css } from 'lit';
import baseStyle from './base-style';
import Segments from './Segments';
import Events from './Events';

export default class TimelineView extends LitElement {
	#resizeObserver;
	#segments;
	#events;
	static styles = [
		baseStyle,
		css`
			:host {
				display: block;
			}
			canvas {
				width: 100%;
			}
		`
	];
	constructor() {
		super();
		this.#resizeObserver = new ResizeObserver(entries => {
			for(const entry of entries) {
				entry.target.resizedCallback(entry.contentRect);
			}
		});
	}
	get segments() {
		return this.#segments;
	}
	set segments(v) {
		if(v && !(v instanceof Segments))
			throw new TypeError('segments must be a Segments object.');
		this.#segments = v;
		this.drawSegments();
	}
	get events() {
		return this.#events;
	}
	set events(v) {
		if(v && !(v instanceof Events))
			throw new TypeError('events must be an Events object.');
		this.#events = v;
		this.drawSegments();
	}
	connectedCallback() {
		super.connectedCallback();
		this.#resizeObserver.observe(this);
	}
	disconnectedCallback() {
		super.disconnectedCallback();		
		this.#resizeObserver.unobserve(this);
	}
	resizedCallback({ width }) {
		const canvas = this.shadowRoot?.querySelector('canvas');
		canvas.width = width;
		this.drawSegments();
	}
	drawSegments() {
		const canvas = this.shadowRoot?.querySelector('canvas');
		const segments = this.segments?.items;
		const events = this.events?.items;
		if (!canvas) return;
		if(!segments?.length) return;

		const firstSegment = segments[0];
		const lastSegment = segments.slice(-1)[0];
		const start = firstSegment.date;
		const stop = Math.round(Date.now() / 1000);
		const timeSpan = stop - start;
		const widthPerSecond = canvas.width / timeSpan;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for (const segment of segments) {
			const x1 = (segment.date - start) * widthPerSecond;
			const x2 = (segment === lastSegment) ?
				stop * widthPerSecond :
				((segment.date + segment.duration - start) * widthPerSecond) - x1;
		
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(x1, 0, x2, canvas.height);
		}
		if(!events) return;
		for(const event of events) {
			const x1 = (event.start - start) * widthPerSecond;
			const x2 = (event === lastSegment) ?
				stop * widthPerSecond :
				((event.stop - start) * widthPerSecond) - x1;
		
			ctx.fillStyle = 'rgba(255, 0, 0, 0.65)';
			ctx.fillRect(x1, 0, x2, canvas.height);
		}
	}
	render() {
		this.drawSegments();
		return html`<canvas height="10"></canvas>`;
	}
}
customElements.define('frugal-timeline', TimelineView);
