"use client";

import { useMemo, useState } from "react";
import { useSherPay } from "@/lib/store";
import { clientStats } from "@/lib/metrics";
import {
  Avatar,
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
  clientInitials,
  formatMoney,
} from "@/lib/utils";
import type { Currency } from "@/lib/types";

export default function ClientsPage() {
  const { data, addClient, deleteClient } = useSherPay();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Accra");
  const [country, setCountry] = useState("Ghana");
  const [currency, setCurrency] = useState<Currency>("GHS");
  const [notes, setNotes] = useState("");

  const rows = useMemo(() => {
    let list = [...data.clients];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.company.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s)
      );
    }
    return list;
  }, [data.clients, q]);

  function submit() {
    if (!name.trim() && !company.trim())
      return alert("Name or company required");
    addClient({
      name: name.trim() || company.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      country: country.trim(),
      currency,
      notes: notes.trim(),
    });
    setOpen(false);
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setAddress("");
    setNotes("");
    setToast("Client added");
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="People and businesses you invoice."
        actions={<Button onClick={() => setOpen(true)}>+ Add client</Button>}
      />

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:w-72"
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No clients yet"
            description="Add a client before creating invoices."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                Add client
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const stats = clientStats(data, c.id);
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar initials={clientInitials(c.company || c.name)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900">
                      {c.company || c.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {c.name}
                      {c.company ? ` · ${c.email}` : ` · ${c.email}`}
                    </div>
                  </div>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {c.currency}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">
                      Billed
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {formatMoney(stats.totalBilled)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">
                      Outstanding
                    </div>
                    <div className="text-sm font-bold text-rose-600">
                      {formatMoney(stats.totalOutstanding)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {stats.invoices.length} invoice
                    {stats.invoices.length === 1 ? "" : "s"} · {c.city}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-rose-600 hover:text-rose-500"
                    onClick={() => {
                      if (
                        confirm(
                          "Delete this client? Existing invoices will keep the ID reference."
                        )
                      )
                        deleteClient(c.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add client" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Contact name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233 …"
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Input
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <Select
            label="Preferred currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="GHS">GHS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save client</Button>
        </div>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
