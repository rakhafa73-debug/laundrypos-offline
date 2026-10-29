import type { Request, Response, NextFunction } from 'express';
import { verifySession } from '../services/authService.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: 'admin' | 'cashier' | 'operator';
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check Authorization header or query param or cookie
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.'
    });
  }

  const user = verifySession(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'SESSION_EXPIRED',
      message: 'Sesi Anda telah kedaluwarsa. Silakan login ulang.'
    });
  }

  req.user = user as any;
  next();
}

export function requireRole(...allowedRoles: Array<'admin' | 'cashier' | 'operator'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Akses ditolak. Pengguna belum terotentikasi.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Hak akses ditolak. Peran '${req.user.role}' tidak memiliki izin untuk fitur ini.`
      });
    }

    next();
  };
}
