import { Router } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/v1/audit-logs - View audit logs (Admin only)
router.get('/', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { action, limit = '100', offset = '0' } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (action && typeof action === 'string' && action !== 'all') {
    query += ' AND action = ?';
    params.push(action);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const logs = db.prepare(query).all(...params);

  const totalCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };

  res.json({
    success: true,
    logs: logs.map((log: any) => ({
      ...log,
      details: typeof log.details === 'string' ? JSON.parse(log.details || '{}') : log.details
    })),
    total: totalCount.count
  });
});

export default router;
