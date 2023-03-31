import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import WebSocketRequest from '../../lib/WebSocketRequest';
import HostStat from './HostStat';
import { durationString, bytesString } from './Utils';

export default class StatsView extends LitElement {
	#stats;
	#statsTimeout;

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

	get stats() {
		return this.#stats;
	}
	set stats(v) {
		if (!(v instanceof HostStat))
			throw new TypeError('stats must be a HostStat object.');
		this.#stats = v;
		this.requestUpdate();
	}
	connectedCallback() {
		super.connectedCallback();
		this.getStats();
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		clearTimeout(this.#statsTimeout);
		this.#statsTimeout = null;
	}
	async getStats() {
		try {
			this.stats = HostStat.fromObject(await new Promise((resolve, reject) => {
				try {
					this.dispatchEvent(new CustomEvent('request', {
						bubbles: true,
						composed: true,
						detail: WebSocketRequest.fromObject({
							command: 'frugal.getStats',
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
			}));
			this.requestUpdate();
		}
		catch (err) {
			console.error(err);
		}
		finally {
			this.#statsTimeout = setTimeout(() => this.getStats(), 2000);
		}
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
							<div class="value">${this.stats ? Math.round(this.stats.procs.cpu() * 100 / this.stats.cpus.count()) / 100 : '?'}%</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem</div>
							<div class="value">${this.stats ? bytesString(this.stats.procs.memory(), 2) : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem %</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory() / 1024 / this.stats.mem.total * 100 * 100) / 100 : '?'}%</div>
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
							<div class="value">${this.stats ? Math.round(this.stats.procs.cpu('node') * 100 / this.stats.cpus.count()) / 100 : '?'}%</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem</div>
							<div class="value">${this.stats ? bytesString(this.stats.procs.memory('node'), 2) : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem %</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory('node') / 1024 / this.stats.mem.total * 100 * 100) / 100 : '?'}%</div>
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
							<div class="value">${this.stats ? Math.round(this.stats.procs.cpu('ffmpeg') * 100 / this.stats.cpus.count()) / 100 : '?'}%</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem</div>
							<div class="value">${this.stats ? bytesString(this.stats.procs.memory('ffmpeg'), 2) : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Mem %</div>
							<div class="value">${this.stats ? Math.round(this.stats.procs.memory('ffmpeg') / 1024 / this.stats.mem.total * 100 * 100) / 100 : '?'}%</div>
						</div>
					</div>
				</fieldset>
				<fieldset class="border rounded padded-most">
					<legend>Storage</legend>
					<div class="stats">
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Cameras</div>
							<div class="value">${this.stats ? this.stats.cams.count : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Disk</div>
							<div class="value">${this.stats ? bytesString(this.stats.cams.bytes, 2) : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Duration</div>
							<div class="value">${this.stats ? durationString(this.stats.cams.duration) : '?'}</div>
						</div>
						<div class="badge border rounded shadow dark-bg">
							<div class="header">Segments</div>
							<div class="value">${this.stats ? this.stats.cams.segments : '?'}</div>
						</div>
					</div>
				</fieldset>
			</div>
		`;
	}
}
customElements.define('frugal-stats', StatsView);
