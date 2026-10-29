import { db } from '../db/database.ts';
import { logAudit } from './auditService.ts';

export function getActiveSession(cashierId: string) {
  return db.prepare(`
    SELECT * FROM cash_sessions 
    WHERE cashier_id = ? AND status = 'open' 
    ORDER BY opened_at DESC LIMIT 1
  `).get(cashierId) as any;
}

export function openCashSession(cashierId: string, cashierName: string, openingCash: number, notes?: string, ipAddress?: string) {
  const existing = getActiveSession(cashierId);
  if (existing) {
    throw new Error('Anda masih memiliki sesi kasir yang sedang berjalan. Tutup sesi sebelumnya sebelum membuka sesi baru.');
  }

  if (openingCash < 0) {
    throw new Error('Modal awal kasir tidak boleh bernilai negatif.');
  }

  const id = 'cs_' + Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO cash_sessions (id, cashier_id, opened_at, opening_cash, status, notes)
    VALUES (?, ?, ?, ?, 'open', ?)
  `).run(id, cashierId, now, openingCash, notes || null);

  logAudit({
    userId: cashierId,
    username: cashierName,
    action: 'CASH_SESSION_OPENED',
    entityType: 'CASH_SESSION',
    entityId: id,
    details: { openingCash, notes },
    ipAddress
  });

  return { id, cashierId, openingCash, openedAt: now, status: 'open' };
}

export function closeCashSession(sessionId: string, cashierId: string, cashierName: string, actualCash: number, notes?: string, ipAddress?: string) {
  const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId) as any;
  if (!session || session.status !== 'open') {
    throw new Error('Sesi kasir tidak valid atau sudah ditutup sebelumnya.');
  }

  // Calculate total cash payments received during this session
  const paymentsResult = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_cash_in
    FROM payments
    WHERE session_id = ? AND payment_method = 'cash'
  `).get(sessionId) as { total_cash_in: number };

  // Calculate total cash expenses disbursed during this session
  const expensesResult = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_cash_out
    FROM expenses
    WHERE session_id = ?
  `).get(sessionId) as { total_cash_out: number };

  const cashIn = paymentsResult.total_cash_in;
  const cashOut = expensesResult.total_cash_out;
  const expectedCash = session.opening_cash + cashIn - cashOut;
  const difference = actualCash - expectedCash;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cash_sessions
    SET closed_at = ?, expected_cash = ?, actual_cash = ?, difference = ?, notes = ?, status = 'closed'
    WHERE id = ?
  `).run(now, expectedCash, actualCash, difference, notes || null, sessionId);

  logAudit({
    userId: cashierId,
    username: cashierName,
    action: 'CASH_SESSION_CLOSED',
    entityType: 'CASH_SESSION',
    entityId: sessionId,
    details: {
      openingCash: session.opening_cash,
      cashIn,
      cashOut,
      expectedCash,
      actualCash,
      difference,
      notes
    },
    ipAddress
  });

  return {
    sessionId,
    openingCash: session.opening_cash,
    cashIn,
    cashOut,
    expectedCash,
    actualCash,
    difference,
    closedAt: now,
    status: 'closed'
  };
}
