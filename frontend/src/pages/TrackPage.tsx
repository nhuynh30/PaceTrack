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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPace(distanceKm: number, elapsedSec: number): string {
  if (distanceKm < 0.01) return '--:--';
  const secPerKm = elapsedSec / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackPage() {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const startTimeRef = useRef<string | null>(null);

  const [trackingState, setTrackingState] = useState<TrackingState>('idle');
  const [coords, setCoords] = useState<Coord[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialise map once on mount, destroy on unmount
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      zoom: 15,
      center: [106.6297, 10.8231],
    });

    map.current.on('load', () => {
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
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 16,
        });
      },
      () => {},
    );

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Redraw polyline and move marker whenever coords change
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

        setCoords((prev) => [
          ...prev,
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: new Date().toISOString(),
          },
        ]);
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

  const handleStart = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS is not supported on this device.');
      return;
    }
    startTimeRef.current = new Date().toISOString();
    setTrackingState('running');
    startWatching();
  }, []);

  const handlePause = useCallback(() => {
    setTrackingState('paused');
    stopWatching();
  }, []);

  const handleResume = useCallback(() => {
    setTrackingState('running');
    startWatching();
  }, []);

  const handleFinish = useCallback(async (currentCoords: Coord[]) => {
    stopWatching();
    setSaveError(null);

    // Not enough points to save — just go back
    if (currentCoords.length < 2 || !startTimeRef.current) {
      navigate('/dashboard');
      return;
    }

    setTrackingState('saving');

    try {
      const endTime = new Date().toISOString();
      const { data } = await api.post('/runs/live', {
        coordinates: currentCoords,
        startTime: startTimeRef.current,
        endTime,
      });
      navigate(`/runs/${data._id}`);
    } catch {
      setSaveError('Failed to save run. Tap retry to try again.');
      setTrackingState('paused');
    }
  }, [navigate]);

  useEffect(() => () => stopWatching(), []);

  const distanceKm = totalDistanceKm(coords);

  return (
    <div className="relative h-svh w-screen overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />

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
        <div className="absolute top-4 left-1/2 z-20 w-[90%] -translate-x-1/2 rounded-2xl bg-red-500/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
          {saveError}
        </div>
      )}

      {/* HUD */}
      <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-3xl bg-slate-950/90 px-5 pt-5 pb-10 backdrop-blur-md">
        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatCard label="Distance" value={distanceKm.toFixed(2)} unit="km" />
          <StatCard label="Pace" value={formatPace(distanceKm, elapsedSec)} unit="min / km" />
          <StatCard label="Time" value={formatTime(elapsedSec)} unit="elapsed" />
          <StatCard label="Elevation" value="--" unit="m gain" />
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
                onClick={() => handleFinish(coords)}
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
                onClick={() => handleFinish(coords)}
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
    <div className="rounded-2xl bg-slate-800/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500">{unit}</p>
    </div>
  );
}
