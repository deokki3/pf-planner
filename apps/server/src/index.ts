import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { z } from 'zod';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

// Connect Mongo
const MONGODB_URI = process.env.MONGODB_URI!;
mongoose.connect(MONGODB_URI).then(() => console.log('✅ MongoDB connected')).catch(console.error);

// Example Mongoose model
const PlanSchema = new mongoose.Schema({
  userId: String,
  title: String,
  targets: [{ name: String, amount: Number, dueDate: Date }],
  createdAt: { type: Date, default: Date.now },
});
const Plan = mongoose.model('Plan', PlanSchema);

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Create a plan
app.post('/api/plans', async (req, res) => {
  const Body = z.object({
    userId: z.string(),
    title: z.string(),
    targets: z.array(z.object({ name: z.string(), amount: z.number(), dueDate: z.string() })),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const doc = await Plan.create({
    ...parsed.data,
    targets: parsed.data.targets.map(t => ({ ...t, dueDate: new Date(t.dueDate) })),
  });
  res.json(doc);
});

// Ask OpenAI for budgeting tips
app.post('/api/ai/budget-advice', async (req, res) => {
  const Body = z.object({ monthlyIncome: z.number(), fixedCosts: z.number(), savingsGoal: z.number() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { monthlyIncome, fixedCosts, savingsGoal } = parsed.data;
  const prompt = `Give concise budgeting advice for a user. Income: ${monthlyIncome}, fixed costs: ${fixedCosts}, target monthly savings: ${savingsGoal}. Return 3 bullet points.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ advice: completion.choices[0]?.message?.content ?? '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));