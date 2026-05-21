import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-svh bg-slate-950 text-white">
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm font-bold tracking-widest uppercase text-orange-500">PaceTrack</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
        {user && (
          <p className="mt-2 text-slate-400">
            Welcome, {user.firstName} {user.lastName}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="mt-8 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
