import DashboardClient from "./client";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: profile }, { data: txs }] = await Promise.all([
    supabase.from("profiles").select("currency,full_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("transactions").select("id,type,amount,category,date,payment_method").eq("user_id", user.id).order("date", { ascending: false }).limit(80),
  ]);
  return <DashboardClient profile={profile as { currency?: string | null; full_name?: string | null } | null} rows={(txs ?? []) as never[]} />;
}
