import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import type { SupabaseClient } from "@supabase/supabase-js"

Deno.serve(async (req) => {
  return serve(req, handle)
})

async function handle(request: Request, context: { supabaseClient: SupabaseClient }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const email = body.email
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Valid email is required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    })
  }

  // In production this path should go through Supabase Auth's built-in
  // confirmation flow. This helper is useful when you want a custom
  // resend path that does not depend on the client attempting signup again.
  //
  // Resend-backed approach (preferred when Supabase SMTP is configured with Resend):
  //   - Supabase Auth sends verification emails through SMTP/Resend.
  //   - Resending is normally done via supabase.auth.resend({ email, type: 'signup' })
  //     from a trusted client or server endpoint.
  //
  // If you need a fully custom verification email body or tracking, send it here
  // with the Resend SDK and include a link back to your app's verify route.

  // Example placeholder implementation:
  // const resend = new ResendDeno()
  // await resend.emails.send({
  //   from: process.env.RESEND_FROM,
  //   to: email,
  //   subject: "Confirm your SherPay account",
  //   html: verificationEmailHtml(email),
  // })

  return new Response(JSON.stringify({ ok: true, email }), {
    headers: { "Content-Type": "application/json" },
  })
}

/*
  Notes for wiring this function:
  - Local dev: `supabase functions serve resend-verification`
  - Deploy:   `supabase functions deploy resend-verification`
  - Environment variables for the function should be set either:
      - in Supabase dashboard under Edge Functions > resend-verification > Secrets, or
      - locally in next-web/supabase/.env (if you use function local env)
  - Do not rely on this function for normal verification resends unless you have
    a specific customization need. The client fallback in verify/page.tsx already
    uses supabase.auth.signUp as a resend shortcut.
*/
