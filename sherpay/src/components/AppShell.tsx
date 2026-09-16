"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { useSherPay } from "@/lib/store";
import { Button } from "./ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data, ready } = useSherPay();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className="hidden text-sm text-slate-500 sm:block">
                <span className="font-medium text-slate-800">
                  {data.settings.name}
                </span>
                <span className="mx-2 text-slate-300">·</span>
                <span>
                  {data.settings.city}, {data.settings.country}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/invoices/new">
                <Button size="sm">+ New invoice</Button>
              </Link>
              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 sm:flex">
                {data.settings.logoInitials}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {!ready ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              Loading SherPay…
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
