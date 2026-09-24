import AppShell from "@/components/app-shell";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { escapeInitials } from "@/lib/format";
export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("email,full_name,currency,created_at").eq("user_id", user.id).maybeSingle();
  const p = profile as { email?: string; full_name?: string | null; currency?: string | null; created_at?: string } | null;
  const name = p?.full_name || user.user_metadata?.full_name || "SherPay user";
  return (
    <AppShell title="Account" sub="Your profile and sign-in details.">
      <div className="sp-card sp-card-pad">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white">{escapeInitials(name)}</span>
          <div className="min-w-0"><p className="truncate text-[15px] font-semibold text-ink">{name}</p><p className="truncate text-sm text-ink-secondary">{p?.email || user.email}</p></div>
        </div>
        <dl className="mt-4 space-y-2 border-t border-line-soft pt-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-ink-secondary">Email</dt><dd className="truncate font-medium text-ink">{p?.email || user.email}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-secondary">Currency</dt><dd className="font-medium text-ink">{p?.currency || "GHS"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-secondary">Member since</dt><dd className="font-medium text-ink">{p?.created_at ? new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</dd></div>
        </dl>
      </div>
      <div className="sp-card sp-card-pad mt-4">
        <h2 className="sp-section-title">Profile</h2>
        <p className="mt-1 text-sm text-ink-secondary">Update your display name and preferred currency.</p>
        <div className="mt-3"><a href="/settings" className="sp-btn sp-btn-secondary">Edit in Settings</a></div>
      </div>
    </AppShell>
  );
}
