import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

type User = { id: string; email: string; name: string };
type Status = 'loading' | 'ready';

type AuthCtx = {
  user: User | null;
  status: Status; // ← expose status so guards can wait
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);
const IDLE_MS = 60 * 60 * 1000; // 1h
const EVENTS = ['mousemove','keydown','wheel','touchstart','scroll'] as const;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const idleTimer = useRef<number | null>(null);

  // restore session on app load
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // If api already has withCredentials, you can drop the option below.
        const { data } = await api.get('/auth/me');
        if (!mounted) return;
        setUser(data?.user ?? null);
        if (data?.user) startIdleWatch(); else stopIdleWatch();
      } catch {
        if (!mounted) return;
        setUser(null);
        stopIdleWatch();
      } finally {
        if (mounted) setStatus('ready');
      }
    })();

    // cleanup on unmount
    return () => {
      mounted = false;
      stopIdleWatch();
    };
  }, []);

  const login = async (email: string, password: string) => {
    // NOTE: use '/auth/login' (no extra /api) if your baseURL ends with '/api'
    const r = await api.post('/auth/login', { email, password });
    setUser(r.data.user);
    startIdleWatch();
  };

  const register = async (email: string, password: string, name?: string) => {
    const r = await api.post('/auth/register', { email, password, name: name ?? email.split('@')[0] });
    setUser(r.data.user);
    startIdleWatch();
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    stopIdleWatch();
    setUser(null);
  };

  // ---- Client idle UX (optional; server already enforces) ----
  const resetIdle = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      logout();
      alert('1시간 동안 활동이 없어 자동 로그아웃되었습니다.');
    }, IDLE_MS);
  };

  const startIdleWatch = () => {
    stopIdleWatch();
    EVENTS.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
  };

  const stopIdleWatch = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
    EVENTS.forEach(ev => window.removeEventListener(ev, resetIdle));
  };

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
