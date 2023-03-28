import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import { VIEW_CAMERA, VIEW_OVERVIEW, VIEW_STATS } from './Constants';
import './CameraListView';
import NavRequest from './NavRequest';
import Cameras from './Cameras';

export default class NavigationView extends LitElement {
	#cameras;
	static properties = {
		useOverview: { type: Boolean, attribute: 'use-overview' }
	};

	static styles = [
		baseStyle,
		css``
	];

	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if(v && !(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');
		this.#cameras = v;
	}

	handler(e, view) {
		this.dispatchEvent(new CustomEvent('nav', {
			bubbles: true,
			composed: true,
			detail: new NavRequest(view, e.detail)
		}));
	}
	render() {
		return html`
			${this.useOverview ? html`<a class="larger item clickable rounded padded" @click=${e => this.handler(e, VIEW_OVERVIEW)}>Overview</a>` : null}
			<a class="larger item clickable rounded padded" @click=${e => this.handler(e, VIEW_STATS)}>Stats</a>
			<frugal-camera-list .cameras=${this.cameras} @camera=${e => this.handler(e, VIEW_CAMERA)}></frugal-camera-list>
		`;
	}
}

customElements.define('frugal-navigation', NavigationView);
