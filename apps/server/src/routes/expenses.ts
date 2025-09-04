// apps/server/src/routes/expenses.ts
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import { sessionAuth } from '../middleware/sessionAuth.js';
import type { AuthedRequest } from '../middleware/sessionAuth.js';
import { Expense } from '../models/Expense.js';

const router = Router();
const TZ = 'Asia/Seoul';

// ---- helpers ----
const fmtISO = (d: Date) => d.toISOString().slice(0, 10);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// default range = last 7 days (inclusive, today included)
function defaultRange() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6); // 6 days back + today = 7 days
  return { from: startOfDay(from), to: endOfDay(today) };
}

function parseRange(fromQ?: unknown, toQ?: unknown) {
  if (typeof fromQ === 'string' && typeof toQ === 'string' && fromQ && toQ) {
    const from = startOfDay(new Date(fromQ));
    const to = endOfDay(new Date(toQ));
    return { from, to };
  }
  return defaultRange();
}

// ---- Zod schemas ----
const CreateBody = z.object({
  date: z.union([z.string(), z.date()]),
  category: z.string().min(1),
  amount: z.number().int().nonnegative(),
  memo: z.string().optional(),
});

// ===========================
// GET /api/expenses
// List user expenses (optional ?from=YYYY-MM-DD&to=YYYY-MM-DD)
// ===========================
router.get('/', sessionAuth, async (req: AuthedRequest, res) => {
  try {
    const { from, to } = parseRange(req.query.from, req.query.to);
    const docs = await Expense.find({
      userId: new mongoose.Types.ObjectId(req.user!.userId),
      date: { $gte: from, $lte: to },
    })
      .sort({ date: -1, _id: -1 })
      .lean();

    res.json(docs);
  } catch (e: any) {
    console.error('GET /expenses error:', e?.message || e);
    res.status(500).json({ error: 'List failed' });
  }
});

// ===========================
// POST /api/expenses
// Create one expense
// ===========================
router.post('/', sessionAuth, async (req: AuthedRequest, res) => {
  try {
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) {
      console.error('POST /expenses invalid body:', parsed.error.flatten());
      return res.status(400).json({ error: 'Invalid body' });
    }
    const { date, category, amount, memo } = parsed.data;

    const doc = await Expense.create({
      userId: new mongoose.Types.ObjectId(req.user!.userId),
      date: new Date(date as any),
      category,
      amount,
      memo,
    });

    res.json(doc);
  } catch (e: any) {
    console.error('POST /expenses error:', e?.message || e);
    res.status(500).json({ error: 'Create failed' });
  }
});

// ===========================
// DELETE /api/expenses/:id
// Delete one expense (only if owned by user)
// ===========================
router.delete('/:id', sessionAuth, async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    await Expense.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(req.user!.userId),
    });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE /expenses/:id error:', e?.message || e);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ===========================
// GET /api/expenses/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns:
//  - byCategory: [{ category, total }]
//  - byDay: [{ date: 'YYYY-MM-DD', total }]
//  - byDayCategory: [{ date: 'YYYY-MM-DD', category, total }]
// ===========================
router.get('/summary', sessionAuth, async (req: AuthedRequest, res) => {
  try {
    const { from, to } = parseRange(req.query.from, req.query.to);

    // shared $match
    const matchStage = {
      $match: {
        userId: new mongoose.Types.ObjectId(req.user!.userId),
        date: { $gte: from, $lte: to },
      },
    };

    // group by category
    const byCategory = await Expense.aggregate([
      matchStage,
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $project: { _id: 0, category: '$_id', total: 1 } },
      { $sort: { total: -1 } },
    ]);

    // group by day (string), with timezone for correct local day buckets
    const byDay = await Expense.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ },
          },
          total: { $sum: '$amount' },
        },
      },
      { $project: { _id: 0, date: '$_id', total: 1 } },
      { $sort: { date: 1 } },
    ]);

    // group by day + category (for stacked bars)
    const byDayCategory = await Expense.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } },
            category: '$category',
          },
          total: { $sum: '$amount' },
        },
      },
      { $project: { _id: 0, date: '$_id.date', category: '$_id.category', total: 1 } },
      { $sort: { date: 1, category: 1 } },
    ]);

    res.json({ byCategory, byDay, byDayCategory, range: { from, to } });
  } catch (e: any) {
    console.error('GET /expenses/summary error:', e?.message || e);
    res.status(500).json({ error: 'Summary failed' });
  }
});

export default router;
