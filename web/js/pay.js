/* SherPay public checkout — fills the invoice summary from the payment request row,
   then opens Paystack inline and verifies the transaction server-side. */
(function () {
  var qs = new URLSearchParams(location.search);
  var token = qs.get('t') || '';
  /* injected at build/deploy time by scripts/patch-pay-config.js */
  var SUPABASE_URL = '__SUPABASE_URL__';
  var SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';

  var $ = function (id) { return document.getElementById(id); };
  var row = null;

  function fail(msg) {
    $('err').textContent = msg;
    $('err').style.display = 'block';
    $('paybtn').disabled = true;
    $('paybtn').textContent = 'Unavailable';
  }
  function money(v, cur) {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(v); }
    catch (e) { return cur + ' ' + (+v).toFixed(2); }
  }

  if (!token) { fail('This payment link is incomplete.'); return; }

  fetch(SUPABASE_URL + '/rest/v1/payment_requests?token=eq.' + encodeURIComponent(token) + '&select=*', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
  })
    .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(function (list) {
      row = list && list[0];
      if (!row) return fail('Payment link not found or expired.');
      render();
    })
    .catch(function () { fail('Could not load this payment link. Check your connection and try again.'); });

  function render() {
    var p = row.payload || {};
    var inv = p.invoice || {};
    var biz = p.business || {};
    var cur = inv.currency || row.currency || 'GHS';
    var balance = p.totals ? p.totals.balance : 0;
    $('num').textContent = (inv.number || 'Invoice') + (p.client ? ' · ' + p.client : '');
    $('amt').innerHTML = row.status === 'paid'
      ? money(row.amount_paid || balance, cur) + '<span class="badge">Paid</span>'
      : money(balance, cur);
    $('items').innerHTML = (inv.items || []).map(function (it) {
      return '<div class="row"><span>' + (it.desc || 'Item') + (it.qty > 1 ? ' × ' + it.qty : '') + '</span><b>' + money((it.qty || 1) * (it.price || 0), cur) + '</b></div>';
    }).join('');
    $('biz').textContent = biz.name || '—';
    $('due').textContent = inv.dueDate || '—';
    $('total').textContent = money(row.status === 'paid' ? (p.totals ? p.totals.total : 0) : balance, cur);
    $('rows').hidden = false;
    var btn = $('paybtn');
    if (row.status === 'paid') {
      btn.textContent = 'Already paid — thank you!';
      btn.disabled = true;
      $('badge').hidden = false;
      return;
    }
    btn.disabled = false;
    btn.textContent = 'Pay ' + money(balance, cur);
    btn.addEventListener('click', startPayment);
  }

  function startPayment() {
    var p = row.payload || {};
    var inv = p.invoice || {};
    var cur = inv.currency || 'GHS';
    var balance = p.totals ? p.totals.balance : 0;
    var pk = p.paystackPublicKey;
    if (!pk) { fail('Online payments are not configured yet. Please pay via the bank/mobile money details on your invoice.'); return; }
    var email = (p.client && p.client.email) ||
      'billing@' + String((p.business && p.business.name) || 'client').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) + '.com';
    var handler = PaystackPop.setup({
      key: pk,
      email: email,
      amount: Math.round(balance * 100),
      currency: cur,
      reference: 'SHERPAY-' + token.slice(0, 8) + '-' + Date.now(),
      metadata: { invoice: inv.number || '', token: token },
      callback: function (resp) { verify(resp.reference); },
      onClose: function () { /* user can reopen the link to retry */ }
    });
    handler.openIframe();
  }

  function verify(reference) {
    var btn = $('paybtn');
    btn.disabled = true;
    btn.textContent = 'Confirming payment…';
    fetch(SUPABASE_URL + '/functions/v1/pay-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ token: token, reference: reference })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.status === 'paid') {
          btn.textContent = 'Payment confirmed — thank you!';
          $('amt').innerHTML = money(row.payload.totals.balance, row.payload.invoice.currency || 'GHS') + '<span class="badge">Paid</span>';
          $('badge').hidden = false;
          setTimeout(function () { location.reload(); }, 2200);
        } else {
          fail('We could not confirm this payment. If you were debited, contact the business with reference ' + reference + '.');
        }
      })
      .catch(function () {
        fail('Confirmation is taking longer than usual. If you were debited, the business will see your payment shortly (ref ' + reference + ').');
      });
  }
})();
