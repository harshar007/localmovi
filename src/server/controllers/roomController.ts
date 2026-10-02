import { Request, Response } from 'express';
import { roomService } from '../services/roomService';
import { logger } from '../services/loggerService';

export const listRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await roomService.listRooms();
    res.json(rooms);
  } catch (err: any) {
    logger.error('socket', `Error listing rooms: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, deviceId, deviceName, mediaId } = req.body;
    if (!deviceId || !deviceName) {
      return res.status(400).json({ error: 'deviceId and deviceName are required' });
    }

    const room = await roomService.createRoom(name, deviceId, deviceName, mediaId);
    res.status(201).json(room);
  } catch (err: any) {
    logger.error('socket', `Error creating room: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

export const getRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await roomService.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const syncRoomPlayback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId, state, position, mediaId } = req.body;
    const updated = await roomService.syncState(id, deviceId, { state, position, mediaId });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.body;
    const result = await roomService.deleteRoom(id, deviceId);
    res.json(result);
  } catch (err: any) {
    logger.error('socket', `Error deleting room: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};


