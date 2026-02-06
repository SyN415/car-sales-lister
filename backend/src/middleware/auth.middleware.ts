import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { authService } from '../services/auth.service';
import { SessionUser } from '../types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      token?: string;
    }
  }
}

/**
 * Middleware to verify JWT token and extract user information
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '') ||
                req.cookies?.token ||
                (typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'] : undefined);

    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const response = await authService.getCurrentUser(token);

    if (!response.success || !response.data) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    req.user = response.data;
    req.token = token;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
    } else {
      res.status(500).json({ success: false, error: 'Server error during token verification' });
    }
  }
};

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  next();
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
};

/**
 * Middleware to optionally add user information if token is provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '') ||
                req.cookies?.token ||
                (typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'] : undefined);

    if (token) {
      try {
        jwt.verify(token, config.JWT_SECRET);
        const response = await authService.getCurrentUser(token);
        if (response.success && response.data) {
          req.user = response.data;
          req.token = token;
        }
      } catch (error) {
        console.log('Optional auth token error:', error);
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Middleware to validate required fields in request body
 */
export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];
    for (const field of requiredFields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missingFields.push(field);
      }
    }
    if (missingFields.length > 0) {
      res.status(400).json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` });
      return;
    }
    next();
  };
};

export default { verifyToken, requireAuth, requireAdmin, optionalAuth, validateRequiredFields };
