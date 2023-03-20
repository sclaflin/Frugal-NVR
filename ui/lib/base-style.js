import { css } from 'lit';

export default css`
	* {
		margin: 0;
		padding: 0;
	}
	@keyframes fade-in-animate {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;	
		}
	}
	.fade-in {
		animation: fade-in-animate 0.5s linear;
	}
	.base-bg {
		background: #141E30;  /* fallback for old browsers */
		background: -webkit-linear-gradient(to bottom, #243B55, #141E30);  /* Chrome 10-25, Safari 5.1-6 */
		background: linear-gradient(to bottom, #243B55, #141E30); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
	}
	.dark-bg {
		background-color: rgba(0, 0, 0, 0.5);
	}
	.border {
		border: 1px solid white;
	}
	.rounded {
		border-radius: 0.25em;
	}
	.rounded-top-left {
		border-top-left-radius: 0.25em;
	}
	.rounded-top-right {
		border-top-right-radius: 0.25em;
	}
	.rounded-bottom-right {
		border-bottom-right-radius: 0.25em;
	}
	.rounded-bottom-left {
		border-bottom-left-radius: 0.25em;
	}
	.larger {
		font-size: 1.25em;
	}
	.shadow {
		box-shadow: 0 1px 4px black;
	}
	.padded {
		padding: 0.25em;
	}
	.padded-more {
		padding: 0.5em;
	}
	.padded-most {
		padding: 1em;
	}
	.highlight {
		background-color: rgba(255,255,255,0.5);
	}
	.clickable {
		cursor: pointer;
	}
	.badge {
		width: 5em;
		height: 5em;
		display: flex;
		flex-direction: column;
	}
	.badge .header {
		
	}
	.badge .value {
		font-weight: bold;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.item {
		display: block;
		cursor: pointer;
		border: 1px solid transparent;
		margin-bottom: 0.25em;
		transition: all 0.25s ease;
	}
	.item:hover {
		border: 1px solid white;
	}
	legend {
		margin: 0 auto;
		padding: 0 0.25em;
		font-size: 1.25em;
	}
	.scrollable {
		overflow: auto;
		--scrollbar-foreground: #fff;
		--scrollbar-background: rgba(0, 0, 0, 0.7);
		/* Foreground, Background */
		scrollbar-color: var(--scrollbar-foreground) var(--scrollbar-background);
	}
	.scrollable::-webkit-scrollbar {
		width: 10px; /* Mostly for vertical scrollbars */
		height: 10px; /* Mostly for horizontal scrollbars */
	}
	.scrollable::-webkit-scrollbar-thumb { /* Foreground */
		background: var(--scrollbar-foreground);
	}
	.scrollable::-webkit-scrollbar-track { /* Background */
		background: var(--scrollbar-background);
	}
`;