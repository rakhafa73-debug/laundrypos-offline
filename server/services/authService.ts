import { db, ensureDefaultStaffAccounts } from '../db/database.ts';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logAudit } from './auditService.ts';

// In-memory session store & login attempt tracking for offline LAN operation
const activeSessions = new Map<string, { userId: string; role: string; expiresAt: number }>();
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

export function checkFirstTimeSetupNeeded(): boolean {
  const admin = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1").get() as { count: number };
  return admin.count === 0;
}

export function registerFirstAdmin(data: { username: string; password: string; fullName: string; ipAddress?: string }) {
  if (!checkFirstTimeSetupNeeded()) {
    throw new Error('Admin pertama sudah pernah disetup. Gunakan akun yang ada.');
  }

  if (data.username.length < 3 || data.password.length < 6) {
    throw new Error('Username minimal 3 karakter dan password minimal 6 karakter.');
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(data.password, salt);
  const id = 'usr_' + Date.now();
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'admin', 1, ?, ?)
  `);

  insert.run(id, data.username.toLowerCase().trim(), passwordHash, data.fullName.trim(), now, now);

  logAudit({
    userId: id,
    username: data.username,
    action: 'SETUP_FIRST_ADMIN',
    entityType: 'USER',
    entityId: id,
    details: { fullName: data.fullName },
    ipAddress: data.ipAddress
  });

  return { id, username: data.username, fullName: data.fullName, role: 'admin' };
}

export function loginUser(username: string, password: string, ipAddress?: string) {
  const normUser = username.toLowerCase().trim();
  const attemptKey = `${ipAddress || 'local'}:${normUser}`;
  const now = Date.now();

  // Check brute force rate limiting
  const attempt = loginAttempts.get(attemptKey);
  if (attempt && attempt.lockedUntil > now) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - now) / 60000);
    throw new Error(`Terlalu banyak percobaan gagal. Akun/IP terkunci sementara selama ${minutesLeft} menit.`);
  }

  // Support common aliases
  let lookupUser = normUser;
  if (normUser === 'kasir') lookupUser = 'kasir1';
  if (normUser === 'operator') lookupUser = 'operator1';

  let user = db.prepare('SELECT * FROM users WHERE username = ? OR username = ?').get(normUser, lookupUser) as any;

  // If user not found, try ensuring default staff accounts in case DB was freshly initialized
  if (!user && (normUser.startsWith('kasir') || normUser.startsWith('operator'))) {
    ensureDefaultStaffAccounts();
    user = db.prepare('SELECT * FROM users WHERE username = ? OR username = ?').get(normUser, lookupUser) as any;
  }

  if (!user || user.is_active !== 1) {
    // Record failure
    const count = (attempt ? attempt.count : 0) + 1;
    const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
    loginAttempts.set(attemptKey, { count, lockedUntil });

    logAudit({
      username: normUser,
      action: 'LOGIN_FAILED',
      entityType: 'AUTH',
      details: { reason: !user ? 'User not found' : 'User deactivated', attempts: count },
      ipAddress
    });

    throw new Error('Username atau password salah, atau akun telah dinonaktifkan.');
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    const count = (attempt ? attempt.count : 0) + 1;
    const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
    loginAttempts.set(attemptKey, { count, lockedUntil });

    logAudit({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_FAILED_PASSWORD',
      entityType: 'AUTH',
      details: { attempts: count },
      ipAddress
    });

    throw new Error('Username atau password salah.');
  }

  // Reset failed attempts upon successful login
  loginAttempts.delete(attemptKey);

  // Generate secure session token
  const token = 'tok_' + crypto.randomBytes(32).toString('hex');
  const expiresAt = now + SESSION_TTL_MS;
  activeSessions.set(token, {
    userId: user.id,
    role: user.role,
    expiresAt
  });

  // Update last login
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  logAudit({
    userId: user.id,
    username: user.username,
    action: 'LOGIN_SUCCESS',
    entityType: 'AUTH',
    entityId: user.id,
    details: { role: user.role },
    ipAddress
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role
    }
  };
}

export function verifySession(token: string) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  const user = db.prepare('SELECT id, username, full_name, role, is_active FROM users WHERE id = ?').get(session.userId) as any;
  if (!user || user.is_active !== 1) {
    activeSessions.delete(token);
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role
  };
}

export function logoutUser(token: string) {
  activeSessions.delete(token);
}
