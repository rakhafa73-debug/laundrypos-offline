import { Router } from 'express';
import { db } from '../db/database.ts';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// GET /api/v1/users - List users (Admin only)
router.get('/', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const users = db.prepare(`
    SELECT id, username, full_name, role, is_active, last_login_at, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json({ success: true, users });
});

// POST /api/v1/users - Create staff account (Admin only)
router.post('/', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ success: false, message: 'Username, password, nama lengkap, dan role wajib diisi.' });
    }

    if (!['admin', 'cashier', 'operator'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid. Pilih admin, cashier, atau operator.' });
    }

    // Check unique username
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh akun lain.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const id = 'usr_' + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, username.toLowerCase().trim(), passwordHash, fullName.trim(), role, now, now);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: id,
      details: { username, fullName, role },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      user: { id, username: username.toLowerCase().trim(), full_name: fullName.trim(), role, is_active: 1, created_at: now }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal membuat pengguna baru.' });
  }
});

// PATCH /api/v1/users/:id/toggle-active - Activate/Deactivate user (Admin only)
router.patch('/:id/toggle-active', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ success: false, message: 'Anda tidak dapat menonaktifkan akun sendiri.' });
    }

    const targetUser = db.prepare('SELECT id, username, is_active, role FROM users WHERE id = ?').get(req.params.id) as any;
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    const newActive = targetUser.is_active === 1 ? 0 : 1;
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(newActive, now, req.params.id);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: newActive === 1 ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: req.params.id,
      details: { username: targetUser.username, is_active: newActive },
      ipAddress: req.ip
    });

    res.json({ success: true, is_active: newActive });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal mengubah status pengguna.' });
  }
});

// PATCH /api/v1/users/:id/reset-password - Admin reset password
router.patch('/:id/reset-password', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, req.params.id);

    logAudit({
      userId: req.user!.id,
      username: req.user!.fullName,
      action: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: req.params.id,
      details: { resetBy: req.user!.fullName },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Password pengguna berhasil direset.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal mereset password.' });
  }
});

export default router;
