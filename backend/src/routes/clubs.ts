import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Club } from '../models/Club';
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

// GET /api/v1/clubs/:id
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

  const isMember = club.memberIds.some((m) => String(m) === userId(req));
  if (!isMember) {
    res.status(403).json({ error: 'You are not a member of this club' });
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

  club.memberIds.push(new mongoose.Types.ObjectId(userId(req)));
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

export default router;
