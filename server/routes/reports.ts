import { Router } from 'express';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { getDashboardMetrics, getDetailedReport } from '../services/reportService.ts';

const router = Router();

// GET /api/v1/reports/dashboard - Fast dashboard metrics
router.get('/dashboard', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const metrics = getDashboardMetrics();
    res.json({
      success: true,
      metrics,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Gagal memuat metrik dashboard.' });
  }
});

// GET /api/v1/reports/detailed - Admin report analytics
router.get('/detailed', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = getDetailedReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );

    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Gagal menyusun laporan.' });
  }
});

export default router;
