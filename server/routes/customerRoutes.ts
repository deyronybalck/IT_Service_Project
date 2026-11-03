import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity } from '../auth.js';

const router = Router();

// GET /api/customers
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { search, type, status } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];

  if (search) {
    const s = `%${search}%`;
    query += ' AND (name LIKE ? OR phone LIKE ? OR whatsapp LIKE ? OR email LIKE ? OR contact_person LIKE ?)';
    params.push(s, s, s, s, s);
  }

  if (type && type !== 'all') {
    query += ' AND type = ?';
    params.push(type);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY name ASC';
  const customers = db.prepare(query).all(...params);

  return res.json(customers);
});

// GET /api/customers/:id
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const services = db.prepare('SELECT * FROM services WHERE customer_id = ? ORDER BY received_at DESC').all(customer.id) as any[];
  const quotations = db.prepare('SELECT * FROM quotations WHERE customer_id = ? ORDER BY quotation_date DESC').all(customer.id);
  const ledger = db.prepare('SELECT * FROM customer_ledgers WHERE customer_id = ? ORDER BY transaction_date DESC, created_at DESC').all(customer.id) as any[];
  const followups = db.prepare('SELECT * FROM customer_followups WHERE customer_id = ? ORDER BY follow_up_date DESC').all(customer.id);

  // Calculate profile metrics
  const totalServices = services.length;
  const activeServices = services.filter(s => !['Delivered', 'Cancelled', 'Returned / Not Repaired'].includes(s.status)).length;
  const completedServices = services.filter(s => s.status === 'Delivered').length;

  let totalBilled = 0;
  let totalPaid = 0;

  for (const entry of ledger) {
    totalBilled += Number(entry.debit) || 0;
    totalPaid += Number(entry.credit) || 0;
  }
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

  return res.json({
    ...customer,
    services,
    quotations,
    ledger,
    followups,
    stats: {
      totalServices,
      activeServices,
      completedServices,
      totalBilled,
      totalPaid,
      outstandingBalance,
    },
  });
});

// POST /api/customers
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { name, type = 'individual', contact_person, phone, whatsapp, email, address, notes } = req.body;

  if (!name || !phone || !address) {
    return res.status(400).json({ error: 'Customer Name, Phone, and Address are required.' });
  }

  const id = `CUST-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO customers (id, name, type, contact_person, phone, whatsapp, email, address, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id, name.trim(), type, contact_person || name.trim(), phone.trim(),
    whatsapp ? whatsapp.trim() : phone.trim(), email ? email.trim() : '',
    address.trim(), notes || '', now, now
  );

  logActivity(req, 'CREATE_CUSTOMER', 'CUSTOMER', id, `Created customer profile: ${name} (${phone})`);

  return res.status(201).json({ message: 'Customer created successfully.', id });
});

// PUT /api/customers/:id
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const { name, type, contact_person, phone, whatsapp, email, address, notes, status } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE customers SET
      name = ?, type = ?, contact_person = ?, phone = ?, whatsapp = ?,
      email = ?, address = ?, notes = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name || customer.name, type || customer.type, contact_person || customer.contact_person,
    phone || customer.phone, whatsapp || customer.whatsapp, email !== undefined ? email : customer.email,
    address || customer.address, notes !== undefined ? notes : customer.notes,
    status || customer.status, now, customer.id
  );

  logActivity(req, 'UPDATE_CUSTOMER', 'CUSTOMER', customer.id, `Updated customer profile: ${name || customer.name}`);

  return res.json({ message: 'Customer updated successfully.' });
});

// POST /api/customers/:id/payments (Direct customer payment collection)
router.post('/:id/payments', authMiddleware, (req: AuthenticatedRequest, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const { amount, payment_method = 'Cash', reference_id, description } = req.body;
  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({ error: 'A valid payment amount is required.' });
  }

  const now = new Date().toISOString();
  const ledgerId = `LED-${Date.now()}`;

  db.prepare(`
    INSERT INTO customer_ledgers (id, customer_id, transaction_date, reference_type, reference_id, description, debit, credit, running_balance, payment_method, recorded_by, created_at)
    VALUES (?, ?, ?, 'PAYMENT', ?, ?, 0, ?, 0, ?, ?, ?)
  `).run(
    ledgerId,
    customer.id,
    now.split('T')[0],
    reference_id || 'DIRECT',
    description || `Customer payment collected via ${payment_method}`,
    paymentAmount,
    payment_method,
    req.user?.name || 'Accounts Staff',
    now
  );

  // If payment references a specific service, also adjust service amount_received & outstanding_balance
  if (reference_id && reference_id.startsWith('SRV-')) {
    db.prepare(`
      UPDATE services 
      SET amount_received = amount_received + ?,
          outstanding_balance = MAX(0, outstanding_balance - ?),
          updated_at = ?
      WHERE id = ?
    `).run(paymentAmount, paymentAmount, now, reference_id);
  }

  logActivity(req, 'RECORD_PAYMENT', 'CUSTOMER', customer.id, `Collected payment of BDT ${paymentAmount} via ${payment_method} from ${customer.name}`);

  return res.status(201).json({ message: 'Payment recorded and ledger updated.', ledgerId });
});

export default router;
