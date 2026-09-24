"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import AuthLayout from "@/components/auth-layout";
import { Alert } from "@/components/alert";
import { FieldError } from "@/components/ui";
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pw !== pw2) { setError("Passwords do not match."); return; }
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pw });
      if (err) throw err;
      router.push("/auth/login");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update your password."); }
    finally { setLoading(false); }
  };
  return (
    <AuthLayout title="Set a new password" sub="Choose a password with at least 8 characters." footer={<Link className="font-medium text-brand-700 hover:text-brand-800" href="/auth/login">Back to sign in</Link>}>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="sp-label" htmlFor="pw">New password</label>
          <input id="pw" type="password" autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="sp-input" placeholder="Minimum 8 characters" />
        </div>
        <div>
          <label className="sp-label" htmlFor="pw2">Confirm new password</label>
          <input id="pw2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} className="sp-input" placeholder="Repeat your password" />
          {pw2 && pw !== pw2 ? <FieldError>Passwords do not match.</FieldError> : null}
        </div>
        <button type="submit" disabled={loading} className="sp-btn sp-btn-primary w-full">{loading ? "Updating…" : "Update password"}</button>
      </form>
    </AuthLayout>
  );
}
