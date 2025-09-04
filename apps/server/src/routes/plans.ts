import { Router } from 'express';
import { z } from 'zod';
import { Plan } from '../models/Plan.js';

const router = Router();

// CREATE
router.post('/', async (req, res) => {
  const Body = z.object({
    userId: z.string().min(1),
    title: z.string().min(1),
    targets: z.array(
      z.object({
        name: z.string().min(1),
        amount: z.number().nonnegative(),
        dueDate: z.string().or(z.date())
      })
    ).default([])
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  const { userId, title, targets } = parsed.data;
  const doc = await Plan.create({
    userId,
    title,
    targets: targets.map(t => ({ ...t, dueDate: new Date(t.dueDate as string) }))
  });
  res.json(doc);
});

// READ all (optionally by userId ?userId=...)
router.get('/', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const docs = await Plan.find(userId ? { userId } : {}).sort({ createdAt: -1 }).lean();
  res.json(docs);
});

// UPDATE
router.put('/:id', async (req, res) => {
  const doc = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(doc);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
