import { html, css, LitElement } from 'lit';
import { Need, NeedsMixin } from './NeedsMixin';
import baseStyle from './base-style';
import API from './API';
import HostStat from './HostStat';

export default class StatsView extends NeedsMixin(LitElement) {
	#api;
	#stats;
	#connected = false;

	static styles = [
		baseStyle,
		css`
			.wrapper {
				display: flex;
				flex-direction: column;
				gap: 1em;
			}
			.stats {
				display: flex;
				flex-wrap: wrap;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				gap: 1em;
			}
			.stats > div {
				text-align: center;
			}
		`
	];

	constructor() {
		super();

		this.needs.add(new Need(API, 'api'));
	}
	get api() {
		return this.#api;
	}
	set api(v) {
		if(!(v instanceof API))
			throw new TypeError('api must be an API object.');
		this.#api = v;

		(async () => {
			try {
				await this.getStats();
			}
			catch(err) {
				console.error(err);
			}
		})();
	}
	get stats() {
		return this.#stats;
	}
	set stats(v) {
		if(!(v instanceof HostStat))
			throw new TypeError('stats must be a HostStat object.');
		this.#stats = v;
		this.requestUpdate();
	}
	get connected() {
		return this.#connected;
	}
	connectedCallback() {
		super.connectedCallback();
		this.#connected = true;
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		this.#connected = false;
	}
	async getStats() {
		if(!this.connected || !this.api)
			return;

		this.stats = await this.api.getStats();
		this.requestUpdate();

		setTimeout(() => this.getStats(), 2000);
	}
	render() {
		return html`
			<div class="wrapper">
				<fieldset class="border rounded padded-most">
					<legend>Host</legend>
					<div class="stats">
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Cores</div>
							<div class="value">${this.stats ? this.stats.cpus.count() : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Procs</div>
							<div class="value">${this.stats ? this.stats.procs.count() : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">CPU</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.cpu() * 100 / this.stats.cpus.count())/100 : '?'}%</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory() / 1024 / 1024) : '?'} MiB</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem %</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory() / 1024 / this.stats.mem.total * 100 * 100)/100 : '?'}%</div>
						</div>
					</div>
				</fieldset>
				<fieldset class="border rounded padded-most">
					<legend>Node.js</legend>
					<div class="stats">
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Procs</div>
							<div class="value">${this.stats ? this.stats.procs.count('node') : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">CPU</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.cpu('node') * 100 / this.stats.cpus.count())/100 : '?'}%</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory('node') / 1024 / 1024) : '?'} MiB</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem %</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory('node') / 1024 / this.stats.mem.total * 100 * 100)/100 : '?'}%</div>
						</div>
					</div>
				</fieldset>
				<fieldset class="border rounded padded-most">
					<legend>FFMPEG</legend>
					<div class="stats">
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Procs</div>
							<div class="value">${this.stats ? this.stats.procs.count('ffmpeg') : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">CPU</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.cpu('ffmpeg') * 100 / this.stats.cpus.count())/100 : '?'}%</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory('ffmpeg') / 1024 / 1024) : '?'} MiB</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem %</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory('ffmpeg') / 1024 / this.stats.mem.total * 100 * 100)/100 : '?'}%</div>
						</div>
					</div>
				</fieldset>
			</div>
		`;
	}
}
customElements.define('frugal-stats', StatsView);