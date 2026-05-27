import mongoose, { Document, Schema } from 'mongoose';

export interface IClub extends Document {
  name: string;
  description?: string;
  creatorId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const clubSchema = new Schema<IClub>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

export const Club = mongoose.model<IClub>('Club', clubSchema);
