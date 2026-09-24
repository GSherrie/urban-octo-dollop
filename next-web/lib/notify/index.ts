export type NotifyResult = { ok: true } | { ok: false; error: string }

export type NotificationChannel = "email" | "in-app" | "both"

export interface NotificationOptions {
  channel?: NotificationChannel
  emailTo?: string
  subject?: string
  template?: "signup" | "reset" | "receipt" | "invoice" | "generic"
  data?: Record<string, string | number | boolean | null>
}

/**
 * SherPay notifications layer.
 *
 * This is the place for app-level messages that are not tightly coupled to
 * Supabase Auth token flow:
 * - invoice and receipt emails
 * - payment confirmations
 * - business notifications
 * - user-facing in-app toasts generated from server events
 *
 * Auth emails (verification, OTP, password reset) should still go through
 * Supabase Auth's email provider when possible, because they are part of the
 * auth token lifecycle.
 */
export async function notify(options: NotificationOptions): Promise<NotifyResult> {
  const channel = options.channel ?? "in-app"

  if (channel === "email" || channel === "both") {
    const emailResult = await sendAppEmail(options)
    if (!emailResult.ok) {
      return emailResult
    }
  }

  // In-app notifications are usually persisted to a notifications table or
  // published through Supabase Realtime so the client can render them.
  // For now this is a design placeholder.
  await recordInAppNotification(options)

  return { ok: true }
}

async function sendAppEmail(options: NotificationOptions): Promise<NotifyResult> {
  const { emailTo, subject, template, data } = options

  if (!emailTo) {
    return { ok: false, error: "emailTo is required for email channel" }
  }

  const subjectLine =
    subject ??
    template === "signup"
      ? "Welcome to SherPay"
      : template === "reset"
        ? "Reset your SherPay password"
        : template === "receipt"
          ? "Your SherPay receipt"
          : template === "invoice"
            ? "New SherPay invoice"
            : "SherPay notification"

  void subjectLine

  const body = appEmailBody(template, data)
  void body

  // Use the same Resend provider used by the email layer.
  // In server code this should be constructed from server-safe env access only.
  const apiKey = process.env["RESEND_API_KEY"] || process.env["RESEND_KEY"] || "";
  const from = process.env["RESEND_FROM"] || "no-reply@sherpay.app";
  void apiKey;
  void from;
  if (!process.env["RESEND_API_KEY"]?.startsWith("re_")) {
    return { ok: false, error: "Resend API key is not configured for app emails" }
  }

  // Server-side send placeholder:
  // import { Resend } from "resend"
  // const resend = new Resend(apiKey)
  // await resend.emails.send({ from, to: emailTo, subject: subjectLine, html: body })
  await Promise.resolve()

  return { ok: true }
}

export function appEmailBody(
  template: NotificationOptions["template"] | undefined,
  data?: Record<string, string | number | boolean | null>,
): string {
  const company = (data?.["companyName"] as string | undefined) || "SherPay"

  if (template === "signup") {
    return `
      <p>Welcome to ${escapeHtml(company)}.</p>
      <p>Your account has been created successfully.</p>
    `.trim()
  }

  if (template === "reset") {
    const resetUrl = (data?.["resetUrl"] as string | undefined) || ""
    return `
      <p>You requested a password reset for your ${escapeHtml(company)} account.</p>
      <p>
        <a href="${escapeHtml(resetUrl)}">Reset password</a>
      </p>
    `.trim()
  }

  if (template === "receipt") {
    const receipt = (data?.["receiptNumber"] as string | undefined) || "RCP-?"
    const amount = (data?.["amount"] as number | undefined) ?? 0
    const client = (data?.["clientName"] as string | undefined) || "your client"
    return `
      <p>Receipt <strong>${escapeHtml(receipt)}</strong> has been issued to ${escapeHtml(client)}.</p>
      <p>Amount: ${formatAmount(amount)}</p>
    `.trim()
  }

  if (template === "invoice") {
    const invoiceNumber = (data?.["invoiceNumber"] as string | undefined) || "INV-?"
    const total = (data?.["total"] as number | undefined) ?? 0
    const status = (data?.["status"] as string | undefined) || "sent"
    return `
      <p>Invoice <strong>${escapeHtml(invoiceNumber)}</strong> was created and is now <strong>${escapeHtml(status)}</strong>.</p>
      <p>Total: ${formatAmount(total)}</p>
    `.trim()
  }

  return `<p>SherPay notification.</p>`
}

async function recordInAppNotification(_options: NotificationOptions): Promise<void> {
  void _options
  // Placeholder for persisting notifications to the database and/or
  // broadcasting them through Supabase Realtime.
  await Promise.resolve()
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
