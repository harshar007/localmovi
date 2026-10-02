import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { streamingService } from '../services/streamingService';
import { ffmpegService } from '../services/ffmpegService';
import { THUMBNAILS_DIR, UPLOADS_DIR } from '../config';
import { logger } from '../services/loggerService';

export const uploadMedia = async (req: Request, res: Response) => {
  try {
    req.setTimeout(0); // Disable socket timeout for large video uploads
    if (req.socket) {
      req.socket.setNoDelay(true); // Disable Nagle's algorithm for max throughput
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const rawFileName = req.headers['x-filename']
      ? decodeURIComponent(req.headers['x-filename'] as string)
      : `video_${Date.now()}.mp4`;

    const sanitizedFileName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._ -]/g, '_');
    const ext = path.extname(sanitizedFileName) || '.mp4';
    const baseName = path.basename(sanitizedFileName, ext);
    const uniqueFileName = `${baseName}_${Date.now()}${ext}`;
    const targetFilePath = path.join(UPLOADS_DIR, uniqueFileName);

    // High throughput 4MB stream buffer
    const writeStream = fs.createWriteStream(targetFilePath, {
      highWaterMark: 4 * 1024 * 1024,
    });

    req.pipe(writeStream);

    req.on('error', (err) => {
      logger.error('server', `Upload request stream error: ${err.message}`);
      try { writeStream.destroy(); } catch {}
      if (!res.headersSent) {
        res.status(500).json({ error: 'Upload interrupted by network error' });
      }
    });

    writeStream.on('error', (err) => {
      logger.error('server', `Upload write error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to write uploaded file to server storage' });
      }
    });

    writeStream.on('finish', async () => {
      try {
        const stats = await fs.promises.stat(targetFilePath);
        const cleanTitle = baseName.replace(/[._-]/g, ' ').trim() || 'Uploaded Movie';

        // Find or create 'Mobile Uploads' folder
        let mobileFolder = await prisma.libraryFolder.findFirst({
          where: { name: 'Mobile Uploads' },
        });

        if (!mobileFolder) {
          mobileFolder = await prisma.libraryFolder.create({
            data: {
              name: 'Mobile Uploads',
              folderPath: UPLOADS_DIR,
              enabled: true,
            },
          });
        }

        // Instant DB creation for zero-lag response
        const media = await prisma.media.create({
          data: {
            title: cleanTitle,
            filePath: targetFilePath,
            fileSize: stats.size,
            duration: 0,
            resolution: 'HD',
            width: 1920,
            height: 1080,
            codec: ext.replace('.', '').toLowerCase(),
            audioCodec: 'aac',
            bitrate: 0,
            frameRate: 30,
            libraryFolderId: mobileFolder.id,
          },
        });

        const formatted = {
          id: media.id,
          title: media.title,
          filePath: media.filePath,
          fileSize: media.fileSize,
          duration: media.duration,
          resolution: media.resolution,
          width: media.width,
          height: media.height,
          codec: media.codec,
          audioCodec: media.audioCodec,
          bitrate: media.bitrate,
          frameRate: media.frameRate,
          thumbnailPath: `/api/media/${media.id}/thumbnail`,
          libraryFolderId: mobileFolder.id,
          folderName: 'Mobile Uploads',
          favorite: false,
          createdAt: media.createdAt.toISOString(),
          updatedAt: media.updatedAt.toISOString(),
        };

        // Respond immediately to client!
        res.status(201).json(formatted);

        // Run metadata extraction & thumbnail generation in non-blocking background
        setImmediate(async () => {
          try {
            const meta = await ffmpegService.probeMetadata(targetFilePath);
            let thumbName: string | null = null;
            try {
              thumbName = await ffmpegService.generateThumbnail(media.id, targetFilePath, meta.duration || 0);
            } catch {}

            await prisma.media.update({
              where: { id: media.id },
              data: {
                duration: meta.duration || 0,
                resolution: meta.resolution || 'HD',
                width: meta.width || 1920,
                height: meta.height || 1080,
                codec: meta.codec || ext.replace('.', '').toLowerCase(),
                audioCodec: meta.audioCodec || 'aac',
                bitrate: meta.bitrate || 0,
                frameRate: meta.frameRate || 30,
                thumbnailPath: thumbName,
              },
            });
          } catch (bgErr: any) {
            logger.warn('server', `Background metadata probe for ${media.id}: ${bgErr.message}`);
          }
        });
      } catch (procErr: any) {
        logger.error('server', `Failed to process uploaded video: ${procErr.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to process uploaded video' });
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getMediaList = async (req: Request, res: Response) => {
  try {
    const { search, folderId, resolution, codec, favorite, sort, order, deviceId } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.title = { contains: search };
    }

    if (folderId && typeof folderId === 'string') {
      where.libraryFolderId = folderId;
    }

    if (resolution && typeof resolution === 'string') {
      where.resolution = resolution;
    }

    if (codec && typeof codec === 'string') {
      where.codec = codec;
    }

    if (favorite === 'true') {
      where.favorite = true;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'title') {
      orderBy = { title: order === 'desc' ? 'desc' : 'asc' };
    } else if (sort === 'duration') {
      orderBy = { duration: order === 'desc' ? 'desc' : 'asc' };
    } else if (sort === 'size') {
      orderBy = { fileSize: order === 'desc' ? 'desc' : 'asc' };
    } else if (sort === 'date') {
      orderBy = { createdAt: order === 'asc' ? 'asc' : 'desc' };
    }

    const items = await prisma.media.findMany({
      where,
      orderBy,
      include: {
        folder: { select: { id: true, name: true, folderPath: true } },
        playbackProgress: deviceId ? { where: { deviceId: String(deviceId) } } : false,
      },
    });

    const formatted = items.map((m: any) => ({
      id: m.id,
      title: m.title,
      filePath: m.filePath,
      fileSize: m.fileSize,
      duration: m.duration,
      resolution: m.resolution,
      width: m.width,
      height: m.height,
      codec: m.codec,
      audioCodec: m.audioCodec,
      bitrate: m.bitrate,
      frameRate: m.frameRate,
      thumbnailPath: m.thumbnailPath ? `/api/media/${m.id}/thumbnail` : null,
      libraryFolderId: m.libraryFolderId,
      folderName: m.folder?.name || (m.folder?.folderPath ? path.basename(m.folder.folderPath) : undefined),
      favorite: m.favorite,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      progress: m.playbackProgress && m.playbackProgress.length > 0 ? {
        position: m.playbackProgress[0].position,
        duration: m.playbackProgress[0].duration,
        completed: m.playbackProgress[0].completed,
      } : undefined,
    }));

    res.json(formatted);
  } catch (err: any) {
    logger.error('server', `Failed to list media: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch media list' });
  }
};

export const getMediaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.query;

    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        folder: true,
        playbackProgress: deviceId ? { where: { deviceId: String(deviceId) } } : false,
      },
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const formatted = {
      ...media,
      thumbnailPath: media.thumbnailPath ? `/api/media/${media.id}/thumbnail` : null,
      folderName: media.folder?.name || (media.folder?.folderPath ? path.basename(media.folder.folderPath) : undefined),
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
      progress: (media as any).playbackProgress && (media as any).playbackProgress.length > 0 ? {
        position: (media as any).playbackProgress[0].position,
        duration: (media as any).playbackProgress[0].duration,
        completed: (media as any).playbackProgress[0].completed,
      } : undefined,
    };

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const updated = await prisma.media.update({
      where: { id },
      data: { favorite: !media.favorite },
    });

    res.json({ id: updated.id, favorite: updated.favorite });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const streamMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  await streamingService.streamDirect(req, res, id);
};

export const transcodeMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  await streamingService.streamTranscode(req, res, id);
};

export const getThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media || !media.thumbnailPath) {
      return res.status(404).json({ error: 'Thumbnail not available' });
    }

    const thumbFile = path.join(THUMBNAILS_DIR, media.thumbnailPath);
    if (!fs.existsSync(thumbFile)) {
      return res.status(404).json({ error: 'Thumbnail file missing' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(thumbFile).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId, position, duration, completed } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId required' });
    }

    const isCompleted = completed || (duration > 0 && position >= duration * 0.95);

    const progress = await prisma.playbackProgress.upsert({
      where: {
        mediaId_deviceId: {
          mediaId: id,
          deviceId,
        },
      },
      update: {
        position: position || 0,
        duration: duration || 0,
        completed: isCompleted,
      },
      create: {
        mediaId: id,
        deviceId,
        position: position || 0,
        duration: duration || 0,
        completed: isCompleted,
      },
    });

    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deleteFile } = req.query;

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete thumbnail if exists
    if (media.thumbnailPath) {
      const thumbFile = path.join(THUMBNAILS_DIR, media.thumbnailPath);
      try {
        if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile);
      } catch {}
    }

    // Delete uploaded file if stored in uploads directory or requested
    if (media.filePath && (deleteFile === 'true' || media.filePath.includes('/uploads/') || media.filePath.includes('\\uploads\\'))) {
      try {
        if (fs.existsSync(media.filePath)) fs.unlinkSync(media.filePath);
      } catch {}
    }

    // Delete database records (playback progress, room references, and media)
    await prisma.playbackProgress.deleteMany({ where: { mediaId: id } });
    await prisma.room.deleteMany({ where: { mediaId: id } });
    await prisma.media.delete({ where: { id } });

    logger.info('server', `Deleted media ${media.title} (${id}) from library`);
    res.json({ success: true, message: 'Media removed from library' });
  } catch (err: any) {
    logger.error('server', `Failed to delete media: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
