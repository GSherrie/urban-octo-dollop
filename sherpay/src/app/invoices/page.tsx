"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSherPay } from "@/lib/store";
import { enrichedInvoices } from "@/lib/metrics";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import {
  formatDate,
  formatMoney,
  relativeDueLabel,
} from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";

const FILTERS: Array<{ id: "all" | InvoiceStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "viewed", label: "Viewed" },
  { id: "partially_paid", label: "Partial" },
  { id: "paid", label: "Paid" },
  { id: "overdue", label: "Overdue" },
];

export default function InvoicesPage() {
  const { data } = useSherPay();
  const [filter, setFilter] = useState<"all" | InvoiceStatus>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    let list = enrichedInvoices(data);
    if (filter !== "all") list = list.filter((i) => i.status === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (i) =>
          i.number.toLowerCase().includes(s) ||
          i.client?.company?.toLowerCase().includes(s) ||
          i.client?.name?.toLowerCase().includes(s)
      );
    }
    return list.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [data, filter, q]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create, send, and track every invoice — multi-currency ready."
        actions={
          <Link href="/invoices/new">
            <Button>+ New invoice</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                filter === f.id
                  ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search invoices…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:w-64"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No invoices match"
            description="Try another filter or create your first invoice."
            action={
              <Link href="/invoices/new">
                <Button size="sm">Create invoice</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Due</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-semibold text-emerald-700 hover:text-emerald-600"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {inv.client?.company || inv.client?.name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-700">
                        {formatDate(inv.dueDate)}
                      </div>
                      {inv.status !== "paid" && inv.status !== "draft" ? (
                        <div className="text-[11px] text-slate-400">
                          {relativeDueLabel(inv.dueDate)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="font-semibold text-slate-900">
                        {formatMoney(inv.total, inv.currency)}
                      </div>
                      {inv.amountPaid > 0 && inv.balance > 0 ? (
                        <div className="text-[11px] text-slate-400">
                          Balance {formatMoney(inv.balance, inv.currency)}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
