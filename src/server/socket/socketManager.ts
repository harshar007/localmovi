import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, RemoteCommand, HostPlaybackState, ScanProgressEvent, ServerLogEntry } from '../../shared/types';
import { sessionService } from '../services/sessionService';
import { roomService } from '../services/roomService';
import { scannerService } from '../services/scannerService';
import { logger } from '../services/loggerService';
import { prisma } from '../db';

export class SocketManager {
  private io: Server;
  private connectedSockets: Map<string, { deviceId?: string; isHost?: boolean }> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    this.setupServiceCallbacks();
    this.setupSocketEvents();
  }

  private setupServiceCallbacks() {
    // Forward host state broadcasts to all connected clients
    sessionService.setCallbacks(
      (state: HostPlaybackState) => {
        this.io.emit(SOCKET_EVENTS.HOST_STATE_CHANGED, state);
      },
      (cmd: RemoteCommand) => {
        // Send command to host player specifically or broadcast to host sockets
        this.io.emit(SOCKET_EVENTS.REMOTE_COMMAND, cmd);
      }
    );

    // Forward synchronized room state changes to room channel
    roomService.setBroadcastCallback((roomId: string, room) => {
      this.io.to(`room:${roomId}`).emit(SOCKET_EVENTS.ROOM_STATE_UPDATED, room);
    });

    // Forward library scan progress events
    scannerService.setProgressCallback((event: ScanProgressEvent) => {
      this.io.emit(SOCKET_EVENTS.SCAN_PROGRESS, event);
      if (event.status === 'completed') {
        this.io.emit(SOCKET_EVENTS.MEDIA_UPDATED);
      }
    });

    // Forward structured server logs to clients
    logger.setBroadcastCallback((logEntry: ServerLogEntry) => {
      this.io.emit(SOCKET_EVENTS.LOG_ENTRY, logEntry);
    });
  }

  private setupSocketEvents() {
    this.io.on('connection', (socket: Socket) => {
      logger.debug('socket', `Socket connected: ${socket.id}`);
      this.connectedSockets.set(socket.id, {});

      // Register device information
      socket.on(SOCKET_EVENTS.DEVICE_REGISTER, async (data: { deviceId: string; name: string; deviceType: string; isHost?: boolean }) => {
        try {
          this.connectedSockets.set(socket.id, {
            deviceId: data.deviceId,
            isHost: data.isHost,
          });

          if (data.isHost) {
            sessionService.setHostSocketId(socket.id);
          }

          await prisma.device.upsert({
            where: { id: data.deviceId },
            update: {
              name: data.name,
              deviceType: data.deviceType,
              isHost: data.isHost || false,
              ipAddress: socket.handshake.address,
              userAgent: socket.handshake.headers['user-agent'],
              lastSeenAt: new Date(),
            },
            create: {
              id: data.deviceId,
              name: data.name,
              deviceType: data.deviceType,
              isHost: data.isHost || false,
              ipAddress: socket.handshake.address,
              userAgent: socket.handshake.headers['user-agent'],
              lastSeenAt: new Date(),
            },
          });

          this.io.emit(SOCKET_EVENTS.DEVICES_UPDATED);
        } catch (err: any) {
          logger.error('socket', `Device registration failed: ${err.message}`);
        }
      });

      // Periodic heartbeat from device
      socket.on(SOCKET_EVENTS.DEVICE_HEARTBEAT, async (data: { deviceId: string }) => {
        if (data && data.deviceId) {
          try {
            await prisma.device.update({
              where: { id: data.deviceId },
              data: { lastSeenAt: new Date() },
            });
          } catch {}
        }
      });

      // Host reports actual playback state
      socket.on(SOCKET_EVENTS.REPORT_HOST_STATE, async (state: Partial<HostPlaybackState>) => {
        await sessionService.updateHostState(state);
      });

      // Client requests current host state
      socket.on(SOCKET_EVENTS.GET_HOST_STATE, (cb?: (state: HostPlaybackState) => void) => {
        const state = sessionService.getHostState();
        if (typeof cb === 'function') {
          cb(state);
        } else {
          socket.emit(SOCKET_EVENTS.HOST_STATE_CHANGED, state);
        }
      });

      // Remote sends command to Host PC
      socket.on(SOCKET_EVENTS.REMOTE_COMMAND, async (cmd: RemoteCommand, cb?: (ack: any) => void) => {
        const ack = await sessionService.handleRemoteCommand(cmd);
        if (typeof cb === 'function') {
          cb(ack);
        }
      });

      // Room: Join
      socket.on(SOCKET_EVENTS.ROOM_JOIN, async (data: { roomId: string; deviceId: string; deviceName: string }, cb?: (res: any) => void) => {
        try {
          socket.join(`room:${data.roomId}`);
          const room = await roomService.joinRoom(data.roomId, data.deviceId, data.deviceName);
          if (typeof cb === 'function') {
            cb({ success: true, room });
          }
        } catch (err: any) {
          if (typeof cb === 'function') {
            cb({ success: false, error: err.message });
          }
        }
      });

      // Room: Leave
      socket.on(SOCKET_EVENTS.ROOM_LEAVE, async (data: { roomId: string; deviceId: string }) => {
        try {
          socket.leave(`room:${data.roomId}`);
          await roomService.leaveRoom(data.roomId, data.deviceId);
        } catch {}
      });

      // Room: Sync Command (play, pause, seek, loadMedia)
      socket.on(SOCKET_EVENTS.ROOM_SYNC_COMMAND, async (data: { roomId: string; deviceId: string; action: any }, cb?: (res: any) => void) => {
        try {
          const room = await roomService.syncState(data.roomId, data.deviceId, data.action);
          if (typeof cb === 'function') cb({ success: true, room });
        } catch (err: any) {
          if (typeof cb === 'function') cb({ success: false, error: err.message });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        const info = this.connectedSockets.get(socket.id);
        if (info?.isHost) {
          sessionService.setHostSocketId(null);
        }
        this.connectedSockets.delete(socket.id);
        logger.debug('socket', `Socket disconnected: ${socket.id}`);
      });
    });
  }

  public getIO(): Server {
    return this.io;
  }
}
