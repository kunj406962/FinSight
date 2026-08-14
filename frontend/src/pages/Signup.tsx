import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { PasswordStrengthMeter } from "../components/auth/PasswordStrengthMeter";

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Regex rules: Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!passwordRegex.test(password)) {
      setError("Password does not meet the minimum security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(email, password);
      // Navigate to login with success message emphasizing email confirmation link
      navigate("/login", {
        state: {
          message: "Account created successfully! Please check your inbox and click the confirmation link before logging in.",
        },
      });
    } catch {
      setError("Signup failed. That email may already be in use.");
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
            Create your account
          </h1>
          <p className="text-xs text-slate-400">
            Join FinSight to get automated ML-driven financial analytics and spending forecasts.
          </p>
        </div>

        {/* Error Alert */}
        {error && <Alert type="error" message={error} />}

        {/* Signup Form */}
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
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />

          {/* Password Strength Indicator */}
          <PasswordStrengthMeter password={password} />

          <Input
            label="Confirm Password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            error={
              confirmPassword && password !== confirmPassword
                ? "Passwords do not match"
                : undefined
            }
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">
            Create Account
          </Button>
        </form>

        {/* Login Link */}
        <div className="pt-4 border-t border-slate-900 text-xs text-slate-400 text-center">
          <span>Already have an account? </span>
          <Link
            to="/login"
            className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}