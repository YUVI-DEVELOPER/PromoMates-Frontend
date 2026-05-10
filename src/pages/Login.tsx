import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";


type LocationState = {
  from?: {
    pathname?: string;
  };
};


export function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const redirectTo = locationState?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch {
      setError("Login failed. Check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-700">PromoCon</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Sign in</h1>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Superadmin account</p>
          <p className="mt-1">Use the superadmin account created from environment configuration.</p>
        </div>
      </div>
    </section>
  );
}
