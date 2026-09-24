import AppShell from "@/components/app-shell";
import { ButtonLink } from "@/components/ui";
import TxList from "@/components/tx-list";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
export default async function IncomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle(),
    supabase.from("income").select("id,user_id,amount,category,date,payment_method").eq("user_id", user.id).order("date", { ascending: false }).limit(200),
  ]);
  const currency = (profile as { currency?: string } | null)?.currency || "GHS";
  return (
    <AppShell title="Income" sub="Money coming in." actions={<ButtonLink href="/income/new" size="sm"><Plus className="h-4 w-4" aria-hidden="true" />Add income</ButtonLink>}>
      <TxList type="income" rows={(rows ?? []) as never[]} currency={currency} newHref="/income/new" newLabel="Add income" emptyTitle="No income yet" emptyBody="Record salary, business or freelance payments to see your total income grow." />
    </AppShell>
  );
}
