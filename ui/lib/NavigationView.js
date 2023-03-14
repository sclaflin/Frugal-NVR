import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import { VIEW_CAMERA, VIEW_OVERVIEW, VIEW_STATS } from './Constants';
import './CameraListView';
import NavRequest from './NavRequest';

export default class NavigationView extends LitElement {
	static properties = {
		useOverview: { type: Boolean, attribute: 'use-overview' }
	};

	static styles = [
		baseStyle,
		css``
	];

	handler(e, view) {
		this.dispatchEvent(new CustomEvent('nav', { 
			bubbles: true,
			composed: true,
			detail: new NavRequest(view, e.detail)
		}));
	}
	render() {
		return html`
			${this.useOverview ? html`<a class="larger item rounded padded" @click="${e => this.handler(e, VIEW_OVERVIEW)}">Overview</a>` : null}
			<a class="larger item rounded padded" @click="${e => this.handler(e, VIEW_STATS)}">Stats</a>
			<frugal-camera-list @camera="${e => this.handler(e, VIEW_CAMERA)}"></frugal-camera-list>
		`;
	}
}

customElements.define('frugal-navigation', NavigationView);