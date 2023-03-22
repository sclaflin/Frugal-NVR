import fs from 'fs/promises';
import { parse } from 'yaml';
import * as constants from './lib/constants.js';
import FrugalNVR from './lib/FrugalNVR.js';

const config = parse((await fs.readFile('./config.yml')).toString());
const nvr = await FrugalNVR.fromObject(config);

try {
	// write a config file to the compiled web site so it can connect to the
	// configured hostname & ports.
	await fs.writeFile('./web/config.json', JSON.stringify({
		apiUrl: `http://${config.hostname}:${config.webUI.port || constants.WEB_UI_DEFAULT_PORT}`,
		streamUrl: `http://${config.hostname}:${config.mediaServer.http.port}`
	}));
}
catch (err) {
	console.error(err);
}

// fire it up!
await nvr.start();