import process from 'node:process';
import fs from 'fs/promises';
import { parse } from 'yaml';
import * as constants from './lib/constants.js';
import FrugalNVR from './lib/FrugalNVR.js';
import Logger, { LOG_LEVEL_DEFAULT } from './lib/Logger.js';

try {
	const config = parse((await fs.readFile('./config.yml')).toString());
	process.env.LOG_LEVEL = config.logLevel || LOG_LEVEL_DEFAULT;
	const nvr = await FrugalNVR.fromObject(config);
	try {
		// write a config file to the compiled web site so it can connect to the
		// configured hostname & ports.
		await fs.writeFile('./web/config.json', JSON.stringify({
			apiUrl: `http://${config.hostname}:${config.webUI.port || constants.WEB_UI_DEFAULT_PORT}`,
			webSocketUrl: `ws://${config.hostname}:${config.webUI.port || constants.WEB_UI_DEFAULT_PORT}`,
			streamUrl: `http://${config.hostname}:${config.mediaServer.http.port}`
		}));
	}
	catch (err) {
		Logger.error(`Failed to write config for webUI: ${err.stack}`);
	}

	// fire it up!
	await nvr.start();

	// attempt to exit cleanly
	process.once('SIGTERM', async () => await nvr.stop());
	process.once('SIGINT', async () => await nvr.stop());
}
catch(err) {
	Logger.fatal(`Failed to initialize: ${err.stack}`);
	process.exit(1);
}
