import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import Camera from './Camera';


export default class CameraControlView extends LitElement {
	#camera;
	static styles = [
		baseStyle,
		css``
	];

	get camera() {
		return this.#camera;
	}
	set camera(v) {
		if(v && !(v instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		this.#camera = v;
	}

	async handleRebootClick() {
		const message = await this.camera?.reboot();
		console.log(message);
	}

	render() {
		return html`<a class="rounded border padded clickable dark-bg shadow" @click="${() => this.handleRebootClick()}">Reboot Camera</a>`;
	}
}
customElements.define('frugal-camera-control', CameraControlView);
