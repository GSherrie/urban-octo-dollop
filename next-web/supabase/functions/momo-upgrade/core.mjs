/* SherPay ▸ Pro upgrades — the payment-reference system.
   ==========================================================================
   One row = one reference, and the reference is the spine of an upgrade
   payment: it is issued here (never by the browser), sent to Paystack as the
   transaction reference, stored on the row, shown to the customer, polled by
   the checkout page, replayed by the webhook, and re-checked on every
   verification. A payment only counts when the provider's transaction carries
   THIS reference, for at least THIS amount, in THIS currency. Everything that
   decides "is this money real, and is it for this order" lives in this file, so
   the edge function stays thin and the rules stay testable.

   Why a shared file: one source of truth for the edge function
   (Deno: `import * as core from './core.mjs'`) and for the regression suite
   (Node: `await import(...)`). The browser never imports this file — a page
   only ever talks to the edge function, so a secret key has nowhere to leak.

   Money: Ghanaian cedi, GH₵1 = 100 pesewas (Paystack wants pesewas). */

export const CURRENCY = 'GHS';

/* Price table. One-time, twelve months, Ghana cedi — Mobile Money in Ghana
   cannot auto-debit a wallet later, so a "monthly subscription" here would be a
   promise we cannot keep; the honest shape is "pay once, Pro for a year".
   Mirrored in web/js/store.js (PLANS) because the browser cannot import from
   supabase/functions; tests/test-momo-upgrade.js fails if the two drift. */
export const PLAN_PRICES = {
  pro: { yearly: 1, months: 12, currency: CURRENCY }
};

export const BILLINGS = ['annual'];

/* Price for a plan. `billing` is accepted and ignored on purpose: the column
   exists for a future recurring model, and old links still carry ?billing=.
   The server always decides the amount that gets charged. */
export function planPrice(plan) {
  const p = PLAN_PRICES[String(plan || '').toLowerCase()];
  if (!p) return null;
  return { plan: 'pro', billing: 'annual', months: p.months, amount: p.yearly, currency: p.currency };
}

/* Mobile money wallets SherPay accepts, with the name Paystack expects and the
   number ranges each wallet is usually issued in. */
export const PROVIDERS = [
  { id: 'mtn', label: 'MTN MoMo', wallet: 'MTN Mobile Money', paystack: 'MTN', dial: '*170#', prefixes: ['024', '025', '053', '054', '055', '059'] },
  { id: 'telecel', label: 'Telecel Cash', wallet: 'Telecel Cash', paystack: 'TELECEL', dial: '*110#', prefixes: ['020', '050'] },
  { id: 'at', label: 'AT Money', wallet: 'AirtelTigo Money', paystack: 'AIRTELTIGO', dial: '*111#', prefixes: ['026', '027', '056', '057', '096', '097', '098'] }
];

export function providerById(id) {
  const key = String(id || '').toLowerCase();
  for (let i = 0; i < PROVIDERS.length; i++) if (PROVIDERS[i].id === key) return PROVIDERS[i];
  return null;
}

/* Ghana wallet prompts lapse after half an hour; a reference older than this is
   expired rather than left "pending" forever. */
export const TTL_MINUTES = 30;

const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

/* ---------------- the reference ----------------
   Format SHP-UP-YYMMDD-XXXXXXXX. The date stamp makes a reference readable in
   a support ticket ("that one is from the 6th"), and the random tail avoids
   I, O, 0 and 1 so it survives being read out over the phone. */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REF_TAIL = 8;
export const REF_RE = /^SHP-UP-\d{6}-[A-HJ-NP-Z2-9]{8}$/;

/* `rand` is injectable so the suite can pin it; the edge function passes a
   CSPRNG. A reference is never built from Date.now() alone — two people
   upgrading in the same second must not collide. */
export function newReference(now, rand) {
  const d = now instanceof Date ? now : new Date(typeof now === 'number' ? now : Date.now());
  const pick = typeof rand === 'function' ? rand : () => Math.floor(Math.random() * REF_ALPHABET.length);
  const stamp = String(d.getFullYear()).slice(2) + pad2(d.getMonth() + 1) + pad2(d.getDate());
  let tail = '';
  for (let i = 0; i < REF_TAIL; i++) tail += REF_ALPHABET[Math.abs(pick()) % REF_ALPHABET.length];
  return 'SHP-UP-' + stamp + '-' + tail;
}

export function isReference(value) {
  return REF_RE.test(String(value || ''));
}

/* ---------------- the customer's wallet number ----------------
   Accepts 0 24 555 0110 / 0245550110 / +233 24 555 0110 / 233245550110 and
   rejects anything that could not be a Ghanaian wallet. */
export function normalizeMomoNumber(input, providerId) {
  const raw = String(input == null ? '' : input).replace(/[()\s.•\-]/g, '');
  if (!raw) return { ok: false, error: 'Enter the mobile money number to pay from.' };
  if (/[^\d+]/.test(raw)) return { ok: false, error: 'A mobile money number contains digits only.' };

  let digits = raw.replace(/^\+/, '').replace(/^00/, '');
  if (digits.indexOf('233') === 0 && digits.length === 12) digits = digits.slice(3);
  if (digits.length === 9 && digits[0] !== '0') digits = '0' + digits;
  /* A Ghana wallet number is 0 + nine digits (024 555 0110), or the same nine
     digits behind the +233 country code. Anything else cannot be charged. */
  if (!/^0\d{9}$/.test(digits)) {
    return { ok: false, error: 'Enter a valid Ghana number, e.g. 024 555 0110.', local: digits };
  }

  const prov = providerById(providerId);
  const out = { ok: true, local: digits, intl: '+233' + digits.slice(1), provider: prov ? prov.id : '', match: true, hint: '' };
  /* Numbers move between wallets, so a prefix that disagrees with the picked
     wallet is a hint and not a wall — a hard block here loses real payments. */
  if (prov) {
    out.match = prov.prefixes.some((p) => digits.indexOf(p) === 0);
    if (!out.match) {
      const owner = PROVIDERS.filter((p) => p.id !== prov.id).find((p) => p.prefixes.some((x) => digits.indexOf(x) === 0));
      out.hint = owner
        ? 'That looks like a ' + owner.wallet + ' number. Check you picked the right wallet.'
        : 'We will send the payment prompt to ' + prov.wallet + ' for this number.';
    }
  }
  return out;
}

export function normalizeEmail(input) {
  const email = String(input == null ? '' : input).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) ? email : null;
}

/* A wallet number is only ever shown back with the middle hidden — on the page
   and in every API response. Support quotes the reference, not the wallet. */
export function maskMomo(local) {
  const s = String(local || '');
  if (s.length < 6) return '';
  return s.slice(0, 3) + ' ' + s.slice(3, 6) + ' \u2022\u2022\u2022 ' + s.slice(-2);
}

export function maskEmail(email) {
  const s = String(email || '');
  const at = s.indexOf('@');
  if (at < 1) return s ? s.slice(0, 1) + '\u2022' : '';
  return s.slice(0, Math.min(2, at)) + '\u2022\u2022\u2022@' + s.slice(at + 1);
}

/* ---------------- the state machine ----------------
   created ─► pending ─► awaiting_approval ─► paid
       │          │            │      └─────► failed
       └──────────┴────────────┴────────────► expired (past TTL)
   'awaiting_approval' is what makes mobile money different from a card flow:
   no money has moved yet, the customer is being asked to approve a prompt on
   their handset, so the page must wait and ask again rather than assume.
   Terminal states never move again — a late webhook cannot resurrect an
   expired reference, it has to be re-opened deliberately by support. */
export const ACTIVE = ['created', 'pending', 'awaiting_approval'];
export const TERMINAL = ['paid', 'failed', 'expired'];

export function isTerminal(status) { return TERMINAL.indexOf(status) > -1; }

/* observed: what the provider reported ('success' | 'pending' | 'failed' | '')
   — empty means "we could not reach the provider", which must not end a row. */
export function nextStatus(current, observed, now, expiresAt) {
  const at = now instanceof Date ? now : new Date(now || Date.now());
  if (isTerminal(current)) return current;
  const obs = String(observed == null ? '' : observed).toLowerCase();
  if (obs === 'success' || obs === 'paid') return 'paid';
  if (obs === 'failed') return 'failed';
  const expires = expiresAt || (current && typeof current === 'object' ? current.expires_at : '');
  if (expires && at.getTime() > new Date(expires).getTime()) return 'expired';
  if (obs === 'awaiting' || obs === 'pending') return 'awaiting_approval';
  return ACTIVE.indexOf(current) > -1 ? current : 'created';
}

/* The only sentence a payment is allowed to end on: the provider transaction
   must be successful, carry OUR reference, cover OUR amount (pesewas) and be in
   OUR currency. A different reference is not "a payment we missed" — it is
   somebody else's payment, and crediting it would hand away a paid account. */
export function paymentMatches(tx, expected) {
  if (!tx) return false;
  if (String(tx.status || '').toLowerCase() !== 'success') return false;
  const wantRef = String((expected && expected.reference) || '');
  const gotRef = String(tx.reference || '');
  if (!wantRef || !gotRef || wantRef !== gotRef) return false;
  const received = Number(tx.amount);
  const required = Number((expected && expected.amount_minor) || 0);
  if (!Number.isFinite(received) || received < required) return false;
  const wantCur = String((expected && expected.currency) || '');
  if (!wantCur || !tx.currency || wantCur !== tx.currency) return false;
  return true;
}

export function toMinor(amount) { return Math.round(Number(amount || 0) * 100); }

/* ---------------- issuing an order ----------------
   Everything a row needs, decided server-side from validated input: a fresh
   reference, the price we are going to charge (not the price the browser sent),
   the TTL, and a status of 'created'. Pure — no database, no network — so the
   whole issue step is testable, and the edge function only has to insert. */
export function issueOrder(input, opts) {
  const o = opts || {};
  const now = o.now instanceof Date ? o.now : new Date(o.now || Date.now());
  const price = planPrice(input.plan, input.billing);
  if (!price) return { ok: false, field: 'plan', error: 'That plan is not on offer.' };
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, field: 'email', error: 'Enter the email your SherPay account uses.' };
  const prov = providerById(input.provider);
  if (!prov) return { ok: false, field: 'provider', error: 'Choose a mobile money wallet.' };
  const num = normalizeMomoNumber(input.number, prov.id);
  if (!num.ok) return { ok: false, field: 'number', error: num.error, hint: num.hint || '' };

  const ref = typeof o.reference === 'string' && o.reference ? o.reference : newReference(now, o.rand);
  if (!isReference(ref)) return { ok: false, field: 'ref', error: 'Could not issue a payment reference. Please try again.' };

  return {
    ok: true,
    hint: num.hint || '',
    row: {
      ref,
      email,
      plan: price.plan,
      billing: price.billing,
      amount: price.amount,
      currency: price.currency,
      status: 'created',
      provider: 'paystack',
      provider_reference: ref,
      channel: 'mobile_money',
      momo_provider: prov.id,
      momo_number: num.local,
      note: String(input.note || '').slice(0, 140),
      attempts: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_MINUTES * 60000).toISOString(),
      paid_at: null,
      granted_at: null,
      amount_paid: null,
      last_error: null
    }
  };
}

/* What a browser is allowed to learn about a reference. Deliberately narrow:
   the wallet number and email are masked, and the provider's raw transaction is
   never passed through. `checkout_url` only appears for rows still open. */
export function publicOrder(row) {
  if (!row) return null;
  const open = !isTerminal(row.status);
  return {
    ref: row.ref,
    status: row.status,
    plan: row.plan,
    billing: row.billing,
    amount: Number(row.amount || 0),
    amount_paid: row.amount_paid == null ? null : Number(row.amount_paid),
    currency: row.currency || CURRENCY,
    provider: row.momo_provider || '',
    account: maskMomo(row.momo_number),
    email: maskEmail(row.email),
    created_at: row.created_at || '',
    expires_at: row.expires_at || '',
    paid_at: row.paid_at || null,
    message: statusCopy(row),
    checkout_url: open ? (row.checkout_url || '') : '',
    grant: row.granted_at ? { plan: row.plan, billing: row.billing, paid_at: row.paid_at || '' } : null
  };
}

/* Every state has a sentence to read out loud — this is the text a support
   agent reads back from the same reference the customer is quoting. */
export function statusCopy(row) {
  const s = row && row.status;
  if (s === 'paid') return 'Paid. ' + planLabel(row) + ' is unlocked on this account.';
  if (s === 'awaiting_approval') return 'Waiting for you to approve the prompt on your phone.';
  if (s === 'pending') return 'Sending the payment request to your wallet\u2026';
  if (s === 'created') return 'Not started yet.';
  if (s === 'failed') return 'The payment did not go through' + (row.last_error ? ': ' + row.last_error : '.');
  if (s === 'expired') return 'This payment request expired. Start a new one \u2014 you were not charged.';
  return '';
}

/* The exact body sent to POST /transaction/initialize. Exported so the suite
   can pin it: mobile money only, our reference, our amount in pesewas, and a
   callback back to the upgrade page carrying the same reference. */
export function paystackInitBody(row, opts) {
  const o = opts || {};
  return {
    email: row.email,
    amount: toMinor(row.amount),
    currency: row.currency || CURRENCY,
    reference: row.provider_reference || row.ref,
    channels: ['mobile_money'],
    callback_url: o.callbackUrl || '',
    metadata: { kind: 'sherpay_upgrade', ref: row.ref, plan: row.plan, billing: row.billing }
  };
}

/* Webhook authenticity: Paystack signs the raw body with SHA-512 HMAC of the
   secret key. Compare hex digests, and never trust an unsigned body. */
export async function webhookValid(rawBody, signature, secret) {
  if (!secret || !signature || typeof rawBody !== 'string') return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const a = hex.toLowerCase(), b = String(signature).toLowerCase();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Which wallet a paid order used, in the words a receipt should use. */
export function walletLabel(id) {
  const p = providerById(id);
  return p ? p.wallet : 'Mobile Money';
}

/* The words a receipt and the account screen both use. */
export function planLabel(row) {
  const months = (row && row.months) || PLAN_PRICES.pro.months;
  return 'SherPay Pro (' + months + ' months)';
}
