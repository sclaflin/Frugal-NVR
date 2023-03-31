import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import './MotionEventView';
import MotionEvents from '../../lib/MotionEvents';

export default class MotionEventsView extends LitElement {
	#motionEvents;

	static styles = [
		baseStyle,
		css`
			.container {
				display: flex;
				flex-direction: column;
				gap: 0.5em;
			}
			.container > * {
				flex: 1;
			}
		`
	];
	static properties = {
		currentDate: { type: Number, attribute: 'current-date' }
	};

	get motionEvents() {
		return this.#motionEvents;
	}
	set motionEvents(v) {
		if (v && !(v instanceof MotionEvents))
			throw new TypeError('motionEvents must be an MotionEvents object.');
		this.#motionEvents = v;
	}

	render() {
		const motionEvents = this.motionEvents?.items.reverse().map((item) =>
			html`<frugal-motion-event current-date=${this.currentDate} start=${item.start} stop=${item.stop}></frugal-motion-event>`
		);
		return html`<div class="container">${motionEvents}</div>`;
	}
}
customElements.define('frugal-motion-events', MotionEventsView);
