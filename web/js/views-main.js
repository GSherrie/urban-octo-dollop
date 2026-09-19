/* ============ SherPay views: Dashboard, Invoices list, Client invoice view, Receipt ============ */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;

  /* ================= DASHBOARD ================= */
  UI.VIEWS.dashboard = function () {
    const k = S.kpis();
    const cur = S.db.settings.currency;
    const mb = S.moneyByMonth();
    const counts = { draft: 0, sent: 0, viewed: 0, paid: 0, overdue: 0, partial: 0 };
    S.db.invoices.forEach((i) => counts[S.displayStatus(i)]++);
    const outstanding = S.db.invoices
      .filter((i) => !['paid', 'draft'].includes(S.displayStatus(i)))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const act = S.db.activity.slice(0, 7);
    const actIcon = { paid: ['wallet', 'var(--green-soft)', 'var(--green-dark)'], receipt: ['file', 'var(--green-soft)', 'var(--green-dark)'], viewed: ['eye', 'var(--violet-soft)', '#5B4BD1'], sent: ['send', 'var(--blue-soft)', '#0662C4'], reminder: ['bell', 'var(--amber-soft)', '#A56A00'], recurring: ['repeat', 'var(--blue-soft)', '#0662C4'], scan: ['scan', 'var(--blue-soft)', '#0662C4'] };

    return {
      title: 'Dashboard',
      sub: 'Business health at a glance — ' + new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      topActions: '<button class="btn ghost" data-action="scan">' + icon('scan') + '<span class="hide-sm">Scan receipt</span></button><button class="btn primary" data-action="new-invoice">' + icon('plus') + 'New invoice</button>',
      html:
        '<div class="grid kpis">' +
          '<div class="card kpi accent-blue"><div class="lab">' + icon('wallet') + 'Outstanding</div><div class="val">' + S.fmtMoney(k.outstanding, cur) + '</div><div class="delta">' + outstanding.length + ' open invoice' + (outstanding.length === 1 ? '' : 's') + '</div></div>' +
          '<div class="card kpi accent-green"><div class="lab">' + icon('check') + 'Collected this month</div><div class="val">' + S.fmtMoney(k.paidMonth, cur) + '</div><div class="delta">across all currencies (base ' + cur + ')</div></div>' +
          '<div class="card kpi"><div class="lab">' + icon('expenses') + 'Expenses this month</div><div class="val">' + S.fmtMoney(k.expMonth, cur) + '</div><div class="delta">' + S.db.expenses.filter((e) => S.monthKey(e.date) === S.monthKey(S.todayISO())).length + ' receipts logged</div></div>' +
          '<div class="card kpi ' + (k.net >= 0 ? 'accent-green' : 'accent-red') + '"><div class="lab">' + icon('reports') + 'Net profit (month)</div><div class="val">' + S.fmtMoney(k.net, cur) + '</div><div class="delta">revenue − expenses</div></div>' +
        '</div>' +
        '<div class="grid two mt2">' +
          '<div class="card"><div class="card-h"><h3>Cash flow — last 6 months</h3><div class="spacer"></div><span class="chip" style="border:none;background:var(--blue-soft);color:var(--navy-700)">■ Collected</span><span class="chip" style="border:none;background:#EDF1F6;color:var(--muted)">■ Spent</span></div><div class="card-b">' + UI.barChart(mb.months, mb.rev, mb.exp, cur) + '</div></div>' +
          '<div class="card"><div class="card-h"><h3>Pipeline</h3></div><div class="card-b row wrap" style="gap:18px">' + UI.donut(counts) +
            '<div class="grid" style="gap:7px;flex:1">' + Object.entries(counts).map(([kk, v]) => '<div class="row small"><span class="badge ' + kk + '" style="min-width:86px;justify-content:center">' + S.STATUS_LABEL[kk] + '</span><b class="tnum">' + v + '</b></div>').join('') + '</div></div></div>' +
        '</div>' +
        '<div class="grid two mt2">' +
          '<div class="card"><div class="card-h"><h3>Awaiting payment</h3><div class="spacer"></div>' + (k.overdueCount ? '<span class="badge overdue">' + k.overdueCount + ' overdue</span>' : '') + '</div>' +
            (outstanding.length ? outstanding.slice(0, 6).map((i) => {
              const c = S.getClient(i.clientId), t = S.computeTotals(i), st = S.displayStatus(i);
              const dd = S.daysBetween(S.todayISO(), i.dueDate);
              return '<div class="list-row"><div data-action="open-invoice" data-id="' + i.id + '" style="display:flex;align-items:center;gap:12px;flex:1;cursor:pointer">' + UI.avatar(c ? c.name : '?') +
                '<div style="flex:1;min-width:0"><b class="small">' + esc(i.number) + ' · ' + esc(c ? c.name : '') + '</b><div class="tiny muted">Due ' + S.fmtDate(i.dueDate) + ' · ' + (dd < 0 ? Math.abs(dd) + ' days overdue' : dd === 0 ? 'due today' : dd + ' days left') + '</div></div>' +
                '<div style="text-align:right"><div class="tnum small">' + S.fmtMoney(t.balance, i.currency) + '</div>' + UI.badge(st) + '</div></div></div>';
            }).join('') : '<div class="empty">' + icon('check') + '<b>Nothing outstanding</b>Every invoice is settled. Lovely.</div>') +
          '</div>' +
          '<div class="card"><div class="card-h"><h3>Activity</h3><div class="spacer"></div><span class="tiny muted">auto-logged</span></div>' +
            (act.length ? act.map((a) => { const m = actIcon[a.type] || ['bell', 'var(--blue-soft)', '#0662C4']; return '<div class="act-item"><span class="ico" style="background:' + m[1] + ';color:' + m[2] + '">' + icon(m[0]) + '</span><div style="flex:1">' + esc(a.message) + '<div><time>' + S.fmtDateTime(a.ts) + '</time></div></div></div>'; }).join('') : '<div class="empty">No activity yet</div>') +
          '</div>' +
        '</div>',
      actions: {
        'new-invoice': () => { location.hash = '#/invoices/new'; },
        scan: () => UI.VIEWS.expenses.__scan(),
        'open-invoice': (d) => { location.hash = '#/i/' + d.id; }
      }
    };
  };

  /* ================= INVOICES LIST ================= */
  UI.VIEWS.invoices = function () {
    let q = '', status = 'all';
    function rows() {
      return S.db.invoices.filter((i) => {
        const c = S.getClient(i.clientId), t = S.computeTotals(i);
        const hay = (i.number + ' ' + (c ? c.name + ' ' + (c.contact || '') : '') + ' ' + t.total).toLowerCase();
        return (status === 'all' || S.displayStatus(i) === status) && (!q || hay.includes(q.toLowerCase()));
      });
    }
    function tableHtml() {
      const list = rows();
      if (!list.length) return '<div class="empty">' + icon('invoice') + '<b>No invoices match</b>Try a different search or filter, or create a new invoice.</div>';
      return '<div class="scroll-x"><table class="table"><thead><tr><th>Invoice</th><th>Client</th><th class="hide-sm">Issued</th><th>Due</th><th>Status</th><th class="right">Total</th><th class="right hide-sm">Balance</th><th></th></tr></thead><tbody>' +
        list.map((i) => {
          const c = S.getClient(i.clientId), t = S.computeTotals(i), st = S.displayStatus(i);
          return '<tr class="clickable" data-action="open-invoice" data-id="' + i.id + '">' +
            '<td><b>' + esc(i.number) + '</b>' + (i.recurring ? ' <span title="Recurring">' + icon('repeat') + '</span>' : '') + '</td>' +
            '<td><div class="row" style="gap:9px">' + UI.avatar(c ? c.name : '?') + '<span class="hide-sm">' + esc(c ? c.name : '—') + '</span></div></td>' +
            '<td class="hide-sm muted small">' + S.fmtDate(i.issueDate) + '</td>' +
            '<td class="small">' + S.fmtDate(i.dueDate) + '</td>' +
            '<td>' + UI.badge(st) + '</td>' +
            '<td class="right tnum small">' + S.fmtMoney(t.total, i.currency) + '</td>' +
            '<td class="right tnum small hide-sm">' + (t.balance > 0 ? S.fmtMoney(t.balance, i.currency) : '—') + '</td>' +
            '<td class="right" style="white-space:nowrap">' +
              (st === 'draft' ? '<button class="btn sm ghost" data-action="send" data-id="' + i.id + '">' + icon('send') + 'Send</button>' : '') +
              (st !== 'paid' && st !== 'draft' ? '<button class="btn sm green" data-action="pay" data-id="' + i.id + '">' + icon('wallet') + '<span class="hide-sm">Payment</span></button>' : '') +
              '<button class="btn sm icon ghost" title="Edit" data-action="edit" data-id="' + i.id + '">' + icon('edit') + '</button>' +
            '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return {
      title: 'Invoices',
      sub: S.db.invoices.length + ' invoices · ' + S.db.invoices.filter((i) => S.displayStatus(i) === 'overdue').length + ' overdue',
      topActions: '<button class="btn primary" data-action="new-invoice">' + icon('plus') + 'New invoice</button>',
      html:
        '<div class="card"><div class="card-h" style="gap:9px;flex-wrap:wrap">' +
          '<div style="position:relative;flex:1;min-width:170px;max-width:330px"><input id="inv-q" class="input" style="padding-left:34px" placeholder="Search number, client, amount…"></div>' +
          '<div class="row wrap" id="inv-chips" style="gap:6px">' + ['all', 'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue'].map((s) => '<button class="chip' + (s === 'all' ? ' on' : '') + '" data-action="chip" data-s="' + s + '">' + (s === 'all' ? 'All' : S.STATUS_LABEL[s]) + '</button>').join('') + '</div>' +
          '<div class="spacer"></div><button class="btn ghost sm" data-action="csv">' + icon('download') + 'CSV</button>' +
        '</div><div id="inv-table">' + tableHtml() + '</div></div>',
      mount: (root) => {
        root.querySelector('#inv-q').addEventListener('input', (e) => { q = e.target.value; root.querySelector('#inv-table').innerHTML = tableHtml(); });
        root.querySelector('#inv-q').style.background = '#fff url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8A97A8" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>') + '") no-repeat 10px center / 16px';
      },
      actions: {
        'new-invoice': () => { location.hash = '#/invoices/new'; },
        chip: (d, el, root) => { status = d.s; document.querySelectorAll('#inv-chips .chip').forEach((c) => c.classList.toggle('on', c.dataset.s === d.s)); document.getElementById('inv-table').innerHTML = tableHtml(); },
        'open-invoice': (d) => { location.hash = '#/i/' + d.id; },
        edit: (d) => { location.hash = '#/invoices/' + d.id + '/edit'; },
        send: (d) => sendModal(d.id),
        pay: (d) => payModal(d.id),
        csv: () => {
          const rows = [['Number', 'Client', 'Status', 'Issued', 'Due', 'Currency', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Balance']];
          S.db.invoices.forEach((i) => { const c = S.getClient(i.clientId), t = S.computeTotals(i); rows.push([i.number, c ? c.name : '', S.STATUS_LABEL[S.displayStatus(i)], i.issueDate, i.dueDate, i.currency, t.sub.toFixed(2), t.disc.toFixed(2), t.tax.toFixed(2), t.total.toFixed(2), t.paid.toFixed(2), t.balance.toFixed(2)]); });
          S.download('sherpay-invoices-' + S.todayISO() + '.csv', S.toCSV(rows), 'text/csv');
          UI.toast('Invoices exported to CSV', 'green', 'download');
        }
      }
    };
  };

  /* ================= send modal ================= */
  function sendModal(id) {
    const inv = S.getInvoice(id); if (!inv) return;
    const c = S.getClient(inv.clientId), t = S.computeTotals(inv);
    // derive from href (not location.origin) so the link also works from
    // file:// (single-file offline build), where origin is the string "null"
    const link = location.href.split('#')[0] + '#/i/' + inv.id;
    UI.openModal({
      title: 'Send ' + inv.number,
      body: '<p class="small muted mb">Deliver a secure pay-link to <b>' + esc(c ? c.name : 'client') + '</b> — ' + S.fmtMoney(t.balance, inv.currency) + ' due. Opening the link marks the invoice <b>Viewed</b>; paying flips it to <b>Paid</b> and auto-issues a receipt.</p>' +
        '<div class="grid" style="gap:9px">' +
        '<button class="method on" data-action="ch" data-m="Email"><span class="mico" style="background:#0B7CFF">' + icon('mail') + '</span><span><b>Email</b><div class="tiny muted">' + esc(c ? c.email : '') + ' · branded pay-link + PDF</div></span></button>' +
        '<button class="method" data-action="ch" data-m="WhatsApp"><span class="mico" style="background:#25D366">' + icon('msg') + '</span><span><b>WhatsApp</b><div class="tiny muted">Share invoice link in chat</div></span></button>' +
        '<button class="method" data-action="ch" data-m="SMS / iMessage"><span class="mico" style="background:#7C6BF2">' + icon('msg') + '</span><span><b>SMS / iMessage</b><div class="tiny muted">' + esc(c ? c.phone : '') + '</div></span></button>' +
        '<div class="method" style="cursor:default"><span class="mico" style="background:#0A2E5F">' + icon('link') + '</span><span style="flex:1;min-width:0"><b class="tiny" style="word-break:break-all">' + link + '</b></span><button class="btn sm ghost" data-action="copylink">' + icon('copy') + 'Copy</button></div>' +
        '</div>' +
        '<div class="row mt" style="gap:8px">' + icon('bell') + '<span class="small muted">Reminders auto-send ' + S.db.settings.reminderDays.map((d) => d > 0 ? d + 'd before' : d === 0 ? 'on due date' : Math.abs(d) + 'd after').join(', ') + '.</span></div>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="do-send">' + icon('send') + 'Send invoice</button>',
      mount: (m) => {
        let channel = 'Email';
        m.querySelectorAll('[data-action="ch"]').forEach((b) => b.addEventListener('click', () => { channel = b.dataset.m; m.querySelectorAll('.method').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
        m.querySelector('[data-action="copylink"]').addEventListener('click', () => { UI.copyText(link).then((ok) => UI.toast(ok ? 'Pay-link copied' : 'Copy blocked — select the link manually', ok ? 'green' : 'red', 'link')); });
        m.querySelector('#do-send').addEventListener('click', () => {
          S.markSent(inv.id, channel);
          UI.closeModal(); UI.toast(inv.number + ' sent via ' + channel, 'green', 'send');
          UI.render();
        });
      }
    });
  }

  /* ================= pay modal ================= */
  function payModal(id) {
    const inv = S.getInvoice(id); if (!inv) return;
    const t = S.computeTotals(inv);
    UI.openModal({
      title: 'Record payment — ' + inv.number,
      body: '<div class="fgrid c2 mb"><div><label class="f">Amount (' + inv.currency + ')</label><input id="pm-amt" class="input" type="number" step="0.01" value="' + t.balance + '"></div><div><label class="f">Date</label><input id="pm-date" class="input" type="date" value="' + S.todayISO() + '"></div></div>' +
        '<label class="f">Method</label><div class="grid" style="gap:8px" id="pm-methods">' + S.PAY_METHODS.map((p, ix) => '<button class="method' + (ix === 0 ? ' on' : '') + '" data-m="' + p.id + '"><span class="mico" style="background:' + p.color + '">' + p.tag + '</span><span><b>' + p.label + '</b><div class="tiny muted">' + p.note + '</div></span></button>').join('') + '</div>' +
        '<p class="hint">Partial payments are supported — the invoice stays open with its balance until fully settled.</p>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn green" id="pm-save">' + icon('check') + 'Record payment</button>',
      mount: (m) => {
        let method = S.PAY_METHODS[0].id;
        m.querySelectorAll('#pm-methods .method').forEach((b) => b.addEventListener('click', () => { method = b.dataset.m; m.querySelectorAll('#pm-methods .method').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
        m.querySelector('#pm-save').addEventListener('click', () => {
          const res = S.recordPayment(inv.id, m.querySelector('#pm-amt').value, method, m.querySelector('#pm-date').value);
          UI.closeModal();
          if (!res) { UI.toast('Invalid amount', 'red'); return; }
          UI.toast(res.receipt ? 'Paid in full — receipt ' + res.receipt + ' issued' : 'Payment recorded — balance ' + S.fmtMoney(res.balance, inv.currency), 'green', 'wallet');
          UI.render();
        });
      }
    });
  }

  /* ================= CLIENT-FACING INVOICE ================= */
  UI.VIEWS.i = function (parts) {
    const inv = S.getInvoice(parts[1]);
    if (!inv) return { title: 'Not found', html: '<div class="empty">Invoice not found.</div>', actions: {} };
    S.markViewed(inv.id); // "Viewed" tracking when the pay-link is opened
    const c = S.getClient(inv.clientId), b = S.db.settings.business, t = S.computeTotals(inv), st = S.displayStatus(inv);
    const tpl = S.db.settings.template;
    const logo = b.logoDataUrl || 'assets/logo.png';
    document.title = inv.number + ' — SherPay';

    return {
      title: inv.number,
      sub: 'Client view · secure pay-link',
      topActions: '<button class="btn ghost" data-action="back">' + icon('chevron', 'flip') + '<span class="hide-sm">Back</span></button><button class="btn ghost" data-action="edit">' + icon('edit') + '<span class="hide-sm">Edit</span></button><button class="btn ghost" data-action="pdf">' + icon('print') + '<span class="hide-sm">PDF</span></button>' + (st !== 'paid' && st !== 'draft' ? '<button class="btn green" data-action="pay">' + icon('wallet') + '<span class="hide-sm">Payment</span></button>' : ''),
      html:
        '<div class="paper font-' + tpl.font + ' acc-' + tpl.accent + '" id="paper">' +
          '<div class="paper-top"><div class="paper-brand"><img src="' + logo + '" alt=""><div><div class="bn">' + esc(b.name) + '</div><div class="ba">' + esc(b.address) + '\n' + esc(b.email) + ' · ' + esc(b.phone) + '</div></div></div>' +
          '<div class="paper-title"><h2>INVOICE</h2><div class="pnum">' + esc(inv.number) + '</div><div class="mt">' + UI.badge(st) + '</div></div></div>' +
          '<div class="paper-meta">' +
            '<div><div class="k">Billed to</div><div class="v">' + esc(c ? c.name : '') + '\n' + esc(c ? c.contact || '' : '') + '\n' + esc(c ? c.address || '' : '') + '</div></div>' +
            '<div><div class="k">Issued</div><div class="v">' + S.fmtDate(inv.issueDate) + '</div></div>' +
            '<div><div class="k">Due</div><div class="v">' + S.fmtDate(inv.dueDate) + '</div></div>' +
            '<div><div class="k">Currency</div><div class="v">' + inv.currency + '</div></div>' +
          '</div>' +
          '<table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Amount</th></tr></thead><tbody>' +
          inv.items.map((it) => '<tr><td>' + esc(it.desc) + '</td><td class="right">' + it.qty + '</td><td class="right">' + S.fmtMoney(it.price, inv.currency) + '</td><td class="right tnum">' + S.fmtMoney(S.num(it.qty) * S.num(it.price), inv.currency) + '</td></tr>').join('') +
          '</tbody></table>' +
          '<div class="paper-totals"><table>' +
            '<tr><td>Subtotal</td><td class="right tnum">' + S.fmtMoney(t.sub, inv.currency) + '</td></tr>' +
            (t.disc ? '<tr><td>Discount' + (inv.discountMode === 'percent' ? ' (' + inv.discountValue + '%)' : '') + '</td><td class="right tnum">−' + S.fmtMoney(t.disc, inv.currency) + '</td></tr>' : '') +
            (t.tax ? '<tr><td>' + esc(S.db.settings.taxLabel) + (inv.taxMode === 'percent' ? ' (' + inv.taxValue + '%)' : '') + '</td><td class="right tnum">' + S.fmtMoney(t.tax, inv.currency) + '</td></tr>' : '') +
            '<tr class="grand"><td>Total due</td><td class="right tnum">' + S.fmtMoney(t.total, inv.currency) + '</td></tr>' +
            (t.paid ? '<tr><td class="muted">Paid to date</td><td class="right tnum muted">−' + S.fmtMoney(t.paid, inv.currency) + '</td></tr><tr><td class="muted">Balance</td><td class="right tnum" style="color:var(--acc)">' + S.fmtMoney(t.balance, inv.currency) + '</td></tr>' : '') +
          '</table></div>' +
          (inv.notes ? '<div class="paper-notes">' + esc(inv.notes) + '</div>' : '') +
          '<div class="paper-foot"><img src="assets/logo.png" alt=""> Powered by <b>SherPay</b> — invoicing, receipts & payments</div>' +
        '</div>' +
        (st !== 'paid' && st !== 'draft' ? '<div class="pay-bar no-print"><div style="flex:1"><div class="tiny muted">Amount due</div><div class="amt">' + S.fmtMoney(t.balance, inv.currency) + '</div></div><button class="btn primary" style="padding:13px 26px;font-size:15px" data-action="clientpay">' + icon('card') + 'Pay Now</button></div>' : '') +
        (st === 'paid' ? '<div class="pay-bar no-print"><div style="flex:1"><b style="color:var(--green-dark)">✓ Paid in full on ' + S.fmtDate(inv.paidAt) + '</b><div class="tiny muted">Receipt ' + S.receiptNumber(inv) + ' issued</div></div><button class="btn ghost" data-action="receipt">' + icon('file') + 'View receipt</button></div>' : ''),
      actions: {
        back: () => { location.hash = '#/invoices'; },
        edit: () => { location.hash = '#/invoices/' + inv.id + '/edit'; },
        pdf: () => window.print(),
        pay: () => payModal(inv.id),
        receipt: () => { location.hash = '#/r/' + inv.id; },
        clientpay: () => clientPayModal(inv.id)
      }
    };
  };

  function clientPayModal(id) {
    const inv = S.getInvoice(id); if (!inv) return;
    const t = S.computeTotals(inv);
    UI.openModal({
      title: 'Checkout — ' + S.fmtMoney(t.balance, inv.currency),
      body: '<p class="small muted mb">Demo gateway — Stripe, PayPal, Apple Pay, Mobile Money & bank transfer are simulated end-to-end.</p>' +
        '<div class="grid" style="gap:8px" id="cp-methods">' + S.PAY_METHODS.map((p, ix) => '<button class="method' + (ix === 0 ? ' on' : '') + '" data-m="' + p.id + '"><span class="mico" style="background:' + p.color + '">' + p.tag + '</span><span><b>' + p.label + '</b><div class="tiny muted">' + p.note + '</div></span></button>').join('') + '</div>' +
        '<div class="fgrid c2 mt"><div><label class="f">Pay amount</label><input id="cp-amt" class="input" type="number" step="0.01" value="' + t.balance + '"></div><div style="display:flex;align-items:flex-end"><button class="btn ghost" id="cp-deposit" style="width:100%">50% deposit</button></div></div>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn green" id="cp-pay" style="padding:11px 22px">' + icon('lock') + 'Pay securely</button>',
      mount: (m) => {
        let method = S.PAY_METHODS[0].id;
        m.querySelectorAll('#cp-methods .method').forEach((b) => b.addEventListener('click', () => { method = b.dataset.m; m.querySelectorAll('#cp-methods .method').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
        m.querySelector('#cp-deposit').addEventListener('click', () => { m.querySelector('#cp-amt').value = (t.balance / 2).toFixed(2); });
        m.querySelector('#cp-pay').addEventListener('click', () => {
          const btn = m.querySelector('#cp-pay'); btn.disabled = true; btn.innerHTML = 'Processing…';
          setTimeout(() => {
            const res = S.recordPayment(inv.id, m.querySelector('#cp-amt').value, method);
            UI.closeModal();
            if (!res) { UI.toast('Payment failed — check amount', 'red'); UI.render(); return; }
            UI.toast(res.receipt ? 'Payment successful — receipt ' + res.receipt + ' emailed' : 'Partial payment received', 'green', 'check');
            UI.render();
          }, 900);
        });
      }
    });
  }

  /* ================= RECEIPT ================= */
  UI.VIEWS.r = function (parts) {
    const inv = S.getInvoice(parts[1]);
    if (!inv) return { title: 'Not found', html: '<div class="empty">Receipt not found.</div>', actions: {} };
    const c = S.getClient(inv.clientId), b = S.db.settings.business, t = S.computeTotals(inv);
    const tpl = S.db.settings.template;
    const logo = b.logoDataUrl || 'assets/logo.png';
    document.title = S.receiptNumber(inv) + ' — SherPay';
    return {
      title: S.receiptNumber(inv),
      sub: 'Payment receipt',
      topActions: '<button class="btn ghost" data-action="back">' + icon('chevron', 'flip') + '<span class="hide-sm">Back</span></button><button class="btn ghost" data-action="pdf">' + icon('print') + '<span class="hide-sm">PDF</span></button><button class="btn primary" data-action="invoice">' + icon('invoice') + '<span class="hide-sm">Invoice</span></button>',
      html:
        '<div class="paper font-' + tpl.font + ' acc-' + tpl.accent + '">' +
          '<div class="paper-top"><div class="paper-brand"><img src="' + logo + '" alt=""><div><div class="bn">' + esc(b.name) + '</div><div class="ba">' + esc(b.address) + '</div></div></div>' +
          '<div class="paper-title"><h2 style="color:var(--green-dark)">RECEIPT</h2><div class="pnum">' + esc(S.receiptNumber(inv)) + '</div><div class="mt"><span class="badge paid">Paid</span></div></div></div>' +
          '<div class="paper-meta">' +
            '<div><div class="k">Received from</div><div class="v">' + esc(c ? c.name : '') + '\n' + esc(c ? c.address || '' : '') + '</div></div>' +
            '<div><div class="k">Invoice ref</div><div class="v">' + esc(inv.number) + '</div></div>' +
            '<div><div class="k">Date paid</div><div class="v">' + S.fmtDate(inv.paidAt) + '</div></div>' +
            '<div><div class="k">Currency</div><div class="v">' + inv.currency + '</div></div>' +
          '</div>' +
          '<table><thead><tr><th>Payment</th><th>Date</th><th>Method</th><th class="right">Amount</th></tr></thead><tbody>' +
          inv.payments.map((p) => { const m = S.PAY_METHODS.find((x) => x.id === p.method); return '<tr><td>Payment toward ' + esc(inv.number) + '</td><td>' + S.fmtDate(p.date) + '</td><td>' + esc(m ? m.label : p.method) + '</td><td class="right tnum">' + S.fmtMoney(p.amount, inv.currency) + '</td></tr>'; }).join('') +
          '</tbody></table>' +
          '<div class="paper-totals"><table>' +
            '<tr><td>Invoice total</td><td class="right tnum">' + S.fmtMoney(t.total, inv.currency) + '</td></tr>' +
            '<tr><td>Total received</td><td class="right tnum">' + S.fmtMoney(t.paid, inv.currency) + '</td></tr>' +
            '<tr class="grand"><td>Balance</td><td class="right tnum" style="color:var(--green-dark)">' + S.fmtMoney(t.balance, inv.currency) + '</td></tr>' +
          '</table></div>' +
          '<div class="paper-notes">Thank you for your payment. This receipt confirms settlement of invoice ' + esc(inv.number) + '. Records retained for 7 years per tax compliance.</div>' +
          '<div class="paper-foot"><img src="assets/logo.png" alt=""> Generated automatically by <b>SherPay</b></div>' +
        '</div>',
      actions: {
        // history.back() ejects users who opened the receipt link directly;
        // always land on the invoice view instead
        back: () => { location.hash = '#/i/' + inv.id; },
        pdf: () => window.print(),
        invoice: () => { location.hash = '#/i/' + inv.id; }
      }
    };
  };

  /* expose for cross-view calls */
  UI.VIEWS.invoices.__send = sendModal;
  UI.VIEWS.invoices.__pay = payModal;
})();
