import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { connectDatabase } from './backend/config/db.js';
import { seedInitialDataIfEmpty } from './backend/seed/seedData.js';
import authRoutes from './backend/routes/authRoutes.js';
import userRoutes from './backend/routes/userRoutes.js';
import doubtRoutes from './backend/routes/doubtRoutes.js';
import learningRoutes from './backend/routes/learningRoutes.js';
import assessmentRoutes from './backend/routes/assessmentRoutes.js';
import { errorHandler } from './backend/middleware/errorHandler.js';
import { initializeSocketServer } from './backend/socket/socketHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await connectDatabase();
  await seedInitialDataIfEmpty();

  const app = express();
  app.set('trust proxy', 1);
  const httpServer = http.createServer(app);

  // Initialize Socket.IO on the same HTTP server
  initializeSocketServer(httpServer);

  const allowedOrigin = process.env.APP_URL || '*';
  app.use(
    cors({
      origin: allowedOrigin === 'MY_APP_URL' ? '*' : allowedOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/doubts', doubtRoutes);
  app.use('/api/learning', learningRoutes);
  app.use('/api/assessments', assessmentRoutes);

  // Vite middleware in development, static bundle in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[PeerConnect AI] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Startup Error]:', err);
  process.exit(1);
});
