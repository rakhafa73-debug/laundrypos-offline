import { Router } from 'express';
import { db, DB_PATH } from '../db/database.ts';
import fs from 'fs';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { logAudit } from '../services/auditService.ts';
import { seedDemoData } from '../db/seed.ts';

const router = Router();

// GET /api/v1/settings - Get settings & DB diagnostics
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }

  // Database diagnostic information
  let dbSize = 0;
  if (fs.existsSync(DB_PATH)) {
    dbSize = fs.statSync(DB_PATH).size;
  }

  const counts = {
    orders: (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c,
    customers: (db.prepare('SELECT COUNT(*) as c FROM customers').get() as any).c,
    users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
    payments: (db.prepare('SELECT COUNT(*) as c FROM payments').get() as any).c,
    auditLogs: (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as any).c
  };

  const schemaVersion = (db.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as any)?.v || 1;

  res.json({
    success: true,
    settings,
    diagnostics: {
      dbPath: DB_PATH,
      dbSizeBytes: dbSize,
      counts,
      schemaVersion,
      walMode: true
    }
  });
});

// PUT /api/v1/settings - Update settings (Admin only)
router.put('/', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Objek pengaturan tidak valid.' });
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)');

    for (const [key, value] of Object.entries(settings)) {
      updateStmt.run(key, String(value), now);
    }

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      details: settings,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Pengaturan toko berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal memperbarui pengaturan.' });
  }
});

// POST /api/v1/settings/seed-demo - Explicit trigger for demo data
router.post('/seed-demo', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await seedDemoData();
    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'DEMO_DATA_SEEDED',
      entityType: 'DATABASE',
      details: {},
      ipAddress: req.ip
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Gagal membuat data demo.' });
  }
});

export default router;
