import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { createBackup, listBackups, restoreFromBackup } from '../services/backupService.ts';

const router = Router();
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

// GET /api/v1/backups - List all backups
router.get('/', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const backups = listBackups();
  res.json({ success: true, backups });
});

// POST /api/v1/backups/create - Create backup
router.post('/create', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const backup = await createBackup(req.user!.fullName, req.user!.id, req.ip);
    res.status(201).json({ success: true, message: 'Cadangan database berhasil dibuat.', backup });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Gagal membuat cadangan database.' });
  }
});

// POST /api/v1/backups/restore - Restore backup
router.post('/restore', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, message: 'Nama file backup wajib disertakan.' });
    }

    const result = await restoreFromBackup(filename, req.user!, req.ip);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal memulihkan database.' });
  }
});

// GET /api/v1/backups/download/:filename - Download backup file
router.get('/download/:filename', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(BACKUP_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File backup tidak ditemukan.' });
  }

  res.download(filePath, safeFilename);
});

export default router;
