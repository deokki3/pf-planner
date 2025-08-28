import { useState } from 'react';
import axios from 'axios';

function App() {
  const [income, setIncome] = useState(4000000);
  const [fixed, setFixed] = useState(2000000);
  const [goal, setGoal] = useState(600000);

  const [advice, setAdvice] = useState<string>('');

  const askAI = async () => {
    const res = await axios.post('http://localhost:4000/api/ai/budget-advice', {
      monthlyIncome: Number(income),
      fixedCosts: Number(fixed),
      savingsGoal: Number(goal),
    });
    setAdvice(res.data.advice);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Personal Finance Planner</h1>
        <div className="grid grid-cols-1 gap-3">
          <label className="block">
            <span>Monthly Income (KRW)</span>
            <input className="mt-1 w-full border rounded p-2" value={income} onChange={e => setIncome(Number(e.target.value))} />
          </label>
          <label className="block">
            <span>Fixed Costs (KRW)</span>
            <input className="mt-1 w-full border rounded p-2" value={fixed} onChange={e => setFixed(Number(e.target.value))} />
          </label>
          <label className="block">
            <span>Savings Goal (KRW)</span>
            <input className="mt-1 w-full border rounded p-2" value={goal} onChange={e => setGoal(Number(e.target.value))} />
          </label>
          <button className="rounded bg-black text-white px-4 py-2" onClick={askAI}>
            Ask AI for Advice
          </button>
        </div>

        {advice && (
          <div className="mt-4 p-4 bg-white rounded shadow">
            <h2 className="font-semibold mb-2">AI Advice</h2>
            <pre className="whitespace-pre-wrap">{advice}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;