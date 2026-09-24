import AppShell from "@/components/app-shell";
import TxForm from "@/components/tx-form";
export default function NewIncomePage() {
  return (
    <AppShell title="Add income" sub="Record money coming in.">
      <div className="mx-auto max-w-xl"><TxForm type="income" /></div>
    </AppShell>
  );
}
