import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { initDatabase, prisma } from './db';
import { SocketManager } from './socket/socketManager';
import { logger } from './services/loggerService';
import { systemService } from './services/systemService';
import { authService } from './services/authService';

// Import controllers
import * as mediaController from './controllers/mediaController';
import * as folderController from './controllers/folderController';
import * as remoteController from './controllers/remoteController';
import * as roomController from './controllers/roomController';
import * as systemController from './controllers/systemController';
import * as authController from './controllers/authController';

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/system/stats') && !req.path.endsWith('/thumbnail')) {
    logger.debug('server', `${req.method} ${req.path}`);
  }
  next();
});

// Auth Routes
app.get('/api/auth/status', authController.getAuthStatus);
app.post('/api/auth/setup', authController.setupAdmin);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authService.authenticate(), authController.getCurrentUser);

// Media Routes
app.get('/api/media', authService.authenticate(), mediaController.getMediaList);
app.post('/api/media/upload', mediaController.uploadMedia);
app.get('/api/media/:id', authService.authenticate(), mediaController.getMediaById);
app.patch('/api/media/:id/favorite', authService.authenticate(), mediaController.toggleFavorite);
app.get('/api/media/:id/stream', mediaController.streamMedia);
app.get('/api/media/:id/transcode', mediaController.transcodeMedia);
app.get('/api/media/:id/thumbnail', mediaController.getThumbnail);
app.post('/api/media/:id/progress', authService.authenticate(), mediaController.updateProgress);

// Folder & Library Routes
app.get('/api/folders', authService.authenticate(), folderController.getFolders);
app.post('/api/folders', authService.authenticate('admin'), folderController.addFolder);
app.delete('/api/folders/:id', authService.authenticate('admin'), folderController.removeFolder);
app.patch('/api/folders/:id/toggle', authService.authenticate('admin'), folderController.toggleFolder);
app.post('/api/folders/:id/scan', authService.authenticate('admin'), folderController.scanFolder);
app.post('/api/folders/scan-all', authService.authenticate('admin'), folderController.scanAllFolders);
app.get('/api/folders/browse', authService.authenticate('admin'), folderController.browseDirectories);

// Remote Control Routes
app.get('/api/remote/host-state', remoteController.getHostPlaybackState);
app.post('/api/remote/command', remoteController.sendRemoteCommand);

// Viewing Rooms Routes
app.get('/api/rooms', authService.authenticate(), roomController.listRooms);
app.post('/api/rooms', authService.authenticate(), roomController.createRoom);
app.get('/api/rooms/:id', authService.authenticate(), roomController.getRoom);
app.post('/api/rooms/:id/sync', authService.authenticate(), roomController.syncRoomPlayback);
app.delete('/api/rooms/:id', authService.authenticate(), roomController.deleteRoom);

// System & Admin Routes
app.get('/api/system/stats', systemController.getStats);
app.get('/api/system/qr', systemController.getQrCode);
app.get('/api/system/logs', authService.authenticate('admin'), systemController.getLogs);
app.get('/api/system/devices', authService.authenticate('admin'), systemController.getDevices);
app.get('/api/system/settings', authService.authenticate(), systemController.getSettings);
app.post('/api/system/settings', authService.authenticate('admin'), systemController.updateSettings);
app.post('/api/system/shutdown', authService.authenticate('admin'), systemController.shutdownServer);

// Serve client frontend static files if built
const clientDistPath = path.resolve(__dirname, '../../dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('server', `Unhandled Express Error: ${err.message}`, err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize Socket.IO
const socketManager = new SocketManager(server);

// Start server with dynamic port fallback
async function startServer(port = CONFIG.DEFAULT_PORT) {
  try {
    await initDatabase();

    // Load saved port from Settings if available
    const portSetting = await prisma.settings.findUnique({ where: { key: 'port' } });
    const targetPort = portSetting ? parseInt(portSetting.value, 10) : port;

    server.listen(targetPort, '0.0.0.0', () => {
      systemService.setPort(targetPort);
      const lanUrl = systemService.getLanUrl();
      logger.info('server', `=====================================================`);
      logger.info('server', ` LocalStream Server running on: http://localhost:${targetPort}`);
      logger.info('server', ` Network LAN Access URL:      ${lanUrl}`);
      logger.info('server', `=====================================================`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn('server', `Port ${targetPort} is in use, trying port ${targetPort + 1}...`);
        startServer(targetPort + 1);
      } else {
        logger.error('server', `Server failed to start: ${err.message}`);
      }
    });
  } catch (err: any) {
    logger.error('server', `Startup fatal error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app, server, socketManager, startServer };
