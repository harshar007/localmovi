import { Request, Response } from 'express';
import { prisma } from '../db';
import { authService } from '../services/authService';
import { logger } from '../services/loggerService';

export const getAuthStatus = async (req: Request, res: Response) => {
  try {
    const isSetupCompleted = await authService.isSetupCompleted();
    const requireAuthSetting = await prisma.settings.findUnique({
      where: { key: 'require_auth' },
    });

    res.json({
      isSetupCompleted,
      requireAuth: requireAuthSetting?.value === 'true',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const setupAdmin = async (req: Request, res: Response) => {
  try {
    const isSetupDone = await authService.isSetupCompleted();
    if (isSetupDone) {
      return res.status(403).json({ error: 'Setup is already completed' });
    }

    const { username, password } = req.body;
    if (!username || !password || password.length < 4) {
      return res.status(400).json({ error: 'Username and password (min 4 characters) are required' });
    }

    const passwordHash = await authService.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        role: 'admin',
      },
    });

    const token = authService.generateToken({
      userId: user.id,
      username: user.username,
      role: 'admin',
    });

    logger.info('auth', `Initial admin setup completed for user: ${user.username}`);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err: any) {
    logger.error('auth', `Setup admin error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await authService.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = authService.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role as 'admin' | 'viewer',
    });

    logger.info('auth', `User logged in: ${user.username}`);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user });
};
