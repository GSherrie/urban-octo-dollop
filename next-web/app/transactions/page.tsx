import AppShell from "@/components/app-shell";
import { ButtonLink } from "@/components/ui";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import TxFilter from "./filter";
type Tx = { id: string; type: string; amount: number; category: string | null; date: string; payment_method: string | null; reference_id: string | null };
export default async function TransactionsPage({ searchParams }: { searchParams: { type?: string; q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const type = searchParams.type === "income" || searchParams.type === "expense" ? searchParams.type : "all";
  let query = supabase.from("transactions").select("id,type,amount,category,date,payment_method,reference_id").eq("user_id", user.id).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  if (type !== "all") query = query.eq("type", type);
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle(),
    query,
  ]);
  const currency = (profile as { currency?: string } | null)?.currency || "GHS";
  const list = (rows ?? []) as Tx[];
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const expIds = list.filter((r) => r.type === "expense" && r.reference_id).map((r) => r.reference_id as string);
  const incIds = list.filter((r) => r.type === "income" && r.reference_id).map((r) => r.reference_id as string);
  const [{ data: exps }, { data: incs }] = await Promise.all([
    expIds.length ? supabase.from("expenses").select("id,vendor").eq("user_id", user.id).in("id", expIds) : Promise.resolve({ data: [] as { id: string; vendor: string | null }[] }),
    incIds.length ? supabase.from("income").select("id,source").eq("user_id", user.id).in("id", incIds) : Promise.resolve({ data: [] as { id: string; source: string | null }[] }),
  ]);
  const noteByRef = new Map<string, string>();
  ((exps ?? []) as { id: string; vendor: string | null }[]).forEach((e) => { if (e.vendor) noteByRef.set(`expense:${e.id}`, e.vendor); });
  ((incs ?? []) as { id: string; source: string | null }[]).forEach((i) => { if (i.source) noteByRef.set(`income:${i.id}`, i.source); });
  const filtered = list
    .map((r) => ({ ...r, note: r.reference_id ? noteByRef.get(`${r.type}:${r.reference_id}`) ?? null : null }))
    .filter((r) => !q || (r.category ?? "").toLowerCase().includes(q) || (r.note ?? "").toLowerCase().includes(q));
  return (
    <AppShell title="Transactions" sub="All income and expenses in one place." actions={<ButtonLink href="/expenses/new" size="sm" variant="secondary"><Plus className="h-4 w-4" aria-hidden="true" />Add expense</ButtonLink>}>
      <TxFilter type={type} q={searchParams.q ?? ""} rows={filtered as never[]} currency={currency} />
    </AppShell>
  );
}
