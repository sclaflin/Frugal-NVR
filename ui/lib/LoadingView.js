import { html, css, LitElement } from 'lit';
import baseStyle from './base-style';

export default class LoadingView extends LitElement {
	static styles = [
		baseStyle,
		css`
			:host {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				left: 0;
				display: flex;
				justify-content: center;
				align-items: center;
			}
			.lds-ellipsis {
				position: relative;
				width: 80px;
				height: 80px;
			}
			.lds-ellipsis div {
				position: absolute;
				top: 33px;
				width: 13px;
				height: 13px;
				border-radius: 50%;
				background: #fff;
				animation-timing-function: cubic-bezier(0, 1, 1, 0);
			}
			.lds-ellipsis div:nth-child(1) {
				left: 8px;
				animation: lds-ellipsis1 0.6s infinite;
			}
			.lds-ellipsis div:nth-child(2) {
				left: 8px;
				animation: lds-ellipsis2 0.6s infinite;
			}
			.lds-ellipsis div:nth-child(3) {
				left: 32px;
				animation: lds-ellipsis2 0.6s infinite;
			}
			.lds-ellipsis div:nth-child(4) {
				left: 56px;
				animation: lds-ellipsis3 0.6s infinite;
			}
			@keyframes lds-ellipsis1 {
				0% {
					transform: scale(0);
				}
				100% {
					transform: scale(1);
				}
			}
			@keyframes lds-ellipsis3 {
				0% {
					transform: scale(1);
				}
				100% {
					transform: scale(0);
				}
			}
			@keyframes lds-ellipsis2 {
				0% {
					transform: translate(0, 0);
				}
				100% {
					transform: translate(24px, 0);
				}
			}
		`
	];

	render() {
		return html`
			<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
		`;
	}
}
customElements.define('frugal-loading', LoadingView);
