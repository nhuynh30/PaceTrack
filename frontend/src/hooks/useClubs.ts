import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface Club {
  _id: string;
  name: string;
  description?: string;
  creatorId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  firstName: string;
  weeklyKm: number;
  runCount: number;
}

// ── User's clubs ────────────────────────────────────────────────────────────

interface UseClubsResult {
  clubs: Club[];
  isLoading: boolean;
  error: string | null;
  createClub: (name: string, description: string) => Promise<Club>;
}

export function useClubs(): UseClubsResult {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.get<Club[]>('/clubs')
      .then(r => { if (!cancelled) setClubs(r.data); })
      .catch(() => { if (!cancelled) setError('Failed to load clubs.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const createClub = useCallback(async (name: string, description: string): Promise<Club> => {
    const r = await api.post<Club>('/clubs', { name, description });
    setClubs(prev => [r.data, ...prev]);
    return r.data;
  }, []);

  return { clubs, isLoading, error, createClub };
}

// ── Activity feed ───────────────────────────────────────────────────────────

export interface ActivityEvent {
  type: 'created' | 'joined';
  clubId: string;
  clubName: string;
  firstName: string;
  isCurrentUser: boolean;
  date: string;
}

export function useActivity(): { events: ActivityEvent[]; isLoading: boolean } {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<ActivityEvent[]>('/clubs/activity')
      .then(r => { if (!cancelled) setEvents(r.data); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { events, isLoading };
}

// ── All clubs (for discovery) ───────────────────────────────────────────────

export function useAllClubs(): { clubs: Club[]; isLoading: boolean } {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<Club[]>('/clubs/all')
      .then(r => { if (!cancelled) setClubs(r.data); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { clubs, isLoading };
}

// ── Single club ─────────────────────────────────────────────────────────────

interface UseClubResult {
  club: Club | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useClub(id: string): UseClubResult {
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.get<Club>(`/clubs/${id}`)
      .then(r => { if (!cancelled) setClub(r.data); })
      .catch(() => { if (!cancelled) setError('Club not found.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [id, tick]);

  return { club, isLoading, error, refresh };
}

// ── Leaderboard ─────────────────────────────────────────────────────────────

interface UseLeaderboardResult {
  rows: LeaderboardRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLeaderboard(clubId: string, enabled = true): UseLeaderboardResult {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.get<LeaderboardRow[]>(`/clubs/${clubId}/leaderboard`)
      .then(r => { if (!cancelled) setRows(r.data); })
      .catch(() => { if (!cancelled) setError('Failed to load leaderboard.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [clubId, tick, enabled]);

  return { rows, isLoading, error, refresh };
}
