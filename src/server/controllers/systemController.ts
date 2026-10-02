import { Request, Response } from 'express';
import { systemService } from '../services/systemService';
import { logger } from '../services/loggerService';
import { prisma } from '../db';
import { ffmpegService } from '../services/ffmpegService';

export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await systemService.getSystemStats();
    res.json(stats);
  } catch (err: any) {
    logger.error('server', `Error getting system stats: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

export const getQrCode = async (req: Request, res: Response) => {
  try {
    const qr = await systemService.getQrCode();
    const lanUrl = systemService.getLanUrl();
    res.json({ lanUrl, qrCode: qr });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getLogs = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '100', 10);
    const logs = logger.getRecentLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getDevices = async (req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 50,
    });
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Provide default settings if not present
    if (!settingsMap['port']) settingsMap['port'] = systemService.getPort().toString();
    if (!settingsMap['transcode_quality']) settingsMap['transcode_quality'] = 'original';
    if (!settingsMap['require_auth']) settingsMap['require_auth'] = 'false';

    res.json(settingsMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const entries: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(entries)) {
      await prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    logger.info('server', 'Settings updated');
    res.json({ success: true, message: 'Settings saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const shutdownServer = async (req: Request, res: Response) => {
  try {
    logger.info('server', 'Shutdown initiated via API');
    res.json({ success: true, message: 'Shutting down...' });
    
    setTimeout(() => {
      ffmpegService.stopAll();
      process.exit(0);
    }, 1000);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
