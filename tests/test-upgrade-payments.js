const WEB = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'..','web'), p.join(__dirname,'web')].find((x) => f.existsSync(x)); })();
/* The app-shell half of a Pro upgrade: what happens to a mobile money payment
   reference AFTER the checkout page closes.
   An upgrade payment has two lives. On upgrade.html it is a reference being
   polled. In the app it is a memory: something this device started that may have
   completed while the app was shut — and which must eventually become "Pro is
   on" without the app ever being able to declare itself paid. Most of this file
   is about that last clause: a status saved in localStorage is a hint, not
   proof, and only the server's answer unlocks anything.
   Also covered: the Pro sheet the customer actually sees, and the promise that
   a customer who paid through the earlier hosted checkout keeps Pro. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const KEY = 'sherpay_upgrades_v1';
const REF = 'SHP-UP-261006-JJJJJJJJ';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } };

/* store.js hangs window.Store off a window object, so each scenario gets its own
   window and its own localStorage — a test that passes because another test
   left Pro switched on is worse than no test. */
function freshStore() {
  const memory = {
    _data: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };
  const sandbox = {
    console, Date, Math, JSON, Intl, parseInt, parseFloat, isFinite, isNaN, Number, String, Object, Array, RegExp, Error,
    Promise, encodeURIComponent, decodeURIComponent, setTimeout, clearTimeout,
    localStorage: memory, navigator: { onLine: true }, fetch: null
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.location = { origin: 'https://sherpay.test', pathname: '/index.html', hash: '#/dashboard', href: 'https://sherpay.test/index.html' };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(WEB + '/js/store.js', 'utf8'), sandbox, { filename: 'web/js/store.js' });
  sandbox.Store.boot();
  return { Store: sandbox.Store, store: memory, sandbox };
}

let calls = [];
let nextBody = {};
function stubFetch(sandbox) {
  sandbox.fetch = async (url, init) => {
    calls.push({ url: String(url), init: init || {}, body: init && init.body ? JSON.parse(init.body) : {} });
    return { ok: true, status: 200, json: async () => nextBody };
  };
}

(async () => {
  const { Store, store, sandbox } = freshStore();
  stubFetch(sandbox);
  Store.Auth.signup({ name: 'Ama Owusu', email: 'ama@studio.gh', password: 'password123' });

  console.log('-- before a payment exists, the shell says Free');
  check('a fresh account is not on Pro', Store.upgrades.isPro() === false && Store.upgrades.title() === 'SherPay Free');
  check('and has nothing waiting to be checked', Store.upgrades.resumeRefs().length === 0);
  check('the price the shell quotes is the price the server charges',
    Store.upgrades.price('pro').amount === 1 && Store.upgrades.price('pro').months === 12 && Store.upgrades.price('pro').currency === 'GHS');
  check('the checkout link hands over the account email so nobody retypes it',
    Store.upgrades.link().indexOf('upgrade.html?plan=pro&email=ama%40studio.gh') > -1);

  console.log('-- remembering what this device started');
  Store.upgrades.rememberRef({ ref: REF, status: 'pending', amount: 1, currency: 'GHS', provider: 'mtn', checkout_url: 'https://paystack.example/x' });
  check('a reference is kept where the next launch can find it', JSON.parse(store.getItem(KEY))[0].ref === REF);
  Store.upgrades.rememberRef({ ref: REF, status: 'pending', amount: 1 });
  check('the same reference is never kept twice', JSON.parse(store.getItem(KEY)).filter((r) => r.ref === REF).length === 1);

  console.log('-- asking the server, on open, about an unfinished payment');
  nextBody = { ok: true, order: { ref: REF, status: 'pending', amount: 1, provider: 'mtn' } };
  calls = [];
  let changed = await Store.upgrades.sync();
  check('the checkout function is asked, by reference', calls.length === 1 &&
    calls[0].url === 'https://jmmrcrnfwyrbejhechke.supabase.co/functions/v1/momo-upgrade' &&
    calls[0].body.action === 'status' && calls[0].body.ref === REF);
  check('with the publishable key only', calls[0].init.headers.apikey === Store.CLOUD_ANON);
  check('a still-waiting payment grants nothing', changed === false && Store.upgrades.isPro() === false);
  check('and stays remembered for the next open', JSON.parse(store.getItem(KEY))[0].ref === REF);

  nextBody = { ok: true, order: { ref: REF, status: 'paid', amount: 1, amount_paid: 1, provider: 'mtn', paid_at: '2026-10-06T10:02:00Z' } };
  changed = await Store.upgrades.sync();
  check('a confirmed payment unlocks Pro on the next open', changed === true && Store.upgrades.isPro() === true);
  check('the plan remembers which reference paid for it', Store.db.settings.plan.ref === REF);
  check('a finished reference stops being polled', JSON.parse(store.getItem(KEY) || '[]').length === 0);
  check('and the unlock lands in the activity feed',
    Store.db.activity.some((a) => a.type === 'plan' && a.message.indexOf('SherPay Pro unlocked') === 0));
  calls = [];
  await Store.upgrades.sync();
  check('nothing is asked once the plan is on', calls.length === 0);

  console.log('-- the shell cannot pay for itself');
  const t = freshStore(); stubFetch(t.sandbox);
  t.Store.Auth.signup({ name: 'Tried', email: 't@r.gh', password: 'password123' });
  t.store.setItem(KEY, JSON.stringify([{ ref: REF, status: 'paid', amount: 1 }]));
  nextBody = { ok: true, order: { ref: REF, status: 'pending' } };
  calls = [];
  const tampered = await t.Store.upgrades.sync();
  check('a "paid" flag typed into local storage grants nothing', tampered === false && t.Store.upgrades.isPro() === false);
  check('and it is not even treated as a live payment to ask about', calls.length === 0);

  const g = freshStore(); stubFetch(g.sandbox);
  g.Store.Auth.signup({ name: 'Garbage', email: 'g@r.gh', password: 'password123' });
  g.Store.upgrades.rememberRef({ ref: 'SHERPAY-PRO-0123456789ABCDEF01234567', status: 'pending' });
  g.Store.upgrades.rememberRef({ ref: 'ref-from-a-different-app', status: 'pending' });
  calls = [];
  await g.Store.upgrades.sync();
  check('a reference we never issued is never sent anywhere', calls.length === 0);
  g.store.setItem(KEY, '{ this is not json');
  await g.Store.upgrades.sync();
  check('a corrupt resume list is survivable', true);
  g.sandbox.fetch = async () => { throw new Error('offline'); };
  g.store.setItem(KEY, JSON.stringify([{ ref: REF, status: 'pending', amount: 1 }]));
  let threw = false;
  try { await g.Store.upgrades.sync(); } catch (e) { threw = true; }
  check('a server that does not answer is not an error the customer sees', threw === false);
  check('and the reference survives for the next open', JSON.parse(g.store.getItem(KEY))[0].ref === REF);

  console.log('-- a customer who paid earlier keeps Pro');
  const l = freshStore(); stubFetch(l.sandbox);
  l.Store.Auth.signup({ name: 'Legacy', email: 'l@r.gh', password: 'password123' });
  l.Store.db.settings.subscription = { plan: 'pro', status: 'active', reference: 'SHERPAY-PRO-OLD123', activatedAt: '2026-10-01T09:00:00Z' };
  check('Pro bought through the retired hosted checkout still reads as Pro',
    l.Store.upgrades.isPro() === true && l.Store.upgrades.state().ref === 'SHERPAY-PRO-OLD123');
  l.Store.db.settings.subscription = undefined;
  l.Store.upgrades.rememberRef({ ref: REF, status: 'pending', amount: 1 });
  check('and an unfinished payment on that device is still offered back', l.Store.upgrades.resumeRefs().length === 1);

  console.log('-- the Pro sheet the customer actually sees');
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div><div id="modal-root"></div><div id="toast-root"></div></body></html>', {
    url: 'https://sherpay.test/index.html#/dashboard', pretendToBeVisual: true, runScripts: 'outside-only',
    virtualConsole: new VirtualConsole()
  });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:stub';
  w.URL.revokeObjectURL = () => {};
  for (const f of ['store.js', 'ui.js', 'views-auth.js', 'views-main.js', 'views-editor.js', 'views-ops.js', 'views-biz.js', 'views-account.js']) {
    w.eval(fs.readFileSync(WEB + '/js/' + f, 'utf8'));
  }
  w.Store.boot();
  w.Store.Auth.signup({ name: 'Ama Owusu', email: 'ama@studio.gh', password: 'password123' });
  w.localStorage.setItem(KEY, JSON.stringify([{ ref: REF, status: 'pending', amount: 1, currency: 'GHS', provider: 'mtn', account: '024 555 \u2026' }]));
  w.fetch = async (_url, init) => {
    const body = JSON.parse((init && init.body) || '{}');
    return { ok: true, status: 200, json: async () => (body.action === 'status'
      ? { ok: true, order: { ref: REF, status: 'paid', amount: 1, amount_paid: 1, provider: 'mtn', paid_at: '2026-10-06T10:02:00Z' } }
      : { ok: true, order: {} }) };
  };
  w.UI.start();
  const click = (el) => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const sheet = () => w.document.getElementById('modal-root');
  click(w.document.querySelector('[data-action="pro"]'));
  check('the sheet quotes the price, the length and the method',
    new RegExp(Store.upgrades.price('pro').amount + '(\\.00)?\\b').test(sheet().textContent) && /12 months/.test(sheet().textContent) && /Mobile Money/.test(sheet().textContent));
  check('the offer names the wallets a Ghanaian business actually uses',
    /MTN MoMo/.test(sheet().textContent) && /Telecel Cash/.test(sheet().textContent) && /AT Money/.test(sheet().textContent));
  check('and says outright that the wallet PIN is never asked for',
    /never asks for your wallet PIN/i.test(sheet().textContent));
  check('the call to action goes to the mobile money checkout with a price on it',
    !!w.document.getElementById('pro-pay-momo') && /Pay .* with Mobile Money/.test(w.document.getElementById('pro-pay-momo').textContent));
  check('an unfinished payment is offered back rather than quietly dropped',
    !!sheet().querySelector('[data-ref]') && sheet().querySelector('[data-ref]').textContent.indexOf(REF) > -1);
  check('with the reference copyable and a way back into the payment',
    !!sheet().querySelector('[data-copy-ref]') && /upgrade\.html/.test(sheet().querySelector('a[href*="upgrade.html"]').getAttribute('href')));
  check('the reference is on screen; the wallet number is not', sheet().textContent.indexOf('0245550110') === -1);
  click(sheet().querySelector('[data-check-ref]'));
  await sleep(80);
  check('"I\u2019ve paid \u2014 check" asks the server, and only then grants Pro', w.Store.upgrades.isPro() === true);
  check('the sheet closes and the app says Pro is active',
    sheet().textContent.indexOf('Payment started on this device') === -1 &&
    w.document.querySelector('.pro-card').textContent.indexOf('Active') > -1);
  w.location.hash = '#/account';
  w.UI.render(true);
  check('the account profile badge reflects the paid Pro plan',
    w.document.querySelector('.badge.plan') && w.document.querySelector('.badge.plan').textContent === 'SherPay Pro');
  w.location.hash = '#/dashboard';
  w.UI.render(true);
  click(w.document.querySelector('[data-action="pro"]'));
  await sleep(40);
  check('a Pro account is not sold Pro again',
    /Pro is unlocked on this account/.test(sheet().textContent) && !w.document.getElementById('pro-pay-momo'));
  check('and is shown the reference that paid for it', sheet().textContent.indexOf(REF) > -1);
  w.localStorage.setItem(KEY, '[]');
  dom.window.close();

  console.log('-- the retired checkout is really gone');
  const STORE_SRC = fs.readFileSync(WEB + '/js/store.js', 'utf8');
  check('no browser code calls the superseded endpoint', STORE_SRC.indexOf('upgrade-payment') === -1);
  check('its function and table are gone from the repo',
    !fs.existsSync(path.join(__dirname, '..', 'supabase', 'functions', 'upgrade-payment')) &&
    !fs.existsSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261001000000_upgrade_payments.sql')));
  check('there is exactly one upgrade checkout to pay at', fs.existsSync(WEB + '/upgrade.html'));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();