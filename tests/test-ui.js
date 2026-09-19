const WEB = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'..','web'), p.join(__dirname,'web'), p.join(__dirname,'..','sherpay'), p.join(__dirname,'sherpay')].find((x) => f.existsSync(x)); })();
/* jsdom interaction test: renders routes, clicks real buttons, catches selector/runtime bugs */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(WEB + '/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { url: 'http://localhost:8000/', pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
const errors = [];
w.addEventListener('error', (e) => errors.push('window.onerror: ' + (e.error ? e.error.stack : e.message)));

for (const f of ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-account.js']) {
  try { w.eval(fs.readFileSync(WEB + '/' + f, 'utf8')); } catch (e) { errors.push(f + ' load: ' + e.stack); }
}
const S = w.Store, UI = w.UI;
S.boot();
// auth gate: create + sign in before rendering routes
const su = S.Auth.signup({ name: 'QA User', email: 'qa@sherpay.app', password: 'password123' });
if (!su.user) { console.log('FATAL signup for tests: ' + su.error); process.exit(1); }
UI.start();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => Array.from(w.document.querySelectorAll(s));
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const setInput = (el, v, ev) => { el.value = v; el.dispatchEvent(new w.Event(ev || 'input', { bubbles: true })); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = (h) => { w.location.hash = h; UI.render(); };
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } };

(async () => {
  console.log('-- editor: add/remove line items, totals, save');
  nav('#/invoices/new');
  check('editor renders 1 item row', $$('#ed-items tr').length === 1);
  click($('[data-action="add-item"]'));
  check('add-item -> 2 rows', $$('#ed-items tr').length === 2);
  setInput($('#ed-items tr:first-child input[data-f="qty"]'), '5');
  setInput($('#ed-items tr:first-child input[data-f="desc"]'), 'Test design work');
  setInput($('#ed-items tr:first-child input[data-f="price"]'), '100');
  check('totals show 500 subtotal', $('#ed-totals').textContent.includes('500'));
  click($$('#ed-items [data-action="rm-item"]')[1]);
  check('rm-item -> 1 row', $$('#ed-items tr').length === 1);
  const before = S.db.invoices.length;
  click($('#tb-actions [data-action="save"]'));
  check('save creates invoice', S.db.invoices.length === before + 1);
  check('navigated to invoice view', w.location.hash.startsWith('#/i/'));

  console.log('-- invoices list: filters + search');
  nav('#/invoices');
  click($('#inv-chips [data-s="paid"]'));
  check('paid filter renders rows', $$('#inv-table tbody tr').length >= 1);
  setInput($('#inv-q'), 'zzz-no-match');
  check('search empty-state shown', $('#inv-table').textContent.includes('No invoices match'));
  setInput($('#inv-q'), '');

  console.log('-- client view: viewed tracking + pay flow');
  const sent = S.db.invoices.find((i) => i.status === 'sent');
  nav('#/i/' + sent.id);
  check('opening pay-link marks Viewed', S.getInvoice(sent.id).status === 'viewed');
  click($('[data-action="clientpay"]'));
  check('checkout modal open', !!$('#cp-pay'));
  click($('#cp-pay'));
  await sleep(1200);
  check('invoice paid after gateway', S.getInvoice(sent.id).status === 'paid');
  check('receipt auto-issued', S.db.activity.some((a) => a.type === 'receipt'));

  console.log('-- expenses: OCR scan -> confirm -> saved');
  nav('#/expenses');
  const expBefore = S.db.expenses.length;
  click($('#tb-actions [data-action="scan"]'));
  check('scan modal open', !!$('#scan-demo'));
  click($('#scan-demo'));
  await sleep(2000);
  check('extraction finished, Use enabled', $('#scan-use') && !$('#scan-use').disabled);
  click($('#scan-use'));
  check('confirm modal prefilled', !!$('#ex-mer') && $('#ex-mer').value.length > 0);
  click($('#ex-save'));
  check('expense saved from scan', S.db.expenses.length === expBefore + 1);

  console.log('-- time tracking: start/stop');
  nav('#/time');
  click($('[data-action="start"]'));
  check('timer running UI', !!$('#tm-clock') && $('#tm-clock').classList.contains('run'));
  click($('[data-action="stop"]'));
  check('entry saved', S.db.timeEntries.length === 1);

  console.log('-- clients: create');
  nav('#/clients');
  const cBefore = S.db.clients.length;
  click($('#tb-actions [data-action="add"]'));
  setInput($('#cl-name'), 'Jsdom Test Co');
  click($('#cl-save'));
  check('client added', S.db.clients.length === cBefore + 1);

  console.log('-- settings: template accent');
  nav('#/settings');
  click($$('#set-accents .swatch')[1]);
  check('accent switched to green', S.db.settings.template.accent === 'green');

    console.log('-- receipt view');
  const paid = S.db.invoices.find((i) => i.status === 'paid');
  nav('#/r/' + paid.id);
  check('receipt paper renders', !!$('.paper') && $('.paper').textContent.includes('RECEIPT'));

  console.log('-- account view: theme, notifications, profile edit');
  nav('#/account');
  check('account view renders', !!$('#view .account-scroll'));
  check('10 sections rendered', $$('#view .sec-title').length === 10);
  const dark = $$('#view .theme-chip')[1];
    click(dark);
  check('dark theme applied', S.db.settings.preferences.theme === 'dark');
  const tgl = $$('#view .chip.toggle[data-toggle]')[0];
  const k = tgl.dataset.toggle;
  const notifBefore = S.db.settings.notifications[k];
  click(tgl);
  check('notification toggled', S.db.settings.notifications[k] !== notifBefore);
  click($('[data-action="edit-profile"]'));
  check('edit-profile modal open', !!$('#pf-save'));
  click($('#pf-save'));
  check('profile saved', !!S.db.settings.profile.name);
  click($('[data-action="account-home"]'));
  check('back to dashboard', w.location.hash === '#/dashboard');

  console.log('-- auth: logout -> login screen -> login');
  click($('.uc-out'));
  check('login screen shown after sign out', !!$('#auth-card') && $('#auth-card').innerHTML.includes('Welcome back'));
  check('wrong password rejected', !!S.Auth.login({ email: 'qa@sherpay.app', password: 'nope' }).error);
  check('login restores session', !!S.Auth.login({ email: 'qa@sherpay.app', password: 'password123', remember: true }).user);
  UI.render(true);
  check('app shell back after login', !!$('.sidebar') && !!$('#view'));

  await sleep(300);
  if (errors.length) { fail++; console.log('\nRUNTIME ERRORS:'); errors.forEach((e) => console.log('  ' + e)); }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('TEST CRASH', e); process.exit(1); });
