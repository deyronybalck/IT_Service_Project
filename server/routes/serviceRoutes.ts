import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity, sendInAppNotification } from '../auth.js';

const router = Router();

// GET /api/services
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { search, status, technicianId, customerId, startDate, endDate, overdue30 } = req.query;

  let query = `
    SELECT s.*, c.name as customer_company_name, c.email as customer_email
    FROM services s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Technician role restriction: Technicians only see their assigned services (or unassigned in reception queue if specified)
  if (req.user?.role === 'technician') {
    query += ` AND s.assigned_technician_id = ?`;
    params.push(req.user.id);
  } else if (technicianId) {
    query += ` AND s.assigned_technician_id = ?`;
    params.push(technicianId);
  }

  if (search) {
    const s = `%${search}%`;
    query += ` AND (s.id LIKE ? OR s.customer_name LIKE ? OR s.phone LIKE ? OR s.brand LIKE ? OR s.model LIKE ? OR s.serial_number LIKE ?)`;
    params.push(s, s, s, s, s, s);
  }

  if (status && status !== 'all') {
    query += ` AND s.status = ?`;
    params.push(status);
  }

  if (customerId) {
    query += ` AND s.customer_id = ?`;
    params.push(customerId);
  }

  if (startDate) {
    query += ` AND date(s.received_at) >= date(?)`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND date(s.received_at) <= date(?)`;
    params.push(endDate);
  }

  if (overdue30 === 'true') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query += ` AND s.status NOT IN ('Delivered', 'Cancelled', 'Returned / Not Repaired') AND s.received_at <= ?`;
    params.push(thirtyDaysAgo);
  }

  query += ` ORDER BY s.received_at DESC`;

  const services = db.prepare(query).all(...params);
  return res.json(services);
});

// GET /api/services/:id
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const service = db.prepare(`
    SELECT s.*, c.name as customer_company_name, c.email as customer_email, c.address as customer_full_address
    FROM services s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `).get(req.params.id) as any;

  if (!service) {
    return res.status(404).json({ error: 'Service record not found.' });
  }

  // If technician, verify assigned or permitted
  if (req.user?.role === 'technician' && service.assigned_technician_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You are not assigned to this service job.' });
  }

  const parts = db.prepare('SELECT * FROM service_parts_used WHERE service_id = ?').all(req.params.id);
  const history = db.prepare('SELECT * FROM service_status_history WHERE service_id = ? ORDER BY created_at DESC').all(req.params.id);
  const followups = db.prepare('SELECT * FROM customer_followups WHERE related_id = ? ORDER BY created_at DESC').all(req.params.id);

  return res.json({
    ...service,
    parts,
    history,
    followups,
  });
});

// GET /api/services/barcode/:id (for desktop barcode scanner lookup)
router.get('/barcode/:barcode', authMiddleware, (req: AuthenticatedRequest, res) => {
  const code = req.params.barcode.trim();
  const service = db.prepare(`
    SELECT id, customer_name, product_category, brand, model, status, serial_number
    FROM services
    WHERE id = ? OR serial_number = ?
  `).get(code, code) as any;

  if (!service) {
    return res.status(404).json({ error: 'No service record found matching scanned barcode.' });
  }

  return res.json(service);
});

// POST /api/services (Service receiving)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  // Technician cannot create reception services unless admin/receptionist
  if (req.user?.role === 'technician') {
    return res.status(403).json({ error: 'Technicians must submit new field calls via Technician Service Requests.' });
  }

  const {
    customer_id,
    new_customer,
    product_category,
    brand,
    model,
    serial_number,
    accessories,
    reported_problems,
    physical_condition,
    estimated_delivery_date,
    estimated_cost,
    additional_remarks,
    assigned_technician_id,
  } = req.body;

  if (!product_category || !brand || !model || !reported_problems) {
    return res.status(400).json({ error: 'Product Category, Brand, Model, and Reported Problems are required.' });
  }

  let finalCustomerId = customer_id;
  let customerName = '';
  let customerPhone = '';
  let customerWhatsapp = '';
  let customerAddress = '';

  const now = new Date().toISOString();

  // If adding new customer on-the-fly
  if (new_customer && new_customer.name && new_customer.phone) {
    finalCustomerId = `CUST-${Date.now().toString().slice(-4)}`;
    customerName = new_customer.name.trim();
    customerPhone = new_customer.phone.trim();
    customerWhatsapp = new_customer.whatsapp?.trim() || customerPhone;
    customerAddress = new_customer.address?.trim() || 'Dhaka';

    db.prepare(`
      INSERT INTO customers (id, name, type, contact_person, phone, whatsapp, email, address, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      finalCustomerId,
      customerName,
      new_customer.type || 'individual',
      new_customer.contact_person || customerName,
      customerPhone,
      customerWhatsapp,
      new_customer.email || '',
      customerAddress,
      'Added during service receiving',
      now,
      now
    );
  } else if (finalCustomerId) {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(finalCustomerId) as any;
    if (existing) {
      customerName = existing.name;
      customerPhone = existing.phone;
      customerWhatsapp = existing.whatsapp || existing.phone;
      customerAddress = existing.address;
    }
  }

  if (!finalCustomerId || !customerName) {
    return res.status(400).json({ error: 'Please select an existing customer or provide details for a new customer.' });
  }

  // Generate Service ID: SRV-YYYY-XXXX
  const currentYear = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM services WHERE id LIKE 'SRV-${currentYear}-%'`).get() as { count: number };
  const nextNum = (countRow.count + 1).toString().padStart(4, '0');
  const serviceId = `SRV-${currentYear}-${nextNum}`;

  let assignedTechName = '';
  if (assigned_technician_id) {
    const tech = db.prepare('SELECT name FROM users WHERE id = ?').get(assigned_technician_id) as any;
    if (tech) assignedTechName = tech.name;
  }

  const initialStatus = assigned_technician_id ? 'Under Inspection' : 'Received';

  db.prepare(`
    INSERT INTO services (
      id, customer_id, customer_name, phone, whatsapp, address, product_category, brand, model,
      serial_number, accessories, reported_problems, physical_condition, received_at, received_by,
      estimated_delivery_date, estimated_cost, status, assigned_technician_id, assigned_technician_name,
      inspection_date, problems_identified, work_required, work_completed, parts_cost, labor_charge,
      discount, vat_amount, total_bill, amount_received, outstanding_balance, customer_approval_status,
      customer_feedback, actual_delivery_date, delivered_by, handover_person_name, handover_person_phone,
      return_reason, additional_remarks, last_reminder_sent_at, reminder_count, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      null, null, null, null, 0, 0,
      0, 0, ?, 0, ?, 'Pending',
      null, null, null, null, null,
      null, ?, null, 0, ?, ?
    )
  `).run(
    serviceId, finalCustomerId, customerName, customerPhone, customerWhatsapp, customerAddress, product_category, brand, model,
    serial_number || '', accessories || '', reported_problems, physical_condition || '', now, req.user?.name || 'Reception Desk',
    estimated_delivery_date || '', Number(estimated_cost) || 0, initialStatus, assigned_technician_id || null, assignedTechName || null,
    Number(estimated_cost) || 0, Number(estimated_cost) || 0, additional_remarks || '', now, now
  );

  // Status History
  db.prepare(`
    INSERT INTO service_status_history (id, service_id, status, notes, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`HIST-${Date.now()}`, serviceId, initialStatus, 'Service record registered at workshop reception.', req.user?.name || 'Front Desk', now);

  logActivity(req, 'CREATE_SERVICE', 'SERVICE', serviceId, `Received ${product_category} (${brand} ${model}) for ${customerName}`);

  if (assigned_technician_id) {
    sendInAppNotification(assigned_technician_id, 'New Service Job Assigned', `You have been assigned to service ${serviceId} (${product_category}).`, 'service', `/technician/jobs`);
  }

  return res.status(201).json({
    message: 'Service record registered successfully.',
    serviceId,
  });
});

// PUT /api/services/:id (Update service, diagnosis, parts used, pricing, delivery)
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any;
  if (!service) {
    return res.status(404).json({ error: 'Service record not found.' });
  }

  // Technicians can update diagnosis, work completed, parts used, but cannot alter customer ownership or delete
  const {
    assigned_technician_id,
    inspection_date,
    problems_identified,
    work_required,
    work_completed,
    parts_list, // Array of { product_id, product_name, quantity, unit_cost, unit_price }
    labor_charge,
    discount,
    vat_amount,
    amount_received,
    payment_method,
    status,
    customer_approval_status,
    customer_feedback,
    actual_delivery_date,
    delivered_by,
    handover_person_name,
    handover_person_phone,
    return_reason,
    additional_remarks,
  } = req.body;

  const now = new Date().toISOString();

  let assignedTechName = service.assigned_technician_name;
  if (assigned_technician_id && assigned_technician_id !== service.assigned_technician_id) {
    // Only admin or receptionist can reassign technicians
    if (req.user?.role === 'technician') {
      return res.status(403).json({ error: 'Technicians cannot reassign service jobs.' });
    }
    const tech = db.prepare('SELECT name FROM users WHERE id = ?').get(assigned_technician_id) as any;
    if (tech) assignedTechName = tech.name;
  }

  // Calculate parts total cost
  let calculatedPartsCost = 0;
  if (Array.isArray(parts_list)) {
    // Clear old parts
    db.prepare('DELETE FROM service_parts_used WHERE service_id = ?').run(service.id);
    const insertPart = db.prepare(`
      INSERT INTO service_parts_used (id, service_id, product_id, product_name, quantity, unit_cost, unit_price, total_price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const part of parts_list) {
      const q = Number(part.quantity) || 1;
      const price = Number(part.unit_price) || 0;
      const cost = Number(part.unit_cost) || 0;
      const total = q * price;
      calculatedPartsCost += total;
      insertPart.run(`SP-${Date.now()}-${Math.floor(Math.random() * 1000)}`, service.id, part.product_id || null, part.product_name, q, cost, price, total, now);
    }
  } else {
    calculatedPartsCost = service.parts_cost;
  }

  const labor = labor_charge !== undefined ? Number(labor_charge) : service.labor_charge;
  const disc = discount !== undefined ? Number(discount) : service.discount;
  const vat = vat_amount !== undefined ? Number(vat_amount) : service.vat_amount;
  const totalBill = Math.max(0, calculatedPartsCost + labor - disc + vat);
  const received = amount_received !== undefined ? Number(amount_received) : service.amount_received;
  const outstanding = Math.max(0, totalBill - received);

  const newStatus = status || service.status;

  // Validation: Only mark delivered if actual handover recorded
  if (newStatus === 'Delivered' && !service.actual_delivery_date && !actual_delivery_date) {
    return res.status(400).json({ error: 'Cannot mark as Delivered without recording handover person and delivery date.' });
  }

  // If status changed, record history
  if (newStatus !== service.status) {
    db.prepare(`
      INSERT INTO service_status_history (id, service_id, status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`HIST-${Date.now()}`, service.id, newStatus, additional_remarks || `Status transitioned to ${newStatus}`, req.user?.name || 'Staff', now);
  }

  db.prepare(`
    UPDATE services SET
      assigned_technician_id = ?,
      assigned_technician_name = ?,
      inspection_date = ?,
      problems_identified = ?,
      work_required = ?,
      work_completed = ?,
      parts_cost = ?,
      labor_charge = ?,
      discount = ?,
      vat_amount = ?,
      total_bill = ?,
      amount_received = ?,
      outstanding_balance = ?,
      status = ?,
      customer_approval_status = ?,
      customer_feedback = ?,
      actual_delivery_date = ?,
      delivered_by = ?,
      handover_person_name = ?,
      handover_person_phone = ?,
      return_reason = ?,
      additional_remarks = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    assigned_technician_id || service.assigned_technician_id,
    assignedTechName,
    inspection_date !== undefined ? inspection_date : service.inspection_date,
    problems_identified !== undefined ? problems_identified : service.problems_identified,
    work_required !== undefined ? work_required : service.work_required,
    work_completed !== undefined ? work_completed : service.work_completed,
    calculatedPartsCost,
    labor,
    disc,
    vat,
    totalBill,
    received,
    outstanding,
    newStatus,
    customer_approval_status !== undefined ? customer_approval_status : service.customer_approval_status,
    customer_feedback !== undefined ? customer_feedback : service.customer_feedback,
    actual_delivery_date !== undefined ? actual_delivery_date : service.actual_delivery_date,
    delivered_by !== undefined ? delivered_by : service.delivered_by,
    handover_person_name !== undefined ? handover_person_name : service.handover_person_name,
    handover_person_phone !== undefined ? handover_person_phone : service.handover_person_phone,
    return_reason !== undefined ? return_reason : service.return_reason,
    additional_remarks !== undefined ? additional_remarks : service.additional_remarks,
    now,
    service.id
  );

  // Sync Customer Ledger if payment changed or delivered
  if (received > service.amount_received) {
    const paymentDelta = received - service.amount_received;
    db.prepare(`
      INSERT INTO customer_ledgers (id, customer_id, transaction_date, reference_type, reference_id, description, debit, credit, running_balance, payment_method, recorded_by, created_at)
      VALUES (?, ?, ?, 'PAYMENT', ?, ?, 0, ?, ?, ?, ?, ?)
    `).run(
      `LED-${Date.now()}`,
      service.customer_id,
      now.split('T')[0],
      service.id,
      `Service payment for ${service.id} (${service.product_category})`,
      paymentDelta,
      outstanding,
      payment_method || 'Cash',
      req.user?.name || 'Counter Staff',
      now
    );
  }

  logActivity(req, 'UPDATE_SERVICE', 'SERVICE', service.id, `Updated service ${service.id}. Status: ${newStatus}, Total: BDT ${totalBill}`);

  return res.json({ message: 'Service record updated successfully.', serviceId: service.id });
});

// DELETE /api/services/:id (Admin only)
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to delete or archive service records.' });
  }

  const service = db.prepare('SELECT id, customer_name FROM services WHERE id = ?').get(req.params.id) as any;
  if (!service) {
    return res.status(404).json({ error: 'Service record not found.' });
  }

  db.prepare('DELETE FROM service_parts_used WHERE service_id = ?').run(req.params.id);
  db.prepare('DELETE FROM service_status_history WHERE service_id = ?').run(req.params.id);
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);

  logActivity(req, 'DELETE_SERVICE', 'SERVICE', req.params.id, `Deleted service record ${req.params.id} for ${service.customer_name}`);

  return res.json({ message: 'Service record deleted successfully.' });
});

export default router;
