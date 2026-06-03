import { Router, Request, Response } from 'express';
import { Run } from '../models/Run';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/stats/prs
router.get('/prs', async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const runs = await Run.find({ userId }).lean();

  if (runs.length === 0) {
    res.json({ fastestPace: null, longestRun: null, highestWeeklyKm: null });
    return;
  }

  // Fastest pace — lowest pace value (sec/km)
  const fastestPaceRun = runs.reduce((best, r) =>
    r.pace > 0 && r.pace < best.pace ? r : best
  );

  // Longest run by distanceKm
  const longestRun = runs.reduce((best, r) =>
    r.distanceKm > best.distanceKm ? r : best
  );

  // Highest weekly mileage — group runs by Mon–Sun week, sum distanceKm
  const weekTotals = new Map<string, number>();
  for (const run of runs) {
    const d = new Date(run.date);
    const diffToMonday = (d.getUTCDay() + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - diffToMonday);
    monday.setUTCHours(0, 0, 0, 0);
    const key = monday.toISOString();
    weekTotals.set(key, (weekTotals.get(key) ?? 0) + run.distanceKm);
  }
  const highestWeeklyKm = Math.max(...weekTotals.values());

  res.json({
    fastestPace: {
      runId: String(fastestPaceRun._id),
      title: fastestPaceRun.title,
      date: fastestPaceRun.date,
      paceFormatted: fastestPaceRun.pace
        ? `${Math.floor(fastestPaceRun.pace / 60)}:${Math.round(fastestPaceRun.pace % 60).toString().padStart(2, '0')}`
        : null,
      paceSec: fastestPaceRun.pace,
    },
    longestRun: {
      runId: String(longestRun._id),
      title: longestRun.title,
      date: longestRun.date,
      distanceKm: Math.round(longestRun.distanceKm * 100) / 100,
    },
    highestWeeklyKm: Math.round(highestWeeklyKm * 100) / 100,
  });
});

export default router;
