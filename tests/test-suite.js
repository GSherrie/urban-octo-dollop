const WEB = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'..','web'), p.join(__dirname,'web'), p.join(__dirname,'..','sherpay'), p.join(__dirname,'sherpay')].find((x) => f.existsSync(x)); })();
/* SherPay full functional QA suite — exercises every feature end-to-end in jsdom */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(WEB + '/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://sherpay.vercel.app/', virtualConsole: vc });
const w = dom.window;
// stubs for browser APIs jsdom lacks
w.URL.createObjectURL = () => 'blob:stub';
w.URL.revokeObjectURL = () => {};
w.print = () => {};
  for (const f of ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-account.js']) {
  w.eval(fs.readFileSync(WEB + '/' + f, 'utf8'));
}
const S = w.Store, UI = w.UI;
S.boot();
// auth gate: create + sign in before rendering routes
const su = S.Auth.signup({ name: 'QA Tester', email: 'qa@sherpay.app', password: 'password123' });
if (!su.user) { console.log('FATAL signup for tests: ' + su.error); process.exit(1); }
UI.start();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => Array.from(w.document.querySelectorAll(s));
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const setInput = (el, v, ev) => { el.value = v; el.dispatchEvent(new w.Event(ev || 'input', { bubbles: true })); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = (h) => { w.location.hash = h; UI.render(); };
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  FAIL ' + name); } };
const section = (n) => console.log('— ' + n);

(async () => {
  section('dashboard');
  nav('#/dashboard');
  check('4 KPI cards', $$('.kpi').length === 4);
  check('cashflow chart svg', !!$('#view svg rect'));
  check('pipeline donut', !!$('#view .card-b svg path'));
  check('awaiting-payment list', $$('#view .list-row').length > 0);
  check('activity feed', $$('#view .act-item').length > 0);

  section('invoices list: filters & search');
  nav('#/invoices');
  const allRows = $$('#inv-table tbody tr').length;
  click($('#inv-chips [data-s="paid"]'));
  const paidRows = $$('#inv-table tbody tr').length;
  check('paid filter narrows', paidRows > 0 && paidRows < allRows);
  check('paid rows all paid badge', $$('#inv-table tbody tr .badge').every((b) => b.className.includes('paid')));
  click($('#inv-chips [data-s="all"]'));
  const inv0 = S.db.invoices[0];
  setInput($('#inv-q'), inv0.number);
  check('search by number', $$('#inv-table tbody tr').length === 1);
  setInput($('#inv-q'), (S.getClient(inv0.clientId) || {}).name || '');
  check('search by client', $$('#inv-table tbody tr').length >= 1);
  setInput($('#inv-q'), '');

  section('editor: math, numbering, save');
  nav('#/invoices/new');
  const seqBefore = S.db.settings.seq;
  setInput($('#ed-items tr:first-child input[data-f="desc"]'), 'QA service');
  setInput($('#ed-items tr:first-child input[data-f="qty"]'), '3');
  setInput($('#ed-items tr:first-child input[data-f="price"]'), '100');
  check('subtotal 300', $('#ed-totals').textContent.includes('300'));
  click($('#ed-discmode button[data-m="percent"]'));
  setInput($('#ed-discval'), '10');
  check('10% discount => tax on 270 = 40.5, total 310.5', $('#ed-totals').textContent.includes('40.5') && $('#ed-totals').textContent.includes('310.5'));
  click($('#ed-taxmode button[data-m="flat"]'));
  setInput($('#ed-taxval'), '30');
  check('flat tax 30 => total 300', !$('#ed-totals').textContent.includes('310.5') && $('#ed-totals').textContent.includes('300.00'));
  click($('#tb-actions [data-action="save"]'));
  await sleep(50);
  const created = S.db.invoices[0];
  check('sequential number assigned', created.number === S.db.settings.prefix + '-' + new Date().getFullYear() + '-' + String(seqBefore).padStart(3, '0'));
  check('seq incremented', S.db.settings.seq === seqBefore + 1);
  check('draft status', created.status === 'draft');

  section('send + viewed tracking + partial + full pay + receipt');
  nav('#/invoices');
  click($('#inv-table tbody tr [data-action="send"]'));
  check('send modal open', !!$('#do-send'));
  click($('#do-send'));
  check('status sent + sentAt', created.status === 'sent' && !!created.sentAt);
  nav('#/i/' + created.id);
  check('opening link marks viewed', S.getInvoice(created.id).status === 'viewed');
  click($('[data-action="clientpay"]'));
  setInput($('#cp-amt'), '100');
  click($('#cp-pay'));
  await sleep(1100);
  const afterPartial = S.getInvoice(created.id);
  check('partial payment recorded', afterPartial.payments.length === 1 && S.displayStatus(afterPartial) === 'partial');
  nav('#/i/' + created.id);
  click($('[data-action="clientpay"]'));
  click($('#cp-pay'));
  await sleep(1100);
  const afterFull = S.getInvoice(created.id);
  check('paid in full', afterFull.status === 'paid');
  check('receipt logged', S.db.activity.some((a) => a.type === 'receipt' && a.message.includes(S.receiptNumber(afterFull))));
  nav('#/r/' + created.id);
  check('receipt shows both payment rows', $$('.paper table')[0].querySelectorAll('tbody tr').length === 2);

  section('clients CRUD');
  nav('#/clients');
  const cBefore = S.db.clients.length;
  click($('#tb-actions [data-action="add"]'));
  setInput($('#cl-name'), 'QA Client Ltd');
  setInput($('#cl-terms'), '21');
  click($('#cl-save'));
  const newC = S.db.clients[S.db.clients.length - 1];
  check('client created with terms', S.db.clients.length === cBefore + 1 && newC.terms === 21);
  click($('#view [data-action="edit"][data-id="' + newC.id + '"]'));
  setInput($('#cl-name'), 'QA Client Renamed');
  click($('#cl-save'));
  check('client renamed', S.getClient(newC.id).name === 'QA Client Renamed');
  click($('#view [data-action="invoice"][data-id="' + newC.id + '"]'));
  await sleep(150);
  check('invoice-from-client prefills', $('#ed-client') && $('#ed-client').value === newC.id);
  nav('#/clients');
  click($('#view [data-action="del"][data-id="' + newC.id + '"]'));
  click($('#cf-yes'));
  check('client deleted', !S.getClient(newC.id));

  section('expenses: manual + scan + filter + delete');
  nav('#/expenses');
  const eBefore = S.db.expenses.length;
  click($('#tb-actions [data-action="add"]'));
  setInput($('#ex-mer'), 'QA Supplies');
  setInput($('#ex-total'), '55.5');
  setInput($('#ex-tax'), '5.5');
  click($('#ex-save'));
  check('expense saved', S.db.expenses.length === eBefore + 1);
  click($('#tb-actions [data-action="scan"]'));
  click($('#scan-demo'));
  await sleep(1900);
  check('scan extracts & enables use', !$('#scan-use').disabled);
  click($('#scan-use'));
  check('scan prefill merchant', !!$('#ex-mer') && $('#ex-mer').value.length > 0);
  click($('#ex-save'));
  check('scanned expense saved', S.db.expenses.length === eBefore + 2);
  const cat = S.db.expenses[0].category;
  click($('#view .card-h [data-action="chip"][data-s="' + cat + '"]'));
  check('category filter works', $$('#exp-table tbody tr').length >= 1 && $$('#exp-table tbody tr').every((r) => r.textContent.includes(cat)));
  click($('#view [data-action="del"][data-id="' + S.db.expenses[0].id + '"]'));
  click($('#cf-yes'));
  check('expense deleted', S.db.expenses.length === eBefore + 1);

  section('expenses: edit + validation');
  const edTarget = S.db.expenses[0];
  const edName = edTarget.merchant, edTotal = edTarget.total;
  click($('#view [data-action="edit"][data-id="' + edTarget.id + '"]'));
  check('edit modal opens prefilled', !!$('#ex-mer') && $('#ex-mer').value === edTarget.merchant);
  setInput($('#ex-mer'), edName + ' II');
  setInput($('#ex-total'), '999');
  setInput($('#ex-tax'), '5000');
  click($('#ex-save'));
  check('tax over total blocked', S.db.expenses[0].total === edTotal && !!$('#ex-save'));
  setInput($('#ex-tax'), '99.9');
  setInput($('#ex-date'), '');
  click($('#ex-save'));
  const edRec = S.db.expenses[0];
  check('expense edited in place', edRec.id === edTarget.id && edRec.merchant === edName + ' II' && edRec.total === 999 && edRec.tax === 99.9);
  check('empty date falls back to today', edRec.date === S.todayISO());
  check('edit creates no duplicate', S.db.expenses.length === eBefore + 1);

  section('time tracking → invoice');
  nav('#/time');
  click($('[data-action="start"]'));
  check('timer running', $('#tm-clock').classList.contains('run'));
  click($('[data-action="stop"]'));
  check('entry stored', S.db.timeEntries.length >= 1 && !S.db.timeEntries[0].invoiced);
  click($('#tb-actions [data-action="invoice-sel"]'));
  await sleep(50);
  check('time converted to draft invoice', S.db.invoices[0].status === 'draft' && S.db.invoices[0].items[0].desc.includes('h @'));
  check('entries marked invoiced', S.db.timeEntries.every((e) => e.invoiced));
  // per-client billing: a second client's unbilled entry must get its OWN invoice
  const c2 = S.db.clients[1];
  S.db.timeEntries.push({ id: S.uid(), clientId: c2.id, desc: 'QA cross-client task', startedAt: new Date(Date.now() - 3600000).toISOString(), end: new Date().toISOString(), rate: S.db.settings.hourlyRate, invoiced: false });
  nav('#/time');
  const invCountBefore = S.db.invoices.length;
  click($('#tb-actions [data-action="invoice-sel"]'));
  await sleep(50);
  check('per-client invoice for 2nd client', S.db.invoices.length === invCountBefore + 1 && S.db.invoices[0].clientId === c2.id);
  check('all entries invoiced across clients', S.db.timeEntries.every((e) => e.invoiced));

  section('reports & exports');
  nav('#/reports');
  const mb = S.moneyByMonth();
  check('P&L table months', $$('#view tbody tr').length >= 6);
  check('tax figures render', $('#view').textContent.includes(S.db.settings.taxLabel));
  const csv = S.toCSV([['a', 'b,c'], ['d"e', 'f']]);
  check('csv quoting correct', csv.includes('"b,c"') && csv.includes('"d""e"'));

  section('settings: numbering, branding, reminders, recurring');
  nav('#/settings');
  setInput($('#set-prefix'), 'QA');
  setInput($('#set-seq'), '500');
  check('next number preview', $('#view').textContent.includes('QA-' + new Date().getFullYear() + '-500'));
  click($$('#set-accents .swatch')[2]);
  check('accent persisted', S.db.settings.template.accent === 'violet');
  click($('#set-fonts [data-f="serif"]'));
  check('font persisted', S.db.settings.template.font === 'serif');
  // recurring generation
  const rec = S.db.invoices.find((i) => i.status === 'paid');
  rec.recurring = 'monthly'; rec.recurringNext = S.addDays(S.todayISO(), -1);
  const invCount = S.db.invoices.length;
  S.runAutomations();
  check('recurring auto-generated invoice', S.db.invoices.length === invCount + 1 && S.db.invoices[0].status === 'sent');
  check('recurring pointer advanced', rec.recurringNext > S.todayISO());
  // reminders fire for due-today
  const due = S.db.invoices.find((i) => S.displayStatus(i) === 'sent' || S.displayStatus(i) === 'viewed');
  due.dueDate = S.todayISO();
  S.runAutomations();
  check('due-today reminder queued', S.db.activity.some((a) => a.type === 'reminder' && a.ref === due.id && a.off === 0));

    section('account view: profile, security, preferences, data & support');
  nav('#/account');
  check('account view renders', !!$('#view .account-scroll'));
  check('account title set', $('#tb-title').textContent === 'Account');
  check('profile shows user name', $('#view').innerHTML.includes('QA Tester'));
  check('all 10 section titles present', $$('#view .sec-title').length === 10);
  check('profile section', $('#view').textContent.includes('Profile'));
  check('financial section', $('#view').textContent.includes('Financial account'));
  check('security section', $('#view').textContent.includes('Security'));
  check('notifications section', $('#view').textContent.includes('Notifications'));
  check('preferences section', $('#view').textContent.includes('Preferences'));
  check('budget section', $('#view').textContent.includes('Budget'));
  check('data & privacy section', $('#view').textContent.includes('Data'));
  check('support section', $('#view').textContent.includes('Support'));
  check('about section shows version', $('#view').textContent.includes('v' + '2.4.1'));
  check('about section shows build tag', /\bbuild (?:v\d+|offline)/.test($('#view').textContent));
  check('check-for-updates action available', !!$('[data-action="refresh-app"]'));
  check('actions section (logout)', $('#view').textContent.includes('Log out'));
  check('back-to-dashboard button', !!$('[data-action="account-home"]'));
  // theme chip toggles
  const themeChips = $$('#view .theme-chip');
  check('3 theme chips rendered', themeChips.length === 3);
  click(themeChips[1]);
  check('dark theme persisted', S.db.settings.preferences.theme === 'dark');
  // notification toggle
  const toggles = $$('#view .chip.toggle[data-toggle]');
  check('notification toggles present', toggles.length > 0);
  const toggleKey = toggles[0].dataset.toggle;
  const before = S.db.settings.notifications[toggleKey];
  click(toggles[0]);
  check('notification toggled persisted', S.db.settings.notifications[toggleKey] !== before);
  // currency select
  check('currency select rendered', !!$('#acc-currency'));
  // edit profile opens modal
  click($('[data-action="edit-profile"]'));
  check('profile edit modal open', !!$('#pf-save'));
  click($('#pf-save'));
  check('profile saved after edit', S.db.settings.profile.name === 'QA Tester');
  // logout navigates away
  click($('[data-action="logout"]'));
  check('logout sets auth hash', w.location.hash.startsWith('#/auth'));
  // restore session for the auth section below
  S.Auth.login({ email: 'qa@sherpay.app', password: 'password123', remember: true });
  UI.render(true);

  section('store invariants');
  const t1 = S.computeTotals({ items: [{ qty: 2, price: 10.5 }], taxMode: 'percent', taxValue: 15, discountMode: 'none', discountValue: 0, payments: [] });
  check('totals math exact', Math.abs(t1.total - 24.15) < 0.001);
  const od = { status: 'sent', dueDate: S.addDays(S.todayISO(), -2), payments: [], items: [] };
  check('overdue computed', S.displayStatus(od) === 'overdue');
  check('money format GHS', S.fmtMoney(1234.5, 'GHS').includes('1,234.5'));
  check('backup json serializable', JSON.parse(JSON.stringify(S.db)).invoices.length === S.db.invoices.length);

  section('auth: session, logout, login');
  check('session active', !!S.Auth.current());
  const dup = S.Auth.signup({ name: 'Dup', email: 'qa@sherpay.app', password: 'password123' });
  check('duplicate email blocked', !!dup.error);
  S.Auth.logout();
  UI.render(true);
  check('auth screen after logout', !!$('#auth-card') && $('#auth-card').innerHTML.includes('Welcome back'));
  check('wrong password rejected', !!S.Auth.login({ email: 'qa@sherpay.app', password: 'nope' }).error);
  check('login succeeds', !!S.Auth.login({ email: 'qa@sherpay.app', password: 'password123', remember: true }).user);
  UI.render(true);
  check('app renders after login', !!$('#view') && $('#view').innerHTML.length > 40);

  section('runtime errors');
  check('no uncaught errors', errors.length === 0);
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log('   ' + e));

  console.log('\nQA RESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('SUITE CRASH', e); process.exit(1); });
