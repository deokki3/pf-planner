import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import dotenv from "dotenv"; 


dotenv.config();

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// chat endpoint (flexible, KRW/Korean)
router.post('/chat', async (req, res) => {
  const Body = z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1)
    })),
    context: z.object({
      monthlyIncome: z.number().nonnegative().optional(),
      fixedCosts: z.number().nonnegative().optional(),
      savingsGoal: z.number().nonnegative().optional(),
      locale: z.string().optional()
    }).optional()
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  const { messages, context } = parsed.data;
  const locale = context?.locale ?? 'ko-KR';
  const krw = (n?: number) =>
    typeof n === 'number' ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n) : undefined;

  const sys = [
    '당신은 대한민국 사용자를 돕는 재무 가이드입니다.',
    '- 반드시 한국어로 답변하세요.',
    '- 금액은 KRW(₩)로, 예: ₩1,001,000.',
    '- 표는 사용자가 원할 때만 간결하게 제시하세요.'
  ];
  const ctx: string[] = [];
  if (context?.monthlyIncome != null) ctx.push(`월 소득: ₩${krw(context.monthlyIncome)}`);
  if (context?.fixedCosts != null)   ctx.push(`고정비: ₩${krw(context.fixedCosts)}`);
  if (context?.savingsGoal != null)  ctx.push(`저축 목표: ₩${krw(context.savingsGoal)}`);

  const systemMessage = [sys.join('\n'), ctx.length ? `\n[참고]\n${ctx.join('\n')}` : ''].join('');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemMessage.trim() },
        ...messages
      ]
    });
    res.json({ reply: completion.choices[0]?.message?.content ?? '' });
  } catch (err: any) {
    console.error('OpenAI error', err?.response?.data || err?.message || err);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

export default router;
