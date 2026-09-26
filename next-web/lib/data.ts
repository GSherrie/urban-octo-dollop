import { createClient } from "@/utils/supabase/client";
export type TxType = "income" | "expense";
export interface TxRow {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  category: string | null;
  date: string;
  payment_method: string | null;
  reference_id?: string | null;
  note?: string | null;
}
export interface ProfileRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  currency: string | null;
}
export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return data as ProfileRow | null;
}
export function txDescription(r: TxRow, fallback: string): string {
  return r.category || fallback;
}

