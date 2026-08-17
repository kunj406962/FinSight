import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import client from "../api/client";

export function ResendConfirmation() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await client.post("/auth/resend-confirmation", { email });
      setIsSent(true);
    } catch {
      // Discard specific backend errors to avoid leaking detail, matching standard auth security behavior
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      {isSent ? (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              Check your email
            </h1>
            <p className="text-xs text-slate-400">
              If that account needs confirmation, a new email is on its way.
            </p>
          </div>

          {/* Styled confirmation summary box matching ForgotPassword sent-state */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 space-y-1">
            <p className="text-xs font-medium text-slate-400">Confirmation email sent to:</p>
            <p className="text-sm font-semibold text-slate-100 break-all">{email}</p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setIsSent(false)}
            >
              Re-enter email address
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              Resend confirmation email
            </h1>
            <p className="text-xs text-slate-400">
              Enter your email address to receive a new confirmation link.
            </p>
          </div>

          {error && <Alert type="error" message={error} />}

          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint="Enter your registered account email"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isSubmitting}
              disabled={isSubmitting || !email.trim()}
            >
              Resend email
            </Button>
          </div>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}