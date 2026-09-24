import AppShell from "@/components/app-shell";
import TxForm from "@/components/tx-form";
export default function NewExpensePage() {
  return (
    <AppShell title="Add expense" sub="Record money going out.">
      <div className="mx-auto max-w-xl"><TxForm type="expense" /></div>
    </AppShell>
  );
}
