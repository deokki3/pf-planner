import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { sessionAuth, sessionAuthOptional  } from '../middleware/sessionAuth.js';
import type { AuthedRequest } from '../middleware/sessionAuth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const Body = z.object({
      email: z.string().email(),
      // name can be empty in the UI; we'll default it
      name: z.string().trim().optional(),
      password: z.string().min(6),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      console.error('register invalid body:', parsed.error.flatten());
      return res.status(400).json({ error: 'Invalid body' });
    }

    const { email, name, password } = parsed.data;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const displayName = name && name.length ? name : email.split('@')[0];

    const user = await User.create({ email, name: displayName, passwordHash });

    const sess = await Session.create({ userId: user._id });
    res.cookie('sid', String(sess._id), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      // secure: true, // enable in prod HTTPS
    });
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (e: any) {
    console.error('register error:', e?.message || e);
    res.status(500).json({ error: 'Register failed (server)' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const Body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      console.error('login invalid body:', parsed.error.flatten());
      return res.status(400).json({ error: 'Invalid body' });
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const sess = await Session.create({ userId: user._id });
    res.cookie('sid', String(sess._id), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      // secure: true,
    });
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (e: any) {
    console.error('login error:', e?.message || e);
    res.status(500).json({ error: 'Login failed (server)' });
  }
});

// POST /api/auth/logout
router.post('/logout', sessionAuth, async (req: AuthedRequest, res) => {
  try {
    if (req.sessionId) await Session.deleteOne({ _id: req.sessionId });
    res.clearCookie('sid');
    res.json({ ok: true });
  } catch (e: any) {
    console.error('logout error:', e?.message || e);
    res.status(500).json({ error: 'Logout failed (server)' });
  }
});

// GET /api/auth/me

router.get('/me', sessionAuthOptional, (req: AuthedRequest, res) => {
  const u = req.user ?? null;
  if (!u) return res.json({ user: null });
  return res.json({
    user: { id: u.userId, email: u.email, name: u.name },
  });
});
export default router;
