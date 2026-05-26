import { useNavigate } from 'react-router-dom';
import { useRuns } from '../hooks/useRuns';
import type { Run, RunType } from '../hooks/useRuns';
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

export default function RunHistoryPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { runs, pagination, isLoading, error, page, setPage } = useRuns(10);

  return (
    <div className="flex min-h-svh bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-orange-500 text-white shrink-0">
        <div className="px-6 py-8">
          <p className="text-2xl font-black tracking-tight">PaceTrack</p>
          <p className="mt-0.5 text-xs text-orange-200">Run. Track. Improve.</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <NavItem label="Overview" onClick={() => navigate('/dashboard')} />
          <NavItem label="Activities" active onClick={() => {}} />
          <NavItem label="Track Run" onClick={() => navigate('/track')} />
        </nav>
        <div className="p-4 border-t border-orange-400">
          <button onClick={() => { logout(); navigate('/login', { replace: true }); }} className="text-sm text-orange-200 hover:text-white">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between bg-orange-500 px-4 py-4 text-white">
          <button onClick={() => navigate('/dashboard')} className="text-lg font-black tracking-tight">
            PaceTrack
          </button>
          <button onClick={() => navigate('/track')} className="rounded-lg bg-white text-orange-500 px-3 py-1.5 text-sm font-bold">
            Start Run
          </button>
        </header>

        <main className="flex-1 p-6 max-w-3xl w-full mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-orange-500 mb-1">
                ← Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
            </div>
            <button
              onClick={() => navigate('/track')}
              className="hidden md:block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition"
            >
              Start Run +
            </button>
          </div>

          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && runs.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-4xl mb-3">🏃</p>
              <p className="text-gray-500 font-medium">No runs logged yet.</p>
              <button
                onClick={() => navigate('/track')}
                className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition"
              >
                Start your first run
              </button>
            </div>
          )}

          {/* Run list */}
          {!isLoading && !error && runs.length > 0 && (
            <div className="space-y-3">
              {runs.map((run) => <RunRow key={run._id} run={run} onClick={() => navigate(`/runs/${run._id}`)} />)}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-400">Page {pagination.page} of {pagination.pages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function RunRow({ run, onClick }: { run: Run; onClick: () => void }) {
  const date = new Date(run.date).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-white border border-gray-200 p-5 hover:border-orange-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{run.title}</p>
          <p className="mt-0.5 text-xs text-gray-400">{date}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[run.type]}`}>
          {run.type.charAt(0).toUpperCase() + run.type.slice(1)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Distance" value={`${run.distanceKm} km`} />
        <Stat label="Pace" value={`${run.paceFormatted ?? '—'} /km`} highlight />
        <Stat label="Time" value={formatDuration(run.durationSec)} />
      </div>
    </button>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${highlight ? 'text-orange-500' : 'text-gray-900'}`}>{value}</p>
    </div>
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
