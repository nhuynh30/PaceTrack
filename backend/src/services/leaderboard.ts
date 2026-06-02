import mongoose from 'mongoose';
import { Run } from '../models/Run';
import { User } from '../models/User';
import { Club } from '../models/Club';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  weeklyKm: number;
  runCount: number;
}

function currentWeekWindow(): { monday: Date; sunday: Date } {
  const now = new Date();
  const diffToMonday = (now.getUTCDay() + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { monday, sunday };
}

export async function buildLeaderboard(clubId: string): Promise<LeaderboardEntry[]> {
  const club = await Club.findById(clubId);
  if (!club) return [];

  const { monday, sunday } = currentWeekWindow();

  const runs = await Run.find({
    userId: { $in: club.memberIds },
    date: { $gte: monday, $lte: sunday },
  }).lean();

  const totals = new Map<string, { distanceKm: number; runCount: number }>();
  for (const run of runs) {
    const uid = String(run.userId);
    const existing = totals.get(uid) ?? { distanceKm: 0, runCount: 0 };
    existing.distanceKm += run.distanceKm;
    existing.runCount += 1;
    totals.set(uid, existing);
  }

  for (const memberId of club.memberIds) {
    const uid = String(memberId);
    if (!totals.has(uid)) totals.set(uid, { distanceKm: 0, runCount: 0 });
  }

  const userIds = Array.from(totals.keys()).map((uid) => new mongoose.Types.ObjectId(uid));
  const users = await User.find({ _id: { $in: userIds } }).select('firstName').lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.firstName]));

  return Array.from(totals.entries())
    .map(([uid, { distanceKm, runCount }]) => ({
      userId: uid,
      firstName: nameMap.get(uid) ?? '',
      weeklyKm: Math.round(distanceKm * 100) / 100,
      runCount,
    }))
    .sort((a, b) => b.weeklyKm - a.weeklyKm)
    .map((entry, i) => ({ rank: i + 1, ...entry }));
}
