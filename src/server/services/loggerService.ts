import fs from 'fs';
import path from 'path';
import { LOGS_DIR } from '../config';
import { ServerLogEntry } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

class LoggerService {
  private inMemoryLogs: ServerLogEntry[] = [];
  private maxInMemoryLogs = 500;
  private logFilePath: string;
  private socketBroadcastCallback?: (log: ServerLogEntry) => void;

  constructor() {
    const today = new Date().toISOString().split('T')[0];
    this.logFilePath = path.join(LOGS_DIR, `server-${today}.log`);
  }

  public setBroadcastCallback(cb: (log: ServerLogEntry) => void) {
    this.socketBroadcastCallback = cb;
  }

  public log(level: 'info' | 'warn' | 'error' | 'debug', category: ServerLogEntry['category'], message: string, meta?: any) {
    const entry: ServerLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      meta,
    };

    // Keep ring buffer in memory
    this.inMemoryLogs.unshift(entry);
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.pop();
    }

    // Console output
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, message, meta || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, meta || '');
    } else {
      console.log(prefix, message, meta || '');
    }

    // Append to file asynchronously
    try {
      const line = `${JSON.stringify(entry)}\n`;
      fs.appendFile(this.logFilePath, line, () => {});
    } catch {
      // Ignore file append errors
    }

    // Broadcast to UI
    if (this.socketBroadcastCallback) {
      this.socketBroadcastCallback(entry);
    }
  }

  public info(category: ServerLogEntry['category'], message: string, meta?: any) {
    this.log('info', category, message, meta);
  }

  public warn(category: ServerLogEntry['category'], message: string, meta?: any) {
    this.log('warn', category, message, meta);
  }

  public error(category: ServerLogEntry['category'], message: string, meta?: any) {
    this.log('error', category, message, meta);
  }

  public debug(category: ServerLogEntry['category'], message: string, meta?: any) {
    this.log('debug', category, message, meta);
  }

  public getRecentLogs(limit = 100): ServerLogEntry[] {
    return this.inMemoryLogs.slice(0, limit);
  }
}

export const logger = new LoggerService();
