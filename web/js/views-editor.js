/* ============ SherPay view: Invoice editor (create / edit) ============ */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;

  UI.VIEWS.invoicesEditor = function (parts) {
    const editingId = parts[1] && parts[2] === 'edit' ? parts[1] : null;
    const existing = editingId ? S.getInvoice(editingId) : null;
    if (editingId && !existing) return { title: 'Not found', html: '<div class="empty">Invoice not found.</div>', actions: {} };

    const st = S.db.settings;
    const draft = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: null,
      number: null, // assigned on first save (sequential)
      clientId: S.db.clients[0] ? S.db.clients[0].id : '',
      issueDate: S.todayISO(),
      dueDate: S.addDays(S.todayISO(), (S.db.clients[0] || { terms: 30 }).terms || 30),
      currency: st.currency,
      items: [{ desc: '', qty: 1, price: 0 }],
      taxMode: 'percent', taxValue: st.taxRate,
      discountMode: 'none', discountValue: 0,
      status: 'draft', payments: [], notes: 'Payment due within terms. Thank you for your business.',
      recurring: null, recurringNext: null
    };

    // deterministic prefill: set by the Clients view ("New invoice for X") —
    // replaces the old 60ms setTimeout DOM-poking race
    if (!existing && UI.__prefillClient && S.getClient(UI.__prefillClient)) {
      draft.clientId = UI.__prefillClient;
      const pc = S.getClient(UI.__prefillClient);
      draft.dueDate = S.addDays(draft.issueDate, (pc && pc.terms) || 30);
    }
    UI.__prefillClient = null;

    function totals() { return S.computeTotals(draft); }

    function itemsHtml() {
      return draft.items.map((it, ix) =>
        '<tr><td style="width:52%"><input class="input" data-f="desc" data-ix="' + ix + '" placeholder="Description of product or service" value="' + esc(it.desc) + '"></td>' +
        '<td style="width:12%"><input class="input" data-f="qty" data-ix="' + ix + '" type="number" min="0" step="0.01" value="' + it.qty + '"></td>' +
        '<td style="width:20%"><input class="input" data-f="price" data-ix="' + ix + '" type="number" min="0" step="0.01" value="' + it.price + '"></td>' +
        '<td class="amt right tnum small">' + S.fmtMoney(S.num(it.qty) * S.num(it.price), draft.currency) + '</td>' +
        '<td style="width:38px"><button class="btn icon ghost" data-action="rm-item" data-ix="' + ix + '" title="Remove">' + icon('x') + '</button></td></tr>'
      ).join('');
    }
    function totalsHtml() {
      const t = totals();
      return '<div class="tr"><span class="muted">Subtotal</span><b class="tnum">' + S.fmtMoney(t.sub, draft.currency) + '</b></div>' +
        (t.disc ? '<div class="tr"><span class="muted">Discount' + (draft.discountMode === 'percent' ? ' (' + draft.discountValue + '%)' : ' (flat)') + '</span><b class="tnum">−' + S.fmtMoney(t.disc, draft.currency) + '</b></div>' : '') +
        (t.tax ? '<div class="tr"><span class="muted">' + esc(st.taxLabel) + (draft.taxMode === 'percent' ? ' (' + draft.taxValue + '%)' : ' (flat)') + '</span><b class="tnum">' + S.fmtMoney(t.tax, draft.currency) + '</b></div>' : '') +
        '<div class="tr grand"><span>Total</span><b class="tnum">' + S.fmtMoney(t.total, draft.currency) + '</b></div>' +
        (t.paid ? '<div class="tr"><span class="muted">Paid to date</span><b class="tnum">' + S.fmtMoney(t.paid, draft.currency) + '</b></div><div class="tr"><span class="muted">Balance due</span><b class="tnum">' + S.fmtMoney(t.balance, draft.currency) + '</b></div>' : '');
    }
    function refresh(root) {
      root.querySelector('#ed-items').innerHTML = itemsHtml();
      root.querySelector('#ed-totals').innerHTML = totalsHtml();
    }

    return {
      title: existing ? 'Edit ' + existing.number : 'New invoice',
      sub: existing ? 'Status: ' + S.STATUS_LABEL[S.displayStatus(existing)] : 'Draft — numbering auto-assigns on save (' + st.prefix + '-' + new Date().getFullYear() + '-' + S.pad(st.seq) + ')',
      topActions: '<button class="btn ghost" data-action="cancel">' + icon('x') + 'Cancel</button><button class="btn ghost" data-action="save">' + icon('check') + 'Save draft</button><button class="btn primary" data-action="save-send">' + icon('send') + 'Save & send</button>',
      html:
        '<div class="editor-wrap">' +
          '<div class="card"><div class="card-b fgrid c3">' +
            '<div><label class="f">Client</label><select id="ed-client" class="input">' + S.db.clients.map((c) => '<option value="' + c.id + '"' + (c.id === draft.clientId ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select><div class="hint">Terms auto-fill the due date · <a href="#/clients">manage clients</a></div></div>' +
            '<div><label class="f">Issue date</label><input id="ed-issue" class="input" type="date" value="' + draft.issueDate + '"></div>' +
            '<div><label class="f">Due date</label><input id="ed-due" class="input" type="date" value="' + draft.dueDate + '"></div>' +
            '<div><label class="f">Currency</label><select id="ed-cur" class="input">' + S.CURRENCIES.map((c) => '<option' + (c === draft.currency ? ' selected' : '') + '>' + c + '</option>').join('') + '</select><div class="hint">Multi-currency — client pays in their currency</div></div>' +
            '<div><label class="f">Recurring</label><select id="ed-rec" class="input"><option value="">One-off</option><option value="monthly"' + (draft.recurring === 'monthly' ? ' selected' : '') + '>Monthly (retainer)</option></select><div class="hint">Auto-generates the next invoice on schedule</div></div>' +
            '<div><label class="f">Invoice number</label><input class="input" value="' + esc(draft.number || st.prefix + '-' + new Date(draft.issueDate + 'T00:00:00').getFullYear() + '-' + S.pad(st.seq)) + '" disabled><div class="hint">Sequential · customizable prefix in Settings</div></div>' +
          '</div></div>' +
          '<div class="card"><div class="card-h"><h3>Line items</h3><div class="spacer"></div><button class="btn sm" data-action="add-item">' + icon('plus') + 'Add item</button></div>' +
            '<div class="card-b" style="padding-top:8px"><div class="scroll-x"><table class="table items-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th class="right">Amount</th><th></th></tr></thead><tbody id="ed-items">' + itemsHtml() + '</tbody></table></div>' +
            '<div class="row mt" style="align-items:stretch;gap:16px;flex-wrap:wrap">' +
              '<div style="flex:1;min-width:230px"><label class="f">Discount</label><div class="row"><span class="seg" id="ed-discmode">' + ['none', 'percent', 'flat'].map((m) => '<button data-m="' + m + '"' + (draft.discountMode === m ? ' class="on"' : '') + '>' + (m === 'none' ? 'None' : m === 'percent' ? '%' : 'Flat') + '</button>').join('') + '</span>' + (draft.discountMode !== 'none' ? '<input id="ed-discval" class="input" style="max-width:110px" type="number" step="0.01" value="' + draft.discountValue + '">' : '') + '</div></div>' +
              '<div style="flex:1;min-width:230px"><label class="f">' + esc(st.taxLabel) + ' / tax</label><div class="row"><span class="seg" id="ed-taxmode">' + ['none', 'percent', 'flat'].map((m) => '<button data-m="' + m + '"' + (draft.taxMode === m ? ' class="on"' : '') + '>' + (m === 'none' ? 'None' : m === 'percent' ? '%' : 'Flat') + '</button>').join('') + '</span>' + (draft.taxMode !== 'none' ? '<input id="ed-taxval" class="input" style="max-width:110px" type="number" step="0.01" value="' + draft.taxValue + '">' : '') + '</div><div class="hint">Applies to subtotal after discount</div></div>' +
              '<div style="width:270px"><div id="ed-totals" class="totals-panel">' + totalsHtml() + '</div></div>' +
            '</div></div>' +
          '</div>' +
          '<div class="card"><div class="card-b"><label class="f">Notes & payment terms (shown on invoice)</label><textarea id="ed-notes" class="input">' + esc(draft.notes) + '</textarea></div></div>' +
        '</div>',
      mount: (root) => {
        root.querySelector('#ed-client').addEventListener('change', (e) => {
          draft.clientId = e.target.value;
          const c = S.getClient(draft.clientId);
          if (c) { draft.dueDate = S.addDays(draft.issueDate, c.terms || 30); root.querySelector('#ed-due').value = draft.dueDate; }
        });
        root.querySelector('#ed-issue').addEventListener('change', (e) => { draft.issueDate = e.target.value; });
        root.querySelector('#ed-due').addEventListener('change', (e) => { draft.dueDate = e.target.value; });
        root.querySelector('#ed-cur').addEventListener('change', (e) => { draft.currency = e.target.value; refresh(root); });
        root.querySelector('#ed-rec').addEventListener('change', (e) => { draft.recurring = e.target.value || null; });
        root.querySelector('#ed-notes').addEventListener('input', (e) => { draft.notes = e.target.value; });

        root.querySelector('#ed-items').addEventListener('input', (e) => {
          const ix = +e.target.dataset.ix, f = e.target.dataset.f;
          if (!f && f !== 0) return;
          if (!Number.isInteger(ix) || !draft.items[ix]) return; // guard stray inputs without a valid row index
          draft.items[ix][f] = f === 'desc' ? e.target.value : S.num(e.target.value);
          const row = e.target.closest('tr');
          row.querySelector('.amt').textContent = S.fmtMoney(S.num(draft.items[ix].qty) * S.num(draft.items[ix].price), draft.currency);
          root.querySelector('#ed-totals').innerHTML = totalsHtml();
        });

        function segBind(sel, field) {
          root.querySelector(sel).addEventListener('click', (e) => {
            const b = e.target.closest('button'); if (!b) return;
            draft[field] = b.dataset.m;
            rebuildTaxDisc(root);
          });
        }
        segBind('#ed-discmode', 'discountMode');
        segBind('#ed-taxmode', 'taxMode');
        function rebuildTaxDisc(root) {
          // re-render the two control groups + totals
          const dm = root.querySelector('#ed-discmode'), tm = root.querySelector('#ed-taxmode');
          dm.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.m === draft.discountMode));
          tm.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.m === draft.taxMode));
          let dv = dm.parentElement.querySelector('#ed-discval');
          if (draft.discountMode === 'none' && dv) dv.remove();
          if (draft.discountMode !== 'none' && !dv) { dv = document.createElement('input'); dv.id = 'ed-discval'; dv.className = 'input'; dv.style.maxWidth = '110px'; dv.type = 'number'; dv.value = draft.discountValue; dm.parentElement.appendChild(dv); }
          let tv = tm.parentElement.querySelector('#ed-taxval');
          if (draft.taxMode === 'none' && tv) tv.remove();
          if (draft.taxMode !== 'none' && !tv) { tv = document.createElement('input'); tv.id = 'ed-taxval'; tv.className = 'input'; tv.style.maxWidth = '110px'; tv.type = 'number'; tv.value = draft.taxValue; tm.parentElement.appendChild(tv); }
          root.querySelector('#ed-totals').innerHTML = totalsHtml();
        }
        root.addEventListener('input', (e) => {
          if (e.target.id === 'ed-discval') { draft.discountValue = S.num(e.target.value); root.querySelector('#ed-totals').innerHTML = totalsHtml(); }
          if (e.target.id === 'ed-taxval') { draft.taxValue = S.num(e.target.value); root.querySelector('#ed-totals').innerHTML = totalsHtml(); }
        });
      },
      actions: {
        cancel: () => { location.hash = '#/invoices'; },
        'add-item': (d, el, e) => {
          draft.items.push({ desc: '', qty: 1, price: 0 });
          refresh(document.getElementById('view'));
          const inputs = document.querySelectorAll('#ed-items input[data-f="desc"]');
          inputs[inputs.length - 1].focus();
        },
        'rm-item': (d) => {
          if (draft.items.length === 1) { UI.toast('An invoice needs at least one line item', 'red'); return; }
          draft.items.splice(+d.ix, 1);
          refresh(document.getElementById('view'));
        },
        save: () => doSave(false),
        'save-send': () => doSave(true)
      }
    };

    function doSave(andSend) {
      if (!draft.clientId) { UI.toast('Pick a client first', 'red'); return; }
      const cleanItems = draft.items.filter((it) => (it.desc || '').trim() || S.num(it.price) > 0);
      if (!cleanItems.length) { UI.toast('Add at least one line item', 'red'); return; }
      draft.items = cleanItems.map((it) => ({ desc: (it.desc || '').trim() || 'Item', qty: S.num(it.qty) || 1, price: S.num(it.price) }));
      let inv;
      if (existing) {
        Object.assign(existing, draft);
        if (existing.recurring && !existing.recurringNext) existing.recurringNext = S.addMonths(existing.issueDate, 1);
        if (!existing.recurring) existing.recurringNext = null;
        inv = existing;
      } else {
        draft.id = S.uid();
        draft.number = S.newInvoiceNumber(draft.issueDate);
        if (draft.recurring) draft.recurringNext = S.addMonths(draft.issueDate, 1);
        S.db.invoices.unshift(draft);
        inv = draft;
        S.log('created', 'Invoice ' + inv.number + ' created for ' + (S.getClient(inv.clientId) || {}).name);
      }
      S.save();
      if (andSend) {
        S.markSent(inv.id, 'Email');
        UI.closeModal();
        UI.toast(inv.number + ' saved & sent', 'green', 'send');
        location.hash = '#/i/' + inv.id;
      } else {
        UI.toast(inv.number + ' saved as ' + (inv.status === 'draft' ? 'draft' : inv.status), 'green', 'check');
        location.hash = '#/i/' + inv.id;
      }
    }
  };

  /* route glue: #/invoices/new and #/invoices/:id/edit */
  const origInvoices = UI.VIEWS.invoices;
  UI.VIEWS.invoices = function (parts) {
    if (parts[1] === 'new') return UI.VIEWS.invoicesEditor(parts);
    if (parts[2] === 'edit') return UI.VIEWS.invoicesEditor(parts);
    return origInvoices(parts);
  };
})();
