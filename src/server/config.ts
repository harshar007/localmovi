import path from 'path';
import fs from 'fs';
import os from 'os';

// AppData directory on Windows or fallback
export const APP_DATA_DIR = process.env.LOCALSTREAM_DATA_DIR || 
  (process.platform === 'win32' && process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'LocalStream') 
    : path.join(os.homedir(), '.localstream'));

export const CACHE_DIR = path.join(APP_DATA_DIR, 'cache');
export const THUMBNAILS_DIR = path.join(CACHE_DIR, 'thumbnails');
export const TRANSCODE_DIR = path.join(CACHE_DIR, 'transcode');
export const DATABASE_DIR = path.join(APP_DATA_DIR, 'database');
export const LOGS_DIR = path.join(APP_DATA_DIR, 'logs');
export const UPLOADS_DIR = path.join(APP_DATA_DIR, 'uploads');
export const DB_PATH = path.join(DATABASE_DIR, 'localstream.db');

// Ensure all essential directories exist
[APP_DATA_DIR, CACHE_DIR, THUMBNAILS_DIR, TRANSCODE_DIR, DATABASE_DIR, LOGS_DIR, UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Set DATABASE_URL for Prisma SQLite
process.env.DATABASE_URL = `file:${DB_PATH.replace(/\\/g, '/')}`;

export const CONFIG = {
  DEFAULT_PORT: parseInt(process.env.PORT || '3000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'localstream-super-secure-lan-secret-key-2026',
  JWT_EXPIRES_IN: '7d',
  APP_NAME: 'LocalStream',
  APP_VERSION: '1.0.0',
  THUMBNAIL_WIDTH: 480,
  SUPPORTED_EXTENSIONS: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv', '.flv', '.ts', '.3gp', '.mpg', '.mpeg', '.vob'],
  BROWSER_DIRECT_CODECS: ['h264', 'vp8', 'vp9', 'av01', 'av1'],
  BROWSER_DIRECT_CONTAINERS: ['.mp4', '.webm', '.m4v'],
  HLS_SEGMENT_DURATION: 4, // seconds
};
