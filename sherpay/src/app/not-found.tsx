import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
        404 · NOT_FOUND
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        This page doesn’t exist
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        It may have been moved, removed, or never existed. If you expected a
        SherPay screen here, use the navigation or go back to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Go to dashboard
        </Link>
        <Link
          href="/invoices"
          className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Invoices
        </Link>
      </div>
    </div>
  );
}
