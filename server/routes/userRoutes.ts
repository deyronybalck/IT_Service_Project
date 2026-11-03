import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity } from '../auth.js';

const router = Router();

// GET /api/users (Admin & HR)
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const users = db.prepare(`
    SELECT id, name, email, role, phone, is_active, email_verified, created_at, updated_at
    FROM users
    ORDER BY role ASC, name ASC
  `).all();

  return res.json(users);
});

// POST /api/users (Admin creates staff user)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to create user accounts.' });
  }

  const { name, email, password, role = 'technician', phone, email_verified = 1 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const userId = `USR-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, is_active, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(userId, name.trim(), email.trim().toLowerCase(), hash, role, phone || '', email_verified ? 1 : 0, now, now);

  logActivity(req, 'CREATE_USER', 'USER', userId, `Admin created user ${name} with role ${role} (${email})`);

  return res.status(201).json({ message: 'User account created successfully.', userId });
});

// PATCH /api/users/:id/status (Toggle active/inactive)
router.patch('/:id/status', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to activate or deactivate accounts.' });
  }

  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own administrative account.' });
  }

  const { is_active } = req.body;
  const now = new Date().toISOString();

  db.prepare(`UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?`).run(is_active ? 1 : 0, now, req.params.id);

  logActivity(req, 'TOGGLE_USER_STATUS', 'USER', req.params.id, `User status updated to ${is_active ? 'Active' : 'Inactive'}`);

  return res.json({ message: `User account has been ${is_active ? 'activated' : 'deactivated'}.` });
});

// PATCH /api/users/:id/role (Change role)
router.patch('/:id/role', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to change user roles.' });
  }

  const { role } = req.body;
  if (!['admin', 'hr', 'receptionist', 'technician'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`).run(role, now, req.params.id);

  logActivity(req, 'CHANGE_USER_ROLE', 'USER', req.params.id, `Changed role of user ${req.params.id} to ${role}`);

  return res.json({ message: 'User role updated.' });
});

export default router;
