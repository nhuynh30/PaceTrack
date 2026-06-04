import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { useRun } from '../hooks/useRuns';
import type { RunType, GeoJSONLineString } from '../hooks/useRuns';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

mapboxgl.accessToken = import.meta.env['VITE_MAPBOX_TOKEN'] as string;

const TYPE_COLORS: Record<RunType, string> = {
  easy:  'bg-sky-100 text-sky-700',
  tempo: 'bg-amber-100 text-amber-700',
  long:  'bg-violet-100 text-violet-700',
  race:  'bg-rose-100 text-rose-700',
};

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { run, isLoading, error } = useRun(id!);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/runs/${id}`);
      navigate('/runs', { replace: true });
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh bg-gray-50">
        <Sidebar onNavigate={navigate} onLogout={() => { logout(); navigate('/login', { replace: true }); }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-64">
            <div className="h-6 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex min-h-svh bg-gray-50">
        <Sidebar onNavigate={navigate} onLogout={() => { logout(); navigate('/login', { replace: true }); }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🏃</p>
            <p className="text-gray-500 font-medium">{error ?? 'Run not found.'}</p>
            <button onClick={() => navigate('/runs')} className="mt-4 text-sm text-orange-500 hover:text-orange-600 font-medium">
              ← Back to activities
            </button>
          </div>
        </div>
      </div>
    );
  }

  const date = new Date(run.date).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex min-h-svh bg-gray-50 text-gray-900">
      <Sidebar onNavigate={navigate} onLogout={() => { logout(); navigate('/login', { replace: true }); }} />

      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between bg-orange-500 px-4 py-4 text-white">
          <button onClick={() => navigate('/dashboard')} className="text-lg font-black tracking-tight">PaceTrack</button>
          <button onClick={() => navigate('/track')} className="rounded-lg bg-white text-orange-500 px-3 py-1.5 text-sm font-bold">
            Start Run
          </button>
        </header>

        <main className="flex-1 p-6 max-w-2xl w-full mx-auto">
          {/* Back */}
          <button
            onClick={() => navigate('/runs')}
            className="mb-6 text-sm text-gray-400 hover:text-orange-500 transition"
          >
            ← Activities
          </button>

          {/* Title */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{run.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`mt-1 rounded-full px-3 py-1 text-xs font-medium ${TYPE_COLORS[run.type]}`}>
                {run.type.charAt(0).toUpperCase() + run.type.slice(1)}
              </span>
              {!confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="mt-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400 hover:border-red-200 hover:text-red-500 transition"
                >
                  Delete
                </button>
              )}
              {confirmDelete && (
                <div className="mt-1 flex items-center gap-1.5">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deleting ? '…' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-8">{date}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard label="Distance" value={`${run.distanceKm.toFixed(2)} km`} />
            <StatCard label="Avg Pace" value={`${run.paceFormatted ?? '—'} /km`} highlight />
            <StatCard label="Duration" value={formatDuration(run.durationSec)} />
            <StatCard label="Run Type" value={run.type.charAt(0).toUpperCase() + run.type.slice(1)} />
            {run.elevationGainM != null && run.elevationGainM > 0 && (
              <StatCard label="Elevation Gain" value={`+${Math.round(run.elevationGainM)} m`} />
            )}
            {run.coordinatesCount != null && run.coordinatesCount > 0 && (
              <StatCard label="GPS Points" value={run.coordinatesCount.toLocaleString()} />
            )}
          </div>

          {/* Notes */}
          {run.notes && (
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.notes}</p>
            </div>
          )}

          {/* Route map */}
          {run.routeGeoJSON && (
            <RouteMap geoJSON={run.routeGeoJSON} className="mt-4" />
          )}

          {/* GPX download */}
          {run.gpxFileUrl && (
            <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Route Data</p>
                <p className="text-sm text-gray-700">
                  {run.coordinatesCount ? `${run.coordinatesCount.toLocaleString()} GPS points recorded` : 'Route available'}
                </p>
              </div>
              <a
                href={run.gpxFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition"
              >
                Download GPX
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate, onLogout }: { onNavigate: (path: string) => void; onLogout: () => void }) {
  return (
    <aside className="hidden md:flex w-60 flex-col bg-orange-500 text-white shrink-0">
      <div className="px-6 py-8">
        <p className="text-2xl font-black tracking-tight">PaceTrack</p>
        <p className="mt-0.5 text-xs text-orange-200">Run. Track. Improve.</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        <NavItem label="Overview" icon={<GridIcon />} onClick={() => onNavigate('/dashboard')} />
        <NavItem label="Activities" icon={<ActivityIcon />} active onClick={() => {}} />
        <NavItem label="Clubs" icon={<ClubsIcon />} onClick={() => onNavigate('/clubs')} />
        <NavItem label="Track Run" icon={<PinIcon />} onClick={() => onNavigate('/track')} />
      </nav>
      <div className="p-4 border-t border-orange-400">
        <button onClick={onLogout} className="text-sm text-orange-200 hover:text-white">Sign out</button>
      </div>
    </aside>
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon?: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active ? 'bg-white/20 text-white' : 'text-orange-100 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}{label}
    </button>
  );
}
function GridIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function ActivityIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function ClubsIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function PinIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${highlight ? 'text-orange-500' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

// ── Route map ────────────────────────────────────────────────────────────────

function RouteMap({ geoJSON, className = '' }: { geoJSON: GeoJSONLineString; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const coords = geoJSON.coordinates; // [lng, lat][]

    // Compute bounding box
    const lngs = coords.map(([lng]) => lng);
    const lats = coords.map(([, lat]) => lat);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];

    const center: [number, number] = coords.length > 0
      ? [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2,
        ]
      : [106.6297, 10.8231];

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 13,
      interactive: true,
    });

    mapRef.current.on('load', () => {
      const m = mapRef.current!;

      m.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: geoJSON,
        },
      });

      m.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f97316', 'line-width': 4 },
      });

      // Start and end markers
      if (coords.length > 0) {
        new mapboxgl.Marker({ color: '#22c55e' }).setLngLat(coords[0]).addTo(m);
        new mapboxgl.Marker({ color: '#ef4444' }).setLngLat(coords[coords.length - 1]).addTo(m);
      }

      // Fit to route
      if (coords.length > 1) {
        m.fitBounds(bounds, { padding: 40, maxZoom: 17 });
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // Run once – geoJSON won't change after mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-200 ${className}`}>
      <div className="px-5 pt-4 pb-2 bg-white border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Route</p>
      </div>
      <div ref={containerRef} style={{ height: 280 }} />
    </div>
  );
}
