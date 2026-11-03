import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest, logActivity } from '../auth.js';

const router = Router();

// GET /api/products
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { category, search, status } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    const s = `%${search}%`;
    query += ' AND (name LIKE ? OR brand LIKE ? OR model LIKE ? OR id LIKE ?)';
    params.push(s, s, s, s);
  }

  query += ' ORDER BY name ASC';
  const products = db.prepare(query).all(...params) as any[];

  // Security: Purchase price visible ONLY to Admin
  const isAuthorizedToSeeCost = req.user?.role === 'admin';
  const sanitized = products.map(p => ({
    ...p,
    purchase_price: isAuthorizedToSeeCost ? p.purchase_price : undefined,
  }));

  return res.json(sanitized);
});

// POST /api/products (Admin only)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to add new products to the inventory database.' });
  }

  const {
    name,
    category,
    brand,
    model,
    description,
    unit = 'Pcs',
    purchase_price = 0,
    selling_price = 0,
    vat_percent = 5,
    tax_percent = 0,
    warranty_period = '1 Year',
    stock_quantity = 0,
  } = req.body;

  if (!name || !category || !brand) {
    return res.status(400).json({ error: 'Product Name, Category, and Brand are required.' });
  }

  const id = `PROD-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (
      id, name, category, brand, model, description, unit,
      purchase_price, selling_price, vat_percent, tax_percent, warranty_period,
      status, stock_quantity, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      'active', ?, ?
    )
  `).run(
    id, name.trim(), category, brand.trim(), model?.trim() || '', description || '', unit,
    Number(purchase_price) || 0, Number(selling_price) || 0, Number(vat_percent) || 0,
    Number(tax_percent) || 0, warranty_period, Number(stock_quantity) || 0, now
  );

  logActivity(req, 'CREATE_PRODUCT', 'PRODUCT', id, `Added product ${name} (${brand})`);

  return res.status(201).json({ message: 'Product created successfully.', id });
});

// PUT /api/products/:id (Admin only)
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to modify inventory products.' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const {
    name,
    category,
    brand,
    model,
    description,
    unit,
    purchase_price,
    selling_price,
    vat_percent,
    tax_percent,
    warranty_period,
    stock_quantity,
    status,
  } = req.body;

  db.prepare(`
    UPDATE products SET
      name = ?, category = ?, brand = ?, model = ?, description = ?, unit = ?,
      purchase_price = ?, selling_price = ?, vat_percent = ?, tax_percent = ?,
      warranty_period = ?, stock_quantity = ?, status = ?
    WHERE id = ?
  `).run(
    name || product.name,
    category || product.category,
    brand || product.brand,
    model !== undefined ? model : product.model,
    description !== undefined ? description : product.description,
    unit || product.unit,
    purchase_price !== undefined ? Number(purchase_price) : product.purchase_price,
    selling_price !== undefined ? Number(selling_price) : product.selling_price,
    vat_percent !== undefined ? Number(vat_percent) : product.vat_percent,
    tax_percent !== undefined ? Number(tax_percent) : product.tax_percent,
    warranty_period || product.warranty_period,
    stock_quantity !== undefined ? Number(stock_quantity) : product.stock_quantity,
    status || product.status,
    product.id
  );

  logActivity(req, 'UPDATE_PRODUCT', 'PRODUCT', product.id, `Updated product ${product.id}`);

  return res.json({ message: 'Product updated successfully.' });
});

// DELETE /api/products/:id (Admin only)
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only Administrators have permission to delete inventory products.' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  logActivity(req, 'DELETE_PRODUCT', 'PRODUCT', req.params.id, `Deleted product ${req.params.id}`);

  return res.json({ message: 'Product deleted.' });
});

export default router;
