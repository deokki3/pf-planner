import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import expenseRoutes from './routes/expenses.js';
import planRoutes from './routes/plans.js';
import aiRoutes from './routes/ai.js';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { log, logger } from './utils/logger.js';

dotenv.config();




const app = express();
app.use(cors({ 
  origin: 'http://localhost:5173',
  credentials: true, }));
app.use(cookieParser());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/ai', aiRoutes);

// morgan -> winston stream (HTTP access logs)
const stream = {
  write: (message: string) => logger.info(message.trim(), { scope: 'http' })
};
// Dev-friendly format in development, common in prod
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream }));

// Example startup logs
log.info('Starting server...');



app.get('/api/debug/cookies', (req, res) => {
  res.json({ cookies: req.cookies });
});
app.get('/api/debug/headers', (req, res) => {
  res.json({ headers: req.headers });
});


const MONGO = process.env.MONGO_URL || process.env.MONGODB_URI;
if (!MONGO) {
  console.error('❌ Missing MONGO_URL/MONGODB_URI');
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  log.error(new Error('Unhandled Rejection'), { reason });
});
process.on('uncaughtException', (err) => {
  log.error(err);
  // Optional: process.exit(1);
});

mongoose.connect(MONGO).then(() => {
  console.log('✅ MongoDB connected');
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`🚀 API on http://localhost:${port}`));
});
