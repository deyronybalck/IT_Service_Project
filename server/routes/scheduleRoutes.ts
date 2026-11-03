import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity, sendInAppNotification } from '../auth.js';

const router = Router();

// GET /api/schedules
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { date, technicianId, status } = req.query;

  let query = 'SELECT * FROM service_schedules WHERE 1=1';
  const params: any[] = [];

  // Technician only sees their own assigned visits
  if (req.user?.role === 'technician') {
    query += ' AND assigned_technician_id = ?';
    params.push(req.user.id);
  } else if (technicianId) {
    query += ' AND assigned_technician_id = ?';
    params.push(technicianId);
  }

  if (date) {
    query += ' AND schedule_date = ?';
    params.push(date);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY schedule_date DESC, schedule_time ASC';
  const schedules = db.prepare(query).all(...params);

  return res.json(schedules);
});

// GET /api/schedules/:id
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const schedule = db.prepare('SELECT * FROM service_schedules WHERE id = ?').get(req.params.id) as any;
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule record not found.' });
  }

  if (req.user?.role === 'technician' && schedule.assigned_technician_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You are not assigned to this field visit.' });
  }

  const reports = db.prepare('SELECT * FROM technician_daily_reports WHERE schedule_id = ? ORDER BY created_at DESC').all(schedule.id);
  return res.json({ ...schedule, reports });
});

// POST /api/schedules (Create schedule)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role === 'technician') {
    return res.status(403).json({ error: 'Technicians must submit new calls through New Service Call Requests.' });
  }

  const {
    customer_id,
    customer_name,
    customer_type,
    location_address,
    contact_person,
    contact_phone,
    service_category,
    problem_description,
    assigned_technician_id,
    schedule_date,
    schedule_time,
    priority = 'Normal',
    admin_instructions,
    expected_duration,
  } = req.body;

  if (!customer_name || !location_address || !contact_phone || !service_category || !schedule_date) {
    return res.status(400).json({ error: 'Customer Name, Location, Contact Phone, Category, and Date are required.' });
  }

  // Conflict check: is the technician already assigned to a visit on that date and similar time?
  let conflictWarning = null;
  if (assigned_technician_id && schedule_date) {
    const existingVisit = db.prepare(`
      SELECT id, customer_name, schedule_time 
      FROM service_schedules 
      WHERE assigned_technician_id = ? AND schedule_date = ? AND status NOT IN ('Cancelled', 'Completed')
    `).get(assigned_technician_id, schedule_date) as any;

    if (existingVisit) {
      conflictWarning = `Technician already has a visit scheduled for ${existingVisit.customer_name} at ${existingVisit.schedule_time || 'the same day'}.`;
    }
  }

  let assignedTechName = null;
  if (assigned_technician_id) {
    const tech = db.prepare('SELECT name FROM users WHERE id = ?').get(assigned_technician_id) as any;
    if (tech) assignedTechName = tech.name;
  }

  const year = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM service_schedules WHERE id LIKE 'SCH-${year}-%'`).get() as { count: number };
  const scheduleId = `SCH-${year}-${(countRow.count + 1).toString().padStart(4, '0')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO service_schedules (
      id, customer_id, customer_name, customer_type, location_address, contact_person,
      contact_phone, service_category, problem_description, assigned_technician_id,
      assigned_technician_name, schedule_date, schedule_time, priority, admin_instructions,
      expected_duration, status, created_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `).run(
    scheduleId, customer_id || null, customer_name, customer_type || 'institution', location_address,
    contact_person || customer_name, contact_phone, service_category, problem_description,
    assigned_technician_id || null, assignedTechName, schedule_date, schedule_time || '10:00 AM',
    priority, admin_instructions || '', expected_duration || '2 Hours',
    assigned_technician_id ? 'Assigned' : 'Scheduled',
    req.user?.name || 'Admin', now, now
  );

  logActivity(req, 'CREATE_SCHEDULE', 'SCHEDULE', scheduleId, `Created field schedule for ${customer_name} on ${schedule_date}`);

  if (assigned_technician_id) {
    sendInAppNotification(assigned_technician_id, 'Field Schedule Assigned', `Visit assigned: ${customer_name} on ${schedule_date} at ${schedule_time}.`, 'schedule', `/technician/schedules`);
  }

  return res.status(201).json({
    message: 'Field service schedule created.',
    scheduleId,
    conflictWarning,
  });
});

// PUT /api/schedules/:id
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const schedule = db.prepare('SELECT * FROM service_schedules WHERE id = ?').get(req.params.id) as any;
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule record not found.' });
  }

  const {
    assigned_technician_id,
    schedule_date,
    schedule_time,
    priority,
    admin_instructions,
    expected_duration,
    status,
  } = req.body;

  let assignedTechName = schedule.assigned_technician_name;
  if (assigned_technician_id && assigned_technician_id !== schedule.assigned_technician_id) {
    const tech = db.prepare('SELECT name FROM users WHERE id = ?').get(assigned_technician_id) as any;
    if (tech) assignedTechName = tech.name;
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE service_schedules SET
      assigned_technician_id = ?,
      assigned_technician_name = ?,
      schedule_date = ?,
      schedule_time = ?,
      priority = ?,
      admin_instructions = ?,
      expected_duration = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    assigned_technician_id || schedule.assigned_technician_id,
    assignedTechName,
    schedule_date || schedule.schedule_date,
    schedule_time || schedule.schedule_time,
    priority || schedule.priority,
    admin_instructions !== undefined ? admin_instructions : schedule.admin_instructions,
    expected_duration || schedule.expected_duration,
    status || schedule.status,
    now,
    schedule.id
  );

  logActivity(req, 'UPDATE_SCHEDULE', 'SCHEDULE', schedule.id, `Updated schedule ${schedule.id}. Status: ${status || schedule.status}`);

  return res.json({ message: 'Schedule updated successfully.' });
});

// POST /api/schedules/:id/report (Technician daily work report)
router.post('/:id/report', authMiddleware, (req: AuthenticatedRequest, res) => {
  const schedule = db.prepare('SELECT * FROM service_schedules WHERE id = ?').get(req.params.id) as any;
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule record not found.' });
  }

  const {
    arrival_time,
    departure_time,
    work_performed,
    problems_found,
    work_completed,
    parts_used, // array of { product_name, quantity, price }
    service_charge,
    amount_collected,
    handover_person_name,
    handover_person_phone,
    customer_feedback,
    follow_up_required,
    recommended_next_visit,
    remarks,
    status = 'Submitted',
  } = req.body;

  if (!work_performed || !work_completed) {
    return res.status(400).json({ error: 'Work performed and work completed descriptions are required.' });
  }

  const charge = Number(service_charge) || 0;
  const collected = Number(amount_collected) || 0;
  const outstanding = Math.max(0, charge - collected);

  const reportId = `TDR-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO technician_daily_reports (
      id, schedule_id, technician_id, technician_name, customer_name, service_location,
      arrival_time, departure_time, work_performed, problems_found, work_completed,
      parts_used_json, service_charge, amount_collected, outstanding_amount,
      handover_person_name, handover_person_phone, customer_feedback, follow_up_required,
      recommended_next_visit, remarks, status, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `).run(
    reportId, schedule.id, req.user?.id || 'USR-TECH', req.user?.name || 'Technician',
    schedule.customer_name, schedule.location_address, arrival_time || '10:00 AM',
    departure_time || '01:00 PM', work_performed, problems_found || '', work_completed,
    JSON.stringify(parts_used || []), charge, collected, outstanding,
    handover_person_name || '', handover_person_phone || '', customer_feedback || '',
    follow_up_required ? 1 : 0, recommended_next_visit || '', remarks || '',
    status, now
  );

  // Update schedule status to Completed
  db.prepare(`UPDATE service_schedules SET status = 'Completed', updated_at = ? WHERE id = ?`).run(now, schedule.id);

  // Sync Customer Ledger if collection was made
  if (collected > 0 && schedule.customer_id) {
    db.prepare(`
      INSERT INTO customer_ledgers (id, customer_id, transaction_date, reference_type, reference_id, description, debit, credit, running_balance, payment_method, recorded_by, created_at)
      VALUES (?, ?, ?, 'PAYMENT', ?, ?, 0, ?, 0, 'Cash', ?, ?)
    `).run(
      `LED-${Date.now()}`,
      schedule.customer_id,
      now.split('T')[0],
      schedule.id,
      `Field service collection by ${req.user?.name} for ${schedule.id}`,
      collected,
      req.user?.name || 'Technician',
      now
    );
  }

  logActivity(req, 'SUBMIT_WORK_REPORT', 'SCHEDULE', schedule.id, `Technician ${req.user?.name} submitted visit report for ${schedule.customer_name}`);
  sendInAppNotification('ALL_ADMIN', 'Daily Work Report Submitted', `${req.user?.name} completed visit at ${schedule.customer_name}. Collected: BDT ${collected}`, 'schedule', `/schedules`);

  return res.status(201).json({ message: 'Daily work report submitted successfully.', reportId });
});

// POST /api/schedules/technician-requests (Technician submits new service call discovered in field)
router.post('/technician-requests', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { institution_name, contact_person, phone, address, problem_details, service_required, urgency, technician_remarks } = req.body;

  if (!institution_name || !phone || !problem_details || !service_required) {
    return res.status(400).json({ error: 'Institution Name, Phone, Problem Details, and Service Required are required.' });
  }

  const id = `TSR-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO technician_service_requests (
      id, technician_id, technician_name, institution_name, contact_person, phone, address,
      problem_details, service_required, urgency, technician_remarks, status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 'Pending Approval', ?, ?
    )
  `).run(
    id, req.user?.id || 'TECH', req.user?.name || 'Technician', institution_name,
    contact_person || institution_name, phone, address || 'Dhaka',
    problem_details, service_required, urgency || 'Normal', technician_remarks || '', now, now
  );

  logActivity(req, 'SUBMIT_SERVICE_REQUEST', 'REQUEST', id, `Technician submitted new service call request for ${institution_name}`);
  sendInAppNotification('ALL_ADMIN', 'New Field Service Call Awaiting Approval', `${req.user?.name} discovered new service need at ${institution_name}.`, 'approval', '/technician-requests');

  return res.status(201).json({ message: 'New service call submitted for Admin review and scheduling.', id });
});

// GET /api/schedules/technician-requests (Admin approval queue)
router.get('/technician-requests', authMiddleware, (req: AuthenticatedRequest, res) => {
  let query = 'SELECT * FROM technician_service_requests';
  const params: any[] = [];

  // Technician only sees their own submitted requests
  if (req.user?.role === 'technician') {
    query += ' WHERE technician_id = ?';
    params.push(req.user.id);
  }

  query += ' ORDER BY created_at DESC';
  const requests = db.prepare(query).all(...params);
  return res.json(requests);
});

// PATCH /api/schedules/technician-requests/:id/approve (Admin approves and assigns schedule)
router.patch('/technician-requests/:id/approve', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to approve field service requests.' });
  }

  const { assigned_technician_id, schedule_date, schedule_time, admin_remarks, priority = 'Normal' } = req.body;
  const request = db.prepare('SELECT * FROM technician_service_requests WHERE id = ?').get(req.params.id) as any;

  if (!request) {
    return res.status(404).json({ error: 'Service call request not found.' });
  }

  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM service_schedules WHERE id LIKE 'SCH-${year}-%'`).get() as { count: number };
  const scheduleId = `SCH-${year}-${(countRow.count + 1).toString().padStart(4, '0')}`;

  let assignedTechName = '';
  if (assigned_technician_id) {
    const tech = db.prepare('SELECT name FROM users WHERE id = ?').get(assigned_technician_id) as any;
    if (tech) assignedTechName = tech.name;
  }

  // Create official schedule
  db.prepare(`
    INSERT INTO service_schedules (
      id, customer_name, customer_type, location_address, contact_person, contact_phone,
      service_category, problem_description, assigned_technician_id, assigned_technician_name,
      schedule_date, schedule_time, priority, admin_instructions, expected_duration, status,
      created_by, created_at, updated_at
    ) VALUES (
      ?, ?, 'institution', ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, '3 Hours', 'Assigned',
      ?, ?, ?
    )
  `).run(
    scheduleId, request.institution_name, request.address, request.contact_person, request.phone,
    request.service_required, request.problem_details, assigned_technician_id || request.technician_id,
    assignedTechName || request.technician_name, schedule_date || now.split('T')[0],
    schedule_time || '10:00 AM', priority, admin_remarks || 'Approved from technician field call',
    req.user?.name || 'Admin', now, now
  );

  // Update request status
  db.prepare(`
    UPDATE technician_service_requests SET
      status = 'Approved',
      admin_remarks = ?,
      scheduled_id = ?,
      updated_at = ?
    WHERE id = ?
  `).run(admin_remarks || 'Approved and scheduled.', scheduleId, now, request.id);

  logActivity(req, 'APPROVE_SERVICE_REQUEST', 'REQUEST', request.id, `Admin approved request ${request.id} into schedule ${scheduleId}`);
  sendInAppNotification(request.technician_id, 'Service Request Approved', `Your request for ${request.institution_name} was approved into schedule ${scheduleId}.`, 'schedule', '/technician/schedules');

  return res.json({ message: 'Request approved and scheduled successfully.', scheduleId });
});

// PATCH /api/schedules/technician-requests/:id/reject (Admin rejects)
router.patch('/technician-requests/:id/reject', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to reject field service requests.' });
  }

  const { admin_remarks } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE technician_service_requests SET
      status = 'Rejected',
      admin_remarks = ?,
      updated_at = ?
    WHERE id = ?
  `).run(admin_remarks || 'Request declined by management.', now, req.params.id);

  logActivity(req, 'REJECT_SERVICE_REQUEST', 'REQUEST', req.params.id, `Admin rejected request ${req.params.id}`);

  return res.json({ message: 'Service request rejected.' });
});

// GET /api/schedules/free-lab (Free Computer Lab Services)
router.get('/free-lab', authMiddleware, (req: AuthenticatedRequest, res) => {
  const records = db.prepare('SELECT * FROM free_lab_services ORDER BY visit_date DESC').all();
  return res.json(records);
});

// POST /api/schedules/free-lab (Submit Free Computer Lab Service record)
router.post('/free-lab', authMiddleware, (req: AuthenticatedRequest, res) => {
  const {
    institution_name,
    customer_id,
    visit_date,
    total_computers,
    working_computers,
    non_working_computers,
    problems_found,
    work_completed,
    required_parts,
    lab_condition,
    next_visit_recommendation,
    photo_notes,
    remarks,
  } = req.body;

  if (!institution_name || !work_completed || !visit_date) {
    return res.status(400).json({ error: 'Institution Name, Visit Date, and Work Completed are required.' });
  }

  const id = `LAB-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO free_lab_services (
      id, institution_name, customer_id, visit_date, technician_id, technician_name,
      total_computers, working_computers, non_working_computers, problems_found,
      work_completed, required_parts, lab_condition, next_visit_recommendation,
      photo_notes, remarks, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    id, institution_name, customer_id || null, visit_date, req.user?.id || 'TECH',
    req.user?.name || 'Technician', Number(total_computers) || 0, Number(working_computers) || 0,
    Number(non_working_computers) || 0, problems_found || '', work_completed,
    required_parts || '', lab_condition || 'Normal', next_visit_recommendation || '',
    photo_notes || '', remarks || '', now
  );

  logActivity(req, 'CREATE_FREE_LAB', 'LAB_SERVICE', id, `Recorded free computer lab visit at ${institution_name}`);

  return res.status(201).json({ message: 'Free Computer Lab service report saved successfully.', id });
});

export default router;
