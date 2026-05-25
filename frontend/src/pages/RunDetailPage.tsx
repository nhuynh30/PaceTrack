import { useNavigate, useParams } from 'react-router-dom';
import { useRun } from '../hooks/useRuns';
import type { RunType } from '../hooks/useRuns';
import { useAuth } from '../hooks/useAuth';

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
            <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${TYPE_COLORS[run.type]}`}>
              {run.type.charAt(0).toUpperCase() + run.type.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-8">{date}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard label="Distance" value={`${run.distanceKm} km`} />
            <StatCard label="Avg Pace" value={`${run.paceFormatted ?? '—'} /km`} highlight />
            <StatCard label="Duration" value={formatDuration(run.durationSec)} />
            <StatCard label="Run Type" value={run.type.charAt(0).toUpperCase() + run.type.slice(1)} />
          </div>

          {/* Notes */}
          {run.notes && (
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.notes}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate, onLogout }: { onNavigate: (path: string) => void; onLogout: () => void }) {
  return (
    <aside className="hidden md:flex w-56 flex-col bg-orange-500 text-white shrink-0">
      <div className="px-6 py-8">
        <p className="text-2xl font-black tracking-tight">PaceTrack</p>
        <p className="mt-0.5 text-xs text-orange-200">Run. Track. Improve.</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        <NavItem label="Overview" onClick={() => onNavigate('/dashboard')} />
        <NavItem label="Activities" active onClick={() => {}} />
        <NavItem label="Track Run" onClick={() => onNavigate('/track')} />
      </nav>
      <div className="p-4 border-t border-orange-400">
        <button onClick={onLogout} className="text-sm text-orange-200 hover:text-white">Sign out</button>
      </div>
    </aside>
  );
}

function NavItem({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active ? 'bg-white/20 text-white' : 'text-orange-100 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
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
