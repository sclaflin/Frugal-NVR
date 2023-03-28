import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';
import Camera from './Camera';
import PTZPosition from './PTZPosition';
import { ARROW_UP, ARROW_RIGHT, ARROW_DOWN, ARROW_LEFT } from './Constants';

export default class PTZView extends LitElement {
	#camera;
	#position;
	static styles = [
		baseStyle,
		css`
			:host {
				display: grid;
				grid-template-columns: 1fr 1fr 1fr;
				grid-template-rows: 1fr 1fr 1fr;
				gap: 0.5em;
			}
			:host > * {
				user-select: none;
				text-align: center;
				display: flex;
				justify-content: center;
				align-items: center;
			}
			:host > * > * {
				flex: 1;
			}
		`
	];
	get camera() {
		return this.#camera;
	}
	set camera(v) {
		if(v && !(v instanceof Camera))
			throw new TypeError('camera must be a Camera object.');
		this.#camera = v;
	}
	get position() {
		return this.#position;
	}
	async handleClick(e, code) {
		e.preventDefault();
		const position = PTZPosition.fromObject({
			x: 0,
			y: 0,
			zoom: 0
		});
		switch (code) {
			case ARROW_UP:
				position.y = 0.5; break;
			case ARROW_RIGHT:
				position.x = 0.1; break;
			case ARROW_DOWN:
				position.y = -0.5; break;
			case ARROW_LEFT:
				position.x = -0.1; break;
		}
		await this.camera.setPTZPosition(position);
	}
	render() {
		return html`
			<div></div>
			<a class="rounded clickable dark-bg" @click="${(e) => this.handleClick(e, ARROW_UP)}">${ARROW_UP}</a>
			<div></div>
			<a class="rounded clickable dark-bg" @click="${(e) => this.handleClick(e, ARROW_LEFT)}">${ARROW_LEFT}</a>
			<div></div>
			<a class="rounded clickable dark-bg" @click="${(e) => this.handleClick(e, ARROW_RIGHT)}">${ARROW_RIGHT}</a>
			<div></div>
			<a class="rounded clickable dark-bg" @click="${(e) => this.handleClick(e, ARROW_DOWN)}">${ARROW_DOWN}</a>
			<div></div>
		`;
	}
}
customElements.define('frugal-ptz', PTZView);
