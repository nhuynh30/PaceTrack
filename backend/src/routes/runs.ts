import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Run, RunType } from '../models/Run';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function ownerId(req: Request): string {
  return req.user!.sub;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// POST /api/v1/runs
router.post('/', async (req: Request, res: Response) => {
  const { date, title, notes, distanceKm, durationSec, type } = req.body as {
    date?: string;
    title?: string;
    notes?: string;
    distanceKm?: number;
    durationSec?: number;
    type?: RunType;
  };

  if (!date || !title || distanceKm === undefined || durationSec === undefined || !type) {
    res.status(400).json({ error: 'date, title, distanceKm, durationSec, and type are required' });
    return;
  }

  const run = await Run.create({
    userId: ownerId(req),
    date: new Date(date),
    title,
    notes,
    distanceKm,
    durationSec,
    type,
  });

  res.status(201).json(run);
});

// GET /api/v1/runs
router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));
  const skip = (page - 1) * limit;

  const filter = { userId: ownerId(req) };
  const [runs, total] = await Promise.all([
    Run.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Run.countDocuments(filter),
  ]);

  res.json({
    data: runs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/v1/runs/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid run id' });
    return;
  }

  const run = await Run.findById(id);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  if (String(run.userId) !== ownerId(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json(run);
});

// PUT /api/v1/runs/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid run id' });
    return;
  }

  const existing = await Run.findById(id);
  if (!existing) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  if (String(existing.userId) !== ownerId(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { date, title, notes, distanceKm, durationSec, type } = req.body as {
    date?: string;
    title?: string;
    notes?: string;
    distanceKm?: number;
    durationSec?: number;
    type?: RunType;
  };

  const updates: Record<string, unknown> = {};
  if (date !== undefined) updates['date'] = new Date(date);
  if (title !== undefined) updates['title'] = title;
  if (notes !== undefined) updates['notes'] = notes;
  if (distanceKm !== undefined) updates['distanceKm'] = distanceKm;
  if (durationSec !== undefined) updates['durationSec'] = durationSec;
  if (type !== undefined) updates['type'] = type;

  const updated = await Run.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  res.json(updated);
});

// DELETE /api/v1/runs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid run id' });
    return;
  }

  const run = await Run.findById(id);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  if (String(run.userId) !== ownerId(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await run.deleteOne();
  res.status(204).send();
});

export default router;
