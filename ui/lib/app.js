import Config from './Config';
import API from './API';
import WebSocketRequest from '../../lib/WebSocketRequest';
import LoadingView from './LoadingView';
import FrugalNVR from './FrugalNVR';
import Cameras from './Cameras';

(async () => {
	try {
		const loading = new LoadingView();
		document.body.appendChild(loading);

		// collect required dependencies
		const response = await fetch('./config.json', { mode: 'no-cors' });
		const config = Config.fromObject(await response.json());
		const cameras = new Cameras();
		const api = new API(config.apiUrl, config.webSocketUrl, cameras);
		await api.connect();

		// check to see if we're generating the Overview
		const useOverview = await new Promise((resolve) => {
			api.sendRequest(WebSocketRequest.fromObject({
				command: 'frugal.generateThumbs',
				callback: response => resolve(response.data)
			}));
		});

		// initialize
		loading.remove();
		const frugalNvr = new FrugalNVR(config, api, cameras, useOverview);
		document.body.appendChild(frugalNvr);
	}
	catch (err) {
		console.error(err);
	}
})();
