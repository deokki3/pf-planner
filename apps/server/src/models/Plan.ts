import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true }
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // or ObjectId if you prefer
    title: { type: String, required: true },
    targets: { type: [targetSchema], default: [] }
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);
