import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
