import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErr(null);
      await login(email, password);
      nav('/app/dashboard');
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center p-6">
      <form onSubmit={onSubmit} className="bg-white rounded shadow p-6 w-full max-w-md space-y-3">
        <h1 className="text-xl font-semibold">Login</h1>
        <input className="border rounded p-2 w-full" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border rounded p-2 w-full" placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="bg-black text-white px-4 py-2 rounded w-full" type="submit">Sign in</button>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <div className="text-sm text-gray-600">No account? <Link to="/register" className="underline">Register</Link></div>
      </form>
    </div>
  );
}
