import AppShell from "@/components/app-shell";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/format";
export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: profile }, { data: txs }] = await Promise.all([
    supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle(),
    supabase.from("transactions").select("type,amount,category,date").eq("user_id", user.id).order("date", { ascending: false }).limit(1000),
  ]);
  const currency = (profile as { currency?: string } | null)?.currency || "GHS";
  const rows = (txs ?? []) as { type: string; amount: number; category: string | null; date: string }[];
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
  const sumM = (k: string, t: string) => rows.filter((r) => r.type === t && r.date.slice(0, 7) === k).reduce((s, r) => s + Number(r.amount || 0), 0);
  const byCat: Record<string, number> = {};
  rows.filter((r) => r.type === "expense").forEach((r) => { const k = r.category || "Uncategorised"; byCat[k] = (byCat[k] || 0) + Number(r.amount || 0); });
  const catTotal = Object.values(byCat).reduce((a, b) => a + b, 0) || 1;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <AppShell title="Reports" sub="Monthly totals and spending by category.">
      <div className="sp-card sp-card-pad">
        <h2 className="sp-section-title">Income vs expenses · last 6 months</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-tertiary"><th className="py-2 pr-3 font-medium">Month</th><th className="py-2 pr-3 text-right font-medium">Income</th><th className="py-2 pr-3 text-right font-medium">Expenses</th><th className="py-2 text-right font-medium">Net</th></tr></thead>
            <tbody className="divide-y divide-line-soft">
              {keys.slice().reverse().map((k) => {
                const inc = sumM(k, "income");
                const exp = sumM(k, "expense");
                return (
                  <tr key={k}>
                    <td className="py-2.5 pr-3 font-medium text-ink">{new Date(`${k}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</td>
                    <td className="sp-tabular py-2.5 pr-3 text-right text-success">{formatMoney(inc, currency)}</td>
                    <td className="sp-tabular py-2.5 pr-3 text-right text-ink">{formatMoney(exp, currency)}</td>
                    <td className={`sp-tabular py-2.5 text-right font-semibold ${inc - exp >= 0 ? "text-ink" : "text-danger"}`}>{formatMoney(inc - exp, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sp-card sp-card-pad mt-4">
        <h2 className="sp-section-title">Spending by category</h2>
        {cats.length === 0 ? <p className="mt-3 text-sm text-ink-secondary">No expenses yet. Categories will appear here once you add expenses.</p> : (
          <ul className="mt-3 space-y-3">
            {cats.map(([name, total]) => (
              <li key={name}>
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-medium text-ink">{name}</span><span className="sp-tabular text-ink-secondary">{formatMoney(total, currency)}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${name} ${Math.round((total / catTotal) * 100)} percent of spending`}>
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, (total / catTotal) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
