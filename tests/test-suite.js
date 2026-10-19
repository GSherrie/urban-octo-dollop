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
  for (const f of ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-inventory.js', 'js/views-account.js']) {
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
  section('fresh start (no demo data)');
  check('fresh install is blank', S.db.invoices.length === 0 && S.db.clients.length === 0 && S.db.expenses.length === 0);
  nav('#/dashboard');
  check('welcome card shown on blank workspace', $('#view').textContent.includes('Welcome to SherPay'));
  check('sample-data loader offered', !!$('[data-action="load-demo"]'));
  click($('[data-action="load-demo"]'));
  click($('#cf-yes'));
  check('sample data loads on demand', S.db.invoices.length > 0 && S.db.clients.length > 0);

  /* The plan is an account fact, not workspace data: a paid Pro who explores
     the sample set must still be Pro afterwards (demoData carries it over). */
  const planBefore = { tier: 'pro', months: 12, paid_at: S.todayISO(), ref: 'SHP-UP-000001-KEEPPLAN' };
  S.db.settings.plan = planBefore;
  S.resetDemo();
  check('loading the sample set keeps the paid plan', S.upgrades.isPro() === true && S.db.settings.plan === planBefore);
  S.db.settings.plan = null;
  S.save();

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

  section('editor: two-way client save (new client while invoicing)');
  nav('#/invoices/new');
  check('client dropdown offers + New client', !!$('#ed-client option[value="__new"]'));
  $('#ed-client').value = '__new';
  $('#ed-client').dispatchEvent(new w.Event('change', { bubbles: true }));
  check('new-client fields appear', !$('#ed-newclient').hasAttribute('hidden'));
  setInput($('#ed-new-name'), 'QA Walk-in Buyer');
  setInput($('#ed-new-email'), 'qawalkin@sherpay.test');
  setInput($('#ed-new-phone'), '+233 24 000 0092');
  setInput($('#ed-items tr:first-child input[data-f="desc"]'), 'QA walk-in service');
  setInput($('#ed-items tr:first-child input[data-f="price"]'), '250');
  click($('#tb-actions [data-action="save-send"]'));
  await sleep(50);
  const twowayInv = S.db.invoices[0];
  const twowayClient = S.getClient(twowayInv.clientId);
  check('inline client auto-saved on send', !!twowayClient && twowayClient.name === 'QA Walk-in Buyer');
  check('inline client contact kept', twowayClient.email === 'qawalkin@sherpay.test' && twowayClient.phone === '+233 24 000 0092');
  check('two-way invoice sent (sent→viewed once opened)', twowayInv.status === 'sent' || twowayInv.status === 'viewed');
  check('no scratch field leaks onto invoice', !('newClient' in twowayInv));
  nav('#/clients');
  check('two-way client visible in CRM', $('#view').textContent.includes('QA Walk-in Buyer'));
  // same email must reuse, not duplicate
  const clientCount = S.db.clients.length;
  nav('#/invoices/new');
  $('#ed-client').value = '__new';
  $('#ed-client').dispatchEvent(new w.Event('change', { bubbles: true }));
  setInput($('#ed-new-name'), 'QA Walk-in Renamed');
  setInput($('#ed-new-email'), 'qawalkin@sherpay.test');
  setInput($('#ed-items tr:first-child input[data-f="desc"]'), 'QA follow-up');
  setInput($('#ed-items tr:first-child input[data-f="price"]'), '50');
  click($('#tb-actions [data-action="save-send"]'));
  await sleep(50);
  check('repeat email reuses saved client (no duplicate)', S.db.clients.length === clientCount);
  // nameless inline client must block save
  nav('#/invoices/new');
  $('#ed-client').value = '__new';
  $('#ed-client').dispatchEvent(new w.Event('change', { bubbles: true }));
  const invCountBeforeNameCheck = S.db.invoices.length;
  setInput($('#ed-items tr:first-child input[data-f="desc"]'), 'QA nameless');
  setInput($('#ed-items tr:first-child input[data-f="price"]'), '10');
  click($('#tb-actions [data-action="save-send"]'));
  await sleep(50);
  check('nameless new client blocks save', S.db.invoices.length === invCountBeforeNameCheck);

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
  // notification toggle (accessible switch: checkbox input inside .switch)
  const toggles = $$('#view .switch[data-toggle] input');
  check('notification toggles present', toggles.length > 0);
  const toggleKey = toggles[0].closest('.switch').dataset.toggle;
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
  check('cloud account mode remains selected after logout', S.cloud.authEnabled());
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

  section('inventory (Pro feature)');

  // The suite boots with the sample dataset loaded ("fresh start" clicks
  // Load demo), so every count here is relative to what already exists.
  const invBase = S.db.inventory.length;
  const inv1 = S.addInventoryItem({ sku: 'AA-100', name: 'AA Alkaline Batteries', qty: 12, unit: 'box', cost: 18.5, note: '' });
  check('inventory item added with fields', inv1 && inv1.id && inv1.qty === 12 && S.db.inventory.length === invBase + 1);
  check('inventory item persisted', S.inventoryItem(inv1.id) && S.inventoryItem(inv1.id).name === 'AA Alkaline Batteries');
  const inv2 = S.addInventoryItem({ sku: 'LED-200', name: 'LED Downlight', qty: 5, unit: 'box', cost: 42, note: '' });
  check('second item added', S.db.inventory.length === invBase + 2);
  const a1 = S.updateInventoryItem(inv1.id, { qty: 7 });
  check('stock update applies', a1 && a1.qty === 7);

  // Deduct stock when an invoice bills an inventory line.
  const charged = { id: 'inv-charged', number: 'INV-2026-010', clientId: 'c1', issueDate: S.todayISO(), dueDate: S.addDays(S.todayISO(), 30), currency: 'GHS', items: [], taxMode: 'percent', taxValue: 15, discountMode: 'none', discountValue: 0, status: 'draft', payments: [] };
  charged.items.push({ desc: 'AA Alkaline Batteries', qty: 2, price: 18.5, inventory_id: inv1.id });
  S.deductInventoryFromInvoice(charged);
  check('invoice with inventory line deducts stock', S.inventoryItem(inv1.id) && S.inventoryItem(inv1.id).qty === 5);

  // Overselling is capped at on hand, never negative.
  charged.items.push({ desc: 'LED Downlight', qty: 999, price: 42, inventory_id: inv2.id });
  S.deductInventoryFromInvoice(charged);
  check('oversell capped at on hand', S.inventoryItem(inv2.id) && S.inventoryItem(inv2.id).qty === 0);
  // A re-save claims only the difference — stock is never drained twice.
  S.deductInventoryFromInvoice(charged);
  check('repeat deduct is a no-op', S.inventoryItem(inv1.id).qty === 5);

  // A line without inventory_id is ignored for stock.
  const plain = { desc: 'Consulting', qty: 1, price: 500, inventory_id: null };
  const inv2b = { id: 'inv-plain', number: 'INV-2026-011', clientId: 'c1', issueDate: S.todayISO(), dueDate: S.addDays(S.todayISO(), 30), currency: 'GHS', items: [plain], taxMode: 'percent', taxValue: 15, discountMode: 'none', discountValue: 0, status: 'draft', payments: [] };
  S.deductInventoryFromInvoice(inv2b);
  check('plain line does not touch stock', S.inventoryItem(inv1.id) && S.inventoryItem(inv1.id).qty === 5);

  // Sending is the billing moment: stock leaves the shelf once, on first send.
  const billed = { id: S.uid(), number: S.newInvoiceNumber(S.todayISO()), clientId: 'c1', issueDate: S.todayISO(), dueDate: S.addDays(S.todayISO(), 30), currency: 'GHS', items: [{ desc: 'AA Alkaline Batteries', qty: 1, price: 18.5, inventory_id: inv1.id }], taxMode: 'percent', taxValue: 15, discountMode: 'none', discountValue: 0, status: 'draft', payments: [] };
  S.db.invoices.push(billed);
  S.markSent(billed.id, 'Email');
  check('sending an invoice auto-deducts stock', S.inventoryItem(inv1.id).qty === 4);
  S.markSent(billed.id, 'Email');
  check('resend does not double-deduct', S.inventoryItem(inv1.id).qty === 4);

  const a2 = S.deleteInventoryItem(inv2.id);
  check('delete removes row', a2 && S.db.inventory.length === invBase + 1);

  check('inventory view registered', !!UI.VIEWS.inventory);

  section('auth: session, logout, login');
  check('session active', !!S.Auth.current());
  const dup = S.Auth.signup({ name: 'Dup', email: ' QA@SherPay.app ', password: 'password123' });
  check('duplicate email blocked', !!dup.error);
  check('duplicate signup logs out matching session', !S.Auth.current() && S.db === null);
  S.Auth.logout();
  UI.render(true);
  check('auth screen after logout', !!$('#auth-card') && $('#auth-card').innerHTML.includes('Welcome back'));
  check('logout clears in-memory workspace', S.db === null);
  check('wrong password rejected', !!S.Auth.login({ email: 'qa@sherpay.app', password: 'nope' }).error);
  check('login succeeds', !!S.Auth.login({ email: 'qa@sherpay.app', password: 'password123', remember: true }).user);
  UI.render(true);
  check('app renders after login', !!$('#view') && $('#view').innerHTML.length > 40);

  section('auth: per-user workspace isolation');
  const qaId = S.Auth.current().id;
  const qaClientsBefore = S.db.clients.length;
  S.db.clients.push({ id: 'c-qa-private', name: 'QA Private Client' });
  S.save();
  check('workspace saves to per-user key', !!w.localStorage.getItem('sherpay_db_v1:' + qaId));
  S.Auth.logout();
  check('logout clears in-memory workspace (second user)', S.db === null);
  const second = S.Auth.signup({ name: 'Second User', email: 'second@sherpay.app', password: 'password123' });
  check('second user signs up', !!second.user);
  UI.render(true);
  check('second user starts blank (no leak)', S.db.clients.length === 0 && S.db.invoices.length === 0 && S.db.expenses.length === 0);
  check('legacy shared key not recreated', !w.localStorage.getItem('sherpay_db_v1'));
  check('per-user caches stay separate', !!w.localStorage.getItem('sherpay_db_v1:' + qaId) && !!w.localStorage.getItem('sherpay_db_v1:' + second.user.id));
  S.db.clients.push({ id: 'c-second-private', name: 'Second Private Client' });
  S.save();
  S.Auth.logout();
  check('first user sees only their data after switch-back', !!S.Auth.login({ email: 'qa@sherpay.app', password: 'password123' }).user && S.db.clients.length === qaClientsBefore + 1 && S.db.clients.some((c) => c.name === 'QA Private Client') && !S.db.clients.some((c) => c.name === 'Second Private Client'));
  S.Auth.logout();
  check('second user sees only their data after switch-back', !!S.Auth.login({ email: 'second@sherpay.app', password: 'password123' }).user && S.db.clients.length === 1 && S.db.clients[0].name === 'Second Private Client');
  S.Auth.logout();
  S.Auth.login({ email: 'qa@sherpay.app', password: 'password123', remember: true });
  UI.render(true);

  section('auth: cloud duplicate registration');
  let sessionReadCount = 0, duplicateSignOutScope = null;
  w.__SHERPAY_CLOUD_CLIENT__ = {
    auth: {
      getSession: async () => {
        sessionReadCount++;
        return { data: { session: sessionReadCount === 1 ? null : { user: { id: 'cloud-qa', email: 'qa@sherpay.app' } } }, error: null };
      },
      signUp: async () => ({ data: { user: { id: 'cloud-qa', email: 'qa@sherpay.app', identities: [] }, session: null }, error: null }),
      signOut: async (opts) => { duplicateSignOutScope = opts.scope; return { error: null }; }
    }
  };
  await S.cloud.init();
  const cloudDup = await S.Auth.cloudAuth.signup({ name: 'Duplicate QA', email: ' QA@SherPay.app ', password: 'password123' });
  check('cloud duplicate email rejected', !!cloudDup.error);
  check('matching cloud session logged out', duplicateSignOutScope === 'local' && !S.Auth.current());
  S.Auth.login({ email: 'qa@sherpay.app', password: 'password123', remember: true });
  UI.render(true);

  section('runtime errors');
  check('no uncaught errors', errors.length === 0);
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log('   ' + e));

  console.log('\nQA RESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('SUITE CRASH', e); process.exit(1); });
