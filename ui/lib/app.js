import Config from './Config';
import API from './API';
import Camera from './Camera';
import FrugalNVR from './FrugalNVR';
import Cameras from './Cameras';

(async () => {
	try {
		// collect required dependencies
		const response = await fetch('./config.json', { mode: 'no-cors' });
		const config = Config.fromObject(await response.json());
		const api = new API(config.apiUrl);
		const useOverview = await api.generateThumbs();
		const cameras = new Cameras();

		cameras.add(...await Promise.all((await api.getCameras())
			.map(async v => {
				const camera = Camera.fromObject(v);
				camera.api = api;
				await camera.updateSegments();
				await camera.updateEvents();
				return camera;
			})
		));

		// initialize
		const frugalNvr = new FrugalNVR(config, api, cameras, useOverview);
		document.body.appendChild(frugalNvr);
	}
	catch (err) {
		console.error(err);
	}
})();
