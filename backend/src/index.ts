import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db';
import healthRouter from './routes/health';
import rootRouter from './routes/root';
import { notFound, errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env['PORT'] ?? 8000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', rootRouter);
app.use('/api/v1', healthRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 PaceTrack API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
  });
}

start();

export default app;