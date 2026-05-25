import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../lib/api';
import {
  logRunSchema,
  durationToSeconds,
  formatPace,
  type LogRunFormValues,
} from '../lib/runSchema';

type RunType = 'easy' | 'tempo' | 'long' | 'race';

interface SavedRun {
  _id: string;
  title: string;
  date: string;
  distanceKm: number;
  durationSec: number;
  pace: number;
  paceFormatted: string | null;
  type: RunType;
}

const TYPE_META: Record<RunType, { label: string; badge: string }> = {
  easy:  { label: 'Easy',  badge: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30' },
  tempo: { label: 'Tempo', badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' },
  long:  { label: 'Long',  badge: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30' },
  race:  { label: 'Race',  badge: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30' },
};

export default function LogRunForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [savedRun, setSavedRun] = useState<SavedRun | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogRunFormValues>({
    resolver: zodResolver(logRunSchema),
    defaultValues: { type: 'easy', date: today },
  });

  // Live pace preview while the user types
  const watchedDistance = watch('distanceKm');
  const watchedDuration = watch('duration');
  const liveKm = parseFloat(watchedDistance);
  const liveDurSec = /^\d{1,3}:[0-5]\d$/.test(watchedDuration ?? '')
    ? durationToSeconds(watchedDuration)
    : null;
  const livePace =
    liveDurSec !== null && liveKm > 0 ? formatPace(liveDurSec / liveKm) : null;

  async function onSubmit(values: LogRunFormValues) {
    setApiError(null);
    setSavedRun(null);
    try {
      const durationSec = durationToSeconds(values.duration);
      const { data } = await api.post<SavedRun>('/runs', {
        title: values.title,
        date: values.date,
        distanceKm: parseFloat(values.distanceKm),
        durationSec,
        type: values.type,
      });
      setSavedRun(data);
      reset({ type: 'easy', date: today, title: '', distanceKm: '', duration: '' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Something went wrong. Please try again.';
      setApiError(msg);
    }
  }

  return (
    <div className="w-full">
      {/* ── Form ── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-xl"
      >
        <h2 className="mb-6 text-base font-semibold tracking-tight text-white">
          Log a run
        </h2>

        <div className="flex flex-col gap-5">
          {/* Title */}
          <Field label="Title" error={errors.title?.message}>
            <input
              {...register('title')}
              type="text"
              placeholder="e.g. Morning tempo"
              className={input(!!errors.title)}
            />
          </Field>

          {/* Date */}
          <Field label="Date" error={errors.date?.message}>
            <input
              {...register('date')}
              type="date"
              className={input(!!errors.date)}
            />
          </Field>

          {/* Distance + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Distance (km)" error={errors.distanceKm?.message}>
              <input
                {...register('distanceKm')}
                type="number"
                min="0"
                step="0.01"
                placeholder="10.5"
                className={input(!!errors.distanceKm)}
              />
            </Field>

            <Field label="Duration (mm:ss)" error={errors.duration?.message}>
              <input
                {...register('duration')}
                type="text"
                placeholder="42:30"
                className={input(!!errors.duration)}
              />
            </Field>
          </div>

          {/* Live pace preview */}
          {livePace && (
            <p className="text-sm text-slate-400">
              Estimated pace:{' '}
              <span className="font-semibold text-orange-400">{livePace} /km</span>
            </p>
          )}

          {/* Type */}
          <Field label="Run type" error={errors.type?.message}>
            <select
              {...register('type')}
              className={input(!!errors.type) + ' cursor-pointer'}
            >
              {(Object.keys(TYPE_META) as RunType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_META[t].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {apiError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving…' : 'Save run'}
        </button>
      </form>

      {/* ── Result card ── */}
      {savedRun && (
        <div className="mt-4 animate-slide-up rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 ring-1 ring-orange-500/10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">{savedRun.title}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_META[savedRun.type].badge}`}>
              {TYPE_META[savedRun.type].label}
            </span>
          </div>

          <dl className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Distance" value={`${savedRun.distanceKm} km`} />
            <Stat
              label="Pace"
              value={savedRun.paceFormatted ?? formatPace(savedRun.pace)}
              unit="/km"
              highlight
            />
            <Stat label="Duration" value={formatPace(savedRun.durationSec)} />
          </dl>

          <p className="mt-4 text-center text-xs text-slate-500">
            {new Date(savedRun.date).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${highlight ? 'text-orange-400' : 'text-white'}`}>
        {value}
        {unit && <span className="ml-0.5 text-sm text-slate-400">{unit}</span>}
      </span>
    </div>
  );
}

function input(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100',
    'placeholder:text-slate-600 outline-none transition',
    'focus:ring-2',
    hasError
      ? 'border-red-500/50 focus:ring-red-500/20'
      : 'border-slate-700 focus:border-orange-500/50 focus:ring-orange-500/20',
  ].join(' ');
}