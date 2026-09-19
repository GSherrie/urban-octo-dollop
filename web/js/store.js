/* ============ SherPay store: persistence, seed, money & date utils, automations ============ */
window.Store = (function () {
  const DB_KEY = 'sherpay_db_v1';
  const USERS_KEY = 'sherpay_users_v1';
  const SESSION_KEY = 'sherpay_session_v1';

  const CURRENCIES = ['GHS','USD','EUR','GBP','NGN','KES','ZAR','CAD','AUD','INR','AED','JPY'];
  const CATEGORIES = ['Travel','Meals','Software','Office','Marketing','Equipment','Professional Fees','Other'];
  const PAY_METHODS = [
    { id:'card',    label:'Credit / Debit Card', note:'via Stripe', color:'#0B7CFF', tag:'CARD' },
    { id:'paypal',  label:'PayPal',              note:'paypal.com', color:'#0070BA', tag:'PP' },
    { id:'apple',   label:'Apple Pay',           note:'Touch / Face ID', color:'#111', tag:'Pay' },
    { id:'momo',    label:'Mobile Money',        note:'MTN · Vodafone · AirtelTigo', color:'#F5A524', tag:'MoMo' },
    { id:'bank',    label:'Bank Transfer',       note:'Manual reconciliation', color:'#0A2E5F', tag:'BNK' }
  ];

  /* ---------------- utils ---------------- */
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const pad = (n, w) => String(n).padStart(w || 3, '0');
  const iso = (d) => d.toISOString().slice(0, 10);
  const todayISO = () => iso(new Date());
  const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const addMonths = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setMonth(d.getMonth() + n); return iso(d); };
  const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const fmtDateTime = (ts) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const monthKey = (dateStr) => dateStr.slice(0, 7);
  const monthLabel = (key) => new Date(key + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short' });
  function fmtMoney(amount, currency) {
    try {
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount);
    } catch (e) { return (currency || '') + ' ' + num(amount).toFixed(2); }
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  /* ---------------- state ---------------- */
  let db = null;

  let saveWarned = false;
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) {
      if (!saveWarned && typeof window !== 'undefined' && window.UI && window.UI.toast) {
        saveWarned = true;
        window.UI.toast('Device storage is full — recent changes are memory-only until space is freed. Delete old receipt attachments to fix.', 'red', 'file');
      }
    }
  }
  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) { db = JSON.parse(raw); return true; }
    } catch (e) {}
    return false;
  }

  /* ---------------- seed ---------------- */
  function seed() {
    const T = todayISO();
    const biz = {
      name: 'Sherline Studio',
      email: 'billing@sherline.studio',
      phone: '+233 30 274 8890',
      address: '14 Ring Road East\nAccra, Greater Accra\nGhana',
      logoDataUrl: null
    };
    const clients = [
      { id:'c1', name:'Accra Craft Markets Ltd', contact:'Ama Owusu', email:'ama@accracraft.gh', phone:'+233 24 555 0110', address:'Oxford Street, Osu\nAccra, Ghana', terms:14 },
      { id:'c2', name:'TechHub East London', contact:'James Whitfield', email:'accounts@techhub.co.uk', phone:'+44 20 7946 0810', address:'42 Shoreditch High St\nLondon E1 6JJ, UK', terms:30 },
      { id:'c3', name:'Volta Foods PLC', contact:'Kofi Mensah', email:'k.mensah@voltafoods.com', phone:'+233 20 555 7741', address:'Industrial Area\nTema, Ghana', terms:30 },
      { id:'c4', name:'Mensah & Co. Legal', contact:'Efua Mensah', email:'efua@mensahco.gh', phone:'+233 27 555 3322', address:'High Street\nCape Coast, Ghana', terms:7 }
    ];
    const inv = (n, clientId, issue, due, status, items, opts) => Object.assign({
      id: 'i' + n, number: 'INV-2026-' + pad(n), clientId, issueDate: issue, dueDate: due,
      currency: 'GHS', items, taxMode: 'percent', taxValue: 15, discountMode: 'none', discountValue: 0,
      status, payments: [], notes: 'Payment due within terms. Thank you for your business.', recurring: null,
      sentAt: null, viewedAt: null, paidAt: null, createdAt: Date.now()
    }, opts || {});

    const invoices = [
      inv(1, 'c2', addDays(T, -152), addDays(T, -122), 'paid',
        [{ desc:'Brand identity design — phase 1', qty:1, price:9500 }, { desc:'Design workshops (remote)', qty:3, price:800 }],
        { currency:'USD', payments:[{ id:'p1', date:addDays(T, -128), amount:11900, method:'bank' }], paidAt:addDays(T, -128), sentAt:addDays(T, -152) }),
      inv(2, 'c1', addDays(T, -96), addDays(T, -82), 'paid',
        [{ desc:'Marketplace app UI design', qty:24, price:420 }, { desc:'Prototype handoff', qty:1, price:1500 }],
        { payments:[{ id:'p2', date:addDays(T, -88), amount:6000, method:'momo' }, { id:'p3', date:addDays(T, -84), amount:5610, method:'card' }], paidAt:addDays(T, -84), sentAt:addDays(T, -96) }),
      inv(3, 'c3', addDays(T, -64), addDays(T, -34), 'paid',
        [{ desc:'Packaging design system', qty:1, price:14000 }, { desc:'Print production liaison', qty:6, price:650 }],
        { discountMode:'percent', discountValue:5, payments:[{ id:'p4', date:addDays(T, -40), amount:20413.5, method:'bank' }], paidAt:addDays(T, -40), sentAt:addDays(T, -64) }),
      inv(4, 'c2', addDays(T, -33), addDays(T, -3), 'viewed',
        [{ desc:'Brand identity design — phase 2', qty:1, price:8200 }, { desc:'Social media kit', qty:1, price:1200 }],
        { currency:'USD', sentAt:addDays(T, -33), viewedAt:addDays(T, -30) }),
      inv(5, 'c1', addDays(T, -18), addDays(T, -4), 'sent',
        [{ desc:'Pop-up stall signage set', qty:8, price:780 }, { desc:'Installation supervision', qty:2, price:900 }],
        { sentAt:addDays(T, -18) }),
      inv(6, 'c4', addDays(T, -9), addDays(T, +5), 'sent',
        [{ desc:'Legal-tech portal UX audit', qty:1, price:6400 }, { desc:'Usability testing sessions', qty:4, price:550 }],
        { payments:[{ id:'p5', date:addDays(T, -6), amount:4000, method:'card' }], sentAt:addDays(T, -9) }),
      inv(7, 'c3', T, addDays(T, 21), 'draft',
        [{ desc:'Annual report layout', qty:1, price:9800 }, { desc:'Photography art direction', qty:2, price:1400 }], {})
    ];
    const expenses = [
      { id:'e1', date:addDays(T, -71), merchant:'Uber Business', category:'Travel', tax:34.8, total:266.8, notes:'Client site visit, Tema' },
      { id:'e2', date:addDays(T, -58), merchant:'Figma', category:'Software', tax:4.5, total:34.5, notes:'Professional plan, monthly' },
      { id:'e3', date:addDays(T, -44), merchant:'Koala Restaurant', category:'Meals', tax:18.9, total:144.9, notes:'Client lunch — Volta Foods' },
      { id:'e4', date:addDays(T, -29), merchant:'Office Depot Accra', category:'Office', tax:26.1, total:200.1, notes:'Paper, toner, stationery' },
      { id:'e5', date:addDays(T, -15), merchant:'Google Ads', category:'Marketing', tax:52.2, total:400.2, notes:'Search campaign — August' },
      { id:'e6', date:addDays(T, -6), merchant:'Adobe Creative Cloud', category:'Software', tax:11.9, total:91.9, notes:'Annual renewal instalment' },
      { id:'e7', date:addDays(T, -2), merchant:'Bolt', category:'Travel', tax:12.0, total:92.0, notes:'Airport run — client pickup' }
    ];
    db = {
      version: 1,
      settings: {
        business: biz,
        currency: 'GHS',
        taxLabel: 'VAT', taxRate: 15,
        prefix: 'INV', seq: 8,
        template: { accent: 'blue', font: 'sans' },
        reminderDays: [3, 0, -3],
        hourlyRate: 450
      },
      clients, invoices, expenses,
      timeEntries: [],
      activity: [
        { id: uid(), ts: Date.now() - 86400000 * 6, type: 'paid', message: 'Invoice INV-2026-003 paid by Volta Foods PLC (Bank Transfer)' },
        { id: uid(), ts: Date.now() - 86400000 * 6 + 3600000, type: 'receipt', message: 'Receipt RCP-2026-003 generated and emailed to Volta Foods PLC' },
        { id: uid(), ts: Date.now() - 86400000 * 3, type: 'viewed', message: 'INV-2026-004 was viewed by TechHub East London' },
        { id: uid(), ts: Date.now() - 3600000 * 5, type: 'sent', message: 'INV-2026-007 drafted for Volta Foods PLC' }
      ]
    };
    save();
  }

  /* ---------------- selectors & calc ---------------- */
  const getClient = (id) => (db.clients.find((c) => c.id === id) || null);
  const getInvoice = (id) => (db.invoices.find((i) => i.id === id) || null);

  function computeTotals(inv) {
    const sub = (inv.items || []).reduce((s, it) => s + num(it.qty) * num(it.price), 0);
    const disc = inv.discountMode === 'percent' ? sub * num(inv.discountValue) / 100
      : inv.discountMode === 'flat' ? Math.min(num(inv.discountValue), sub) : 0;
    const base = sub - disc;
    const tax = inv.taxMode === 'percent' ? base * num(inv.taxValue) / 100
      : inv.taxMode === 'flat' ? num(inv.taxValue) : 0;
    const total = base + tax;
    const paid = (inv.payments || []).reduce((s, p) => s + num(p.amount), 0);
    return { sub, disc, tax, total, paid, balance: Math.max(0, +(total - paid).toFixed(2)) };
  }

  function displayStatus(inv) {
    const t = computeTotals(inv);
    if (inv.status === 'paid') return 'paid';
    if (t.paid > 0) return 'partial';
    if ((inv.status === 'sent' || inv.status === 'viewed') && inv.dueDate && daysBetween(todayISO(), inv.dueDate) < 0) return 'overdue';
    return inv.status;
  }
  const STATUS_LABEL = { draft:'Draft', sent:'Sent', viewed:'Viewed', paid:'Paid', overdue:'Overdue', partial:'Partially paid' };

  function newInvoiceNumber(issueDate) {
    const n = db.settings.seq++;
    const y = new Date((issueDate || todayISO()) + 'T00:00:00').getFullYear();
    return db.settings.prefix + '-' + y + '-' + pad(n);
  }

  function log(type, message) {
    db.activity.unshift({ id: uid(), ts: Date.now(), type, message });
    if (db.activity.length > 120) db.activity.length = 120;
  }

  /* ---------------- automations: reminders + recurring ---------------- */
  function runAutomations(silent) {
    let fired = 0;
    const offsets = (db.settings.reminderDays || []);
    db.invoices.forEach((inv) => {
      const st = displayStatus(inv);
      if ((st === 'sent' || st === 'viewed' || st === 'overdue' || st === 'partial') && inv.dueDate) {
        const daysToDue = daysBetween(todayISO(), inv.dueDate);
        offsets.forEach((off) => {
          // dedupe on the invoice itself (survives the 120-entry activity cap)
          // plus the activity log (covers data created before inv.reminded existed)
          if (daysToDue === off && !(inv.reminded || []).includes(off) && !db.activity.some((a) => a.type === 'reminder' && a.ref === inv.id && a.off === off)) {
            inv.reminded = (inv.reminded || []).concat(off);
            const c = getClient(inv.clientId);
            db.activity.unshift({
              id: uid(), ts: Date.now(), type: 'reminder', ref: inv.id, off,
              message: 'Payment reminder emailed to ' + (c ? c.name : 'client') + ' for ' + inv.number +
                (off > 0 ? ' (' + off + ' days before due)' : off === 0 ? ' (due today)' : ' (' + Math.abs(off) + ' days overdue)')
            });
            fired++;
          }
        });
      }
      // recurring invoicing
      if (inv.recurring && inv.recurringNext && inv.recurringNext <= todayISO()) {
        const copy = JSON.parse(JSON.stringify(inv));
        copy.id = uid(); copy.number = newInvoiceNumber(todayISO());
        copy.issueDate = todayISO(); copy.dueDate = addDays(todayISO(), (getClient(inv.clientId) || { terms: 30 }).terms || 30);
        copy.status = 'sent'; copy.sentAt = todayISO(); copy.viewedAt = null; copy.paidAt = null; copy.payments = [];
        copy.reminded = []; // fresh invoice — must not inherit the original's reminder history
        copy.recurringNext = addMonths(inv.recurringNext, 1);
        inv.recurringNext = copy.recurringNext;
        db.invoices.unshift(copy);
        log('recurring', 'Recurring invoice ' + copy.number + ' auto-generated from ' + inv.number);
        fired++;
      }
    });
    if (fired && !silent) save();
    return fired;
  }

  /* ---------------- mutations ---------------- */
  function recordPayment(invId, amount, method, date) {
    const inv = getInvoice(invId); if (!inv) return null;
    const t = computeTotals(inv);
    const amt = Math.min(num(amount), t.balance);
    if (amt <= 0) return null;
    inv.payments.push({ id: uid(), date: date || todayISO(), amount: +amt.toFixed(2), method });
    const after = computeTotals(inv);
    if (after.balance <= 0.009) { inv.status = 'paid'; inv.paidAt = todayISO(); }
    const m = PAY_METHODS.find((p) => p.id === method);
    log('paid', fmtMoney(amt, inv.currency) + ' received for ' + inv.number + ' (' + (m ? m.label : method) + ')');
    let receipt = null;
    if (inv.status === 'paid') {
      receipt = receiptNumber(inv);
      const c = getClient(inv.clientId);
      log('receipt', 'Receipt ' + receipt + ' generated and emailed to ' + (c ? c.name : 'client'));
    }
    save();
    return { receipt, balance: after.balance };
  }
  const receiptNumber = (inv) => 'RCP-' + inv.number.split('-').slice(1).join('-');

  function markSent(invId, channel) {
    const inv = getInvoice(invId); if (!inv) return;
    if (inv.status === 'draft') inv.status = 'sent';
    inv.sentAt = todayISO();
    const c = getClient(inv.clientId);
    log('sent', inv.number + ' sent to ' + (c ? c.name : 'client') + ' via ' + channel);
    save();
  }
  function markViewed(invId) {
    const inv = getInvoice(invId); if (!inv) return;
    if (inv.status === 'sent') {
      inv.status = 'viewed'; inv.viewedAt = todayISO();
      const c = getClient(inv.clientId);
      log('viewed', inv.number + ' was viewed by ' + (c ? c.name : 'client'));
      save();
    }
  }

  /* ---------------- reports ---------------- */
  function lastMonths(n) {
    const out = []; const d = new Date(); d.setDate(1);
    for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(x.getMonth() - i); out.push(iso(x).slice(0, 7)); }
    return out;
  }
  function moneyByMonth() {
    const months = lastMonths(6);
    const rev = {}, exp = {};
    months.forEach((m) => { rev[m] = 0; exp[m] = 0; });
    db.invoices.forEach((inv) => (inv.payments || []).forEach((p) => {
      const m = monthKey(p.date); if (rev[m] !== undefined) rev[m] += num(p.amount);
    }));
    db.expenses.forEach((e) => { const m = monthKey(e.date); if (exp[m] !== undefined) exp[m] += num(e.total); });
    return { months, rev, exp };
  }
  function kpis() {
    const m = monthKey(todayISO());
    let outstanding = 0, paidMonth = 0, expMonth = 0, overdueCount = 0;
    db.invoices.forEach((inv) => {
      const t = computeTotals(inv); const st = displayStatus(inv);
      if (st !== 'paid' && st !== 'draft') outstanding += t.balance;
      if (st === 'overdue') overdueCount++;
      (inv.payments || []).forEach((p) => { if (monthKey(p.date) === m) paidMonth += num(p.amount); });
    });
    db.expenses.forEach((e) => { if (monthKey(e.date) === m) expMonth += num(e.total); });
    return { outstanding, paidMonth, expMonth, net: paidMonth - expMonth, overdueCount };
  }

  /* ---------------- auth: offline-first accounts ----------------
     Accounts live in localStorage, separate from the business db.
     Passwords are salted + SHA-256 hashed (pure-JS implementation so
     it also works on file:// where SubtleCrypto is unavailable).
     Sessions go to localStorage ("Remember me") or sessionStorage. */
  function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    // manual UTF-8 encoding (no reliance on unescape/TextEncoder — works everywhere)
    const s = String(str);
    const bytes = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        const c2 = s.charCodeAt(++i);
        c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
        bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
      else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    const w = new Array(64);
    for (let off = 0; off < bytes.length; off += 64) {
      for (let t = 0; t < 16; t++) w[t] = ((bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3]) | 0;
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; }
  }
  function saveUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); return true; }
    catch (e) { return false; }
  }
  function validatePassword(pw) {
    pw = String(pw || '');
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (pw.length > 128) return 'Password is too long (max 128 characters).';
    return null;
  }
  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

  function startSession(user, remember) {
    const sess = { userId: user.id, name: user.name, email: user.email, ts: Date.now() };
    try {
      if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
      } else {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {}
  }

  function signup(opts) {
    const name = String(opts && opts.name || '').trim();
    const email = String(opts && opts.email || '').trim().toLowerCase();
    const password = String(opts && opts.password || '');
    if (!name) return { error: 'Please enter your name.' };
    if (name.length > 80) return { error: 'Name is too long (max 80 characters).' };
    if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' };
    const pwErr = validatePassword(password);
    if (pwErr) return { error: pwErr };
    const users = getUsers();
    if (users.some((u) => u.email === email)) return { error: 'An account with this email already exists — try logging in.' };
    const salt = uid();
    const user = { id: uid(), name, email, salt, passHash: sha256(salt + ':' + password), createdAt: Date.now() };
    users.push(user);
    if (!saveUsers(users)) return { error: 'Device storage is unavailable — cannot create an account here.' };
    startSession(user, true);
    return { user: publicUser(user) };
  }

  function login(opts) {
    const email = String(opts && opts.email || '').trim().toLowerCase();
    const password = String(opts && opts.password || '');
    if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' };
    const user = getUsers().find((u) => u.email === email);
    if (!user) return { error: 'No account found with that email — try signing up instead.' };
    if (user.passHash !== sha256(user.salt + ':' + password)) return { error: 'Incorrect password. Please try again.' };
    startSession(user, !!(opts && opts.remember));
    return { user: publicUser(user) };
  }

    function current() {
    try {
      const raw = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) || localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      const user = getUsers().find((u) => u.id === sess.userId);
      if (!user) return null;
      const pub = publicUser(user);
      pub.loginAt = sess.ts;
      return pub;
    } catch (e) { return null; }
  }

  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function changePassword(opts) {
    const cur = current();
    if (!cur) return { error: 'Not authenticated.' };
    const users = getUsers();
    const user = users.find((u) => u.id === cur.id);
    if (!user) return { error: 'Account not found.' };
    if (user.passHash !== sha256(user.salt + ':' + String(opts && opts.currentPassword || ''))) return { error: 'Current password is incorrect.' };
    const pwErr = validatePassword(opts && opts.newPassword);
    if (pwErr) return { error: pwErr };
    user.salt = uid();
    user.passHash = sha256(user.salt + ':' + opts.newPassword);
    user.changedAt = Date.now();
    if (!saveUsers(users)) return { error: 'Device storage is unavailable — cannot update your password.' };
    log('security', 'Password changed');
    return { user: publicUser(user) };
  }


  /* ---------------- export helpers ---------------- */
  function toCSV(rows) {
    return rows.map((r) => r.map((c) => {
      const s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
  }
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  function boot() {
    if (!load()) seed();
    runAutomations(true);
    save();
  }
  function resetDemo() { seed(); }

  return {
    get db() { return db; },
    set db(v) { db = v; },
    save, boot, resetDemo, seed,
        Auth: { signup, login, logout, current, changePassword, count: () => getUsers().length, list: () => getUsers().map(publicUser), __sha256: sha256 },
    CURRENCIES, CATEGORIES, PAY_METHODS, STATUS_LABEL,
    uid, num, pad, iso, todayISO, addDays, addMonths, daysBetween, fmtDate, fmtDateTime, monthKey, monthLabel, fmtMoney, esc,
    getClient, getInvoice, computeTotals, displayStatus, newInvoiceNumber, log,
    runAutomations, recordPayment, markSent, markViewed, receiptNumber,
    lastMonths, moneyByMonth, kpis, toCSV, download
  };
})();
