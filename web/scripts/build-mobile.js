/* Builds SherPay-mobile.html: the whole app (CSS + JS + logo) inlined into one offline file.
   Usage: node scripts/build-mobile.js  ->  ../SherPay-mobile.html */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const jsFiles = ['js/store.js', 'js/ui.js', 'js/views-auth.js', 'js/views-main.js', 'js/views-editor.js', 'js/views-ops.js', 'js/views-biz.js', 'js/views-account.js'];
const js = jsFiles.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n');
const logoB64 = fs.readFileSync(path.join(root, 'assets/icon-512.png')).toString('base64');
const LOGO = 'data:image/png;base64,' + logoB64;

for (const [src, file] of jsFiles.entries()) {
  if (/<\/script/i.test(js)) throw new Error('JS contains </script — needs escaping');
}
if (/<\/style/i.test(css)) throw new Error('CSS contains </style');

// 1) inline stylesheet
html = html.replace(/<link rel="stylesheet" href="styles\.css(\?v=\d+)?">/, '<style>\n' + css + '\n</style>');
// 2) inline app scripts (keep order), drop the src tags
html = html.replace(/<script src="js\/[a-z-]+\.js(\?v=\d+)?"><\/script>\n?/g, '');
html = html.replace('<script>\n  window.addEventListener(\'DOMContentLoaded\'', () => '<script>\n' + js + '\n;\nwindow.addEventListener(\'DOMContentLoaded\'');
// 3) drop PWA-only bits that are meaningless in a local file (manifest + icon links;
//    the SW registration stays but harmlessly rejects on file:// and is caught)
html = html.replace('<link rel="manifest" href="manifest.json">\n', '');
html = html.replace(/<link rel="icon"[^>]*>\n/, '');
html = html.replace(/<link rel="apple-touch-icon"[^>]*>\n/, '');
// 4) embed the logo everywhere it is referenced
html = html.split('assets/logo.png').join(LOGO);

const out = path.join(root, '..', 'SherPay-mobile.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
