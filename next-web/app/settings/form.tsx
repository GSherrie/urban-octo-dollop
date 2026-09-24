"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Alert } from "@/components/alert";
import { FieldError } from "@/components/ui";
export default function SettingsForm({ initialName, initialCurrency, currencies }: { initialName: string; initialCurrency: string; currencies: string[] }) {
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter your name."); return; }
    setBusy(true); setError(null); setOk(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You are signed out. Sign in and try again.");
      const { error: err } = await supabase.from("profiles").update({ full_name: name.trim(), currency }).eq("user_id", user.id);
      if (err) throw err;
      setOk(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save settings."); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="sp-card sp-card-pad space-y-4">
      {ok ? <Alert tone="success">Settings saved.</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div>
        <label className="sp-label" htmlFor="set-name">Full name</label>
        <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} className="sp-input" autoComplete="name" />
        {!name.trim() && error ? <FieldError>Enter your name.</FieldError> : null}
      </div>
      <div>
        <label className="sp-label" htmlFor="set-cur">Currency</label>
        <select id="set-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} className="sp-input">
          {currencies.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <p className="sp-hint">Amounts are formatted in this currency. GHS is the default.</p>
      </div>
      <div className="flex justify-end"><button type="submit" disabled={busy} className="sp-btn sp-btn-primary sm:min-w-32">{busy ? "Saving…" : "Save changes"}</button></div>
    </form>
  );
}
