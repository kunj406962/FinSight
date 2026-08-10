import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    // detectSessionInUrl processes the URL asynchronously on page load --
    // for PKCE this is a real network round-trip (exchanging the code for a
    // session), not instant. Submitting before it finishes fails with "no
    // session" even though the link itself is genuinely valid. Wait for
    // either Supabase's PASSWORD_RECOVERY event or a directly-confirmed
    // session before letting the form be used at all.
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsReady(true);
      }
    });

    // If no session shows up within a few seconds, the link is genuinely
    // invalid, expired, or already used -- stop waiting and say so.
    const timeout = setTimeout(() => {
      setIsReady((ready) => {
        if (!ready) setLinkInvalid(true);
        return ready;
      });
    }, 5000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      navigate("/login", {
        state: { message: "Password updated. Please log in." },
      });
    } catch {
      setError(
        "Couldn't reset your password. The link may have expired — request a new one.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (linkInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 p-6">
          <h1 className="text-2xl font-semibold">Link invalid or expired</h1>
          <p className="text-sm">Please request a new password reset link.</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm">Verifying your link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Set a new password</h1>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <input
          type="password"
          required
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}