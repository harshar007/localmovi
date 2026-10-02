import { HostPlaybackState, RemoteCommand, RemoteCommandAck } from '../../shared/types';
import { prisma } from '../db';
import { logger } from './loggerService';

export class SessionService {
  private hostState: HostPlaybackState = {
    target: 'HOST_PC',
    mediaId: null,
    media: null,
    state: 'stopped',
    position: 0,
    duration: 0,
    volume: 1.0,
    playbackRate: 1.0,
    controllerDeviceId: null,
    updatedAt: new Date().toISOString(),
  };

  private hostSocketId: string | null = null;
  private pendingCommands: Map<string, { resolve: (ack: RemoteCommandAck) => void; timer: NodeJS.Timeout }> = new Map();
  private broadcastStateCallback?: (state: HostPlaybackState) => void;
  private sendHostCommandCallback?: (command: RemoteCommand) => void;

  public setCallbacks(
    broadcast: (state: HostPlaybackState) => void,
    sendHostCommand: (cmd: RemoteCommand) => void
  ) {
    this.broadcastStateCallback = broadcast;
    this.sendHostCommandCallback = sendHostCommand;
  }

  public setHostSocketId(socketId: string | null) {
    this.hostSocketId = socketId;
    logger.info('socket', `Host player socket updated: ${socketId || 'offline'}`);
  }

  public getHostState(): HostPlaybackState {
    return this.hostState;
  }

  /**
   * Update host state (reported by host player)
   */
  public async updateHostState(partialState: Partial<HostPlaybackState>): Promise<HostPlaybackState> {
    let mediaDetails = this.hostState.media;

    if (partialState.mediaId && partialState.mediaId !== this.hostState.mediaId) {
      try {
        const media = await prisma.media.findUnique({
          where: { id: partialState.mediaId },
          include: { folder: true },
        });
        if (media) {
          mediaDetails = {
            ...media,
            folderName: media.folder?.name || undefined,
            createdAt: media.createdAt.toISOString(),
            updatedAt: media.updatedAt.toISOString(),
          };
        }
      } catch (err: any) {
        logger.error('server', `Failed to load media details for host state: ${err.message}`);
      }
    } else if (partialState.mediaId === null) {
      mediaDetails = null;
    }

    this.hostState = {
      ...this.hostState,
      ...partialState,
      media: mediaDetails,
      updatedAt: new Date().toISOString(),
    };

    // Broadcast state to all connected clients & remotes
    if (this.broadcastStateCallback) {
      this.broadcastStateCallback(this.hostState);
    }

    // Persist progress to DB if media is playing or stopped
    if (this.hostState.mediaId && this.hostState.position > 0) {
      try {
        const isCompleted = this.hostState.duration > 0 && this.hostState.position >= this.hostState.duration * 0.95;
        await prisma.playbackProgress.upsert({
          where: {
            mediaId_deviceId: {
              mediaId: this.hostState.mediaId,
              deviceId: 'HOST_PC',
            },
          },
          update: {
            position: this.hostState.position,
            duration: this.hostState.duration,
            completed: isCompleted,
          },
          create: {
            mediaId: this.hostState.mediaId,
            deviceId: 'HOST_PC',
            position: this.hostState.position,
            duration: this.hostState.duration,
            completed: isCompleted,
          },
        });
      } catch (err: any) {
        logger.debug('server', `Could not persist host progress: ${err.message}`);
      }
    }

    return this.hostState;
  }

  /**
   * Forward remote command to host and handle acknowledgment
   */
  public async handleRemoteCommand(cmd: RemoteCommand): Promise<RemoteCommandAck> {
    logger.info('socket', `Received remote command [${cmd.command}] from device ${cmd.senderDeviceId}`);

    if (this.sendHostCommandCallback) {
      this.sendHostCommandCallback(cmd);
    }

    // Apply immediate optimistic state update
    if (cmd.command === 'play') {
      this.hostState.state = 'playing';
    } else if (cmd.command === 'pause') {
      this.hostState.state = 'paused';
    } else if (cmd.command === 'togglePlay') {
      this.hostState.state = this.hostState.state === 'playing' ? 'paused' : 'playing';
    } else if (cmd.command === 'seek' && typeof cmd.position === 'number') {
      this.hostState.position = cmd.position;
    } else if (cmd.command === 'volume' && typeof cmd.volume === 'number') {
      this.hostState.volume = Math.max(0, Math.min(1, cmd.volume));
    } else if (cmd.command === 'speed' && typeof cmd.speed === 'number') {
      this.hostState.playbackRate = cmd.speed;
    } else if (cmd.command === 'stop') {
      this.hostState.state = 'stopped';
      this.hostState.position = 0;
    } else if (cmd.command === 'loadMedia' && cmd.mediaId) {
      await this.updateHostState({
        mediaId: cmd.mediaId,
        position: cmd.position || 0,
        state: 'playing',
      });
    }

    this.hostState.controllerDeviceId = cmd.senderDeviceId;
    this.hostState.updatedAt = new Date().toISOString();

    if (this.broadcastStateCallback) {
      this.broadcastStateCallback(this.hostState);
    }

    return {
      success: true,
      command: cmd.command,
      resultingState: this.hostState,
    };
  }
}

export const sessionService = new SessionService();
