export const DEFAULT_DB_PATH = '/app/data';
export const DB_FILENAME = 'data.db';
export const DB_MIGRATION_PATH = './migrations';
export const NMS_CONFIG = {
	logType: 1,
	rtmp: {
		port: 1935,
		chunk_size: 60000,
		gop_cache: true,
		ping: 30,
		ping_timeout: 60
	},
	http: {
		port: 8000,
		allow_origin: '*'
	}
};
export const WEB_UI_CONFIG = {
	enable: true,
	port: 3000
};
export const SECONDS_PER_DAY = 60 * 60 * 24;
export const SECONDS_PER_HOUR = 60 * 60;
export const CAM_DEFAULT_VIDEO_PATH = '/app/video';
export const CAM_DEFAULT_RETAIN_HOURS = 24;
export const CAM_SEGMENT_LENGTH = 60 * 15;
export const CAM_RETRY_DELAY = 5;
export const CAM_MINIMUM_CLIP_LENGTH = 3;
export const CAM_DEFAULT_TIME_PADDING = 3;
export const CAM_DEFAULT_GENERATE_THUMBS = true;
export const CAM_DEFAULT_STILLS_PATH = '/dev/shm';
export const CAM_DEFAULT_THUMBNAIL_WIDTH = 540;
export const CAM_RETENTION_OVERLAP = 60 * 15; //15 minutes

export const SEGMENTS_SEQUENCE_REGEX = /^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2})\.mkv$/;
export const SEGMENTS_DAILY_OVERLAP = 60 * 15; //15 minutes
export const VIDEO_CONTAINER_FLV = 'flv';
export const VIDEO_CONTAINER_MP4 = 'mp4';
export const VIDEO_CONTAINERS = [VIDEO_CONTAINER_FLV, VIDEO_CONTAINER_MP4];

export const WEB_UI_DEFAULT_ENABLE = true;
export const WEB_UI_DEFAULT_PORT = 3000;
