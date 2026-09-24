export const BRAND_NAME = "SherPay";

export const CURRENCY_DEFAULT = "GHS";

export const SUPPORTED_CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN"] as const;

export const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "bank", label: "Bank" },
  { id: "mtn-momo", label: "MTN MoMo" },
  { id: "telecel-cash", label: "Telecel Cash" },
  { id: "at-money", label: "AT Money" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export function paymentMethodLabel(id: string | null | undefined): string {
  if (!id) return "—";
  const found = PAYMENT_METHODS.find((m) => m.id === id);
  if (found) return found.label;
  // Backwards compatibility with older labels stored as free text.
  const normalized = id.trim().toLowerCase();
  if (normalized.includes("mtn")) return "MTN MoMo";
  if (normalized.includes("telecel") || normalized.includes("vodafone")) return "Telecel Cash";
  if (normalized.includes("airteltigo") || normalized === "at money" || normalized === "at-money")
    return "AT Money";
  if (normalized === "bank transfer" || normalized === "bank") return "Bank";
  if (normalized === "card" || normalized.includes("card")) return "Bank";
  if (normalized.includes("paypal")) return "Bank";
  return id;
}

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Shopping",
  "Education",
  "Entertainment",
  "Business",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Business",
  "Freelance",
  "Investment",
  "Gift",
  "Other",
] as const;
