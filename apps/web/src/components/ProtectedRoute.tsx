import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, status } = useAuth();
  const loc = useLocation();
  if (status !== 'ready') return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc }} />;
}
