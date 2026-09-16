"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSherPay } from "@/lib/store";
import { computeDashboard } from "@/lib/metrics";
import {
  Avatar,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  StatusBadge,
  Button,
} from "@/components/ui";
import { CashflowChart } from "@/components/CashflowChart";
import {
  clientInitials,
  formatDateTime,
  formatMoney,
  relativeDueLabel,
  statusLabel,
} from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";

const PIPELINE_ORDER: InvoiceStatus[] = [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "partially_paid",
];

export default function DashboardPage() {
  const { data } = useSherPay();
  const metrics = useMemo(() => computeDashboard(data), [data]);

  const pipelineTotal = Object.values(metrics.pipeline).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Cash position, pipeline, and what needs your attention."
        actions={
          <>
            <Link href="/expenses">
              <Button variant="outline" size="sm">
                Log expense
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button size="sm">Create invoice</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatMoney(metrics.outstandingGhs)}
          hint={`${metrics.openInvoiceCount} open invoice${metrics.openInvoiceCount === 1 ? "" : "s"}`}
          accent="rose"
        />
        <StatCard
          label="Collected this month"
          value={formatMoney(metrics.collectedThisMonthGhs)}
          hint="across all currencies (base GHS)"
          accent="emerald"
        />
        <StatCard
          label="Expenses this month"
          value={formatMoney(metrics.expensesThisMonthGhs)}
          hint={`${metrics.expenseCountThisMonth} receipt${metrics.expenseCountThisMonth === 1 ? "" : "s"} logged`}
          accent="amber"
        />
        <StatCard
          label="Net profit (month)"
          value={formatMoney(metrics.netProfitThisMonthGhs)}
          hint="revenue − expenses"
          accent="violet"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Cash flow — last 6 months"
            subtitle="Collected vs spent in base GHS"
          />
          <CashflowChart data={metrics.cashflow} />
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Pipeline" subtitle="INVOICES" />
          <div className="space-y-3 px-5 py-4">
            {PIPELINE_ORDER.map((key) => {
              const count = metrics.pipeline[key];
              const pct = pipelineTotal
                ? Math.round((count / pipelineTotal) * 100)
                : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      {statusLabel(key)}
                    </span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        key === "overdue"
                          ? "h-full rounded-full bg-rose-500"
                          : key === "paid"
                            ? "h-full rounded-full bg-emerald-500"
                            : key === "partially_paid"
                              ? "h-full rounded-full bg-amber-500"
                              : "h-full rounded-full bg-slate-400"
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Awaiting payment"
            subtitle={
              metrics.awaiting.filter((a) => a.status === "overdue").length
                ? `${metrics.awaiting.filter((a) => a.status === "overdue").length} overdue`
                : "Open balances"
            }
            action={
              <Link
                href="/invoices"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500"
              >
                View all
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {metrics.awaiting.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Nothing outstanding. Nice work.
              </div>
            ) : (
              metrics.awaiting.map(({ invoice, client, balance, status }) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <Avatar
                    initials={clientInitials(client.company || client.name)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {invoice.number} · {client.company || client.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      Due {invoice.dueDate} · {relativeDueLabel(invoice.dueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatMoney(balance, invoice.currency)}
                    </div>
                    <div className="mt-1 flex justify-end">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Activity" subtitle="auto-logged" />
          <div className="divide-y divide-slate-100">
            {metrics.recentActivity.slice(0, 6).map((item) => (
              <div key={item.id} className="px-5 py-3.5">
                <p className="text-sm leading-snug text-slate-700">
                  {item.message}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            ))}
            <div className="px-5 py-3">
              <Link
                href="/activity"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500"
              >
                See full activity →
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
