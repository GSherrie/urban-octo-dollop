import AppShell from "@/components/app-shell";
import TxForm from "@/components/tx-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
export default async function NewIncomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle();
  const currency = (profile as { currency?: string } | null)?.currency || "GHS";
  return (
    <AppShell title="Add income" sub="Record money coming in.">
      <div className="mx-auto max-w-xl"><TxForm type="income" currency={currency} /></div>
    </AppShell>
  );
}
