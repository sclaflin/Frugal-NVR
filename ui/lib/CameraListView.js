import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import Cameras from './Cameras';

const SVG_MOTION = html`<svg class="motion-sensor fade-in" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M10 .2C9 .2 8.2 1 8.2 2S9 3.8 10 3.8 11.8 3 11.8 2 11 .2 10 .2m5.67.8A7.33 7.33 0 0 0 23 8.33V7a6 6 0 0 1-6-6h-1.33m2.66 0c0 2.58 2.09 4.67 4.67 4.67V4.33c-1.84 0-3.33-1.49-3.33-3.33h-1.34M21 1a2 2 0 0 0 2 2V1h-2M7.92 4.03c-.17 0-.34.03-.5.08L2 5.8V11h1.8V7.33l2.11-.66L2 22h1.8l2.87-8.11L9 17v5h1.8v-6.41l-2.49-4.54.73-2.87L10.12 10H15V8.2h-3.62l-2-3.33c-.3-.5-.84-.84-1.46-.84Z"/></svg>`;

export default class CameraListView extends LitElement {
	#cameras;

	static styles = [
		baseStyle,
		css`
			.motion-sensor {
				position: relative;
				top: 0.25em;
				color: #ffffff;
				width: 1em;
			}
		`
	];
	#motionHandler = () => this.requestUpdate();
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if(v && !(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');

		this.cameras?.off('motionStart', this.#motionHandler);
		this.cameras?.off('motionStop', this.#motionHandler);
		this.#cameras = v;
		this.cameras?.on('motionStart', this.#motionHandler);
		this.cameras?.on('motionStop', this.#motionHandler);
		this.requestUpdate();
	}
	clickHandler(camera) {
		this.dispatchEvent(new CustomEvent('camera', { 
			bubbles: true,
			composed: true,
			detail: { camera }
		}));
	}
	render() {
		const cameras = this.cameras?.items.map(
			camera => html`<a class="item rounded clickable padded" @click=${() => this.clickHandler(camera)}>
				${camera.activeMotion ? SVG_MOTION : ''} ${camera.name}
			</a>`
		);
		return html`
			<fieldset class="border rounded padded">
				<legend>Cameras</legend>
				${cameras}
			</fieldset>
		`;
	}
}  
customElements.define('frugal-camera-list', CameraListView);
