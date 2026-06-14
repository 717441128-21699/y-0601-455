import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  playerId?: string;
}

interface JwtPayload {
  playerId: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'magic-candy-secret-key-2024') as JwtPayload;
    req.playerId = decoded.playerId;
    next();
  } catch (error) {
    res.status(401).json({ message: '令牌无效' });
  }
};

export const generateToken = (playerId: string) => {
  return jwt.sign(
    { playerId },
    process.env.JWT_SECRET || 'magic-candy-secret-key-2024',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};
