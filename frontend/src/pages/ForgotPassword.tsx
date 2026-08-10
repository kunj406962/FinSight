import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

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
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (resetError) throw resetError;
      setIsSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 p-6">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm">
            If an account exists for that email, a password reset link is on its way.
          </p>
          <Link to="/login" className="underline text-sm">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>

        <p className="text-sm">
          <Link to="/login" className="underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}