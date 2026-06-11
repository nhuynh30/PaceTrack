import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';
import { useRuns, useRunStats } from '../hooks/useRuns';
import type { Run, RunType } from '../hooks/useRuns';
import { useAuth } from '../hooks/useAuth';

type FilterType = 'all' | 'week' | 'month' | 'easy' | 'hard';

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

function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const diff = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getDateGroup(dateStr: string): string {
  const runDate = new Date(dateStr);
  runDate.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const monday = getMondayOfCurrentWeek();

  if (runDate.getTime() === today.getTime())
    return `Today · ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`;
  if (runDate.getTime() === yesterday.getTime()) return 'Yesterday';
  if (runDate >= monday) return 'This Week';
  return 'Earlier';
}

export default function RunHistoryPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { runs, isLoading, error } = useRuns(500);
  const { stats, isLoading: statsLoading } = useRunStats();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredRuns = useMemo(() => {
    if (filter === 'week') {
      const monday = getMondayOfCurrentWeek();
      return runs.filter(r => new Date(r.date) >= monday);
    }
    if (filter === 'month') {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      return runs.filter(r => new Date(r.date) >= start);
    }
    if (filter === 'easy') return runs.filter(r => r.type === 'easy');
    if (filter === 'hard') return runs.filter(r => r.type !== 'easy');
    return runs;
  }, [runs, filter]);

  const groupedRuns = useMemo(() => {
    const groups = new Map<string, Run[]>();
    for (const run of filteredRuns) {
      const key = getDateGroup(run.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(run);
    }
    return Array.from(groups.entries());
  }, [filteredRuns]);

  const hasEarlierGroup = groupedRuns.some(([g]) => g === 'Earlier');

  return (
    <div className="flex min-h-svh bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-orange-500 text-white shrink-0">
        <div className="px-6 py-8">
          <p className="text-2xl font-black tracking-tight">PaceTrack</p>
          <p className="mt-0.5 text-xs text-orange-200">Run. Track. Improve.</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <NavItem label="Overview" icon={<GridIcon />} onClick={() => navigate('/dashboard')} />
          <NavItem label="Activities" icon={<ActivityIcon />} active onClick={() => {}} />
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
              <button onClick={() => { logout(); navigate('/login', { replace: true }); }} className="text-xs text-orange-200 hover:text-white">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between bg-orange-500 px-4 py-4 text-white">
          <button onClick={() => navigate('/dashboard')} className="text-lg font-black tracking-tight">PaceTrack</button>
          <button onClick={() => navigate('/track')} className="flex items-center gap-1.5 rounded-full bg-white text-red-500 px-4 py-1.5 text-sm font-bold shadow-sm">
            ▶ Start Run
          </button>
        </header>

        <main className="flex-1 p-6 max-w-4xl w-full mx-auto pb-24 md:pb-6">

          {/* Breadcrumb + CTA */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <button onClick={() => navigate('/dashboard')} className="hover:text-orange-500 transition">← Dashboard</button>
              <span>/</span>
              <span className="font-semibold text-gray-900">Activities</span>
            </div>
            <button
              onClick={() => navigate('/track')}
              className="hidden md:flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:shadow-red-300 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150"
            >
              ▶ Start Run
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statsLoading
              ? [...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-200 animate-pulse" />)
              : (
                <>
                  <StatCard icon={<DistanceIcon />} label="TOTAL DISTANCE"
                    value={stats ? stats.totalDistanceKm.toFixed(2) : '—'} unit={stats ? 'km' : ''} sub="All time" />
                  <StatCard icon={<ClockIcon />} label="TOTAL TIME"
                    value={stats ? formatDuration(stats.totalDurationSec) : '—'} sub="All time" />
                  <StatCard icon={<RunsIcon />} label="RUNS"
                    value={stats ? String(stats.count) : '—'} sub="All time" />
                  <StatCard icon={<FlameIcon />} label="BEST PACE"
                    value={stats?.bestPace ? formatPace(stats.bestPace) : undefined}
                    unit={stats?.bestPace ? '/km' : undefined}
                    sub={stats?.bestPace ? undefined : 'Not yet set'} highlight={!!stats?.bestPace} />
                </>
              )
            }
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {(['all', 'week', 'month', 'easy', 'hard'] as FilterType[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500'
                }`}>
                {{ all: 'All', week: 'This week', month: 'This month', easy: 'Easy', hard: 'Hard' }[f]}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <SortIcon /> Newest first
            </div>
          </div>

          {/* Error */}
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-36 rounded-2xl bg-gray-200 animate-pulse" />)}
            </div>
          )}

          {/* All-time empty */}
          {!isLoading && runs.length === 0 && (
            <div className="py-16 text-center">
              <RunnerIcon className="w-14 h-14 mx-auto text-gray-300 mb-4" />
              <p className="font-semibold text-gray-700">No runs logged yet</p>
              <p className="text-sm text-gray-400 mt-1">Start a run to see your history here</p>
              <button onClick={() => navigate('/track')}
                className="mt-5 flex items-center gap-2 mx-auto rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:scale-[1.03] active:scale-[0.97] transition-all">
                ▶ Start your first run
              </button>
            </div>
          )}

          {/* Filter empty */}
          {!isLoading && runs.length > 0 && filteredRuns.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">No runs match this filter.</p>
          )}

          {/* Grouped run list */}
          {!isLoading && groupedRuns.map(([label, groupRuns]) => (
            <section key={label} className="mb-8">
              <p className="text-xs font-normal tracking-wider text-gray-400 mb-3">{label}</p>
              <div className="space-y-3">
                {groupRuns.map(run => (
                  <RunCard key={run._id} run={run} onClick={() => navigate(`/runs/${run._id}`)} />
                ))}
              </div>
            </section>
          ))}

          {/* Earlier empty state — shown when we have runs but none in "Earlier" group */}
          {!isLoading && filteredRuns.length > 0 && !hasEarlierGroup && filter === 'all' && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Earlier</p>
              <div className="rounded-2xl bg-white border border-gray-100 py-12 text-center">
                <RunnerIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">No past runs yet</p>
                <p className="text-sm text-gray-400 mt-1">Start a run to see your history here</p>
              </div>
            </section>
          )}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

// ── Run card ──────────────────────────────────────────────────────────────────

function RunCard({ run, onClick }: { run: Run; onClick: () => void }) {
  const isGps = run.title.startsWith('Live Run');
  const ageMs = Date.now() - new Date(run.date).getTime();
  const isRecentlyLive = isGps && ageMs < 2 * 60 * 60 * 1000; // within 2 hours
  const date = new Date(run.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <button onClick={onClick}
      className="group w-full text-left rounded-2xl bg-white border border-gray-100 p-5 hover:border-orange-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{run.title}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {date}
          </div>
        </div>
        {isRecentlyLive ? (
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        ) : isGps ? (
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M12 3l-4 9h8l-4-9zM12 21l4-9H8l4 9z"/></svg>
            GPS
          </span>
        ) : (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[run.type]}`}>
            {run.type.charAt(0).toUpperCase() + run.type.slice(1)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <MetricBlock label="Distance" value={run.distanceKm.toFixed(2)} unit="km" />
        <MetricBlock label="Pace" value={run.paceFormatted ?? '—'} unit="/km" highlight />
        <MetricBlock label="Time" value={formatDuration(run.durationSec)} />
        <MetricBlock label="Calories" value={run.caloriesBurnt ? `${run.caloriesBurnt}` : '—'} unit="kcal" />
      </div>
    </button>
  );
}

function MetricBlock({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${highlight ? 'bg-orange-50 border-orange-100' : 'bg-gray-100 border-gray-200/70'}`}>
      <p className="text-[11px] font-normal text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-orange-500' : 'text-gray-900'}`}>
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-normal text-gray-400"> {unit}</span>}
      </p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, unit, sub, highlight }: {
  icon: React.ReactNode; label: string; value?: string; unit?: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-orange-400">{icon}</span>
        <p className="text-[11px] font-normal text-gray-400 tracking-wide leading-tight">{label}</p>
      </div>
      {value ? (
        <p className={`text-2xl font-black ${highlight ? 'text-orange-500' : 'text-gray-900'}`}>
          {value}
          {unit && <span className="ml-1 text-xs font-normal text-gray-400">{unit}</span>}
        </p>
      ) : (
        <div className="w-8 h-0.5 bg-orange-400 rounded my-3" />
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Empty state runner SVG ────────────────────────────────────────────────────

function RunnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1.5"/>
      <path d="M7 21l3-6 2 2 4-8"/>
      <path d="M17 21l-4-8-3 2-2-4"/>
      <path d="M6 13l2-2 2 1 3-5 2 1"/>
    </svg>
  );
}

// ── Nav + icons ───────────────────────────────────────────────────────────────

function NavItem({ label, icon, active, onClick }: { label: string; icon?: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active ? 'bg-white/20 text-white' : 'text-orange-100 hover:bg-white/10 hover:text-white'
      }`}>
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

// ── Stat card icons ───────────────────────────────────────────────────────────

function DistanceIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/></svg>;
}
function ClockIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
}
function RunsIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function FlameIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/></svg>;
}
function SortIcon() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>;
}
