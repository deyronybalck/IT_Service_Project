import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity } from '../auth.js';
import { checkAndSend30DayReminders } from '../whatsappReminder.js';

const router = Router();

// GET /api/settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value, description FROM system_settings').all() as any[];
  const settingsObj: Record<string, string> = {};
  for (const row of rows) {
    settingsObj[row.key] = row.value;
  }

  // Hide Meta permanent access token unless authenticated as Admin
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes('Bearer')) {
    if (settingsObj.whatsapp_access_token) {
      settingsObj.whatsapp_access_token = settingsObj.whatsapp_access_token ? '••••••••••••••••' : '';
    }
  }

  return res.json(settingsObj);
});

// POST /api/settings (Admin updates company or notification settings)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to modify system settings.' });
  }

  const updates = req.body; // key-value pairs
  const upsert = db.prepare(`INSERT OR REPLACE INTO system_settings (key, value, description) VALUES (?, ?, ?)`);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'string' || typeof value === 'number') {
      upsert.run(key, String(value), `Updated by ${req.user.name}`);
    }
  }

  logActivity(req, 'UPDATE_SETTINGS', 'SYSTEM', 'CONFIG', 'System settings and business parameters updated.');

  return res.json({ message: 'Settings saved successfully.' });
});

// POST /api/settings/whatsapp/trigger-reminders (Trigger 30-day reminder job manually)
router.post('/whatsapp/trigger-reminders', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators can trigger automated reminder sweeps.' });
  }

  const { forceSimulation = false } = req.body;
  const result = await checkAndSend30DayReminders(forceSimulation);

  logActivity(req, 'TRIGGER_WHATSAPP_REMINDERS', 'SYSTEM', 'WHATSAPP', `Executed 30-day reminder check. Processed: ${result.count}`);

  return res.json({
    message: `30-Day Reminder sweep executed. Processed ${result.count} service items.`,
    result,
  });
});

// GET /api/settings/whatsapp/logs
router.get('/whatsapp/logs', authMiddleware, (req: AuthenticatedRequest, res) => {
  const logs = db.prepare(`
    SELECT * FROM whatsapp_logs ORDER BY created_at DESC LIMIT 50
  `).all();
  return res.json(logs);
});

// GET /api/activity-logs (Admin & HR audit trail)
router.get('/activity-logs', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const logs = db.prepare(`
    SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100
  `).all();
  return res.json(logs);
});

// GET /api/notifications
router.get('/notifications', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? OR user_id = 'ALL' OR (user_id = 'ALL_ADMIN' AND ? = 'admin')
    ORDER BY created_at DESC LIMIT 30
  `).all(userId, req.user?.role);

  const unreadCount = (db.prepare(`
    SELECT COUNT(*) as count FROM notifications 
    WHERE (user_id = ? OR user_id = 'ALL' OR (user_id = 'ALL_ADMIN' AND ? = 'admin')) AND is_read = 0
  `).get(userId, req.user?.role) as any).count;

  return res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', authMiddleware, (req: AuthenticatedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(req.params.id);
  return res.json({ message: 'Marked as read.' });
});

// PATCH /api/notifications/mark-all-read
router.patch('/notifications/mark-all-read', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  db.prepare(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE user_id = ? OR user_id = 'ALL' OR (user_id = 'ALL_ADMIN' AND ? = 'admin')
  `).run(userId, req.user?.role);

  return res.json({ message: 'All notifications marked as read.' });
});

export default router;
