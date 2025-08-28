import { useEffect, useState,useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Square } from 'lucide-react';


// Env: set apps/web/.env.local -> VITE_API_URL=http://localhost:4000
const API = import.meta.env.VITE_API_URL;

// KRW formatter (1,001,000 style)
const formatKRw = (n: number) =>  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(n);
const parseNumber = (s: string) =>
  Number(s.replace(/[^\d]/g, '')) || 0;

type PlanTarget = { name: string; amount: number; dueDate: string };
type ChatRole = 'user' | 'assistant';
type ChatMsg = { role: ChatRole; content: string };
interface Plan {
  _id: string;
  userId: string;
  title: string;
  targets: PlanTarget[];
  createdAt?: string;
}

export default function App() {
  // --- AI advice state ---
  const [income, setIncome] = useState<number>(4_000_000);
  const [fixed, setFixed] = useState<number>(1_500_000);
  const [goal, setGoal] = useState<number>(11_000_000);
  const [advice, setAdvice] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // --- Plans state ---
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);


  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');

  const [chatLoading, setChatLoading] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  // Fetch plans
  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      setPlanError(null);
      const r = await axios.get<Plan[]>(`${API}/api/plans`);
      setPlans(r.data);
    } catch (e: any) {
      setPlanError(e?.response?.data?.error ?? 'Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Ask AI
  const askAI = async () => {
    setAiLoading(true);
    setAiError(null);
  
    try {
      // 1) 사용자의 질문을 대화에 추가
      const questionText = `월 소득: ₩${income.toLocaleString('ko-KR')}, 
      고정비: ₩${fixed.toLocaleString('ko-KR')}, 
      저축 목표: ₩${goal.toLocaleString('ko-KR')}`;
      
      const userMsg: ChatMsg = { role: 'user', content: questionText };
      const newChat = [...chat, userMsg];
      setChat(newChat);
  
      // 2) 서버 호출
      const r = await axios.post(`${API}/api/ai/budget-advice`, {
        monthlyIncome: Number(income),
        fixedCosts: Number(fixed),
        savingsGoal: Number(goal),
        locale: 'ko-KR'
      });
  
      const replyText = r.data.advice ?? '';
      // 3) 답변을 chat state에 추가 (m.content에 들어감)
      const assistantMsg: ChatMsg = { role: 'assistant', content: replyText };
      setChat(prev => [...prev, assistantMsg]);
  
  
    } catch (e: any) {
      setAiError(e?.response?.data?.error ?? 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  // Delete plan
  const deletePlan = async (id: string) => {
    try {
      await axios.delete(`${API}/api/plans/${id}`);
      setPlans(prev => prev.filter(p => p._id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Delete failed');
    }
  };

  // Create a sample plan (for quick testing)
  const createSamplePlan = async () => {
    try {
      const payload = {
        userId: 'u1',
        title: 'My Plan',
        targets: [
          { name: 'Emergency fund', amount: 2_000_000, dueDate: '2025-12-31' },
          { name: 'New laptop', amount: 1_001_000, dueDate: '2025-10-01' },
        ],
      };
      await axios.post(`${API}/api/plans`, payload);
      await fetchPlans();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Create failed');
    }
  };



  const sendMessage = async () => {
    if (!input.trim()) return;
  
    // 1) 내 메시지를 추가
    const userMsg: ChatMsg = { role: 'user', content: input };
    const newChat: ChatMsg[] = [...chat, userMsg];
    setChat(newChat);
    setInput('');
  
    // prepare abort controller
  const controller = new AbortController();
  chatAbortRef.current = controller;
  setChatLoading(true);

  try {
    // send whole chat to the server (adjust endpoint if needed)
    const r = await axios.post(
      `${API}/api/ai/chat`,
      { messages: newChat.map(m => ({ role: m.role, content: m.content })) },
      { signal: controller.signal }
    );

    const replyText: string = r.data.reply ?? '';
    const assistantMsg: ChatMsg = { role: 'assistant', content: replyText };
    setChat(prev => [...prev, assistantMsg]);
  } catch (err: any) {
    if (axios.isCancel?.(err) || err?.message === 'canceled') {
      const note: ChatMsg = { role: 'assistant', content: '⏹️ 응답을 취소했어요.' };
      setChat(prev => [...prev, note]);
    } else {
      const note: ChatMsg = { role: 'assistant', content: '⚠️ 오류: 응답을 가져오지 못했습니다.' };
      setChat(prev => [...prev, note]);
    }
  } finally {
    setChatLoading(false);
    chatAbortRef.current = null;
  }
  };

  const stopSending = () => {
    chatAbortRef.current?.abort();
  };
  

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* wider container + 2 columns on desktop */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">개인 재무 설계</h1>
            <img src="/pf-planner-logo.svg" className="h-10 w-10" alt="logo" />
          </header>
  
          {/* AI Advice Card */}
          <section className="p-5 bg-white rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">AI로 보는 간단 재무 설계</h2>
  
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span>월 수입 (원)</span>
                <input
                  className="mt-1 w-full border rounded p-2 text-right"
                  type="text"
                  value={income ? formatKRw(income) : ''}
                  onChange={e => setIncome(parseNumber(e.target.value))}
                />
              </label>
  
              <label className="block">
                <span>고정 지출 (원)</span>
                <input
                  className="mt-1 w-full border rounded p-2 text-right"
                  type="text"
                  value={fixed ? formatKRw(fixed) : ''}
                  onChange={e => setFixed(parseNumber(e.target.value))}
                />
              </label>
  
              <label className="block">
                <span>목표 금액 (원)</span>
                <input
                  className="mt-1 w-full border rounded p-2 text-right"
                  type="text"
                  value={goal ? formatKRw(goal) : ''}
                  onChange={e => setGoal(parseNumber(e.target.value))}
                />
              </label>
            </div>
  
            <button
              className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
              onClick={askAI}
              disabled={aiLoading}
            >
              {aiLoading ? '생각중...' : 'AI에게 물어봐!'}
            </button>
  
            {aiError && <div className="text-red-600">{aiError}</div>}
          </section>
  
          {/* Plans Card */}
          <section className="p-5 bg-white rounded shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plans</h2>
              <div className="space-x-2">
                <button
                  className="rounded bg-gray-800 text-white px-3 py-1.5"
                  onClick={fetchPlans}
                  disabled={loadingPlans}
                >
                  {loadingPlans ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  className="rounded bg-blue-600 text-white px-3 py-1.5"
                  onClick={createSamplePlan}
                >
                  + Sample Plan
                </button>
              </div>
            </div>
  
            {planError && <div className="text-red-600">{planError}</div>}
  
            <ul className="space-y-2">
              {plans.map(p => (
                <li key={p._id} className="p-3 bg-white border rounded">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-gray-500">
                        {p.createdAt ? `created ${new Date(p.createdAt).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <button
                      className="rounded bg-red-600 text-white px-3 py-1.5"
                      onClick={() => deletePlan(p._id)}
                    >
                      Delete
                    </button>
                  </div>
  
                  {/* Targets with KRW formatting */}
                  {Array.isArray(p.targets) && p.targets.length > 0 && (
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      {p.targets.map(t => (
                        <div
                          key={`${p._id}-${t.name}-${t.dueDate}`}
                          className="flex items-center justify-between"
                        >
                          <span>{t.name}</span>
                          <span>
                            ₩{formatKRw(Number(t.amount))}{' '}
                            <span className="text-gray-500">
                              (due {new Date(t.dueDate).toLocaleDateString()})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
  
              {plans.length === 0 && !loadingPlans && (
                <li className="text-gray-600">No plans yet.</li>
              )}
            </ul>
          </section>
        </div>
  
        {/* RIGHT COLUMN — BIG CHAT PANEL */}
        <section className="md:sticky md:top-6 h-[calc(100vh-3rem)] flex flex-col bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-3">AI Chat</h2>
  
          {/* Messages area grows to fill */}
          <div className="flex-1 overflow-y-auto border rounded p-3 mb-3">
            {chat.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-blue-700 mb-3' : 'text-green-700 mb-3'}>
                <strong>{m.role === 'user' ? '👤 나' : '🤖 AI'}:</strong>
                <div className="prose prose-sm max-w-none mt-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
  
          {/* Input row sticks at bottom of the panel */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-t pt-3">
            <input
              className="flex-1 border rounded-lg p-3"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="AI에게 질문을 입력하세요..."
              disabled={chatLoading}
            />

            {!chatLoading ? (
              <button
                onClick={sendMessage}
                className="inline-flex items-center justify-center rounded-full h-11 w-11 bg-black text-white hover:opacity-90 transition disabled:opacity-60"
                disabled={!input.trim()}
                title="보내기"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                onClick={stopSending}
                className="inline-flex items-center justify-center rounded-full h-11 w-11 bg-red-600 text-white hover:opacity-90 transition"
                title="중지"
              >
                <Square size={18} />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
  
}