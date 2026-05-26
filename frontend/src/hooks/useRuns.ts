import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export type RunType = 'easy' | 'tempo' | 'long' | 'race';

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface Run {
  _id: string;
  title: string;
  date: string;
  distanceKm: number;
  durationSec: number;
  pace: number;
  paceFormatted: string | null;
  type: RunType;
  notes?: string;
  elevationGainM?: number;
  gpxFileUrl?: string;
  coordinatesCount?: number;
  routeGeoJSON?: GeoJSONLineString;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UseRunsResult {
  runs: Run[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  refresh: () => void;
}

export function useRuns(limit = 10): UseRunsResult {
  const [runs, setRuns] = useState<Run[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .get<{ data: Run[]; pagination: Pagination }>('/runs', {
        params: { page, limit },
      })
      .then((res) => {
        if (cancelled) return;
        setRuns(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load runs. Please try again.');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, limit, tick]);

  return { runs, pagination, isLoading, error, page, setPage, refresh };
}

// ── Single run ─────────────────────────────────────────────────────────────

interface UseRunResult {
  run: Run | null;
  isLoading: boolean;
  error: string | null;
}

export function useRun(id: string): UseRunResult {
  const [run, setRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .get<Run>(`/runs/${id}`)
      .then((res) => {
        if (!cancelled) setRun(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Run not found.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { run, isLoading, error };
}