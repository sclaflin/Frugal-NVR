import { LitElement, html, css } from 'lit';
import baseStyle from './base-style';

export default class DialogView extends LitElement {
	#opened = false;
	#title;
	#content;

	static get styles() {
		return [
			baseStyle,
			css`
				.opened {
					display: flex;
				}
				.closed {
					display: none;
				}
				.mask {
					background: #141E30DD;  /* fallback for old browsers */
					background: -webkit-linear-gradient(to bottom, #243B55DD, #141E30DD);  /* Chrome 10-25, Safari 5.1-6 */
					background: linear-gradient(to bottom, #243B55DD, #141E30DD); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
					background-attachment: fixed;
					position: fixed;

					top: 0;
					right: 0;
					bottom: 0;
					left: 0;
					padding: 1em;
					align-items: center;
					justify-content: center;
				}
				.dialog {
					display: flex;
					flex-direction: column;
					gap: 1em;
				}
				.content {
					flex: 1;
					overflow: auto;
				}
				.buttons {
					display: flex;
					flex-direction: row;
					justify-content: end;
					gap: 0.5em;
				}
			`
		];
	}

	_handleKeydown = (e) => {
		if(e.key === 'Escape')
			this.dispatchEvent(new CustomEvent('cancel', {
				bubbles: true,
				composed: true
			}));
	};

	get opened() {
		return this.#opened;
	}
	set opened(v) {
		if(typeof v !== 'boolean')
			throw new TypeError('opened must be a boolean.');
		
		this.#opened = v;

		if(this.opened)
			addEventListener('keydown', this._handleKeydown);
		else
			removeEventListener('keydown', this._handleKeydown);

		this.requestUpdate();
	}
	get title() {
		return this.#title;
	}
	set title(v) {
		if(!(v instanceof Node))
			throw new TypeError('title must be a Node object.');
		this.#title = v;

		this.requestUpdate();
	}
	get content() {
		return this.#content;
	}
	set content(v) {
		if(!(v instanceof Node))
			throw new TypeError('content must be a Node object.');
		this.#content = v;
	}
	render() {
		return html`
			<div class="${this.opened ? 'opened' : 'closed'} mask">
				<div class="dialog border rounded padded-most dark-bg shadow">
					<h2 class="title">
						${this.title}
					</h2>
					<div class="content">
						${this.content}
					</div>
					<div class="buttons">
						<slot name="buttons"></slot>
					</div>
				</div>
			</div>
		`;
	}
}
customElements.define('frugal-dialog', DialogView);

export class NotifyView extends DialogView {
	render() {
		return html`
			<div class="${this.opened ? 'opened' : 'closed'} mask">
				<div class="dialog border rounded padded-most dark-bg shadow">
					<h2 class="title">
						${this.title}
					</h2>
					<div class="content">
						${this.content}
					</div>
					<div class="buttons">
						<a
							@click="${() => this.dispatchEvent(new CustomEvent('ok', { bubbles: true, composed: true }))}"
							class="accept border rounded padded dark-bg clickable shadow"
						>OK</a>
					</div>
				</div>
			</div>
		`;
	}
}
customElements.define('frugal-notify', NotifyView);

export class ConfirmView extends DialogView {
	render() {
		return html`
			<div class="${this.opened ? 'opened' : 'closed'} mask">
				<div class="dialog border rounded padded-most dark-bg shadow">
					<h2 class="title">
						${this.title}
					</h2>
					<div class="content">
						${this.content}
					</div>
					<div class="buttons">
						<a
							@click="${() => this.dispatchEvent(new CustomEvent('ok', { bubbles: true, composed: true }))}"
							class="accept border rounded padded dark-bg clickable shadow"
						>OK</a>
						<a
							@click="${() => this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))}"
							class="accept border rounded padded dark-bg clickable shadow"
						>Cancel</a>
					</div>
				</div>
			</div>
		`;
	}
}
customElements.define('frugal-confirm', ConfirmView);
