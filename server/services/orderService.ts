import { db } from '../db/database.ts';
import { logAudit } from './auditService.ts';
import { broadcast } from '../websocket.ts';

export interface CreateOrderInput {
  customerId: string;
  cashierId: string;
  cashierName: string;
  serviceId: string;
  weightGrams: number;
  discountAmount?: number;
  additionalFee?: number;
  fragrance?: string;
  notes?: string;
  downPaymentAmount?: number;
  downPaymentMethod?: 'cash' | 'transfer' | 'qris';
  idempotencyKey?: string;
  sessionId?: string;
  ipAddress?: string;
}

export function generateNextReceiptNumber(datePrefix?: string): string {
  const prefix = datePrefix || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefixConfig = db.prepare("SELECT value FROM app_settings WHERE key = 'receipt_prefix'").get() as { value: string } | undefined;
  const storePrefix = prefixConfig?.value || 'LP';

  // Atomic sequence generator in SQLite
  const stmt = db.prepare(`
    INSERT INTO receipt_sequences (date_prefix, current_number)
    VALUES (?, 1)
    ON CONFLICT(date_prefix) DO UPDATE SET current_number = current_number + 1
    RETURNING current_number
  `);

  const result = stmt.get(prefix) as { current_number: number };
  const sequenceStr = String(result.current_number).padStart(3, '0');
  return `${storePrefix}-${prefix}-${sequenceStr}`;
}

export function createOrderAtomic(input: CreateOrderInput) {
  // 1. Validate inputs
  if (!input.customerId || !input.serviceId || !input.cashierId) {
    throw new Error('Customer ID, Service ID, dan Kasir ID wajib diisi.');
  }

  if (!input.weightGrams || input.weightGrams <= 0) {
    throw new Error('Berat pakaian harus lebih besar dari 0 gram.');
  }

  // Check customer existence
  const customer = db.prepare('SELECT id, name, phone FROM customers WHERE id = ?').get(input.customerId) as any;
  if (!customer) {
    throw new Error('Pelanggan tidak ditemukan.');
  }

  // Check service existence
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(input.serviceId) as any;
  if (!service) {
    throw new Error('Layanan tidak ditemukan atau sudah dinonaktifkan.');
  }

  // Pricing calculations
  const pricePerKg = service.price_per_unit; // in IDR
  const minGrams = service.min_units || 1000;
  const billableGrams = Math.max(input.weightGrams, minGrams);
  const subtotal = Math.round((billableGrams / 1000) * pricePerKg);

  const discount = Math.max(0, input.discountAmount || 0);
  if (discount > subtotal) {
    throw new Error(`Diskon (Rp ${discount.toLocaleString()}) tidak boleh melebihi subtotal (Rp ${subtotal.toLocaleString()}).`);
  }

  const additionalFee = Math.max(0, input.additionalFee || 0);
  const totalAmount = subtotal - discount + additionalFee;

  if (totalAmount < 0) {
    throw new Error('Total tagihan pesanan tidak boleh bernilai negatif.');
  }

  const downPayment = Math.max(0, input.downPaymentAmount || 0);
  if (downPayment > totalAmount) {
    throw new Error(`Uang muka / DP (Rp ${downPayment.toLocaleString()}) tidak boleh melebihi total pesanan (Rp ${totalAmount.toLocaleString()}).`);
  }

  const remainingBalance = totalAmount - downPayment;
  let paymentStatus: 'unpaid' | 'down_payment' | 'paid' = 'unpaid';
  if (downPayment >= totalAmount && totalAmount > 0) {
    paymentStatus = 'paid';
  } else if (downPayment > 0) {
    paymentStatus = 'down_payment';
  }

  // Calculate estimated completion time
  const now = new Date();
  const estimatedCompletion = new Date(now.getTime() + (service.estimated_duration_hours || 48) * 3600 * 1000);

  // Execute atomic SQLite transaction
  const executeTransaction = db.transaction(() => {
    // Generate atomic receipt number
    const receiptNumber = generateNextReceiptNumber();
    const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const dateStr = now.toISOString();

    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        id, receipt_number, customer_id, cashier_id, service_id, session_id,
        weight_grams, service_name_snapshot, price_per_kg_snapshot, min_units_snapshot,
        subtotal, discount_amount, additional_fee, total_amount, paid_amount,
        remaining_balance, payment_status, status, fragrance, notes,
        estimated_completion_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, 'received', ?, ?,
        ?, ?, ?
      )
    `);

    insertOrderStmt.run(
      orderId, receiptNumber, input.customerId, input.cashierId, input.serviceId, input.sessionId || null,
      input.weightGrams, service.name, pricePerKg, minGrams,
      subtotal, discount, additionalFee, totalAmount, downPayment,
      remainingBalance, paymentStatus, input.fragrance || 'Standard', input.notes || '',
      estimatedCompletion.toISOString(), dateStr, dateStr
    );

    // Initial status history entry
    const historyId = 'osh_' + Date.now();
    db.prepare(`
      INSERT INTO order_status_history (id, order_id, user_id, user_name_snapshot, previous_status, new_status, notes, created_at)
      VALUES (?, ?, ?, ?, NULL, 'received', 'Pesanan masuk di kasir', ?)
    `).run(historyId, orderId, input.cashierId, input.cashierName, dateStr);

    // If down payment made, insert payment record atomically
    if (downPayment > 0) {
      const paymentId = 'pay_' + Date.now();
      const pType = downPayment >= totalAmount ? 'full_payment' : 'down_payment';
      db.prepare(`
        INSERT INTO payments (
          id, order_id, cashier_id, session_id, amount, payment_type, payment_method, idempotency_key, reference_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId, orderId, input.cashierId, input.sessionId || null, downPayment,
        pType, input.downPaymentMethod || 'cash', input.idempotencyKey || null,
        pType === 'full_payment' ? 'Pembayaran lunas saat pembuatan nota' : 'Uang muka (DP) saat pembuatan nota',
        dateStr
      );
    }

    // Audit log
    logAudit({
      userId: input.cashierId,
      username: input.cashierName,
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: orderId,
      details: {
        receiptNumber,
        customerName: customer.name,
        totalAmount,
        paidAmount: downPayment,
        weightGrams: input.weightGrams
      },
      ipAddress: input.ipAddress
    });

    return {
      orderId,
      receiptNumber,
      totalAmount,
      paidAmount: downPayment,
      remainingBalance,
      status: 'received',
      paymentStatus
    };
  });

  const result = executeTransaction();

  // Broadcast real-time update to LAN terminals
  broadcast('ORDER_CREATED', {
    orderId: result.orderId,
    receiptNumber: result.receiptNumber,
    customerName: customer.name,
    status: 'received',
    totalAmount: result.totalAmount
  });

  return result;
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  received: ['washing', 'cancelled'],
  washing: ['drying', 'cancelled'],
  drying: ['ironing', 'packing', 'cancelled'],
  ironing: ['packing', 'cancelled'],
  packing: ['ready', 'cancelled'],
  ready: ['picked_up', 'cancelled'],
  picked_up: [], // terminal state
  cancelled: [] // terminal state
};

export function updateOrderStatus(
  orderId: string,
  newStatus: string,
  user: { id: string; fullName: string; role: string },
  notes?: string,
  pickedUpBy?: string,
  ipAddress?: string
) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  const allowedNext = VALID_STATUS_TRANSITIONS[order.status] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`Transisi status dari '${order.status}' ke '${newStatus}' tidak diperbolehkan secara alur kerja.`);
  }

  // Operator role check: operators can only change workflow statuses, not finalize picked_up without cashier
  if (user.role === 'operator' && newStatus === 'picked_up') {
    throw new Error('Hanya Kasir atau Admin yang berhak memproses serah terima pengambilan pakaian.');
  }

  // Pickup policy check
  if (newStatus === 'picked_up') {
    const policy = db.prepare("SELECT value FROM app_settings WHERE key = 'require_full_payment_on_pickup'").get() as { value: string } | undefined;
    const requireFull = policy?.value !== 'false';

    if (requireFull && order.remaining_balance > 0) {
      throw new Error(`Pesanan belum lunas (sisa tagihan Rp ${order.remaining_balance.toLocaleString()}). Harap lakukan pelunasan di kasir sebelum serah terima.`);
    }
  }

  const now = new Date().toISOString();

  const executeStatusChange = db.transaction(() => {
    let readyAt = order.ready_at;
    let pickedUpAt = order.picked_up_at;
    let recipient = order.picked_up_by;

    if (newStatus === 'ready' && !readyAt) {
      readyAt = now;
    }
    if (newStatus === 'picked_up') {
      pickedUpAt = now;
      recipient = pickedUpBy || 'Pelanggan langsung';
    }

    db.prepare(`
      UPDATE orders
      SET status = ?, ready_at = ?, picked_up_at = ?, picked_up_by = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, readyAt, pickedUpAt, recipient, now, orderId);

    const historyId = 'osh_' + Date.now();
    db.prepare(`
      INSERT INTO order_status_history (id, order_id, user_id, user_name_snapshot, previous_status, new_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(historyId, orderId, user.id, user.fullName, order.status, newStatus, notes || null, now);

    logAudit({
      userId: user.id,
      username: user.fullName,
      action: 'STATUS_CHANGE',
      entityType: 'ORDER',
      entityId: orderId,
      details: {
        receiptNumber: order.receipt_number,
        from: order.status,
        to: newStatus,
        notes
      },
      ipAddress
    });
  });

  executeStatusChange();

  broadcast('ORDER_STATUS_CHANGED', {
    orderId,
    receiptNumber: order.receipt_number,
    previousStatus: order.status,
    newStatus,
    updatedBy: user.fullName,
    timestamp: now
  });

  return { success: true, orderId, newStatus };
}
