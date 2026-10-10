import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'peerconnect_ai_default_jwt_secret_2026';

export function signToken(userId: string, role: string): string {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export async function protect(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required. Please log in.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      res.status(401).json({ message: 'User account associated with token no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}

export function requireReviewer(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'reviewer') {
    res.status(403).json({
      message: 'Access restricted to authorized assessment reviewers.',
    });
    return;
  }
  next();
}
