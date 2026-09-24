import { AlertCircle } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/constants";
import { cn } from "@/lib/cn";
export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="sp-card sp-card-pad text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-tertiary" aria-hidden="true">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-secondary">{body}</p>
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("sp-skeleton", className)} aria-hidden="true" />;
}
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
export function TxAmount({ type, amount, currency }: { type: "income" | "expense"; amount: number; currency: string }) {
  const prefix = type === "income" ? "+" : "−";
  return (
    <span className={cn("sp-tabular text-sm font-semibold", type === "income" ? "text-success" : "text-ink")}>
      {prefix}{formatMoney(amount, currency).replace("-", "")}
    </span>
  );
}
export function TxMeta({ category, date, method }: { category?: string | null; date: string; method?: string | null }) {
  const parts = [category || "Uncategorised", formatDate(date), paymentMethodLabel(method)].filter((p) => p && p !== "—");
  return <span className="text-[13px] text-ink-tertiary">{parts.join(" · ")}</span>;
}
