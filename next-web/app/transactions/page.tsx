import AppShell from "@/components/app-shell";
import { ButtonLink } from "@/components/ui";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import TxFilter from "./filter";
export default async function TransactionsPage({ searchParams }: { searchParams: { type?: string; q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const type = searchParams.type === "income" || searchParams.type === "expense" ? searchParams.type : "all";
  let query = supabase.from("transactions").select("id,type,amount,category,date,payment_method").eq("user_id", user.id).order("date", { ascending: false }).limit(300);
  if (type !== "all") query = query.eq("type", type);
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle(),
    query,
  ]);
  const currency = (profile as { currency?: string } | null)?.currency || "GHS";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const list = ((rows ?? []) as { id: string; type: string; amount: number; category: string | null; date: string; payment_method: string | null }[]).filter((r) => !q || (r.category ?? "").toLowerCase().includes(q));
  return (
    <AppShell title="Transactions" sub="All income and expenses in one place." actions={<ButtonLink href="/expenses/new" size="sm" variant="secondary"><Plus className="h-4 w-4" aria-hidden="true" />Add expense</ButtonLink>}>
      <TxFilter type={type} q={searchParams.q ?? ""} rows={list} currency={currency} />
    </AppShell>
  );
}
