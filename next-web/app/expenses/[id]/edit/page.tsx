import AppShell from "@/components/app-shell";
import TxForm from "@/components/tx-form";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data } = await supabase.from("expenses").select("id,amount,category,date,payment_method,vendor").eq("id", params.id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const r = data as { amount: number; category: string | null; date: string; payment_method: string | null; vendor: string | null };
  return (
    <AppShell title="Edit expense" sub="Update this expense.">
      <div className="mx-auto max-w-xl"><TxForm type="expense" editId={params.id} initial={{ amount: String(r.amount), category: r.category ?? "", detail: r.vendor ?? "", date: r.date.slice(0, 10), method: r.payment_method ?? "" }} /></div>
    </AppShell>
  );
}
