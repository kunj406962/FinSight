import{ useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordStrengthMeter } from "../components/auth/PasswordStrengthMeter";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    // detectSessionInUrl processes the URL asynchronously on page load --
    // for PKCE this is a real network round-trip (exchanging the code for a
    // session), not instant. Wait for either Supabase's PASSWORD_RECOVERY event
    // or a directly-confirmed session before letting the form be used at all.
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsReady(true);
      }
    }).catch(() => {
      // Session check itself failed (e.g. network error) — swallow it.
      // The 5s timeout still fires and correctly reports the link as invalid.
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

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw updateError;

    try {
      await supabase.auth.signOut();
    } catch {
      // Non-fatal — password is already changed, don't block navigation.
    }
      navigate("/login", {
        state: { message: "Password updated successfully. Please log in with your new password." },
      });
    } catch {
      setError(
        "Couldn't reset your password. The link may have expired — please request a new one.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Invalid or Expired Link State ---
  if (linkInvalid) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              Link invalid or expired
            </h1>
            <p className="text-sm text-slate-400">
              The security token in this link is no longer valid or has already been used.
            </p>
          </div>

          <Alert
            type="error"
            message="Password reset links expire quickly for security reasons. Please request a new link to proceed."
          />

          <div className="pt-2">
            <Link to="/forgot-password" className="block w-full">
              <Button variant="primary" className="w-full">
                Request new reset link
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-slate-500">
            Remember your password?{" "}
            <Link to="/login" className="text-slate-300 hover:text-emerald-400 underline underline-offset-4 transition-colors">
              Return to login
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // --- Initial Verification / Loading State ---
  if (!isReady) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-200">Verifying security token...</h2>
            <p className="text-xs text-slate-400">Authenticating your password reset request with FinSight</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // --- Password Reset Form ---
  const confirmPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? "Passwords do not match"
      : undefined;

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Set a new password
          </h1>
          <p className="text-sm text-slate-400">
            Choose a strong, secure password to protect your FinSight financial workspace.
          </p>
        </div>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Input
              label="New password"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <Input
            label="Confirm new password"
            type="password"
            required
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPasswordError}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full mt-2"
          >
            Update password
          </Button>

          <p className="text-xs text-center text-slate-500 pt-2">
            Back to{" "}
            <Link to="/login" className="text-slate-300 hover:text-emerald-400 underline underline-offset-4 transition-colors">
              Sign in page
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}