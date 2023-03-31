import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import { VIEW_CAMERA, VIEW_OVERVIEW, VIEW_STATS } from './Constants';
import './NavigationView';
import './CameraView';
import './Overview';
import './StatsView';
import './MotionEventsView';
import NavRequest from './NavRequest';
import Dialogs from './Dialogs';
import { NotifyView } from './DialogView';

export default class FrugalNVR extends LitElement {
	#config;
	#api;
	#cameras;
	#useOverview;
	#navRequest;
	#dialogs;

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
		this.#dialogs = new Dialogs();
		this.navRequest = new NavRequest(this.useOverview ? VIEW_OVERVIEW : VIEW_STATS);

		this.cameras.on('add', () => this.requestUpdate());
		this.api.on('disconnect', () => this.notifyHandler('Connection Lost', 'Atempting to re-connect to FrugalNVR...'));
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
	get dialogs() {
		return this.#dialogs;
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
	notifyHandler(title, content) {
		const dialog = new NotifyView();
		dialog.title = document.createTextNode(title);
		dialog.content = document.createTextNode(content);
		dialog.opened = true;
		const dialogHandler = () => {
			dialog.opened = false;
			this.dialogs.remove(dialog);
			dialog.removeEventListener('cancel', dialogHandler);
			dialog.removeEventListener('ok', dialogHandler);
			this.requestUpdate();
		};
		dialog.addEventListener('cancel', dialogHandler);
		dialog.addEventListener('ok', dialogHandler);
		this.dialogs.add(dialog);

		this.requestUpdate();
	}
	render() {
		let view;
		switch (this.navRequest.view) {
			case VIEW_CAMERA:
				view = html`<frugal-camera-view class="fade-in" .config=${this.config} .api=${this.api} .camera=${this.navRequest.data.camera}></frugal-camera-view>`;
				break;
			case VIEW_STATS:
				view = html`<frugal-stats class="fade-in"></frugal-stats>`;
				break;
			case VIEW_OVERVIEW:
				view = html`<frugal-overview class="fade-in" .cameras=${this.cameras}></frugal-overview>`;
				break;
		}

		return html`
			<div
				@nav=${e => this.navRequest = e.detail}
				@request=${e => this.api.sendRequest(e.detail)}
				@notify=${e => this.notifyHandler(e.detail.title, e.detail.content)}
				class="main"
			>
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
				${this.dialogs.items}
			</div>
		`;
	}
}
customElements.define('frugal-nvr', FrugalNVR);
