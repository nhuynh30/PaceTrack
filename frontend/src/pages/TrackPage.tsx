import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

mapboxgl.accessToken = import.meta.env['VITE_MAPBOX_TOKEN'] as string;

type TrackingState = 'idle' | 'running' | 'paused' | 'saving';

interface Coord {
  lat: number;
  lng: number;
  timestamp: string;
}

// ── Haversine helpers ────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDistanceKm(coords: Coord[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(
      coords[i - 1].lat, coords[i - 1].lng,
      coords[i].lat,     coords[i].lng,
    );
  }
  return total;
}

/**
 * Rolling pace over the last 500 m of GPS track.
 * Returns "--:--" when less than 500 m has been recorded.
 */
function rollingPace(coords: Coord[], currentElapsedSec: number): string {
  if (coords.length < 2) return '--:--';

  // Walk backwards accumulating distance until we exceed 500 m
  const TARGET_KM = 0.5;
  let distKm = 0;
  let i = coords.length - 1;
  while (i > 0 && distKm < TARGET_KM) {
    distKm += haversineKm(
      coords[i - 1].lat, coords[i - 1].lng,
      coords[i].lat,     coords[i].lng,
    );
    i--;
  }

  if (distKm < TARGET_KM) {
    // Fallback: use all available distance + elapsed time
    const total = totalDistanceKm(coords);
    if (total < 0.01) return '--:--';
    const secPerKm = currentElapsedSec / total;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Time span for the 500 m window
  const startTs = new Date(coords[i].timestamp).getTime();
  const endTs   = new Date(coords[coords.length - 1].timestamp).getTime();
  const windowSec = (endTs - startTs) / 1000;

  if (windowSec <= 0) return '--:--';
  const secPerKm = windowSec / distKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrackPage() {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const startTimeRef = useRef<string | null>(null);
  const lastAltitudeRef = useRef<number | null>(null);
  const elevationFetchCountRef = useRef<number>(0);

  const [trackingState, setTrackingState] = useState<TrackingState>('idle');
  const [coords, setCoords] = useState<Coord[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [liveElevationGainM, setLiveElevationGainM] = useState(0);

  // Summary dialog state
  const [showSummary, setShowSummary] = useState(false);
  const [summaryCoords, setSummaryCoords] = useState<Coord[]>([]);
  const [summaryElapsed, setSummaryElapsed] = useState(0);

  // ── Map init ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      zoom: 15,
      center: [106.6297, 10.8231],
    });

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.current.addControl(geolocate);

    map.current.on('load', () => {
      map.current!.resize();
      map.current!.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
      });

      map.current!.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f97316', 'line-width': 5 },
      });

      geolocate.trigger();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── Redraw polyline + move marker on every coords change ─────────────────

  useEffect(() => {
    if (!map.current) return;

    const update = () => {
      const source = map.current!.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords.map((c) => [c.lng, c.lat]),
          },
        });
      }

      if (coords.length > 0) {
        const last = coords[coords.length - 1];
        const lngLat: [number, number] = [last.lng, last.lat];
        if (marker.current) {
          marker.current.setLngLat(lngLat);
        } else {
          marker.current = new mapboxgl.Marker({ color: '#f97316' })
            .setLngLat(lngLat)
            .addTo(map.current!);
        }
        map.current!.easeTo({ center: lngLat, duration: 500 });
      }
    };

    if (map.current.isStyleLoaded()) {
      update();
    } else {
      map.current.once('load', update);
    }
  }, [coords]);

  // ── Elevation API: fetch every 10 new points ──────────────────────────────

  const fetchElevationGain = useCallback(async (currentCoords: Coord[]) => {
    if (currentCoords.length < 2) return;
    try {
      const points = currentCoords.map((c) => [c.lat, c.lng]);
      const { data } = await api.get<{ elevation: number }[]>('/elevation', {
        params: { points: JSON.stringify(points) },
      });

      // Calculate cumulative gain from returned elevations
      let gain = 0;
      for (let i = 1; i < data.length; i++) {
        const diff = data[i].elevation - data[i - 1].elevation;
        if (diff > 0) gain += diff;
      }
      setLiveElevationGainM(gain);
    } catch {
      // Silent – GPS altitude fallback still running
    }
  }, []);

  // ── GPS watching ─────────────────────────────────────────────────────────

  function stopWatching() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startWatching() {
    setGpsError(null);

    timerRef.current = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < 3000) return;
        lastUpdateRef.current = now;

        const newCoord: Coord = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        setCoords((prev) => {
          const updated = [...prev, newCoord];

          // Every 10 new points, call the elevation API
          elevationFetchCountRef.current += 1;
          if (elevationFetchCountRef.current % 10 === 0) {
            fetchElevationGain(updated);
          }

          return updated;
        });

        // GPS altitude fallback for elevation gain
        if (pos.coords.altitude !== null) {
          const alt = pos.coords.altitude;
          if (lastAltitudeRef.current !== null) {
            const diff = alt - lastAltitudeRef.current;
            if (diff > 0) {
              setLiveElevationGainM((prev) => prev + diff);
            }
          }
          lastAltitudeRef.current = alt;
        }
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Please enable GPS in your browser settings.'
            : 'Unable to get GPS signal. Move to an open area and try again.',
        );
        stopWatching();
        setTrackingState('idle');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }

  // ── Controls ─────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS is not supported on this device.');
      return;
    }
    startTimeRef.current = new Date().toISOString();
    elevationFetchCountRef.current = 0;
    setTrackingState('running');
    startWatching();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePause = useCallback(() => {
    setTrackingState('paused');
    stopWatching();
  }, []);

  const handleResume = useCallback(() => {
    setTrackingState('running');
    startWatching();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the summary dialog instead of saving immediately
  const handleFinishPress = useCallback(() => {
    stopWatching();
    setSummaryCoords(coords);
    setSummaryElapsed(elapsedSec);
    setShowSummary(true);
  }, [coords, elapsedSec]);

  // Called when user confirms in summary dialog
  const handleConfirmSave = useCallback(async (currentCoords: Coord[], _elapsed: number) => {
    setSaveError(null);

    if (currentCoords.length < 2 || totalDistanceKm(currentCoords) < 0.1 || !startTimeRef.current) {
      setSaveError('Run must be at least 0.1 km (100 m) to save.');
      setTrackingState('paused');
      setShowSummary(false);
      return;
    }

    setShowSummary(false);
    setTrackingState('saving');

    const doSave = async () => {
      const endTime = new Date().toISOString();
      const { data } = await api.post('/runs/live', {
        coordinates: currentCoords,
        startTime: startTimeRef.current,
        endTime,
      });
      navigate(`/runs/${data._id}`);
    };

    try {
      await doSave();
    } catch {
      setSaveError('Failed to save run. Tap retry to try again.');
      setTrackingState('paused');
    }
  }, [navigate]);

  const handleRetry = useCallback(async () => {
    setTrackingState('saving');
    setSaveError(null);
    try {
      const endTime = new Date().toISOString();
      const { data } = await api.post('/runs/live', {
        coordinates: summaryCoords,
        startTime: startTimeRef.current,
        endTime,
      });
      navigate(`/runs/${data._id}`);
    } catch {
      setSaveError('Failed to save run. Tap retry to try again.');
      setTrackingState('paused');
    }
  }, [navigate, summaryCoords]);

  useEffect(() => () => stopWatching(), []);

  // ── Derived metrics ───────────────────────────────────────────────────────

  const distanceKm = totalDistanceKm(coords);
  const pace = rollingPace(coords, elapsedSec);

  const liveCalories = Math.round(distanceKm * 1.036 * 70);

  const speedKmh = (() => {
    const parts = pace.match(/^(\d+):(\d+)$/);
    if (!parts) return '--';
    const secPerKm = parseInt(parts[1]) * 60 + parseInt(parts[2]);
    if (secPerKm === 0) return '--';
    return (3600 / secPerKm).toFixed(1);
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-svh w-screen overflow-hidden">
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 z-20 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
      >
        ← Back
      </button>

      {/* GPS error banner */}
      {gpsError && (
        <div className="absolute top-4 left-1/2 z-20 w-[90%] -translate-x-1/2 rounded-2xl bg-red-500/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
          {gpsError}
        </div>
      )}

      {/* Save error banner */}
      {saveError && (
        <div className="absolute top-16 left-1/2 z-20 w-[90%] -translate-x-1/2 rounded-2xl bg-red-500/90 px-4 py-3 text-sm text-white backdrop-blur-sm flex items-center justify-between gap-3">
          <span>{saveError}</span>
          <button
            onClick={handleRetry}
            className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary dialog */}
      {showSummary && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/60 backdrop-blur-sm">
          <div className="w-full rounded-t-3xl bg-slate-950 px-6 pt-6 pb-10">
            <p className="mb-5 text-center text-lg font-bold text-white">Run Summary</p>

            <div className="mb-6 grid grid-cols-3 gap-3 text-center">
              <SummaryItem label="Distance" value={`${totalDistanceKm(summaryCoords).toFixed(2)} km`} />
              <SummaryItem label="Time" value={formatTime(summaryElapsed)} />
              <SummaryItem
                label="Avg Pace"
                value={
                  totalDistanceKm(summaryCoords) > 0.01
                    ? (() => {
                        const spk = summaryElapsed / totalDistanceKm(summaryCoords);
                        return `${Math.floor(spk / 60)}:${Math.round(spk % 60).toString().padStart(2, '0')}`;
                      })()
                    : '--:--'
                }
              />
            </div>

            {totalDistanceKm(summaryCoords) < 0.1 && (
              <p className="mb-4 rounded-xl bg-red-500/20 px-4 py-3 text-center text-sm text-red-400">
                Run too short to save — minimum distance is 0.1 km (100 m).
              </p>
            )}

            {totalDistanceKm(summaryCoords) < 0.1 ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowSummary(false); setTrackingState('running'); startWatching(); }}
                    className="flex-1 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white active:scale-95"
                  >
                    Keep Running
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 rounded-2xl border border-red-500 py-4 text-base font-bold text-red-400 active:scale-95"
                  >
                    Discard Run
                  </button>
                </div>
                <button
                  disabled
                  className="w-full rounded-2xl bg-orange-500 py-4 text-base font-bold text-white opacity-40 cursor-not-allowed"
                >
                  Save Run
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSummary(false); setTrackingState('paused'); }}
                  className="flex-1 rounded-2xl border border-slate-600 py-4 text-base font-bold text-white active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmSave(summaryCoords, summaryElapsed)}
                  className="flex-1 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white active:scale-95"
                >
                  Save Run
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-3xl bg-slate-950/90 px-4 pt-4 pb-[env(safe-area-inset-bottom,24px)] backdrop-blur-md">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <StatCard label="Distance" value={distanceKm.toFixed(2)} unit="km" />
          <StatCard label="Pace" value={pace} unit="min/km" />
          <StatCard label="Time" value={formatTime(elapsedSec)} unit="elapsed" />
          <StatCard label="Speed" value={speedKmh} unit="km/h" />
          <StatCard label="Calories" value={liveCalories > 0 ? `${liveCalories}` : '--'} unit="kcal" />
          <StatCard
            label="Elevation"
            value={liveElevationGainM > 0 ? `+${Math.round(liveElevationGainM)}` : '--'}
            unit="m gain"
          />
        </div>

        <div className="flex gap-3">
          {trackingState === 'idle' && (
            <button
              onClick={handleStart}
              className="flex-1 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white active:scale-95"
            >
              Start Run
            </button>
          )}

          {trackingState === 'running' && (
            <>
              <button
                onClick={handlePause}
                className="flex-1 rounded-2xl border border-slate-600 py-4 text-base font-bold text-white active:scale-95"
              >
                Pause
              </button>
              <button
                onClick={handleFinishPress}
                className="flex-1 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white active:scale-95"
              >
                Finish
              </button>
            </>
          )}

          {trackingState === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="flex-1 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white active:scale-95"
              >
                Resume
              </button>
              <button
                onClick={handleFinishPress}
                className="flex-1 rounded-2xl border border-slate-600 py-4 text-base font-bold text-white active:scale-95"
              >
                Finish
              </button>
            </>
          )}

          {trackingState === 'saving' && (
            <button
              disabled
              className="flex-1 rounded-2xl bg-slate-700 py-4 text-base font-bold text-slate-400"
            >
              Saving…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-slate-800/60 px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-white leading-tight">{value}</p>
      <p className="text-[10px] text-slate-500">{unit}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-800/60 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}