import NodeMediaServer from 'node-media-server';
import * as Logger from 'node-media-server/src/node_core_logger.js';
import NodeRtmpServer from 'node-media-server/src/node_rtmp_server.js';
import NodeHttpServer from 'node-media-server/src/node_http_server.js';
import NodeTransServer from 'node-media-server/src/node_trans_server.js';
import NodeRelayServer from 'node-media-server/src/node_relay_server.js';
import NodeFissionServer from 'node-media-server/src/node_fission_server.js';

// Extend & patch improper code from NodeMediaServer.
// TODO: Come up with a better solution than NodeMediaServer
export default class FrugalNodeMediaServer extends NodeMediaServer {
	run() {
		Logger.setLogType(this.config.logType);
		// Nope!
		// Logger.log(`Node Media Server v${Package.version}`);
		if (this.config.rtmp) {
			this.nrs = new NodeRtmpServer(this.config);
			this.nrs.run();
		}

		if (this.config.http) {
			this.nhs = new NodeHttpServer(this.config);
			this.nhs.run();
		}

		if (this.config.trans) {
			if (this.config.cluster) {
				Logger.log('NodeTransServer does not work in cluster mode');
			} else {
				this.nts = new NodeTransServer(this.config);
				this.nts.run();
			}
		}

		if (this.config.relay) {
			if (this.config.cluster) {
				Logger.log('NodeRelayServer does not work in cluster mode');
			} else {
				this.nls = new NodeRelayServer(this.config);
				this.nls.run();
			}
		}

		if (this.config.fission) {
			if (this.config.cluster) {
				Logger.log('NodeFissionServer does not work in cluster mode');
			} else {
				this.nfs = new NodeFissionServer(this.config);
				this.nfs.run();
			}
		}

		// NOPE!
		// process.on('uncaughtException', function (err) {
		// 	Logger.error('uncaughtException', err);
		// });

		// NOPE!
		// process.on('SIGINT', function () {
		// 	process.exit();
		// });

		// NOPE!
		// Https.get('https://registry.npmjs.org/node-media-server', function (res) {
		// 	let size = 0;
		// 	let chunks = [];
		// 	res.on('data', function (chunk) {
		// 		size += chunk.length;
		// 		chunks.push(chunk);
		// 	});
		// 	res.on('end', function () {
		// 		let data = Buffer.concat(chunks, size);
		// 		let jsonData = JSON.parse(data.toString());
		// 		let latestVersion = jsonData['dist-tags']['latest'];
		// 		let latestVersionNum = latestVersion.split('.')[0] << 16 | latestVersion.split('.')[1] << 8 | latestVersion.split('.')[2] & 0xff;
		// 		let thisVersionNum = Package.version.split('.')[0] << 16 | Package.version.split('.')[1] << 8 | Package.version.split('.')[2] & 0xff;
		// 		if (thisVersionNum < latestVersionNum) {
		// 			Logger.log(`There is a new version ${latestVersion} that can be updated`);
		// 		}
		// 	});
		// }).on('error', function (e) {
		// });
	}
}
