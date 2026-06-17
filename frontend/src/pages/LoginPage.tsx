import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { UserInfo } from '../context/AuthContext';
import InputField from '../components/InputField';

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

interface AuthResponse {
  accessToken: string;
  user: UserInfo;
}

export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post<AuthResponse>('/auth/login', data);
      login(res.data.accessToken, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: string })?.error ?? 'Login failed'
          : 'Login failed';
      setError('root', { message });
    }
  }

  return (
    <div className="relative min-h-svh flex items-center justify-center px-4 overflow-hidden">
      {/* Vestrahorn, Iceland */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage:
            'url(https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?cs=srgb&dl=pexels-souvenirpixels-417074.jpg&fm=jpg)',
        }}
      />
      {/* Cool blue-teal overlay matching the icy palette */}
      <div className="absolute inset-0 bg-slate-950/60" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-lg px-8 py-10 shadow-2xl">

        {/* Logo + back link */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-3xl font-black tracking-tight text-white">
              Pace<span className="text-orange-400">Track</span>
            </p>
            <p className="mt-1 text-xs font-medium tracking-widest uppercase text-slate-400">
              Run. Track. Improve.
            </p>
          </div>
          <Link
            to={token ? '/dashboard' : '/'}
            className="text-xs text-slate-400 hover:text-white transition-colors mt-1"
          >
            {token ? '← Dashboard' : '← Home'}
          </Link>
        </div>

        <h2 className="mb-6 text-lg font-semibold text-white">Sign in</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {errors.root && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {errors.root.message}
            </p>
          )}

          <InputField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <InputField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          No account?{' '}
          <Link to="/signup" className="text-orange-400 transition-colors hover:text-orange-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
