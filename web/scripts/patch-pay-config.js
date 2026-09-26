/* Patches web/pay.html + web/js/pay.js with public Supabase credentials.
   Reads .env.payments in the project root (KEY=VALUE lines):
     SUPABASE_URL=https://xxx.supabase.co
     SUPABASE_ANON_KEY=eyJ...
   Public values only — the Paystack SECRET key never touches the browser:
   it lives solely in the pay-verify edge function's secrets.
   Usage: node scripts/patch-pay-config.js */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');

function readEnv() {
  const out = {};
  const f = path.join(root, '.env.payments');
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const env = readEnv();
const URL_ = env.SUPABASE_URL || '';
const KEY = env.SUPABASE_ANON_KEY || '';
if (!URL_ || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY in .env.payments — pay.html left unpatched.');
  process.exit(1);
}

for (const rel of ['pay.html', 'js/pay.js']) {
  const f = path.join(__dirname, '..', rel);
  let src = fs.readFileSync(f, 'utf8');
  src = src.replace(/__SUPABASE_URL__/g, URL_).replace(/__SUPABASE_ANON_KEY__/g, KEY);
  fs.writeFileSync(f, src);
  console.log('patched', rel);
}
console.log('pay config injected ✓');
