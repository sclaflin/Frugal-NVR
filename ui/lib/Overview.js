import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import Camera from './Camera';
import NavRequest from './NavRequest';
import { VIEW_CAMERA } from './Constants';
import Cameras from './Cameras';
import WebSocketRequest from '../../lib/WebSocketRequest';

export default class Overview extends LitElement {
	#cameras;
	#thumbsTimeout;

	static styles = [
		baseStyle,
		css`
			.composite {
				display: grid;
			}
			.composite > * {
				position: relative;
			}
			.composite img {
				width: 100%;
				height: 100%;
			} 
			.motion-sensor {
				animation: pulse 1s infinite;
				position: absolute;
				top: 1em;
				left: 1em;
				color: #ffffff;
				width: 1em;
			}
			.composite.cam-grid-1 {
				grid-template-columns: 1fr;
			}
			.composite.cam-grid-2 {
				grid-template-columns: 1fr 1fr;
			}
			.composite.cam-grid-3 {
				grid-template-columns: 1fr 1fr 1fr;
			}
			.composite.cam-grid-4 {
				grid-template-columns: 1fr 1fr 1fr 1fr;
			}
			@keyframes pulse {
				0% {
					transform-scale(0.9);
					box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
				}
				70% {
					transform-scale(1);
					box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
				}
				100% {
					transform-scale(0.9);
				}
			}
		`
	];
	#thumbHandler = () => this.requestUpdate();
	#motionHandler = () => this.requestUpdate();
	#fullScrenHandler = (e) => {
		if(e.key === 'Enter') {
			if(!document.fullscreenElement) {
				const composite = this.shadowRoot.querySelector('.composite');
				composite.requestFullscreen().catch((err) => {
					alert(
						`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
					);
				});
			} else {
				document.exitFullscreen();
			}
		}
	};
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if (v && !(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');

		const lastCameras = this.cameras;
		lastCameras?.off('thumb', this.#thumbHandler);
		this.cameras?.off('motionStart', this.#motionHandler);
		this.cameras?.off('motionStop', this.#motionHandler);
		this.#cameras = v;
		this.cameras.on('thumb', this.#thumbHandler);
		this.cameras.on('motionStart', this.#motionHandler);
		this.cameras.on('motionStop', this.#motionHandler);
	}
	connectedCallback() {
		super.connectedCallback();
		this.getThumbs();
		document.addEventListener('keydown', this.#fullScrenHandler);
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		this?.cameras.off('thumb', this.#thumbHandler);
		clearTimeout(this.#thumbsTimeout);
		this.#thumbsTimeout = null;
		document.removeEventListener('keydown', this.#fullScrenHandler);
	}
	thumbClickHandler(camera) {
		if (!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');

		this.dispatchEvent(new CustomEvent('nav', {
			bubbles: true,
			composed: true,
			detail: new NavRequest(VIEW_CAMERA, { camera })
		}));
	}
	async getThumbs() {
		try {
			for (const camera of this.cameras.items) {
				camera.thumb = await new Promise((resolve, reject) => {
					try {
						// fire off a request to get an updated thumbnail
						this.dispatchEvent(new CustomEvent('request', {
							bubbles: true,
							composed: true,
							detail: WebSocketRequest.fromObject({
								command: 'camera.getThumb',
								detail: { 'name': camera.name },
								callback: response => {
									if (response.error)
										reject(new Error(response.error));
									else resolve(response.data);
								}
							})
						}));
					}
					catch (err) {
						reject(err);
					}
				});
			}
		}
		catch (err) {
			console.log(err);
		}
		finally {
			this.#thumbsTimeout = setTimeout(() => this.getThumbs(), 2000);
		}
	}
	render() {
		let gridSize = 0;
		while ((this.cameras?.items.length || 1) / ++gridSize > gridSize);
		const cols = gridSize;
		const rows = Math.ceil(this.cameras?.items.length / gridSize);
		const images = this.cameras?.items.map((camera, index) => {
			const col = index % gridSize + 1;
			const row = Math.floor(index / gridSize) + 1;

			const classes = [];
			if (col === 1 && row === 1) classes.push('rounded-top-left');
			if (col === cols && row === 1) classes.push('rounded-top-right');
			if (col === 1 && row === rows) classes.push('rounded-bottom-left');
			if (col === cols && row === rows) classes.push('rounded-bottom-right');
			// if (camera.activeMotion) classes.push('')
			return html`
				<div>
					<img class="clickable ${classes.join(' ')}" @click=${() => this.thumbClickHandler(camera)} src=${camera.thumb}/>
					${camera.activeMotion ? html`<svg class="motion-sensor fade-in dark-bg border rounded padded" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M10 .2C9 .2 8.2 1 8.2 2S9 3.8 10 3.8 11.8 3 11.8 2 11 .2 10 .2m5.67.8A7.33 7.33 0 0 0 23 8.33V7a6 6 0 0 1-6-6h-1.33m2.66 0c0 2.58 2.09 4.67 4.67 4.67V4.33c-1.84 0-3.33-1.49-3.33-3.33h-1.34M21 1a2 2 0 0 0 2 2V1h-2M7.92 4.03c-.17 0-.34.03-.5.08L2 5.8V11h1.8V7.33l2.11-.66L2 22h1.8l2.87-8.11L9 17v5h1.8v-6.41l-2.49-4.54.73-2.87L10.12 10H15V8.2h-3.62l-2-3.33c-.3-.5-.84-.84-1.46-.84Z"/></svg>` : ''}
				</div>
			`;
		});

		return html`
			<div class="composite border rounded shadow dark-bg cam-grid-${gridSize}">
				${images}	
			</div>
		`;
	}
}
customElements.define('frugal-overview', Overview);
