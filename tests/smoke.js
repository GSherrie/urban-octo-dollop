const WEB = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'..','web'), p.join(__dirname,'web'), p.join(__dirname,'..','sherpay'), p.join(__dirname,'sherpay')].find((x) => f.existsSync(x)); })();
/* Node smoke test: shim a minimal DOM, boot SherPay, render every route */
const fs = require('fs'), vm = require('vm');

function makeEl(tag) {
  const e = {
    tag: tag || 'div', style: {}, dataset: {}, disabled: false, value: '', _html: '', _text: '',
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    appendChild() {}, remove() {}, closest() { return null; }, contains() { return true; },
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {},
  };
  Object.defineProperty(e, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; } });
  Object.defineProperty(e, 'textContent', { get() { return this._text; }, set(v) { this._text = v; } });
  return e;
}
const byId = {};
global.document = {
  addEventListener() {}, title: '',
  getElementById(id) { return byId[id] || (byId[id] = makeEl()); },
  querySelector() { return makeEl(); }, querySelectorAll() { return []; },
  createElement(t) { return makeEl(t); },
  body: makeEl('body'),
};
global.window = global;
global.addEventListener = () => {};
global.location = { hash: '#/dashboard', origin: 'http://localhost:8000', pathname: '/index.html' };
global.navigator = { onLine: true };
global.history = { back() {} };
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };

const files = ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-account.js'];
for (const f of files) vm.runInThisContext(fs.readFileSync(WEB + '/' + f, 'utf8'), { filename: f });

const S = global.Store, UI = global.UI;
S.boot();
// auth gate: create + sign in before rendering routes
const su = S.Auth.signup({ name: 'Smoke Tester', email: 'smoke@sherpay.app', password: 'password123' });
if (!su.user) { console.log('signup failed: ' + su.error); process.exit(1); }
UI.start();

const paid = S.db.invoices.find((i) => i.status === 'paid');
const routes = [
  'dashboard', 'invoices', 'invoices/new', 'clients', 'expenses', 'time', 'reports', 'settings',
  'i/' + S.db.invoices[3].id, 'i/' + paid.id, 'r/' + paid.id, 'invoices/' + S.db.invoices[6].id + '/edit'
];
let fail = 0;
for (const r of routes) {
  try {
    global.location.hash = '#/' + r;
    UI.render();
    const html = byId['view'] ? byId['view'].innerHTML : '';
    if (!html || html.length < 40) throw new Error('view rendered empty html');
    console.log('OK   #/' + r + '  (' + html.length + ' chars)');
  } catch (err) {
    fail++;
    console.log('FAIL #/' + r + '\n     ' + err.stack.split('\n').slice(0, 4).join('\n     '));
  }
}
// logic checks
const inv = S.db.invoices[3];
const t = S.computeTotals(inv);
console.log('calc check:', inv.number, JSON.stringify(t));
const res = S.recordPayment(inv.id, t.balance, 'card');
console.log('payment check:', JSON.stringify(res), '-> status', S.getInvoice(inv.id).status);
console.log('kpis:', JSON.stringify(S.kpis()));

// auth checks
const shaOk = S.Auth.__sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
console.log('sha256 check:', shaOk ? 'OK' : 'FAIL');
if (!shaOk) fail++;
const badLogin = S.Auth.login({ email: 'smoke@sherpay.app', password: 'wrong-pass' });
if (!badLogin.error) { fail++; console.log('FAIL auth: wrong password accepted'); } else console.log('OK   wrong password rejected');
S.Auth.logout();
if (S.Auth.current() !== null) { fail++; console.log('FAIL auth: session survived logout'); } else console.log('OK   logout clears session');
const reLogin = S.Auth.login({ email: 'smoke@sherpay.app', password: 'password123', remember: true });
if (!reLogin.user) { fail++; console.log('FAIL auth: re-login failed'); } else console.log('OK   re-login works');

console.log(fail ? 'SMOKE FAILURES: ' + fail : 'ALL ROUTES RENDER OK');
process.exit(fail ? 1 : 0);
