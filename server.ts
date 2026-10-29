import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db/database.ts';
import { initWebSocketServer } from './server/websocket.ts';

// Route imports
import authRoutes from './server/routes/auth.ts';
import ordersRoutes from './server/routes/orders.ts';
import paymentsRoutes from './server/routes/payments.ts';
import customersRoutes from './server/routes/customers.ts';
import servicesRoutes from './server/routes/services.ts';
import cashSessionsRoutes from './server/routes/cashSessions.ts';
import expensesRoutes from './server/routes/expenses.ts';
import reportsRoutes from './server/routes/reports.ts';
import usersRoutes from './server/routes/users.ts';
import backupRoutes from './server/routes/backup.ts';
import auditRoutes from './server/routes/audit.ts';
import settingsRoutes from './server/routes/settings.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize SQLite database
initDatabase();

// Initialize WebSocket server for real-time LAN communication
initWebSocketServer(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Local LAN CORS & Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Server Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'LaundryPOS Offline',
    mode: isProduction ? 'production' : 'development',
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/cash-sessions', cashSessionsRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/backups', backupRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/settings', settingsRoutes);

// Static frontend serving or Vite middleware
async function setupFrontend() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupFrontend().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LaundryPOS Offline Server running on http://0.0.0.0:${PORT}`);
  });
});

export { app, server };
