import AppShell from "@/components/app-shell";
import { ButtonLink } from "@/components/ui";
import TxList from "@/components/tx-list";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
type Row = { id: string; user_id: string; type: "expense"; amount: number; category: string | null; date: string; payment_method: string | null; vendor: string | null };
export default async function ExpensesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle(),
    supabase.from("expenses").select("id,user_id,amount,category,date,payment_method,vendor").eq("user_id", user.id).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
  ]);
  const currency = (profile as { currency?: string } | null)?.currency || "GHS";
  const list = ((rows ?? []) as Row[]).map((r) => ({ ...r, type: "expense" as const, reference_id: r.id, note: r.vendor }));
  return (
    <AppShell title="Expenses" sub="Money going out." actions={<ButtonLink href="/expenses/new" size="sm"><Plus className="h-4 w-4" aria-hidden="true" />Add expense</ButtonLink>}>
      <TxList type="expense" rows={list as never[]} currency={currency} newHref="/expenses/new" newLabel="Add expense" emptyTitle="No expenses yet" emptyBody="Record what you spend — food, transport, utilities — and track where your money goes." />
    </AppShell>
  );
}
