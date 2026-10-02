import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { scannerService } from '../services/scannerService';
import { logger } from '../services/loggerService';

export const getFolders = async (req: Request, res: Response) => {
  try {
    const folders = await prisma.libraryFolder.findMany({
      include: {
        _count: {
          select: { media: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = folders.map((f: any) => ({
      id: f.id,
      folderPath: f.folderPath,
      name: f.name || path.basename(f.folderPath),
      enabled: f.enabled,
      lastScannedAt: f.lastScannedAt ? f.lastScannedAt.toISOString() : null,
      mediaCount: f._count.media,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    res.json(formatted);
  } catch (err: any) {
    logger.error('server', `Failed to list folders: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
};

export const addFolder = async (req: Request, res: Response) => {
  try {
    const { folderPath, name } = req.body;
    if (!folderPath || typeof folderPath !== 'string') {
      return res.status(400).json({ error: 'folderPath is required' });
    }

    let inputPath = folderPath.trim();
    let normalizedPath = path.resolve(inputPath);

    // Docker / Linux environment auto-translation for Windows paths
    if (process.platform !== 'win32') {
      // If user provided a Windows path (e.g. C:\Users\... or D:\...)
      if (/^[a-zA-Z]:[\\\/]/.test(inputPath)) {
        const baseName = path.basename(inputPath.replace(/\\/g, '/')).toLowerCase();
        
        // Potential Docker mapped mount targets
        const candidates = [
          `/media/${baseName}`,
          `/media/videos`,
          `/media/d_drive`,
          `/media`,
        ];

        let resolvedDockerPath: string | null = null;
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            resolvedDockerPath = candidate;
            break;
          }
        }

        if (resolvedDockerPath) {
          normalizedPath = resolvedDockerPath;
          logger.info('scanner', `Mapped Windows path "${inputPath}" to Docker volume "${normalizedPath}"`);
        } else {
          // Check what exists under /media
          let availableMedia = ['/media'];
          try {
            if (fs.existsSync('/media')) {
              const items = fs.readdirSync('/media');
              availableMedia = items.map((i) => `/media/${i}`);
            }
          } catch {}

          return res.status(400).json({
            error: `Directory "${inputPath}" is a host Windows path. In Docker, please map this folder in docker-compose.yml or use container paths: ${availableMedia.join(', ')}`,
          });
        }
      }
    }

    if (!fs.existsSync(normalizedPath)) {
      return res.status(400).json({ error: `Directory does not exist: ${normalizedPath}` });
    }

    const stat = await fs.promises.stat(normalizedPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Specified path is not a directory' });
    }

    // Check if already exists
    const existing = await prisma.libraryFolder.findUnique({
      where: { folderPath: normalizedPath },
    });

    if (existing) {
      return res.status(409).json({ error: `Folder "${normalizedPath}" is already added to the library.` });
    }

    const folder = await prisma.libraryFolder.create({
      data: {
        folderPath: normalizedPath,
        name: name || path.basename(normalizedPath),
        enabled: true,
      },
    });

    logger.info('scanner', `Added new library folder: ${normalizedPath}`);

    // Trigger asynchronous scan
    scannerService.scanFolder(folder.id).catch((err) => {
      logger.error('scanner', `Async scan failed for ${folder.id}: ${err.message}`);
    });

    res.status(201).json(folder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const removeFolder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const folder = await prisma.libraryFolder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Delete folder and cascading media
    await prisma.media.deleteMany({ where: { libraryFolderId: id } });
    await prisma.libraryFolder.delete({ where: { id } });

    logger.info('scanner', `Removed library folder and indexed items: ${folder.folderPath}`);
    res.json({ success: true, message: 'Folder removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleFolder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const folder = await prisma.libraryFolder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const updated = await prisma.libraryFolder.update({
      where: { id },
      data: { enabled: !folder.enabled },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const scanFolder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (scannerService.getIsScanning()) {
      return res.status(409).json({ error: 'Scan currently in progress' });
    }

    scannerService.scanFolder(id).catch((err) => {
      logger.error('scanner', `Scan error: ${err.message}`);
    });

    res.json({ message: 'Folder scan initiated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const scanAllFolders = async (req: Request, res: Response) => {
  try {
    if (scannerService.getIsScanning()) {
      return res.status(409).json({ error: 'Scan currently in progress' });
    }

    scannerService.scanAll().catch((err) => {
      logger.error('scanner', `Full library scan error: ${err.message}`);
    });

    res.json({ message: 'Full library scan initiated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * List available drives/subdirectories safely for folder selection wizard
 */
export const browseDirectories = async (req: Request, res: Response) => {
  try {
    const targetDir = (req.query.dir as string) || '';

    // If empty on Windows, list root drives (C:\, D:\, E:\, etc.)
    if (!targetDir && process.platform === 'win32') {
      const drives: { name: string; path: string; isDrive: boolean }[] = [];
      const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (const letter of letters) {
        const drivePath = `${letter}:\\`;
        try {
          if (fs.existsSync(drivePath)) {
            drives.push({ name: `Drive (${letter}:)`, path: drivePath, isDrive: true });
          }
        } catch {}
      }
      return res.json({ currentPath: '', parentPath: null, directories: drives });
    }

    // On Linux / Docker, if empty, present /media and root folders
    if (!targetDir && process.platform !== 'win32') {
      const rootEntries: { name: string; path: string; isDrive: boolean }[] = [];
      if (fs.existsSync('/media')) {
        rootEntries.push({ name: 'Docker Media Vault (/media)', path: '/media', isDrive: true });
      }
      rootEntries.push({ name: 'Root System (/)', path: '/', isDrive: true });
      return res.json({ currentPath: '', parentPath: null, directories: rootEntries });
    }

    const currentPath = targetDir ? path.resolve(targetDir) : (process.platform === 'win32' ? 'C:\\' : '/');
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    const directories: { name: string; path: string; isDrive: boolean }[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('$') && entry.name !== 'System Volume Information') {
        directories.push({
          name: entry.name,
          path: path.join(currentPath, entry.name),
          isDrive: false,
        });
      }
    }

    const parentPath = path.dirname(currentPath) !== currentPath ? path.dirname(currentPath) : null;

    res.json({
      currentPath,
      parentPath,
      directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
