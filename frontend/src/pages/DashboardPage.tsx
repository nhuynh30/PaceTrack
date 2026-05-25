import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LogRunForm from '../components/LogRunForm';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-svh bg-slate-950 text-white">
      <main className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold tracking-widest uppercase text-orange-500">PaceTrack</p>
            {user && (
              <p className="mt-1 text-slate-400 text-sm">
                Welcome back, {user.firstName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/runs')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              View history
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>

        <LogRunForm />
      </main>
    </div>
  );
}
