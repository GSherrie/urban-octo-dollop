"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSherPay } from "@/lib/store";
import {
  Button,
  Card,
  CardHeader,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import type { Currency } from "@/lib/types";
import { formatMoney, uid } from "@/lib/utils";

interface DraftLine {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function NewInvoicePage() {
  const { data, addInvoice } = useSherPay();
  const router = useRouter();

  const defaultClient = data.clients[0]?.id || "";
  const [clientId, setClientId] = useState(defaultClient);
  const client = data.clients.find((c) => c.id === clientId);

  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = (() => {
    const d = new Date();
    d.setDate(d.getDate() + data.settings.paymentTermsDays);
    return d.toISOString().slice(0, 10);
  })();

  const [currency, setCurrency] = useState<Currency>(
    client?.currency || data.settings.baseCurrency
  );
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { key: uid("k"), description: "", quantity: 1, unitPrice: 0 },
  ]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    [lines]
  );
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function onClientChange(id: string) {
    setClientId(id);
    const c = data.clients.find((x) => x.id === id);
    if (c) setCurrency(c.currency);
  }

  function submit(asDraft: boolean) {
    if (!clientId) return alert("Select a client");
    const validLines = lines.filter((l) => l.description.trim());
    if (validLines.length === 0) return alert("Add at least one line item");

    const inv = addInvoice({
      clientId,
      currency,
      issueDate,
      dueDate,
      taxRate,
      notes,
      status: asDraft ? "draft" : "sent",
      lineItems: validLines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unitPrice) || 0,
      })),
    });
    router.push(`/invoices/${inv.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New invoice"
        description="Draft or send immediately. MoMo & bank details appear on the PDF view."
        actions={
          <Link href="/invoices">
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      <Card>
        <CardHeader title="Details" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Select
            label="Client"
            value={clientId}
            onChange={(e) => onClientChange(e.target.value)}
          >
            <option value="">Select client…</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="GHS">GHS — Ghana Cedi</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
          </Select>
          <Input
            label="Issue date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Tax rate (%)"
            type="number"
            min={0}
            step={0.1}
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Line items"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setLines((ls) => [
                  ...ls,
                  {
                    key: uid("k"),
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                  },
                ])
              }
            >
              + Add line
            </Button>
          }
        />
        <div className="space-y-3 p-5">
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-6">
                <Input
                  label={idx === 0 ? "Description" : undefined}
                  placeholder="Service or product"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(line.key, { description: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label={idx === 0 ? "Qty" : undefined}
                  type="number"
                  min={0}
                  step={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.key, {
                      quantity: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label={idx === 0 ? "Unit price" : undefined}
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(line.key, {
                      unitPrice: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-end sm:col-span-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-rose-600"
                  onClick={() =>
                    setLines((ls) =>
                      ls.length === 1 ? ls : ls.filter((l) => l.key !== line.key)
                    )
                  }
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}

          <div className="ml-auto w-full max-w-xs space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax ({taxRate}%)</span>
              <span>{formatMoney(tax, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="p-5">
          <Textarea
            label="Notes (shown on invoice)"
            placeholder="Payment terms, project reference…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => submit(true)}>
              Save draft
            </Button>
            <Button onClick={() => submit(false)}>Save & send</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
