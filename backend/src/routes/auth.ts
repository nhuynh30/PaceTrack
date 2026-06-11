import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();
const BCRYPT_ROUNDS = 12;

function issueTokens(userId: string, res: Response): string {
  const jwtSecret = process.env['JWT_SECRET']!;
  const refreshSecret = process.env['REFRESH_SECRET']!;

  const accessToken = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: userId }, refreshSecret, { expiresIn: '7d' });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  return accessToken;
}

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };

  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: 'email, password, firstName, and lastName are required' });
    return;
  }

  const existing = await User.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ email, passwordHash, firstName, lastName });

  const accessToken = issueTokens(String(user._id), res);

  res.status(201).json({
    accessToken,
    user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  });
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await User.findByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = issueTokens(String(user._id), res);

  res.json({
    accessToken,
    user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string | undefined>)['refreshToken'];
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  const refreshSecret = process.env['REFRESH_SECRET']!;
  let payload: { sub: string };
  try {
    payload = jwt.verify(token, refreshSecret) as { sub: string };
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const accessToken = issueTokens(String(user._id), res);

  res.json({
    accessToken,
    user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  });
});

// POST /api/v1/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', path: '/' });
  res.status(204).send();
});

export default router;
