import { Router } from 'express';
import { checkFirstTimeSetupNeeded, registerFirstAdmin, loginUser, logoutUser, verifySession } from '../services/authService.ts';
import { authenticate, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

router.get('/setup-status', (req, res) => {
  const needsSetup = checkFirstTimeSetupNeeded();
  res.json({ success: true, needsSetup });
});

router.post('/setup-admin', (req, res) => {
  try {
    const { username, password, fullName } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Nama lengkap, username, dan password wajib diisi.' });
    }

    const admin = registerFirstAdmin({
      username,
      password,
      fullName,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Admin pertama berhasil dibuat. Silakan login.', admin });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal mendaftarkan admin pertama.' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const result = loginUser(username, password, req.ip);
    
    // Set cookie as well for convenience
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 3600 * 1000
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message || 'Login gagal.' });
  }
});

router.post('/logout', authenticate, (req: AuthenticatedRequest, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
  if (token) {
    logoutUser(token);
  }
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logout berhasil.' });
});

router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  res.json({ success: true, user: req.user });
});

export default router;
