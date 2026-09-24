import { createClient } from "@/utils/supabase/client";
import type { TxType } from "@/lib/data";
export interface TxFormValues {
  amount: string;
  category: string;
  detail: string;
  date: string;
  method: string;
}
export function validateTx(v: TxFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  const amt = Number(v.amount);
  if (!v.amount.trim()) e.amount = "Enter an amount.";
  else if (!Number.isFinite(amt) || amt <= 0) e.amount = "Amount must be greater than zero.";
  else if (amt > 100000000) e.amount = "Amount looks too large.";
  if (!v.category) e.category = "Choose a category.";
  if (!v.date) e.date = "Choose a date.";
  else if (v.date > new Date().toISOString().slice(0, 10)) e.date = "Date cannot be in the future.";
  if (!v.method) e.method = "Choose a payment method.";
  if (v.detail.trim().length > 140) e.detail = "Keep this under 140 characters.";
  return e;
}
export async function saveTx(type: TxType, values: TxFormValues, editId?: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in and try again." };
  const amt = Math.round(Number(values.amount) * 100) / 100;
  const detail = values.detail.trim() || null;
  const base = { user_id: user.id, amount: amt, category: values.category, date: values.date, payment_method: values.method };
  try {
    if (editId) {
      if (type === "expense") {
        const { error } = await supabase.from("expenses").update({ ...base, vendor: detail }).eq("id", editId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("income").update({ ...base, source: detail }).eq("id", editId).eq("user_id", user.id);
        if (error) throw error;
      }
      const { error: txUpdateError } = await supabase.from("transactions").update({ amount: amt, category: values.category, date: values.date, payment_method: values.method }).eq("reference_id", editId).eq("user_id", user.id);
      if (txUpdateError) throw txUpdateError;
    } else if (type === "expense") {
      const { data, error } = await supabase.from("expenses").insert({ ...base, vendor: detail }).select("id").single();
      if (error) throw error;
      const refId = (data as { id: string }).id;
      const { error: txErr } = await supabase.from("transactions").insert({ user_id: user.id, type, amount: amt, category: values.category, date: values.date, payment_method: values.method, reference_id: refId, reference_type: type });
      if (txErr) throw txErr;
    } else {
      const { data, error } = await supabase.from("income").insert({ ...base, source: detail }).select("id").single();
      if (error) throw error;
      const refId = (data as { id: string }).id;
      const { error: txErr } = await supabase.from("transactions").insert({ user_id: user.id, type, amount: amt, category: values.category, date: values.date, payment_method: values.method, reference_id: refId, reference_type: type });
      if (txErr) throw txErr;
    }
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save. Try again." };
  }
}
export async function deleteTx(type: TxType, id: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out." };
  try {
    await supabase.from("transactions").delete().eq("reference_id", id).eq("user_id", user.id);
    if (type === "expense") {
      const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("income").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    }
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete. Try again." };
  }
}
