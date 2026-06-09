import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRuns } from '../hooks/useRuns';
import type { Run, RunType } from '../hooks/useRuns';
import { api } from '../lib/api';

const TYPE_COLORS: Record<RunType, string> = {
  easy:  'bg-sky-100 text-sky-700',
  tempo: 'bg-amber-100 text-amber-700',
  long:  'bg-violet-100 text-violet-700',
  race:  'bg-rose-100 text-rose-700',
};

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function thisWeekRuns(runs: Run[]): Run[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return runs.filter((r) => new Date(r.date) >= monday);
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { runs, isLoading, refresh } = useRuns(20);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const weekRuns = thisWeekRuns(runs);
  const weekDistance = Math.round(weekRuns.reduce((s, r) => s + r.distanceKm, 0) * 10) / 10;
  const weekTime = weekRuns.reduce((s, r) => s + r.durationSec, 0);
  const recentRun = runs[0] ?? null;

  async function handleDelete(runId: string) {
    setDeletingId(runId);
    try {
      await api.delete(`/runs/${runId}`);
      refresh();
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-svh bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-orange-500 text-white">
        <div className="px-6 py-8">
          <p className="text-2xl font-black tracking-tight">PaceTrack</p>
          <p className="mt-0.5 text-xs text-orange-200">Run. Track. Improve.</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <NavItem label="Overview" icon={<GridIcon />} active onClick={() => {}} />
          <NavItem label="Activities" icon={<ActivityIcon />} onClick={() => navigate('/runs')} />
          <NavItem label="Clubs" icon={<ClubsIcon />} onClick={() => navigate('/clubs')} />
          <NavItem label="Track Run" icon={<PinIcon />} onClick={() => navigate('/track')} />
        </nav>

        <div className="p-4 border-t border-orange-400">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-400 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <button onClick={handleLogout} className="text-xs text-orange-200 hover:text-white">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between bg-orange-500 px-4 py-4 text-white">
          <p className="text-lg font-black tracking-tight">PaceTrack</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/track')}
              className="flex items-center gap-1.5 rounded-full bg-white text-red-500 px-4 py-1.5 text-sm font-bold shadow-sm"
            >
              🏃 Start Run
            </button>
            <button onClick={handleLogout} className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm text-white">
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto">
          {/* Greeting */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {user?.firstName}! 👋
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">Ready for your next run?</p>
            </div>
            <button
              onClick={() => navigate('/track')}
              className="hidden md:flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:shadow-red-300 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150"
            >
              🏃 Start Run
            </button>
          </div>

          {/* This week stats */}
          <div className="mb-6 rounded-2xl bg-white border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-900">This Week</p>
              <button onClick={() => navigate('/runs')} className="text-sm text-orange-500 font-medium hover:text-orange-600">
                View All →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <WeekStat label="Distance" value={`${weekDistance.toFixed(1)} km`} />
              <WeekStat label="Time" value={formatDuration(weekTime)} />
              <WeekStat label="Activities" value={String(weekRuns.length)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent activity */}
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-gray-900">Recent Activity</p>
                <button onClick={() => navigate('/runs')} className="text-sm text-orange-500 font-medium hover:text-orange-600">
                  View All →
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                </div>
              ) : runs.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  No runs yet. Hit <span className="text-orange-500 font-medium">Start Run</span> to begin!
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.slice(0, 5).map((run) => (
                    <div
                      key={run._id}
                      className="rounded-xl border border-gray-100 p-3 hover:border-orange-200 hover:bg-orange-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => navigate(`/runs/${run._id}`)}
                          className="flex-1 min-w-0 text-left flex items-center gap-2"
                        >
                          <p className="text-sm font-semibold text-gray-900 truncate">{run.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[run.type]}`}>
                            {run.type}
                          </span>
                        </button>
                        {confirmDeleteId === run._id ? (
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <button
                              onClick={() => handleDelete(run._id)}
                              disabled={deletingId === run._id}
                              className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              {deletingId === run._id ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(run._id)}
                            className="ml-2 shrink-0 text-gray-400 hover:text-red-400 transition"
                            title="Delete run"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/runs/${run._id}`)}
                        className="mt-1 flex gap-3 text-xs text-gray-500 w-full text-left"
                      >
                        <span>{run.distanceKm.toFixed(2)} km</span>
                        <span>•</span>
                        <span className="text-orange-500 font-medium">{run.paceFormatted ?? '—'} /km</span>
                        <span>•</span>
                        <span>{new Date(run.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most recent run detail */}
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <p className="font-semibold text-gray-900 mb-4">Last Run</p>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-6 w-1/2 rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                  </div>
                </div>
              ) : !recentRun ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Your last run will appear here.
                </div>
              ) : (
                <LastRunCard run={recentRun} onNavigate={() => navigate(`/runs/${recentRun._id}`)} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
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
      {icon}
      {label}
    </button>
  );
}

function GridIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function ActivityIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function ClubsIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function LastRunCard({ run, onNavigate }: { run: Run; onNavigate: () => void }) {
  const date = new Date(run.date).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  return (
    <button onClick={onNavigate} className="w-full text-left">
      <p className="font-semibold text-gray-900">{run.title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{date}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatBox label="Distance" value={`${run.distanceKm.toFixed(2)} km`} />
        <StatBox label="Avg Pace" value={`${run.paceFormatted ?? '—'} /km`} highlight />
        <StatBox label="Time" value={formatDuration(run.durationSec)} />
        <StatBox label="Type" value={run.type.charAt(0).toUpperCase() + run.type.slice(1)} />
      </div>
    </button>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${highlight ? 'text-orange-500' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
