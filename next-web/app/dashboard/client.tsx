"use client";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import AppShell from "@/components/app-shell";
import { ButtonLink } from "@/components/ui";
import { EmptyState } from "@/components/feedback";
import { formatDate, formatMoney, monthKey, todayISO } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/constants";
export type Row = { id: string; type: string; amount: number; category: string | null; date: string; payment_method: string | null };
export default function DashboardClient({ profile, rows }: { profile: { currency?: string | null; full_name?: string | null } | null; rows: Row[] }) {
  const currency = profile?.currency || "GHS";
  const mk = monthKey(todayISO());
  const sum = (t: string, m?: string) => rows.filter((r) => r.type === t && (!m || r.date.slice(0, 7) === m)).reduce((s, r) => s + Number(r.amount || 0), 0);
  const recent = rows.slice(0, 8);
  const first = profile?.full_name?.split(" ")?.[0];
  return (
    <AppShell title={first ? `Hello, ${first}` : "Dashboard"} sub="Total balance, income, expenses and recent activity.">
      <section aria-label="Balance" className="sp-card sp-card-pad bg-brand-950 text-white" style={{ borderColor: "#0A2E5F" }}>
        <p className="text-[13px] font-medium text-white/60">Total balance</p>
        <p className="sp-tabular mt-1 text-3xl font-semibold tracking-tight">{formatMoney(sum("income") - sum("expense"), currency)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/60"><ArrowDownLeft className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />Income · this month</p>
            <p className="sp-tabular mt-1 text-[15px] font-semibold">{formatMoney(sum("income", mk), currency)}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/60"><ArrowUpRight className="h-3.5 w-3.5 text-orange-300" aria-hidden="true" />Expenses · this month</p>
            <p className="sp-tabular mt-1 text-[15px] font-semibold">{formatMoney(sum("expense", mk), currency)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/expenses/new" className="sp-btn min-h-[40px] flex-1 bg-white px-3 text-sm font-semibold text-brand-900 hover:bg-brand-50"><Plus className="h-4 w-4" aria-hidden="true" />Add expense</Link>
          <Link href="/income/new" className="sp-btn min-h-[40px] flex-1 border border-white/30 px-3 text-sm font-semibold text-white hover:bg-white/10"><Plus className="h-4 w-4" aria-hidden="true" />Add income</Link>
        </div>
      </section>
      <section aria-label="Spending overview" className="sp-card sp-card-pad mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="sp-section-title">Spending overview</h2>
          <Link href="/reports" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">View reports</Link>
        </div>
        <SpendBars rows={rows} currency={currency} />
      </section>
      <section aria-label="Recent transactions" className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="sp-section-title">Recent transactions</h2>
          <Link href="/transactions" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">View all</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No transactions yet" body="Add your first expense or income to see your balance and activity here." action={<><ButtonLink href="/expenses/new" variant="secondary">Add expense</ButtonLink><ButtonLink href="/income/new">Add income</ButtonLink></>} />
        ) : (
          <div className="sp-card"><ul className="divide-y divide-line-soft">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${r.type === "expense" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{r.type === "expense" ? <ArrowUpRight className="h-4 w-4 rotate-90" /> : <ArrowDownLeft className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{r.category || "Uncategorised"}</p><p className="truncate text-[13px] text-ink-tertiary">{formatDate(r.date)} · {paymentMethodLabel(r.payment_method)}</p></div>
                <span className={`sp-tabular shrink-0 text-sm font-semibold ${r.type === "income" ? "text-success" : "text-ink"}`}>{r.type === "income" ? "+" : "−"}{formatMoney(r.amount, currency)}</span>
              </li>
            ))}
          </ul></div>
        )}
      </section>
    </AppShell>
  );
}

function SpendBars({ rows, currency }: { rows: Row[]; currency: string }) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
  const exp = keys.map((k) => rows.filter((r) => r.type === "expense" && r.date.slice(0, 7) === k).reduce((s, r) => s + Number(r.amount || 0), 0));
  const inc = keys.map((k) => rows.filter((r) => r.type === "income" && r.date.slice(0, 7) === k).reduce((s, r) => s + Number(r.amount || 0), 0));
  const max = Math.max(1, ...exp, ...inc);
  if (exp.every((v) => v === 0) && inc.every((v) => v === 0)) return <p className="mt-3 text-sm text-ink-secondary">No activity in the last 6 months. New transactions will appear here.</p>;
  return (
    <div className="mt-4">
      <div className="flex h-36 items-end gap-3" role="img" aria-label="Monthly income and expenses for the last 6 months">
        {keys.map((k, i) => (
          <div key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-28 w-full items-end justify-center gap-1">
              <div className="w-full max-w-6 rounded-sm bg-brand-600" style={{ height: `${Math.max(3, (inc[i] / max) * 100)}%` }} title={`Income ${formatMoney(inc[i], currency)}`} />
              <div className="w-full max-w-6 rounded-sm bg-line" style={{ height: `${Math.max(3, (exp[i] / max) * 100)}%` }} title={`Expenses ${formatMoney(exp[i], currency)}`} />
            </div>
            <span className="text-[11px] font-medium text-ink-tertiary">{new Date(`${k}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short" })}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" aria-hidden="true" />Income</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-line" aria-hidden="true" />Expenses</span>
      </div>
    </div>
  );
}