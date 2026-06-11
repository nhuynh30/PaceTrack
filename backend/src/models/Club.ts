import mongoose, { Document, Schema } from 'mongoose';

export interface IJoinEvent {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  joinedAt: Date;
}

export interface IClub extends Document {
  name: string;
  description?: string;
  creatorId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  joinHistory: IJoinEvent[];
  createdAt: Date;
}

const clubSchema = new Schema<IClub>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    joinHistory: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        firstName: { type: String, required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export const Club = mongoose.model<IClub>('Club', clubSchema);
