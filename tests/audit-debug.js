/* debug: does a nav click change the hash in this harness? */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const WEB = path.join(__dirname, '..', 'web');
const html = fs.readFileSync(WEB + '/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { url: 'http://localhost:8000/', pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
// jsdom lacks these download/attachment APIs; stub them so export/attachment clicks don't throw
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
for (const f of ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-account.js'])
  w.eval(fs.readFileSync(WEB + '/' + f, 'utf8'));
const S = w.Store, UI = w.UI;
S.boot();
if (!S.Auth.current()) S.Auth.signup({ name: 'Audit', email: 'audit@sherpay.app', password: 'password123' });
UI.start();
w.location.hash = '#/i/i4'; UI.render(true);
console.log('hash before:', w.location.hash, 'views len', w.document.getElementById('view').innerHTML.length);
const btn = w.document.querySelector('[data-action="nav"][data-route="expenses"]');
console.log('button found:', !!btn);
btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
console.log('hash after:', w.location.hash);
setTimeout(() => { console.log('hash later:', w.location.hash, 'view len', w.document.getElementById('view').innerHTML.length); }, 50);
