import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity, sendInAppNotification } from '../auth.js';

const router = Router();

// GET /api/tada
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { employeeId, status, startDate, endDate } = req.query;

  let query = 'SELECT * FROM ta_da_claims WHERE 1=1';
  const params: any[] = [];

  // Technicians can only view their own expense claims
  if (req.user?.role === 'technician') {
    query += ' AND employee_id = ?';
    params.push(req.user.id);
  } else if (employeeId) {
    query += ' AND employee_id = ?';
    params.push(employeeId);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (startDate) {
    query += ' AND date(travel_date) >= date(?)';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date(travel_date) <= date(?)';
    params.push(endDate);
  }

  query += ' ORDER BY travel_date DESC, created_at DESC';
  const claims = db.prepare(query).all(...params);

  return res.json(claims);
});

// POST /api/tada (Technician or staff submits claim)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const {
    schedule_id,
    customer_or_institution,
    travel_date,
    from_location,
    to_location,
    transport_expense = 0,
    food_allowance = 0,
    daily_allowance = 0,
    other_expense = 0,
    explanation,
    attachment_name,
  } = req.body;

  if (!customer_or_institution || !travel_date || !from_location || !to_location) {
    return res.status(400).json({ error: 'Customer/Institution, Travel Date, From Location, and To Location are required.' });
  }

  const transport = Number(transport_expense) || 0;
  const food = Number(food_allowance) || 0;
  const daily = Number(daily_allowance) || 0;
  const other = Number(other_expense) || 0;
  const total = transport + food + daily + other;

  if (total <= 0) {
    return res.status(400).json({ error: 'Claimed expense amount must be greater than zero.' });
  }

  const year = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM ta_da_claims WHERE id LIKE 'EXP-${year}-%'`).get() as { count: number };
  const claimId = `EXP-${year}-${(countRow.count + 1).toString().padStart(4, '0')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ta_da_claims (
      id, employee_id, employee_name, schedule_id, customer_or_institution,
      travel_date, from_location, to_location, transport_expense, food_allowance,
      daily_allowance, other_expense, total_amount, explanation, attachment_name,
      status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      'Submitted', ?, ?
    )
  `).run(
    claimId, req.user?.id || 'STAFF', req.user?.name || 'Staff Member', schedule_id || null,
    customer_or_institution, travel_date, from_location, to_location,
    transport, food, daily, other, total, explanation || '', attachment_name || '', now, now
  );

  logActivity(req, 'SUBMIT_TADA', 'TADA', claimId, `Submitted TA/DA claim ${claimId} of BDT ${total} for travel to ${to_location}`);
  sendInAppNotification('ALL_ADMIN', 'New TA/DA Claim Submitted', `${req.user?.name} submitted TA/DA claim ${claimId} for BDT ${total}.`, 'tada', '/tada');

  return res.status(201).json({ message: 'TA/DA claim submitted for approval.', claimId });
});

// PATCH /api/tada/:id/review (Admin approves, rejects, or requests clarification)
router.patch('/:id/review', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to approve or reject TA/DA claims.' });
  }

  const { status, review_remarks } = req.body;
  if (!['Approved', 'Rejected', 'Under Review'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be Approved, Rejected, or Under Review.' });
  }

  const claim = db.prepare('SELECT * FROM ta_da_claims WHERE id = ?').get(req.params.id) as any;
  if (!claim) {
    return res.status(404).json({ error: 'Expense claim not found.' });
  }

  // Technicians cannot self-approve
  if (claim.employee_id === req.user.id) {
    return res.status(403).json({ error: 'Conflict of interest: You cannot approve your own expense claim.' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE ta_da_claims SET
      status = ?,
      review_remarks = ?,
      reviewed_by = ?,
      updated_at = ?
    WHERE id = ?
  `).run(status, review_remarks || null, req.user.name, now, claim.id);

  logActivity(req, 'REVIEW_TADA', 'TADA', claim.id, `Admin ${req.user.name} reviewed claim ${claim.id}: ${status}`);
  sendInAppNotification(claim.employee_id, `TA/DA Claim ${status}`, `Your claim ${claim.id} (BDT ${claim.total_amount}) has been marked as ${status}.`, 'tada', '/technician/tada');

  return res.json({ message: `TA/DA claim marked as ${status}.` });
});

// PATCH /api/tada/:id/pay (Admin marks approved claim as Paid)
router.patch('/:id/pay', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators can disburse payments for TA/DA claims.' });
  }

  const claim = db.prepare('SELECT * FROM ta_da_claims WHERE id = ?').get(req.params.id) as any;
  if (!claim) {
    return res.status(404).json({ error: 'Claim not found.' });
  }

  if (claim.status !== 'Approved') {
    return res.status(400).json({ error: 'Only approved claims can be marked as Paid.' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE ta_da_claims SET
      status = 'Paid',
      paid_at = ?,
      paid_by = ?,
      updated_at = ?
    WHERE id = ?
  `).run(now, req.user.name, now, claim.id);

  logActivity(req, 'PAY_TADA', 'TADA', claim.id, `Marked TA/DA claim ${claim.id} (BDT ${claim.total_amount}) as Paid to ${claim.employee_name}`);
  sendInAppNotification(claim.employee_id, 'TA/DA Disbursed', `Payment for claim ${claim.id} (BDT ${claim.total_amount}) has been disbursed.`, 'tada', '/technician/tada');

  return res.json({ message: 'Expense claim marked as Paid.' });
});

export default router;
