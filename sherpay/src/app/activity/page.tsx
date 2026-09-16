"use client";

import { useMemo } from "react";
import { useSherPay } from "@/lib/store";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { ActivityItem } from "@/lib/types";

const TYPE_STYLE: Record<ActivityItem["type"], string> = {
  invoice_created: "bg-slate-100 text-slate-700",
  invoice_sent: "bg-sky-50 text-sky-700",
  invoice_viewed: "bg-indigo-50 text-indigo-700",
  invoice_paid: "bg-emerald-50 text-emerald-700",
  payment_received: "bg-emerald-50 text-emerald-700",
  reminder_sent: "bg-amber-50 text-amber-800",
  receipt_generated: "bg-teal-50 text-teal-700",
  expense_logged: "bg-rose-50 text-rose-700",
  client_added: "bg-violet-50 text-violet-700",
};

const TYPE_LABEL: Record<ActivityItem["type"], string> = {
  invoice_created: "Invoice",
  invoice_sent: "Sent",
  invoice_viewed: "Viewed",
  invoice_paid: "Paid",
  payment_received: "Payment",
  reminder_sent: "Reminder",
  receipt_generated: "Receipt",
  expense_logged: "Expense",
  client_added: "Client",
};

export default function ActivityPage() {
  const { data } = useSherPay();
  const items = useMemo(
    () =>
      [...data.activity].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [data.activity]
  );

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Auto-logged trail of invoices, payments, reminders, and expenses."
      />

      <Card>
        {items.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 px-5 py-4">
                <span
                  className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_STYLE[item.type]}`}
                >
                  {TYPE_LABEL[item.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
