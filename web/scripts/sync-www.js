/* Copies the deployable web app (no sources/docs) into a target dir.
   Usage: node scripts/sync-www.js <target-dir>   e.g. ../sherpay-ios/www or ../dist */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const target = path.resolve(process.argv[2] || path.join(root, '..', 'dist'));

const FILES = ['index.html', 'styles.css', 'manifest.json', 'sw.js', 'pay.html', 'auth.html'];
const DIRS = ['js', 'assets'];

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(target, f));
for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(target, d), { recursive: true });
// single-file offline build rides along as a bonus download
fs.copyFileSync(path.join(root, '..', 'SherPay-mobile.html'), path.join(target, 'SherPay-mobile.html'));

const n = fs.readdirSync(target).length;
console.log('synced ' + n + ' entries ->', target);
