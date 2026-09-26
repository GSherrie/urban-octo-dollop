"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/constants";
import type { TxRow } from "@/lib/data";
import { deleteTx } from "@/lib/tx";
import type { TxType } from "@/lib/data";
import { EmptyState } from "@/components/feedback";
import { ButtonLink } from "@/components/ui";
export default function TxList({ type, rows, currency, newHref, newLabel, emptyTitle, emptyBody }: { type: TxType; rows: TxRow[]; currency: string; newHref: string; newLabel: string; emptyTitle: string; emptyBody: string }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!rows.length) {
    return (<EmptyState title={emptyTitle} body={emptyBody} action={<ButtonLink href={newHref}>{newLabel}</ButtonLink>} />);
  }
  const remove = async (id: string) => {
    setBusy(true); setError(null);
    const r = await deleteTx(type, id);
    setBusy(false); setConfirmId(null);
    if (r.error) { setError(r.error); return; }
    router.refresh();
  };
  return (
    <div className="sp-card">
      {error ? <p role="alert" className="border-b border-danger-border bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-line-soft">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle">
            <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${type === "expense" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
              <ArrowUpRight className={`h-4 w-4 ${type === "income" ? "rotate-[270deg]" : "rotate-90"}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{r.note || r.category || "Uncategorised"}{r.note && r.category ? <span className="ml-1.5 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary">{r.category}</span> : null}</p>
              <p className="truncate text-[13px] text-ink-tertiary">{formatDate(r.date)} · {paymentMethodLabel(r.payment_method)}</p>
            </div>
            <span className={`sp-tabular shrink-0 text-sm font-semibold ${type === "income" ? "text-success" : "text-ink"}`}>{type === "income" ? "+" : "−"}{formatMoney(r.amount, currency)}</span>
            <span className="hidden shrink-0 gap-1 sm:flex">
              <Link href={`/${type === "expense" ? "expenses" : "income"}/${r.id}/edit`} className="sp-btn sp-btn-ghost min-h-[36px] px-3 text-[13px]">Edit</Link>
              {confirmId === r.id ? (
                <button type="button" disabled={busy} onClick={() => remove(r.id)} className="sp-btn sp-btn-danger min-h-[36px] px-3 text-[13px]">{busy ? "Deleting…" : "Confirm"}</button>
              ) : (
                <button type="button" onClick={() => setConfirmId(r.id)} className="sp-btn sp-btn-ghost min-h-[36px] px-3 text-[13px] text-danger hover:bg-danger-soft">Delete</button>
              )}
            </span>
            <Link href={`/${type === "expense" ? "expenses" : "income"}/${r.id}/edit`} aria-label={`Edit ${r.category || type}`} className="sp-icon-btn shrink-0 sm:hidden">›</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
