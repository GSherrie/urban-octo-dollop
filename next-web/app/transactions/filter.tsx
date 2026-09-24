"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/constants";
import { EmptyState } from "@/components/feedback";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
type Row = { id: string; type: string; amount: number; category: string | null; date: string; payment_method: string | null };
export default function TxFilter({ type, q, rows, currency }: { type: string; q: string; rows: Row[]; currency: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(q);
  const go = (t: string) => {
    const p = new URLSearchParams();
    if (t !== "all") p.set("type", t);
    if (term.trim()) p.set("q", term.trim());
    router.push(`/transactions${p.toString() ? `?${p.toString()}` : ""}`);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-md border border-line bg-white p-1" role="tablist" aria-label="Filter by type">
          {(["all", "income", "expense"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => go(t)} className={cn("min-h-[36px] flex-1 rounded px-3 text-[13px] font-medium capitalize transition-colors sm:flex-none", type === t ? "bg-brand-600 text-white" : "text-ink-secondary hover:bg-surface-subtle")}>{t === "all" ? "All" : t}</button>
          ))}
        </div>
        <form className="flex-1" onSubmit={(e) => { e.preventDefault(); go(type); }}>
          <label htmlFor="tx-search" className="sr-only">Search by category</label>
          <input id="tx-search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by category" className="sp-input" />
        </form>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No transactions found" body={q || type !== "all" ? "Try a different search or filter." : "Add your first expense or income to get started."} action={<ButtonLink href="/expenses/new">Add expense</ButtonLink>} />
      ) : (
        <div className="sp-card"><ul className="divide-y divide-line-soft">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${r.type === "expense" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{r.type === "expense" ? <ArrowUpRight className="h-4 w-4 rotate-90" /> : <ArrowDownLeft className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{r.category || "Uncategorised"}</p><p className="truncate text-[13px] text-ink-tertiary">{r.type === "income" ? "Income" : "Expense"} · {formatDate(r.date)} · {paymentMethodLabel(r.payment_method)}</p></div>
              <span className={`sp-tabular shrink-0 text-sm font-semibold ${r.type === "income" ? "text-success" : "text-ink"}`}>{r.type === "income" ? "+" : "−"}{formatMoney(r.amount, currency)}</span>
            </li>
          ))}
        </ul></div>
      )}
    </div>
  );
}
