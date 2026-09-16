export type Currency = "GHS" | "USD" | "EUR" | "GBP";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue";

export type PaymentMethod =
  | "mobile_money"
  | "bank_transfer"
  | "card"
  | "cash"
  | "other";

export type ExpenseCategory =
  | "software"
  | "travel"
  | "office"
  | "marketing"
  | "utilities"
  | "salaries"
  | "meals"
  | "other";

export interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  baseCurrency: Currency;
  logoInitials: string;
  invoicePrefix: string;
  paymentTermsDays: number;
  momoNumber: string;
  momoNetwork: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  currency: Currency;
  notes: string;
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  status: InvoiceStatus;
  currency: Currency;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  taxRate: number;
  notes: string;
  amountPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  date: string;
  vendor: string;
  receiptRef: string;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  reference: string;
  paidAt: string;
  notes: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type:
    | "invoice_created"
    | "invoice_sent"
    | "invoice_viewed"
    | "invoice_paid"
    | "payment_received"
    | "reminder_sent"
    | "receipt_generated"
    | "expense_logged"
    | "client_added";
  message: string;
  createdAt: string;
  meta?: Record<string, string>;
}

export interface SherPayData {
  settings: CompanySettings;
  clients: Client[];
  invoices: Invoice[];
  expenses: Expense[];
  payments: Payment[];
  activity: ActivityItem[];
  version: number;
}
