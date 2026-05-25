import { useNavigate } from 'react-router-dom';
import { useRuns } from '../hooks/useRuns';
import RunCard from '../components/RunCard';
import { useAuth } from '../hooks/useAuth';

export default function RunHistoryPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { runs, pagination, isLoading, error, page, setPage } = useRuns(10);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-svh bg-slate-950 text-white">
      <main className="mx-auto max-w-lg px-6 py-12">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold tracking-widest uppercase text-orange-500">PaceTrack</p>
            <h1 className="mt-1 text-xl font-semibold text-white">Run History</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              ← Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <span className="text-sm text-slate-500">Loading runs…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !error && runs.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-slate-400">No runs logged yet.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400"
            >
              Log your first run
            </button>
          </div>
        )}

        {/* Run cards */}
        {!isLoading && !error && runs.length > 0 && (
          <div className="flex flex-col gap-3">
            {runs.map((run) => (
              <RunCard key={run._id} run={run} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
