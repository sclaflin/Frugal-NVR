export const LOG_LEVEL_DEBUG = 'debug';
export const LOG_LEVEL_INFO = 'info';
export const LOG_LEVEL_WARN = 'warn';
export const LOG_LEVEL_ERROR = 'error';
export const LOG_LEVEL_FATAL = 'fatal';
export const LOG_LEVEL_DEFAULT = LOG_LEVEL_INFO;
export const LOG_LEVELS = [
	LOG_LEVEL_DEBUG,
	LOG_LEVEL_INFO,
	LOG_LEVEL_WARN,
	LOG_LEVEL_ERROR,
	LOG_LEVEL_FATAL
];

export default class Logger {
	static get now() {
		return (new Date()).toISOString();
	}
	static get logLevel() {
		return process.env.LOG_LEVEL || LOG_LEVEL_DEFAULT;
	}
	static index(logLevel = this.logLevel) {
		return LOG_LEVELS.indexOf(logLevel);
	}
	static debug(msg) {
		if (this.index() <= this.index(LOG_LEVEL_DEBUG))
			console.error(`DEBUG ${this.now}: ${msg}`);
	}
	static info(msg) {
		if (this.index() <= this.index(LOG_LEVEL_INFO))
			console.error(`INFO ${this.now}: ${msg}`);
	}
	static warn(msg) {
		if (this.index() <= this.index(LOG_LEVEL_WARN))
			console.error(`WARN ${this.now}: ${msg}`);
	}
	static error(msg) {
		if (this.index() <= this.index(LOG_LEVEL_ERROR))
			console.error(`ERROR ${this.now}: ${msg}`);
	}
	static fatal(msg) {
		console.error(`FATAL ${this.now}: ${msg}`);
	}
}
