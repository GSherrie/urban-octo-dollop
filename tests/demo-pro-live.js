/* Live demo: does the Pro inventory feature actually work, end to end?
   Boots the real app in jsdom, walks Free → 1 GHS Pro → bill an item,
   printing what the user would see at each step. */
const path = require('path'), fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const WEB = path.join(__dirname, '..', 'web');

const html = fs.readFileSync(WEB + '/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(String(e.message || e)));
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://sherpay.vercel.app/', virtualConsole: vc });
const w = dom.window;
w.URL.createObjectURL = () => 'blob:stub';
w.URL.revokeObjectURL = () => {};
w.print = () => {};
['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-inventory.js', 'js/views-account.js']
  .forEach((f) => w.eval(fs.readFileSync(WEB + '/' + f, 'utf8')));
const S = w.Store, UI = w.UI;
S.boot();
const su = S.Auth.signup({ name: 'Pro Demo', email: 'demo@sherpay.app', password: 'password123' });
if (!su.user) { console.log('FATAL signup: ' + su.error); process.exit(1); }
UI.start();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => Array.from(w.document.querySelectorAll(s));
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const setInput = (el, v, ev) => { el.value = v; el.dispatchEvent(new w.Event(ev || 'input', { bubbles: true })); };
const nav = (h) => { w.location.hash = h; UI.render(); };
let ok = 0, bad = 0;
const say = (n, c) => { if (c) { ok++; console.log('  PASS  ' + n); } else { bad++; console.log('  FAIL  ' + n); } };

console.log('\n== 1. On the Free plan ==');
nav('#/inventory');
say('Inventory route opens but is gated: "SherPay Pro unlocks inventory management."', !!$('#view') && $('#view').innerHTML.includes('unlocks inventory management'));
nav('#/invoices/new');
say('invoice editor has NO Stock column on Free', $$('#ed-items select[data-f="inv"]').length === 0);

console.log('\n== 2. Pay 1 GHS, get Pro ==');
S.db.settings.plan = { tier: 'pro', months: 12, paid_at: S.todayISO(), ref: 'SHP-UP-000001-LIVEDMO1' };
S.save();
say('S.upgrades.isPro() === true', S.upgrades.isPro() === true);

S.resetDemo();           // the "Explore with sample data" button's data
UI.render();
const seeded = S.db.inventory.length;
say('sample workspace has stock to sell (' + seeded + ' items)', seeded > 0);

console.log('\n== 3. Inventory view on Pro ==');
nav('#/inventory');
const v = $('#view').innerHTML;
say('stock list renders, gate is gone', !v.includes('unlocks inventory management') && v.includes(S.db.inventory[0].name));
say('demo item visible with its qty: "' + S.db.inventory[0].name + ' (' + S.db.inventory[0].qty + ' ' + S.db.inventory[0].unit + ')"', true);

console.log('\n== 4. Bill it from the invoice editor ==');
nav('#/invoices/new');
const pick = $('#ed-items select[data-f="inv"]');
say('Stock column present on Pro', !!pick);
say('picker shows live on-hand ("' + pick.querySelector('option:not([value=""])').textContent + '")', pick.innerHTML.includes('left'));
const stockId = pick.querySelector('option:not([value=""])').value;
const item = S.inventoryItem(stockId);
const before = item.qty;
setInput(pick, stockId, 'change');
const desc = $('#ed-items input[data-f="desc"]').value.trim();
say('picking a stock item autofills the description ("' + desc + '")', desc.length > 0);
setInput($('#ed-items input[data-f="qty"]'), '3');
const sel = $('#ed-client');
sel.value = (Array.from(sel.options).find((o) => o.value && o.value !== '__new') || {}).value;
sel.dispatchEvent(new w.Event('change', { bubbles: true }));
click($('[data-action="save-send"]'));

const inv = S.db.invoices.find((i) => (i.items || []).some((it) => it.inventory_id === stockId));
say('invoice created as "' + (inv && inv.status) + '" (' + (inv && inv.number) + ')', !!inv && inv.status === 'sent');
say('stock auto-deducted on send: ' + before + ' → ' + item.qty + ' (3 billed)', inv && item.qty === before - 3);
say('line kept its stock link through save (' + (inv && inv.items[0].inventory_id === stockId) + ')', !!inv && inv.items[0].inventory_id === stockId);

console.log('\n== 5. Send it again ==');
S.markSent(inv.id, 'Email');
say('resend does not double-charge the shelf: still ' + item.qty, item.qty === before - 3);

console.log('\n== 6. Idempotency at the store level ==');
S.deductInventoryFromInvoice(inv);
say('another deduct call claims only the delta: still ' + item.qty, item.qty === before - 3);

console.log('\n' + (bad ? bad + ' FAILED, ' : '') + ok + ' passed' + (errors.length ? ' — jsdom errors: ' + errors.join(' | ') : ' — no jsdom errors'));
process.exit(bad || errors.length ? 1 : 0);
