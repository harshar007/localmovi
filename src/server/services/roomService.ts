import { RoomItem, RoomMemberItem } from '../../shared/types';
import { prisma } from '../db';
import { logger } from './loggerService';

export class RoomService {
  private broadcastRoomCallback?: (roomId: string, room: RoomItem) => void;

  public setBroadcastCallback(cb: (roomId: string, room: RoomItem) => void) {
    this.broadcastRoomCallback = cb;
  }

  /**
   * Generate friendly unique room code (e.g. ROOM-4921)
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ROOM-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new synchronized room
   */
  public async createRoom(name: string, controllerDeviceId: string, controllerName: string, mediaId?: string): Promise<RoomItem> {
    const code = this.generateRoomCode();
    const room = await prisma.room.create({
      data: {
        code,
        name: name || `Room ${code}`,
        mediaId: mediaId || null,
        controllerId: controllerDeviceId,
        state: 'paused',
        position: 0,
        members: {
          create: {
            deviceId: controllerDeviceId,
            deviceName: controllerName,
          },
        },
      },
      include: {
        members: true,
        media: true,
      },
    });

    logger.info('socket', `Created room ${room.code} by device ${controllerDeviceId}`);
    return this.formatRoom(room);
  }

  /**
   * Get room by code or ID
   */
  public async getRoom(codeOrId: string): Promise<RoomItem | null> {
    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id: codeOrId }, { code: codeOrId.toUpperCase() }],
      },
      include: {
        members: true,
        media: true,
      },
    });

    return room ? this.formatRoom(room) : null;
  }

  /**
   * List all active rooms
   */
  public async listRooms(): Promise<RoomItem[]> {
    const rooms = await prisma.room.findMany({
      include: {
        members: true,
        media: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rooms.map((r) => this.formatRoom(r));
  }

  /**
   * Join a room
   */
  public async joinRoom(roomId: string, deviceId: string, deviceName: string): Promise<RoomItem> {
    await prisma.roomMember.upsert({
      where: {
        roomId_deviceId: {
          roomId,
          deviceId,
        },
      },
      update: {
        deviceName,
        lastPingAt: new Date(),
      },
      create: {
        roomId,
        deviceId,
        deviceName,
      },
    });

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true, media: true },
    });

    if (!room) throw new Error('Room not found');

    const formatted = this.formatRoom(room);
    if (this.broadcastRoomCallback) {
      this.broadcastRoomCallback(room.id, formatted);
    }
    return formatted;
  }

  /**
   * Leave a room
   */
  public async leaveRoom(roomId: string, deviceId: string): Promise<void> {
    await prisma.roomMember.deleteMany({
      where: {
        roomId,
        deviceId,
      },
    });

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true, media: true },
    });

    if (room && this.broadcastRoomCallback) {
      this.broadcastRoomCallback(room.id, this.formatRoom(room));
    }
  }

  /**
   * Synchronize room playback state (play/pause/seek/loadMedia)
   */
  public async syncState(
    roomId: string,
    deviceId: string,
    action: { state?: 'playing' | 'paused'; position?: number; mediaId?: string }
  ): Promise<RoomItem> {
    const updateData: any = {};
    if (action.state) updateData.state = action.state;
    if (typeof action.position === 'number') updateData.position = action.position;
    if (action.mediaId) updateData.mediaId = action.mediaId;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
      include: { members: true, media: true },
    });

    const formatted = this.formatRoom(room);
    if (this.broadcastRoomCallback) {
      this.broadcastRoomCallback(room.id, formatted);
    }
    return formatted;
  }

  private formatRoom(room: any): RoomItem {
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      mediaId: room.mediaId,
      media: room.media
        ? {
            ...room.media,
            createdAt: room.media.createdAt.toISOString(),
            updatedAt: room.media.updatedAt.toISOString(),
          }
        : null,
      state: room.state,
      position: room.position,
      controllerId: room.controllerId,
      members: room.members.map((m: any) => ({
        id: m.id,
        roomId: m.roomId,
        deviceId: m.deviceId,
        deviceName: m.deviceName,
        joinedAt: m.joinedAt.toISOString(),
        lastPingAt: m.lastPingAt.toISOString(),
      })),
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }
}

export const roomService = new RoomService();
