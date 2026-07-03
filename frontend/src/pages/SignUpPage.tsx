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
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

interface AuthResponse {
  accessToken: string;
  user: UserInfo;
}

export default function SignUpPage() {
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
      const res = await api.post<AuthResponse>('/auth/register', data);
      login(res.data.accessToken, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: string })?.error ?? 'Registration failed'
          : 'Registration failed';
      setError('root', { message });
    }
  }

  return (
    <div className="relative min-h-svh flex items-center justify-center px-4 overflow-hidden">
      {/* Tokyo street */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage:
            'url(https://plus.unsplash.com/premium_photo-1661902398022-762e88ff3f82?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dG9reW8lMjBzdHJlZXR8ZW58MHx8MHx8fDA%3D)',
        }}
      />
      {/* Deep indigo overlay to pull out the neon tones */}
      <div className="absolute inset-0 bg-indigo-950/65" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-indigo-950/70 backdrop-blur-lg px-8 py-10 shadow-2xl">

        {/* Logo + back link */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-3xl font-black tracking-tight text-white">
              Pace<span className="text-orange-400">Track</span>
            </p>
            <p className="mt-1 text-xs font-medium tracking-widest uppercase text-indigo-300">
              Run. Track. Improve.
            </p>
          </div>
          <Link
            to={token ? '/dashboard' : '/'}
            className="mt-1 text-xs text-indigo-300 transition-colors hover:text-white"
          >
            {token ? '← Dashboard' : '← Home'}
          </Link>
        </div>

        <h2 className="mb-6 text-lg font-semibold text-white">Create account</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {errors.root && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {errors.root.message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="First name"
              type="text"
              autoComplete="given-name"
              placeholder="Alex"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <InputField
              label="Last name"
              type="text"
              autoComplete="family-name"
              placeholder="Smith"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

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
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-indigo-300">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-400 transition-colors hover:text-orange-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
