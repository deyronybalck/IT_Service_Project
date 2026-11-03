import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity } from '../auth.js';

const router = Router();

// GET /api/quotations
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { customerId, status, startDate, endDate, search } = req.query;

  let query = 'SELECT * FROM quotations WHERE 1=1';
  const params: any[] = [];

  if (customerId) {
    query += ' AND customer_id = ?';
    params.push(customerId);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (startDate) {
    query += ' AND date(quotation_date) >= date(?)';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date(quotation_date) <= date(?)';
    params.push(endDate);
  }

  if (search) {
    const s = `%${search}%`;
    query += ' AND (id LIKE ? OR customer_name LIKE ? OR phone LIKE ?)';
    params.push(s, s, s);
  }

  query += ' ORDER BY quotation_date DESC';
  const quotations = db.prepare(query).all(...params);

  return res.json(quotations);
});

// GET /api/quotations/:id
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id) as any;
  if (!quotation) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotation.id);
  const followups = db.prepare('SELECT * FROM customer_followups WHERE related_id = ? ORDER BY created_at DESC').all(quotation.id);

  return res.json({ ...quotation, items, followups });
});

// POST /api/quotations (Create quotation)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const {
    customer_id,
    customer_name,
    contact_person,
    phone,
    address,
    quotation_date,
    valid_until,
    items, // Array of { product_id, product_name, description, quantity, unit_price, discount, vat_percent, tax_percent, warranty_period }
    discount_type = 'fixed',
    discount_value = 0,
    vat_rate = 5,
    vat_type = 'exclusive',
    tax_rate = 0,
    terms_and_conditions,
    delivery_time,
    payment_terms,
    status = 'Draft',
  } = req.body;

  if (!customer_name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer Name, Phone, and at least one item are required.' });
  }

  // Calculate items subtotal
  let subtotal = 0;
  for (const item of items) {
    const q = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const disc = Number(item.discount) || 0;
    subtotal += Math.max(0, (q * price) - disc);
  }

  // Quotation-level discount
  let totalDiscount = 0;
  if (discount_type === 'percent') {
    totalDiscount = (subtotal * (Number(discount_value) || 0)) / 100;
  } else {
    totalDiscount = Number(discount_value) || 0;
  }
  const taxableAmount = Math.max(0, subtotal - totalDiscount);

  // VAT & Tax calculations
  let vatAmount = 0;
  let taxAmount = 0;
  const vRate = Number(vat_rate) || 0;
  const tRate = Number(tax_rate) || 0;

  if (vat_type === 'inclusive') {
    // VAT is already included in prices: VAT = Taxable - (Taxable / (1 + Rate))
    vatAmount = taxableAmount - (taxableAmount / (1 + (vRate / 100)));
  } else {
    // Exclusive
    vatAmount = (taxableAmount * vRate) / 100;
  }

  if (tRate > 0) {
    taxAmount = (taxableAmount * tRate) / 100;
  }

  const grandTotal = vat_type === 'inclusive' 
    ? taxableAmount + taxAmount 
    : taxableAmount + vatAmount + taxAmount;

  const year = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM quotations WHERE id LIKE 'QUO-${year}-%'`).get() as { count: number };
  const quotationId = `QUO-${year}-${(countRow.count + 1).toString().padStart(4, '0')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO quotations (
      id, customer_id, customer_name, contact_person, phone, address, quotation_date,
      valid_until, prepared_by, subtotal, discount_type, discount_value, total_discount,
      vat_rate, vat_type, vat_amount, tax_rate, tax_amount, grand_total, terms_and_conditions,
      delivery_time, payment_terms, status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `).run(
    quotationId, customer_id || null, customer_name, contact_person || customer_name,
    phone, address || '', quotation_date || now.split('T')[0], valid_until || '',
    req.user?.name || 'Sales Representative', subtotal, discount_type, Number(discount_value) || 0,
    totalDiscount, vRate, vat_type, vatAmount, tRate, taxAmount, grandTotal,
    terms_and_conditions || '1. Valid for 15 days.\n2. Official warranty applied.\n3. Goods once sold cannot be returned.',
    delivery_time || '2-3 Business Days', payment_terms || 'Cash / Bank / Net 15 Days',
    status, now, now
  );

  const insertItem = db.prepare(`
    INSERT INTO quotation_items (
      id, quotation_id, product_id, product_name, description, quantity,
      unit_price, discount, vat_percent, tax_percent, warranty_period, total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    const q = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const disc = Number(item.discount) || 0;
    const lineTotal = Math.max(0, (q * price) - disc);
    insertItem.run(
      `QI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      quotationId,
      item.product_id || null,
      item.product_name,
      item.description || '',
      q,
      price,
      disc,
      Number(item.vat_percent) || 0,
      Number(item.tax_percent) || 0,
      item.warranty_period || '1 Year',
      lineTotal
    );
  }

  logActivity(req, 'CREATE_QUOTATION', 'QUOTATION', quotationId, `Created quotation ${quotationId} for ${customer_name}. Total: BDT ${grandTotal}`);

  return res.status(201).json({ message: 'Quotation created successfully.', quotationId });
});

// PATCH /api/quotations/:id/status (Status transitions: Won, Lost, etc.)
router.patch('/:id/status', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { status, rejection_reason } = req.body;
  const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id) as any;
  if (!quote) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE quotations SET status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?
  `).run(status, rejection_reason || null, now, quote.id);

  logActivity(req, 'UPDATE_QUOTATION_STATUS', 'QUOTATION', quote.id, `Quotation ${quote.id} status changed to ${status}`);

  return res.json({ message: `Quotation status updated to ${status}.` });
});

// POST /api/quotations/:id/convert-to-service (Convert Won Quotation into Service/Sales Order)
router.post('/:id/convert-to-service', authMiddleware, (req: AuthenticatedRequest, res) => {
  const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id) as any;
  if (!quote) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quote.id) as any[];
  const year = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM services WHERE id LIKE 'SRV-${year}-%'`).get() as { count: number };
  const serviceId = `SRV-${year}-${(countRow.count + 1).toString().padStart(4, '0')}`;
  const now = new Date().toISOString();

  // Pick first item or overall summary
  const primaryCategory = items[0]?.product_name || 'Hardware Supply & Service';
  const problemsSummary = `Quotation ${quote.id} confirmed order. Products: ` + items.map(i => `${i.product_name} (${i.quantity})`).join(', ');

  db.prepare(`
    INSERT INTO services (
      id, customer_id, customer_name, phone, whatsapp, address, product_category, brand, model,
      serial_number, accessories, reported_problems, physical_condition, received_at, received_by,
      estimated_delivery_date, estimated_cost, status, parts_cost, labor_charge, discount, vat_amount,
      total_bill, amount_received, outstanding_balance, customer_approval_status, additional_remarks,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'Hardware Sales / Service', 'Various', 'Various',
      'ORDER', 'Standard Accessories', ?, 'Brand New', ?, ?,
      ?, ?, 'In Progress', ?, 0, ?, ?,
      ?, 0, ?, 'Approved', ?,
      ?, ?
    )
  `).run(
    serviceId, quote.customer_id || 'CUST-1001', quote.customer_name, quote.phone, quote.phone, quote.address || 'Dhaka',
    problemsSummary, now, req.user?.name || 'Sales Staff',
    quote.valid_until, quote.grand_total, quote.subtotal, quote.total_discount, quote.vat_amount,
    quote.grand_total, quote.grand_total, `Converted from Quotation ${quote.id}`,
    now, now
  );

  // Link items to service parts
  const insertPart = db.prepare(`
    INSERT INTO service_parts_used (id, service_id, product_id, product_name, quantity, unit_cost, unit_price, total_price, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insertPart.run(
      `SP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      serviceId,
      item.product_id,
      item.product_name,
      item.quantity,
      item.unit_price * 0.8, // estimated cost base
      item.unit_price,
      item.total_price,
      now
    );
  }

  // Update Quotation to Won and record linked service
  db.prepare(`
    UPDATE quotations SET status = 'Completed / Won', converted_to_order_id = ?, updated_at = ? WHERE id = ?
  `).run(serviceId, now, quote.id);

  // Add customer ledger charge
  if (quote.customer_id) {
    db.prepare(`
      INSERT INTO customer_ledgers (id, customer_id, transaction_date, reference_type, reference_id, description, debit, credit, running_balance, recorded_by, created_at)
      VALUES (?, ?, ?, 'QUOTATION', ?, ?, ?, 0, ?, ?, ?)
    `).run(
      `LED-${Date.now()}`,
      quote.customer_id,
      now.split('T')[0],
      quote.id,
      `Quotation ${quote.id} accepted order`,
      quote.grand_total,
      quote.grand_total,
      req.user?.name || 'Sales Staff',
      now
    );
  }

  logActivity(req, 'CONVERT_QUOTATION', 'QUOTATION', quote.id, `Converted Won Quotation ${quote.id} to Service Order ${serviceId}`);

  return res.json({
    message: 'Quotation successfully converted to Service Order.',
    serviceId,
  });
});

export default router;
