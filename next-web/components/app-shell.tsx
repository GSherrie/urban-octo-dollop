"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, BarChart3 } from "lucide-react";
import { LayoutDashboard, ListOrdered, LogOut, Menu, Plus } from "lucide-react";
import { Settings, User, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { BrandLockup } from "@/components/brand";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ArrowUpRight },
  { href: "/income", label: "Income", icon: ArrowDownLeft },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/account", label: "Account", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];
const MOBILE = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ArrowUpRight },
  { href: "/transactions", label: "Activity", icon: ListOrdered },
  { href: "/income", label: "Income", icon: ArrowDownLeft },
  { href: "/settings", label: "More", icon: Settings },
];
const isActive = (p: string, h: string) => p === h || p.startsWith(h + "/");
type Props = { title: string; sub?: string; actions?: React.ReactNode; children: React.ReactNode };
export default function AppShell({ title, sub, actions, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [out, setOut] = useState(false);
  const signOut = async () => {
    setOut(true);
    try { await supabase.auth.signOut(); }
    finally { router.push("/auth/login"); router.refresh(); }
  };
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white md:flex">
        <div className="px-5 pb-4 pt-6">
          <Link href="/dashboard" aria-label="SherPay dashboard"><BrandLockup sub="Money management" /></Link>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map((i) => {
            const Icon = i.icon;
            const a = isActive(pathname, i.href);
            return (
              <Link key={i.href} href={i.href} aria-current={a ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors", a ? "bg-brand-50 text-brand-800" : "text-ink-secondary hover:bg-surface-subtle hover:text-ink")}>
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />{i.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-line-soft p-3">
          <Link href="/expenses/new" className="sp-btn sp-btn-primary w-full"><Plus className="h-4 w-4" aria-hidden="true" />Add expense</Link>
          <Link href="/income/new" className="sp-btn sp-btn-secondary w-full"><Plus className="h-4 w-4" aria-hidden="true" />Add income</Link>
          <button type="button" onClick={signOut} disabled={out} className="sp-btn sp-btn-ghost w-full"><LogOut className="h-4 w-4" aria-hidden="true" />{out ? "Signing out…" : "Sign out"}</button>
        </div>
      </aside>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur md:ml-60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button type="button" className="sp-icon-btn md:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <Link href="/dashboard" className="md:hidden" aria-label="SherPay dashboard"><BrandLockup /></Link>
          <div className="hidden min-w-0 flex-1 md:block">
            <h1 className="sp-page-title truncate">{title}</h1>
            {sub ? <p className="sp-page-sub truncate">{sub}</p> : null}
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">{actions}</div>
          <div className="ml-auto md:hidden">
            <button type="button" onClick={() => setQuickOpen((v) => !v)} className="sp-btn sp-btn-primary min-h-[40px] px-3" aria-expanded={quickOpen} aria-label="Add transaction"><Plus className="h-4 w-4" aria-hidden="true" />Add</button>
          </div>
        </div>
        {quickOpen ? (
          <div className="border-t border-line-soft bg-white px-4 py-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/expenses/new" className="sp-btn sp-btn-secondary" onClick={() => setQuickOpen(false)}>Add expense</Link>
              <Link href="/income/new" className="sp-btn sp-btn-primary" onClick={() => setQuickOpen(false)}>Add income</Link>
            </div>
          </div>
        ) : null}

        {menuOpen ? (
          <nav aria-label="Mobile" className="border-t border-line-soft bg-white px-3 py-3 md:hidden">
            <div className="grid gap-1">
              {NAV.map((i) => {
                const Icon = i.icon;
                const a = isActive(pathname, i.href);
                return (
                  <Link key={i.href} href={i.href} onClick={() => setMenuOpen(false)} aria-current={a ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium", a ? "bg-brand-50 text-brand-800" : "text-ink-secondary hover:bg-surface-subtle")}>
                    <Icon className="h-5 w-5" aria-hidden="true" />{i.label}
                  </Link>
                );
              })}
              <button type="button" onClick={signOut} disabled={out} className="flex items-center gap-3 rounded-md px-3 py-3 text-left text-[15px] font-medium text-ink-secondary hover:bg-surface-subtle disabled:opacity-50"><LogOut className="h-5 w-5" aria-hidden="true" />{out ? "Signing out…" : "Sign out"}</button>
            </div>
          </nav>
        ) : null}
      </header>
      <div className="md:ml-60">
        <main className="sp-page pt-6">
          <div className="mb-4 md:hidden">
            <h1 className="sp-page-title">{title}</h1>
            {sub ? <p className="sp-page-sub">{sub}</p> : null}
            {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {children}
        </main>
        <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="grid grid-cols-5">
            {MOBILE.map((i) => {
              const Icon = i.icon;
              const a = isActive(pathname, i.href);
              return (
                <Link key={i.href} href={i.href} aria-current={a ? "page" : undefined} className={cn("flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", a ? "text-brand-700" : "text-ink-tertiary hover:text-ink")}>
                  <Icon className="h-5 w-5" aria-hidden="true" />{i.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

