import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState(''); 
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErr(null);
      await register(email, password, name || undefined);
      nav('/app/dashboard');
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Register failed');
    }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center p-6">
      <form onSubmit={onSubmit} className="bg-white rounded shadow p-6 w-full max-w-md space-y-3">
        <h1 className="text-xl font-semibold">Register</h1>
        <input className="border rounded p-2 w-full" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border rounded p-2 w-full" placeholder="name (optional)" value={name} onChange={e=>setName(e.target.value)} />
        <input className="border rounded p-2 w-full" placeholder="password (min 6)" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="bg-black text-white px-4 py-2 rounded w-full" type="submit">Create account</button>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <div className="text-sm text-gray-600">Have an account? <Link to="/login" className="underline">Login</Link></div>
      </form>
    </div>
  );
}
