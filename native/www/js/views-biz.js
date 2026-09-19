/* ============ SherPay views: Reports (P&L, tax, exports) & Settings (branding, defaults, automations) ============ */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;
  const cur = () => S.db.settings.currency;

  /* ================= REPORTS ================= */
  UI.VIEWS.reports = function () {
    const mb = S.moneyByMonth();
    const months = mb.months;
    const totRev = months.reduce((s, m) => s + mb.rev[m], 0);
    const totExp = months.reduce((s, m) => s + mb.exp[m], 0);
    // tax summary
    let taxCollected = 0, taxPaid = 0;
    S.db.invoices.forEach((i) => { if (i.status === 'paid') taxCollected += S.computeTotals(i).tax; });
    S.db.expenses.forEach((e) => { taxPaid += e.tax; });
    // category table
    const byCat = {};
    S.db.expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.total; });

    return {
      title: 'Reports',
      sub: 'Profit & loss, tax summary and accountant-ready exports',
      topActions: '<button class="btn ghost" data-action="csv-pl">' + icon('download') + 'P&L CSV</button><button class="btn ghost" data-action="csv-tax">' + icon('download') + 'Tax CSV</button><button class="btn primary" data-action="print">' + icon('print') + 'Print / PDF</button>',
      html:
        '<div class="grid kpis">' +
          '<div class="card kpi accent-green"><div class="lab">' + icon('wallet') + 'Revenue (6 mo)</div><div class="val">' + S.fmtMoney(totRev, cur()) + '</div><div class="delta">payments collected</div></div>' +
          '<div class="card kpi"><div class="lab">' + icon('expenses') + 'Expenses (6 mo)</div><div class="val">' + S.fmtMoney(totExp, cur()) + '</div><div class="delta">' + S.db.expenses.length + ' receipts</div></div>' +
          '<div class="card kpi ' + (totRev - totExp >= 0 ? 'accent-green' : 'accent-red') + '"><div class="lab">' + icon('reports') + 'Net profit</div><div class="val">' + S.fmtMoney(totRev - totExp, cur()) + '</div><div class="delta">margin ' + (totRev ? Math.round((totRev - totExp) / totRev * 100) : 0) + '%</div></div>' +
          '<div class="card kpi accent-blue"><div class="lab">' + icon('file') + 'Net tax position</div><div class="val">' + S.fmtMoney(taxCollected - taxPaid, cur()) + '</div><div class="delta">collected − recoverable</div></div>' +
        '</div>' +
        '<div class="grid two mt2">' +
          '<div class="card"><div class="card-h"><h3>Profit & loss by month</h3></div><div class="card-b">' +
            '<div class="scroll-x"><table class="table"><thead><tr><th>Month</th><th class="right">Revenue</th><th class="right">Expenses</th><th class="right">Net</th></tr></thead><tbody>' +
            months.slice().reverse().map((m) => '<tr><td class="small bold">' + S.monthLabel(m) + ' ' + m.slice(0, 4) + '</td><td class="right tnum small" style="color:var(--green-dark)">' + S.fmtMoney(mb.rev[m], cur()) + '</td><td class="right tnum small" style="color:var(--red)">' + S.fmtMoney(mb.exp[m], cur()) + '</td><td class="right tnum small bold">' + S.fmtMoney(mb.rev[m] - mb.exp[m], cur()) + '</td></tr>').join('') +
            '</tbody></table></div></div></div>' +
          '<div class="card"><div class="card-h"><h3>Tax report</h3><div class="spacer"></div><span class="badge sent">' + esc(S.db.settings.taxLabel) + '</span></div><div class="card-b">' +
            '<div class="row small mb"><span class="muted" style="flex:1">' + esc(S.db.settings.taxLabel) + ' collected on paid invoices</span><b class="tnum">' + S.fmtMoney(taxCollected, cur()) + '</b></div>' +
            '<div class="row small mb"><span class="muted" style="flex:1">Recoverable tax on expenses</span><b class="tnum">' + S.fmtMoney(taxPaid, cur()) + '</b></div>' +
            '<div class="row small" style="border-top:1px solid var(--line);padding-top:9px"><b style="flex:1">Payable / (refundable)</b><b class="tnum">' + S.fmtMoney(taxCollected - taxPaid, cur()) + '</b></div>' +
            '<div class="hint mt">Export includes per-invoice and per-receipt tax lines, categorised and ready for your accountant. Records retained 7 years (US/UK compliance).</div>' +
            '<div class="card-h" style="padding:14px 0 8px;border:none"><h3>Expense categories</h3></div>' +
            Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div class="row small" style="padding:4px 0"><span class="muted" style="flex:1">' + k + '</span><b class="tnum">' + S.fmtMoney(v, cur()) + '</b></div>').join('') +
          '</div></div>' +
        '</div>',
      actions: {
        print: () => window.print(),
        'csv-pl': () => {
          const rows = [['Month', 'Revenue', 'Expenses', 'Net']];
          months.forEach((m) => rows.push([m, mb.rev[m].toFixed(2), mb.exp[m].toFixed(2), (mb.rev[m] - mb.exp[m]).toFixed(2)]));
          S.download('sherpay-pl-' + S.todayISO() + '.csv', S.toCSV(rows), 'text/csv');
          UI.toast('P&L exported', 'green', 'download');
        },
        'csv-tax': () => {
          const rows = [['Type', 'Reference', 'Date', 'Category/Tax', 'Tax amount', 'Gross']];
          S.db.invoices.filter((i) => i.status === 'paid').forEach((i) => rows.push(['Output tax', i.number, i.paidAt, S.db.settings.taxLabel, S.computeTotals(i).tax.toFixed(2), S.computeTotals(i).total.toFixed(2)]));
          S.db.expenses.forEach((e) => rows.push(['Input tax', e.merchant, e.date, e.category, e.tax.toFixed(2), e.total.toFixed(2)]));
          S.download('sherpay-tax-' + S.todayISO() + '.csv', S.toCSV(rows), 'text/csv');
          UI.toast('Tax report exported', 'green', 'download');
        }
      }
    };
  };

  /* ================= SETTINGS ================= */
  UI.VIEWS.settings = function () {
    const st = S.db.settings, b = st.business;
    const ACCENTS = [['blue', '#0B7CFF'], ['green', '#0BAF72'], ['violet', '#6A5AE0'], ['orange', '#E8720C'], ['navy', '#0A2E5F']];
    const FONTS = [['sans', 'Modern Sans'], ['serif', 'Classic Serif'], ['mono', 'Tech Mono']];
    return {
      title: 'Settings',
      sub: 'Branding, templates, taxes, numbering & automations',
      html:
        '<div class="grid two">' +
          '<div class="grid" style="gap:16px">' +
            '<div class="card"><div class="card-h"><h3>Business profile</h3></div><div class="card-b fgrid c2">' +
              '<div style="grid-column:1/-1" class="row"><img id="set-logo" src="' + (b.logoDataUrl || 'assets/logo.png') + '" style="width:56px;height:56px;border-radius:14px"><div><label class="f">Logo on invoices</label><label class="btn sm ghost" style="cursor:pointer">' + icon('download') + ' Upload<input id="set-logofile" type="file" accept="image/*" hidden></label></div></div>' +
              '<div style="grid-column:1/-1"><label class="f">Business name</label><input id="set-name" class="input" value="' + esc(b.name) + '"></div>' +
              '<div><label class="f">Email</label><input id="set-email" class="input" value="' + esc(b.email) + '"></div>' +
              '<div><label class="f">Phone</label><input id="set-phone" class="input" value="' + esc(b.phone) + '"></div>' +
              '<div style="grid-column:1/-1"><label class="f">Address (printed on invoices)</label><textarea id="set-addr" class="input">' + esc(b.address) + '</textarea></div>' +
            '</div></div>' +
            '<div class="card"><div class="card-h"><h3>Invoice template</h3><div class="spacer"></div><span class="tiny muted">live on every pay-link & PDF</span></div><div class="card-b">' +
              '<label class="f">Brand accent</label><div class="swatches mb" id="set-accents">' + ACCENTS.map((a) => '<button class="swatch' + (st.template.accent === a[0] ? ' on' : '') + '" data-a="' + a[0] + '" style="background:' + a[1] + '"></button>').join('') + '</div>' +
              '<label class="f">Font</label><div class="row" style="gap:7px" id="set-fonts">' + FONTS.map((f) => '<button class="chip' + (st.template.font === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
              '<div class="hint mt">Templates also carry your logo, brand colours and payment terms — clients see a branded, professional document.</div>' +
            '</div></div>' +
            '<div class="card"><div class="card-h"><h3>Security & compliance</h3></div><div class="card-b grid" style="gap:10px">' +
              [['lock', 'Encryption', 'TLS in transit · AES-256 at rest (cloud tier)'], ['sync', 'Cloud backup', 'Auto-sync every change; offline drafts queue on-device'], ['file', 'Record retention', 'Receipts & invoices kept 7 years (US/UK/GRA)'], ['lock', 'Biometric login', 'FaceID / fingerprint on iOS & Android apps']]
                .map((x) => '<div class="lock-row"><span class="ico">' + icon(x[0]) + '</span><div><b class="small">' + x[1] + '</b><div class="tiny muted">' + x[2] + '</div></div>' + icon('check') + '</div>').join('') +
            '</div></div>' +
          '</div>' +
          '<div class="grid" style="gap:16px">' +
            '<div class="card"><div class="card-h"><h3>Defaults</h3></div><div class="card-b fgrid c2">' +
              '<div><label class="f">Base currency</label><select id="set-cur" class="input">' + S.CURRENCIES.map((c) => '<option' + (c === st.currency ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>' +
              '<div><label class="f">Tax label</label><input id="set-taxlabel" class="input" value="' + esc(st.taxLabel) + '" placeholder="VAT / GST / Sales Tax"></div>' +
              '<div><label class="f">Default tax rate %</label><input id="set-taxrate" class="input" type="number" step="0.01" value="' + st.taxRate + '"></div>' +
              '<div><label class="f">Hourly rate (' + cur() + ')</label><input id="set-rate" class="input" type="number" value="' + st.hourlyRate + '"></div>' +
              '<div><label class="f">Invoice prefix</label><input id="set-prefix" class="input" value="' + esc(st.prefix) + '"></div>' +
              '<div><label class="f">Next number</label><input id="set-seq" class="input" type="number" value="' + st.seq + '"></div>' +
              '<div class="hint" id="set-numhint" style="grid-column:1/-1">Numbers render as <b>' + esc(st.prefix) + '-' + new Date().getFullYear() + '-' + S.pad(st.seq) + '</b> — sequential, never reused.</div>' +
            '</div></div>' +
            '<div class="card"><div class="card-h"><h3>Automatic reminders</h3><div class="spacer"></div><button class="btn sm" data-action="run-now">' + icon('bell') + 'Run now</button></div><div class="card-b">' +
              '<label class="f">Email nudges (days relative to due date)</label><input id="set-rem" class="input" value="' + st.reminderDays.join(', ') + '"><div class="hint">Positive = before due, 0 = on the day, negative = after (overdue chase). Example: 3, 0, -3</div>' +
              '<div class="card-h" style="border:none;padding:14px 0 6px"><h3>Outbox</h3></div>' +
              (S.db.activity.filter((a) => a.type === 'reminder').slice(0, 5).map((a) => '<div class="tiny" style="padding:5px 0;border-bottom:1px solid var(--line-2)">' + icon('bell') + ' ' + esc(a.message) + ' <span class="muted">· ' + S.fmtDateTime(a.ts) + '</span></div>').join('') || '<div class="tiny muted">No reminders queued yet.</div>') +
            '</div></div>' +
            '<div class="card"><div class="card-h"><h3>Data</h3></div><div class="card-b row wrap" style="gap:8px">' +
              '<button class="btn ghost" data-action="backup">' + icon('download') + 'Backup JSON</button>' +
              '<label class="btn ghost" style="cursor:pointer">' + icon('sync') + ' Restore<input id="set-restore" type="file" accept="application/json" hidden></label>' +
              '<button class="btn danger" data-action="reset">' + icon('trash') + 'Reset demo data</button>' +
              '<button class="btn ghost" data-action="signout">' + icon('lock') + 'Sign out</button>' +
              '<div class="hint" style="width:100%">Everything lives in your browser (offline-first). Backup exports invoices, clients, expenses, time & settings.</div>' +
            '</div></div>' +
          '</div>' +
        '</div>',
      mount: (root) => {
        const bind = (id, fn) => root.querySelector(id).addEventListener('input', fn);
        bind('#set-name', (e) => { b.name = e.target.value; S.save(); });
        bind('#set-email', (e) => { b.email = e.target.value; S.save(); });
        bind('#set-phone', (e) => { b.phone = e.target.value; S.save(); });
        bind('#set-addr', (e) => { b.address = e.target.value; S.save(); });
        bind('#set-taxlabel', (e) => { st.taxLabel = e.target.value || 'Tax'; S.save(); });
        bind('#set-taxrate', (e) => { st.taxRate = S.num(e.target.value); S.save(); });
        bind('#set-rate', (e) => { st.hourlyRate = S.num(e.target.value); S.save(); });
        bind('#set-prefix', (e) => { st.prefix = e.target.value || 'INV'; S.save(); numHint(); });
        bind('#set-seq', (e) => { st.seq = Math.max(1, S.num(e.target.value)); S.save(); numHint(); });
        function numHint() {
          const h = root.querySelector('#set-numhint');
          if (h) h.innerHTML = 'Numbers render as <b>' + S.esc(st.prefix) + '-' + new Date().getFullYear() + '-' + S.pad(st.seq) + '</b> — sequential, never reused.';
        }
        root.querySelector('#set-cur').addEventListener('change', (e) => { st.currency = e.target.value; S.save(); UI.toast('Base currency set to ' + st.currency, 'green', 'wallet'); UI.render(); });
        root.querySelector('#set-logofile').addEventListener('change', (e) => {
          const f = e.target.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => { b.logoDataUrl = r.result; S.save(); UI.toast('Logo updated on all templates', 'green', 'check'); UI.render(); };
          r.readAsDataURL(f);
        });
        root.querySelector('#set-accents').addEventListener('click', (e) => {
          const sw = e.target.closest('.swatch'); if (!sw) return;
          st.template.accent = sw.dataset.a; S.save(); UI.render();
        });
        root.querySelector('#set-fonts').addEventListener('click', (e) => {
          const ch = e.target.closest('.chip'); if (!ch) return;
          st.template.font = ch.dataset.f; S.save(); UI.render();
        });
        root.querySelector('#set-restore').addEventListener('change', (e) => {
          const f = e.target.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            try {
              const d = JSON.parse(r.result);
              // minimal shape check — a wrong-shaped file must never replace the live db
              if (!d || typeof d !== 'object' || !Array.isArray(d.invoices) || !Array.isArray(d.clients) ||
                  !Array.isArray(d.expenses) || !d.settings || typeof d.settings !== 'object') throw new Error('bad shape');
              S.db = d; S.save(); UI.toast('Backup restored', 'green', 'sync'); UI.render();
            } catch (err) { UI.toast('Invalid backup file', 'red'); }
          };
          r.readAsText(f);
        });
      },
      actions: {
        'run-now': () => {
          // skip blank segments so "3, , -3" doesn't inject a stray 0 (due-date) reminder
          const vals = document.getElementById('set-rem').value.split(',').map((x) => x.trim()).filter((x) => x !== '').map(Number).filter((x) => isFinite(x));
          S.db.settings.reminderDays = vals.length ? vals : [3, 0, -3];
          S.save();
          const n = S.runAutomations();
          UI.toast(n ? n + ' automation(s) fired — check outbox & invoices' : 'Automations up to date', 'green', 'bell');
          UI.render();
        },
        backup: () => { S.download('sherpay-backup-' + S.todayISO() + '.json', JSON.stringify(S.db, null, 2), 'application/json'); UI.toast('Backup downloaded', 'green', 'download'); },
        reset: () => UI.confirmDialog('Reset demo data?', 'All invoices, clients, expenses and settings return to the seeded demo.', () => { S.resetDemo(); UI.toast('Demo data restored', 'green', 'sync'); UI.render(); }, 'Reset')
      }
    };
  };
})();
