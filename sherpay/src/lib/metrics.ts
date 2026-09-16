import type {
  ActivityItem,
  Client,
  Expense,
  Invoice,
  InvoiceStatus,
  Payment,
  SherPayData,
} from "./types";
import {
  invoiceBalance,
  invoiceTotal,
  isSameMonth,
  lastNMonths,
  monthKey,
  resolveInvoiceStatus,
  toBaseGhs,
} from "./utils";

export interface DashboardMetrics {
  outstandingGhs: number;
  openInvoiceCount: number;
  collectedThisMonthGhs: number;
  expensesThisMonthGhs: number;
  expenseCountThisMonth: number;
  netProfitThisMonthGhs: number;
  pipeline: Record<InvoiceStatus, number>;
  cashflow: Array<{ month: string; collected: number; spent: number }>;
  awaiting: Array<{
    invoice: Invoice;
    client: Client;
    balance: number;
    status: InvoiceStatus;
  }>;
  recentActivity: ActivityItem[];
}

export function getClient(
  data: SherPayData,
  clientId: string
): Client | undefined {
  return data.clients.find((c) => c.id === clientId);
}

export function getInvoice(
  data: SherPayData,
  invoiceId: string
): Invoice | undefined {
  return data.invoices.find((i) => i.id === invoiceId);
}

export function enrichedInvoices(data: SherPayData, today = new Date()) {
  return data.invoices.map((inv) => {
    const status = resolveInvoiceStatus(inv, today);
    const total = invoiceTotal(inv);
    const balance = invoiceBalance(inv);
    const client = getClient(data, inv.clientId);
    return { ...inv, status, total, balance, client };
  });
}

export function computeDashboard(
  data: SherPayData,
  today = new Date()
): DashboardMetrics {
  const enriched = enrichedInvoices(data, today);

  const openStatuses: InvoiceStatus[] = [
    "sent",
    "viewed",
    "partially_paid",
    "overdue",
  ];

  const outstanding = enriched.filter((i) => openStatuses.includes(i.status));
  const outstandingGhs = outstanding.reduce(
    (sum, inv) => sum + toBaseGhs(inv.balance, inv.currency),
    0
  );

  const collectedThisMonthGhs = data.payments
    .filter((p) => isSameMonth(p.paidAt, today))
    .reduce((sum, p) => sum + toBaseGhs(p.amount, p.currency), 0);

  const monthExpenses = data.expenses.filter((e) => isSameMonth(e.date, today));
  const expensesThisMonthGhs = monthExpenses.reduce(
    (sum, e) => sum + toBaseGhs(e.amount, e.currency),
    0
  );

  const pipeline: Record<InvoiceStatus, number> = {
    draft: 0,
    sent: 0,
    viewed: 0,
    paid: 0,
    overdue: 0,
    partially_paid: 0,
  };
  for (const inv of enriched) {
    pipeline[inv.status] += 1;
  }

  const months = lastNMonths(6, today);
  const cashflow = months.map((m) => {
    const collected = data.payments
      .filter((p) => monthKey(p.paidAt) === m)
      .reduce((sum, p) => sum + toBaseGhs(p.amount, p.currency), 0);
    const spent = data.expenses
      .filter((e) => monthKey(e.date) === m)
      .reduce((sum, e) => sum + toBaseGhs(e.amount, e.currency), 0);
    return { month: m, collected, spent };
  });

  const awaiting = outstanding
    .map((inv) => ({
      invoice: inv,
      client: inv.client!,
      balance: inv.balance,
      status: inv.status,
    }))
    .filter((a) => a.client)
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate));

  const recentActivity = [...data.activity].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    outstandingGhs,
    openInvoiceCount: outstanding.length,
    collectedThisMonthGhs,
    expensesThisMonthGhs,
    expenseCountThisMonth: monthExpenses.length,
    netProfitThisMonthGhs: collectedThisMonthGhs - expensesThisMonthGhs,
    pipeline,
    cashflow,
    awaiting,
    recentActivity,
  };
}

export function nextInvoiceNumber(data: SherPayData): string {
  const prefix = data.settings.invoicePrefix;
  const nums = data.invoices
    .map((i) => {
      const m = i.number.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function clientStats(data: SherPayData, clientId: string, today = new Date()) {
  const invoices = enrichedInvoices(data, today).filter(
    (i) => i.clientId === clientId
  );
  const totalBilled = invoices.reduce(
    (s, i) => s + toBaseGhs(i.total, i.currency),
    0
  );
  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "draft")
    .reduce((s, i) => s + toBaseGhs(i.balance, i.currency), 0);
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  return { invoices, totalBilled, totalOutstanding, paidCount };
}

export type { Payment, Expense };
