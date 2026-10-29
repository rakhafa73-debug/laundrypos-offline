import { Router } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// GET /api/v1/expenses - List expenses
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const { limit = '50', offset = '0', category } = req.query;

  let query = `
    SELECT e.*, u.full_name as user_name
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category && typeof category === 'string' && category !== 'all') {
    query += ' AND e.category = ?';
    params.push(category);
  }

  query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const expenses = db.prepare(query).all(...params);
  res.json({ success: true, expenses });
});

// POST /api/v1/expenses - Record expense (Admin & Cashier)
router.post('/', authenticate, requireRole('admin', 'cashier'), (req: AuthenticatedRequest, res) => {
  try {
    const { category, amount, description, sessionId } = req.body;
    if (!category || !amount || !description) {
      return res.status(400).json({ success: false, message: 'Kategori, nominal, dan keterangan pengeluaran wajib diisi.' });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal pengeluaran harus lebih besar dari Rp 0.' });
    }

    const id = 'exp_' + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO expenses (id, user_id, session_id, category, amount, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.id, sessionId || null, category, Number(amount), description.trim(), now);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'EXPENSE_RECORDED',
      entityType: 'EXPENSE',
      entityId: id,
      details: { category, amount: Number(amount), description },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      expense: { id, user_id: req.user!.id, category, amount: Number(amount), description, created_at: now }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal mencatat pengeluaran.' });
  }
});

export default router;
