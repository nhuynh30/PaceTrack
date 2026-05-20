import mongoose, { Document, Schema } from 'mongoose';

export type RunType = 'easy' | 'tempo' | 'long' | 'race';

export interface IRun extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  title: string;
  notes?: string;
  distanceKm: number;
  durationSec: number;
  pace: number;
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
    pace: { type: Number },
    type: { type: String, enum: ['easy', 'tempo', 'long', 'race'], required: true },
  },
  { timestamps: true }
);

// Auto-compute pace (sec/km) before every save
runSchema.pre('save', async function () {
  if (this.distanceKm > 0) {
    this.pace = this.durationSec / this.distanceKm;
  }
});

// Also recompute on findOneAndUpdate
runSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate() as Partial<IRun> | null;
  if (update) {
    const dist = update.distanceKm;
    const dur = update.durationSec;
    if (dist !== undefined && dur !== undefined && dist > 0) {
      (update as Record<string, unknown>).pace = dur / dist;
    }
  }
});

export const Run = mongoose.model<IRun>('Run', runSchema);
