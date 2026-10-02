const WEB = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'..','web'), p.join(__dirname,'web'), p.join(__dirname,'..','sherpay'), p.join(__dirname,'sherpay')].find((x) => f.existsSync(x)); })();
/* Checkout-config suite for the public /pay.html page.
   This exists because web/js/pay.js shipped with its build-time placeholders
   still intact — __SUPABASE_URL__ was never replaced — so every live payment
   link fetched a nonsense path and died as "Unavailable". No other suite could
   see it: pay.html is not a hash route, and the app suites never load pay.js.
   Covers:
   · the committed fallback resolves when nothing was patched (the shipping default)
   · an injected .env.payments value still wins over the fallback
   · a trailing slash in the injected URL cannot produce a doubled //rest/v1
   · a genuinely unconfigured bundle fails loudly instead of firing a bad request
   · the happy path renders the invoice and arms the Pay button
   · the ?v= cache tags and the service-worker cache name cannot drift apart */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const PAY_SRC = fs.readFileSync(WEB + '/js/pay.js', 'utf8');
const SHELL = fs.readFileSync(WEB + '/pay.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const DEFAULT_URL = 'https://jmmrcrnfwyrbejhechke.supabase.co';
const DEFAULT_ANON = (/DEFAULT_SUPABASE_ANON\s*=\s*'([^']+)'/.exec(PAY_SRC) || [])[1] || '';
const TOKEN = 'tok_abcdefgh12345678';

const ROW = {
  status: 'open', currency: 'GHS', amount_paid: 0,
  payload: {
    invoice: { number: 'INV-2026-001', currency: 'GHS', dueDate: '2026-10-15', items: [{ desc: 'Design work', qty: 2, price: 150 }] },
    business: { name: 'Acme Studio' },
    client: { name: 'Jo Client', email: 'jo@acme.test' },
    totals: { balance: 300, total: 300 },
    paystackPublicKey: 'pk_test_demo'
  }
};
const PAID_ROW = Object.assign({}, ROW, { status: 'paid', amount_paid: 300 });

/* Boots the real pay.js against the real pay.html markup, with fetch stubbed so
   the resolved URL + headers are the thing under test. */
function boot(src, row) {
  const dom = new JSDOM(SHELL, {
    url: 'http://localhost:8000/pay.html?t=' + TOKEN,
    pretendToBeVisual: true, runScripts: 'outside-only', virtualConsole: new VirtualConsole()
  });
  const w = dom.window;
  const calls = [];
  w.fetch = (url, init) => {
    calls.push({ url: String(url), init: init || {} });
    return Promise.resolve({ ok: !!row, json: () => Promise.resolve(row ? [row] : []) });
  };
  w.PaystackPop = { setup(cfg) { calls.push({ paystack: cfg }); return { openIframe() { calls.push({ opened: true }); } }; } };
  w.eval(src);
  return { w, calls, el: (id) => w.document.getElementById(id) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } };

(async () => {
  console.log('-- the shipped bundle: placeholders are a hook, not a config');
  check('source tree is unpatched (patch-pay-config.js is for a copy, not here)', PAY_SRC.indexOf('__SUPABASE_URL__') > -1 && PAY_SRC.indexOf('__SUPABASE_ANON_KEY__') > -1);
  check('pay.js carries a committed publishable URL', PAY_SRC.indexOf(DEFAULT_URL) > -1);
  check('pay.js carries a committed publishable anon key', DEFAULT_ANON !== '' && DEFAULT_ANON.indexOf('__') === -1);

  const shipped = boot(PAY_SRC, ROW);
  await sleep(40);
  const req = shipped.calls[0] || {};
  const url = req.url || '';
  const h = (req.init && req.init.headers) || {};
  check('an unpatched bundle asks the real Supabase host', url.indexOf(DEFAULT_URL + '/rest/v1/payment_requests') === 0);
  check('it never fetches the literal placeholder path', url.indexOf('__SUPABASE_URL__') === -1);
  check('it looks the token up by exact match', url.indexOf('token=eq.' + TOKEN) > -1);
  check('it sends the publishable apikey', h.apikey === DEFAULT_ANON && String(h.apikey).indexOf('__') === -1);
  check('and the matching bearer', h.Authorization === 'Bearer ' + DEFAULT_ANON);
  check('the invoice summary renders', shipped.el('rows').hidden === false && shipped.el('biz').textContent === 'Acme Studio');
  check('line items are priced', shipped.el('items').innerHTML.indexOf('Design work × 2') > -1);
  check('the Pay button arms with the balance',
    shipped.el('paybtn').disabled === false && shipped.el('paybtn').textContent.indexOf('Pay') === 0);

  console.log('-- a paid link stays paid');
  const paid = boot(PAY_SRC, PAID_ROW);
  await sleep(40);
  check('a paid link cannot be charged twice',
    paid.el('paybtn').disabled === true && /Already paid/.test(paid.el('paybtn').textContent));

  console.log('-- an injected .env.payments still wins');
  const injected = PAY_SRC
    .replace(/__SUPABASE_URL__/g, 'https://other.supabase.co/')
    .replace(/__SUPABASE_ANON_KEY__/g, 'sb_publishable_INJECTED');
  const inj = boot(injected, ROW);
  await sleep(40);
  const iurl = (inj.calls[0] || {}).url || '';
  check('the injected host is used', iurl.indexOf('https://other.supabase.co/rest/v1/payment_requests') === 0);
  check('a trailing slash cannot double up the path', iurl.indexOf('//rest') === -1);
  check('the injected key is used', ((inj.calls[0] || {}).init || {}).headers.apikey === 'sb_publishable_INJECTED');

  console.log('-- a genuinely unconfigured bundle fails loudly');
  const bare = PAY_SRC
    .replace(/DEFAULT_SUPABASE_URL\s*=\s*'[^']*'/, "DEFAULT_SUPABASE_URL = ''")
    .replace(/DEFAULT_SUPABASE_ANON\s*=\s*'[^']*'/, "DEFAULT_SUPABASE_ANON = ''");
  const unconf = boot(bare, ROW);
  await sleep(40);
  check('no request is fired at a blank host', unconf.calls.length === 0);
  check('the page says payments are unavailable',
    /not configured/.test(unconf.el('err').textContent) && unconf.el('err').style.display === 'block');
  check('and the button stays off',
    unconf.el('paybtn').disabled === true && unconf.el('paybtn').textContent === 'Unavailable');

  console.log('-- cache tags cannot drift from the service worker');
  const htmlTags = [];
  for (const f of ['index.html', 'pay.html']) {
    (fs.readFileSync(WEB + '/' + f, 'utf8').match(/\?v=(\d+)/g) || []).forEach((t) => htmlTags.push(t.slice(3)));
  }
  const sw = fs.readFileSync(WEB + '/sw.js', 'utf8');
  const cache = /const CACHE = 'sherpay-v(\d+)'/.exec(sw);
  const swTags = (sw.match(/\?v=(\d+)/g) || []).map((t) => t.slice(3));
  const all = htmlTags.concat(swTags);
  check('every ?v= cache tag agrees (v' + all[0] + ')', all.length > 0 && all.every((t) => t === all[0]));
  check('the sw cache name matches the tag', !!cache && cache[1] === all[0]);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();

