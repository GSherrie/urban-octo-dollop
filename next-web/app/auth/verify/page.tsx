"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import AuthLayout from "@/components/auth-layout";
import { Alert } from "@/components/alert";
function VerifyInner() {
  const params = useSearchParams();
  const initial = params.get("email") ?? "";
  const supabase = createClient();
  const [email, setEmail] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resend = async () => {
    if (!email.trim()) { setError("Enter the email you signed up with."); return; }
    setBusy(true); setError(null); setMsg(null);
    try {
      const { error: err } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (err) throw err;
      setMsg("Verification email sent. Check your inbox.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not resend the email."); }
    finally { setBusy(false); }
  };
  return (
    <AuthLayout title="Check your email" sub={email ? `We sent a verification link to ${email}.` : "Confirm your email to finish setup."} footer={<Link className="font-medium text-brand-700 hover:text-brand-800" href="/auth/login">Back to sign in</Link>}>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      {msg ? <div className="mb-4"><Alert tone="success">{msg}</Alert></div> : null}
      <div className="space-y-4">
        <div>
          <label className="sp-label" htmlFor="email">Email address</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sp-input" placeholder="you@example.com" />
        </div>
        <button type="button" onClick={resend} disabled={busy} className="sp-btn sp-btn-secondary w-full">{busy ? "Sending…" : "Resend verification email"}</button>
      </div>
    </AuthLayout>
  );
}
export default function VerifyPage() {
  return (<Suspense fallback={<div className="p-8 text-sm text-ink-secondary">Loading…</div>}><VerifyInner /></Suspense>);
}
