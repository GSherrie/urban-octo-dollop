"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import AuthLayout from "@/components/auth-layout";
import { Alert } from "@/components/alert";
import { FieldError, FormHint } from "@/components/ui";
export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const emailBad = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passBad = touched && password.length > 0 && password.length < 8;
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !email.trim() || password.length < 8 || emailBad) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
      if (err) throw err;
      if (data.user) {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u?.email_confirmed_at) { router.push("/dashboard"); router.refresh(); }
        else router.push(`/auth/verify?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create your account. Try again."); }
    finally { setLoading(false); }
  };
  return (
    <AuthLayout title="Create your account" sub="Start tracking income and expenses in minutes." footer={<span>Already have an account? <Link className="font-medium text-brand-700 hover:text-brand-800" href="/auth/login">Sign in</Link></span>}>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className="sp-label" htmlFor="name">Full name</label>
          <input id="name" name="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="sp-input" placeholder="Ama Serwaa" />
          {touched && !name.trim() ? <FieldError>Enter your name.</FieldError> : null}
        </div>
        <div>
          <label className="sp-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={emailBad || undefined} className="sp-input" placeholder="you@example.com" />
          {emailBad ? <FieldError>Enter a valid email address.</FieldError> : null}
        </div>
        <div>
          <label className="sp-label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="pw-hint" className="sp-input" placeholder="Minimum 8 characters" />
          <div id="pw-hint"><FormHint>Use at least 8 characters.</FormHint></div>
          {passBad ? <FieldError>Password must be at least 8 characters.</FieldError> : null}
        </div>
        <button type="submit" disabled={loading} className="sp-btn sp-btn-primary w-full">{loading ? "Creating account…" : "Create account"}</button>
      </form>
    </AuthLayout>
  );
}
