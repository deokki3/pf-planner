import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

type User = { id: string; email: string; name: string };
type AuthCtx = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);
const IDLE_MS = 60 * 60 * 1000; // 1h

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const idleTimer = useRef<number | null>(null);

  // restore session on app load
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/api/auth/me');
        setUser(r.data.user);
        startIdleWatch();
      } catch {
        setUser(null);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post('/api/auth/login', { email, password });
    setUser(r.data.user);
    startIdleWatch();
  };

  const register = async (email: string, password: string, name?: string) => {
    const r = await api.post('/api/auth/register', { email, password, name: name ?? email.split('@')[0] });
    setUser(r.data.user);
    startIdleWatch();
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    stopIdleWatch();
    setUser(null);
  };

  // ---- Client idle UX (optional; server already enforces) ----
  const resetIdle = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      // auto-logout on 1h inactivity
      logout();
      alert('1시간 동안 활동이 없어 자동 로그아웃되었습니다.');
    }, IDLE_MS);
  };

  const startIdleWatch = () => {
    stopIdleWatch();
    const events = ['mousemove','keydown','wheel','touchstart','scroll'];
    events.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
  };

  const stopIdleWatch = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
    const events = ['mousemove','keydown','wheel','touchstart','scroll'];
    events.forEach(ev => window.removeEventListener(ev, resetIdle));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};