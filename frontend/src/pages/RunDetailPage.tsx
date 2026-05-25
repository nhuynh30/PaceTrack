import { useNavigate, useParams } from 'react-router-dom';
import { useRun } from '../hooks/useRuns';
import { TYPE_META } from '../components/RunCard';
import { formatPace } from '../lib/runSchema';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { run, isLoading, error } = useRun(id!);

  if (isLoading) {
    return (
      <div className="min-h-svh bg-slate-950 flex items-center justify-center">
        <span className="text-sm text-slate-500">Loading…</span>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="min-h-svh bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">{error ?? 'Run not found.'}</p>
          <button
            onClick={() => navigate('/runs')}
            className="mt-4 text-sm text-orange-400 hover:text-orange-300"
          >
            ← Back to history
          </button>
        </div>
      </div>
    );
  }

  const pace = run.paceFormatted ?? (run.pace ? formatPace(run.pace) : '—');
  const date = new Date(run.date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format durationSec as h:mm:ss or mm:ss
  const totalSec = run.durationSec;
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const durationFormatted = hours > 0
    ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="min-h-svh bg-slate-950 text-white">
      <main className="mx-auto max-w-lg px-6 py-12">

        {/* Back */}
        <button
          onClick={() => navigate('/runs')}
          className="mb-8 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
        >
          ← Run History
        </button>

        {/* Title + badge */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white leading-tight">{run.title}</h1>
          <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${TYPE_META[run.type].badge}`}>
            {TYPE_META[run.type].label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{date}</p>

        {/* Stats grid */}
        <dl className="mt-8 grid grid-cols-2 gap-4">
          <StatCard label="Distance" value={`${run.distanceKm} km`} />
          <StatCard label="Pace" value={`${pace} /km`} highlight />
          <StatCard label="Duration" value={durationFormatted} />
          <StatCard label="Run Type" value={TYPE_META[run.type].label} />
        </dl>

        {/* Notes */}
        {run.notes && (
          <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Notes</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{run.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${highlight ? 'text-orange-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
