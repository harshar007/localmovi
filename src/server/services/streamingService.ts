import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { prisma } from '../db';
import { logger } from './loggerService';
import { ffmpegService } from './ffmpegService';
import { v4 as uuidv4 } from 'uuid';

export class StreamingService {
  /**
   * Stream a video with HTTP 206 Partial Content / Range Requests
   */
  public async streamDirect(req: Request, res: Response, mediaId: string) {
    try {
      const media = await prisma.media.findUnique({
        where: { id: mediaId },
      });

      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }

      const filePath = media.filePath;
      if (!fs.existsSync(filePath)) {
        logger.error('stream', `Media file missing on disk: ${filePath}`);
        return res.status(404).json({ error: 'Media file missing on storage' });
      }

      const stat = await fs.promises.stat(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const mimeType = mime.lookup(filePath) || 'video/mp4';

      if (range) {
        // Parse Range header e.g. "bytes=32324-" or "bytes=0-1048576"
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        };

        res.writeHead(206, head);

        fileStream.on('error', (err) => {
          logger.warn('stream', `ReadStream error for media ${mediaId}: ${err.message}`);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });

        // Close stream if client disconnects
        req.on('close', () => {
          fileStream.destroy();
        });

        fileStream.pipe(res);
      } else {
        // Full file stream
        const head = {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        };

        res.writeHead(200, head);
        const fileStream = fs.createReadStream(filePath);

        req.on('close', () => {
          fileStream.destroy();
        });

        fileStream.pipe(res);
      }
    } catch (err: any) {
      logger.error('stream', `Streaming error for media ${mediaId}: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      }
    }
  }

  /**
   * On-the-fly transcoding stream
   */
  public async streamTranscode(req: Request, res: Response, mediaId: string) {
    const sessionId = uuidv4();
    try {
      const media = await prisma.media.findUnique({
        where: { id: mediaId },
      });

      if (!media || !fs.existsSync(media.filePath)) {
        return res.status(404).json({ error: 'Media file not found' });
      }

      const startTime = parseFloat(req.query.startTime as string || '0');
      const quality = (req.query.quality as any) || 'original';

      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const ffmpegCommand = ffmpegService.createTranscodeStream(
        sessionId,
        media.filePath,
        startTime,
        quality
      );

      req.on('close', () => {
        ffmpegService.stopProcess(sessionId);
      });

      ffmpegCommand.pipe(res, { end: true });
    } catch (err: any) {
      ffmpegService.stopProcess(sessionId);
      logger.error('stream', `Transcode stream error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Transcoding failed' });
      }
    }
  }
}

export const streamingService = new StreamingService();
