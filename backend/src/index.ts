import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './db';
import healthRouter from './routes/health';
import rootRouter from './routes/root';
import authRouter from './routes/auth';
import runsRouter from './routes/runs';
import elevationRouter from './routes/elevation';
import uploadRouter from './routes/upload';
import { notFound, errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env['PORT'] ?? 8000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.1.100:5173',
    'https://angular-improve-armrest.ngrok-free.dev',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', rootRouter);
app.use('/api/v1', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/runs', runsRouter);
app.use('/api/v1/elevation', elevationRouter);
app.use('/api/v1/upload', uploadRouter);

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