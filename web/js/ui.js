/* ============ SherPay UI: icons, shell, router, modals, toasts ============ */
window.UI = (function () {
  const S = window.Store;

  /* ---------------- icons ---------------- */
  const P = {
    dashboard: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>',
    invoice: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h4"/>',
    clients: '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M15.5 3.6a3.5 3.5 0 0 1 0 6.8"/>',
    expenses: '<path d="M4 3h16v18l-2.7-1.6L14.6 21 12 19.4 9.4 21l-2.7-1.6L4 21z"/><path d="M8.5 8h7M8.5 12h7"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    reports: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7" rx="1"/><rect x="12.5" y="7" width="3" height="11" rx="1"/><rect x="18" y="13" width="3" height="5" rx="1"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/>',
    wallet: '<path d="M20 7H4a2 2 0 0 1 0-4h14v4"/><path d="M4 7v12a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1"/><circle cx="16.5" cy="14" r="1.4"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 9.5V14"/><path d="M12 17.2v.1"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7L22 7"/>',
    msg: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6z"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    gps: '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M3 21v-5h5"/><path d="M21 3v5h-5"/>',
    file: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.6 7.6 0 0 1 15 0"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    shield: '<path d="M12 2 4.5 5v6.5c0 5 3.2 8.4 7.5 10.5 4.3-2.1 7.5-5.5 7.5-10.5V5z"/>',
    star: '<path d="m12 2 3 6.5 7 .9-5.2 4.8L18 22l-6-3.4L6 22l1.2-7.8L2 9.4l7-.9z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 8 5-5 5 5"/><path d="M12 3v12"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 9-6 3 6 3z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8.1v.1"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97 6 6 0 0 0-11.8 1.6A4 4 0 0 0 6.5 19z"/>',
    cloudOff: '<path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97 6 6 0 0 0-9-3.2"/><path d="M6.2 7.7A6 6 0 0 0 6.5 19h9"/><path d="m3 3 18 18"/>',
    book: '<path d="M2 4.5A2.5 2.5 0 0 1 4.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4.5A2.5 2.5 0 0 1 2 19.5z"/><path d="M2 17.5A2.5 2.5 0 0 1 4.5 15H20"/>',
    receipt: '<path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5z"/><path d="M9 8h6M9 12h6"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /* ---------------- theme (light / dark / system) ----------------
     Single home for theme logic so the shell, the Account ▸ Preferences chips and boot
     all agree. The preference lives in db.settings.preferences.theme; styles.css keys
     every dark palette off html[data-theme="dark"]. "system" follows the OS via
     matchMedia and re-applies live when the OS appearance changes. */
  const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themePref() {
    try { return (S.db.settings.preferences && S.db.settings.preferences.theme) || 'system'; } catch (e) { return 'system'; }
  }
  function isDark() { const t = themePref(); return t === 'dark' || (t === 'system' && !!(systemDark && systemDark.matches)); }
  function applyTheme(t) {
    try {
      const prefs = S.db.settings.preferences || (S.db.settings.preferences = {});
      prefs.theme = t; S.save();
    } catch (e) { return; }
    if (isDark()) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    /* mirror to a shared key so the Next.js variant boots with the same palette */
    try { localStorage.setItem('sherpay_theme', t); } catch (e) { /* private mode — db copy is the source of truth */ }
    /* keep <meta name="theme-color"> (status bar / PWA chrome) in step with the palette */
    const mc = document.querySelector('meta[name="theme-color"]');
    if (mc) mc.setAttribute('content', isDark() ? '#0B1220' : '#06244B');
  }
  function watchSystemTheme() {
    if (!systemDark) return;
    const onChange = () => { if (themePref() === 'system') applyTheme('system'); };
    if (systemDark.addEventListener) systemDark.addEventListener('change', onChange);
    else if (systemDark.addListener) systemDark.addListener(onChange);
  }

  /* ---------------- nav config ----------------
     Eight sibling links with equal weight is a Hick violation: every visit
     means re-reading eight labels before choosing. They are now declared in
     three named groups, so the eye gets a category first and only compares
     2–4 items inside it. The grouping is presentational only — routes,
     data-route attributes and the mobile tab bar are unchanged. */
  const NAV = [
    { route: 'dashboard', label: 'Dashboard', icon: 'dashboard', group: 'Overview' },
    { route: 'invoices', label: 'Invoices', icon: 'invoice', group: 'Daily' },
    { route: 'clients', label: 'Clients', icon: 'clients', group: 'Daily' },
    { route: 'expenses', label: 'Expenses', icon: 'expenses', group: 'Daily' },
    { route: 'time', label: 'Time Tracking', icon: 'time', group: 'Daily' },
    { route: 'reports', label: 'Reports', icon: 'reports', group: 'Workspace' },
    { route: 'settings', label: 'Settings', icon: 'settings', group: 'Workspace' },
    { route: 'account', label: 'Account', icon: 'user', group: 'Workspace' }
  ];
  const MOBILE_NAV = ['dashboard', 'invoices', 'clients', 'expenses', 'more'];

  /* open-loop counters live on the nav so unfinished work is visible from
     anywhere; overdue flips the pill to the single "something is wrong" red */
  function navCounters() {
    const open = S.db.invoices.filter((i) => ['sent', 'viewed'].includes(S.displayStatus(i)) || S.displayStatus(i) === 'overdue' || S.displayStatus(i) === 'partial').length;
    const overdue = S.db.invoices.filter((i) => S.displayStatus(i) === 'overdue').length;
    return { invoices: open, overdue: overdue };
  }
  function navHtml(active) {
    const c = navCounters();
    let html = '', group = '';
    NAV.forEach((n) => {
      if (n.group !== group) { group = n.group; html += '<div class="side-h">' + group + '<i></i></div>'; }
      const isActive = active === n.route;
      const pill = n.route === 'invoices' && c.invoices
        ? '<span class="pill' + (c.overdue ? ' warn' : '') + '" title="' + c.invoices + ' awaiting payment' + (c.overdue ? ' · ' + c.overdue + ' overdue' : '') + '">' + c.invoices + '</span>'
        : '';
      html += '<button class="nav-item' + (isActive ? ' active' : '') + '"' + (isActive ? ' aria-current="page"' : '') +
        ' data-action="nav" data-route="' + n.route + '">' + icon(n.icon) + '<span>' + n.label + '</span>' + pill + '</button>';
    });
    return html;
  }

  /* ---------------- router & shell ---------------- */
  let currentView = null, currentActions = {}, route = '';
  let lastRenderedHash = null;
  /* A view can claim navigation before it happens (unsaved editor work). The
     guard returns true when it handled the prompt itself. Reset on every
     render so a detached view can never block the app. */
  let navGuard = null;
  function setNavGuard(fn) { navGuard = typeof fn === 'function' ? fn : null; }

  function parseRoute() {
    const h = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    return h.split('/').filter(Boolean);
  }
  function go(hash) { location.hash = hash; }

  function start() {
    /* paint the saved theme (light/dark/system) before the first shell render,
       and follow OS appearance live while "system" is selected */
    applyTheme(themePref());
    watchSystemTheme();
    window.addEventListener('hashchange', render);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onGlobalKey);
    touchAssist();
    dragAssist();
    window.addEventListener('online', () => { toast('Back online', 'green', 'sync'); setOnline(); });
    window.addEventListener('offline', () => { toast('Offline mode — drafts saved locally', 'amber', 'alert'); setOnline(); });
    dataNotice();
    dataRescueNotice();
    /* A cloud session that stopped authenticating must be said out loud too —
       local saving keeps working, so silence reads as "everything is backed up". */
    if (S.cloud && S.cloud.onSessionExpired) {
      S.cloud.onSessionExpired(() => alertError('Cloud sync stopped',
        'Your SherPay cloud session expired, so this workspace is no longer syncing to your account. Nothing you typed is lost — it is saved on this device. Open Account and sign in again to resume syncing.'));
    }
    render();
  }
  /* Corrupt or unreadable saved data is a stop condition, not a toast: the
     person must know the empty workspace in front of them is not the one they
     built, before they spend an hour rebuilding it. */
  function dataRescueNotice() {
    if (!S.dataError || !S.dataError()) return;
    alertError('We could not open your saved workspace',
      'SherPay found saved data but could not read it (' + S.dataError() + '), so this session started empty. Nothing was deleted — reload before you create anything new.');
  }

  /* ---------------- keyboard (Jakob: the shortcuts people already expect) --
     ⌘/Ctrl+S saves whatever the open view can save, ⌘/Ctrl+K and / jump to the
     invoice search, n starts the view's primary object, ? lists them all.
     Nothing fires while typing or while a dialog owns the page. */
  const SHORTCUTS = [
    ['⌘/Ctrl S', 'Save what is on screen'],
    ['⌘/Ctrl K  or  /', 'Find an invoice'],
    ['n', 'New invoice (or new client / expense here)'],
    ['?', 'This list'],
    ['Esc', 'Close a dialog']
  ];
  function onGlobalKey(e) {
    const t = e.target || {};
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 's' || e.key === 'S')) {
      const save = currentActions.save || currentActions['save-client'] || currentActions['save-expense'];
      if (save) { e.preventDefault(); save({}, null, e); }
      return;
    }
    if (mod && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); focusSearch(); return; }
    if (typing || mod || e.altKey) return;
    if (document.querySelector('.modal-backdrop')) {
      if (e.key === '?') { e.preventDefault(); closeModal(); shortcutsModal(); }
      return;
    }
    if (e.key === '?') { e.preventDefault(); shortcutsModal(); return; }
    if (e.key === '/') { e.preventDefault(); focusSearch(); return; }
    if (e.key === 'n' || e.key === 'N') {
      const fn = currentActions['new-invoice'] || currentActions.add;
      if (fn) { e.preventDefault(); fn({}, null, e); }
    }
  }
  function focusSearch() {
    const q = document.getElementById('inv-q');
    if (q) { q.focus(); q.select(); return; }
    go('#/invoices');
    setTimeout(() => { const el = document.getElementById('inv-q'); if (el) { el.focus(); el.select(); } }, 80);
  }
  function shortcutsModal() {
    openModal({
      title: 'Keyboard shortcuts',
      body: '<div class="keys">' + SHORTCUTS.map((s) => '<div class="kr"><span>' + s[1] + '</span><kbd class="kbd">' + S.esc(s[0]) + '</kbd></div>').join('') + '</div>',
      footer: '<button class="btn primary" data-action="close-modal">Got it</button>'
    });
  }

  /* ---------------- first-run transparency notice ----------------
     SherPay uses no cookies or trackers, but it does keep your data in
     browser local storage. One-time notice (dismissal remembered) so
     visitors know exactly what is stored on their device. */
  function dataNotice() {
    let seen = true;
    try { seen = localStorage.getItem('sherpay_notice_v1') === '1'; } catch (e) {}
    if (seen) return;
    const el = document.createElement('div');
    el.className = 'legal-notice';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="ln-txt"><b>Your data stays on this device.</b><span>SherPay sets no cookies and loads no trackers — it saves your invoices and settings in this browser’s local storage so the app works offline. See the Privacy Policy in Account → About.</span></div>' +
      '<button class="btn sm primary" id="ln-ok">Got it</button>';
    document.body.appendChild(el);
    el.querySelector('#ln-ok').addEventListener('click', () => {
      try { localStorage.setItem('sherpay_notice_v1', '1'); } catch (e) {}
      el.remove();
    });
  }

  /* ---------------- auth gate ----------------
     No active session -> the login/signup screen replaces the whole shell.
     The static boot splash in index.html fades out underneath either way. */
  function authed() { return !!S.Auth.current(); }

  function renderAuth() {
    const app = document.getElementById('app');
    app.classList.remove('shell-loading');
    app.innerHTML = '<div id="view"></div>';
    const view = VIEWS.auth();
    const root = document.getElementById('view');
    root.innerHTML = view.html;
    if (view.mount) view.mount(root);
    document.title = 'SherPay — Log in or sign up';
  }

  async function signOut() {
    await S.Auth.logout();
    closeModal();
    toast('Signed out — see you soon!', 'green', 'lock');
    renderAuth();
  }

  /* ---------------- splash dismissal ----------------
     The animated logo splash lives in index.html (pure CSS, plays even
     before JS parses). We let it breathe ~1.6s, then fade it out to
     reveal whatever start() rendered underneath (app or auth screen). */
  function dismissSplash() {
    const sp = document.getElementById('splash');
    if (!sp || sp.classList.contains('splash-hide')) return;
    let reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    setTimeout(() => {
      sp.classList.add('splash-hide');
      setTimeout(() => { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 650);
    }, reduce ? 250 : 1600);
  }

  function setOnline() {
    const el = document.getElementById('online-ind');
    if (el) { el.classList.toggle('off', !navigator.onLine); el.querySelector('span').textContent = navigator.onLine ? 'You are online — saved on this device' : 'Offline — saved on this device'; }
  }

  function render(force) {
    if (!authed()) { renderAuth(); return; }
    const hash = location.hash || '#/dashboard';
    // some environments fire duplicate hashchange events for one navigation;
    // re-rendering the same route twice would wipe fresh view state (e.g. client prefill)
    if (force !== true && hash === lastRenderedHash) return;
    lastRenderedHash = hash;
    const parts = parseRoute();
    route = parts[0] || 'dashboard';
    /* Tell the shell where we really are: the invoice editor is its own place,
       because on a phone its action bar takes over the bottom of the screen and
       the tab bar has to step aside there — and only there. */
    if (document.body) {
      const editing = route === 'invoices' && (parts[1] === 'new' || parts[2] === 'edit');
      document.body.dataset.route = editing ? 'invoices-' + (parts[1] === 'new' ? 'new' : 'edit') : route;
    }
    const app = document.getElementById('app');
    const viewFn = VIEWS[route] || VIEWS.dashboard;

    // drop the boot-splash styling: .shell-loading pins #app with position:fixed,
    // which would kill document scrolling for the whole app if it ever persisted
    app.classList.remove('shell-loading');
    app.innerHTML =
      '<aside class="sidebar">' +
        '<div class="brand"><img src="assets/logo.png" alt="SherPay"><div><div class="brand-name">SherPay</div><div class="brand-tag">Invoice · Get paid</div></div></div>' +
        '<nav class="nav" aria-label="Main">' + navHtml(route) + '</nav>' +
        '<div class="side-foot">' +
          '<div class="online-dot" id="online-ind"><i></i><span>Connection status</span></div>' +
          '<div class="user-chip" id="user-chip">' + avatar(S.Auth.current().name) +
            '<div class="uc-meta"><b>' + S.esc(S.Auth.current().name) + '</b><span>' + S.esc(S.Auth.current().email) + '</span></div>' +
            '<button class="uc-out" data-action="signout" title="Sign out" aria-label="Sign out">' + icon('logout') + '</button>' +
          '</div>' +
          '<div class="pro-card" style="margin-top:10px"><b>' + icon('star') + ' SherPay Pro' + (S.upgrades.isPro() ? ' <span class="badge paid">Active</span>' : '') + '</b><p>Mileage GPS tracker, inventory, client portal & QuickBooks/Xero sync.</p><button data-action="pro">' + (S.upgrades.isPro() ? 'View Pro' : 'Pay ' + S.fmtMoney(S.upgrades.price('pro').amount, 'GHS') + ' \u00b7 MoMo') + '</button></div>' +
        '</div>' +
      '</aside>' +
      '<div class="main">' +
        '<header class="topbar"><div><h1 id="tb-title"></h1><div class="sub" id="tb-sub"></div></div><div class="spacer"></div><div class="row" id="tb-actions"></div>' +
          accountChip() +
        '</header>' +
        '<div id="view"></div>' +
      '</div>' +
      '<nav class="bottomnav">' + MOBILE_NAV.map((r) => {
        if (r === 'more') return '<button data-action="moresheet">' + icon('more') + 'More</button>';
        const n = NAV.find((x) => x.route === r);
        return '<button class="' + (route === r ? 'active' : '') + '" data-action="nav" data-route="' + r + '">' + icon(n.icon) + n.label + '</button>';
      }).join('') + '</nav>';

    setOnline();
    currentView = viewFn(parts);
    const root = document.getElementById('view');
    root.innerHTML = currentView.html;
    currentActions = currentView.actions || {};
    navGuard = null;                       // the fresh view has not asked for any guard yet
    setTopbar(currentView.title || '', currentView.sub || '', currentView.topActions || '');
    if (currentView.mount) currentView.mount(root);
    document.title = 'SherPay — ' + (currentView.title || 'Invoicing');
  }

  function setTopbar(title, sub, actionsHtml) {
    const t = document.getElementById('tb-title'); if (t) t.textContent = title;
    const s = document.getElementById('tb-sub'); if (s) s.textContent = sub || '';
    const a = document.getElementById('tb-actions'); if (a) a.innerHTML = actionsHtml || '';
  }
  function rerender() { render(true); }

  /* ---------------- touch assist ----------------
     On some iOS WebKit versions a vertical swipe that starts on a nested
     (horizontal) scroller never reaches the document. If a clearly-vertical
     gesture produces zero window movement, we scroll the page manually.
     Never engages when native scrolling works, when a modal is open,
     or for horizontal gestures. */
  function touchAssist() {
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
    let active = false, startY = 0, startX = 0, lastY = 0, lastScroll = 0;
    const scrollY = () => window.scrollY || window.pageYOffset || 0;
    document.addEventListener('touchstart', (e) => {
      active = e.touches.length === 1 && !document.querySelector('.modal-backdrop');
      if (!active) return;
      startY = lastY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      lastScroll = scrollY();
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!active || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dy = t.clientY - lastY;
      const totalDy = t.clientY - startY, totalDx = t.clientX - startX;
      const now = scrollY();
      if (Math.abs(totalDy) > 18 && Math.abs(totalDy) > Math.abs(totalDx) * 1.2 && now === lastScroll) {
        window.scrollBy(0, -dy);
      }
      lastY = t.clientY;
      lastScroll = scrollY();
    }, { passive: true });
    document.addEventListener('touchend', () => { active = false; }, { passive: true });
    document.addEventListener('touchcancel', () => { active = false; }, { passive: true });
  }

  /* ---------------- drag assist ----------------
     App-feel dragging: hold the mouse button and swipe to scroll the page
     (or a table sideways, or a modal's list) — like swiping on a phone.
     Never engages on form controls/links/buttons, ignores tiny movements
     (so clicks and text-selection intents pass through), and suppresses
     the click that ends a real drag. */
  let suppressClickUntil = 0;
  function dragAssist() {
    let st = null;
    const EXCL = 'input,textarea,select,a,button,label,[contenteditable="true"],.no-drag';
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      if (e.target.closest && e.target.closest(EXCL)) return;
      st = { x: e.clientX, y: e.clientY, moved: false, hs: e.target.closest && e.target.closest('.scroll-x'), mb: e.target.closest && e.target.closest('.modal-b') };
    });
    document.addEventListener('pointermove', (e) => {
      if (!st) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        st.moved = true;
        document.body.classList.add('dragging');
      }
      e.preventDefault();
      if (st.hs) { st.hs.scrollLeft -= dx; st.hs.scrollTop -= dy; }
      else if (st.mb) { st.mb.scrollTop -= dy; }
      else { window.scrollBy(0, -dy); }
      st.x = e.clientX; st.y = e.clientY;
    }, { passive: false });
    const end = () => {
      if (st && st.moved) suppressClickUntil = Date.now() + 350;
      st = null;
      document.body.classList.remove('dragging');
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    document.addEventListener('dragstart', (e) => { if (st && st.moved) e.preventDefault(); });
  }

  /* ---------------- global action delegation ---------------- */
  function onDocClick(e) {
    if (Date.now() < suppressClickUntil) return;
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const name = el.dataset.action;
    if (name === 'nav') {
      if (navGuard && navGuard(el.dataset.route, el)) return;   // view asked to be asked first
      go('#/' + el.dataset.route); return;
    }
    if (name === 'moresheet') { moreSheet(); return; }
    if (name === 'pro') { proModal(); return; }
    if (name === 'account') { accountModal(); return; }
    if (name === 'acct-settings') { closeModal(); go('#/settings'); return; }
    if (name === 'acct-pro') { proModal(); return; }
    if (name === 'signout') { signOut(); return; }
    if (name === 'close-modal') { closeModal(); return; }
    const fn = currentActions[name];
    if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
  }

  function moreSheet() {
    openModal({
      title: 'More',
      body: '<div class="grid" style="gap:8px">' +
        [['time', 'time', 'Time Tracking', 'Stopwatch & billable hours'], ['reports', 'reports', 'Reports', 'P&L, tax summary, exports'], ['settings', 'settings', 'Settings', 'Branding, taxes, numbering, reminders']]
          .map((x) => '<button class="method" data-action="nav" data-route="' + x[0] + '" onclick="UI.closeModal()"><span class="mico" style="background:var(--navy-800)">' + icon(x[1]) + '</span><span><b>' + x[2] + '</b><div class="tiny muted">' + x[3] + '</div></span></button>').join('') +
        '</div>',
      footer: ''
    });
    document.querySelectorAll('#modal-root .mico svg').forEach((s) => { s.setAttribute('width', '18'); s.setAttribute('height', '18'); s.style.stroke = '#fff'; });
  }

  /* The Pro offer. One thing changed here and it matters: "Join waitlist" was a
     dead end. Pro is now bought with Mobile Money on upgrade.html, and what
     comes back is a PAYMENT REFERENCE — which means this sheet also has to be
     where you come back to when a payment is half finished (page closed, phone
     died, network dropped mid-approval). The resume rows below are that place:
     the reference, a way back to the wallet prompt, and "I've paid — check",
     which asks Paystack and nothing else. */
  function proModal() {
    const plan = S.upgrades.state();
    const price = S.upgrades.price('pro');
    const open = S.upgrades.resumeRefs().filter((r) => r.status !== 'paid');
    const cost = S.fmtMoney(price.amount, price.currency);
    const rows = open.map((r) =>
      '<div class="card card-b mt" data-ref="' + S.esc(r.ref) + '">' +
        '<b class="small">Payment started on this device</b>' +
        '<div class="mono tiny mt">' + S.esc(r.ref) + '</div>' +
        '<div class="tiny muted mt">' + S.esc(cost) + ' \u00b7 ' + S.esc(r.provider || 'Mobile Money') +
          (r.account ? ' \u00b7 ' + S.esc(r.account) : '') + ' \u00b7 Pro unlocks when Paystack confirms this reference.</div>' +
        '<div class="row mt" style="gap:8px;flex-wrap:wrap">' +
          '<button class="btn sm ghost" data-copy-ref>' + icon('copy') + 'Copy reference</button>' +
          (r.checkout_url ? '<a class="btn sm ghost" href="' + S.esc(r.checkout_url) + '" target="_blank" rel="noopener">Open payment</a>' : '') +
          '<a class="btn sm primary" href="' + S.esc(S.upgrades.link()) + '">Continue payment</a>' +
          '<button class="btn sm ghost" data-check-ref>' + icon('sync') + 'I\u2019ve paid \u2014 check</button>' +
        '</div>' +
        '<div class="tiny muted mt" data-check-status role="status"></div>' +
      '</div>').join('');
    openModal({
      title: 'SherPay Pro',
      body: (plan.tier === 'pro'
        ? '<p class="muted small mb">Pro is unlocked on this account' +
            (plan.paid_at ? ' since ' + S.esc(S.fmtDate(String(plan.paid_at).slice(0, 10))) : '') +
            '. Payment reference <code class="mono">' + S.esc(plan.ref || '\u2014') + '</code>.</p>'
        : '<p class="muted small mb">' + cost + ' once covers ' + price.months + ' months, paid from your MTN MoMo, Telecel Cash or AT Money wallet. You approve the payment on your phone \u2014 SherPay never asks for your wallet PIN.</p>') +
        [['gps', 'Mileage Tracker', 'GPS business-drive logging for tax write-offs'],
         ['box', 'Inventory Management', 'Stock levels auto-deducted on invoicing'],
         ['clients', 'Client Portal', 'Secure login for clients to view & pay invoices'],
         ['sync', 'Accounting Sync', 'Two-way sync with QuickBooks, Xero, FreshBooks, Wave'],
         ['lock', 'Biometric Login', 'FaceID / fingerprint unlock on mobile']]
          .map((x) => '<div class="lock-row"><span class="ico">' + icon(x[0]) + '</span><div><b class="small">' + x[1] + ' <span class="badge pro">PRO</span></b><div class="tiny muted">' + x[2] + '</div></div></div>').join('') +
        rows,
      footer: plan.tier === 'pro'
        ? '<button class="btn primary" data-action="close-modal">Done</button>'
        : '<button class="btn ghost" data-action="close-modal">Maybe later</button>' +
          '<button class="btn primary" id="pro-pay-momo">' + icon('wallet') + ' Pay ' + cost + ' with Mobile Money</button>',
      mount: (modal) => {
        const go = modal.querySelector('#pro-pay-momo');
        if (go) go.addEventListener('click', () => { location.href = S.upgrades.link(); });
        modal.querySelectorAll('[data-ref]').forEach((box) => {
          const ref = box.getAttribute('data-ref') || '';
          const cp = box.querySelector('[data-copy-ref]');
          if (cp) cp.addEventListener('click', () => {
            copyText(ref).then((ok) => toast(ok ? 'Payment reference copied' : 'Could not copy the reference', ok ? 'green' : 'amber', ok ? 'copy' : 'alert'));
          });
          const chk = box.querySelector('[data-check-ref]');
          if (chk) chk.addEventListener('click', async () => {
            const note = box.querySelector('[data-check-status]');
            chk.disabled = true;
            if (note) note.textContent = 'Checking with Paystack\u2026';
            try {
              await S.upgrades.sync();
              if (S.upgrades.isPro()) { closeModal(); render(true); toast('SherPay Pro is active', 'green', 'star'); }
              else { if (note) note.textContent = 'Still pending. Approve the prompt on your phone, then check again.'; chk.disabled = false; }
            } catch (e) {
              if (note) note.textContent = (e && e.message) || 'Could not reach SherPay. Try again.';
              chk.disabled = false;
            }
          });
        });
      }
    });
    document.querySelectorAll('#modal-root .ico svg').forEach((s) => { s.setAttribute('width', '18'); s.setAttribute('height', '18'); });
  }

  /* ---------------- account (top-right) ----------------
     Labeled, not icon-only: an avatar alone makes people guess. The name and a
     chevron say "this is you, and it opens something". */
  function accountChip() {
    const u = S.Auth.current() || {};
    const first = String(u.name || 'Account').split(' ')[0];
    return '<button class="tb-account" data-action="account" title="Your account" aria-label="Your account — ' + S.esc(u.name || 'Account') + '">' +
      avatar(u.name) + '<span class="tb-who hide-sm">' + S.esc(first) + '</span>' + icon('chevronDown') + '</button>';
  }

  function accountModal() {
    const u = S.Auth.current();
    if (!u) return;
    const plan = S.upgrades.isPro() ? 'PRO' : 'FREE';
    openModal({
      title: 'Account',
      body:
        '<div class="acct-head">' + avatar(u.name) +
          '<div class="acct-meta"><b>' + S.esc(u.name) + '</b><span>' + S.esc(u.email) + '</span></div>' +
          '<span class="badge plan">' + plan + '</span>' +
        '</div>' +
        '<div class="grid" style="gap:8px">' +
          '<button class="method" data-action="acct-settings"><span class="mico" style="background:var(--navy-800)">' + icon('settings') + '</span><span><b>Settings</b><div class="tiny muted">Branding, taxes, numbering, reminders</div></span></button>' +
          '<button class="method" data-action="acct-pro"><span class="mico" style="background:#7C3AED">' + icon('star') + '</span><span><b>SherPay Pro</b><div class="tiny muted">Mileage, inventory, client portal & accounting sync</div></span></button>' +
        '</div>',
      footer: '<button class="btn ghost" data-action="close-modal">Close</button><button class="btn danger" data-action="signout">' + icon('logout') + ' Sign out</button>'
    });
    document.querySelectorAll('#modal-root .mico svg').forEach((s) => { s.setAttribute('width', '18'); s.setAttribute('height', '18'); s.style.stroke = '#fff'; });
  }

  /* ---------------- modal ---------------- */
  function openModal(opts) {
    const root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-backdrop" data-backdrop="1"><div class="modal ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + String(opts.title || 'Dialog').replace(/<[^>]*>/g, '') + '">' +
      '<div class="modal-h"><h3>' + opts.title + '</h3><div class="spacer"></div><button class="btn icon ghost" data-action="close-modal" aria-label="Close dialog">' + icon('x') + '</button></div>' +
      '<div class="modal-b">' + opts.body + '</div>' +
      (opts.footer === '' ? '' : '<div class="modal-f">' + (opts.footer || '<button class="btn ghost" data-action="close-modal">Close</button>') + '</div>') +
      '</div></div>';
    root.querySelector('.modal-backdrop').addEventListener('mousedown', (e) => { if (e.target.dataset.backdrop) closeModal(); });
    /* keyboard support: Escape closes, Tab cycles inside the dialog */
    lastFocus = document.activeElement;
    const modal = root.querySelector('.modal');
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeModal(); }
      else if (e.key === 'Tab') {
        const f = Array.prototype.filter.call(modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]'), (el) => !el.disabled && el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    const focusable = modal.querySelector('input,select,textarea,button:not([data-action="close-modal"])');
    if (focusable) focusable.focus();
    if (opts.mount) opts.mount(modal);
    return modal;
  }
  let lastFocus = null;
  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
    /* return keyboard focus to the element that opened the dialog */
    try { if (lastFocus && document.contains(lastFocus)) { lastFocus.focus(); lastFocus = null; } } catch (e) {}
  }
  function confirmDialog(title, message, onYes, yesLabel) {
    openModal({
      title, body: '<p class="muted">' + message + '</p>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn danger" id="cf-yes">' + (yesLabel || 'Delete') + '</button>',
      mount: (m) => m.querySelector('#cf-yes').addEventListener('click', () => { closeModal(); onYes(); })
    });
  }
  /* A stop notice, not a toast: things like an expired session or a failed sync
     must be acknowledged, because a toast that fades away teaches nothing and
     the person keeps working in an app that is no longer saving. */
  function alertError(title, message) {
    openModal({
      title: title || 'Something went wrong',
      body: '<p class="muted">' + S.esc(String(message || 'Please try again.')) + '</p>',
      footer: '<button class="btn primary" data-action="close-modal">OK</button>'
    });
  }

  /* ---------------- clipboard (with fallback for iframes / non-secure contexts) ---------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove(); return ok;
    } catch (e) { return false; }
  }

  /* ---------------- toast ----------------
     `opts.undo` turns a toast from a receipt into a safety net: any action can
     hand us its inverse and give the person six seconds to change their mind.
     That is what makes a one-tap Delete or Mark paid feel safe to try. */
  function toast(msg, kind, ic, opts) {
    opts = opts || {};
    const root = document.getElementById('toast-root');
    if (!root) return null;
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.setAttribute('role', 'status');
    el.innerHTML = icon(ic || (kind === 'green' ? 'check' : kind === 'red' ? 'alert' : 'bell')) + '<span>' + S.esc(msg) + '</span>';
    let alive = true, timer = null;
    const close = () => {
      if (!alive) return;
      alive = false;
      el.style.opacity = '0'; el.style.transition = 'opacity .3s';
      setTimeout(() => { if (el.parentNode) el.remove(); }, 320);
    };
    if (typeof opts.undo === 'function') {
      const b = document.createElement('button');
      b.className = 'toast-undo'; b.type = 'button';
      b.textContent = opts.undoLabel || 'Undo';
      b.addEventListener('click', () => { clearTimeout(timer); if (el.parentNode) el.remove(); alive = false; opts.undo(); });
      el.appendChild(b);
    }
    root.appendChild(el);
    timer = setTimeout(close, opts.ms || (typeof opts.undo === 'function' ? 6000 : 3200));
    return { close: close };
  }

  /* ---------------- shared bits ---------------- */
  const AV_COLORS = ['#0B7CFF', '#12D48A', '#7C6BF2', '#F5A524', '#E5484D', '#0A2E5F', '#0070BA'];
  function avatar(name) {
    const initials = String(name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return '<span class="avatar" style="background:' + AV_COLORS[h % AV_COLORS.length] + '">' + S.esc(initials) + '</span>';
  }
  function badge(status) { return '<span class="badge ' + status + '">' + S.STATUS_LABEL[status] + '</span>'; }

  function barChart(months, rev, exp, currency) {
    const W = 520, H = 190, padL = 8, padB = 26, padT = 12;
    const max = Math.max(1, ...months.map((m) => Math.max(rev[m], exp[m])));
    const gw = (W - padL * 2) / months.length;
    const bw = Math.min(26, gw / 3);
    let bars = '';
    months.forEach((m, i) => {
      const x = padL + i * gw + gw / 2;
      const rh = (rev[m] / max) * (H - padB - padT), eh = (exp[m] / max) * (H - padB - padT);
      bars += '<rect x="' + (x - bw - 3) + '" y="' + (H - padB - rh) + '" width="' + bw + '" height="' + Math.max(2, rh) + '" rx="5" fill="url(#gBlue)"><title>Collected ' + S.fmtMoney(rev[m], currency) + '</title></rect>';
      bars += '<rect x="' + (x + 3) + '" y="' + (H - padB - eh) + '" width="' + bw + '" height="' + Math.max(2, eh) + '" rx="5" fill="#DCE6F2"><title>Expenses ' + S.fmtMoney(exp[m], currency) + '</title></rect>';
      bars += '<text x="' + x + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#8A97A8" font-weight="600">' + S.monthLabel(m) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto"><defs><linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2FA8FF"/><stop offset="1" stop-color="#0B7CFF"/></linearGradient></defs>' + bars + '</svg>';
  }
  function donut(counts) {
    const entries = Object.entries(counts).filter(([, v]) => v > 0);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const colors = { paid: '#12D48A', sent: '#0B7CFF', viewed: '#7C6BF2', overdue: '#E5484D', partial: '#F5A524', draft: '#C7D3E0' };
    let a0 = -Math.PI / 2, arcs = '';
    entries.forEach(([k, v]) => {
      const a1 = a0 + (v / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = 60 + 44 * Math.cos(a0), y0 = 60 + 44 * Math.sin(a0);
      const x1 = 60 + 44 * Math.cos(a1), y1 = 60 + 44 * Math.sin(a1);
      arcs += '<path d="M ' + x0 + ' ' + y0 + ' A 44 44 0 ' + large + ' 1 ' + x1 + ' ' + y1 + '" stroke="' + colors[k] + '" stroke-width="16" fill="none"><title>' + S.STATUS_LABEL[k] + ': ' + v + '</title></path>';
      a0 = a1;
    });
    return '<svg viewBox="0 0 120 120" style="width:132px;height:132px">' + arcs + '<text x="60" y="57" text-anchor="middle" font-size="21" font-weight="800" fill="var(--ink,#0F1B2D)">' + total + '</text><text x="60" y="72" text-anchor="middle" font-size="9.5" fill="var(--faint,#8A97A8)" font-weight="700">INVOICES</text></svg>';
  }

  return { icon, go, start, render: rerender, dismissSplash, setTopbar, openModal, closeModal, confirmDialog, alertError, toast, copyText, avatar, badge, barChart, donut, applyTheme, themePref, isDark, setNavGuard, shortcutsModal, get route() { return route; }, VIEWS: (window.VIEWS = window.VIEWS || {}) };
})();
