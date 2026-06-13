import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Club } from '../models/Club';
import { Run } from '../models/Run';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function userId(req: Request): string {
  return req.user!.sub;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// POST /api/v1/clubs
router.post('/', async (req: Request, res: Response) => {
  const { name, description } = req.body as { name?: string; description?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const uid = new mongoose.Types.ObjectId(userId(req));

  const club = await Club.create({
    name: name.trim(),
    description: description?.trim(),
    creatorId: uid,
    memberIds: [uid],
  });

  res.status(201).json(club);
});

// GET /api/v1/clubs
router.get('/', async (req: Request, res: Response) => {
  const uid = userId(req);
  const clubs = await Club.find({ memberIds: uid }).sort({ createdAt: -1 }).lean();
  res.json(clubs);
});

// GET /api/v1/clubs/all  — must be before /:id so "all" isn't matched as an id
router.get('/all', async (_req: Request, res: Response) => {
  const clubs = await Club.find({}).sort({ createdAt: -1 }).lean();
  res.json(clubs);
});

// GET /api/v1/clubs/activity — before /:id so "activity" isn't matched as an id
router.get('/activity', async (req: Request, res: Response) => {
  const uid = userId(req);
  const clubs = await Club.find({ memberIds: uid })
    .select('name joinHistory createdAt creatorId')
    .lean();

  interface ActivityEvent {
    type: 'created' | 'joined';
    clubId: string;
    clubName: string;
    firstName: string;
    isCurrentUser: boolean;
    date: string;
  }

  const events: ActivityEvent[] = [];

  // Gather creator userIds to look up names
  const creatorIds = clubs.map(c => String(c.creatorId));
  const creators = await User.find({ _id: { $in: creatorIds } }).select('firstName').lean();
  const nameMap = new Map(creators.map(u => [String(u._id), u.firstName]));

  for (const club of clubs) {
    events.push({
      type: 'created',
      clubId: String(club._id),
      clubName: club.name,
      firstName: nameMap.get(String(club.creatorId)) ?? '',
      isCurrentUser: String(club.creatorId) === uid,
      date: new Date(club.createdAt).toISOString(),
    });

    for (const ev of club.joinHistory ?? []) {
      events.push({
        type: 'joined',
        clubId: String(club._id),
        clubName: club.name,
        firstName: ev.firstName,
        isCurrentUser: String(ev.userId) === uid,
        date: new Date(ev.joinedAt).toISOString(),
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(events.slice(0, 20));
});

// GET /api/v1/clubs/:id  — visible to any authenticated user; membership only required for leaderboard
router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid club id' });
    return;
  }

  const club = await Club.findById(id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  res.json(club);
});

// POST /api/v1/clubs/:id/join
router.post('/:id/join', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid club id' });
    return;
  }

  const club = await Club.findById(id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const alreadyMember = club.memberIds.some((m) => String(m) === userId(req));
  if (alreadyMember) {
    res.status(400).json({ error: 'You are already a member of this club' });
    return;
  }

  const joiner = await User.findById(userId(req)).select('firstName').lean();
  club.memberIds.push(new mongoose.Types.ObjectId(userId(req)));
  club.joinHistory.push({
    userId: new mongoose.Types.ObjectId(userId(req)),
    firstName: joiner?.firstName ?? 'Unknown',
    joinedAt: new Date(),
  });
  await club.save();

  res.json(club);
});

// DELETE /api/v1/clubs/:id/leave
router.delete('/:id/leave', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid club id' });
    return;
  }

  const club = await Club.findById(id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  if (String(club.creatorId) === userId(req)) {
    res.status(400).json({ error: 'Club creator cannot leave. Delete the club instead.' });
    return;
  }

  const isMember = club.memberIds.some((m) => String(m) === userId(req));
  if (!isMember) {
    res.status(400).json({ error: 'You are not a member of this club' });
    return;
  }

  club.memberIds = club.memberIds.filter((m) => String(m) !== userId(req));
  await club.save();

  res.status(204).send();
});

// DELETE /api/v1/clubs/:id
// PATCH /api/v1/clubs/:id — rename club (creator only)
router.patch('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid club id' });
    return;
  }

  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const club = await Club.findById(id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  if (String(club.creatorId) !== userId(req)) {
    res.status(403).json({ error: 'Only the club creator can rename this club' });
    return;
  }

  club.name = name.trim();
  await club.save();
  res.json(club);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid club id' });
    return;
  }

  const club = await Club.findById(id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  if (String(club.creatorId) !== userId(req)) {
    res.status(403).json({ error: 'Only the club creator can delete this club' });
    return;
  }

  await Club.findByIdAndDelete(id);
  res.status(204).send();
});

// GET /api/v1/clubs/:id/leaderboard
router.get('/:id/leaderboard', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid club id' });
    return;
  }

  const club = await Club.findById(id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const isMember = club.memberIds.some((m) => String(m) === userId(req));
  if (!isMember) {
    res.status(403).json({ error: 'You are not a member of this club' });
    return;
  }

  // Compute Mon–Sun window for the current week in UTC
  const now = new Date();
  const diffToMonday = (now.getUTCDay() + 6) % 7; // Sun=0 → diff=6, Mon=1 → diff=0
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  const runs = await Run.find({
    userId: { $in: club.memberIds },
    date: { $gte: monday, $lte: sunday },
  }).lean();

  // Aggregate distanceKm and runCount per userId
  const totals = new Map<string, { distanceKm: number; runCount: number }>();
  for (const run of runs) {
    const uid = String(run.userId);
    const existing = totals.get(uid) ?? { distanceKm: 0, runCount: 0 };
    existing.distanceKm += run.distanceKm;
    existing.runCount += 1;
    totals.set(uid, existing);
  }

  // Include members with zero runs so everyone appears on the board
  for (const memberId of club.memberIds) {
    const uid = String(memberId);
    if (!totals.has(uid)) {
      totals.set(uid, { distanceKm: 0, runCount: 0 });
    }
  }

  const userIds = Array.from(totals.keys()).map((uid) => new mongoose.Types.ObjectId(uid));
  const users = await User.find({ _id: { $in: userIds } }).select('firstName').lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.firstName]));

  const leaderboard = Array.from(totals.entries())
    .map(([uid, { distanceKm, runCount }]) => ({
      userId: uid,
      firstName: nameMap.get(uid) ?? '',
      weeklyKm: Math.round(distanceKm * 100) / 100,
      runCount,
    }))
    .sort((a, b) => b.weeklyKm - a.weeklyKm)
    .map((entry, i) => ({ rank: i + 1, ...entry }));

  res.json(leaderboard);
});

export default router;
