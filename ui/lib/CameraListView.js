import { html, css, LitElement } from 'lit';
import { NeedsMixin, Need } from './NeedsMixin';
import baseStyle from './base-style';
import Cameras from './Cameras';

export default class CameraListView extends NeedsMixin(LitElement) {
	#cameras;
	#changeHandler;
	
	static styles = [
		baseStyle,
		css`
			
		`
	];

	constructor() {
		super();

		this.#changeHandler = () => this.requestUpdate();
		this.needs.add(new Need(Cameras, 'cameras'));
	}
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if(!(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');

		if(this.cameras)
			this.cameras.off('change', this.changeHandler);
		this.#cameras = v;
		this.cameras.on('change', this.changeHandler);
		this.requestUpdate();
	}
	get changeHandler() {
		return this.#changeHandler;
	}
	clickHandler(e, camera) {
		this.dispatchEvent(new CustomEvent('camera', { 
			bubbles: true,
			composed: true,
			detail: { camera }
		}));
	}
	render() {
		return html`
			<fieldset class="border rounded padded">
				<legend>Cameras</legend>
				${this.cameras?.items.map(camera => html`<a class="item rounded padded" @click="${e => this.clickHandler(e, camera)}">${camera.name}</a>`)}
			</fieldset>
		`;
	}
}  
customElements.define('frugal-camera-list', CameraListView);