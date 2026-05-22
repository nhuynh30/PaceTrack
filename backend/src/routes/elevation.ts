import { Router, Request, Response } from 'express';
import { getElevations } from '../services/elevation';

const router = Router();

// GET /api/v1/elevation?points=[[lat,lng],...]
router.get('/', async (req: Request, res: Response) => {
  const raw = req.query['points'];
  if (!raw || typeof raw !== 'string') {
    res.status(400).json({ error: 'points query param is required: ?points=[[lat,lng],...]' });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    res.status(400).json({ error: 'points must be valid JSON, e.g. [[10.1,10.2],[10.3,10.4]]' });
    return;
  }

  if (
    !Array.isArray(parsed) ||
    parsed.some(
      p => !Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number'
    )
  ) {
    res.status(400).json({ error: 'Each point must be [lat, lng] with numeric values' });
    return;
  }

  const points = (parsed as [number, number][]).map(([lat, lng]) => ({ lat, lng }));
  const elevations = await getElevations(points);
  res.json(elevations);
});

export default router;
