import mongoose, { Document, Schema } from 'mongoose';
import { formatPace } from '../utils/formatPace';

export type RunType = 'easy' | 'tempo' | 'long' | 'race';

export interface IRun extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  title: string;
  notes?: string;
  distanceKm: number;
  durationSec: number;
  /** Pace stored as raw seconds per km (e.g. 312 = 5 min 12 sec/km). */
  pace: number;
  /** Virtual – formatted pace string for API responses (e.g. "5:12"). Not persisted. */
  paceFormatted: string | null;
  type: RunType;
}

const runSchema = new Schema<IRun>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    distanceKm: { type: Number, required: true, min: 0 },
    durationSec: { type: Number, required: true, min: 0 },
    // Stored as raw seconds/km – use paceFormatted in API responses.
    pace: { type: Number },
    type: { type: String, enum: ['easy', 'tempo', 'long', 'race'], required: true },
  },
  {
    timestamps: true,
    // Ensure virtuals are included when documents are serialised to JSON
    // (i.e. when Express calls res.json()).
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---------------------------------------------------------------------------
// Virtual: paceFormatted
// Derived from the stored `pace` (sec/km) – never persisted to MongoDB.
// ---------------------------------------------------------------------------
runSchema.virtual('paceFormatted').get(function (this: IRun): string | null {
  return formatPace(this.pace);
});

// ---------------------------------------------------------------------------
// Hooks: keep `pace` in sync with distanceKm / durationSec
// ---------------------------------------------------------------------------

// Auto-compute pace (sec/km) before every save
runSchema.pre('save', function () {
  if (this.distanceKm > 0) {
    this.pace = this.durationSec / this.distanceKm;
  }
});

// Also recompute on findOneAndUpdate.
// We need to handle partial updates: if only one of the two fields is being
// changed we must fetch the current document to get the other field's value.
runSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate() as Partial<IRun> | null;
  if (!update) return;

  const incomingDist = (update as Record<string, unknown>)['distanceKm'] as number | undefined;
  const incomingDur = (update as Record<string, unknown>)['durationSec'] as number | undefined;

  // Only bother if at least one pace-affecting field is changing.
  if (incomingDist === undefined && incomingDur === undefined) return;

  // Resolve final values, falling back to the persisted document for whichever
  // field was not included in this update.
  let dist = incomingDist;
  let dur = incomingDur;

  if (dist === undefined || dur === undefined) {
    const doc = await this.model.findOne(this.getFilter()).lean<IRun>();
    if (doc) {
      dist ??= doc.distanceKm;
      dur ??= doc.durationSec;
    }
  }

  if (dist !== undefined && dur !== undefined && dist > 0) {
    (update as Record<string, unknown>)['pace'] = dur / dist;
  }
});

export const Run = mongoose.model<IRun>('Run', runSchema);
