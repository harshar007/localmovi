import os from 'os';
import si from 'systeminformation';
import QRCode from 'qrcode';
import { SystemStats } from '../../shared/types';
import { prisma } from '../db';
import { ffmpegService } from './ffmpegService';
import { logger } from './loggerService';

export class SystemService {
  private currentPort = 3000;
  private cachedQrCode = '';
  private cachedLanUrl = '';

  public setPort(port: number) {
    this.currentPort = port;
    this.cachedLanUrl = '';
    this.cachedQrCode = '';
  }

  public getPort(): number {
    return this.currentPort;
  }

  /**
   * Get primary LAN IPv4 address (e.g. 192.168.1.100)
   */
  public getPrimaryLanIp(): string {
    if (process.env.HOST_LAN_IP && process.env.HOST_LAN_IP.trim() !== '') {
      return process.env.HOST_LAN_IP.trim();
    }

    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        // Skip loopback and non-ipv4
        if (iface.family === 'IPv4' && !iface.internal) {
          // Prefer standard private LAN Wi-Fi subnets
          if (
            iface.address.startsWith('192.168.') ||
            iface.address.startsWith('10.')
          ) {
            return iface.address;
          }
        }
      }
    }

    // Fallback to any non-internal IPv4
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }

    return '127.0.0.1';
  }

  /**
   * Get all active network interfaces
   */
  public getActiveInterfaces() {
    const active: { iface: string; ip4: string; mac: string }[] = [];
    const interfaces = os.networkInterfaces();

    for (const [name, ifaceList] of Object.entries(interfaces)) {
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          active.push({
            iface: name,
            ip4: iface.address,
            mac: iface.mac,
          });
        }
      }
    }
    return active;
  }

  /**
   * Get the reachable LAN URL
   */
  public getLanUrl(): string {
    const ip = this.getPrimaryLanIp();
    return `http://${ip}:${this.currentPort}`;
  }

  /**
   * Generate or retrieve cached QR code for LAN URL
   */
  public async getQrCode(): Promise<string> {
    const lanUrl = this.getLanUrl();
    if (this.cachedQrCode && this.cachedLanUrl === lanUrl) {
      return this.cachedQrCode;
    }

    try {
      this.cachedQrCode = await QRCode.toDataURL(lanUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      this.cachedLanUrl = lanUrl;
      return this.cachedQrCode;
    } catch (err: any) {
      logger.error('server', `QR Code generation failed: ${err.message}`);
      return '';
    }
  }

  /**
   * Collect comprehensive system statistics
   */
  public async getSystemStats(): Promise<SystemStats> {
    try {
      const [cpuLoad, cpuInfo, mem, fsSize] = await Promise.all([
        si.currentLoad(),
        si.cpu(),
        si.mem(),
        si.fsSize(),
      ]);

      const lanUrl = this.getLanUrl();
      const qrCode = await this.getQrCode();

      // Database counts
      const [totalVideos, totalSizeAgg, activeDevicesCount, activeSession] = await Promise.all([
        prisma.media.count(),
        prisma.media.aggregate({ _sum: { fileSize: true } }),
        prisma.device.count({
          where: {
            lastSeenAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000), // last 5 minutes
            },
          },
        }),
        prisma.playbackSession.count({ where: { state: 'playing' } }),
      ]);

      return {
        cpu: {
          usagePercent: Math.round(cpuLoad.currentLoad),
          cores: cpuInfo.cores || os.cpus().length,
          model: cpuInfo.brand || os.cpus()[0]?.model || 'Unknown CPU',
        },
        memory: {
          totalBytes: mem.total,
          usedBytes: mem.used,
          freeBytes: mem.free,
          usagePercent: Math.round((mem.used / mem.total) * 100),
        },
        disk: fsSize.map((d) => ({
          fs: d.fs,
          size: d.size,
          used: d.used,
          available: d.available,
          usePercent: Math.round(d.use),
        })),
        network: {
          activeInterfaces: this.getActiveInterfaces(),
          currentLanUrl: lanUrl,
          qrCodeDataUrl: qrCode,
          port: this.currentPort,
        },
        server: {
          uptime: Math.round(process.uptime()),
          activeSessions: activeSession,
          connectedDevices: activeDevicesCount,
          ffmpegProcesses: ffmpegService.getActiveProcessCount(),
          libraryTotalVideos: totalVideos,
          libraryTotalSize: totalSizeAgg._sum.fileSize || 0,
        },
      };
    } catch (err: any) {
      logger.error('server', `Failed to gather system stats: ${err.message}`);
      // Fallback with basic OS info
      const memTotal = os.totalmem();
      const memFree = os.freemem();
      const memUsed = memTotal - memFree;
      return {
        cpu: {
          usagePercent: 0,
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'CPU',
        },
        memory: {
          totalBytes: memTotal,
          usedBytes: memUsed,
          freeBytes: memFree,
          usagePercent: Math.round((memUsed / memTotal) * 100),
        },
        disk: [],
        network: {
          activeInterfaces: this.getActiveInterfaces(),
          currentLanUrl: this.getLanUrl(),
          qrCodeDataUrl: '',
          port: this.currentPort,
        },
        server: {
          uptime: Math.round(process.uptime()),
          activeSessions: 0,
          connectedDevices: 0,
          ffmpegProcesses: ffmpegService.getActiveProcessCount(),
          libraryTotalVideos: 0,
          libraryTotalSize: 0,
        },
      };
    }
  }
}

export const systemService = new SystemService();
