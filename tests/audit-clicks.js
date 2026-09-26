/* Audit: click every control in every route + modal and report ones that
   produce no observable effect (dead buttons) or throw at runtime.
   Run:  node audit-clicks.js        (from tests/, after npm install) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const WEB = [path.join(__dirname, '..', 'web')].find((x) => fs.existsSync(x));
const html = fs.readFileSync(WEB + '/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { url: 'http://localhost:8000/', pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;

const errors = [];
w.addEventListener('error', (e) => errors.push('window.onerror: ' + (e.error ? e.error.stack : e.message)));
// jsdom lacks these download/attachment APIs; stub them so export clicks don't throw
if (!w.URL) w.URL = {};
if (typeof w.URL.createObjectURL !== 'function') w.URL.createObjectURL = () => 'blob:stub';
if (typeof w.URL.revokeObjectURL !== 'function') w.URL.revokeObjectURL = () => {};
if (typeof w.Blob !== 'function') w.Blob = class Blob {
  constructor(chunks = [], opts = {}) { this.ok = true; }
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
  slice() { return new w.Blob(); }
  stream() { return new ReadableStream({ start(controller) { controller.close(); } }); }
  text() { return Promise.resolve(''); }
};
w.print = () => { w.__printed = (w.__printed || 0) + 1; };

for (const f of ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-account.js']) {
  try { w.eval(fs.readFileSync(WEB + '/' + f, 'utf8')); } catch (e) { errors.push(f + ' load: ' + e.stack); }
}
const S = w.Store, UI = w.UI;
S.boot();
if (S.resetDemo) S.resetDemo(); // sample dataset for the click-through audit
if (!S.Auth.current()) S.Auth.signup({ name: 'Audit', email: 'audit@sherpay.app', password: 'password123' });
UI.start();

const $$ = (s, r) => Array.from((r || w.document).querySelectorAll(s));
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const snap = () => [
  w.location.hash,
  (w.document.getElementById('modal-root') || { innerHTML: '' }).innerHTML.length,
  (w.document.getElementById('toast-root') || { innerHTML: '' }).innerHTML.length,
  (w.document.getElementById('view') || { innerHTML: '' }).innerHTML.length,
  w.__printed || 0,
  (w.document.getElementById('tb-actions') || { innerHTML: '' }).innerHTML.length].join('|');

const ROUTES = ['#/dashboard', '#/invoices', '#/invoices/new', '#/clients', '#/expenses', '#/time',
  '#/reports', '#/settings', '#/account', '#/i/i1', '#/i/i4', '#/i/i6', '#/r/i1', '#/invoices/i7/edit'];

const ensureSession = () => {
  if (S.Auth.current()) return;
  const res = S.Auth.login({ email: 'audit@sherpay.app', password: 'password123' }) || S.Auth.signup({ name: 'Audit', email: 'audit2@sherpay.app', password: 'password123' });
  if (!res.user) throw new Error('cannot restore audit session: ' + res.error);
};

const dead = [];
const problems = [];

const SEL = 'button,[data-action],a[href^="#"],select,input[type=file]';
const labelOf = (el) => (el.dataset.action ? 'data-action=' + el.dataset.action : el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')) +
  (el.textContent ? ' "' + el.textContent.trim().slice(0, 28) + '"' : '');

async function audit(runName, setup, scopeSelector) {
  await setup(); await sleep(30);
  const count = $$(SEL, w.document).filter((el) => !el.disabled).length;
  for (let i = 0; i < count; i++) {
    // fresh render every iteration: the previous click may have replaced the DOM
    UI.closeModal(); w.__printed = w.__printed || 0;
    await setup(); await sleep(15);
    const el = $$(SEL, w.document).filter((x) => !x.disabled)[i];
    if (!el) break;
    const label = labelOf(el);
    const dbe = w.document.body.innerHTML.length;
    const before = snap();
    try {
      click(el);
      await sleep(15);
      // some flows are async (payment 900ms, file reads); give them a second pass
      if (snap() === before) await sleep(120);
      if (snap() === before && w.document.body.innerHTML.length === dbe) dead.push('[' + runName + '] ' + label);
    } catch (e) { problems.push('[' + runName + '] ' + label + ' -> ' + e.message); }
  }
}

(async () => {
  for (const r of ROUTES) await audit(r, async () => { ensureSession(); w.location.hash = r; UI.render(true); });
  console.log('\n=== controls with no observable effect (' + dead.length + ') ===');
  dead.forEach((d) => console.log(' - ' + d));
  console.log('\n=== runtime problems (' + problems.length + ') ===');
  problems.forEach((d) => console.log(' - ' + d));
  console.log('\n=== uncaught window errors (' + errors.length + ') ===');
  errors.forEach((d) => console.log(' - ' + d.split('\n')[0]));
  process.exit(0);
})();
