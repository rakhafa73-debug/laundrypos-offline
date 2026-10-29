import { db } from '../db/database.ts';
import { logAudit } from './auditService.ts';
import { broadcast } from '../websocket.ts';

export interface RecordPaymentInput {
  orderId: string;
  cashierId: string;
  cashierName: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'qris';
  paymentType?: 'down_payment' | 'full_payment' | 'settlement';
  referenceNote?: string;
  idempotencyKey?: string;
  sessionId?: string;
  ipAddress?: string;
}

export function recordPayment(input: RecordPaymentInput) {
  if (input.amount <= 0) {
    throw new Error('Nominal pembayaran harus lebih besar dari Rp 0.');
  }

  // Idempotency check: if key provided and already exists, return existing record
  if (input.idempotencyKey) {
    const existing = db.prepare('SELECT * FROM payments WHERE idempotency_key = ?').get(input.idempotencyKey) as any;
    if (existing) {
      return {
        paymentId: existing.id,
        orderId: existing.order_id,
        amount: existing.amount,
        isDuplicateIdempotent: true
      };
    }
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(input.orderId) as any;
  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  if (order.status === 'cancelled') {
    throw new Error('Pesanan telah dibatalkan. Tidak dapat menerima pembayaran.');
  }

  if (order.remaining_balance <= 0) {
    throw new Error('Pesanan ini sudah lunas. Tidak ada sisa tagihan.');
  }

  if (input.amount > order.remaining_balance) {
    throw new Error(`Nominal pembayaran (Rp ${input.amount.toLocaleString()}) melebihi sisa tagihan (Rp ${order.remaining_balance.toLocaleString()}).`);
  }

  const now = new Date().toISOString();
  const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const executePayment = db.transaction(() => {
    const newPaidAmount = order.paid_amount + input.amount;
    const newRemainingBalance = order.total_amount - newPaidAmount;
    const newPaymentStatus = newRemainingBalance === 0 ? 'paid' : 'down_payment';

    // Insert payment
    const pType = input.paymentType || (newRemainingBalance === 0 ? 'settlement' : 'down_payment');
    db.prepare(`
      INSERT INTO payments (
        id, order_id, cashier_id, session_id, amount, payment_type, payment_method, idempotency_key, reference_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId, input.orderId, input.cashierId, input.sessionId || null, input.amount,
      pType, input.paymentMethod, input.idempotencyKey || null, input.referenceNote || null, now
    );

    // Update order amounts
    db.prepare(`
      UPDATE orders
      SET paid_amount = ?, remaining_balance = ?, payment_status = ?, updated_at = ?
      WHERE id = ?
    `).run(newPaidAmount, newRemainingBalance, newPaymentStatus, now, input.orderId);

    logAudit({
      userId: input.cashierId,
      username: input.cashierName,
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      details: {
        orderId: input.orderId,
        receiptNumber: order.receipt_number,
        amount: input.amount,
        method: input.paymentMethod,
        remainingBalance: newRemainingBalance
      },
      ipAddress: input.ipAddress
    });

    return {
      paymentId,
      orderId: input.orderId,
      amount: input.amount,
      paidAmount: newPaidAmount,
      remainingBalance: newRemainingBalance,
      paymentStatus: newPaymentStatus
    };
  });

  const result = executePayment();

  broadcast('PAYMENT_RECORDED', {
    orderId: input.orderId,
    receiptNumber: order.receipt_number,
    amount: input.amount,
    cashierName: input.cashierName,
    remainingBalance: result.remainingBalance
  });

  return result;
}

export function processRefund(
  orderId: string,
  refundAmount: number,
  adminUser: { id: string; fullName: string; role: string },
  reason: string,
  ipAddress?: string
) {
  if (adminUser.role !== 'admin') {
    throw new Error('Hanya Administrator yang memiliki otorisasi untuk memproses pengembalian dana (refund).');
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  if (refundAmount <= 0) {
    throw new Error('Nominal refund harus lebih besar dari Rp 0.');
  }

  if (refundAmount > order.paid_amount) {
    throw new Error(`Nominal refund (Rp ${refundAmount.toLocaleString()}) melebihi total yang telah dibayar (Rp ${order.paid_amount.toLocaleString()}).`);
  }

  const now = new Date().toISOString();
  const paymentId = 'ref_' + Date.now();

  const executeRefund = db.transaction(() => {
    const newPaidAmount = order.paid_amount - refundAmount;
    const newRemainingBalance = order.total_amount - newPaidAmount;
    const newPaymentStatus = newPaidAmount === 0 ? 'refunded' : 'down_payment';

    // Insert negative payment or refund record
    db.prepare(`
      INSERT INTO payments (
        id, order_id, cashier_id, session_id, amount, payment_type, payment_method, reference_note, created_at
      ) VALUES (?, ?, ?, ?, ?, 'refund', 'cash', ?, ?)
    `).run(
      paymentId, orderId, adminUser.id, order.session_id || null, -refundAmount,
      `Refund diotorisasi oleh Admin: ${reason}`, now
    );

    db.prepare(`
      UPDATE orders
      SET paid_amount = ?, remaining_balance = ?, payment_status = ?, updated_at = ?
      WHERE id = ?
    `).run(newPaidAmount, newRemainingBalance, newPaymentStatus, now, orderId);

    logAudit({
      userId: adminUser.id,
      username: adminUser.fullName,
      action: 'REFUND_PROCESSED',
      entityType: 'ORDER',
      entityId: orderId,
      details: {
        receiptNumber: order.receipt_number,
        refundAmount,
        reason,
        newPaidAmount
      },
      ipAddress
    });

    return {
      paymentId,
      orderId,
      refundAmount,
      newPaidAmount,
      newRemainingBalance
    };
  });

  const result = executeRefund();

  broadcast('ORDER_UPDATED', {
    orderId,
    receiptNumber: order.receipt_number,
    status: order.status,
    action: 'REFUND'
  });

  return result;
}
