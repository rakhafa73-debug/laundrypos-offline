import { db, DB_PATH } from '../db/database.ts';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { logAudit } from './auditService.ts';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function createBackup(userName: string, userId?: string, ipAddress?: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `laundrypos-backup-${timestamp}.db`;
  const destinationPath = path.join(BACKUP_DIR, filename);

  // Use better-sqlite3's online backup method which creates an atomic, consistent copy
  await db.backup(destinationPath);

  const stats = fs.statSync(destinationPath);
  const fileBuffer = fs.readFileSync(destinationPath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const id = 'bkp_' + Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO backup_metadata (id, filename, size_bytes, created_by, created_at, checksum, status)
    VALUES (?, ?, ?, ?, ?, ?, 'valid')
  `).run(id, filename, stats.size, userName, now, hash);

  logAudit({
    userId: userId || null,
    username: userName,
    action: 'BACKUP_CREATED',
    entityType: 'BACKUP',
    entityId: id,
    details: { filename, sizeBytes: stats.size, checksum: hash },
    ipAddress
  });

  return {
    id,
    filename,
    sizeBytes: stats.size,
    checksum: hash,
    createdAt: now,
    downloadPath: `/api/v1/backups/download/${filename}`
  };
}

export function listBackups() {
  return db.prepare('SELECT * FROM backup_metadata ORDER BY created_at DESC').all();
}

export function verifyDatabaseFile(filePath: string): { isValid: boolean; error?: string; integrity?: string } {
  try {
    const testDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const result = testDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
    testDb.close();

    const isOk = result.length > 0 && result[0].integrity_check === 'ok';
    return {
      isValid: isOk,
      integrity: result[0]?.integrity_check || 'unknown',
      error: isOk ? undefined : 'Pemeriksaan integritas database gagal: ' + JSON.stringify(result)
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: 'File bukan database SQLite yang valid atau rusak: ' + (err.message || String(err))
    };
  }
}

export async function restoreFromBackup(backupFilename: string, adminUser: { id: string; fullName: string; role: string }, ipAddress?: string) {
  if (adminUser.role !== 'admin') {
    throw new Error('Hanya Administrator yang memiliki wewenang untuk merestore database.');
  }

  const backupFilePath = path.join(BACKUP_DIR, backupFilename);
  if (!fs.existsSync(backupFilePath)) {
    throw new Error('File cadangan backup tidak ditemukan di folder penyimpanan server.');
  }

  // 1. Verify integrity of the backup file before doing anything
  const verification = verifyDatabaseFile(backupFilePath);
  if (!verification.isValid) {
    throw new Error(`File backup tidak lulus uji integritas: ${verification.error}`);
  }

  // 2. Create emergency pre-restore snapshot of the current production database
  const emergencySnapshotName = `pre-restore-safety-${Date.now()}.db`;
  const emergencySnapshotPath = path.join(BACKUP_DIR, emergencySnapshotName);
  await db.backup(emergencySnapshotPath);

  // 3. Perform live copy into the active production database
  // Using SQLite's ATTACH or vacuum into or copying tables ensures connected handles remain safe
  const backupDb = new Database(backupFilePath, { readonly: true });
  
  // Verify backup schema compatibility
  const testTable = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").get();
  if (!testTable) {
    backupDb.close();
    throw new Error('File cadangan tidak memiliki skema tabel LaundryPOS yang valid.');
  }
  backupDb.close();

  // Restore via atomic overwrite while closing handles safely or replacing tables
  // We can copy the validated file over DB_PATH and trigger WAL checkpoint
  db.close();
  fs.copyFileSync(backupFilePath, DB_PATH);

  // Clean shm and wal if present
  if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
  if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');

  // Re-open DB
  const restoredDb = new Database(DB_PATH);
  restoredDb.pragma('journal_mode = WAL');
  restoredDb.pragma('foreign_keys = ON');

  // Final post-restore integrity check
  const postCheck = restoredDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
  if (!postCheck || postCheck[0].integrity_check !== 'ok') {
    // If somehow corrupted, revert to safety snapshot
    fs.copyFileSync(emergencySnapshotPath, DB_PATH);
    throw new Error('Integritas database setelah restore gagal. Mengembalikan ke cadangan darurat.');
  }

  logAudit({
    userId: adminUser.id,
    username: adminUser.fullName,
    action: 'RESTORE_DATABASE',
    entityType: 'DATABASE',
    details: {
      restoredFrom: backupFilename,
      safetySnapshot: emergencySnapshotName,
      integrityResult: postCheck[0].integrity_check
    },
    ipAddress
  });

  return {
    success: true,
    message: 'Database berhasil dipulihkan secara utuh.',
    restoredFrom: backupFilename,
    safetySnapshot: emergencySnapshotName
  };
}
