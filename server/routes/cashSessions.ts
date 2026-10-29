import { Router } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { getActiveSession, openCashSession, closeCashSession } from '../services/cashSessionService.ts';

const router = Router();

// GET /api/v1/cash-sessions/active - Get current active cash session for user
router.get('/active', authenticate, (req: AuthenticatedRequest, res) => {
  const session = getActiveSession(req.user!.id);
  if (!session) {
    return res.json({ success: true, session: null });
  }

  // Calculate live numbers
  const paymentsResult = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_cash_in
    FROM payments
    WHERE session_id = ? AND payment_method = 'cash'
  `).get(session.id) as { total_cash_in: number };

  const expensesResult = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_cash_out
    FROM expenses
    WHERE session_id = ?
  `).get(session.id) as { total_cash_out: number };

  const cashIn = paymentsResult.total_cash_in;
  const cashOut = expensesResult.total_cash_out;
  const liveExpectedCash = session.opening_cash + cashIn - cashOut;

  res.json({
    success: true,
    session: {
      ...session,
      cash_in: cashIn,
      cash_out: cashOut,
      expected_cash: liveExpectedCash
    }
  });
});

// POST /api/v1/cash-sessions/open - Open shift
router.post('/open', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const { openingCash, notes } = req.body;
    const session = openCashSession(
      req.user!.id,
      req.user!.fullName,
      Number(openingCash || 0),
      notes,
      req.ip
    );

    res.status(201).json({ success: true, session });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal membuka sesi kasir.' });
  }
});

// POST /api/v1/cash-sessions/close - Close shift
router.post('/close', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId, actualCash, notes } = req.body;
    if (!sessionId || actualCash === undefined) {
      return res.status(400).json({ success: false, message: 'Session ID dan uang kas aktual wajib diisi.' });
    }

    const result = closeCashSession(
      sessionId,
      req.user!.id,
      req.user!.fullName,
      Number(actualCash),
      notes,
      req.ip
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal menutup sesi kasir.' });
  }
});

// GET /api/v1/cash-sessions/history - List past sessions (Admin & Cashier)
router.get('/history', authenticate, (req: AuthenticatedRequest, res) => {
  const query = `
    SELECT cs.*, u.full_name as cashier_name
    FROM cash_sessions cs
    JOIN users u ON cs.cashier_id = u.id
    ORDER BY cs.opened_at DESC LIMIT 30
  `;
  const sessions = db.prepare(query).all();
  res.json({ success: true, sessions });
});

export default router;
