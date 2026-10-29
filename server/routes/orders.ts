import { Router } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { createOrderAtomic, updateOrderStatus } from '../services/orderService.ts';
import { logAudit } from '../services/auditService.ts';
import { broadcast } from '../websocket.ts';

const router = Router();

// GET /api/v1/orders - List orders with filter and search
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const { status, paymentStatus, search, limit = '50', offset = '0' } = req.query;

  let query = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, u.full_name as cashier_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON o.cashier_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && typeof status === 'string' && status !== 'all') {
    query += ' AND o.status = ?';
    params.push(status);
  }

  if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'all') {
    query += ' AND o.payment_status = ?';
    params.push(paymentStatus);
  }

  if (search && typeof search === 'string') {
    query += ' AND (o.receipt_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const orders = db.prepare(query).all(...params);

  // Total count for pagination
  let countQuery = `
    SELECT COUNT(*) as total 
    FROM orders o 
    JOIN customers c ON o.customer_id = c.id 
    WHERE 1=1
  `;
  const countParams: any[] = [];
  if (status && typeof status === 'string' && status !== 'all') {
    countQuery += ' AND o.status = ?';
    countParams.push(status);
  }
  if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'all') {
    countQuery += ' AND o.payment_status = ?';
    countParams.push(paymentStatus);
  }
  if (search && typeof search === 'string') {
    countQuery += ' AND (o.receipt_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
    const term = `%${search}%`;
    countParams.push(term, term, term);
  }

  const countResult = db.prepare(countQuery).get(...countParams) as { total: number };

  res.json({
    success: true,
    orders,
    pagination: {
      total: countResult.total,
      limit: Number(limit),
      offset: Number(offset)
    }
  });
});

// GET /api/v1/orders/:id - Order details with history and payments
router.get('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           u.full_name as cashier_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON o.cashier_id = u.id
    WHERE o.id = ? OR o.receipt_number = ?
  `).get(req.params.id, req.params.id) as any;

  if (!order) {
    return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
  }

  const history = db.prepare(`
    SELECT * FROM order_status_history
    WHERE order_id = ?
    ORDER BY created_at ASC
  `).all(order.id);

  const payments = db.prepare(`
    SELECT p.*, u.full_name as cashier_name
    FROM payments p
    JOIN users u ON p.cashier_id = u.id
    WHERE p.order_id = ?
    ORDER BY p.created_at ASC
  `).all(order.id);

  res.json({
    success: true,
    order: {
      ...order,
      history,
      payments
    }
  });
});

// POST /api/v1/orders - Create atomic order (Cashier & Admin only)
router.post('/', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const {
      customerId,
      serviceId,
      weightGrams,
      discountAmount,
      additionalFee,
      fragrance,
      notes,
      downPaymentAmount,
      downPaymentMethod,
      idempotencyKey,
      sessionId
    } = req.body;

    const result = createOrderAtomic({
      customerId,
      serviceId,
      weightGrams: Number(weightGrams),
      discountAmount: Number(discountAmount || 0),
      additionalFee: Number(additionalFee || 0),
      fragrance,
      notes,
      downPaymentAmount: Number(downPaymentAmount || 0),
      downPaymentMethod: downPaymentMethod || 'cash',
      idempotencyKey,
      sessionId,
      cashierId: req.user!.id,
      cashierName: req.user!.fullName,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal membuat pesanan.' });
  }
});

// PATCH /api/v1/orders/:id/status - Update laundry status
router.patch('/:id/status', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { status, notes, pickedUpBy } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status baru wajib diisi.' });
    }

    const result = updateOrderStatus(
      req.params.id,
      status,
      req.user!,
      notes,
      pickedUpBy,
      req.ip
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal mengubah status pesanan.' });
  }
});

// POST /api/v1/orders/:id/cancel - Cancel order (Admin & Cashier only)
router.post('/:id/cancel', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    if (order.status === 'picked_up') {
      return res.status(400).json({ success: false, message: 'Pesanan yang sudah diambil tidak dapat dibatalkan.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now, req.params.id);

    db.prepare(`
      INSERT INTO order_status_history (id, order_id, user_id, user_name_snapshot, previous_status, new_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, 'cancelled', ?, ?)
    `).run('osh_' + Date.now(), req.params.id, req.user!.id, req.user!.fullName, order.status, reason || 'Dibatalkan oleh kasir/admin', now);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'ORDER_CANCELLED',
      entityType: 'ORDER',
      entityId: req.params.id,
      details: { receiptNumber: order.receipt_number, reason },
      ipAddress: req.ip
    });

    broadcast('ORDER_STATUS_CHANGED', {
      orderId: req.params.id,
      receiptNumber: order.receipt_number,
      previousStatus: order.status,
      newStatus: 'cancelled',
      updatedBy: req.user!.fullName,
      timestamp: now
    });

    res.json({ success: true, message: 'Pesanan berhasil dibatalkan.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal membatalkan pesanan.' });
  }
});

export default router;
