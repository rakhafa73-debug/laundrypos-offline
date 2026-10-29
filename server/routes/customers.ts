import { Router } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// GET /api/v1/customers - List & search customers with order counts & total debt
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const { search, limit = '50', offset = '0' } = req.query;

  let query = `
    SELECT c.*,
      COUNT(o.id) as total_orders,
      COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.remaining_balance ELSE 0 END), 0) as total_debt
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search && typeof search === 'string') {
    query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const customers = db.prepare(query).all(...params);
  res.json({ success: true, customers });
});

// GET /api/v1/customers/:id - Customer profile and active/past orders
router.get('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });
  }

  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE customer_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id);

  // Compute total receivables
  const debtResult = db.prepare(`
    SELECT COALESCE(SUM(remaining_balance), 0) as total_debt
    FROM orders
    WHERE customer_id = ? AND status != 'cancelled'
  `).get(req.params.id) as { total_debt: number };

  res.json({
    success: true,
    customer: {
      ...customer,
      total_debt: debtResult.total_debt,
      orders
    }
  });
});

// POST /api/v1/customers - Create customer (Cashier & Admin)
router.post('/', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nama dan nomor telepon pelanggan wajib diisi.' });
    }

    const id = 'cst_' + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, name, phone, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), phone.trim(), address?.trim() || null, notes?.trim() || null, now, now);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { name, phone },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      customer: { id, name, phone, address, notes, created_at: now, total_debt: 0, total_orders: 0 }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal menyimpan pelanggan.' });
  }
});

// PUT /api/v1/customers/:id - Update customer
router.put('/:id', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nama dan telepon wajib diisi.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, address = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(name.trim(), phone.trim(), address?.trim() || null, notes?.trim() || null, now, req.params.id);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: req.params.id,
      details: { name, phone },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Data pelanggan berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal memperbarui pelanggan.' });
  }
});

export default router;
