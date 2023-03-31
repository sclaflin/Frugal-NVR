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
				width: 100%;
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
		`
	];
	#thumbHandler = () => this.requestUpdate();
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if (v && !(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');

		const lastCameras = this.cameras;
		lastCameras?.off('thumb', this.#thumbHandler);
		this.#cameras = v;
		this.cameras.on('thumb', this.#thumbHandler);
	}
	connectedCallback() {
		super.connectedCallback();
		this.getThumbs();
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		this?.cameras.off('thumb', this.#thumbHandler);
		clearTimeout(this.#thumbsTimeout);
		this.#thumbsTimeout = null;
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
			return html`<img class="clickable ${classes.join(' ')}" @click=${() => this.thumbClickHandler(camera)} src=${camera.thumb}/>`;
		});

		return html`
			<div class="composite border rounded shadow dark-bg cam-grid-${gridSize}">
				${images}	
			</div>
		`;
	}
}
customElements.define('frugal-overview', Overview);
