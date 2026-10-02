const WEB = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'..','web'), p.join(__dirname,'web')].find((x) => f.existsSync(x)); })();
const FN_DIR = require('path').join(__dirname, '..', 'supabase', 'functions', 'momo-upgrade');
/* Mobile Money upgrade suite — the payment-reference system.
   An upgrade payment is the highest-stakes flow in this app: it takes money and
   it hands out a paid feature. So this suite is mostly about the two ways that
   goes wrong.
     (1) The reference: issued by us, unique, quotable over the phone, and the
         thing every later step is matched against. A reference another customer
         quotes must never open this customer's order.
     (2) The money rules: amount, currency and the provider's own reference are
         checked before Pro exists, and no number typed by a browser is charged.
   Also covered: Ghana wallet numbers (the shape, plus the soft wrong-wallet
   hint), the awaiting-approval state machine a wallet payment needs and a card
   payment never does, what a page is allowed to learn about a reference, the
   webhook signature, the checkout page end to end, and the drift guards that
   keep browser, store and core.mjs telling one price and one version story. */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { JSDOM, VirtualConsole } = require('jsdom');

const PAGE_SRC = fs.readFileSync(WEB + '/js/upgrade.js', 'utf8');
const SHELL = fs.readFileSync(WEB + '/upgrade.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const STORE_SRC = fs.readFileSync(WEB + '/js/store.js', 'utf8');
const NOW = new Date('2026-10-06T10:00:00Z');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } };

const GOOD = { plan: 'pro', email: 'ama@studio.gh', provider: 'mtn', number: '0245550110' };

/* Boots the real checkout page against the real markup, with fetch stubbed so
   the resolved URL, the headers and the request body are the things under test. */
function boot(src, replies, search) {
  const dom = new JSDOM(SHELL, {
    url: 'http://localhost:8000/upgrade.html' + (search || ''),
    pretendToBeVisual: true, runScripts: 'outside-only', virtualConsole: new VirtualConsole()
  });
  const w = dom.window;
  const calls = [];
  w.fetch = (url, init) => {
    const body = init && init.body ? JSON.parse(init.body) : {};
    calls.push({ url: String(url), init: init || {}, body });
    const reply = (replies || {})[body.action] || {};
    return Promise.resolve({ ok: reply.ok !== false, status: reply.status || 200, json: () => Promise.resolve(reply.body || {}) });
  };
  w.eval(src);
  const el = (id) => w.document.getElementById(id);
  return {
    w, el, calls,
    pick(provider, number, email) {
      const tile = Array.from(w.document.querySelectorAll('input[name=provider]')).find((i) => i.value === provider) || {};
      tile.checked = true;
      if (number != null) el('number').value = number;
      if (email != null) el('email').value = email;
    },
    submit() { el('momoform').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); }
  };
}

(async () => {
  const core = await import(pathToFileURL(path.join(FN_DIR, 'core.mjs')).href);
  const issue = (over, opts) => core.issueOrder(Object.assign({}, GOOD, over || {}),
    Object.assign({ now: NOW, rand: () => 9 }, opts || {}));

  console.log('-- the reference: ours, unique, quotable');
  const ref = core.newReference(NOW, () => 9);
  check('a reference carries our prefix and the day it was issued', /^SHP-UP-261006-([A-HJ-NP-Z2-9])\1{7}$/.test(ref));
  check('it matches the published format', core.REF_RE.test(ref) && core.isReference(ref));
  check('it survives being read over the phone (no I, O, 0 or 1)',
    !core.isReference('SHP-UP-261006-IOIOIOIO') && !core.isReference('SHP-UP-261006-0O0O0O0O'));
  check('anything else is not a reference',
    !core.isReference('') && !core.isReference('SHP-UP-261006-AAAABBBB ') &&
    !core.isReference('SHERPAY-PRO-0123456789ABCDEF01234567'));
  const seen = new Set();
  for (let i = 0; i < 4000; i++) seen.add(core.newReference());
  check('4000 references in a row are unique', seen.size === 4000);
  check('and every one of them is well-formed', Array.from(seen).every((r) => core.REF_RE.test(r)));

  console.log('-- a Ghana wallet number, in the shapes people actually type');
  const forms = ['024 555 0110', '024-555-0110', '0245550110', '+233 24 555 0110', '233245550110', '00233245550110'];
  check('all six forms normalise to the same local number',
    forms.every((f) => { const n = core.normalizeMomoNumber(f, 'mtn'); return n.ok && n.local === '0245550110'; }));
  check('and the international form a provider wants is produced',
    core.normalizeMomoNumber('0245550110', 'mtn').intl === '+233245550110');
  check('short, long, lettered, foreign and blank are all refused',
    ['024555', '02455501101', '024abc0110', '+1 234 555 0100', ''].every((f) => !core.normalizeMomoNumber(f, 'mtn').ok));
  check('a number from another wallet warns without blocking (numbers get ported)',
    (() => { const n = core.normalizeMomoNumber('0201112222', 'mtn'); return n.ok && !n.match && /Telecel/.test(n.hint); })());
  check('an unknown wallet is not a wallet', core.providerById('mpesa') === null && core.providerById('MTN').id === 'mtn');

  console.log('-- the price is ours, not the browser\'s');
  const order = issue({ amount: 1, currency: 'USD', status: 'paid' }).row;
  check('a one-time Pro order is priced by the server', order.amount === core.PLAN_PRICES.pro.yearly && order.currency === 'GHS');
  check('an amount sent by a client cannot become the charge', order.amount !== 1 && order.currency !== 'USD');
  check('a client cannot pre-pay its own order', order.status === 'created' && order.paid_at === null && order.granted_at === null);
  check('an unknown plan is refused', core.planPrice('enterprise') === null && core.issueOrder(Object.assign({}, GOOD, { plan: 'free' })).ok === false);
  check('bad email, wallet or number is refused, naming the field that failed',
    core.issueOrder({ plan: 'pro', email: 'ama', provider: 'mtn', number: '0245550110' }).field === 'email' &&
    core.issueOrder({ plan: 'pro', email: 'ama@b.co', provider: 'vodafree', number: '0245550110' }).field === 'provider' &&
    core.issueOrder({ plan: 'pro', email: 'ama@b.co', provider: 'mtn', number: '12' }).field === 'number');
  check('the provider carries the same reference, so a webhook can find the order',
    order.ref === order.provider_reference && order.provider === 'paystack' && order.channel === 'mobile_money');
  check('a request expires rather than hanging open forever',
    new Date(order.expires_at) - new Date(order.created_at) === core.TTL_MINUTES * 60000);

  console.log('-- what we ask Paystack to charge');
  const body = core.paystackInitBody(order, { callbackUrl: 'https://x/upgrade.html?ref=' + order.ref });
  check('mobile money only — never a card page for a wallet purchase',
    Array.isArray(body.channels) && body.channels.length === 1 && body.channels[0] === 'mobile_money');
  check('the amount goes out in pesewas', body.amount === core.PLAN_PRICES.pro.yearly * 100);
  check('our reference is the transaction reference', body.reference === order.ref);
  check('the callback comes back to this same reference', body.callback_url.indexOf(order.ref) > -1);
  check('the metadata names the order for a human in the Paystack dashboard',
    body.metadata.kind === 'sherpay_upgrade' && body.metadata.ref === order.ref);

  console.log('-- when money counts as paid');
  const want = { reference: order.ref, amount_minor: core.toMinor(order.amount), currency: 'GHS' };
  const tx = (over) => Object.assign({ status: 'success', reference: order.ref, amount: want.amount_minor, currency: 'GHS' }, over || {});
  check('a matching transaction is a payment', core.paymentMatches(tx(), want) === true);
  check('a different reference is somebody else\'s money', core.paymentMatches(tx({ reference: 'SHP-UP-261006-ZZZZZZZZ' }), want) === false);
  check('a transaction without its exact reference is never a payment',
    core.paymentMatches(tx({ reference: '' }), want) === false);
  check('underpayment is not a payment', core.paymentMatches(tx({ amount: want.amount_minor - 1 }), want) === false);
  check('a malformed amount is not a payment', core.paymentMatches(tx({ amount: 'not-money' }), want) === false);
  check('overpayment still buys the plan (wallets add their own fees)', core.paymentMatches(tx({ amount: want.amount_minor + 500 }), want) === true);
  check('the wrong currency is not a payment', core.paymentMatches(tx({ currency: 'USD' }), want) === false);
  check('a transaction without a currency is not a payment', core.paymentMatches(tx({ currency: '' }), want) === false);
  check('an unfinished transaction is not a payment', core.paymentMatches(tx({ status: 'pending' }), want) === false);
  check('nothing is not a payment', core.paymentMatches(null, want) === false);

  console.log('-- the state a wallet payment walks through');
  const soon = new Date('2026-10-06T10:05:00Z'), late = new Date('2026-10-06T11:00:00Z');
  check('a pushed charge waits for the handset instead of claiming success',
    core.nextStatus('pending', 'pending', soon, order.expires_at) === 'awaiting_approval');
  check('approving it pays the order', core.nextStatus('awaiting_approval', 'success', soon, order.expires_at) === 'paid');
  check('declining it fails the order', core.nextStatus('awaiting_approval', 'failed', soon, order.expires_at) === 'failed');
  check('half an hour of silence expires the order', core.nextStatus('awaiting_approval', 'pending', late, order.expires_at) === 'expired');
  check('a dead connection changes nothing — that is not a failed payment',
    core.nextStatus('awaiting_approval', '', soon, order.expires_at) === 'awaiting_approval');
  check('an expired reference is not revived by a late webhook',
    core.nextStatus('expired', 'success', late, order.expires_at) === 'expired');
  check('a paid order stays paid', core.nextStatus('paid', 'failed', late, order.expires_at) === 'paid');

  console.log('-- what a page may learn about a reference');
  const paidRow = Object.assign({}, order, {
    status: 'paid', paid_at: '2026-10-06T10:02:00Z', granted_at: '2026-10-06T10:02:00Z',
    amount_paid: order.amount, checkout_url: 'https://paystack.example/session-secret-token'
  });
  const pub = core.publicOrder(paidRow);
  const wire = JSON.stringify(pub);
  check('the paid view confirms the plan and the reference', pub.status === 'paid' && pub.ref === order.ref && !!pub.grant);
  check('the wallet number is masked', wire.indexOf('0245550110') === -1 && pub.account.indexOf('\u2022') > -1);
  check('the email is masked', wire.indexOf('ama@studio.gh') === -1 && /@studio\.gh$/.test(pub.email));
  check('a finished order never exposes the hosted checkout URL', pub.checkout_url === '' && wire.indexOf('session-secret-token') === -1);
  check('a still-open order keeps the checkout link — that is the fallback path',
    core.publicOrder(Object.assign({}, order, { status: 'pending', checkout_url: 'https://paystack.example/x' })).checkout_url.indexOf('paystack.example') > -1);
  check('every state has a sentence a support agent can read out',
    ['created', 'pending', 'awaiting_approval', 'paid', 'failed', 'expired'].every((s) => core.statusCopy({ status: s }).length > 8));

  console.log('-- a webhook has to prove who sent it');
  const secret = 'sk_test_abc123';
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: order.ref } });
  const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(payload)))).map((b) => b.toString(16).padStart(2, '0')).join('');
  check('a correctly signed body is accepted', await core.webhookValid(payload, sig, secret) === true);
  check('the same body with one extra space is not', await core.webhookValid(payload + ' ', sig, secret) === false);
  check('a forged signature is not', await core.webhookValid(payload, sig.replace(/.$/, '0'), secret) === false);
  check('nor is a real signature when no secret is configured', await core.webhookValid(payload, sig, '') === false);

  console.log('-- the checkout page: what it shows and what it refuses to send');
  const DEFAULT_URL = (/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/.exec(PAGE_SRC) || [])[1] || '';
  const DEFAULT_ANON = (/DEFAULT_SUPABASE_ANON\s*=\s*'([^']+)'/.exec(PAGE_SRC) || [])[1] || '';
  const REF2 = core.newReference();
  const OPEN = {
    ref: REF2, status: 'awaiting_approval', plan: 'pro', billing: 'annual', amount: 49, currency: 'GHS',
    provider: 'mtn', account: '024 555 \u2022\u2022\u2022 10', email: 'a\u2022\u2022\u2022@studio.gh',
    message: 'Waiting for you to approve the prompt on your phone.', checkout_url: 'https://paystack.example/hosted'
  };
  const PAID = Object.assign({}, OPEN, { status: 'paid', amount_paid: 49, checkout_url: '' });
  check('the shipping bundle is unpatched (the tokens are a hook, not a config)',
    PAGE_SRC.indexOf('__SUPABASE_URL__') > -1 && DEFAULT_URL.indexOf('supabase.co') > -1 && DEFAULT_ANON.indexOf('__') === -1);

  const live = boot(PAGE_SRC, { init: { body: { ok: true, order: OPEN } } });
  check('it names the plan, the price and the length', /49/.test(live.el('amt').textContent) && /12 months/.test(live.el('amt').textContent));
  check('all three Ghana wallets are offered', live.el('wallets').querySelectorAll('input[name=provider]').length === 3);
  check('it says the thing a card page never has to say',
    /approve the payment on your phone/i.test(live.el('sub').textContent));
  check('the pay button arms with the price', live.el('paybtn').disabled === false && /Mobile Money/.test(live.el('paybtn').textContent));

  live.pick('mtn', '02455', 'ama@studio.gh'); live.submit(); await sleep(30);
  check('a malformed number never reaches the network',
    live.calls.length === 0 && /valid Ghana number/i.test(live.el('err').textContent));
  live.pick('mtn', '0245550110', 'not-an-email'); live.submit(); await sleep(30);
  check('an email that is not an email never reaches the network',
    live.calls.length === 0 && /email/i.test(live.el('err').textContent));

  live.pick('mtn', '+233 24 555 0110', 'Ama@Studio.GH'); live.submit(); await sleep(60);
  const init = live.calls[0] || {};
  check('a real attempt calls our function, not Paystack',
    init.url === DEFAULT_URL + '/functions/v1/momo-upgrade' && init.body.action === 'init');
  check('with the publishable key and its bearer',
    (init.init.headers || {}).apikey === DEFAULT_ANON && (init.init.headers || {}).Authorization === 'Bearer ' + DEFAULT_ANON);
  check('the number is normalised and the email lower-cased before it leaves',
    init.body.number === '0245550110' && init.body.email === 'ama@studio.gh' && init.body.provider === 'mtn');
  check('no price, no plan price and no secret ever leave the page',
    init.body.amount === undefined && !/sk_(live|test)/.test(JSON.stringify(init)));

  console.log('-- waiting for the handset, then getting the answer');
  check('the reference is the loudest thing on the waiting screen',
    live.el('await').hidden === false && live.el('refval').textContent === REF2 && live.el('momoform').hidden === true);
  check('the masked wallet is shown back, not the number you typed',
    live.el('acct').textContent === OPEN.account && live.el('acct').textContent.indexOf('0245550110') === -1);
  check('a hosted fallback is offered for the phone that never buzzed',
    live.el('fallbackwrap').hidden === false && /paystack\.example/.test(live.el('fallback').href));
  check('the reference is written into the URL, so a closed tab can be reopened',
    live.w.location.search.indexOf('ref=' + encodeURIComponent(REF2)) > -1);
  check('and left in the shared key, so the app shell can finish the job',
    (live.w.localStorage.getItem('sherpay_upgrades_v1') || '').indexOf(REF2) > -1);

  const after = boot(PAGE_SRC, { status: { body: { ok: true, order: PAID } } }, '?ref=' + encodeURIComponent(REF2));
  await sleep(60);
  check('a reopened link asks the provider the truth instead of trusting the URL',
    after.calls.length === 1 && after.calls[0].body.action === 'status' && after.calls[0].body.ref === REF2);
  check('and a paid answer becomes a receipt, not another form',
    after.el('done').hidden === false && after.el('momoform').hidden === true && /Paid/.test(after.el('donemsg').textContent));
  check('the Pro badge appears only once the money is confirmed', after.el('badge').hidden === false);
  after.w.close(); live.w.close();

  const refused = boot(PAGE_SRC, { init: { ok: false, body: { ok: false, error: 'That number could not be matched to a wallet' } } });
  refused.pick('at', '0971234567', 'ama@studio.gh'); refused.submit(); await sleep(60);
  check('a refusal is shown in words, and the form stays usable',
    /matched to a wallet/.test(refused.el('err').textContent) && refused.el('momoform').hidden === false && refused.el('paybtn').disabled === false);
  refused.w.close();

  const flaky = boot(PAGE_SRC, { status: { ok: false, body: { ok: false } } }, '?ref=' + encodeURIComponent(REF2));
  await sleep(60);
  check('a failed status read is still "waiting", never "failed"',
    flaky.el('await').hidden === false && /waiting/i.test(flaky.el('awaitmsg').textContent) && flaky.el('err').style.display !== 'block');
  flaky.w.close();

  const bare = boot(PAGE_SRC.replace(/DEFAULT_SUPABASE_URL\s*=\s*'[^']*'/, "DEFAULT_SUPABASE_URL = ''")
    .replace(/DEFAULT_SUPABASE_ANON\s*=\s*'[^']*'/, "DEFAULT_SUPABASE_ANON = ''"), {}, '');
  await sleep(30);
  check('a genuinely unconfigured page fails loudly and asks for nothing',
    bare.calls.length === 0 && bare.el('paybtn').disabled === true && /not available/i.test(bare.el('err').textContent));
  bare.w.close();

  console.log('-- nobody gets to disagree about price, format, rules or version');
  const priceFromCore = core.PLAN_PRICES.pro.yearly;
  const priceFromStore = (/pro:\s*\{[\s\S]{0,90}?price:\s*(\d+)/.exec(STORE_SRC) || [])[1];
  const priceFromPage = (/pro:\s*\{\s*price:\s*(\d+)/.exec(PAGE_SRC) || [])[1];
  check('server, store and page all quote GHS ' + priceFromCore,
    +priceFromStore === priceFromCore && +priceFromPage === priceFromCore);
  check('the checkout page and the app shell share one resume key',
    STORE_SRC.indexOf("'sherpay_upgrades_v1'") > -1 && PAGE_SRC.indexOf("'sherpay_upgrades_v1'") > -1);
  check('the store recognises exactly the references we issue', STORE_SRC.indexOf(core.REF_RE.source) > -1);
  const FN_SRC = fs.readFileSync(path.join(FN_DIR, 'index.ts'), 'utf8');
  check('the edge function reads the rules from core.mjs instead of re-deciding them',
    /from '\.\/core\.mjs'/.test(FN_SRC) && /paymentMatches\(tx, expected\)/.test(FN_SRC));
  check('the plan is granted by a guarded row flip, so a webhook and a poll cannot both pay out',
    FN_SRC.indexOf(".eq('reference', ref).neq('status', 'paid')") > -1);
  check('the webhook re-verifies with Paystack rather than trusting its signed event payload',
    /handleWebhook[\s\S]*?reverify\(admin, row\)/.test(FN_SRC) && /out\.unreachable[\s\S]*?502/.test(FN_SRC));
  check('a successful but mismatched Paystack transaction is failed, never interpreted as a grant',
    /successWithMismatch[\s\S]*?nextStatus\(row\.status, successWithMismatch \? 'failed'/.test(FN_SRC));
  check('and it is granted to the account as well as the workspace document',
    /app_metadata/.test(FN_SRC) && /cloud_state/.test(FN_SRC) && /user_id: account\?\.id/.test(FN_SRC));
  const SQL = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261006_payments.sql'), 'utf8');
  check('the payments ledger includes the requested account, reference and gateway fields',
    /create table if not exists public\.payments/.test(SQL) && /user_id uuid/.test(SQL) &&
    /reference text not null unique/.test(SQL) && /payment_method text/.test(SQL) &&
    /paystack_reference text not null unique/.test(SQL) && /amount numeric/.test(SQL) && /currency text/.test(SQL));
  check('one row per reference keeps the wallet states the machine needs',
    /awaiting_approval/.test(SQL) && /expires_at/.test(SQL));
  check('no browser role can read or write that ledger',
    /revoke all on public\.payments from public, anon, authenticated/.test(SQL) && !/create policy/.test(SQL));
  ['js/upgrade.js', 'js/store.js', 'js/pay.js', 'upgrade.html', 'index.html'].forEach((f) => {
    const src = fs.readFileSync(WEB + '/' + f, 'utf8');
    if (/sk_(live|test)_/.test(src) || src.indexOf('api.paystack.co') > -1) fail('a browser file talks to Paystack directly: ' + f);
  });
  check('nothing a browser loads can call Paystack or hold a secret key', true);

  const tags = [];
  for (const f of ['index.html', 'pay.html', 'upgrade.html']) {
    (fs.readFileSync(WEB + '/' + f, 'utf8').match(/\?v=(\d+)/g) || []).forEach((t) => tags.push(t.slice(3)));
  }
  const sw = fs.readFileSync(WEB + '/sw.js', 'utf8');
  const cache = /const CACHE = 'sherpay-v(\d+)'/.exec(sw);
  (sw.match(/\?v=(\d+)/g) || []).forEach((t) => tags.push(t.slice(3)));
  check('every ?v= cache tag agrees (v' + tags[0] + ')', tags.length > 0 && tags.every((t) => t === tags[0]));
  check('the service worker cache name matches the tag', !!cache && cache[1] === tags[0]);
  check('the new checkout ships in the offline shell', /'upgrade\.html'/.test(sw) && /js\/upgrade\.js\?v=/.test(sw));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();