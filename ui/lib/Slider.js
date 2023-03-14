import { LitElement, css, html } from 'lit';

export default class Slider extends LitElement {
	static properties = {
		min: { type: Number },
		max: { type: Number },
		value: { type: Number }
	};
	static styles = [
		css`
			input[type=range] {
				box-sizing: border-box;
				font-size: 16px;
				line-height: 1;
				height: 1em;
				background-color: transparent;
				cursor: pointer;
				-webkit-appearance: none;
				width: 100%;
			}
			input[type=range]::-webkit-slider-thumb {
				-webkit-appearance: none;
			}
			input[type=range]:focus {
				outline: none;
			}
			input[type=range]::-ms-track {
				width: 100%;
				cursor: pointer;
				background: transparent;
				border-color: transparent;
				color: transparent;
			}
			input[type=range]::-webkit-slider-thumb {
				-webkit-appearance: none;
				width: 1em;
				height: 1em;
				margin-top: 0;
				background-color: #ffffff;
				border-radius: 1em;
				border: 1px solid rgba(255, 255, 255, 1);
				cursor: pointer;
			}
			input[type=range]::-moz-range-thumb {
				width: 1em;
				height: 1em;
				margin-top: 0;
				background-color: #ffffff;
				border-radius: 1em;
				border: 1px solid rgba(255, 255, 255, 1);
				cursor: pointer;
			}
			input[type=range]::-ms-thumb {
				width: 1em;
				height: 1em;
				margin-top: 0;
				background-color: #ffffff;
				border-radius: 1em;
				border: 1px solid rgba(255, 255, 255, 1);
				cursor: pointer;
			}
			input[type=range]:hover::-webkit-slider-thumb {
				border-color: rgba(255, 255, 255, 1);
			}
			input[type=range]:hover::-moz-range-thumb {
				border-color: rgba(255, 255, 255, 1);
			}
			input[type=range]:hover::-ms-thumb {
				border-color: rgba(255, 255, 255, 1);
			}
			input[type=range]:active::-webkit-slider-thumb {
				border-color: #ffffff;
			}
			input[type=range]:active::-moz-range-thumb {
				border-color: #ffffff;
			}
			input[type=range]:active::-ms-thumb {
				border-color: #ffffff;
			}
			input[type=range]::-webkit-slider-runnable-track {
				width: 100%;
				cursor: pointer;
				height: 0.5em;
				border-bottom: 1px solid rgba(255, 255, 255, 1);
				background-color: transparent;
			}
			input[type=range]::-moz-range-track {
				width: 100%;
				cursor: pointer;
				height: 0em;
				border-bottom: 1px solid rgba(255, 255, 255, 1);
				background-color: transparent;
			}
			input[type=range]::-ms-track {
				background: transparent;
				border-color: transparent;
				color: transparent;
			}
		`
	];

	handleChange(e) {
		// sync our value
		this.value = Number(e.target.value);
		
		// figure out why change event doesn't cross shadow root boundary
		e.stopPropagation();
		this.dispatchEvent(new CustomEvent('change', { 
			bubbles: true,
			composed: true
		}));
	}
	render() {
		return html`<input min=${this.min} max=${this.max} .value=${this.value} @change="${e => this.handleChange(e)}" type="range" />`;
	}
}
customElements.define('frugal-slider', Slider);