import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.js';
import { startWhatsAppReminderScheduler } from './server/whatsappReminder.js';

import authRoutes from './server/routes/authRoutes.js';
import serviceRoutes from './server/routes/serviceRoutes.js';
import scheduleRoutes from './server/routes/scheduleRoutes.js';
import quotationRoutes from './server/routes/quotationRoutes.js';
import customerRoutes from './server/routes/customerRoutes.js';
import productRoutes from './server/routes/productRoutes.js';
import tadaRoutes from './server/routes/tadaRoutes.js';
import followupRoutes from './server/routes/followupRoutes.js';
import reportRoutes from './server/routes/reportRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import settingRoutes from './server/routes/settingRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize database tables & seed initial data
initDatabase();

// Start background scheduled workers
startWhatsAppReminderScheduler();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tada', tadaRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'IT Lab Solutions Limited - Operations Web Panel',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
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
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IT Lab Solutions] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
