import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'itlab_solutions_super_secret_jwt_key_2026';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'receptionist' | 'technician';
  phone?: string;
  email_verified: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query?.token) {
    token = String(req.query.token);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }

  // Check active status in database
  const user = db.prepare('SELECT id, name, email, role, phone, is_active, email_verified FROM users WHERE id = ?').get(decoded.id) as any;
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account has been deactivated by the Administrator. Please contact management.' });
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    email_verified: user.email_verified,
  };

  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access Denied: Your role (${req.user.role}) does not have permission to access this resource.`,
      });
    }

    next();
  };
}

export function logActivity(req: AuthenticatedRequest, action: string, entityType: string, entityId: string | null, details: string) {
  try {
    const id = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const userId = req.user?.id || 'SYSTEM';
    const userName = req.user?.name || 'System Guest';
    const userRole = req.user?.role || 'guest';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO activity_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, userName, userRole, action, entityType, entityId || '', details, ip, now);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export function sendInAppNotification(userId: string, title: string, message: string, type: string = 'system', link: string = '') {
  try {
    const id = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, userId, title, message, type, link, now);
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}
