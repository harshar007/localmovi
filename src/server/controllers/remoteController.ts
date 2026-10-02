import { Request, Response } from 'express';
import { sessionService } from '../services/sessionService';
import { RemoteCommand } from '../../shared/types';
import { logger } from '../services/loggerService';

export const getHostPlaybackState = async (req: Request, res: Response) => {
  try {
    const state = sessionService.getHostState();
    res.json(state);
  } catch (err: any) {
    logger.error('server', `Error retrieving host state: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

export const sendRemoteCommand = async (req: Request, res: Response) => {
  try {
    const cmd: RemoteCommand = req.body;
    if (!cmd || !cmd.command) {
      return res.status(400).json({ error: 'Valid command is required' });
    }

    const ack = await sessionService.handleRemoteCommand(cmd);
    res.json(ack);
  } catch (err: any) {
    logger.error('server', `Error executing remote command: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
