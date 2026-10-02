import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { CONFIG } from '../config';
import { ffmpegService } from './ffmpegService';
import { logger } from './loggerService';
import { ScanProgressEvent } from '../../shared/types';

export class ScannerService {
  private isScanning = false;
  private progressCallback?: (event: ScanProgressEvent) => void;

  public setProgressCallback(cb: (event: ScanProgressEvent) => void) {
    this.progressCallback = cb;
  }

  public getIsScanning(): boolean {
    return this.isScanning;
  }

  private emitProgress(event: ScanProgressEvent) {
    if (this.progressCallback) {
      this.progressCallback(event);
    }
  }

  /**
   * Recursively collect all video file paths from a directory
   */
  private async collectVideoFiles(dirPath: string): Promise<string[]> {
    const videoFiles: string[] = [];

    async function traverse(currentPath: string) {
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (entry.isDirectory()) {
            // Ignore hidden directories like .git, $RECYCLE.BIN, System Volume Information
            if (!entry.name.startsWith('.') && !entry.name.startsWith('$') && entry.name !== 'System Volume Information') {
              await traverse(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (CONFIG.SUPPORTED_EXTENSIONS.includes(ext)) {
              videoFiles.push(fullPath);
            }
          }
        }
      } catch (err: any) {
        logger.warn('scanner', `Could not read directory ${currentPath}: ${err.message}`);
      }
    }

    await traverse(dirPath);
    return videoFiles;
  }

  /**
   * Scan a specific library folder by ID or folder path
   */
  public async scanFolder(folderId: string): Promise<void> {
    if (this.isScanning) {
      logger.warn('scanner', 'Scan requested while another scan is in progress.');
      return;
    }

    this.isScanning = true;
    logger.info('scanner', `Starting library scan for folder ID: ${folderId}`);

    try {
      const folder = await prisma.libraryFolder.findUnique({
        where: { id: folderId },
      });

      if (!folder || !folder.enabled) {
        logger.warn('scanner', `Folder not found or disabled: ${folderId}`);
        this.isScanning = false;
        return;
      }

      if (!fs.existsSync(folder.folderPath)) {
        logger.error('scanner', `Library directory does not exist on disk: ${folder.folderPath}`);
        this.emitProgress({
          status: 'error',
          folder: folder.folderPath,
          processedCount: 0,
          totalCount: 0,
          percent: 0,
          error: 'Directory not found on disk',
        });
        this.isScanning = false;
        return;
      }

      this.emitProgress({
        status: 'scanning',
        folder: folder.folderPath,
        processedCount: 0,
        totalCount: 0,
        percent: 0,
      });

      const filePaths = await this.collectVideoFiles(folder.folderPath);
      const totalCount = filePaths.length;
      logger.info('scanner', `Found ${totalCount} video files in ${folder.folderPath}`);

      // Verify and remove missing files from database for this folder
      const existingDbMedia = await prisma.media.findMany({
        where: { libraryFolderId: folder.id },
      });

      for (const item of existingDbMedia) {
        if (!fs.existsSync(item.filePath)) {
          logger.info('scanner', `Removing missing media from database: ${item.filePath}`);
          await prisma.media.delete({ where: { id: item.id } });
        }
      }

      let processed = 0;

      for (const filePath of filePaths) {
        try {
          processed++;
          const percent = Math.round((processed / Math.max(totalCount, 1)) * 100);
          const fileName = path.basename(filePath);

          this.emitProgress({
            status: 'extracting_metadata',
            folder: folder.folderPath,
            currentFile: fileName,
            processedCount: processed,
            totalCount,
            percent,
          });

          const stats = await fs.promises.stat(filePath);
          const cleanTitle = path.parse(fileName).name.replace(/[._-]/g, ' ').trim();

          // Check if already indexed
          let media = await prisma.media.findUnique({
            where: { filePath },
          });

          if (!media) {
            // New video file -> probe metadata
            let meta;
            try {
              meta = await ffmpegService.probeMetadata(filePath);
            } catch {
              meta = {
                duration: 0,
                width: 0,
                height: 0,
                resolution: 'Unknown',
                codec: path.extname(filePath).replace('.', '').toLowerCase(),
              };
            }

            media = await prisma.media.create({
              data: {
                title: cleanTitle,
                filePath,
                fileSize: stats.size,
                duration: meta.duration,
                resolution: meta.resolution,
                width: meta.width,
                height: meta.height,
                codec: meta.codec,
                audioCodec: meta.audioCodec,
                bitrate: meta.bitrate,
                frameRate: meta.frameRate,
                libraryFolderId: folder.id,
              },
            });

            // Generate thumbnail
            try {
              const thumbName = await ffmpegService.generateThumbnail(media.id, filePath, media.duration);
              await prisma.media.update({
                where: { id: media.id },
                data: { thumbnailPath: thumbName },
              });
            } catch (thumbErr: any) {
              logger.warn('scanner', `Could not generate thumbnail for ${media.id}: ${thumbErr.message}`);
            }
          } else {
            // If existing media lacks thumbnail or resolution, attempt to generate
            if (!media.thumbnailPath) {
              try {
                const thumbName = await ffmpegService.generateThumbnail(media.id, filePath, media.duration);
                await prisma.media.update({
                  where: { id: media.id },
                  data: { thumbnailPath: thumbName },
                });
              } catch {}
            }
          }
        } catch (fileErr: any) {
          logger.error('scanner', `Error processing file ${filePath}: ${fileErr.message}`);
        }
      }

      // Update folder lastScannedAt
      await prisma.libraryFolder.update({
        where: { id: folder.id },
        data: { lastScannedAt: new Date() },
      });

      this.emitProgress({
        status: 'completed',
        folder: folder.folderPath,
        processedCount: totalCount,
        totalCount,
        percent: 100,
      });

      logger.info('scanner', `Scan completed successfully for folder: ${folder.folderPath}`);
    } catch (err: any) {
      logger.error('scanner', `Scan failed: ${err.message}`);
      this.emitProgress({
        status: 'error',
        processedCount: 0,
        totalCount: 0,
        percent: 0,
        error: err.message,
      });
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Scan all enabled library folders
   */
  public async scanAll(): Promise<void> {
    const folders = await prisma.libraryFolder.findMany({
      where: { enabled: true },
    });

    for (const folder of folders) {
      await this.scanFolder(folder.id);
    }
  }
}

export const scannerService = new ScannerService();
