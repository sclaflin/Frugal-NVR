import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import { NeedsCamerasMixin } from './NeedsCamerasMixin';
import { NeedsMixin } from './NeedsMixin';
import './EventView';

export default class EventsView extends NeedsCamerasMixin(NeedsMixin(LitElement)) {
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
		cameraIndex: { type: Number, attribute: 'camera-index' },
		currentDate: { type: Number, attribute: 'current-date' },
		eventCount: { type: Number, attribute: 'event-count' }
	};

	render() {
		const events = this.cameras?.items[this.cameraIndex]?.events?.items.reverse().map((item) =>
			html`<frugal-event current-date=${this.currentDate} start=${item.start} stop=${item.stop}></frugal-event>`
		);
		return html`<div class="container">${events}</div>`;
	}
}
customElements.define('frugal-events', EventsView);
