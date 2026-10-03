import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { logger } from './loggerService';
import { THUMBNAILS_DIR, TRANSCODE_DIR } from '../config';

// Try loading ffmpeg-installer/ffmpeg and ffprobe-installer/ffprobe
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegInstaller && ffmpegInstaller.path) {
    let ffmpegPath = ffmpegInstaller.path;
    if (ffmpegPath.includes('app.asar')) {
      ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    }
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
} catch (err) {
  logger.warn('ffmpeg', 'Failed to load @ffmpeg-installer/ffmpeg, using system ffmpeg if available', err);
}

try {
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
  if (ffprobeInstaller && ffprobeInstaller.path) {
    let ffprobePath = ffprobeInstaller.path;
    if (ffprobePath.includes('app.asar')) {
      ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
    }
    ffmpeg.setFfprobePath(ffprobePath);
  }
} catch (err) {
  logger.warn('ffmpeg', 'Failed to load @ffprobe-installer/ffprobe, using system ffprobe if available', err);
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  resolution: string;
  codec: string;
  audioCodec?: string;
  bitrate?: number;
  frameRate?: number;
}

export class FfmpegService {
  private activeProcesses: Map<string, ffmpeg.FfmpegCommand> = new Map();

  public getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Probe video file to extract detailed metadata
   */
  public async probeMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('ffmpeg', `ffprobe failed for: ${filePath}`, err.message);
          return reject(err);
        }

        const format = metadata.format;
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

        const duration = format.duration ? parseFloat(format.duration.toString()) : 0;
        const width = videoStream?.width || 0;
        const height = videoStream?.height || 0;
        const resolution = width && height ? `${width}x${height}` : 'Unknown';
        const codec = (videoStream?.codec_name || 'unknown').toLowerCase();
        const audioCodec = audioStream?.codec_name || undefined;
        const bitrate = format.bit_rate ? parseInt(format.bit_rate.toString(), 10) : undefined;
        
        let frameRate: number | undefined = undefined;
        if (videoStream?.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split('/');
          if (parts.length === 2 && parseFloat(parts[1]) > 0) {
            frameRate = parseFloat((parseFloat(parts[0]) / parseFloat(parts[1])).toFixed(2));
          } else {
            frameRate = parseFloat(videoStream.r_frame_rate);
          }
        }

        resolve({
          duration,
          width,
          height,
          resolution,
          codec,
          audioCodec,
          bitrate,
          frameRate,
        });
      });
    });
  }

  /**
   * Generate a high quality thumbnail from the video
   */
  public async generateThumbnail(mediaId: string, filePath: string, duration = 0): Promise<string> {
    const filename = `${mediaId}.jpg`;
    const targetPath = path.join(THUMBNAILS_DIR, filename);

    // If thumbnail already exists and is non-empty, return existing path
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.size > 0) {
        return filename;
      }
    }

    // Capture thumbnail at 10% of duration, or 3 seconds
    let seekSeconds = 3;
    if (duration > 10) {
      seekSeconds = Math.min(Math.floor(duration * 0.1), 30);
    }

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .seekInput(seekSeconds)
        .frames(1)
        .size('480x?')
        .output(targetPath)
        .on('end', () => {
          logger.debug('ffmpeg', `Thumbnail generated for ${mediaId}`);
          resolve(filename);
        })
        .on('error', (err) => {
          logger.warn('ffmpeg', `Thumbnail generation failed at ${seekSeconds}s for ${mediaId}, trying at 0s: ${err.message}`);
          // Fallback to start of video
          ffmpeg(filePath)
            .seekInput(0)
            .frames(1)
            .size('480x?')
            .output(targetPath)
            .on('end', () => resolve(filename))
            .on('error', (fallbackErr) => {
              logger.error('ffmpeg', `Failed to generate thumbnail for ${mediaId}: ${fallbackErr.message}`);
              reject(fallbackErr);
            })
            .run();
        })
        .run();
    });
  }

  /**
   * Transcode on-the-fly to MP4 / H.264 pipe for browser playback if container/codec is unsupported
   */
  public createTranscodeStream(
    sessionId: string,
    filePath: string,
    startTime = 0,
    quality: 'original' | '1080p' | '720p' | '480p' = 'original'
  ) {
    const command = ffmpeg(filePath);
    this.activeProcesses.set(sessionId, command);

    if (startTime > 0) {
      command.seekInput(startTime);
    }

    command
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions([
        '-preset ultrafast',
        '-tune zerolatency',
        '-movflags frag_keyframe+empty_moov+default_base_moof',
        '-pix_fmt yuv420p',
        '-crf 23',
      ])
      .format('mp4');

    if (quality === '720p') {
      command.size('?x720');
    } else if (quality === '480p') {
      command.size('?x480');
    } else if (quality === '1080p') {
      command.size('?x1080');
    }

    command.on('end', () => {
      this.activeProcesses.delete(sessionId);
      logger.debug('ffmpeg', `Transcode stream ${sessionId} finished`);
    });

    command.on('error', (err) => {
      this.activeProcesses.delete(sessionId);
      if (!err.message.includes('SIGKILL') && !err.message.includes('Output stream closed')) {
        logger.error('ffmpeg', `Transcode stream ${sessionId} error: ${err.message}`);
      }
    });

    return command;
  }

  /**
   * Stop an active transcoding process
   */
  public stopProcess(sessionId: string) {
    const proc = this.activeProcesses.get(sessionId);
    if (proc) {
      try {
        proc.kill('SIGKILL');
      } catch (err) {
        // ignore kill error
      }
      this.activeProcesses.delete(sessionId);
      logger.debug('ffmpeg', `Killed ffmpeg process ${sessionId}`);
    }
  }

  /**
   * Stop all active ffmpeg processes (e.g. during server shutdown)
   */
  public stopAll() {
    for (const [id, proc] of this.activeProcesses.entries()) {
      try {
        proc.kill('SIGKILL');
      } catch {}
    }
    this.activeProcesses.clear();
  }
}

export const ffmpegService = new FfmpegService();
