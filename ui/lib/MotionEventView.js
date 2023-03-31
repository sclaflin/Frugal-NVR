import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';

export default class MotionEventView extends LitElement {
	static styles = [
		baseStyle,
		css``
	];
	static properties = {
		start: { type: Number, attribute: 'start' },
		stop: { type: Number, attribute: 'stop' },
		currentDate: { type: Number, attribute: 'current-date' }
	};

	handleClick() {
		this.dispatchEvent(new CustomEvent('clip', {
			bubbles: true,
			composed: true,
			detail: {
				isLive: false,
				start: Number(this.start),
				stop: Number(this.stop || Math.floor(Date.now() / 1000))
			}
		}));
	}
	render() {
		const now = Math.floor(Date.now() / 1000);
		const highlight = (this.currentDate >= this.start && this.currentDate <= (this.stop || now));
		return html`
			<div
				class="rounded padded dark-bg clickable ${highlight ? 'highlight' : ''}"
				@click=${() => this.handleClick()}
			>${(new Date(this.start * 1000)).toLocaleString()} for ${Math.round((this.stop || now) - this.start)} seconds.
			</div>
		`;
	}
}
customElements.define('frugal-motion-event', MotionEventView);
