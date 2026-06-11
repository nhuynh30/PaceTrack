import { z } from 'zod';

const durationRegex = /^\d{1,3}:[0-5]\d$/;

export const logRunSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(80, 'Title must be 80 characters or fewer'),

  date: z
    .string()
    .min(1, 'Date is required')
    .refine((v) => !isNaN(Date.parse(v)), 'Enter a valid date'),

  distanceKm: z
    .string()
    .min(1, 'Distance is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a positive distance'),

  duration: z
    .string()
    .min(1, 'Duration is required')
    .regex(durationRegex, 'Use mm:ss format — e.g. 42:30'),

  type: z.enum(['easy', 'tempo', 'long', 'race']),
});

export type LogRunFormValues = z.infer<typeof logRunSchema>;

/** Convert "mm:ss" string → total seconds */
export function durationToSeconds(duration: string): number {
  const [mm, ss] = duration.split(':').map(Number);
  return mm * 60 + ss;
}

/** Format raw seconds/km → "mm:ss" string */
export function formatPace(paceSeconds: number): string {
  const total = Math.round(paceSeconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}