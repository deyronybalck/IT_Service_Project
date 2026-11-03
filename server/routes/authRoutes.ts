import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db.js';
import { signToken, authMiddleware, AuthenticatedRequest, logActivity } from '../auth.js';

const router = Router();

// Store temporary email token notifications in memory for easy dev inspection / testing
export const devEmailQueue: Array<{
  to: string;
  type: 'verification' | 'reset_password';
  token: string;
  link: string;
  expires_at: string;
  sent_at: string;
}> = [];

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact the System Administrator.' });
  }

  // HR, Receptionist, Technician must have verified email
  if (user.role !== 'admin' && !user.email_verified) {
    return res.status(403).json({
      error: 'Your email address is not verified yet. Please check your inbox or use the resend verification option.',
      requiresVerification: true,
      email: user.email,
    });
  }

  const token = signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    email_verified: user.email_verified,
  });

  logActivity(req as any, 'LOGIN', 'USER', user.id, `User ${user.email} logged in successfully with role ${user.role}.`);

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      email_verified: user.email_verified,
    },
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

// POST /api/auth/register (Staff registration / self or admin invite)
router.post('/register', (req, res) => {
  const { name, email, password, role = 'technician', phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const allowedRoles = ['admin', 'hr', 'receptionist', 'technician'];
  const assignedRole = allowedRoles.includes(role) ? role : 'technician';

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const userId = `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  // Verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  // Admins are auto-verified, other roles require verification
  const isEmailVerified = assignedRole === 'admin' ? 1 : 0;

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, is_active, email_verified, verification_token, verification_expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
  `).run(userId, name.trim(), email.trim().toLowerCase(), hash, assignedRole, phone || '', isEmailVerified, verificationToken, expiresAt, now, now);

  const verificationLink = `/verify-email?token=${verificationToken}`;
  devEmailQueue.unshift({
    to: email,
    type: 'verification',
    token: verificationToken,
    link: verificationLink,
    expires_at: expiresAt,
    sent_at: now,
  });

  return res.status(201).json({
    message: isEmailVerified
      ? 'Account created and activated.'
      : 'Account created! An email verification link has been generated.',
    userId,
    verificationToken: isEmailVerified ? null : verificationToken,
    verificationLink: isEmailVerified ? null : verificationLink,
  });
});

// GET /api/auth/verify-email
router.get('/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE verification_token = ?
  `).get(String(token)) as any;

  if (!user) {
    return res.status(400).json({ error: 'Invalid or already used verification token.' });
  }

  if (user.verification_expires_at && new Date(user.verification_expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This verification token has expired. Please request a new one.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users 
    SET email_verified = 1, verification_token = NULL, verification_expires_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(now, user.id);

  logActivity(req as any, 'EMAIL_VERIFIED', 'USER', user.id, `User ${user.email} successfully verified email address.`);

  return res.json({
    message: 'Your email has been successfully verified! You may now log in to IT Lab Solutions Web Panel.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as any;
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email.' });
  }

  if (user.email_verified) {
    return res.status(400).json({ error: 'This account email is already verified. You can log in.' });
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users 
    SET verification_token = ?, verification_expires_at = ?, updated_at = ?
    WHERE id = ?
  `).run(newToken, expiresAt, now, user.id);

  const verificationLink = `/verify-email?token=${newToken}`;
  devEmailQueue.unshift({
    to: user.email,
    type: 'verification',
    token: newToken,
    link: verificationLink,
    expires_at: expiresAt,
    sent_at: now,
  });

  return res.json({
    message: 'Verification link has been generated.',
    token: newToken,
    link: verificationLink,
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as any;
  if (!user) {
    // For security, still return generic success message
    return res.json({ message: 'If an account exists with this email, a password reset link has been dispatched.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users 
    SET reset_password_token = ?, reset_password_expires_at = ?, updated_at = ?
    WHERE id = ?
  `).run(resetToken, expiresAt, now, user.id);

  const resetLink = `/reset-password?token=${resetToken}`;
  devEmailQueue.unshift({
    to: user.email,
    type: 'reset_password',
    token: resetToken,
    link: resetLink,
    expires_at: expiresAt,
    sent_at: now,
  });

  return res.json({
    message: 'Password reset link generated successfully.',
    resetToken,
    resetLink,
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE reset_password_token = ?
  `).get(token) as any;

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired password reset token.' });
  }

  if (user.reset_password_expires_at && new Date(user.reset_password_expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This reset token has expired. Please request a new one.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users 
    SET password_hash = ?, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(hash, now, user.id);

  logActivity(req as any, 'PASSWORD_RESET', 'USER', user.id, `Password was reset via security token.`);

  return res.json({ message: 'Password has been reset successfully. You can now log in.' });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  const now = new Date().toISOString();

  db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(hash, now, user.id);

  logActivity(req, 'CHANGE_PASSWORD', 'USER', user.id, 'User changed their password.');

  return res.json({ message: 'Password updated successfully.' });
});

// GET /api/auth/dev-dispatches (Developer / testing assistant endpoint to inspect email links)
router.get('/dev-dispatches', (req, res) => {
  return res.json({
    queue: devEmailQueue.slice(0, 15),
    smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
  });
});

export default router;
