import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { JWTPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Authorization header missing. Expected format: Bearer <token>',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: 'Invalid Authorization header format. Expected: Bearer <token>',
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      logger.auth('warn', 'Rejected expired JWT token');
      res.status(401).json({
        success: false,
        error: 'Authentication token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    logger.auth('warn', 'Rejected invalid JWT token: ' + (err.message || 'Verification failed'));
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
      code: 'TOKEN_INVALID',
    });
  }
};
