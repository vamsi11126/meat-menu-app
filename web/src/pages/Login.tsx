import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth, type AuthUser } from '../context/AuthContext';

type LoginResponse = {
  token: string;
  user: AuthUser;
};

const getErrorMessage = (error: unknown) => {
  const fallback = 'Login failed. Please check your email and password.';

  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return fallback;
  }

  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || fallback;
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post<LoginResponse>('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);

      if (response.data.user.role === 'super_admin') {
        navigate('/super-admin/dashboard', { replace: true });
      } else {
        navigate('/owner/dashboard', { replace: true });
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">
              Meat Menu
            </p>
            <h1 className="text-3xl font-bold text-white">Shop Login</h1>
            <p className="mt-3 text-sm text-slate-300">
              Update today&apos;s live meat prices from one clean dashboard.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default Login;
