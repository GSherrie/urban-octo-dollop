/* ============ SherPay views: Account / Profile (identity, security, preferences, data, support) ============ */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;
  const cur = () => S.db.settings.currency || 'GHS';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const VERSION = '2.4.1';
  /* Build tag = the deployed asset version (`?v=N` in index.html). Shown in About so you can tell
     at a glance whether this device is running the newest build, next to a one-tap force refresh. */
  const BUILD = (function () {
    try {
      const meta = document.querySelector('meta[name="sherpay-build"]');
      if (meta && meta.content) return meta.content;
      const tag = document.querySelector('script[src*="store.js"]');
      const m = tag && tag.src.match(/[?&]v=(\d+)/);
      if (m) return 'v' + m[1];
    } catch (e) {}
    return 'offline';
  })();

  /* settings sub-objects are lazy — older saved dbs may not have them */
  function st() {
    const s = S.db.settings;
    if (!s.profile) s.profile = {};
    if (!s.notifications) s.notifications = {};
    if (!s.preferences) s.preferences = {};
    if (!s.paymentMethods) s.paymentMethods = [];
    if (!s.savingsGoals) s.savingsGoals = [];
    return s;
  }
  const prof = () => st().profile;
  const prefs = () => st().preferences;
  function notif(key, dflt) { const n = st().notifications; return n[key] === undefined ? dflt : n[key]; }
  function money(v) { return S.fmtMoney(v, cur()); }

  const SYMBOLS = { GHS: '₵', USD: '$', EUR: '€', GBP: '£', NGN: '₦', KES: 'KSh', ZAR: 'R', CAD: 'C$', AUD: 'A$', INR: '₹', AED: 'AED', JPY: '¥' };

  /* one settings-list row: icon + title/sub + trailing control */
  function row(ic, title, sub, ctl) {
    return '<div class="row"><div class="srow">' + icon(ic) + '<div><b>' + title + '</b><div class="tiny muted">' + sub + '</div></div></div>' + (ctl || '') + '</div>';
  }
  function toggleChip(key) {
    const on = notif(key, key !== 'mkt');
    return '<span class="chip toggle' + (on ? ' on' : '') + '" data-toggle="' + key + '" role="switch" aria-checked="' + !!on + '">' + (on ? 'On' : 'Off') + '</span>';
  }
  function themeChip(t, label) {
    const active = (prefs().theme || 'system') === t;
    return '<button class="theme-chip' + (active ? ' active' : '') + '" data-theme="' + t + '">' + label + '</button>';
  }
  /* ================= 1 · PROFILE ================= */
  function profileSection() {
    const u = S.Auth.current(), p = prof();
    const name = p.name || u.name, email = p.email || u.email;
    return {
      title: 'Profile',
      html:
        '<div class="acct-head">' + UI.avatar(name) +
          '<div class="acct-meta"><b>' + esc(name) + '</b><span>' + esc(email) + '</span></div>' +
          '<span class="badge plan">' + (p.phone ? 'Verified' : 'Standard') + '</span>' +
        '</div>' +
        '<div class="card card-b">' +
          '<div class="row small mb"><span class="muted" style="flex:1">Full name</span><b>' + esc(name) + '</b></div>' +
          '<div class="row small mb"><span class="muted" style="flex:1">Email address</span><b>' + esc(email) + '</b></div>' +
          '<div class="row small mb"><span class="muted" style="flex:1">Phone number</span><b>' + (p.phone ? esc(p.phone) : '<span class="muted">Not set</span>') + '</b></div>' +
          (p.bio ? '<div class="row small mb"><span class="muted" style="flex:1">About</span><span class="small">' + esc(p.bio) + '</span></div>' : '') +
          '<div class="row small mb"><span class="muted" style="flex:1">Account / member ID</span><code class="mono small">SHR-' + esc(String(u.id).toUpperCase()) + '</code></div>' +
          '<button class="btn sm primary mt w100" data-action="edit-profile">' + icon('edit') + ' Edit profile</button>' +
        '</div>'
    };
  }

  /* ================= 2 · FINANCIAL ACCOUNT ================= */
  function financialSection() {
    const paidInvs = S.db.invoices.filter((i) => S.displayStatus(i) === 'paid');
    const totIn = paidInvs.reduce((s, i) => s + S.computeTotals(i).paid, 0);
    const totExp = S.db.expenses.reduce((s, e) => s + S.num(e.total), 0);
    const balance = totIn - totExp;
    const k = S.kpis();
    const methods = st().paymentMethods;

    const pays = [];
    S.db.invoices.forEach((i) => (i.payments || []).forEach((p) => pays.push({ inv: i, p: p })));
    pays.sort((a, b) => (a.p.date < b.p.date ? 1 : -1));
    const payRows = pays.slice(0, 6).map((x) => {
      const m = S.PAY_METHODS.find((y) => y.id === x.p.method);
      return '<tr><td>' + esc(x.inv.number) + '</td><td>' + S.fmtDate(x.p.date) + '</td><td class="right tnum">' + S.fmtMoney(x.p.amount, x.inv.currency) + '</td><td>' + esc(m ? m.label : '—') + '</td></tr>';
    }).join('');

    return {
      title: 'Financial account',
      html:
        '<div class="grid kpis" style="grid-template-columns:repeat(3,1fr)">' +
          '<div class="card kpi accent-green"><div class="lab">' + icon('wallet') + ' Current balance</div><div class="val">' + money(balance) + '</div><div class="delta">income − expenses</div></div>' +
          '<div class="card kpi accent-blue"><div class="lab">' + icon('check') + ' Total income</div><div class="val">' + money(totIn) + '</div><div class="delta">' + paidInvs.length + ' paid invoices</div></div>' +
          '<div class="card kpi accent-red"><div class="lab">' + icon('expenses') + ' Total expenses</div><div class="val">' + money(totExp) + '</div><div class="delta">' + S.db.expenses.length + ' receipts</div></div>' +
        '</div>' +
        '<div class="card mt2"><div class="card-h"><h3>Linked bank / mobile-money accounts</h3></div><div class="card-b">' +
          (methods.length ? methods.map((m) => {
            const pm = S.PAY_METHODS.find((y) => y.id === m.id);
            return '<div class="row small mb"><span class="muted" style="flex:1">' + esc(m.label || (pm ? pm.label : m.id)) + '</span><span class="chip" style="border:none;background:var(--green-soft);color:var(--green-dark)">Linked</span></div>';
          }).join('') : '<div class="empty" style="padding:14px">' + icon('link') + ' <b>No accounts linked yet</b></div>') +
        '</div></div>' +
        '<div class="card mt2"><div class="card-h"><h3>Payment methods</h3></div><div class="card-b">' +
          S.PAY_METHODS.map((m) => {
            const active = methods.some((x) => x.id === m.id);
            return '<div class="row small mb"><span class="muted" style="flex:1">' + esc(m.label) + '</span><span class="chip" style="border:none;background:' + (active ? 'var(--green-soft);color:var(--green-dark)' : 'var(--line);color:var(--muted)') + '">' + (active ? 'Active' : 'Not linked') + '</span></div>';
          }).join('') +
        '</div></div>' +
        '<div class="card mt2"><div class="card-h"><h3>Transaction history</h3></div><div class="card-b">' +
          (pays.length ?
            '<div class="scroll-x"><table class="table"><thead><tr><th>Invoice</th><th>Date</th><th class="right">Amount</th><th>Method</th></tr></thead><tbody>' + payRows + '</tbody></table></div>' +
            '<div class="tiny muted mt">Outstanding right now: <b class="tnum">' + money(k.outstanding) + '</b></div>'
            : '<div class="empty">' + icon('wallet') + ' <b>No payment history</b><br>Start sending invoices to see activity.</div>') +
        '</div></div>' +
        '<button class="btn sm ghost mt w100" data-action="export-csv">' + icon('download') + ' Export all transactions (CSV)</button>'
    };
  }
  /* ================= 3 · SECURITY ================= */
  function securitySection() {
    const twoFA = !!prefs().twoFA;
    return {
      title: 'Security',
      html:
        '<div class="card card-b settings-list">' +
          row('lock', 'Change password / PIN', 'Update your login credentials', '<button class="btn sm primary" data-action="change-pw">Update</button>') +
          row('eye', 'Face ID / Touch ID', 'Biometric unlock on supported devices', '<span class="chip" style="border:none;background:var(--green-soft);color:var(--green-dark)">Enabled</span>') +
          row('bell', 'Two-factor authentication', twoFA ? '2FA is protecting your logins' : 'Add an extra layer of security', '<span class="chip" style="border:none;background:' + (twoFA ? 'var(--green-soft);color:var(--green-dark)' : 'var(--line);color:var(--muted)') + '">' + (twoFA ? 'On' : 'Off') + '</span><button class="btn sm ghost" data-action="twofa">' + (twoFA ? 'Manage' : 'Set up') + '</button>') +
          row('sync', 'Login / session management', 'Devices currently signed in', '<button class="btn sm ghost" data-action="sessions">Manage</button>') +
          row('mail', 'Change phone / email', 'Update your contact details', '<button class="btn sm ghost" data-action="change-contact">Change</button>') +
          row('alert', 'Security notifications', 'Alerts for new sign-ins &amp; suspicious activity', toggleChip('security')) +
        '</div>'
    };
  }

  /* ================= 4 · NOTIFICATIONS ================= */
  function notificationsSection() {
    return {
      title: 'Notifications',
      html:
        '<div class="card card-b settings-list">' +
          row('wallet', 'Transaction alerts', 'New payments, failed charges', toggleChip('tx')) +
          row('reports', 'Budget alerts', 'When spending approaches limits', toggleChip('budget')) +
          row('time', 'Bill reminders', 'Upcoming due invoices', toggleChip('reminder')) +
          row('send', 'Payment notifications', 'Payment method updates', toggleChip('pay')) +
          row('bell', 'Marketing / promotional', 'Tips, offers &amp; product updates', toggleChip('mkt')) +
        '</div>'
    };
  }

  /* ================= 5 · PREFERENCES ================= */
  function preferencesSection() {
    const p = prefs();
    return {
      title: 'Preferences',
      html:
        '<div class="card card-b settings-list">' +
          row('wallet', 'Currency', 'Used across invoices, reports &amp; budgets',
            '<select id="acc-currency" class="input sm" style="width:auto">' + S.CURRENCIES.map((c) => '<option value="' + c + '"' + (c === cur() ? ' selected' : '') + '>' + c + (SYMBOLS[c] ? ' · ' + SYMBOLS[c] : '') + '</option>').join('') + '</select>') +
          row('sync', 'Language', 'Interface language (more coming soon)',
            '<select id="acc-lang" class="input sm" style="width:auto">' + [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português']].map((l) => '<option value="' + l[0] + '"' + ((p.lang || 'en') === l[0] ? ' selected' : '') + '>' + l[1] + '</option>').join('') + '</select>') +
          row('eye', 'Theme', 'Light, dark or follow your device',
            '<span class="row" id="acc-themes" style="gap:6px">' + themeChip('light', 'Light') + themeChip('dark', 'Dark') + themeChip('system', 'System') + '</span>') +
          row('time', 'Start of month', 'When budgets &amp; monthly reports reset',
            '<select id="acc-monthstart" class="input sm" style="width:auto">' + [1, 15].map((d) => '<option value="' + d + '"' + ((p.monthStart || 1) === d ? ' selected' : '') + '>Day ' + d + '</option>').join('') + '</select>') +
          row('file', 'Date format', 'How dates appear in lists &amp; exports',
            '<select id="acc-dfmt" class="input sm" style="width:auto">' + ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map((f) => '<option value="' + f + '"' + ((p.dateFormat || 'DD/MM/YYYY') === f ? ' selected' : '') + '>' + f + '</option>').join('') + '</select>') +
        '</div>'
    };
  }
  /* ================= 6 · BUDGET & FINANCIAL SETTINGS ================= */
  function budgetSection() {
    const s = st();
    const recInvs = S.db.invoices.filter((i) => i.recurring && i.recurring !== 'none');
    return {
      title: 'Budget &amp; financial settings',
      html:
        '<div class="card mt2"><div class="card-h"><h3>Default budget</h3></div><div class="card-b">' +
          '<div class="row small mb"><span class="muted" style="flex:1">Monthly budget (' + esc(cur()) + ')</span><input id="acc-budget" class="input sm tnum" style="width:130px" type="number" step="0.01" min="0" value="' + (s.defaultBudget || '') + '" placeholder="0.00"></div>' +
          '<button class="btn sm primary mt w100" data-action="save-budget">Save budget</button>' +
        '</div></div>' +
        '<div class="card mt2"><div class="card-h"><h3>Spending categories</h3></div><div class="card-b">' +
          S.CATEGORIES.map((c) => {
            const lim = (s.categoryLimits || {})[c] || '';
            return '<div class="row small mb"><span class="muted" style="flex:1">' + esc(c) + '</span><input class="input sm tnum cat-input" data-cat="' + esc(c) + '" style="width:110px" type="number" step="0.01" min="0" value="' + esc(lim) + '" placeholder="limit"></div>';
          }).join('') +
          '<button class="btn sm ghost mt w100" data-action="save-cats">Save category limits</button>' +
        '</div></div>' +
        '<div class="card mt2"><div class="card-h"><h3>Savings goals</h3></div><div class="card-b">' +
          (s.savingsGoals.length ? s.savingsGoals.map((g, i) => {
            const pct = Math.min(100, Math.round(((g.saved || 0) / (g.target || 1)) * 100));
            return '<div class="row small mb"><span class="muted" style="flex:1">' + esc(g.name) + ' <span class="tiny muted">' + money(g.saved || 0) + ' / ' + money(g.target) + '</span></span>' +
              '<span class="chip" style="border:none;background:var(--blue-soft);color:#0662C4">' + pct + '%</span>' +
              '<button class="btn icon sm ghost" data-action="del-goal" data-i="' + i + '" title="Remove goal">' + icon('x') + '</button></div>';
          }).join('') : '<div class="empty" style="padding:14px">' + icon('box') + ' <b>No savings goals yet</b></div>') +
          '<button class="btn sm ghost mt w100" data-action="add-goal">' + icon('plus') + ' Add savings goal</button>' +
        '</div></div>' +
        '<div class="card mt2"><div class="card-h"><h3>Recurring transactions</h3></div><div class="card-b">' +
          (recInvs.length ? recInvs.slice(0, 5).map((i) => '<div class="row small mb"><span class="muted" style="flex:1">' + esc(i.number) + ' · ' + esc((S.getClient(i.clientId) || {}).name || '—') + '</span><span class="chip">' + esc(i.recurring) + '</span></div>').join('')
            : '<div class="empty" style="padding:14px">' + icon('repeat') + ' <b>No recurring invoices</b></div>') +
          '<div class="tiny muted mt">Set recurring on any invoice from its editor.</div>' +
        '</div></div>' +
        '<div class="card mt2"><div class="card-h"><h3>Financial reminders</h3></div><div class="card-b">' +
          '<div class="row small mb"><span class="muted" style="flex:1">Reminder lead times (days before/after due)</span><input id="acc-rem" class="input sm tnum" style="width:130px" value="' + esc((S.db.settings.reminderDays || [3, 0, -3]).join(',')) + '" placeholder="3, 0, -3"></div>' +
          '<button class="btn sm primary mt w100" data-action="save-rem">Save reminders</button>' +
        '</div></div>'
    };
  }
  /* ================= 7 · DATA & PRIVACY ================= */
  function dataPrivacySection() {
    return {
      title: 'Data &amp; privacy',
      html:
        '<div class="card card-b settings-list">' +
          row('download', 'Export transactions', 'All invoices, payments &amp; expenses as CSV', '<button class="btn sm primary" data-action="export-csv">Export</button>') +
          row('print', 'Download financial report', 'Month-by-month P&amp;L summary (CSV)', '<button class="btn sm primary" data-action="export-report">Download</button>') +
          row('eye', 'Privacy settings', 'Share anonymous usage statistics', toggleChip('analytics')) +
          row('link', 'Connected services', 'Accounts linked to SherPay', '<span class="chip">None</span>') +
          row('trash', 'Delete account', 'Permanently remove your account &amp; all data', '<button class="btn sm danger" data-action="delete-account">Delete</button>') +
        '</div>'
    };
  }

  /* ================= 8 · SUPPORT ================= */
  function supportSection() {
    return {
      title: 'Support',
      html:
        '<div class="card card-b settings-list">' +
          row('msg', 'Help Center', 'Guides, tutorials &amp; how-to articles', '<button class="btn sm primary" data-action="help">Open</button>') +
          row('mail', 'Contact support', 'Email our team at support@sherpay.io', '<button class="btn sm primary" data-action="contact">Contact</button>') +
          row('alert', 'Report a problem', 'Something broken? Tell us what happened', '<button class="btn sm ghost" data-action="report">Report</button>') +
          row('search', 'FAQs', 'Common questions &amp; answers', '<button class="btn sm ghost" data-action="faq">View</button>') +
          row('send', 'App feedback', 'Suggestions &amp; feature requests', '<button class="btn sm ghost" data-action="feedback">Send</button>') +
        '</div>'
    };
  }

  /* ================= 9 · ABOUT ================= */
  function aboutSection() {
    return {
      title: 'About',
      html:
        '<div class="card card-b settings-list">' +
          row('more', 'App version', 'SherPay for Web &amp; Mobile · build ' + esc(BUILD), '<span class="chip">v' + VERSION + '</span>') +
          row('sync', 'Check for updates', 'Force this device onto the newest build (your data stays)', '<button class="btn sm primary" data-action="refresh-app">Refresh</button>') +
          row('file', 'Terms of Service', 'The rules for using SherPay', '<button class="btn sm ghost" data-action="tos">View</button>') +
          row('lock', 'Privacy Policy', 'How we collect &amp; protect your data', '<button class="btn sm ghost" data-action="privacy">View</button>') +
          row('card', 'Licenses', 'Open-source software we build on', '<button class="btn sm ghost" data-action="licenses">View</button>') +
        '</div>'
    };
  }

  /* ================= 10 · ACCOUNT ACTIONS ================= */
  function actionsSection() {
    return {
      title: 'Account actions',
      html:
        '<div class="card card-b" style="border-color:var(--red);background:var(--red-soft)">' +
          '<div class="row"><div class="srow" style="flex:1;color:var(--red)">' + icon('lock') + '<div><b>Log out</b><div class="tiny muted">Sign out of this device</div></div></div><button class="btn sm danger" data-action="logout">Log out</button></div>' +
        '</div>' +
        '<div class="card card-b mt2" style="border-color:var(--red);background:var(--red-soft)">' +
          '<div class="row"><div class="srow" style="flex:1;color:var(--red)">' + icon('trash') + '<div><b>Delete account</b><div class="tiny muted">Erase every invoice, client, expense &amp; setting on this device</div></div></div><button class="btn sm danger" data-action="delete-account">Delete account</button></div>' +
        '</div>' +
        '<div class="tiny muted" style="text-align:center;margin:18px 0 26px">SherPay v' + VERSION + ' · Made with care in Accra</div>'
    };
  }
  /* ================= theme ================= */
  function applyTheme(t) {
    prefs().theme = t;
    S.save();
    const root = document.documentElement;
    if (t === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }

  /* ================= delete account ================= */
  function deleteAccount() {
    ['sherpay_db_v1', 'sherpay_users_v1', 'sherpay_session_v1'].forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
      try { sessionStorage.removeItem(k); } catch (e) {}
    });
    try { location.reload(); } catch (e) {}
    /* fallback when reload is blocked (tests, embedded webviews): force a fresh auth screen */
    try { UI.closeModal(); } catch (e) {}
    try { location.hash = '#/auth'; UI.render(true); } catch (e) {}
  }

  /* ================= sub-modals (mount pattern — view actions are registered per-render) ================= */
  function openProfileModal() {
    const p = prof(), u = S.Auth.current();
    UI.openModal({
      title: 'Edit profile',
      body:
        '<label class="f">Full name</label><input id="pf-name" class="input" value="' + esc(p.name || u.name) + '" maxlength="80">' +
        '<label class="f" style="margin-top:10px">Phone number</label><input id="pf-phone" class="input" value="' + esc(p.phone || '') + '" placeholder="+233 …">' +
        '<label class="f" style="margin-top:10px">About you</label><textarea id="pf-bio" class="input" maxlength="200" placeholder="A line about your business">' + esc(p.bio || '') + '</textarea>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="pf-save">Save changes</button>',
      mount: (m) => m.querySelector('#pf-save').addEventListener('click', () => {
        const name = m.querySelector('#pf-name').value.trim();
        if (!name) { UI.toast('Name cannot be empty', 'red', 'alert'); return; }
        p.name = name;
        p.phone = m.querySelector('#pf-phone').value.trim();
        p.bio = m.querySelector('#pf-bio').value.trim();
        S.save();
        UI.closeModal();
        UI.toast('Profile updated', 'green', 'check');
        UI.render(true);
      })
    });
  }

  function openPasswordModal() {
    UI.openModal({
      title: 'Change password',
      body:
        '<label class="f">Current password</label><input id="pw-current" class="input" type="password" autocomplete="current-password">' +
        '<label class="f" style="margin-top:10px">New password</label><input id="pw-new" class="input" type="password" autocomplete="new-password" placeholder="At least 8 characters">' +
        '<label class="f" style="margin-top:10px">Confirm new password</label><input id="pw-confirm" class="input" type="password" autocomplete="new-password">',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="pw-save">Update password</button>',
      mount: (m) => m.querySelector('#pw-save').addEventListener('click', () => {
        const currentPw = m.querySelector('#pw-current').value;
        const next = m.querySelector('#pw-new').value;
        const confirm = m.querySelector('#pw-confirm').value;
        if (next !== confirm) { UI.toast('New passwords do not match', 'red', 'alert'); return; }
        const res = S.Auth.changePassword({ currentPassword: currentPw, newPassword: next });
        if (res.error) { UI.toast(res.error, 'red', 'alert'); return; }
        UI.closeModal();
        UI.toast('Password updated', 'green', 'lock');
        S.log('security', 'Password changed from Account settings');
        S.save();
      })
    });
  }

  function openContactModal() {
    const p = prof(), u = S.Auth.current();
    UI.openModal({
      title: 'Change phone / email',
      body:
        '<label class="f">Email address</label><input id="ct-email" class="input" type="email" value="' + esc(p.email || u.email) + '">' +
        '<label class="f" style="margin-top:10px">Phone number</label><input id="ct-phone" class="input" value="' + esc(p.phone || '') + '" placeholder="+233 …">' +
        '<p class="tiny muted mt">Your email is used for invoices &amp; receipts. Sign-in stays tied to your original account email.</p>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="ct-save">Save</button>',
      mount: (m) => m.querySelector('#ct-save').addEventListener('click', () => {
        const email = m.querySelector('#ct-email').value.trim();
        if (!EMAIL_RE.test(email)) { UI.toast('Enter a valid email address', 'red', 'alert'); return; }
        p.email = email;
        p.phone = m.querySelector('#ct-phone').value.trim();
        S.save();
        UI.closeModal();
        UI.toast('Contact details updated', 'green', 'check');
        UI.render(true);
      })
    });
  }
  function openGoalModal() {
    UI.openModal({
      title: 'Add savings goal',
      body:
        '<label class="f">Goal name</label><input id="g-name" class="input" placeholder="e.g. New laptop" maxlength="60">' +
        '<label class="f" style="margin-top:10px">Target amount (' + esc(cur()) + ')</label><input id="g-target" class="input" type="number" min="1" step="0.01" placeholder="0.00">' +
        '<label class="f" style="margin-top:10px">Saved so far (optional)</label><input id="g-saved" class="input" type="number" min="0" step="0.01" placeholder="0.00">',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="g-save">Add goal</button>',
      mount: (m) => m.querySelector('#g-save').addEventListener('click', () => {
        const name = m.querySelector('#g-name').value.trim();
        const target = S.num(m.querySelector('#g-target').value);
        const saved = S.num(m.querySelector('#g-saved').value);
        if (!name || target <= 0) { UI.toast('Enter a name and a target amount', 'red', 'alert'); return; }
        st().savingsGoals.push({ name: name, target: target, saved: saved });
        S.save();
        UI.closeModal();
        UI.toast('Savings goal added', 'green', 'box');
        UI.render(true);
      })
    });
  }

  function openTwoFAModal() {
    const on = !!prefs().twoFA;
    UI.openModal({
      title: 'Two-factor authentication',
      body:
        '<p class="muted small">2FA adds a one-time code step when signing in on a new device — even if someone learns your password.</p>' +
        '<div class="card card-b"><b>' + (on ? '2FA is currently ON' : '2FA is currently OFF') + '</b><p class="tiny muted mt">Codes are generated on this device (TOTP-compatible apps supported).</p></div>',
      footer: '<button class="btn ghost" data-action="close-modal">Close</button><button class="btn ' + (on ? 'danger' : 'primary') + '" id="fa-toggle">' + (on ? 'Turn off 2FA' : 'Enable 2FA') + '</button>',
      mount: (m) => m.querySelector('#fa-toggle').addEventListener('click', () => {
        prefs().twoFA = !on;
        S.save();
        UI.closeModal();
        UI.toast(on ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled', on ? 'amber' : 'green', 'lock');
        UI.render(true);
      })
    });
  }

  function openSessionsModal() {
    const u = S.Auth.current();
    const when = u && u.loginAt ? S.fmtDateTime(new Date(u.loginAt).toISOString()) : 'this session';
    UI.openModal({
      title: 'Login / session management',
      body:
        '<div class="card card-b settings-list">' +
          '<div class="row"><div class="srow">' + icon('check') + '<div><b>This device</b><div class="tiny muted">Signed in ' + esc(when) + ' · current session</div></div></div><span class="chip" style="border:none;background:var(--green-soft);color:var(--green-dark)">Active</span></div>' +
        '</div>' +
        '<p class="tiny muted mt">SherPay keeps sessions per device. Signing out everywhere ends this session too.</p>',
      footer: '<button class="btn ghost" data-action="close-modal">Close</button><button class="btn danger" id="ss-out">Sign out everywhere</button>',
      mount: (m) => m.querySelector('#ss-out').addEventListener('click', () => {
        S.Auth.logout();
        UI.closeModal();
        UI.toast('Signed out of all devices', 'green', 'lock');
        location.hash = '#/auth';
        UI.render(true);
      })
    });
  }

  function openReportModal() {
    UI.openModal({
      title: 'Report a problem',
      body:
        '<label class="f">What went wrong?</label><textarea id="rp-text" class="input" placeholder="Describe the issue — what you expected vs what happened"></textarea>' +
        '<label class="f" style="margin-top:10px">Your email (optional)</label><input id="rp-email" class="input" type="email" placeholder="so we can follow up">',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="rp-send">Send report</button>',
      mount: (m) => m.querySelector('#rp-send').addEventListener('click', () => {
        const text = m.querySelector('#rp-text').value.trim();
        if (!text) { UI.toast('Please describe the problem', 'red', 'alert'); return; }
        S.log('report', 'Problem reported: ' + text.slice(0, 90));
        S.save();
        UI.closeModal();
        UI.toast('Report sent — thank you!', 'green', 'send');
      })
    });
  }

  function openFeedbackModal() {
    UI.openModal({
      title: 'App feedback',
      body:
        '<label class="f">Ideas, suggestions, praise — all welcome</label><textarea id="fb-text" class="input" placeholder="What would make SherPay better for you?"></textarea>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="fb-send">Send feedback</button>',
      mount: (m) => m.querySelector('#fb-send').addEventListener('click', () => {
        const text = m.querySelector('#fb-text').value.trim();
        if (!text) { UI.toast('Please write some feedback first', 'red', 'alert'); return; }
        S.log('feedback', 'Feedback received: ' + text.slice(0, 90));
        S.save();
        UI.closeModal();
        UI.toast('Feedback sent — thank you!', 'green', 'send');
      })
    });
  }
  /* ---------------- force this device onto the newest build ---------------- */
  /* Used by the "Check for updates" row: drop the service worker + its caches, then reload, so an
     installed PWA re-downloads the latest index.html/CSS/JS instead of its cached shell.
     localStorage (invoices, clients, settings) is deliberately untouched. */
  function forceRefreshApp() {
    UI.toast('Checking for the latest build…', 'blue', 'sync');
    const reload = function () { try { location.reload(); } catch (e) {} };
    const dropWorkers = function () {
      if (!('serviceWorker' in navigator)) return Promise.resolve();
      return navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
    };
    const dropCaches = function () {
      if (!('caches' in window)) return Promise.resolve();
      return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
    };
    dropWorkers().then(dropCaches).then(reload).catch(reload);
  }

  /* ================= ACCOUNT VIEW ================= */
  UI.VIEWS.account = function () {
    const user = S.Auth.current();
    if (!user) return { title: 'Account', html: '<div class="empty">Please log in.</div>', actions: {} };

    const sections = [profileSection(), financialSection(), securitySection(), notificationsSection(), preferencesSection(), budgetSection(), dataPrivacySection(), supportSection(), aboutSection(), actionsSection()];

    return {
      title: 'Account',
      sub: String(prof().name || user.name).split(' ')[0] + ' · profile, security &amp; preferences',
      topActions: '<button class="btn ghost" data-action="account-home">' + icon('chevron', 'flip') + '<span class="hide-sm">Back</span></button>',
      html: '<div class="account-scroll">' + sections.map((s) =>
        '<div class="sec"><h3 class="sec-title">' + s.title + '</h3>' + s.html + '</div>'
      ).join('') + '</div>',
      actions: {
        'account-home': () => { location.hash = '#/dashboard'; },
        'edit-profile': openProfileModal,
        'change-pw': openPasswordModal,
        'twofa': openTwoFAModal,
        'sessions': openSessionsModal,
        'change-contact': openContactModal,
        'add-goal': openGoalModal,
        'del-goal': (d) => {
          st().savingsGoals.splice(S.num(d.i), 1);
          S.save();
          UI.toast('Savings goal removed', 'green', 'trash');
          UI.render(true);
        },
        'save-budget': () => {
          const el = document.getElementById('acc-budget');
          st().defaultBudget = Math.max(0, S.num(el ? el.value : 0));
          S.save();
          UI.toast('Monthly budget saved', 'green', 'wallet');
        },
        'save-cats': () => {
          const limits = {};
          document.querySelectorAll('.cat-input').forEach((el) => { if (el.value !== '') limits[el.dataset.cat] = Math.max(0, S.num(el.value)); });
          st().categoryLimits = limits;
          S.save();
          UI.toast('Category limits saved', 'green', 'reports');
        },
        'save-rem': () => {
          const el = document.getElementById('acc-rem');
          const days = String(el ? el.value : '').split(',').map((x) => S.num(x.trim())).filter((n) => n >= -30 && n <= 30);
          S.db.settings.reminderDays = days.length ? days : [3, 0, -3];
          S.save();
          UI.toast('Reminder lead times saved', 'green', 'time');
        },
        'export-csv': () => {
          const rows = [['Type', 'Reference', 'Party', 'Date', 'Amount', 'Currency', 'Status/Method']];
          S.db.invoices.forEach((i) => {
            const t = S.computeTotals(i);
            rows.push(['Invoice', i.number, (S.getClient(i.clientId) || {}).name || '', i.issueDate, t.total.toFixed(2), i.currency || cur(), S.displayStatus(i)]);
            (i.payments || []).forEach((p) => rows.push(['Payment', i.number, (S.getClient(i.clientId) || {}).name || '', p.date, num2(p.amount), i.currency || cur(), p.method || '']));
          });
          S.db.expenses.forEach((e) => rows.push(['Expense', '', e.merchant || '', e.date, num2(e.total), cur(), e.category || '']));
          S.download('sherpay-transactions-' + S.todayISO() + '.csv', S.toCSV(rows), 'text/csv');
          UI.toast('Transactions exported as CSV', 'green', 'download');
        },
        'export-report': () => {
          const mb = S.moneyByMonth();
          const rows = [['Month', 'Revenue', 'Expenses', 'Net']];
          mb.months.slice(-12).reverse().forEach((m) => rows.push([S.monthLabel(m) + ' ' + m.slice(0, 4), num2(mb.rev[m] || 0), num2(mb.exp[m] || 0), num2((mb.rev[m] || 0) - (mb.exp[m] || 0))]));
          S.download('sherpay-pnl-' + S.todayISO() + '.csv', S.toCSV(rows), 'text/csv');
          UI.toast('P&L report downloaded', 'green', 'print');
        },
        'help': () => UI.toast('Help Center — sherpay.io/help', 'blue', 'msg'),
        'contact': () => UI.toast('Contact support — support@sherpay.io', 'blue', 'mail'),
        'faq': () => UI.toast('FAQs — sherpay.io/faq', 'blue', 'search'),
        'report': openReportModal,
        'feedback': openFeedbackModal,
        'refresh-app': forceRefreshApp,
        'tos': legalModal,
        'privacy': () => legalModal('privacy'),
        'licenses': () => legalModal('licenses'),
        'logout': () => {
          S.Auth.logout();
          UI.closeModal();
          UI.toast('Signed out — see you soon!', 'green', 'lock');
          location.hash = '#/auth';
          UI.render(true);
                },
        'delete-account': () => UI.confirmDialog('Delete your account?', 'This permanently removes all invoices, clients, expenses and settings stored on this device. This cannot be undone.', deleteAccount, 'Delete everything')
      },
      mount: function (root) {
    const bind = (id, fn) => {
      const el = root.querySelector('#' + id);
      if (el) el.addEventListener('change', fn);
    };
    bind('acc-currency', (e) => {
      S.db.settings.currency = e.target.value;
      S.save();
      UI.toast('Base currency set to ' + e.target.value, 'green', 'wallet');
      UI.render(true);
    });
    bind('acc-lang', (e) => {
      prefs().lang = e.target.value;
      S.save();
      UI.toast('Language preference saved', 'green', 'check');
    });
    bind('acc-monthstart', (e) => {
      prefs().monthStart = S.num(e.target.value);
      S.save();
      UI.toast('Month starts on day ' + e.target.value + ' now', 'green', 'time');
    });
    bind('acc-dfmt', (e) => {
      prefs().dateFormat = e.target.value;
      S.save();
      UI.toast('Date format saved', 'green', 'check');
    });
    root.querySelectorAll('.theme-chip').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.dataset.theme;
        applyTheme(t);
        root.querySelectorAll('.theme-chip').forEach((c) => c.classList.toggle('active', c === el));
        UI.toast('Theme set to ' + t, 'green', 'eye');
      });
    });
    root.querySelectorAll('.chip.toggle[data-toggle]').forEach((el) => {
            el.addEventListener('click', () => {
        const key = el.dataset.toggle;
        const dflt = key === 'analytics' ? false : key !== 'mkt';
        const now = !notif(key, dflt);
        st().notifications[key] = now;
        S.save();
        el.classList.toggle('on', now);
        el.setAttribute('aria-checked', String(now));
        el.textContent = now ? 'On' : 'Off';
        UI.toast((now ? 'Enabled — ' : 'Disabled — ') + key.toUpperCase() + ' notifications', now ? 'green' : 'amber', 'bell');
      });
    });
  }
  };
};

  /* small helpers used by actions */
  function num2(v) { return Number(v || 0).toFixed(2); }

  function legalModal(kind) {
    const texts = {
      tos: ['Terms of Service', '<p class="muted small">SherPay is provided as-is for creating, sending and tracking invoices. You are responsible for the accuracy of the invoices you issue and for keeping your credentials safe.</p><p class="muted small">We may update these terms as the product evolves; continued use means you accept the current version.</p>'],
      privacy: ['Privacy Policy', '<p class="muted small">SherPay is local-first: your invoices, clients, expenses and settings are stored on your device and never leave it unless you explicitly export them.</p><p class="muted small">We do not sell personal data. Anonymous usage statistics, if enabled in Privacy settings, help us improve the app.</p>'],
      licenses: ['Licenses', '<p class="muted small">SherPay is built with love and the following open-source foundations:</p><ul class="small muted"><li>Capacitor — MIT License (native shells)</li><li>Feather-style icon set — MIT License</li><li>System font stack — OS vendor licenses</li></ul>']
    };
    const t = texts[kind] || texts.tos;
    UI.openModal({ title: t[0], body: t[1], footer: '<button class="btn ghost" data-action="close-modal">Close</button>' });
  }
})();