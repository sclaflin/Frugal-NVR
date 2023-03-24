import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import Config from './Config';
import { VIEW_CAMERA, VIEW_OVERVIEW, VIEW_STATS } from './Constants';
import API from './API';
import Cameras from './Cameras';
import './NavigationView';
import './CameraView';
import './Overview';
import './StatsView';
import './EventsView';
import NavRequest from './NavRequest';

export default class FrugalNVR extends LitElement {
	#config;
	#api;
	#cameras;
	#useOverview;
	#navRequest;

	static styles = [
		baseStyle,
		css`
			.main {
				max-width: 1440px;
				margin: auto;
				padding: 1em;
			}
			.title {
				margin-bottom: 0.5em;
			}
			.content {
				display: flex;
				flex-direction: row;
				gap: 1em;
			}
			.content > .left {
				min-width: 10em;
			}
			.content > .right {
				flex: 1;
				position: relative;
			}
			@media screen and (max-width: 600px) {
				.content {
					flex-direction: column;
				}
				.content > .left {
					width: auto;
				}
			}
		`
	];

	constructor(config, api, cameras, useOverview) {
		super();

		this.#config = config;
		this.#api = api;
		this.#cameras = cameras;
		this.#useOverview = useOverview;
		this.navRequest = new NavRequest(this.useOverview ? VIEW_OVERVIEW : VIEW_STATS);
	}
	get config() {
		return this.#config;
	}
	get cameras() {
		return this.#cameras;
	}
	get api() {
		return this.#api;
	}
	get useOverview() {
		return this.#useOverview;
	}
	get navRequest() {
		return this.#navRequest;
	}
	set navRequest(v) {
		if (!(v instanceof NavRequest))
			throw new TypeError('navRequest must be a NavRequest object.');

		this.#navRequest = v;
		this.requestUpdate();
	}
	needsHandler(e) {
		const { needs, target } = e.detail;
		for (const need of needs) {
			switch (need.type) {
				case Config:
					target[need.property] = this.config;
					break;
				case Cameras:
					target[need.property] = this.cameras;
					break;
				case API:
					target[need.property] = this.api;
					break;
			}
		}
	}
	render() {
		let view;
		switch (this.navRequest.view) {
			case VIEW_CAMERA:
				view = html`<frugal-camera-view class="fade-in" .config=${this.config} .api=${this.api} .camera=${this.navRequest.data.camera}></frugal-camera-view>`;
				break;
			case VIEW_STATS:
				view = html`<frugal-stats class="fade-in" .api=${this.api}></frugal-stats>`;
				break;
			case VIEW_OVERVIEW:
				view = html`<frugal-overview class="fade-in" .api=${this.api} .cameras=${this.cameras}></frugal-overview>`;
				break;
		}

		return html`
			<div @needs=${e => this.needsHandler(e)} @nav=${e => this.navRequest = e.detail} class="main">
				<div class="title">
					<h1>Frugal NVR</h1>
				</div>
				<div class="content">
					<div class="left">
						<frugal-navigation .cameras=${this.cameras} ?use-overview=${this.useOverview}><frugal-navigation>
					</div>
					<div class="right">
						${view}
					</div>
				</div>
			</div>
		`;
	}
}
customElements.define('frugal-nvr', FrugalNVR);
