import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    lastActivity: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

export const Session = mongoose.model('Session', sessionSchema);