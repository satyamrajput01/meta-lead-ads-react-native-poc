import express from 'express';
import http from 'http';
import cors from 'cors';
import { setupSocketIO, getActiveConnectionsInfo } from './backend/src/sockets/socket.handler.js';
import authRoutes from './backend/src/routes/auth.routes.js';
import leadsRoutes from './backend/src/routes/leads.routes.js';
import webhookRoutes from './backend/src/routes/webhook.routes.js';
import { getRecentLogs, clearLogs, onLogEntry } from './backend/src/utils/logger.js';
import { logger } from './backend/src/utils/logger.js';
import { config } from './backend/src/config/index.js';
import { db } from './backend/src/database/db.js';

const app = express();
const httpServer = http.createServer(app);

// Mount Socket.IO
const io = setupSocketIO(httpServer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Backend API Routes
const getRouter = (mod: any) => (mod && mod.default ? mod.default : mod);
app.use('/api/auth', getRouter(authRoutes));
app.use('/api/leads', getRouter(leadsRoutes));
app.use('/api/webhooks', getRouter(webhookRoutes));

// System health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'meta-leads-poc-fullstack',
    timestamp: new Date().toISOString(),
  });
});

// Server status and live metrics for dashboard
app.get('/api/status', async (req, res) => {
  try {
    const leads = await db.getAllLeads();
    const users = await db.getAllUsers();
    const activeConnections = getActiveConnectionsInfo();

    res.json({
      success: true,
      meta: {
        verifyToken: config.meta.verifyToken,
        webhookPath: '/api/webhooks/meta',
        hasAccessToken: !!config.meta.accessToken && config.meta.accessToken !== 'EAA...',
        pageId: config.meta.pageId,
      },
      stats: {
        totalLeads: leads.length,
        totalUsers: users.length,
        activeSocketConnections: activeConnections.length,
      },
      activeConnections,
      recentLeads: leads.slice(0, 10),
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logs and diagnostics
app.get('/api/debug/logs', (req, res) => {
  res.json({ logs: getRecentLogs() });
});

app.post('/api/debug/logs/clear', (req, res) => {
  clearLogs();
  res.json({ success: true });
});

// Live server-sent events for console/pipeline inspector
app.get('/api/debug/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const unsubscribe = onLogEntry((entry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// Fallback for unmatched API routes so they return JSON 404 and NEVER return HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Mount Vite in dev mode or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.system('success', `Unified Meta Leads Server running on port ${PORT}`);
    logger.system('success', `Webhook Endpoint: http://localhost:${PORT}/api/webhooks/meta`);
    logger.system('success', `Socket.IO Active on ws://localhost:${PORT}`);
  });
}

startServer();

export { app, httpServer, io };
