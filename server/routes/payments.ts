import { Router } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { recordPayment, processRefund } from '../services/paymentService.ts';

const router = Router();

// POST /api/v1/payments - Record payment (DP or Settlement)
router.post('/', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, amount, paymentMethod, paymentType, referenceNote, idempotencyKey, sessionId } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ success: false, message: 'Order ID dan nominal pembayaran wajib diisi.' });
    }

    const result = recordPayment({
      orderId,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'cash',
      paymentType,
      referenceNote,
      idempotencyKey,
      sessionId,
      cashierId: req.user!.id,
      cashierName: req.user!.fullName,
      ipAddress: req.ip
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal memproses pembayaran.' });
  }
});

// POST /api/v1/payments/refund - Admin authorized refund
router.post('/refund', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, refundAmount, reason } = req.body;

    if (!orderId || !refundAmount || !reason) {
      return res.status(400).json({ success: false, message: 'Order ID, nominal refund, dan alasan wajib diisi.' });
    }

    const result = processRefund(
      orderId,
      Number(refundAmount),
      req.user!,
      reason,
      req.ip
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal memproses refund.' });
  }
});

// GET /api/v1/payments/history - List recent payments with filter
router.get('/history', authenticate, (req: AuthenticatedRequest, res) => {
  const { limit = '50', offset = '0', paymentMethod } = req.query;

  let query = `
    SELECT p.*, o.receipt_number, c.name as customer_name, u.full_name as cashier_name
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON p.cashier_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (paymentMethod && typeof paymentMethod === 'string') {
    query += ' AND p.payment_method = ?';
    params.push(paymentMethod);
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const payments = db.prepare(query).all(...params);
  res.json({ success: true, payments });
});

export default router;
