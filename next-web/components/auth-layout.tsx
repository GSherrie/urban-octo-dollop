import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand";
import Link from "next/link";
export default function AuthLayout({ title, sub, children, footer }: { title: string; sub: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <div className="hidden flex-1 bg-brand-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/auth/login" aria-label="SherPay home"><span className="inline-flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white font-semibold text-brand-900">S</span><span className="text-lg font-semibold text-white">SherPay</span></span></Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Simple money tracking for everyday business.</h2>
          <p className="mt-3 text-[15px] leading-7 text-white/70">Record income and expenses, see your balance at a glance, and export clean reports. Built for Ghana — GHS first, mobile money included.</p>
          <dl className="mt-8 space-y-4 text-sm">
            <div className="flex gap-3"><dt className="w-28 shrink-0 font-medium text-white/60">Balance</dt><dd className="text-white">Total balance, income and expenses</dd></div>
            <div className="flex gap-3"><dt className="w-28 shrink-0 font-medium text-white/60">Payments</dt><dd className="text-white">Cash, Bank, MTN MoMo, Telecel Cash, AT Money</dd></div>
            <div className="flex gap-3"><dt className="w-28 shrink-0 font-medium text-white/60">Reports</dt><dd className="text-white">Monthly summaries and exports</dd></div>
          </dl>
        </div>
        <p className="text-xs text-white/50">Secure sign-in powered by Supabase Auth.</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden"><BrandLockup sub="Money management" /></div>
          <div className="sp-card sp-card-pad">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-1 text-sm text-ink-secondary">{sub}</p>
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-6 border-t border-line-soft pt-4 text-center text-sm text-ink-secondary">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
