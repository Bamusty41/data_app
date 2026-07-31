import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Admin JWT authentication middleware.
 * Expects the token in an HttpOnly cookie named `adminToken`.
 * On success, attaches `req.admin` with the decoded payload.
 */
export interface AdminRequest extends Request {
  admin?: any;
}

export const authMiddleware = (req: AdminRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.adminToken;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const secret = process.env.ADMIN_JWT_SECRET || 'verysecretadmin';
    const payload = jwt.verify(token, secret);
    req.admin = payload;
    next();
  } catch (err) {
    console.error('Auth error', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
