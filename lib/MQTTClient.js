import mqtt from 'mqtt';
import Logger from './Logger.js';
import { DEFAULT_HASS_DISCOVERY_ENABLE, DEFAULT_HASS_DISCOVERY_PREFIX, DEFAULT_MQTT_BASE_TOPIC } from './constants.js';
import Cameras from './Cameras.js';

export class HassDiscovery {
	#enable = null;
	#discoveryPrefix = null;
	constructor(enable = DEFAULT_HASS_DISCOVERY_ENABLE, discoveryPrefix = DEFAULT_HASS_DISCOVERY_PREFIX) {

		this.enable = enable;
		this.discoveryPrefix = discoveryPrefix;
	}
	get enable() {
		return this.#enable;
	}
	set enable(v) {
		if (typeof v !== 'boolean')
			throw new TypeError('enable must be a boolean.');
		this.#enable = v;
	}
	get discoveryPrefix() {
		return this.#discoveryPrefix;
	}
	set discoveryPrefix(v) {
		if (typeof v !== 'string')
			throw new TypeError('discoveryPrefix must be a string.');
		this.#discoveryPrefix = v;
	}
	toJSON() {
		return {
			enable: this.enable,
			discoveryPrefix: this.discoveryPrefix
		};
	}
	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an Object.');
		return new this(
			config.enable,
			config.discoveryPrefix
		);
	}
}

export default class MQTTClient {
	#client;
	#connected = false;
	#url;
	#baseTopic;
	#mqttOptions;
	#hassDiscovery;
	#cameras;
	constructor(url, baseTopic = DEFAULT_MQTT_BASE_TOPIC, mqttOptions, hassDiscovery) {
		if (!(hassDiscovery instanceof HassDiscovery))
			throw new TypeError('hassDiscovery must be a HassDiscovery object.');

		this.url = url;
		this.baseTopic = baseTopic;
		this.mqttOptions = mqttOptions;
		this.#hassDiscovery = hassDiscovery;
	}
	#connectHandler = () => {
		this.#connected = true;
		this.#client.publish(
			`${this.baseTopic}/available`,
			'online',
			{ retain: true }
		);
		for (const camera of this.cameras) {
			this.#thumbHandler(camera);
			this.#motionHandler(false, camera);
			// Handle Home Assistant Auto Discovery
			if (this.hassDiscovery.enable) {
				this.#client.publish(
					`${this.hassDiscovery.discoveryPrefix}/binary_sensor/${camera.nameSanitized}_record/config`,
					JSON.stringify({
						availability: [
							{
								topic: `${this.baseTopic}/available`
							}
						],
						device_class: 'running',
						state_topic: `${this.baseTopic}/${camera.nameSanitized}/record`,
						unique_id: `FrugalNVR_${camera.nameSanitized}_record`,
						name: `${camera.name} Record`,
						device: {
							identifiers: [
								`FrugalNVR_${camera.nameSanitized}_Camera`
							],
							name: `${camera.name} Camera`
						}
					}),
					{ retain: true }
				);
				this.#client.publish(
					`${this.hassDiscovery.discoveryPrefix}/binary_sensor/${camera.nameSanitized}_motion/config`,
					JSON.stringify({
						availability: [
							{
								topic: `${this.baseTopic}/available`
							}
						],
						device_class: 'motion',
						state_topic: `${this.baseTopic}/${camera.nameSanitized}/motion`,
						unique_id: `FrugalNVR_${camera.nameSanitized}_motion`,
						name: `${camera.name} Motion`,
						device: {
							identifiers: [
								`FrugalNVR_${camera.nameSanitized}_Camera`
							],
							name: `${camera.name} Camera`
						}
					}),
					{ retain: true }
				);
				this.#client.publish(
					`${this.hassDiscovery.discoveryPrefix}/camera/${camera.nameSanitized}/config`,
					JSON.stringify({
						availability: [
							{
								topic: `${this.baseTopic}/available`
							}
						],
						topic: `${this.baseTopic}/${camera.nameSanitized}/thumb`,
						unique_id: `FrugalNVR_${camera.nameSanitized}_thumb`,
						name: `${camera.name} Thumb`,
						device: {
							identifiers: [
								`FrugalNVR_${camera.nameSanitized}_Camera`
							],
							name: `${camera.name} Camera`
						}
					}),
					{ retain: true }
				);
			}
		}

	};
	#errorHandler = (err) => Logger.error(`MQTT client error: ${err.stack}`);
	#endHandler = () => {
		this.#connected = false;
		this.#client.off('connect', this.#connectHandler);
		this.#client.off('error', this.#errorHandler);
		this.#client.off('end', this.#endHandler);
		this.#client = null;
	};
	#recordHandler = (record, camera) => {
		if (!this.#connected) return;
		this.#client.publish(
			`${this.baseTopic}/${camera.nameSanitized}/record`,
			record ? 'ON' : 'OFF',
			{ retain: true }
		);
	};
	#thumbHandler = camera => {
		if (!this.#connected) return;
		this.#client.publish(
			`${this.baseTopic}/${camera.nameSanitized}/thumb`,
			camera.thumb,
			{ retain: true }
		);
	};
	#motionHandler = (motion, camera) => {
		if (!this.#connected) return;
		this.#client.publish(
			`${this.baseTopic}/${camera.nameSanitized}/motion`,
			motion ? 'ON' : 'OFF',
			{ retain: true }
		);
	};
	get connected() {
		return this.#connected;
	}
	get url() {
		return this.#url;
	}
	set url(v) {
		if (!(v instanceof URL))
			throw new TypeError('url must be an instance of URL.');
		this.#url = v;
	}
	get baseTopic() {
		return this.#baseTopic;
	}
	set baseTopic(v) {
		if (typeof v !== 'string')
			throw new TypeError('baseTopic must be a string.');

		const lastBaseTopic = this.baseTopic;
		this.#baseTopic = v;
		if (this.#client) {
			this.#client.publish(
				`${lastBaseTopic}/available`,
				undefined,
				{ retain: true }
			);
			this.#client.publish(
				`${this.baseTopic}/available`,
				'online',
				{ retain: true }
			);
		}

	}
	get mqttOptions() {
		return this.#mqttOptions;
	}
	set mqttOptions(v) {
		if (v === null || typeof v !== 'object')
			throw new TypeError('mqttOptions must be an Object.');
		this.#mqttOptions = v;
	}
	get hassDiscovery() {
		return this.#hassDiscovery;
	}
	get cameras() {
		return this.#cameras;
	}
	set cameras(v) {
		if (!(v instanceof Cameras))
			throw new TypeError('cameras must be a Cameras object.');
		this.cameras?.off('thumb', this.#thumbHandler);
		this.cameras?.off('motion', this.#motionHandler);
		this.cameras?.off('record', this.#recordHandler);
		this.#cameras = v;
		this.cameras.on('thumb', this.#thumbHandler);
		this.cameras.on('motion', this.#motionHandler);
		this.cameras.on('record', this.#recordHandler);
	}
	start() {
		if (this.#client)
			throw new Error('Client is already started.');
		this.#client = mqtt.connect(this.url.toString(), {
			...this.mqttOptions,
			will: {
				topic: `${this.baseTopic}/available`,
				payload: 'offline',
				retain: true
			}
		});
		this.#client.on('connect', this.#connectHandler);
		this.#client.on('error', this.#errorHandler);
		this.#client.on('end', this.#endHandler);
	}
	async stop() {
		await new Promise(resolve => {
			this.#client.publish(
				`${this.baseTopic}/available`,
				'offline',
				{ retain: true }
			);
			this.#client.end(resolve);
		});
	}

	static fromObject(config) {
		if (config === null || typeof config !== 'object')
			throw new TypeError('config must be an object.');

		return new this(
			new URL(config.url),
			config.baseTopic,
			config.mqttOptions,
			HassDiscovery.fromObject(config.hassDiscovery || {})
		);
	}
}
