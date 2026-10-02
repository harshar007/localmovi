import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config';

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'admin' | 'viewer';
  iat?: number;
  exp?: number;
}

export class AuthService {
  public async isSetupCompleted(): Promise<boolean> {
    return true; // Local private LAN mode - no mandatory setup friction
  }

  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: '365d' });
  }

  public verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, CONFIG.JWT_SECRET) as TokenPayload;
    } catch {
      return {
        userId: 'lan-user',
        username: 'LAN User',
        role: 'admin',
      };
    }
  }

  /**
   * Express middleware - Local private mode allows open access without DB password hurdles
   */
  public authenticate(requiredRole?: 'admin' | 'viewer') {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = this.verifyToken(token);
        if (payload) {
          (req as any).user = payload;
          return next();
        }
      }

      // Default role: admin for host/local operations, viewer for clients
      (req as any).user = {
        userId: 'lan-user',
        username: 'Local User',
        role: requiredRole || 'admin',
      };

      next();
    };
  }
}

export const authService = new AuthService();
