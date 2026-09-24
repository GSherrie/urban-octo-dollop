"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import AuthLayout from "@/components/auth-layout";
import { Alert } from "@/components/alert";
import { FieldError } from "@/components/ui";
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const emailInvalid = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    if (!email.trim() || !password || emailInvalid) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? friendly(err.message) : "Could not sign in. Check your details and try again.");
    } finally { setLoading(false); }
  };
  return (
    <AuthLayout title="Sign in" sub="Welcome back to SherPay." footer={<span>New to SherPay? <Link className="font-medium text-brand-700 hover:text-brand-800" href="/auth/signup">Create an account</Link></span>}>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className="sp-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={emailInvalid || undefined} aria-describedby={emailInvalid ? "email-err" : undefined} className="sp-input" placeholder="you@example.com" />
          {emailInvalid ? <div id="email-err"><FieldError>Enter a valid email address.</FieldError></div> : null}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="sp-label" htmlFor="password">Password</label>
            <Link href="/auth/forgot-password" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">Forgot password?</Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="sp-input" placeholder="Enter your password" />
        </div>
        <button type="submit" disabled={loading} className="sp-btn sp-btn-primary w-full">{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthLayout>
  );
}
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "Email or password is incorrect. Try again or reset your password.";
  if (m.includes("email not confirmed") || m.includes("not confirmed")) return "Please confirm your email first. Check your inbox for the verification link.";
  return msg;
}
