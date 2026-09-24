"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import AuthLayout from "@/components/auth-layout";
import { Alert } from "@/components/alert";
export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/reset-password` });
      if (err) throw err;
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send the reset link. Try again."); }
    finally { setLoading(false); }
  };
  return (
    <AuthLayout title="Reset your password" sub="Enter your email and we will send you a reset link." footer={<Link className="font-medium text-brand-700 hover:text-brand-800" href="/auth/login">Back to sign in</Link>}>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      {done ? <Alert tone="success">If an account exists for that email, a reset link is on its way. Check your inbox.</Alert> : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="sp-label" htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="sp-input" placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={loading} className="sp-btn sp-btn-primary w-full">{loading ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
