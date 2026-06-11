import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { connectDB } from './db';
import healthRouter from './routes/health';
import rootRouter from './routes/root';
import authRouter from './routes/auth';
import runsRouter from './routes/runs';
import elevationRouter from './routes/elevation';
import uploadRouter from './routes/upload';
import clubsRouter from './routes/clubs';
import statsRouter from './routes/stats';
import { notFound, errorHandler } from './middleware/errorHandler';
import { setIo } from './socket';
import { Club } from './models/Club';
import { AuthPayload } from './middleware/auth';

const app = express();
const PORT = process.env['PORT'] ?? 8000;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://192.168.1.102:5173',
  ...(process.env['ALLOWED_ORIGINS'] ? process.env['ALLOWED_ORIGINS'].split(',') : []),
];

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please slow down.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json());
app.use(express.text({ type: ['text/xml', 'application/gpx+xml'] })); // ← add this
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', rootRouter);
app.use('/api/v1', healthRouter);
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/runs', apiLimiter, runsRouter);
app.use('/api/v1/elevation', apiLimiter, elevationRouter);
app.use('/api/v1/upload', uploadLimiter, uploadRouter);
app.use('/api/v1/clubs', apiLimiter, clubsRouter);
app.use('/api/v1/stats', apiLimiter, statsRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  setIo(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    const secret = process.env['JWT_SECRET'];
    if (!token || !secret) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = jwt.verify(token, secret) as AuthPayload;
      socket.data['userId'] = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data['userId'] as string;
    const clubs = await Club.find({ memberIds: userId }).select('_id').lean();
    for (const club of clubs) {
      socket.join(String(club._id));
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 PaceTrack API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
  });
}

start();

export default app;