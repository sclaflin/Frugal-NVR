import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import './EventView';
import Events from './Events';

export default class EventsView extends LitElement {
	#events;

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

	get events() {
		return this.#events;
	}
	set events(v) {
		if(v && !(v instanceof Events))
			throw new TypeError('events must be an Events object.');
		this.#events = v;
	}

	render() {
		const events = this.events?.items.reverse().map((item) =>
			html`<frugal-event current-date=${this.currentDate} start=${item.start} stop=${item.stop}></frugal-event>`
		);
		return html`<div class="container">${events}</div>`;
	}
}
customElements.define('frugal-events', EventsView);
