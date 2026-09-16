"use client";

import { useEffect, useState } from "react";
import { useSherPay } from "@/lib/store";
import {
  Button,
  Card,
  CardHeader,
  Input,
  PageHeader,
  Select,
  Toast,
} from "@/components/ui";
import type { Currency } from "@/lib/types";

export default function SettingsPage() {
  const { data, updateSettings, resetToSeed, ready } = useSherPay();
  const [form, setForm] = useState({ ...data.settings });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (ready) setForm({ ...data.settings });
    // only re-sync when storage finishes loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    updateSettings(form);
    setToast("Settings saved");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Company profile, payment details, and demo data controls."
        actions={<Button onClick={save}>Save changes</Button>}
      />

      <Card>
        <CardHeader title="Company profile" />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Input
            label="Business name"
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
          />
          <Input
            label="Logo initials"
            value={form.logoInitials}
            maxLength={3}
            onChange={(e) => patch("logoInitials", e.target.value.toUpperCase())}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => patch("email", e.target.value)}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => patch("phone", e.target.value)}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => patch("address", e.target.value)}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => patch("city", e.target.value)}
          />
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => patch("country", e.target.value)}
          />
          <Input
            label="Tax ID / TIN"
            value={form.taxId}
            onChange={(e) => patch("taxId", e.target.value)}
          />
          <Select
            label="Base currency"
            value={form.baseCurrency}
            onChange={(e) =>
              patch("baseCurrency", e.target.value as Currency)
            }
          >
            <option value="GHS">GHS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
          <Input
            label="Invoice prefix"
            value={form.invoicePrefix}
            onChange={(e) => patch("invoicePrefix", e.target.value)}
          />
          <Input
            label="Default payment terms (days)"
            type="number"
            min={0}
            value={form.paymentTermsDays}
            onChange={(e) =>
              patch("paymentTermsDays", Number(e.target.value) || 0)
            }
          />
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Payment details"
          subtitle="Shown on invoices for clients in Ghana and abroad"
        />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Input
            label="MoMo network"
            value={form.momoNetwork}
            onChange={(e) => patch("momoNetwork", e.target.value)}
            placeholder="MTN MoMo / Telecel Cash / AT Money"
          />
          <Input
            label="MoMo number"
            value={form.momoNumber}
            onChange={(e) => patch("momoNumber", e.target.value)}
          />
          <Input
            label="Bank name"
            value={form.bankName}
            onChange={(e) => patch("bankName", e.target.value)}
          />
          <Input
            label="Branch"
            value={form.bankBranch}
            onChange={(e) => patch("bankBranch", e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Account number"
              value={form.bankAccount}
              onChange={(e) => patch("bankAccount", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h3 className="text-sm font-semibold text-slate-900">Demo data</h3>
        <p className="mt-1 text-xs text-slate-500">
          SherPay stores everything in your browser (localStorage). Reset to
          restore the sample data that mirrors the live{" "}
          <code className="rounded bg-slate-100 px-1">sherpay.vercel.app</code>{" "}
          dashboard.
        </p>
        <div className="mt-4">
          <Button
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  "Reset all local data to the original demo seed? This cannot be undone."
                )
              ) {
                resetToSeed();
                setForm({ ...data.settings });
                setToast("Demo data restored — reload if settings look stale");
                // refresh form from seed after reset
                setTimeout(() => window.location.reload(), 400);
              }
            }}
          >
            Reset to demo seed
          </Button>
        </div>
      </Card>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
