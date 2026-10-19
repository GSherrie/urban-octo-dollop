// Supabase Edge Function: pay-verify
// Verifies a Paystack transaction server-side, then marks the payment request paid.
//
// Deploy (no Docker needed):
//   supabase functions deploy pay-verify --project-ref jmmrcrnfwyrbejhechke --no-verify-jwt
//   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx   (or sk_test_ for testing)
//
// Called by pay.html after Paystack's inline checkout callback:
//   POST { token, reference }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { token, reference } = await req.json();
    if (!token || !reference) return json({ error: 'token and reference are required' }, 400);

    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) return json({ error: 'PAYSTACK_SECRET_KEY is not configured on the function' }, 500);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: row, error: rowErr } = await admin
      .from('payment_requests')
      .select('*')
      .eq('token', token)
      .single();
    if (rowErr || !row) return json({ error: 'payment request not found' }, 404);
    if (row.status === 'paid') return json({ status: 'paid' });

    // Ask Paystack directly — the client callback is never trusted on its own.
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(reference))}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const verify = await verifyRes.json();
    const tx = verify?.data;

    const expectedMinor = Math.round(Number(row.payload?.totals?.balance ?? 0) * 100);
    const paid =
      verify?.status === true &&
      tx?.status === 'success' &&
      Number(tx?.amount ?? 0) >= expectedMinor &&
      (!tx?.currency || !row.payload?.invoice?.currency || tx.currency === row.payload.invoice.currency);

    if (!paid) return json({ status: tx?.status || 'failed', verified: false });

    await admin
      .from('payment_requests')
      .update({
        status: 'paid',
        reference: String(reference),
        amount_paid: Number(tx.amount) / 100,
        currency: tx.currency || row.payload?.invoice?.currency || null,
        paid_at: new Date().toISOString(),
      })
      .eq('token', token);

    return json({ status: 'paid', verified: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
