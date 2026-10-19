const WEB = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'..','web'), p.join(__dirname,'web'), p.join(__dirname,'..','sherpay'), p.join(__dirname,'sherpay')].find((x) => f.existsSync(x)); })();
/* UX + data-integrity suite.
   Covers what a route-render test cannot see:
   · a first run that is genuinely empty (sample data is opt-in, never assumed)
   · the setup loop card, whose progress is derived from real data
   · the editor's phone action bar, its totals sync, and inline validation
   · the unsaved-work guard on the sidebar
   · Hick's-law chip filtering + Von Restorff overdue emphasis in the lists
   · a corrupt saved workspace that announces itself instead of looking empty
   Same style as test-ui.js so it runs beside the other suites. */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(WEB + '/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const SCRIPTS = ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-account.js'];
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));

function loadApp(url) {
  const dom = new JSDOM(html, { url, pretendToBeVisual: true, runScripts: 'outside-only', virtualConsole: vc });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:stub';
  w.URL.revokeObjectURL = () => {};
  w.print = () => {};
  for (const f of SCRIPTS) w.eval(fs.readFileSync(WEB + '/' + f, 'utf8'));
  return w;
}

const w = loadApp('http://localhost:8000/');
const S = w.Store, UI = w.UI;
S.boot();               // plain URL: no ?demo, no saved data
const su = S.Auth.signup({ name: 'UX Tester', email: 'ux@sherpay.app', password: 'password123' });
if (!su.user) { console.log('FATAL signup for tests: ' + su.error); process.exit(1); }
UI.start();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => Array.from(w.document.querySelectorAll(s));
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const setInput = (el, v, ev) => { el.value = v; el.dispatchEvent(new w.Event(ev || 'input', { bubbles: true })); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = (h) => { w.location.hash = h; UI.render(); };
const hash = () => w.location.hash;
const modalYes = () => $('#modal-root #cf-yes');
const modalCancel = () => $('#modal-root .modal-f [data-action="close-modal"]');
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } };

(async () => {
  console.log('-- first run: blank workspace, sample data is opt-in');
  check('a new workspace boots empty (no invented clients/invoices/expenses)',
    S.db.invoices.length === 0 && S.db.clients.length === 0 && S.db.expenses.length === 0);
  check('clean boot reports no data fault', S.dataError() === null);
  check('sample data is not requested by default', S.demoRequested() === false);
  w.location.hash = '#/dashboard?demo';
  check('?demo asks for the sample tour', S.demoRequested() === true);
  w.location.hash = '#/dashboard';
  check('and the flag lets go again', S.demoRequested() === false);

  console.log('-- setup loop: progress is read from the workspace, one step is "next"');
  nav('#/dashboard');
  check('setup card leads the blank dashboard', !!$('#view .loop-card') && $('#view').textContent.includes('Welcome to SherPay'));
  check('progress reads 0 of 5', $('#view .of').textContent.trim() === '0 of 5');
  check('only one step shouts for attention', $$('#view .loop-step.next').length === 1);
  check('the rest stay quiet', $$('#view .loop-step.later').length === 4 && $$('#view .loop-step.ok').length === 0);
  check('sample data is offered, never assumed', !!$('#view [data-action="load-demo"]'));
  check('nothing to resume yet', !$('#view .resume'));
  click($('#view .loop-step.next'));
  check('the next step takes you where the work happens', hash() === '#/settings');
  nav('#/settings');
  setInput($('#set-name'), 'Adom Studio');
  setInput($('#set-email'), 'hello@adom.studio');
  await sleep(40);
  check('saving the business profile ticks the first milestone', S.setupProgress().done === 1 && S.setupSteps()[0].done === true);
  nav('#/dashboard');
  check('the card follows the data', $('#view .of').textContent.trim() === '1 of 5' && !!$('#view .loop-step.ok'));
  check('and the next step moved on', $('#view .loop-step.next b').textContent === 'Add your first client');

  console.log('-- editor on a phone: the total and Save where the thumb is');
  nav('#/invoices/new');
  check('body is tagged with the editor route so the layout can shift', w.document.body.dataset.route === 'invoices-new');
  check('phone action bar rendered with both saves', !!$('#ed-bar') && !!$('#ed-bar [data-action="save"]') && !!$('#ed-bar [data-action="save-send"]'));
  check('line item inputs are labelled', !!$('#ed-items input[data-f="desc"]').getAttribute('aria-label'));
  const barBefore = $('#ed-bar-total').textContent;
  setInput($('#ed-items tr:nth-child(1) input[data-f="desc"]'), 'Design sprint');
  setInput($('#ed-items tr:nth-child(1) input[data-f="qty"]'), '2');
  setInput($('#ed-items tr:nth-child(1) input[data-f="price"]'), '60');
  check('the bar total recomputes with every keystroke', $('#ed-bar-total').textContent !== barBefore);
  check('and never disagrees with the desktop totals panel',
    $('#ed-bar-total').textContent === $('#ed-totals .tr.grand b').textContent.trim());
  click($('#ed-bar [data-action="save"]'));
  check('a save that cannot go through says so inside the form', !!$('#view .form-err') && $('#view .form-err').getAttribute('role') === 'alert');
  check('the field at fault admits it', !!$('#ed-new-name.bad') && $('#ed-new-name').getAttribute('aria-invalid') === 'true' && !!$('#ed-new-name').parentNode.querySelector('.field-err'));
  check('and takes focus so the keyboard/reader lands on it', w.document.activeElement === $('#ed-new-name'));

  console.log('-- unsaved work: asked once, never thrown away quietly');
  nav('#/invoices/new');
  setInput($('#ed-notes'), 'Half-typed invoice');
  click($('.sidebar .nav-item[data-route="invoices"]'));
  check('leaving via the sidebar asks first', !!modalYes() && modalYes().textContent.includes('Discard'));
  check('and does not navigate out from under you', hash() === '#/invoices/new');
  click(modalCancel());
  check('cancel keeps the work on screen', !$('#modal-root').innerHTML && hash() === '#/invoices/new' && $('#ed-notes').value === 'Half-typed invoice');
  click($('.sidebar .nav-item[data-route="invoices"]'));
  click(modalYes());
  await sleep(30);
  check('discarding proceeds to where you were going', hash() === '#/invoices');
  click($('.sidebar .nav-item[data-route="clients"]'));
  check('the guard does not follow you into other views', !modalYes() && hash() === '#/clients');

  console.log('-- sample data arrives only by consent');
  nav('#/dashboard');
  click($('#view [data-action="load-demo"]'));
  check('the loader asks before replacing the workspace', !!modalYes() && modalYes().textContent.includes('Load sample'));
  click(modalYes());
  await sleep(40);
  check('sample data lands once agreed', S.db.invoices.length > 0 && S.db.clients.length > 0);
  check('a workspace that has been through the loop retires the card', S.setupProgress().complete === true);
  nav('#/dashboard');
  check('the setup card is gone, not nagging', !$('#view .loop-card'));

  console.log('-- invoice list: Hick on the filters, Von Restorff on the failures');
  nav('#/invoices');
  const allRows = $$('#inv-table tbody tr').length;
  check('the four everyday filters stay visible while the tail tucks away',
    $('#inv-chips [data-s="paid"]').className.includes('hidden') && !!$('#inv-chips .chip.more .n'));
  click($('#inv-chips [data-action="chip-more"]'));
  check('More brings the tail out', !$('#inv-chips [data-s="paid"]').className.includes('hidden') && $('#inv-chips .chip.more').textContent.includes('Fewer'));
  click($('#inv-chips [data-s="paid"]'));
  check('a tail chip filters like any other', $$('#inv-table tbody tr').length > 0 && $$('#inv-table tbody tr').length < allRows &&
    $$('#inv-table tbody tr .badge').every((b) => b.className.includes('paid')));
  check('the active filter is never hidden behind More',
    $('#inv-chips [data-s="paid"]').className.includes('on') && !$('#inv-chips [data-s="paid"]').className.includes('hidden'));
  click($('#inv-chips [data-s="all"]'));
  click($('#inv-chips [data-action="chip-more"]'));
  check('Fewer tucks the tail away until you ask for it again',
    $('#inv-chips [data-s="paid"]').className.includes('hidden') && $$('#inv-table tbody tr').length === allRows);
  check('overdue is the one red thing in the table', $$('#inv-table tr.row-overdue').length > 0 && $$('#inv-table tr.row-overdue td.od').length > 0);

  console.log('-- dashboard: unfinished work first, KPIs you can act on');
  nav('#/dashboard');
  const drafts = S.db.invoices.filter((i) => i.status === 'draft');
  check('unfinished drafts are offered before anything else',
    $$('#view .resume .rb').length > 0 && $$('#view .resume .rb').length === Math.min(3, drafts.length));
  click($('#view .resume .rb'));
  check('tapping one drops you back into the editor on that invoice', /^#\/invoices\/[\w-]+\/edit$/.test(hash()));
  nav('#/dashboard');
  check('the outstanding KPI is a way to act on the number',
    !!$('#view .kpi-link[data-action="open-outstanding"]') && $('#view .kpi-link[data-action="open-outstanding"]').getAttribute('role') === 'button');
  click($('#view .kpi-link[data-action="open-outstanding"]'));
  check('and it goes to the invoices that are owed', hash() === '#/invoices');
  nav('#/dashboard');
  click($('#view .kpi-link[data-action="open-expenses"]'));
  check('the expenses KPI opens expenses', hash() === '#/expenses');
  nav('#/dashboard');
  check('an overdue row cannot be missed in awaiting payment', !!$('#view .list-row.lr-overdue .od'));

  console.log('-- editor with data: a delete you can take back, a bad row that admits it');
  nav('#/invoices/new');
  setInput($('#ed-items tr:nth-child(1) input[data-f="desc"]'), 'Retainer — October');
  click($('#view [data-action="add-item"]'));
  check('Add item adds a row and puts the caret in it',
    $$('#ed-items tr').length === 2 && w.document.activeElement === $$('#ed-items input[data-f="desc"]')[1]);
  click($$('#ed-items tr')[1].querySelector('[data-action="rm-item"]'));
  check('removing a line leaves a valid invoice', $$('#ed-items tr').length === 1);
  check('and offers a way back instead of a shrug', !!$('.toast-undo'));
  click($('.toast-undo'));
  check('Undo puts the line back exactly where it was',
    $$('#ed-items tr').length === 2 && $$('#ed-items input[data-f="desc"]')[0].value === 'Retainer — October');
  nav('#/invoices/new');
  click($('#ed-bar [data-action="save"]'));
  check('a blank line item is named, not just announced',
    !!$('#view .form-err') && !!$('#ed-items input.bad[aria-invalid="true"]') && w.document.activeElement === $('#ed-items input[data-f="desc"]'));
  setInput($('#ed-items tr:nth-child(1) input[data-f="desc"]'), 'Brand refresh');
  check('the field stops shouting as soon as it is right', !$('#ed-items input.bad') && !$('#view .field-err'));
  click($('#ed-bar [data-action="save"]'));
  await sleep(60); UI.render();
  check('the banner clears when the save goes through', !$('#view .form-err') && S.db.invoices[0].items[0].desc === 'Brand refresh');
  check('saving lands you on the invoice and stands the guard down', /^#\/i\//.test(hash()) && !$('#ed-bar'));
  click($('.sidebar .nav-item[data-route="dashboard"]'));
  check('a saved invoice lets you walk away without a prompt', !modalYes() && hash() === '#/dashboard');

  console.log('-- a workspace that cannot be read says so out loud');
  const w2 = loadApp('http://localhost:8001/');
  w2.localStorage.setItem('sherpay_db_v1', '{"clients": [ this is not json');
  const S2 = w2.Store;
  S2.boot();
  check('the unreadable save is remembered, not swallowed', !!S2.dataError());
  check('the session still opens — empty but usable', S2.db.clients.length === 0 && S2.db.invoices.length === 0);
  w2.UI.start();
  const mroot = w2.document.getElementById('modal-root').textContent;
  check('it is a dialog that must be acknowledged, not a toast that fades',
    /could not open your saved workspace/i.test(mroot) && !/saved workspace/i.test(w2.document.getElementById('toast-root').textContent));
  check('and it says plainly that nothing was deleted', /Nothing was deleted/.test(mroot));
  check('a healthy boot stays out of the way', !/workspace/i.test($('#modal-root').textContent));

  console.log('-- a cloud session that stops authenticating is said out loud, once');
  check('401s and expired tokens read as session problems',
    S.cloud.isAuthError({ status: 401 }) && S.cloud.isAuthError({ statusCode: 403 }) && S.cloud.isAuthError({ message: 'JWT expired' }));
  check('an ordinary network failure does not',
    !S.cloud.isAuthError(null) && !S.cloud.isAuthError({ status: 500 }) && !S.cloud.isAuthError({ message: 'Failed to fetch' }));

  const w3 = loadApp('http://localhost:8002/');
  let expiredTalks = 0;
  w3.__SHERPAY_CLOUD_CLIENT__ = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'qa@sherpay.app', user_metadata: { full_name: 'QA' } } } } }),
      getUser: async () => ({ error: { status: 401, message: 'JWT expired' } })
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }), upsert: async () => ({ error: null }) })
  };
  const S3 = w3.Store;
  S3.boot();
  S3.cloud.onSessionExpired(() => { expiredTalks++; });
  w3.UI.start();                       // the shell is listening before the session dies
  await S3.cloud.init();
  check('an expired session flips the sync status instead of claiming to be connected', S3.cloud.status() === 'expired');
  check('and it says what to do about it', /sign in again/i.test(S3.cloud.lastError() || ''));
  check('the shell answers with a dialog, not a toast that fades', /Cloud sync stopped/i.test(w3.document.getElementById('modal-root').textContent));
  await S3.cloud.sync(); await S3.cloud.sync();
  check('it is said once, not on every retry', expiredTalks === 1 && S3.cloud.status() === 'expired');

  await sleep(200);
  if (errors.length) { fail++; console.log('\nRUNTIME ERRORS:'); errors.forEach((e) => console.log('  ' + e)); }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('TEST CRASH', e); process.exit(1); });




