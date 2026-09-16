"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cloneSeed } from "./seed";
import type {
  ActivityItem,
  Client,
  Expense,
  Invoice,
  InvoiceLineItem,
  Payment,
  PaymentMethod,
  SherPayData,
  CompanySettings,
  Currency,
  ExpenseCategory,
  InvoiceStatus,
} from "./types";
import {
  invoiceTotal,
  resolveInvoiceStatus,
  uid,
} from "./utils";
import { nextInvoiceNumber } from "./metrics";

const STORAGE_KEY = "sherpay_data_v1";

interface SherPayStore {
  data: SherPayData;
  ready: boolean;
  resetToSeed: () => void;
  updateSettings: (patch: Partial<CompanySettings>) => void;
  addClient: (input: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addInvoice: (input: {
    clientId: string;
    currency: Currency;
    issueDate: string;
    dueDate: string;
    lineItems: Omit<InvoiceLineItem, "id">[];
    taxRate: number;
    notes: string;
    status?: InvoiceStatus;
  }) => Invoice;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  sendInvoice: (id: string) => void;
  markInvoiceViewed: (id: string) => void;
  recordPayment: (input: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    reference: string;
    paidAt: string;
    notes: string;
  }) => Payment | null;
  sendReminder: (invoiceId: string) => void;
  addExpense: (input: Omit<Expense, "id" | "createdAt" | "receiptRef"> & {
    receiptRef?: string;
  }) => Expense;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

const Ctx = createContext<SherPayStore | null>(null);

function pushActivity(
  data: SherPayData,
  item: Omit<ActivityItem, "id" | "createdAt"> & { createdAt?: string }
): SherPayData {
  const entry: ActivityItem = {
    id: uid("act"),
    createdAt: item.createdAt ?? new Date().toISOString(),
    type: item.type,
    message: item.message,
    meta: item.meta,
  };
  return { ...data, activity: [entry, ...data.activity].slice(0, 100) };
}

export function SherPayProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SherPayData>(() => cloneSeed());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SherPayData;
        if (parsed?.version && parsed.clients && parsed.invoices) {
          setData(parsed);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota */
    }
  }, [data, ready]);

  const resetToSeed = useCallback(() => {
    const seed = cloneSeed();
    setData(seed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  }, []);

  const updateSettings = useCallback((patch: Partial<CompanySettings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const addClient = useCallback(
    (input: Omit<Client, "id" | "createdAt">) => {
      const client: Client = {
        ...input,
        id: uid("cli"),
        createdAt: new Date().toISOString(),
      };
      setData((d) =>
        pushActivity(
          { ...d, clients: [client, ...d.clients] },
          {
            type: "client_added",
            message: `Client added: ${client.company || client.name}`,
            meta: { clientId: client.id },
          }
        )
      );
      return client;
    },
    []
  );

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setData((d) => ({
      ...d,
      clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      clients: d.clients.filter((c) => c.id !== id),
    }));
  }, []);

  const addInvoice = useCallback(
    (input: {
      clientId: string;
      currency: Currency;
      issueDate: string;
      dueDate: string;
      lineItems: Omit<InvoiceLineItem, "id">[];
      taxRate: number;
      notes: string;
      status?: InvoiceStatus;
    }) => {
      let created!: Invoice;
      setData((d) => {
        const number = nextInvoiceNumber(d);
        const invoice: Invoice = {
          id: uid("inv"),
          number,
          clientId: input.clientId,
          status: input.status ?? "draft",
          currency: input.currency,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          lineItems: input.lineItems.map((li) => ({
            ...li,
            id: uid("li"),
          })),
          taxRate: input.taxRate,
          notes: input.notes,
          amountPaid: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        created = invoice;
        const client = d.clients.find((c) => c.id === input.clientId);
        return pushActivity(
          { ...d, invoices: [invoice, ...d.invoices] },
          {
            type: "invoice_created",
            message: `${number} drafted for ${client?.company || client?.name || "client"}`,
            meta: { invoiceId: invoice.id, clientId: input.clientId },
          }
        );
      });
      return created;
    },
    []
  );

  const updateInvoice = useCallback((id: string, patch: Partial<Invoice>) => {
    setData((d) => ({
      ...d,
      invoices: d.invoices.map((inv) =>
        inv.id === id
          ? { ...inv, ...patch, updatedAt: new Date().toISOString() }
          : inv
      ),
    }));
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      invoices: d.invoices.filter((i) => i.id !== id),
      payments: d.payments.filter((p) => p.invoiceId !== id),
    }));
  }, []);

  const sendInvoice = useCallback((id: string) => {
    setData((d) => {
      const inv = d.invoices.find((i) => i.id === id);
      if (!inv) return d;
      const client = d.clients.find((c) => c.id === inv.clientId);
      const invoices = d.invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              status: i.status === "draft" ? ("sent" as const) : i.status,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
      return pushActivity(
        { ...d, invoices },
        {
          type: "invoice_sent",
          message: `${inv.number} sent to ${client?.company || client?.email || "client"}`,
          meta: { invoiceId: id, clientId: inv.clientId },
        }
      );
    });
  }, []);

  const markInvoiceViewed = useCallback((id: string) => {
    setData((d) => {
      const inv = d.invoices.find((i) => i.id === id);
      if (!inv) return d;
      if (inv.status === "paid" || inv.status === "draft") return d;
      const client = d.clients.find((c) => c.id === inv.clientId);
      const invoices = d.invoices.map((i) =>
        i.id === id && (i.status === "sent" || i.status === "viewed")
          ? { ...i, status: "viewed" as const, updatedAt: new Date().toISOString() }
          : i
      );
      return pushActivity(
        { ...d, invoices },
        {
          type: "invoice_viewed",
          message: `${inv.number} was viewed by ${client?.company || "client"}`,
          meta: { invoiceId: id, clientId: inv.clientId },
        }
      );
    });
  }, []);

  const recordPayment = useCallback(
    (input: {
      invoiceId: string;
      amount: number;
      method: PaymentMethod;
      reference: string;
      paidAt: string;
      notes: string;
    }) => {
      let payment: Payment | null = null;
      setData((d) => {
        const inv = d.invoices.find((i) => i.id === input.invoiceId);
        if (!inv || input.amount <= 0) return d;

        payment = {
          id: uid("pay"),
          invoiceId: input.invoiceId,
          amount: input.amount,
          currency: inv.currency,
          method: input.method,
          reference: input.reference,
          paidAt: input.paidAt,
          notes: input.notes,
          createdAt: new Date().toISOString(),
        };

        const amountPaid = inv.amountPaid + input.amount;
        const total = invoiceTotal({ ...inv, amountPaid });
        let status = resolveInvoiceStatus({ ...inv, amountPaid });
        if (amountPaid >= total) status = "paid";
        else if (amountPaid > 0) status = "partially_paid";

        const invoices = d.invoices.map((i) =>
          i.id === inv.id
            ? {
                ...i,
                amountPaid,
                status,
                updatedAt: new Date().toISOString(),
              }
            : i
        );

        const client = d.clients.find((c) => c.id === inv.clientId);
        const methodLabel =
          input.method === "mobile_money"
            ? "Mobile Money"
            : input.method === "bank_transfer"
              ? "Bank Transfer"
              : input.method;

        let next = pushActivity(
          { ...d, invoices, payments: [payment!, ...d.payments] },
          {
            type: "payment_received",
            message:
              status === "paid"
                ? `Invoice ${inv.number} paid by ${client?.company || "client"} (${methodLabel})`
                : `Partial payment received for ${inv.number} via ${methodLabel}`,
            meta: { invoiceId: inv.id, clientId: inv.clientId },
          }
        );

        if (status === "paid") {
          next = pushActivity(next, {
            type: "receipt_generated",
            message: `Receipt RCP-${inv.number.replace(/\D/g, "")} generated for ${client?.company || "client"}`,
            meta: { invoiceId: inv.id, clientId: inv.clientId },
          });
          next = pushActivity(next, {
            type: "invoice_paid",
            message: `Invoice ${inv.number} paid by ${client?.company || "client"} (${methodLabel})`,
            meta: { invoiceId: inv.id, clientId: inv.clientId },
          });
        }

        return next;
      });
      return payment;
    },
    []
  );

  const sendReminder = useCallback((invoiceId: string) => {
    setData((d) => {
      const inv = d.invoices.find((i) => i.id === invoiceId);
      if (!inv) return d;
      const client = d.clients.find((c) => c.id === inv.clientId);
      const status = resolveInvoiceStatus(inv);
      const days = (() => {
        const due = new Date(inv.dueDate + "T00:00:00");
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.round((due.getTime() - now.getTime()) / 86400000);
      })();
      const overdueBit =
        days < 0
          ? ` (${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue)`
          : days === 0
            ? " (due today)"
            : ` (due in ${days} days)`;
      return pushActivity(d, {
        type: "reminder_sent",
        message: `Payment reminder emailed to ${client?.company || "client"} for ${inv.number}${status === "overdue" || days < 0 ? overdueBit : overdueBit}`,
        meta: { invoiceId, clientId: inv.clientId },
      });
    });
  }, []);

  const addExpense = useCallback(
    (
      input: Omit<Expense, "id" | "createdAt" | "receiptRef"> & {
        receiptRef?: string;
      }
    ) => {
      let expense!: Expense;
      setData((d) => {
        const n = d.expenses.length + 1;
        expense = {
          ...input,
          id: uid("exp"),
          receiptRef: input.receiptRef || `RCP-EXP-${String(n).padStart(3, "0")}`,
          createdAt: new Date().toISOString(),
        };
        return pushActivity(
          { ...d, expenses: [expense, ...d.expenses] },
          {
            type: "expense_logged",
            message: `Expense logged: ${expense.description} — ${expense.currency} ${expense.amount.toFixed(2)}`,
          }
        );
      });
      return expense;
    },
    []
  );

  const updateExpense = useCallback((id: string, patch: Partial<Expense>) => {
    setData((d) => ({
      ...d,
      expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      expenses: d.expenses.filter((e) => e.id !== id),
    }));
  }, []);

  const value = useMemo<SherPayStore>(
    () => ({
      data,
      ready,
      resetToSeed,
      updateSettings,
      addClient,
      updateClient,
      deleteClient,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      sendInvoice,
      markInvoiceViewed,
      recordPayment,
      sendReminder,
      addExpense,
      updateExpense,
      deleteExpense,
    }),
    [
      data,
      ready,
      resetToSeed,
      updateSettings,
      addClient,
      updateClient,
      deleteClient,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      sendInvoice,
      markInvoiceViewed,
      recordPayment,
      sendReminder,
      addExpense,
      updateExpense,
      deleteExpense,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSherPay() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSherPay must be used within SherPayProvider");
  return ctx;
}

// re-export type used by forms
export type { ExpenseCategory };
