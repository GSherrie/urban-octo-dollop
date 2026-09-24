import type { ReactNode } from "react";

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-lg bg-brand-900 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.44, letterSpacing: "-0.02em" }}
    >
      S
    </span>
  );
}

export function BrandLockup({ sub }: { sub?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <p className="text-[17px] font-semibold tracking-tight text-ink">
          Sher<span className="text-brand-600">Pay</span>
        </p>
        {sub ? <p className="text-xs text-ink-tertiary">{sub}</p> : null}
      </div>
    </div>
  );
}
