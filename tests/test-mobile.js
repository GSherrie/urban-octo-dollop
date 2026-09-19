const MOBILE = (() => { const p = require('path'), f = require('fs'); return [p.join(__dirname,'SherPay-mobile.html'), p.join(__dirname,'..','SherPay-mobile.html'), p.join(__dirname,'..','builds','SherPay-mobile.html')].find((x) => f.existsSync(x)); })();
/* Verifies the single-file mobile build boots and renders in a real DOM (jsdom) */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(MOBILE, 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
vc.on('error', (m) => errors.push('console.error: ' + m));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://sherpay.local/', virtualConsole: vc });
const w = dom.window;

setTimeout(() => {
  let fail = 0;
  const check = (n, c) => { console.log((c ? '  ok  ' : (fail++, '  FAIL ')) + n); };
  check('Store booted with seed data', !!w.Store && w.Store.db.invoices.length > 0);
  // auth gate: create + sign in, then re-render the shell
  const su = w.Store.Auth.signup({ name: 'Mobile QA', email: 'mobile@sherpay.app', password: 'password123' });
  check('signup works in single-file build', !!su.user);
  w.UI.render();
  check('dashboard rendered', (w.document.querySelector('#view').innerHTML || '').length > 500);
  check('logo embedded as data URI (no external refs)', !/src="assets\//.test(w.document.querySelector('#app').innerHTML) && w.document.querySelector('#app').innerHTML.includes('data:image/png;base64,'));
  w.location.hash = '#/invoices'; w.UI.render();
  check('invoices list renders', w.document.querySelectorAll('#inv-table tbody tr').length > 0);
  w.location.hash = '#/invoices/new'; w.UI.render();
  check('editor renders', !!w.document.querySelector('#ed-items'));
  check('no runtime errors', errors.length === 0);
  if (errors.length) errors.forEach((e) => console.log('   ' + e));
  console.log(fail ? 'MOBILE BUILD FAIL' : 'MOBILE BUILD OK — ' + (fs.statSync(MOBILE).size / 1024).toFixed(0) + ' KB single file');
  process.exit(fail ? 1 : 0);
}, 400);
