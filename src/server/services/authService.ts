import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { CONFIG } from '../config';
import { logger } from './loggerService';

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'admin' | 'viewer';
  iat?: number;
  exp?: number;
}

export class AuthService {
  /**
   * Check if any admin user exists (if false, setup wizard is needed)
   */
  public async isSetupCompleted(): Promise<boolean> {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' },
    });
    return adminCount > 0;
  }

  /**
   * Hash password
   */
  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  public generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, CONFIG.JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Express middleware for optional or required authentication
   */
  public authenticate(requiredRole?: 'admin' | 'viewer') {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Allow if auth header is present
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = this.verifyToken(token);
        if (payload) {
          (req as any).user = payload;
          if (requiredRole === 'admin' && payload.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privilege required' });
          }
          return next();
        }
      }

      // Check if setup is needed
      const setupDone = await this.isSetupCompleted();
      if (!setupDone) {
        // In initial setup, permit access
        return next();
      }

      // Check if open guest mode is enabled in settings
      const authSetting = await prisma.settings.findUnique({
        where: { key: 'require_auth' },
      });

      const requireAuth = authSetting?.value === 'true';

      if (!requireAuth && requiredRole !== 'admin') {
        // Open guest mode allows viewers without token
        (req as any).user = { role: 'viewer', username: 'Guest' };
        return next();
      }

      if (requiredRole === 'admin') {
        return res.status(401).json({ error: 'Admin authentication required' });
      }

      if (requireAuth) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      next();
    };
  }
}

export const authService = new AuthService();
