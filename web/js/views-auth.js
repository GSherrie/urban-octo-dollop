/* ============ SherPay auth: animated splash hand-off + login / signup screen ============ */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;

  /* Rendered by UI.start() whenever there is no active session.
     Replaces the whole #app shell; on success hands control back to UI.start(). */
  UI.VIEWS.auth = function () {
    let mode = 'login'; // 'login' | 'signup'
    let busy = false;

    function field(id, label, type, opts) {
      opts = opts || {};
      return '<div><label class="f" for="' + id + '">' + label + '</label>' +
        '<div class="auth-input">' +
        '<span class="auth-ico">' + icon(opts.ico || 'lock') + '</span>' +
        '<input id="' + id + '" class="input" type="' + type + '" placeholder="' + opts.ph + '" autocomplete="' + opts.ac + '"' + (opts.required === false ? '' : ' required') + '>' +
        (opts.toggle ? '<button type="button" class="auth-eye" data-action="toggle-pw" title="Show password" aria-label="Show password">' + icon('eye') + '</button>' : '') +
        '</div></div>';
    }

    function formHtml() {
      if (mode === 'signup') {
        return field('au-name', 'Full name', 'text', { ico: 'clients', ph: 'Ama Owusu', ac: 'name' }) +
          field('au-email', 'Email', 'email', { ico: 'mail', ph: 'you@business.com', ac: 'email' }) +
          field('au-pass', 'Password', 'password', { ico: 'lock', ph: 'At least 8 characters', ac: 'new-password', toggle: true }) +
          '<div class="auth-check"><label><input type="checkbox" id="au-terms"> I agree to the <button type="button" class="auth-link" data-legal="tos">Terms</button> &amp; <button type="button" class="auth-link" data-legal="privacy">Privacy Policy</button></label></div>' +
          '<button class="btn primary auth-submit" id="au-go" type="submit">' + icon('check') + 'Create account</button>' +
          '<div class="auth-swap">Already have an account? <button type="button" class="auth-link" data-action="mode" data-m="login">Log in</button></div>';
      }
      return field('au-email', 'Email', 'email', { ico: 'mail', ph: 'you@business.com', ac: 'email' }) +
        field('au-pass', 'Password', 'password', { ico: 'lock', ph: 'Your password', ac: 'current-password', toggle: true }) +
        '<div class="auth-check"><label><input type="checkbox" id="au-remember" checked> Remember me</label><button type="button" class="auth-link" data-action="forgot">Forgot password?</button></div>' +
        '<button class="btn primary auth-submit" id="au-go" type="submit">' + icon('lock') + (S.Auth.count() ? 'Log in' : 'Log in') + '</button>' +
        '<div class="auth-swap">Don\'t have an account? <button type="button" class="auth-link" data-action="mode" data-m="signup">Sign up</button></div>';
    }

    function headline() {
      return mode === 'signup'
        ? { h: 'Create your account', p: 'Start invoicing in under a minute — free.' }
        : { h: 'Welcome back', p: 'Log in to your SherPay workspace.' };
    }

    /* accounts saved on this device -> quick-pick chips at the top right */
    function acctsHtml() {
      let users = [];
      try { users = S.Auth.list ? S.Auth.list() : []; } catch (e) { users = []; }
      if (!users.length) return '';
      return '<span class="auth-accts-label">Accounts on this device</span>' +
        users.slice(0, 3).map((u) =>
          '<button type="button" class="auth-acct" data-email="' + esc(u.email) + '" title="Use this account">' +
            UI.avatar(u.name) + '<span>' + esc(String(u.name || u.email).split(' ')[0]) + '</span>' +
          '</button>').join('');
    }

    function bindAccts() {
      document.querySelectorAll('.auth-acct').forEach((b) => b.addEventListener('click', () => {
        mode = 'login';
        document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('on', t.dataset.m === 'login'));
        paintForm();
        const em = document.getElementById('au-email');
        if (em) em.value = b.dataset.email || '';
        document.querySelectorAll('.auth-acct').forEach((x) => x.classList.toggle('on', x === b));
        const pw = document.getElementById('au-pass');
        if (pw) pw.focus();
      }));
    }

    function paintForm() {
      const root = document.getElementById('auth-card');
      const hd = headline();
      root.querySelector('#auth-form').innerHTML =
        '<div class="auth-head"><h1>' + hd.h + '</h1><p>' + hd.p + '</p></div>' +
        '<div class="auth-err" id="auth-err" hidden></div>' +
        '<form id="auth-form-el" novalidate>' + formHtml() + '</form>';
      bindForm();
      const first = root.querySelector(mode === 'signup' ? '#au-name' : '#au-email');
      if (first) first.focus();
    }

    function showErr(msg) {
      const el = document.getElementById('auth-err');
      el.textContent = msg;
      el.hidden = false;
      el.classList.remove('shake');
      void el.offsetWidth; // restart animation
      el.classList.add('shake');
    }

    function bindForm() {
      const root = document.getElementById('auth-card');
      root.querySelectorAll('[data-action="mode"]').forEach((b) => b.addEventListener('click', () => {
        mode = b.dataset.m;
        root.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('on', t.dataset.m === mode));
        paintForm();
      }));
      root.querySelectorAll('[data-action="toggle-pw"]').forEach((b) => b.addEventListener('click', () => {
        const inp = b.parentElement.querySelector('input');
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.classList.toggle('on', show);
        b.setAttribute('title', show ? 'Hide password' : 'Show password');
      }));
      root.querySelectorAll('[data-legal]').forEach((b) => b.addEventListener('click', () => {
        const texts = {
          tos: ['Terms of Service', '<p class="muted small">SherPay is a local-first invoicing tool: your data stays on your device. You are responsible for the accuracy and legality of the invoices you issue, and for keeping your device and credentials secure. SherPay does not process payments and does not provide accounting, legal or tax advice. Full terms are available inside the app under Account → About → Terms of Service.</p>'],
          privacy: ['Privacy Policy', '<p class="muted small">SherPay stores everything — invoices, clients, expenses, settings and login — only in your browser’s local storage on this device. Nothing is sent to us, no cookies or trackers are used, and no data is ever sold. You can export or permanently erase all of your data at any time from inside the app (Account → Data &amp; privacy). Full policy: Account → About → Privacy Policy.</p>']
        };
        const t = texts[b.dataset.legal] || texts.tos;
        UI.openModal({ title: t[0], body: t[1], footer: '<button class="btn ghost" data-action="close-modal">Close</button>' });
      }));
      const forgot = root.querySelector('[data-action="forgot"]');
      if (forgot) forgot.addEventListener('click', async () => {
        const email = (root.querySelector('#au-email') || {}).value || '';
        if (!email.trim()) { showErr('Enter your email above first, then tap Forgot password.'); return; }
        const res = await S.Auth.sendReset(email);
        showErr(res && res.ok
          ? 'Reset link sent to ' + email + ' — check your inbox (and spam).'
          : (res && res.error || 'Could not send a reset link right now.'));
      });
      root.querySelector('#auth-form-el').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;
        const err = document.getElementById('auth-err');
        if (err) err.hidden = true;
        const g = (id) => { const el = root.querySelector('#' + id); return el ? el.value : ''; };
        let res;
        if (mode === 'signup') {
          if (!g('au-name').trim()) return showErr('Please enter your name.');
          if (!g('au-email').trim()) return showErr('Please enter your email.');
          if (!root.querySelector('#au-terms').checked) return showErr('Please accept the Terms & Privacy Policy to continue.');
          res = await S.Auth.signup({ name: g('au-name'), email: g('au-email'), password: g('au-pass') });
          if (res && res.needsConfirmation) return showErr(res.message);
        } else {
          if (!g('au-email').trim()) return showErr('Please enter your email.');
          if (!g('au-pass')) return showErr('Please enter your password.');
          res = await S.Auth.login({ email: g('au-email'), password: g('au-pass'), remember: root.querySelector('#au-remember').checked });
        }
        if (res.error) return showErr(res.error);
        busy = true;
        const btn = root.querySelector('#au-go');
        btn.disabled = true;
        btn.innerHTML = icon('check') + 'Welcome, ' + esc(res.user.name.split(' ')[0]) + '…';
        setTimeout(() => UI.start(), 550);
      });
    }

    return {
      title: 'SherPay — Log in',
      html:
        '<div class="auth-wrap">' +
          '<div class="auth-top">' +
            '<div class="auth-top-brand"><img src="assets/logo.png" alt="SherPay"><span>SherPay</span></div>' +
            '<div class="auth-accts">' + acctsHtml() + '</div>' +
          '</div>' +
          '<div class="auth-card card" id="auth-card">' +
            '<div class="auth-brand"><img src="assets/logo.png" alt="SherPay logo" class="auth-logo"><div class="auth-name">SherPay</div><div class="auth-tag">Invoice · Get paid</div></div>' +
            '<div class="auth-tabs">' +
              '<button class="auth-tab' + (mode === 'login' ? ' on' : '') + '" data-action="mode" data-m="login" type="button">Log in</button>' +
              '<button class="auth-tab' + (mode === 'signup' ? ' on' : '') + '" data-action="mode" data-m="signup" type="button">Sign up</button>' +
            '</div>' +
            '<div id="auth-form"></div>' +
            '<div class="auth-foot">' + icon('lock') + (S.cloud.enabled() ? ' Cloud sync on — your account &amp; workspace follow your email on any device.' : ' Accounts &amp; data stay on this device — offline-first, nothing leaves your browser.') + '</div>' +
          '</div>' +
        '</div>',
      mount: (root) => { paintForm(); bindAccts(); }
    };
  };
})();