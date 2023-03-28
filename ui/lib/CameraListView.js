import { html, LitElement } from 'lit';
import baseStyle from './base-style';
import Cameras from './Cameras';

export default class CameraListView extends LitElement {
	#cameras;

	static styles = [
		baseStyle
	];
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if(v && !(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');

		this.#cameras = v;
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
			camera => html`<a class="item rounded clickable padded" @click=${() => this.clickHandler(camera)}>${camera.name}</a>`
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
