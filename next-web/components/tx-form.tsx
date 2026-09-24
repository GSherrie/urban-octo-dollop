"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { TxType } from "@/lib/data";
import { saveTx, validateTx, type TxFormValues } from "@/lib/tx";
import { Alert } from "@/components/alert";
import { FieldError, FormHint } from "@/components/ui";
export default function TxForm({ type, editId, initial }: { type: TxType; editId?: string; initial?: Partial<TxFormValues> }) {
  const router = useRouter();
  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const [v, setV] = useState<TxFormValues>({ amount: initial?.amount ?? "", category: initial?.category ?? "", detail: initial?.detail ?? "", date: initial?.date ?? todayISO(), method: initial?.method ?? "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [top, setTop] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof TxFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er = validateTx(v);
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true); setTop(null);
    const r = await saveTx(type, v, editId);
    setBusy(false);
    if (r.error) { setTop(r.error); return; }
    router.push(type === "expense" ? "/expenses" : "/income");
    router.refresh();
  };
  const isExp = type === "expense";
  return (
    <form onSubmit={submit} noValidate className="sp-card sp-card-pad space-y-4">
      {top ? <Alert tone="error">{top}</Alert> : null}
      <div>
        <label className="sp-label" htmlFor="tx-amount">Amount (GHS)</label>
        <input id="tx-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={v.amount} onChange={set("amount")} aria-invalid={!!errs.amount || undefined} className="sp-input sp-tabular text-lg font-semibold" />
        {errs.amount ? <FieldError>{errs.amount}</FieldError> : <FormHint>Enter the {isExp ? "amount spent" : "amount received"}.</FormHint>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="sp-label" htmlFor="tx-cat">Category</label>
          <select id="tx-cat" value={v.category} onChange={set("category")} aria-invalid={!!errs.category || undefined} className="sp-input">
            <option value="">Select category</option>
            {cats.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          {errs.category ? <FieldError>{errs.category}</FieldError> : null}
        </div>
        <div>
          <label className="sp-label" htmlFor="tx-date">Date</label>
          <input id="tx-date" type="date" value={v.date} max={todayISO()} onChange={set("date")} aria-invalid={!!errs.date || undefined} className="sp-input" />
          {errs.date ? <FieldError>{errs.date}</FieldError> : null}
        </div>
      </div>
      <div>
        <label className="sp-label" htmlFor="tx-detail">{isExp ? "Vendor / description (optional)" : "Source / description (optional)"}</label>
        <input id="tx-detail" type="text" value={v.detail} onChange={set("detail")} maxLength={140} className="sp-input" placeholder={isExp ? "e.g. Shoprite, fuel station" : "e.g. Salary, client payment"} />
        {errs.detail ? <FieldError>{errs.detail}</FieldError> : null}
      </div>
      <div>
        <label className="sp-label" htmlFor="tx-method">Payment method</label>
        <select id="tx-method" value={v.method} onChange={set("method")} aria-invalid={!!errs.method || undefined} className="sp-input">
          <option value="">Select method</option>
          {PAYMENT_METHODS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
        </select>
        {errs.method ? <FieldError>{errs.method}</FieldError> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.back()} className="sp-btn sp-btn-secondary">Cancel</button>
        <button type="submit" disabled={busy} className="sp-btn sp-btn-primary sm:min-w-40">{busy ? "Saving…" : editId ? `Save ${type}` : `Add ${type}`}</button>
      </div>
    </form>
  );
}
