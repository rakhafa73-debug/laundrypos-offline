import { Router } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// GET /api/v1/services - List services
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
  const query = includeInactive 
    ? 'SELECT * FROM services ORDER BY is_active DESC, name ASC'
    : 'SELECT * FROM services WHERE is_active = 1 ORDER BY name ASC';

  const services = db.prepare(query).all();
  res.json({ success: true, services });
});

// POST /api/v1/services - Create service (Admin only)
router.post('/', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { name, unit = 'kg', pricePerUnit, minUnits = 1000, estimatedDurationHours = 48, description } = req.body;
    if (!name || !pricePerUnit) {
      return res.status(400).json({ success: false, message: 'Nama layanan dan tarif wajib diisi.' });
    }

    const id = 'srv_' + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO services (id, name, unit, price_per_unit, min_units, estimated_duration_hours, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, name.trim(), unit, Number(pricePerUnit), Number(minUnits), Number(estimatedDurationHours), description || null, now, now);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'SERVICE_CREATED',
      entityType: 'SERVICE',
      entityId: id,
      details: { name, pricePerUnit, unit },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, service: { id, name, unit, price_per_unit: pricePerUnit } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal menambahkan layanan.' });
  }
});

// PUT /api/v1/services/:id - Update service (Admin only)
router.put('/:id', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { name, unit, pricePerUnit, minUnits, estimatedDurationHours, description } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE services
      SET name = ?, unit = ?, price_per_unit = ?, min_units = ?, estimated_duration_hours = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(name.trim(), unit || 'kg', Number(pricePerUnit), Number(minUnits || 1000), Number(estimatedDurationHours || 48), description || null, now, req.params.id);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'SERVICE_UPDATED',
      entityType: 'SERVICE',
      entityId: req.params.id,
      details: { name, pricePerUnit },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Layanan berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal memperbarui layanan.' });
  }
});

// PATCH /api/v1/services/:id/toggle - Toggle service status (Admin only)
router.patch('/:id/toggle', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const service = db.prepare('SELECT is_active, name FROM services WHERE id = ?').get(req.params.id) as any;
    if (!service) {
      return res.status(404).json({ success: false, message: 'Layanan tidak ditemukan.' });
    }

    const newStatus = service.is_active === 1 ? 0 : 1;
    const now = new Date().toISOString();
    db.prepare('UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, now, req.params.id);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: newStatus === 1 ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED',
      entityType: 'SERVICE',
      entityId: req.params.id,
      details: { name: service.name, is_active: newStatus },
      ipAddress: req.ip
    });

    res.json({ success: true, is_active: newStatus });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal mengubah status layanan.' });
  }
});

export default router;
