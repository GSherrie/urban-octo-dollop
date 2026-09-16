"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";
import { statusLabel } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "emerald",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "sky" | "amber" | "rose" | "violet";
}) {
  const accents = {
    emerald: "from-emerald-500/15 to-teal-500/5 text-emerald-700",
    sky: "from-sky-500/15 to-blue-500/5 text-sky-700",
    amber: "from-amber-500/15 to-orange-500/5 text-amber-700",
    rose: "from-rose-500/15 to-pink-500/5 text-rose-700",
    violet: "from-violet-500/15 to-indigo-500/5 text-violet-700",
  };
  return (
    <Card className="overflow-hidden p-5">
      <div
        className={cn(
          "mb-3 inline-flex rounded-lg bg-gradient-to-br px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
          accents[accent]
        )}
      >
        {label}
      </div>
      <div className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">
        {value}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    draft: "bg-slate-100 text-slate-700 ring-slate-200",
    sent: "bg-sky-50 text-sky-700 ring-sky-200",
    viewed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    overdue: "bg-rose-50 text-rose-700 ring-rose-200",
    partially_paid: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        styles[status]
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const variants = {
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/20",
    secondary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
    outline:
      "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium text-slate-600">{label}</span>
      ) : null}
      <input
        {...props}
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
          className
        )}
      />
    </label>
  );
}

export function Select({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium text-slate-600">{label}</span>
      ) : null}
      <select
        {...props}
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
          className
        )}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium text-slate-600">{label}</span>
      ) : null}
      <textarea
        {...props}
        className={cn(
          "min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
          className
        )}
      />
    </label>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h10M4 17h7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white",
        className
      )}
    >
      {initials}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  onDone,
}: {
  message: string | null;
  onDone: () => void;
}) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}
