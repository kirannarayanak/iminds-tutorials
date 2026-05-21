import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { error } from '../utils/response';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }
}

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '24h';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

export function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
  const refreshToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}
