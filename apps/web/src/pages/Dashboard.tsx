import { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const KRW = (n: number) => `₩${(n ?? 0).toLocaleString('ko-KR')}`;
const COLORS = [
    '#6366F1', // indigo
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#06B6D4', // cyan
    '#8B5CF6', // violet
    '#84CC16', // lime
    '#F472B6', // pink
    '#14B8A6', // teal
    '#FB923C', // orange
  ];


  // stable color for a string (e.g., category name)
  const colorFor = (key: string) => {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  };

  const dayKey = (d: string | Date) =>
  new Date(d).toISOString().slice(0, 10);



export default function Dashboard() {

  const [stackedData, setStackedData] = useState<Array<Record<string, any>>>([]);
  const [cats, setCats] = useState<string[]>([]);

  
  const [cat, setCat] = useState<{ category: string; total: number }[]>([]);
  const [daily, setDaily] = useState<{ date: string; total: number }[]>([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [category, setCategory] = useState('식비');
  const [amount, setAmount] = useState<number>(15000);
  const [memo, setMemo] = useState('');
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  // default: last 7 days (inclusive)
const today = new Date();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(today.getDate() - 4); // 4 days back + today = 5 days

const [from, setFrom] = useState<string>(fmtDate(sevenDaysAgo));
const [to, setTo] = useState<string>(fmtDate(today));



// inclusive day range: [from ... to]
const enumerateDays = (fromISO: string, toISO: string): string[] => {
  const res: string[] = [];
  const from = new Date(fromISO + 'T00:00:00Z');
  const to = new Date(toISO + 'T00:00:00Z');
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    res.push(fmtDate(d));
  }
  return res;
};
 
const loadSummary = async () => {
  const r = await api.get('/expenses/summary', { params: { from, to } });
  setCat(r.data?.byCategory ?? []);
  setDaily(r.data?.byDay ?? []);
};

const loadStacked = async () => {
  // fetch only the selected period
  const r = await api.get('/expenses', { params: { from, to } });
  const expenses: Array<{ date: string; category: string; amount: number }> = r.data ?? [];

  // collect categories + date→category sums
  const categories = new Set<string>();
  const byDay = new Map<string, Record<string, number>>();

  for (const e of expenses) {
    const dk = fmtDate(new Date(e.date));
    categories.add(e.category);
    if (!byDay.has(dk)) byDay.set(dk, {});
    const row = byDay.get(dk)!;
    row[e.category] = (row[e.category] ?? 0) + Number(e.amount);
  }

  const catsArr = Array.from(categories).sort();
  setCats(catsArr);

  // enumerate all days in range; fill missing days & missing categories with 0
  const allDays = enumerateDays(from, to);
  const rows = allDays.map(dk => {
    const sums = byDay.get(dk) ?? {};
    const rec: Record<string, number | string> = { date: dk };
    catsArr.forEach(c => { rec[c] = sums[c] ?? 0; });
    return rec;
  });

  setStackedData(rows);



};


useEffect(() => {
  // whenever from/to changes, refresh both charts
  void (async () => {
    await Promise.all([loadSummary(), loadStacked()]);
  })();
}, [from, to]);
const addExpense = async () => {
  await api.post('/expenses', { date, category, amount, memo });
  setMemo('');
  await Promise.all([loadSummary(), loadStacked()]);
};
  
  return (
    <div className="p-6 space-y-6">
      {/* Filters + quick add */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4 space-y-3">
          <h2 className="font-semibold">기간 필터</h2>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="border rounded p-2" value={from} onChange={e=>setFrom(e.target.value)} />
            <input type="date" className="border rounded p-2" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <button className="bg-gray-900 text-white px-3 py-1.5 rounded" onClick={loadSummary}>적용</button>
        </div>

        <div className="bg-white rounded shadow p-4 space-y-3">
          <h2 className="font-semibold">지출 등록</h2>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="border rounded p-2" value={date} onChange={e=>setDate(e.target.value)} />
            <input className="border rounded p-2" value={category} onChange={e=>setCategory(e.target.value)} placeholder="카테고리" />
            <input type="number" className="border rounded p-2" value={amount} onChange={e=>setAmount(Number(e.target.value))} placeholder="금액(KRW)" />
            <input className="border rounded p-2" value={memo} onChange={e=>setMemo(e.target.value)} placeholder="메모" />
          </div>
          <button className="bg-blue-600 text-white px-3 py-1.5 rounded" onClick={addExpense}>+ 추가</button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">카테고리별 지출</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
            <Pie
                data={cat}
                dataKey="total"
                nameKey="category"
                outerRadius="60%"
                label
                
              >
                {cat.map((entry, i) => (
                  <Cell key={`slice-${i}`} fill={colorFor(entry.category)} />
                ))}
              </Pie>
                <Tooltip  formatter={(v: number) => `₩${v.toLocaleString('ko-KR')}`} />
                <Legend   wrapperStyle={{
    fontSize: '12px', // 글씨 크기 줄이기
    padding: '0 10px', // 좌우 여백 조정
  }}/>
                </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">일자별 지출 (카테고리 스택)</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v: number) => `₩${v.toLocaleString('ko-KR')}`} />
              <Tooltip formatter={(v: number) => `₩${v.toLocaleString('ko-KR')}`} />
              <Legend />
                {cats.map(c => (
                  <Bar key={c} dataKey={c} name={c} stackId="day" fill={colorFor(c)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
