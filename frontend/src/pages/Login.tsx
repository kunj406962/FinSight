import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successMessage = (location.state as { message?: string } | null)?.message;

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Login failed. Check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Form Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Sign in to FinSight
          </h1>
          <p className="text-xs text-slate-400">
            Enter your credentials to access your financial insights dashboard.
          </p>
        </div>

        {/* Dynamic Alerts */}
        {successMessage && <Alert type="success" message={successMessage} />}
        {error && <Alert type="error" message={error} />}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="flex justify-end pt-0.5">
            <Link
              to="/forgot-password"
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors duration-150"
            >
              Forgot your password?
            </Link>
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>

        {/* Footer Actions & Account Links */}
        <div className="pt-4 border-t border-slate-900 space-y-3 text-xs text-slate-400">
          <p className="flex items-center justify-between">
            <span>Don't have an account?</span>
            <Link
              to="/signup"
              className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Create account →
            </Link>
          </p>

          <p className="flex items-center justify-between pt-2">
            <span>Didn't receive a confirmation link?</span>
            <Link
              to="/resend-confirmation"
              className="text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors"
            >
              Resend confirmation
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}