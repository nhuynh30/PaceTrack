import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Run, RunType } from '../models/Run';
import { Club } from '../models/Club';
import { authMiddleware } from '../middleware/auth';
import { totalDistanceKm } from '../utils/haversine';
import { getElevations } from '../services/elevation';
import { getIo } from '../socket';
import { buildLeaderboard } from '../services/leaderboard';

const router = Router();
router.use(authMiddleware);

async function emitLeaderboardUpdates(userId: string): Promise<void> {
  const clubs = await Club.find({ memberIds: userId }).select('_id').lean();
  const io = getIo();
  await Promise.all(
    clubs.map(async (club) => {
      const clubId = String(club._id);
      const leaderboard = await buildLeaderboard(clubId);
      io.to(clubId).emit('leaderboard:update', leaderboard);
    }),
  );
}

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

  emitLeaderboardUpdates(ownerId(req)).catch(() => {});
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

// POST /api/v1/runs/live
router.post('/live', async (req: Request, res: Response) => {
  const { coordinates, startTime, endTime } = req.body as {
    coordinates?: { lat: number; lng: number; timestamp: string }[];
    startTime?: string;
    endTime?: string;
  };

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    res.status(400).json({ error: 'coordinates must be an array of at least 2 points' });
    return;
  }
  if (!startTime || !endTime) {
    res.status(400).json({ error: 'startTime and endTime are required' });
    return;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationSec = Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));
  const distanceKm = totalDistanceKm(coordinates);

  // Fetch elevations and sum only uphill gains — if the API fails, default to 0
  let elevationGainM = 0;
  try {
    const elevations = await getElevations(
      coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
    );
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i].elevationM - elevations[i - 1].elevationM;
      if (diff > 0) elevationGainM += diff;
    }
  } catch {
    // Non-fatal — elevation gain stays 0
  }

  const title = `Live Run – ${start.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })}`;

  const run = await Run.create({
    userId: ownerId(req),
    date: start,
    title,
    distanceKm,
    durationSec,
    elevationGainM,
    coordinatesCount: coordinates.length,
    routeGeoJSON: {
      type: 'LineString',
      coordinates: coordinates.map(c => [c.lng, c.lat] as [number, number]),
    },
    type: 'easy',
  });

  res.status(201).json(run);

  emitLeaderboardUpdates(ownerId(req)).catch(() => {});
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

  const { date, title, notes, distanceKm, durationSec, type, gpxFileUrl, coordinatesCount, routeGeoJSON } = req.body as {
    date?: string;
    title?: string;
    notes?: string;
    distanceKm?: number;
    durationSec?: number;
    type?: RunType;
    gpxFileUrl?: string;
    coordinatesCount?: number;
    routeGeoJSON?: { type: 'LineString'; coordinates: [number, number][] };
  };

  const updates: Record<string, unknown> = {};
  if (date !== undefined) updates['date'] = new Date(date);
  if (title !== undefined) updates['title'] = title;
  if (notes !== undefined) updates['notes'] = notes;
  if (distanceKm !== undefined) updates['distanceKm'] = distanceKm;
  if (durationSec !== undefined) updates['durationSec'] = durationSec;
  if (type !== undefined) updates['type'] = type;
  if (gpxFileUrl !== undefined) updates['gpxFileUrl'] = gpxFileUrl;
  if (coordinatesCount !== undefined) updates['coordinatesCount'] = coordinatesCount;
  if (routeGeoJSON !== undefined) updates['routeGeoJSON'] = routeGeoJSON;

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