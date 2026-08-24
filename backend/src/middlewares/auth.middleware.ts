/**
 * JWT Authentication Middleware
 * Validates JWT tokens and extracts user information
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email: string;
  };
}

/**
 * Middleware to verify JWT token
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as {
      id: number;
      role: string;
      email: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }
}

/**
 * Middleware to check if user has specific role
 */
export function authorizeRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_MESSAGES.FORBIDDEN,
      });
      return;
    }

    next();
  };
}
