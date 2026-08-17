import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetError) throw resetError;
      setIsSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            {isSent ? "Check your email" : "Reset your password"}
          </h1>
          <p className="text-xs text-slate-400">
            {isSent
              ? "Follow the link we sent to finish resetting your password."
              : "Enter the email address on your account and we'll send you a link to reset your password."}
          </p>
        </div>

        {isSent ? (
          <div className="space-y-6 text-center sm:text-left">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm leading-relaxed">
              We sent a password recovery link to{" "}
              <span className="font-semibold text-emerald-300">{email}</span>.
              Click the link in the email to set a new password.
            </div>

            <div className="space-y-3 pt-2">
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => setIsSent(false)}
              >
                Re-enter email address
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  &larr; Return to sign in
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && <Alert type="error" message={error} />}

            <Input
              label="Email address"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint="We'll send a secure, single-use link to reset your password."
            />

            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting || !email.trim()}
              className="w-full justify-center"
            >
              Send recovery link
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                &larr; Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}