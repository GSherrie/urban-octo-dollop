import AppShell from "@/components/app-shell";
import TxForm from "@/components/tx-form";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
export default async function EditIncomePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle(),
    supabase.from("income").select("id,amount,category,date,payment_method,source").eq("id", params.id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!data) notFound();
  const r = data as { amount: number; category: string | null; date: string; payment_method: string | null; source: string | null };
  const currency = (profile as { currency?: string } | null)?.currency || "GHS";
  return (
    <AppShell title="Edit income" sub="Update this income entry.">
      <div className="mx-auto max-w-xl"><TxForm type="income" currency={currency} editId={params.id} initial={{ amount: String(r.amount), category: r.category ?? "", detail: r.source ?? "", date: r.date.slice(0, 10), method: r.payment_method ?? "" }} /></div>
    </AppShell>
  );
}
