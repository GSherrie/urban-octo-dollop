// Supabase Edge Function: momo-upgrade
// ============================================================================
// Buys a SherPay Pro upgrade with Ghana mobile money, on a payment reference
// this function issues. Three routes on one function:
//
//   POST { action:'init',   email, plan, billing, provider, number }
//        → issues the reference, stores the order, pushes the charge into the
//          customer's wallet; returns the reference to poll.
//   POST { action:'status', ref } → re-verifies with Paystack and returns a
//          redacted view of the order. Safe to poll; safe after a page reload.
//   POST (raw Paystack webhook body, x-paystack-signature header) → settles a
//          paid order even when the customer closed the tab.
//
// Deploy:
//   supabase functions deploy momo-upgrade --project-ref <ref> --no-verify-jwt
//   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
//   (then point the dashboard webhook at <project>/functions/v1/momo-upgrade,
//    event charge.success)
//
// Apply the table first: supabase/migrations/20261006_payments.sql
//
// Security notes, because this file holds money decisions:
//   · the Paystack secret key lives only in function secrets — the browser is
//     given nothing but the reference;
//   · the amount charged is read from the price table in core.mjs, never from
//     the request body;
//   · the order table has no anon policy, so nothing here can be read or
//     written over REST by a logged-in customer;
//   · every paid order is re-verified against Paystack by reference before
//     Pro is granted, and the grant is written once (see settle()).
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  issueOrder, newReference, isReference, publicOrder, nextStatus, paymentMatches,
  paystackInitBody, toMinor, webhookValid, providerById, planLabel, walletLabel,
} from './core.mjs';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/* Paystack's own base URL; kept as a secret-adjacent constant rather than user
   input so a request can never point the function at a different API. */
const PS_URL = 'https://api.paystack.co';

async function paystack(path: string, body?: Record<string, unknown>) {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
  if (!secret) return { error: 'PAYSTACK_SECRET_KEY is not set on this function' };
  const res = await fetch(PS_URL + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { httpStatus: res.status, ...JSON.parse(text) }; }
  catch { return { httpStatus: res.status, raw: text }; }
}

/* ---------------- settling one reference ----------------
   Moves a reference to 'paid' and grants the plan — once. `tx` is ALWAYS a
   transaction read back from Paystack (never a claim from the browser), and
   paymentMatches() re-checks reference + amount + currency before anything is
   written. The row flip itself is the lock: only the writer that changes a
   not-yet-paid row to 'paid' continues, so the polling page and the webhook
   racing on one reference cannot grant Pro twice (nor double-charge anyone). */
async function settle(admin: ReturnType<typeof createClient>, ref: string, tx: any) {
  const { data: row, error: rowError } = await admin.from('payments').select('*').eq('reference', ref).maybeSingle();
  if (rowError) throw new Error('Could not load this payment reference.');
  if (!row) return { ok: false, error: 'unknown reference' };
  if (row.status === 'paid') {
    if (!row.granted_at) {
      const userId = await grantPlan(admin, row, tx);
      if (userId) {
        const { error } = await admin.from('payments')
          .update({ user_id: userId, granted_at: nowIso(), updated_at: nowIso() })
          .eq('reference', ref).is('granted_at', null);
        if (error) throw new Error('Payment is verified, but the Pro grant could not be recorded.');
      }
    }
    const { data: current, error } = await admin.from('payments').select('*').eq('reference', ref).maybeSingle();
    if (error) throw new Error('Could not reload this payment reference.');
    return { ok: true, order: publicOrder(current || row), already: true };
  }

  const expected = { reference: row.provider_reference || row.ref, amount_minor: toMinor(row.amount), currency: row.currency };
  if (!paymentMatches(tx, expected)) {
    const successWithMismatch = String(tx?.status || '').toLowerCase() === 'success';
    const status = nextStatus(row.status, successWithMismatch ? 'failed' : tx?.status, new Date(), row.expires_at);
    if (status !== row.status) {
      const { error } = await admin.from('payments')
        .update({
          status,
          last_error: successWithMismatch
            ? 'Paystack transaction reference, amount, or currency did not match this payment.'
            : tx?.gateway_response || tx?.message || row.last_error,
          updated_at: new Date().toISOString(),
        })
        .eq('reference', ref);
      if (error) throw new Error('Could not record the failed payment verification.');
    }
    return {
      ok: false,
      order: publicOrder({
        ...row,
        status,
        last_error: successWithMismatch
          ? 'Paystack transaction reference, amount, or currency did not match this payment.'
          : tx?.gateway_response || row.last_error,
      }),
    };
  }

  const paidAt = tx.paid_at || new Date().toISOString();
  const { data: flipped, error: flipError } = await admin.from('payments')
    .update({
      status: 'paid', paid_at: paidAt, updated_at: new Date().toISOString(),
      amount_paid: Number(tx.amount || 0) / 100,
      paystack_reference: tx.reference || row.provider_reference,
      provider_channel: tx.channel || 'mobile_money',
      checkout_url: null,
    })
    .eq('reference', ref).neq('status', 'paid').select('reference');
  if (flipError) throw new Error('Verified payment could not be recorded.');
  if (!flipped || !flipped.length) {
    const { data: other, error } = await admin.from('payments').select('*').eq('reference', ref).maybeSingle();
    if (error) throw new Error('Could not reload this payment reference.');
    return { ok: true, order: publicOrder(other || row), already: true };
  }

  const userId = await grantPlan(admin, { ...row, paid_at: paidAt }, tx);
  if (userId) {
    const { error } = await admin.from('payments')
      .update({ user_id: userId, granted_at: paidAt, updated_at: nowIso() })
      .eq('reference', ref).is('granted_at', null);
    if (error) throw new Error('Payment is verified, but the Pro grant could not be recorded.');
  }
  const { data: done, error: readError } = await admin.from('payments').select('*').eq('reference', ref).maybeSingle();
  if (readError) throw new Error('Payment was verified, but its status could not be reloaded.');
  return { ok: true, order: publicOrder(done || { ...row, status: 'paid', paid_at: paidAt }) };
}

/* Re-ask Paystack what happened to a reference and settle from the answer.
   This is the only place a status READ can change the world, which is what
   makes it safe for the checkout page to poll it as often as it likes. */
async function reverify(admin: ReturnType<typeof createClient>, row: any) {
  if (row.status === 'paid') return await settle(admin, row.ref, null);
  const res: any = await paystack('/transaction/verify/' + encodeURIComponent(row.provider_reference || row.ref));
  const { error: checkError } = await admin.from('payments')
    .update({ last_checked_at: nowIso(), updated_at: nowIso() })
    .eq('reference', row.ref);
  if (checkError) throw new Error('Could not record the payment verification attempt.');
  const tx = res?.httpStatus >= 200 && res?.httpStatus < 300 && res?.status === true ? res.data : null;
  // Provider unreachable: report "nothing has changed", never end the order.
  if (!tx) return { ok: true, order: publicOrder(row), unreachable: true };
  return await settle(admin, row.ref, tx);
}

async function findAccountByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const target = String(email || '').toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('Could not locate the SherPay account for this payment.');
    const users: any[] = data?.users || [];
    const found = users.find((user) => String(user.email || '').toLowerCase() === target);
    if (found) return found;
    if (users.length < 1000) return null;
  }
}

/* ---------------- handing out the plan ----------------
   Two places, both best-effort, neither allowed to fail a payment that really
   arrived:
     · auth.users app_metadata — the durable record keyed to the account, and
       the fallback a device reads when its workspace copy is behind the payment;
     · that account's cloud_state document — so a phone sitting on the upgrade
       page sees Pro the moment it pulls, without another endpoint.
   An email with no account is not a failed payment: the reference is still the
   receipt, and the app picks the plan up once that email signs up. */
async function grantPlan(admin: ReturnType<typeof createClient>, order: any, tx: any) {
  const wallet = walletLabel(order.momo_provider);
  const meta = {
    sherpay_plan: order.plan, sherpay_billing: order.billing,
    sherpay_paid_at: order.paid_at, sherpay_ref: order.ref, sherpay_wallet: wallet,
  };
  let found: any = null;
  if (order.user_id) {
    const { data, error } = await admin.auth.admin.getUserById(order.user_id);
    if (error) throw new Error('Could not load the SherPay account for this verified payment.');
    found = data?.user || null;
  } else {
    found = await findAccountByEmail(admin, order.email);
  }
  let userId = '';
  if (found) {
    userId = found.id;
    const { error } = await admin.auth.admin.updateUserById(found.id, { app_metadata: { ...(found.app_metadata || {}), ...meta } });
    if (error) throw new Error('Verified payment could not activate the SherPay account.');
  }
  if (!userId) return;

  const { data: cs, error: readError } = await admin.from('cloud_state').select('data').eq('user_id', userId).maybeSingle();
  if (readError) throw new Error('The payment was verified, but the account workspace could not be loaded.');
  if (cs) {
    const data: any = cs.data || {};
    data.settings = data.settings || {};
    data.settings.plan = {
      tier: order.plan, billing: order.billing, paid_at: order.paid_at,
      ref: order.ref, wallet, amount: Number(order.amount || 0), currency: order.currency,
    };
    if (Array.isArray(data.activity)) {
      data.activity.unshift({
        id: 'plan-' + order.ref, ts: Date.parse(order.paid_at) || Date.now(), type: 'plan',
        message: planLabel(order) + ' unlocked — paid with ' + wallet + ' (ref ' + order.ref + ')' +
          (tx?.reference ? ', ' + tx.reference : ''),
      });
      if (data.activity.length > 200) data.activity.length = 200;
    }
    /* Stamped one second ahead so the paying device pulls this document instead
       of pushing its stale copy over the grant: the payment is the truth here. */
    const { error } = await admin.from('cloud_state')
      .update({ data, updated_at: new Date(Date.now() + 1000).toISOString() })
      .eq('user_id', userId);
    if (error) throw new Error('The payment was verified, but the account workspace could not be updated.');
  }
  return userId;
}

const nowIso = () => new Date().toISOString();

/* ---------------- POST { action:'init', … } ---------------- */
async function handleInit(admin: ReturnType<typeof createClient>, body: any, origin: string) {
  const rand = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const issued = issueOrder(body || {}, { now: new Date(), rand });
  if (!issued.ok) return json({ ok: false, error: issued.error, field: issued.field }, 400);
  if (!issued.row) return json({ ok: false, error: 'Could not create a payment request.' }, 400);
  const issuedRow = issued.row;

  /* Fail BEFORE a row is written when the server itself is misconfigured:
     a missing key would only surface at Paystack anyway, and the resulting
     failed row is noise the customer can do nothing about. */
  if (!Deno.env.get('PAYSTACK_SECRET_KEY')) {
    return json({ ok: false, error: 'Payments are not configured on this server yet (PAYSTACK_SECRET_KEY is missing).' }, 503);
  }
  const account = await findAccountByEmail(admin, issuedRow.email);

  /* Insert the order. A reference collision is essentially impossible, but it
     is cheaper to re-roll than to show an error over a random clash. */
  let row: any = null;
  for (let tries = 0; tries < 3 && !row; tries++) {
    if (tries) {
      issuedRow.ref = newReference(new Date(), rand);
      issuedRow.provider_reference = issuedRow.ref;
    }
    const { ref, provider_reference, channel, ...order } = issuedRow;
    const ins: any = await admin.from('payments').insert({
      ...order,
      user_id: account?.id || null,
      reference: ref,
      paystack_reference: provider_reference,
      payment_method: channel,
    }).select('*').single();
    if (ins?.data) row = ins.data;
    else if (!/duplicate|unique/i.test(String(ins?.error?.message || ''))) {
      return json({ ok: false, error: 'Could not open a payment request. Please try again.' }, 502);
    }
  }
  if (!row) return json({ ok: false, error: 'Could not issue a payment reference. Please try again.' }, 502);

  // Ask Paystack for a mobile-money-only transaction under OUR reference. The
  // authorization_url it returns is the hosted wallet page — kept as the
  // fallback for wallets or accounts where a direct push is not permitted.
  const callback = (origin || '') + '/upgrade.html?ref=' + encodeURIComponent(row.ref);
  const init: any = await paystack('/transaction/initialize', paystackInitBody(row, { callbackUrl: callback }));
  const tx = init?.data || {};
  if (!init?.status || !tx.authorization_url) {
    /* paystack() reports failures under `error` (network/parse problems) or
       `message` (Paystack's own refusal) — read both so the customer never
       sees a generic message when the real reason is known. */
    const why = init?.error || init?.message || init?.raw || 'the payment provider did not accept the request';
    await admin.from('payments').update({ status: 'failed', last_error: why, updated_at: nowIso() }).eq('reference', row.ref);
    return json({ ok: false, error: 'The payment provider refused the request: ' + why, ref: row.ref }, 502);
  }
  const { error: pendingError } = await admin.from('payments')
    .update({ status: 'pending', checkout_url: tx.authorization_url, provider_tx_id: String(tx.id || ''), updated_at: nowIso() })
    .eq('reference', row.ref);
  if (pendingError) throw new Error('Paystack initialized the transaction, but its checkout could not be saved. Keep reference ' + row.ref + '.');

  /* Push the charge into the wallet the customer just typed: identify their
     mobile money identity, then authorize the transaction against it. If either
     step is refused (some wallets need the hosted page or an OTP), the order
     does not fail — we hand back the hosted link, same wallet, one tap deeper. */
  const prov = providerById(row.momo_provider);
  const code = tx.authorization_code || tx.access_code || '';
  let pushError = '';
  if (prov && code) {
    const ident: any = await paystack('/transaction/identify', {
      email: row.email,
      authorization_code: code,
      identity: { type: 'mobile_money', mobile_money: { provider: prov.paystack, country: 'gh', mobile_number: row.momo_number } },
    });
    if (ident?.status && ident?.data?.identity) {
      const authed: any = await paystack('/transaction/customer-authorize', {
        email: row.email, authorization_code: code, auth_method: 'mobile_money',
      });
      if (authed?.status) {
        const { error } = await admin.from('payments')
          .update({ status: 'awaiting_approval', attempts: 1, last_error: null, updated_at: nowIso() })
          .eq('reference', row.ref);
        if (error) throw new Error('The Mobile Money prompt started, but its status could not be saved. Keep reference ' + row.ref + '.');
        row = { ...row, status: 'awaiting_approval', last_error: null };
      } else pushError = authed?.message || 'the wallet did not accept the prompt';
    } else pushError = ident?.message || 'that number could not be matched to a wallet';
  } else pushError = 'mobile money prompt could not be started';

  if (pushError) {
    const { error } = await admin.from('payments').update({ status: 'pending', last_error: pushError, updated_at: nowIso() }).eq('reference', row.ref);
    if (error) throw new Error('Could not save the Mobile Money fallback status. Keep reference ' + row.ref + '.');
    row = { ...row, status: 'pending', last_error: pushError };
  }
  return json({ ok: true, hint: issued.hint || '', order: publicOrder({ ...row, checkout_url: tx.authorization_url }) });
}

/* ---------------- POST { action:'status', ref } ---------------- */
async function handleStatus(admin: ReturnType<typeof createClient>, ref: string) {
  if (!isReference(ref)) return json({ ok: false, error: 'That is not a SherPay payment reference.' }, 400);
  const { data: row, error } = await admin.from('payments').select('*').eq('reference', ref).maybeSingle();
  if (error) return json({ ok: false, error: 'Could not load this payment reference.' }, 500);
  if (!row) return json({ ok: false, error: 'No payment request with that reference.' }, 404);
  const out = await reverify(admin, row);
  return json({ ok: true, order: out.order });
}

/* ---------------- the webhook ----------------
   Paystack signs the raw body with an HMAC-SHA512 of the integration secret
   key, so an unsigned or forged body never reaches settle(). */
async function handleWebhook(admin: ReturnType<typeof createClient>, raw: string, signature: string) {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
  if (!(await webhookValid(raw, signature, secret))) return json({ ok: false, error: 'invalid signature' }, 401);
  let ev: any = {};
  try { ev = JSON.parse(raw); } catch { return json({ ok: false, error: 'unparseable body' }, 400); }
  const ref = ev?.data?.reference || '';
  if (!ref || ev?.event !== 'charge.success') return json({ ok: true, ignored: true });
  const { data: row, error } = await admin.from('payments').select('*').eq('paystack_reference', ref).maybeSingle();
  if (error) return json({ ok: false, error: 'Could not load the payment for this webhook.' }, 500);
  if (!row) return json({ ok: true, ignored: true });
  const out = await reverify(admin, row);
  if ('unreachable' in out && out.unreachable) return json({ ok: false, error: 'Paystack verification is temporarily unavailable; retry this webhook.' }, 502);
  return json({ ok: true, ref: row.ref, status: out.order?.status || row.status });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST is required.' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // A signed webhook arrives as itself — read the raw text before any JSON.
    const signature = req.headers.get('x-paystack-signature') || '';
    const raw = await req.text();
    if (signature) return await handleWebhook(admin, raw, signature);

    const body: any = await Promise.resolve().then(() => JSON.parse(raw)).catch(() => ({}));
    if (body?.event) return json({ ok: false, error: 'Missing Paystack webhook signature.' }, 401);
    if (body?.action === 'init') {
      const origin = (req.headers.get('origin') || Deno.env.get('SHERPAY_SITE_URL') || '').replace(/\/$/, '');
      return await handleInit(admin, body, origin);
    }
    if (body?.action === 'status') return await handleStatus(admin, String(body.ref || ''));
    return json({ ok: false, error: 'Unknown action. Expected init or status.' }, 404);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});