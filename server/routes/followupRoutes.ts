import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity } from '../auth.js';

const router = Router();

// GET /api/followups
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { customerId, relatedType, overdue, status } = req.query;

  let query = 'SELECT * FROM customer_followups WHERE 1=1';
  const params: any[] = [];

  if (customerId) {
    query += ' AND customer_id = ?';
    params.push(customerId);
  }

  if (relatedType) {
    query += ' AND related_type = ?';
    params.push(relatedType);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (overdue === 'true') {
    const today = new Date().toISOString().split('T')[0];
    query += ' AND next_follow_up_date IS NOT NULL AND next_follow_up_date <= ? AND status != "Completed"';
    params.push(today);
  }

  query += ' ORDER BY follow_up_date DESC, created_at DESC';
  const followups = db.prepare(query).all(...params);

  return res.json(followups);
});

// POST /api/followups (Record telephone or communication note)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const {
    customer_id,
    customer_name,
    related_type = 'GENERAL',
    related_id,
    contact_method = 'Phone Call',
    customer_response,
    notes,
    next_follow_up_date,
    status = 'Completed',
  } = req.body;

  if (!customer_name || !notes) {
    return res.status(400).json({ error: 'Customer Name and Follow-up Notes are required.' });
  }

  const id = `FOL-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  db.prepare(`
    INSERT INTO customer_followups (
      id, customer_id, customer_name, related_type, related_id, contact_method,
      follow_up_date, employee_id, employee_name, customer_response, notes,
      next_follow_up_date, status, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    id, customer_id || null, customer_name, related_type, related_id || null, contact_method,
    todayStr, req.user?.id || 'STAFF', req.user?.name || 'Staff Member', customer_response || '',
    notes, next_follow_up_date || null, status, now
  );

  logActivity(req, 'RECORD_FOLLOWUP', 'FOLLOWUP', id, `Recorded ${contact_method} follow-up with ${customer_name}`);

  return res.status(201).json({ message: 'Follow-up note recorded.', id });
});

export default router;
