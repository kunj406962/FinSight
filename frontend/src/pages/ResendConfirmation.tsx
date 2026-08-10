import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export function ResendConfirmation() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await client.post("/auth/resend-confirmation", { email });
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
            If that account needs confirmation, a new email is on its way.
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
        <h1 className="text-2xl font-semibold">Resend confirmation email</h1>

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
          {isSubmitting ? "Sending..." : "Resend email"}
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