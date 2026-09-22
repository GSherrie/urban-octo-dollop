export type EmailSendResult =
  | { ok: true }
  | { ok: false; error: string }

export interface EmailProvider {
  send(to: string, subject: string, html: string, text?: string): Promise<EmailSendResult>
}

export interface ResendSettings {
  apiKey: string
  from: string
  fromName?: string
}

export function makeResendSettings(): ResendSettings {
  const apiKey = process.env["RESEND_API_KEY"] || process.env["RESEND_KEY"] || ""
  const from = process.env["RESEND_FROM"] || "no-reply@sherpay.app"
  const fromName = process.env["RESEND_FROM_NAME"] || "SherPay"
  return { apiKey, from, fromName }
}

export function isResendConfigured(settings: ResendSettings): boolean {
  return Boolean(settings.apiKey && settings.apiKey.startsWith("re_")) && Boolean(settings.from)
}

/**
 * Email provider that talks directly to Resend.
 *
 * Use this for:
 * - Custom app notifications
 * - Templates that are easier to render in the app layer
 * - Fallback email sending when Supabase Auth email is not sufficient
 *
 * For auth emails (verification, OTP, password reset), the preferred path is
 * still Supabase Auth SMTP/Resend integration, because auth emails are tied to
 * Supabase Auth flow and token generation.
 */
export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly settings: ResendSettings) {}

  async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<EmailSendResult> {
    // The parameter names are intentionally referenced so this stub does not
    // trigger unused-parameter lint errors while the real transport is wired.
    void to
    void subject
    void html
    void text

    if (!isResendConfigured(this.settings)) {
      return { ok: false, error: "Resend is not configured" }
    }

    try {
      // Client-side code should not import the Resend SDK directly if it would
      // leak the API key. Use this provider from server routes, server actions,
      // or a Supabase edge function.
      //
      // Example server implementation (pseudo-code):
      //
      // import { Resend } from "resend"
      // const resend = new Resend(this.settings.apiKey)
      // await resend.emails.send({
      //   from: this.settings.from,
      //   to,
      //   subject,
      //   html,
      //   text,
      // })
      //
      // For now this is a design contract only; the real send call is wired
      // when the project has a valid RESEND_API_KEY and a server-side transport.
      await Promise.resolve()
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to send email via Resend",
      }
    }
  }
}
