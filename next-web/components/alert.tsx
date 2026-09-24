import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info";

const toneClass: Record<Tone, string> = {
  error: "border-danger-border bg-danger-soft text-danger",
  success: "border-success-border bg-success-soft text-success",
  info: "border-line bg-surface-subtle text-ink-secondary",
};

const ToneIcon = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
} as const;

export function Alert({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = ToneIcon[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-md border p-3 text-sm leading-6", toneClass[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
