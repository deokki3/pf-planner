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

// READ all
app.get('/api/plans', async (_req, res) => {
  const docs = await Plan.find().lean();
  res.json(docs);
});

// UPDATE
app.put('/api/plans/:id', async (req, res) => {
  const doc = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(doc);
});

// DELETE
app.delete('/api/plans/:id', async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});



// Ask OpenAI for budgeting tips
app.post('/api/ai/budget-advice', async (req, res) => {
  const Body = z.object({
    monthlyIncome: z.number().nonnegative(),
    fixedCosts: z.number().nonnegative(),
    savingsGoal: z.number().nonnegative(),
    locale: z.string().optional() // e.g., "ko-KR" (optional)
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const { monthlyIncome, fixedCosts, savingsGoal, locale = 'ko-KR' } = parsed.data;

  // Helper to show KRW nicely (server-side safety—final formatting will still be rendered on the client)
  const krw = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);

  const system = `
당신은 대한민국 사용자에게 예산 조언을 제공하는 재무 설계자이자 펀드매니저 입니다.
- 반드시 한국어로 답하세요.
- 통화는 KRW(₩) 기준으로 설명하세요(예: ₩${krw(1001000)}).
- 한국 상황에 맞는 카테고리를 우선합니다:
  주거비(전세/월세/관리비), 공과금(전기/가스/수도), 통신비, 식비, 교통(대중교통/유류비), 
  보험/세금(4대보험, 소득세 간이), 교육/자기계발, 여가/문화, 비상금, 저축/투자.
- 과도한 가정이나 확정적인 세법 설명은 피하고, 일반적 가이드로 제시합니다.
- 답변은 3~5개의 핵심 bullet로, 맨 아래에 간단한 예산 배분안을 표 형태(텍스트)로 제시하세요.
`;

  const user = `
월 소득: ${krw(monthlyIncome)}원
고정비(월): ${krw(fixedCosts)}원
목표 저축(월): ${krw(savingsGoal)}원

요청:
1) 불필요한 지출을 줄이는 실천 팁 3~5개(간결한 bullet).
2) 위 수치를 반영한 간단 예산 배분안(텍스트 표). 
   카테고리 예: 저축·투자, 주거비, 공과금, 통신비, 식비, 교통, 여가/기타, 비상금.
3) 금액 표시는 모두 "₩1,001,000"처럼 콤마 포함.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system.trim() },
        { role: 'user', content: user.trim() }
      ],
      temperature: 0.5
    });

    const advice = completion.choices[0]?.message?.content ?? '';
    res.json({ advice });
  } catch (err: any) {
    console.error('OpenAI error:', err?.response?.data || err?.message || err);
    res.status(err?.status ?? 500).json({ error: 'OpenAI request failed' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  // body: { messages: [{ role: 'user'|'assistant'|'system', content: string }] }
  try {
    const Body = z.object({
      messages: z.array(
        z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string()
        })
      )
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    }

    const { messages } = parsed.data;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    res.json({ reply });
  } catch (err: any) {
    console.error('AI chat error:', err?.response?.data || err?.message || err);
    res.status(err?.status ?? 500).json({ error: 'AI chat failed' });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));