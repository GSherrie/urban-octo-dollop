/* SherPay public upgrade checkout — buys SherPay Pro with Ghana mobile money.
   ==========================================================================
   This page never sees a Paystack key and never decides a price. It collects a
   wallet, a number and an email, asks the momo-upgrade function to open an
   order, and is handed back a PAYMENT REFERENCE. Everything after that is the
   reference: shown to the customer, written into the URL so a closed tab can be
   reopened, and polled until the money is confirmed. A reference is the only
   handle a customer has if their phone dies mid-approval, which is why it is the
   biggest thing on screen at exactly the moment they might need it.

   Backend config, resolved in priority order (same shape as js/pay.js):
     1. values injected by scripts/patch-pay-config.js from .env.payments;
     2. the committed defaults — the same publishable values js/store.js ships.
   Publishable/anon only: the Paystack secret key lives in the edge function's
   secrets and never reaches a browser. */
(function () {
  var qs = new URLSearchParams(location.search);
  var DEFAULT_SUPABASE_URL = 'https://jmmrcrnfwyrbejhechke.supabase.co';
  var DEFAULT_SUPABASE_ANON = 'sb_publishable_S_HPkVny_wM-PQ4PRqXC4w_C3ufIsH8';
  function resolvePayConfig(injected, fallback) {
    if (typeof injected === 'string' && injected && injected.indexOf('__') !== 0) return injected;
    return fallback || '';
  }
  var SUPABASE_URL = resolvePayConfig('__SUPABASE_URL__', DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  var SUPABASE_ANON_KEY = resolvePayConfig('__SUPABASE_ANON_KEY__', DEFAULT_SUPABASE_ANON);
  var FN = SUPABASE_URL + '/functions/v1/momo-upgrade';

  /* Prices mirrored from supabase/functions/momo-upgrade/core.mjs — the suite
     fails if the two drift, and the server's price is charged regardless of
     what this one claims. */
  var PLANS = { pro: { price: 49, months: 12, currency: 'GHS', title: 'SherPay Pro' } };
  var WALLETS = [
    { id: 'mtn', label: 'MTN MoMo', hint: '024 025 055', prefix: ['024', '025', '053', '054', '055', '059'] },
    { id: 'telecel', label: 'Telecel Cash', hint: '020 050', prefix: ['020', '050'] },
    { id: 'at', label: 'AT Money', hint: '026 097 098', prefix: ['026', '027', '056', '057', '096', '097', '098'] }
  ];
  var WALLET_NAME = { mtn: 'MTN Mobile Money', telecel: 'Telecel Cash', at: 'AirtelTigo Money' };
  var POLL_MS = 3000;        // a wallet prompt waits on a human, not a machine
  var POLL_MAX = 60;         // ≈3 minutes, matching the gateway's own TTL
  var TERMINAL = ['paid', 'failed', 'expired'];

  var $ = function (id) { return document.getElementById(id); };
  var state = { ref: '', status: '', timer: null, tries: 0, order: null, plan: 'pro', billing: 'monthly' };

  function money(v, cur) {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'GHS', maximumFractionDigits: 2 }).format(v); }
    catch (e) { return 'GH\u20B5 ' + (+v || 0).toFixed(2); }
  }
  function fail(msg) { var e = $('err'); e.textContent = msg; e.style.display = 'block'; }
  function clearFail() { $('err').style.display = 'none'; $('err').textContent = ''; }
  function show(which) {
    $('momoform').hidden = which !== 'form';
    $('await').hidden = which !== 'await';
    $('done').hidden = which !== 'done';
    if (which !== 'await') stopPolling();
  }
  function stopPolling() { if (state.timer) { clearTimeout(state.timer); state.timer = null; } }

  /* Local mirror of the server's number rules. It exists to catch a typo before
     a network round trip, not to be an authority: issueOrder re-validates and
     can still refuse a number this page let through. */
  function normalizeNumber(input, providerId) {
    var raw = String(input == null ? '' : input).replace(/[()\s.\-]/g, '');
    if (!raw) return { ok: false, error: 'Enter the mobile money number to pay from.' };
    if (/[^\d+]/.test(raw)) return { ok: false, error: 'A mobile money number contains digits only.' };
    var digits = raw.replace(/^\+/, '').replace(/^00/, '');
    if (digits.indexOf('233') === 0 && digits.length === 12) digits = digits.slice(3);
    if (digits.length === 9 && digits.charAt(0) !== '0') digits = '0' + digits;
    if (!/^0\d{9}$/.test(digits)) return { ok: false, error: 'Enter a valid Ghana number, e.g. 024 555 0110.' };
    var wallet = null, i;
    for (i = 0; i < WALLETS.length; i++) if (WALLETS[i].id === providerId) wallet = WALLETS[i];
    return { ok: true, local: digits, error: '', wallet: wallet ? wallet.id : '' };
  }

  function price() {
    var p = PLANS[state.plan] || PLANS.pro;
    return { amount: p.price, currency: p.currency || 'GHS', title: p.title || 'SherPay Pro', months: p.months || 12 };
  }

  function renderForm() {
    var p = price();
    $('num').textContent = p.title + ' \u00b7 one-time payment';
    $('amt').textContent = money(p.amount, p.currency) + ' for ' + p.months + ' months';
    $('cycle').textContent = 'One-time \u00b7 no auto-debit';
    $('price').textContent = money(p.amount, p.currency) + ' once';
    $('due').textContent = money(p.amount, p.currency);
    $('wallets').innerHTML = WALLETS.map(function (w, i) {
      return '<label class="wallet"><input type="radio" name="provider" value="' + w.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<b>' + w.label + '</b><span>' + w.hint + '</span></label>';
    }).join('');
    Array.prototype.forEach.call($('wallets').querySelectorAll('input'), function (inp) {
      inp.addEventListener('change', hintNumber);
    });
    if (qs.get('email')) $('email').value = qs.get('email');
    $('paybtn').disabled = false;
    $('paybtn').textContent = 'Pay ' + money(p.amount, p.currency) + ' with Mobile Money';
    show('form');
  }

  /* The soft warning: a number whose prefix belongs to a different wallet than
     the one picked is usually a wrong pick, and saying so now is cheaper than a
     declined charge. A hint, never a block — numbers get ported. */
  function hintNumber() {
    var picked = (document.querySelector('input[name=provider]:checked') || {}).value || '';
    var n = normalizeNumber($('number').value, picked);
    var hint = $('numhint');
    hint.className = 'hint';
    if (!n.ok) { hint.textContent = $('number').value ? n.error : ''; return n; }
    var expect = null, owner = null, i, j;
    for (i = 0; i < WALLETS.length; i++) if (WALLETS[i].id === picked) expect = WALLETS[i];
    for (i = 0; i < WALLETS.length; i++) {
      for (j = 0; j < WALLETS[i].prefix.length; j++) if (n.local.indexOf(WALLETS[i].prefix[j]) === 0) owner = WALLETS[i];
    }
    if (owner && expect && owner.id !== expect.id) {
      hint.className = 'hint warn';
      hint.textContent = 'That looks like an ' + owner.label + ' number. Check you picked the right wallet.';
    } else hint.textContent = '';
    return n;
  }

  /* The reference outlives this page: the app shell reads the same key on next
     open to finish the job (toast + Pro badge), so a customer who pays and never
     comes back here still gets their plan. Same key and shape as js/store.js. */
  var RESUME_KEY = 'sherpay_upgrades_v1';
  function remember(order) {
    try {
      var list = JSON.parse(localStorage.getItem(RESUME_KEY) || '[]');
      var keep = list.filter(function (r) { return r && r.ref !== order.ref; });
      keep.unshift({
        ref: order.ref, status: order.status || 'pending', plan: order.plan || 'pro',
        billing: order.billing || 'annual', amount: order.amount || 0, currency: order.currency || 'GHS',
        provider: order.provider || '', account: order.account || '', checkout_url: order.checkout_url || '',
        at: Date.now()
      });
      localStorage.setItem(RESUME_KEY, JSON.stringify(keep.slice(0, 8)));
    } catch (e) { /* private mode: the URL still carries the reference */ }
  }

  /* One place turns an order into pixels, whether it arrived from /init, from a
     poll, or from a reopened ?ref= link — so a resumed page cannot render a
     different truth than a live one. */
  function applyOrder(order) {
    if (!order) return;
    state.order = order;
    state.ref = order.ref || state.ref;
    state.status = order.status || '';
    remember(order);
    if (order.ref) {
      $('refval').textContent = order.ref;
      try { history.replaceState(null, '', location.pathname + '?ref=' + encodeURIComponent(order.ref)); } catch (e) {}
    }
    if (order.status === 'paid') {
      $('badge').hidden = false;
      $('donemsg').textContent = 'Paid ' + money(order.amount_paid || order.amount, order.currency) + ' \u2014 SherPay Pro is unlocked.';
      $('donenote').textContent = 'Reference ' + order.ref + '. Open SherPay on this account and Pro is already on.';
      $('amt').textContent = 'Thank you';
      show('done');
      return;
    }
    if (order.status === 'failed' || order.status === 'expired') {
      renderForm();
      fail(order.message || (order.status === 'expired'
        ? 'That payment request expired. Nothing was taken \u2014 send it again.'
        : 'That payment did not go through. Nothing was taken.'));
      return;
    }
    $('wal').textContent = WALLET_NAME[order.provider] || order.provider || '\u2014';
    $('acct').textContent = order.account || '\u2014';
    $('sum').textContent = money(order.amount, order.currency);
    $('awaitmsg').textContent = order.message || 'Waiting for you to approve the payment on your phone\u2026';
    var url = order.checkout_url || '';
    $('fallbackwrap').hidden = !url;
    if (url) $('fallback').href = url;
    show('await');
    if (!state.timer) schedulePoll();
  }

  function call(payload) {
    return fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, body: b || {} }; });
    });
  }

  function schedulePoll(delay) {
    if (state.timer) return;
    state.timer = setTimeout(function () { state.timer = null; poll(); }, delay || POLL_MS);
  }

  /* Waiting is the normal state here, so a status read that fails is reported
     as "still waiting" and retried with backoff — never as a failed payment.
     Only the provider, through settle(), gets to say the money did not come. */
  function poll() {
    if (!state.ref) return;
    if (state.tries >= POLL_MAX) {
      $('awaitmsg').textContent = 'Still waiting. Keep this page open, or quote reference ' + state.ref + ' to support.';
      return;
    }
    state.tries++;
    call({ action: 'status', ref: state.ref })
      .then(function (res) {
        if (res.ok && res.body.ok && res.body.order) { applyOrder(res.body.order); return; }
        waiting();
      })
      .catch(function () { waiting(); });
  }
  function waiting() {
    state.backoff = Math.min((state.backoff || POLL_MS) * 2, 15000);
    $('awaitmsg').textContent = 'Still waiting for your approval on ' + ($('wal').textContent || 'your phone') + '\u2026';
    schedulePoll(state.backoff);
  }

  function start(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    clearFail();
    var picked = (document.querySelector('input[name=provider]:checked') || {}).value || '';
    var n = normalizeNumber($('number').value, picked);
    if (!n.ok) { fail(n.error); $('number').focus(); return; }
    var email = String($('email').value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { fail('Enter the email your SherPay account uses.'); $('email').focus(); return; }

    var btn = $('paybtn'), label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending to your wallet\u2026';
    state.tries = 0; state.backoff = POLL_MS; state.ref = '';
    call({ action: 'init', email: email, plan: state.plan, billing: 'annual', provider: picked, number: n.local })
      .then(function (res) {
        btn.disabled = false; btn.textContent = label;
        var b = res.body;
        if (res.ok && b.ok && b.order) {
          if (b.hint) { $('numhint').className = 'hint warn'; $('numhint').textContent = b.hint; }
          applyOrder(b.order);
          return;
        }
        fail(b.error || 'Could not start the payment. Please try again.');
      })
      .catch(function () { btn.disabled = false; btn.textContent = label; fail('Could not reach SherPay. Check your connection and try again.'); });
  }

  /* Exposed for tests and for the app shell; nothing here talks to Paystack
     directly, so nothing here can spend money. */
  window.Upgrade = {
    PLANS: PLANS, WALLETS: WALLETS, FN: FN, state: state,
    config: function () { return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, fn: FN }; },
    normalizeNumber: normalizeNumber, applyOrder: applyOrder, start: start, poll: poll
  };

  if (qs.get('billing')) state.billing = qs.get('billing') === 'annual' ? 'annual' : 'monthly';
  if (qs.get('plan') && PLANS[qs.get('plan')]) state.plan = qs.get('plan');
  renderForm();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    $('paybtn').disabled = true;
    $('paybtn').textContent = 'Unavailable';
    fail('Upgrades are not available right now. Please try again later.');
    return;
  }

  $('momoform').addEventListener('submit', start);
  $('number').addEventListener('input', hintNumber);
  $('retry').addEventListener('click', function () { clearFail(); state.ref = ''; state.tries = 0; renderForm(); });
  $('backlink').addEventListener('click', function () { location.href = 'index.html?upgraded=1'; });
  $('copyref').addEventListener('click', function () {
    var btn = $('copyref');
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy reference'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(state.ref).then(done, done);
    else done();
  });

  /* ?ref= is not a nicety — it is how a customer who closed the tab (or whose
     handset died mid-approval) gets their order back. The provider is asked for
     the truth; the URL only carries the handle. */
  var resume = qs.get('ref') || '';
  if (resume) {
    state.ref = resume;
    $('refval').textContent = resume;
    show('await');
    poll();
  }
})();