import { makeResendSettings, ResendEmailProvider } from "./provider"

export interface VerificationEmailOptions {
  to: string
  verifyUrl: string
}

export async function sendVerificationEmail(
  options: VerificationEmailOptions,
): Promise<{ ok: boolean; error?: string }> {
  const provider = new ResendEmailProvider(makeResendSettings())
  const html = verificationEmailHtml(options.to, options.verifyUrl)
  const result = await provider.send(
    options.to,
    "Confirm your SherPay account",
    html,
    stripHtmlForText(html),
  )
  if (result.ok) {
    return { ok: true }
  }
  return { ok: false, error: result.error }
}

export function verificationEmailHtml(to: string, verifyUrl: string): string {
  const fromName = (process.env["RESEND_FROM_NAME"] || "SherPay").trim() || "SherPay"
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirm your SherPay account</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0b1b3a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fc;padding:40px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;box-shadow:0 6px 20px rgba(11,27,58,0.06);padding:40px 32px">
          <tr>
            <td align="center" style="border-bottom:1px solid #eef2f8;padding-bottom:24px">
              <span style="font-size:22px;font-weight:700;letter-spacing:-0.3px">${escapeHtml(fromName)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0 24px">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700">Check your email</h1>
              <p style="margin:0 0 20px;color:#4b5563;line-height:1.6">
                Thanks for joining SherPay. Please confirm your email address to finish setting up your account.
              </p>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px">
                We sent this to <strong>${escapeHtml(to)}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:14px">
                    <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:14px 28px;background:#2563eb;border-radius:10px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">
                      Confirm email address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6">
                If the button above does not work, paste this link into your browser:<br />
                <a href="${escapeHtml(verifyUrl)}" style="color:#2563eb">${escapeHtml(verifyUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="border-top:1px solid #eef2f8;padding-top:20px">
              <p style="margin:0;color:#9ba3af;font-size:12px;line-height:1.6">
                If you did not create an account, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

export function stripHtmlForText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
