import { useNavigate } from 'react-router-dom';
import type { Run, RunType } from '../hooks/useRuns';
import { formatPace } from '../lib/runSchema';

export const TYPE_META: Record<RunType, { label: string; badge: string }> = {
  easy:  { label: 'Easy',  badge: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30' },
  tempo: { label: 'Tempo', badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' },
  long:  { label: 'Long',  badge: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30' },
  race:  { label: 'Race',  badge: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30' },
};

export default function RunCard({ run }: { run: Run }) {
  const navigate = useNavigate();
  const pace = run.paceFormatted ?? (run.pace ? formatPace(run.pace) : '—');
  const date = new Date(run.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <button
      onClick={() => navigate(`/runs/${run._id}`)}
      className="w-full text-left rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 transition hover:border-slate-500 hover:bg-slate-800/60 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{run.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{date}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_META[run.type].badge}`}>
          {TYPE_META[run.type].label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Distance" value={`${run.distanceKm} km`} />
        <Stat label="Pace" value={`${pace} /km`} highlight />
        <Stat label="Duration" value={formatPace(run.durationSec)} />
      </dl>
    </button>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${highlight ? 'text-orange-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
