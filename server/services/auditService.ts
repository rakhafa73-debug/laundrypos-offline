import { db } from '../db/database.ts';

export interface AuditLogEntry {
  userId?: string | null;
  username: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details: Record<string, any>;
  ipAddress?: string;
}

export function logAudit(entry: AuditLogEntry) {
  try {
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.userId || null,
      entry.username,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      JSON.stringify(entry.details),
      entry.ipAddress || '127.0.0.1',
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
