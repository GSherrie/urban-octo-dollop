import AppShell from "@/components/app-shell";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "./form";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("full_name,currency").eq("user_id", user.id).maybeSingle();
  const p = profile as { full_name?: string | null; currency?: string | null } | null;
  return (
    <AppShell title="Settings" sub="Preferences for your workspace.">
      <div className="mx-auto max-w-xl"><SettingsForm initialName={p?.full_name ?? ""} initialCurrency={p?.currency ?? "GHS"} currencies={[...SUPPORTED_CURRENCIES]} /></div>
    </AppShell>
  );
}
