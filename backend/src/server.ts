import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config/index.js';
import { setupSocketIO } from './sockets/socket.handler.js';
import authRoutes from './routes/auth.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { getRecentLogs, clearLogs, onLogEntry } from './utils/logger.js';
import { logger } from './utils/logger.js';

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO with authenticated channels
const io = setupSocketIO(httpServer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'meta-leads-poc-backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/webhooks', webhookRoutes);

// System Logs and Diagnostics API for UI inspector
app.get('/api/debug/logs', (req, res) => {
  res.json({ logs: getRecentLogs() });
});

app.post('/api/debug/logs/clear', (req, res) => {
  clearLogs();
  res.json({ success: true, message: 'Logs cleared' });
});

// Stream logs over SSE if needed
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

// Start Server
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(config.port, '0.0.0.0', () => {
    logger.system('success', `===================================================`);
    logger.system('success', `Meta Leads Backend Server running on port ${config.port}`);
    logger.system('success', `Webhook URL: http://localhost:${config.port}/api/webhooks/meta`);
    logger.system('success', `Socket.IO:   ws://localhost:${config.port}`);
    logger.system('success', `===================================================`);
  });
}

export { app, httpServer, io };
