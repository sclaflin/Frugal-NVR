import { html, css, LitElement } from 'lit';
import { NeedsMixin } from './NeedsMixin';
import { NeedsCamerasMixin } from './NeedsCamerasMixin';
import { NeedsAPIMixin } from './NeedsAPIMixin';
import baseStyle from './base-style';
import Camera from './Camera';
import NavRequest from './NavRequest';
import { VIEW_CAMERA } from './Constants';

export default class Overview extends NeedsCamerasMixin(NeedsAPIMixin(NeedsMixin(LitElement))) {
	#showComposite = false;
	#connected = false;
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
	async gotAPI() {
		try {
			this.showComposite = await this.api.generateThumbs();
			await this.getThumbs();
		}
		catch(err) {
			console.error(err);
		}
	}
	get connected() {
		return this.#connected;
	}
	get showComposite() {
		return this.#showComposite;
	}
	set showComposite(v) {
		if(typeof v !== 'boolean')
			throw new TypeError('showComposite must be a boolean.');
		this.#showComposite = v;
		this.requestUpdate();
	}
	connectedCallback() {
		super.connectedCallback();
		this.#connected = true;
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		this.#connected = false;
	}
	thumbClickHandler(camera) {
		if(!(camera instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		

		this.dispatchEvent(new CustomEvent('nav', { 
			bubbles: true,
			composed: true,
			detail: new NavRequest(VIEW_CAMERA, { camera })
		}));
	}
	async getThumbs() {
		if(!this.connected || !this.showComposite)
			return;
		
		await Promise.all(
			this.cameras.items.map(async camera =>
				await camera.updateThumb()
			)
		);
		this.requestUpdate();

		setTimeout(() => this.getThumbs(), 2000);
	}
	render() {
		let gridSize = 0;
		while((this.cameras?.items.length || 1) / ++gridSize > gridSize);
		const cols = gridSize;
		const rows = Math.ceil(this.cameras?.items.length / gridSize);
		const images = this.cameras?.items.map((camera, index) => {
			const col = index % gridSize + 1;
			const row = Math.floor(index / gridSize) + 1;
			
			const classes = [];
			if(col === 1 && row === 1) classes.push('rounded-top-left');
			if(col === cols && row === 1) classes.push('rounded-top-right');
			if(col === 1 && row === rows) classes.push('rounded-bottom-left');
			if(col === cols && row === rows) classes.push('rounded-bottom-right');
			return html`<img class="clickable ${classes.join(' ')}" @click="${() => this.thumbClickHandler(camera)}" src="${camera.thumb}"/>`;
		});
		
		return html`
			<div class="composite border rounded shadow dark-bg cam-grid-${gridSize}">
				${images}	
			</div>
		`;
	}
}
customElements.define('frugal-overview', Overview);