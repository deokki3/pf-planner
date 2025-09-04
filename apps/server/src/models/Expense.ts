import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true }, // KRW integer
    memo: { type: String }
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
