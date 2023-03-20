import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';

export default class EventView extends LitElement {
	static styles = [
		baseStyle,
		css``
	];
	static properties = {
		start: { type: Number, attribute: 'start' },
		stop: { type: Number, attribute: 'stop' }
	};

	handleClick() {
		this.dispatchEvent(new CustomEvent('clip', { 
			bubbles: true,
			composed: true,
			detail: {
				isLive: false,
				start: Number(this.start),
				stop: Number(this.stop)
			}
		}));
	}
	render() {
		return html`
			<div
				class="rounded padded dark-bg clickable"
				@click=${() => this.handleClick()}
			>${(new Date(this.start * 1000)).toLocaleString()} for ${Math.round(this.stop - this.start)} seconds.
			</div>
		`;
	}
}
customElements.define('frugal-event', EventView);