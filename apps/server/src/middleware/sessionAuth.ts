import type { Request, Response, NextFunction } from 'express';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export interface AuthedRequest extends Request {
  user?: { userId: string; email: string; name: string };
  sessionId?: string;
}

const IDLE_MS = 60 * 60 * 1000; // 1 hour

export const sessionAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const sid = req.cookies?.sid as string | undefined;
  if (!sid) return res.status(401).json({ error: 'Not authenticated' });

  const sess = await Session.findById(sid);
  if (!sess) {
    res.clearCookie('sid');
    return res.status(401).json({ error: 'Session expired' });
  }

  const now = Date.now();
  if (now - new Date(sess.lastActivity).getTime() > IDLE_MS) {
    await Session.deleteOne({ _id: sess._id });
    res.clearCookie('sid');
    return res.status(401).json({ error: 'Session idle timeout' });
  }

  // load user (lightweight projection)
  const user = await User.findById(sess.userId).lean();
  if (!user) {
    await Session.deleteOne({ _id: sess._id });
    res.clearCookie('sid');
    return res.status(401).json({ error: 'User not found' });
  }

  // sliding renewal: bump lastActivity
  sess.lastActivity = new Date();
  await sess.save();

  // attach
  req.user = { userId: String(user._id), email: user.email, name: user.name };
  req.sessionId = String(sess._id);

  // refresh cookie (rolling maxAge)
  res.cookie('sid', String(sess._id), {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true,              // enable in production (https)
    maxAge: IDLE_MS,              // renew on each request
  });

  next();
};


// --- 401 탐지 -- 
export const sessionAuthOptional = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const sid = req.cookies?.sid as string | undefined;
  if (!sid) return next(); // no cookie → anonymous, proceed

  try {
    const sess = await Session.findById(sid);
    if (!sess) {
      res.clearCookie('sid');
      return next(); // invalid session → anonymous
    }

    const now = Date.now();
    if (now - new Date(sess.lastActivity).getTime() > IDLE_MS) {
      await Session.deleteOne({ _id: sess._id });
      res.clearCookie('sid');
      return next(); // idle timeout → anonymous
    }

    const user = await User.findById(sess.userId).lean();
    if (!user) {
      await Session.deleteOne({ _id: sess._id });
      res.clearCookie('sid');
      return next(); // user missing → anonymous
    }

    // sliding renewal
    sess.lastActivity = new Date();
    await sess.save();

    // attach (same shape as sessionAuth)
    req.user = { userId: String(user._id), email: user.email, name: user.name };
    req.sessionId = String(sess._id);

    // refresh cookie
    res.cookie('sid', String(sess._id), {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true,              // enable in production (https)
      maxAge: IDLE_MS,
    });

    return next();
  } catch {
    // on any error, do NOT block hydration
    return next();
  }
};