import type {
  Currency,
  Invoice,
  InvoiceStatus,
  PaymentMethod,
  ExpenseCategory,
} from "./types";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GHS: "GHS",
  USD: "US$",
  EUR: "€",
  GBP: "£",
};

/** Approximate rates to GHS for multi-currency rollups (demo). */
export const TO_GHS: Record<Currency, number> = {
  GHS: 1,
  USD: 15.5,
  EUR: 16.8,
  GBP: 19.7,
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(amount: number, currency: Currency = "GHS"): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `−${symbol}\u00a0${formatted}` : `${symbol}\u00a0${formatted}`;
}

export function toBaseGhs(amount: number, currency: Currency): number {
  return amount * TO_GHS[currency];
}

export function invoiceSubtotal(invoice: Invoice): number {
  return invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
}

export function invoiceTax(invoice: Invoice): number {
  return invoiceSubtotal(invoice) * (invoice.taxRate / 100);
}

export function invoiceTotal(invoice: Invoice): number {
  return invoiceSubtotal(invoice) + invoiceTax(invoice);
}

export function invoiceBalance(invoice: Invoice): number {
  return Math.max(0, invoiceTotal(invoice) - invoice.amountPaid);
}

export function daysUntilDue(dueDate: string, today = new Date()): number {
  const due = new Date(dueDate + "T00:00:00");
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function resolveInvoiceStatus(
  invoice: Invoice,
  today = new Date()
): InvoiceStatus {
  if (invoice.status === "draft") return "draft";
  if (invoice.status === "paid") return "paid";
  const total = invoiceTotal(invoice);
  if (invoice.amountPaid >= total && total > 0) return "paid";
  if (invoice.amountPaid > 0 && invoice.amountPaid < total) {
    const days = daysUntilDue(invoice.dueDate, today);
    if (days < 0) return "overdue";
    return "partially_paid";
  }
  const days = daysUntilDue(invoice.dueDate, today);
  if (days < 0) return "overdue";
  return invoice.status;
}

export function statusLabel(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    partially_paid: "Partially paid",
    paid: "Paid",
    overdue: "Overdue",
  };
  return map[status];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    mobile_money: "Mobile Money",
    bank_transfer: "Bank Transfer",
    card: "Card",
    cash: "Cash",
    other: "Other",
  };
  return map[method];
}

export function expenseCategoryLabel(category: ExpenseCategory): string {
  const map: Record<ExpenseCategory, string> = {
    software: "Software",
    travel: "Travel",
    office: "Office",
    marketing: "Marketing",
    utilities: "Utilities",
    salaries: "Salaries",
    meals: "Meals",
    other: "Other",
  };
  return map[category];
}

export function formatDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeDueLabel(dueDate: string, today = new Date()): string {
  const days = daysUntilDue(dueDate, today);
  if (days < 0) {
    const n = Math.abs(days);
    return `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function monthKey(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameMonth(iso: string, ref = new Date()): boolean {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function lastNMonths(n: number, ref = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return keys;
}
