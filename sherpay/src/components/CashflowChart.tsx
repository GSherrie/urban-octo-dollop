"use client";

import { formatMoney, monthLabel } from "@/lib/utils";

export function CashflowChart({
  data,
}: {
  data: Array<{ month: string; collected: number; spent: number }>;
}) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.collected, d.spent])
  );

  return (
    <div className="px-5 py-4">
      <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Collected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Spent
        </span>
      </div>

      <div className="flex h-44 items-end gap-3 sm:gap-4">
        {data.map((d) => {
          const cH = Math.round((d.collected / max) * 100);
          const sH = Math.round((d.spent / max) * 100);
          return (
            <div
              key={d.month}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex h-36 w-full items-end justify-center gap-1">
                <div
                  className="w-[42%] max-w-6 rounded-t-md bg-emerald-500 transition group-hover:bg-emerald-400"
                  style={{ height: `${Math.max(cH, d.collected > 0 ? 4 : 0)}%` }}
                  title={`Collected ${formatMoney(d.collected)}`}
                />
                <div
                  className="w-[42%] max-w-6 rounded-t-md bg-slate-300 transition group-hover:bg-slate-400"
                  style={{ height: `${Math.max(sH, d.spent > 0 ? 4 : 0)}%` }}
                  title={`Spent ${formatMoney(d.spent)}`}
                />
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {monthLabel(d.month)}
              </div>
              <div className="hidden text-[10px] text-slate-400 sm:block">
                <div>↑ {formatMoney(d.collected)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
