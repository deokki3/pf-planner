import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white border-b">
      <nav className="max-w-6xl mx-auto p-4 flex items-center justify-between">
        <Link to="/" className="font-bold">PF Planner</Link>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <NavLink to="/app/dashboard" className="text-sm text-gray-700">Dashboard</NavLink>
              <span className="text-sm text-gray-600">{user.name}</span>
              <button onClick={logout} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded">Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="text-sm text-gray-700">Login</NavLink>
              <NavLink to="/register" className="text-sm text-gray-700">Register</NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
