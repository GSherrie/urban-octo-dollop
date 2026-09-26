import AppShell from "@/components/app-shell";
import { PageSkeleton } from "@/components/feedback";
export default function Loading() {
  return (
    <AppShell title="Loading" sub="Fetching your workspace…">
      <PageSkeleton />
    </AppShell>
  );
}