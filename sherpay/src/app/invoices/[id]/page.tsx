"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSherPay } from "@/lib/store";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  Toast,
} from "@/components/ui";
import {
  clientInitials,
  formatDate,
  formatMoney,
  invoiceBalance,
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
  paymentMethodLabel,
  relativeDueLabel,
  resolveInvoiceStatus,
} from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const {
    data,
    sendInvoice,
    sendReminder,
    recordPayment,
    deleteInvoice,
    markInvoiceViewed,
  } = useSherPay();

  const invoice = data.invoices.find((i) => i.id === id);
  const client = invoice
    ? data.clients.find((c) => c.id === invoice.clientId)
    : undefined;
  const payments = data.payments.filter((p) => p.invoiceId === id);
  const status = invoice ? resolveInvoiceStatus(invoice) : "draft";

  const [payOpen, setPayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const totals = useMemo(() => {
    if (!invoice) return null;
    return {
      subtotal: invoiceSubtotal(invoice),
      tax: invoiceTax(invoice),
      total: invoiceTotal(invoice),
      balance: invoiceBalance(invoice),
    };
  }, [invoice]);

  if (!invoice || !client || !totals) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-600">Invoice not found.</p>
        <Link href="/invoices" className="mt-3 inline-block text-emerald-600">
          Back to invoices
        </Link>
      </div>
    );
  }

  function onRecordPayment() {
    const value = Number(amount);
    if (!value || value <= 0) return alert("Enter a valid amount");
    recordPayment({
      invoiceId: id,
      amount: value,
      method,
      reference,
      paidAt: new Date(paidAt).toISOString(),
      notes,
    });
    setPayOpen(false);
    setAmount("");
    setReference("");
    setNotes("");
    setToast("Payment recorded");
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={invoice.number}
          description={`${client.company || client.name} · ${relativeDueLabel(invoice.dueDate)}`}
          actions={
            <>
              <Link href="/invoices">
                <Button variant="outline" size="sm">
                  Back
                </Button>
              </Link>
              {status === "draft" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    sendInvoice(id);
                    setToast("Invoice marked as sent");
                  }}
                >
                  Mark sent
                </Button>
              ) : null}
              {status !== "paid" && status !== "draft" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      sendReminder(id);
                      setToast("Reminder logged");
                    }}
                  >
                    Send reminder
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      markInvoiceViewed(id);
                      setToast("Marked as viewed");
                    }}
                  >
                    Mark viewed
                  </Button>
                  <Button size="sm" onClick={() => setPayOpen(true)}>
                    Record payment
                  </Button>
                </>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
              >
                Print / PDF
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm("Delete this invoice?")) {
                    deleteInvoice(id);
                    router.push("/invoices");
                  }
                }}
              >
                Delete
              </Button>
            </>
          }
        />
      </div>

      <div className="print-area grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                {data.settings.logoInitials}
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">
                  {data.settings.name}
                </div>
                <div className="text-xs text-slate-500">
                  {data.settings.email} · {data.settings.phone}
                </div>
                <div className="text-xs text-slate-500">
                  {data.settings.address}, {data.settings.city}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Invoice
              </div>
              <div className="text-xl font-bold text-slate-900">
                {invoice.number}
              </div>
              <div className="mt-2 no-print">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Bill to
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Avatar
                  initials={clientInitials(client.company || client.name)}
                />
                <div>
                  <div className="font-semibold text-slate-900">
                    {client.company || client.name}
                  </div>
                  <div className="text-xs text-slate-500">{client.email}</div>
                  <div className="text-xs text-slate-500">
                    {client.address}
                    {client.city ? `, ${client.city}` : ""}
                  </div>
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-sm text-slate-600">
                <span className="text-slate-400">Issued:</span>{" "}
                {formatDate(invoice.issueDate)}
              </div>
              <div className="text-sm text-slate-600">
                <span className="text-slate-400">Due:</span>{" "}
                {formatDate(invoice.dueDate)}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(totals.total, invoice.currency)}
              </div>
              {totals.balance > 0 && totals.balance < totals.total ? (
                <div className="text-sm text-amber-700">
                  Balance due {formatMoney(totals.balance, invoice.currency)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto px-2 pb-2">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Rate</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoice.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="px-4 py-3 text-slate-800">
                      {li.description}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{li.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatMoney(li.unitPrice, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(
                        li.quantity * li.unitPrice,
                        invoice.currency
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end px-6 pb-6">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax ({invoice.taxRate}%)</span>
                <span>{formatMoney(totals.tax, invoice.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatMoney(totals.total, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paid</span>
                <span>
                  {formatMoney(invoice.amountPaid, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Balance</span>
                <span>{formatMoney(totals.balance, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {invoice.notes ? (
            <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-600">
              <div className="text-xs font-semibold uppercase text-slate-400">
                Notes
              </div>
              <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          ) : null}

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Payment details
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="font-semibold text-slate-800">Mobile Money</div>
                <div className="text-slate-600">
                  {data.settings.momoNetwork}: {data.settings.momoNumber}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-800">Bank transfer</div>
                <div className="text-slate-600">
                  {data.settings.bankName} · {data.settings.bankBranch}
                </div>
                <div className="text-slate-600">
                  A/C {data.settings.bankAccount}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="no-print space-y-4">
          <Card>
            <CardHeader title="Payments" />
            <div className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-500">
                  No payments yet.
                </p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="px-5 py-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-800">
                        {formatMoney(p.amount, p.currency)}
                      </span>
                      <span className="text-slate-500">
                        {formatDate(p.paidAt.slice(0, 10))}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {paymentMethodLabel(p.method)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold uppercase text-slate-400">
              Client
            </div>
            <Link
              href={`/clients`}
              className="mt-2 block font-semibold text-emerald-700 hover:text-emerald-600"
            >
              {client.company || client.name}
            </Link>
            <p className="mt-1 text-xs text-slate-500">{client.email}</p>
            <p className="text-xs text-slate-500">{client.phone}</p>
          </Card>
        </div>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record payment"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Balance due:{" "}
            <strong>{formatMoney(totals.balance, invoice.currency)}</strong>
          </p>
          <Input
            label="Amount"
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(totals.balance)}
          />
          <Select
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            <option value="mobile_money">Mobile Money (MoMo)</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </Select>
          <Input
            label="Reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="MTN-… / GCB-…"
          />
          <Input
            label="Paid on"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onRecordPayment}>Save payment</Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
