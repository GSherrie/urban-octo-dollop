#!/usr/bin/env node
/* Zero-dependency dev server with live reload.
   Serves the web app from the folder above this script and auto-refreshes
   browsers when any file changes. Usage: node scripts/dev-server.js [port] */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8000);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.map': 'application/json'
};
const SNIPPET = '<script>(function(){try{var s=new EventSource("/__livereload");s.onmessage=function(){location.reload();};}catch(e){}})();</script>';

/* ---- change watcher (mtime polling: works on every OS) ---- */
let clients = [];
function signature() {
  let s = '';
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.vercel' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else s += p + ':' + fs.statSync(p).mtimeMs + ';';
    }
  };
  walk(ROOT);
  return s;
}
let last = signature();
setInterval(() => {
  const sig = signature();
  if (sig !== last) {
    last = sig;
    clients.forEach((res) => { try { res.write('data: reload\n\n'); } catch (e) {} });
  }
}, 700);

/* ---- server ---- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__livereload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
    res.write('data: connected\n\n');
    clients.push(res);
    req.on('close', () => { clients = clients.filter((c) => c !== res); });
    return;
  }
  let file = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) full = path.join(full, 'index.html');
  if (!fs.existsSync(full)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 ' + file); return; }
  const ext = path.extname(full).toLowerCase();
  let body = fs.readFileSync(full);
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
  if (ext === '.html') {
    let html = body.toString('utf8');
    html = html.includes('</body>') ? html.replace('</body>', SNIPPET + '</body>') : html + SNIPPET;
    body = Buffer.from(html, 'utf8');
  }
  res.writeHead(200, headers);
  res.end(body);
});
server.listen(PORT, '0.0.0.0', () => {
  console.log('SherPay dev server (live reload) → http://localhost:' + PORT);
});
