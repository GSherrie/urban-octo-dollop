import DashboardClient from "./client";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
type Tx = { id: string; type: string; reference_id: string | null; reference_type: string | null };
export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: profile }, { data: txs }] = await Promise.all([
    supabase.from("profiles").select("currency,full_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("transactions").select("id,type,amount,category,date,payment_method,reference_id,reference_type").eq("user_id", user.id).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(80),
  ]);
  const rows = (txs ?? []) as (Tx & { amount: number; category: string | null; date: string; payment_method: string | null })[];
  const expIds = rows.filter((r) => r.type === "expense" && r.reference_id).map((r) => r.reference_id as string);
  const incIds = rows.filter((r) => r.type === "income" && r.reference_id).map((r) => r.reference_id as string);
  const [{ data: exps }, { data: incs }] = await Promise.all([
    expIds.length ? supabase.from("expenses").select("id,vendor").eq("user_id", user.id).in("id", expIds) : Promise.resolve({ data: [] as { id: string; vendor: string | null }[] }),
    incIds.length ? supabase.from("income").select("id,source").eq("user_id", user.id).in("id", incIds) : Promise.resolve({ data: [] as { id: string; source: string | null }[] }),
  ]);
  const notes: Record<string, string> = {};
  const byExp = new Map<string, string>();
  const byInc = new Map<string, string>();
  ((exps ?? []) as { id: string; vendor: string | null }[]).forEach((e) => { if (e.vendor) byExp.set(e.id, e.vendor); });
  ((incs ?? []) as { id: string; source: string | null }[]).forEach((i) => { if (i.source) byInc.set(i.id, i.source); });
  rows.forEach((r) => {
    if (!r.reference_id) return;
    const n = r.type === "expense" ? byExp.get(r.reference_id) : byInc.get(r.reference_id);
    if (n) notes[r.id] = n;
  });
  return <DashboardClient profile={profile as { currency?: string | null; full_name?: string | null } | null} rows={rows as never[]} notes={notes} />;
}
