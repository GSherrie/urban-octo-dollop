"use client";

import { useMemo, useState } from "react";
import { useSherPay } from "@/lib/store";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
  Toast,
} from "@/components/ui";
import {
  expenseCategoryLabel,
  formatDate,
  formatMoney,
  isSameMonth,
  toBaseGhs,
} from "@/lib/utils";
import type { Currency, ExpenseCategory } from "@/lib/types";

const CATEGORIES: ExpenseCategory[] = [
  "software",
  "travel",
  "office",
  "marketing",
  "utilities",
  "salaries",
  "meals",
  "other",
];

export default function ExpensesPage() {
  const { data, addExpense, deleteExpense } = useSherPay();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("software");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("GHS");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");

  const rows = useMemo(() => {
    let list = [...data.expenses];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(s) ||
          e.vendor.toLowerCase().includes(s) ||
          e.receiptRef.toLowerCase().includes(s)
      );
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [data.expenses, q]);

  const monthTotal = data.expenses
    .filter((e) => isSameMonth(e.date))
    .reduce((s, e) => s + toBaseGhs(e.amount, e.currency), 0);

  function submit() {
    if (!description.trim()) return alert("Description required");
    const value = Number(amount);
    if (!value || value <= 0) return alert("Enter a valid amount");
    addExpense({
      description: description.trim(),
      category,
      amount: value,
      currency,
      date,
      vendor: vendor.trim(),
      notes: notes.trim(),
    });
    setOpen(false);
    setDescription("");
    setAmount("");
    setVendor("");
    setNotes("");
    setToast("Expense logged");
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={`This month: ${formatMoney(monthTotal)} across ${data.expenses.filter((e) => isSameMonth(e.date)).length} receipts.`}
        actions={
          <Button onClick={() => setOpen(true)}>+ Log expense</Button>
        }
      />

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search expenses…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:w-72"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No expenses yet"
            description="Log receipts to track net profit on your dashboard."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                Log expense
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Vendor</th>
                  <th className="px-5 py-3 font-semibold">Receipt</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {e.description}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {expenseCategoryLabel(e.category)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{e.vendor || "—"}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                      {e.receiptRef}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      {formatMoney(e.amount, e.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:text-rose-500"
                        onClick={() => {
                          if (confirm("Delete this expense?"))
                            deleteExpense(e.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log expense">
        <div className="space-y-3">
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you spend on?"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ExpenseCategory)
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {expenseCategoryLabel(c)}
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              <option value="GHS">GHS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
          </div>
          <Input
            label="Vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="MTN, Adobe, Uber…"
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save expense</Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
