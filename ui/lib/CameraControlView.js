import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import WebSocketRequest from '../../lib/WebSocketRequest';
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
		if (v && !(v instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		this.#camera = v;
	}

	async handleRebootClick() {
		try {
			// fire off a request to get an updated thumbnail
			const response = await new Promise((resolve, reject) => {
				this.dispatchEvent(new CustomEvent('request', {
					bubbles: true,
					composed: true,
					detail: WebSocketRequest.fromObject({
						command: 'camera.reboot',
						detail: { 'name': this.camera?.name },
						callback: response => {
							if (response.error)
								reject(new Error(response.error));
							else resolve(response.data);
						}
					})
				}));
			});
			this.dispatchEvent(new CustomEvent('notify', {
				bubbles: true,
				composed: true,
				detail: {
					title: 'Camera Reboot',
					content: response
				}
			}));
		}
		catch (err) {
			console.error(err);
			this.dispatchEvent(new CustomEvent('notify', {
				bubbles: true,
				composed: true,
				detail: {
					title: 'Error',
					content: err.message
				}
			}));
		}
	}

	render() {
		return html`<a class="rounded border padded clickable dark-bg shadow" @click="${() => this.handleRebootClick()}">Reboot Camera</a>`;
	}
}
customElements.define('frugal-camera-control', CameraControlView);
