/* ============ SherPay view: Invoice editor (create / edit) ============ */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;

  UI.VIEWS.invoicesEditor = function (parts) {
    const editingId = parts[1] && parts[2] === 'edit' ? parts[1] : null;
    const existing = editingId ? S.getInvoice(editingId) : null;
    if (editingId && !existing) return { title: 'Not found', html: '<div class="empty">Invoice not found.</div>', actions: {} };

    const st = S.db.settings;
    // Two-way client save: '__new' is a sentinel meaning "create a client inline".
    // A fresh workspace (no saved clients) starts on '__new' so the form invites
    // creation instead of blocking on an empty <select>.
    const draft = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: null,
      number: null, // assigned on first save (sequential)
      clientId: S.db.clients[0] ? S.db.clients[0].id : '__new',
      // holds the unsaved contact typed inline; moved to db.clients on save
      newClient: { name: '', contact: '', email: '', phone: '', address: '', terms: 30 },
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
    if (!existing && !draft.newClient) draft.newClient = { name: '', contact: '', email: '', phone: '', address: '', terms: 30 };
    if (!draft.newClient) draft.newClient = { name: '', contact: '', email: '', phone: '', address: '', terms: 30 };
    // an invoice whose client was deleted loses the link — invite a fresh pick/create
    if (draft.clientId && draft.clientId !== '__new' && !S.getClient(draft.clientId)) draft.clientId = S.db.clients[0] ? S.db.clients[0].id : '__new';
    // Pro: lines can be tied to inventory — a deleted item just unties the line
    (draft.items || []).forEach((it) => { if (it.inventory_id && !S.inventoryItem(it.inventory_id)) it.inventory_id = null; });
    const proInv = S.upgrades.isPro();

    function clientOptions() {
      const opts = S.db.clients.map((c) => '<option value="' + c.id + '"' + (c.id === draft.clientId ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
      return opts + '<option value="__new"' + (draft.clientId === '__new' ? ' selected' : '') + '>+ New client…</option>';
    }
    function newClientHtml() {
      const nc = draft.newClient || {};
      const hidden = draft.clientId === '__new' ? '' : ' hidden';
      return '<div id="ed-newclient" class="card card-b mt"' + hidden + ' style="background:var(--bg);border-style:dashed">' +
        '<div class="small mb" style="font-weight:700">New client — saved to Clients on save &amp; send</div>' +
        '<div class="fgrid c2">' +
        '<div style="grid-column:1/-1"><label class="f">Business name *</label><input id="ed-new-name" class="input" autocomplete="off" placeholder="e.g. Ama Designs" value="' + esc(nc.name || '') + '"></div>' +
        '<div><label class="f">Contact person</label><input id="ed-new-contact" class="input" autocomplete="off" placeholder="Who you deal with" value="' + esc(nc.contact || '') + '"></div>' +
        '<div><label class="f">Payment terms (days)</label><input id="ed-new-terms" class="input" type="number" min="0" value="' + (nc.terms == null ? 30 : nc.terms) + '"></div>' +
        '<div><label class="f">Email</label><input id="ed-new-email" class="input" type="email" autocomplete="off" placeholder="client@business.com" value="' + esc(nc.email || '') + '"></div>' +
        '<div><label class="f">Phone</label><input id="ed-new-phone" class="input" autocomplete="off" placeholder="+233 …" value="' + esc(nc.phone || '') + '"></div>' +
        '<div style="grid-column:1/-1"><label class="f">Billing address</label><textarea id="ed-new-addr" class="input" placeholder="Street, city">' + esc(nc.address || '') + '</textarea></div>' +
        '</div></div>';
    }

    /* Loss prevention (Jakob): the editor knows when it is holding work that
       does not exist on disk yet, and says so before you walk away. */
    let dirty = false;
    function markDirty() { dirty = true; }
    function clearDirty() { dirty = false; UI.setNavGuard(null); }

    function totals() { return S.computeTotals(draft); }

    /* Pro stock picker: one select per line — picking an item ties the line to
       it (and fills in what the line is still missing). Free plans see no
       column at all, so nothing about the table changes for them. */
    function invCellHtml(it, ix) {
      if (!proInv) return '';
      const opts = ['<option value="">— none —</option>'].concat(S.db.inventory.map((p) =>
        '<option value="' + esc(p.id) + '"' + (it.inventory_id === p.id ? ' selected' : '') + '>' + esc(p.name) + ' (' + p.qty + ' ' + esc(p.unit) + ' left)</option>')).join('');
      return '<td style="width:17%"><select class="input" data-f="inv" data-ix="' + ix + '" aria-label="Line ' + (ix + 1) + ' stock item">' + opts + '</select></td>';
    }
    function pickInventory(root, ix, id) {
      const it = draft.items[ix]; if (!it) return;
      it.inventory_id = id || null;
      const p = id ? S.inventoryItem(id) : null;
      if (p) {
        if (!(it.desc || '').trim()) it.desc = p.name;                       // fill the blanks only
        if (!S.num(it.price)) it.price = S.num(p.cost) || 0;
      }
      refresh(root);
    }
    function itemsHtml() {
      return draft.items.map((it, ix) =>
        '<tr><td style="width:' + (proInv ? '40%' : '52%') + '"><input class="input" data-f="desc" data-ix="' + ix + '" autocomplete="off" placeholder="Description of product or service" aria-label="Line ' + (ix + 1) + ' description" value="' + esc(it.desc) + '"></td>' +
        '<td style="width:12%"><input class="input" data-f="qty" data-ix="' + ix + '" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Line ' + (ix + 1) + ' quantity" value="' + it.qty + '"></td>' +
        '<td style="width:20%"><input class="input" data-f="price" data-ix="' + ix + '" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Line ' + (ix + 1) + ' unit price in ' + draft.currency + '" value="' + it.price + '"></td>' +
        invCellHtml(it, ix) +
        '<td class="amt right tnum small">' + S.fmtMoney(S.num(it.qty) * S.num(it.price), draft.currency) + '</td>' +
        '<td style="width:38px"><button class="btn icon ghost" data-action="rm-item" data-ix="' + ix + '" title="Remove" aria-label="Remove line ' + (ix + 1) + '">' + icon('x') + '</button></td></tr>'
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
      paintTotals(root);
    }
    /* one paint for both totals surfaces: the panel on desktop, the bar on a phone */
    function paintTotals(root) {
      const box = root.querySelector('#ed-totals');
      if (box) box.innerHTML = totalsHtml();
      const bar = root.querySelector('#ed-bar-total');
      if (bar) bar.textContent = S.fmtMoney(totals().total, draft.currency);
    }

    return {
      title: existing ? 'Edit ' + existing.number : 'New invoice',
      sub: existing ? 'Status: ' + S.STATUS_LABEL[S.displayStatus(existing)] : 'Draft — numbering auto-assigns on save (' + st.prefix + '-' + new Date().getFullYear() + '-' + S.pad(st.seq) + ')',
      topActions: '<button class="btn ghost" data-action="cancel">' + icon('x') + 'Cancel</button><button class="btn ghost" data-action="save">' + icon('check') + 'Save draft</button><button class="btn primary" data-action="save-send">' + icon('send') + 'Save & send</button>',
      html:
        '<div class="editor-wrap">' +
          '<div class="card"><div class="card-b fgrid c3">' +
            '<div><label class="f">Client</label><select id="ed-client" class="input">' + clientOptions() + '</select><div class="hint">Pick a saved client or add a new one — new contacts are saved to Clients on save · <a href="#/clients">manage clients</a></div>' + newClientHtml() + '</div>' +
            '<div><label class="f">Issue date</label><input id="ed-issue" class="input" type="date" value="' + draft.issueDate + '"></div>' +
            '<div><label class="f">Due date</label><input id="ed-due" class="input" type="date" value="' + draft.dueDate + '"></div>' +
            '<div><label class="f">Currency</label><select id="ed-cur" class="input">' + S.CURRENCIES.map((c) => '<option' + (c === draft.currency ? ' selected' : '') + '>' + c + '</option>').join('') + '</select><div class="hint">Multi-currency — client pays in their currency</div></div>' +
            '<div><label class="f">Recurring</label><select id="ed-rec" class="input"><option value="">One-off</option><option value="monthly"' + (draft.recurring === 'monthly' ? ' selected' : '') + '>Monthly (retainer)</option></select><div class="hint">Auto-generates the next invoice on schedule</div></div>' +
            '<div><label class="f">Invoice number</label><input class="input" value="' + esc(draft.number || st.prefix + '-' + new Date(draft.issueDate + 'T00:00:00').getFullYear() + '-' + S.pad(st.seq)) + '" disabled><div class="hint">Sequential · customizable prefix in Settings</div></div>' +
          '</div></div>' +
          '<div class="card"><div class="card-h"><h3>Line items</h3><div class="spacer"></div><button class="btn sm" data-action="add-item">' + icon('plus') + 'Add item</button></div>' +
            '<div class="card-b" style="padding-top:8px"><div class="scroll-x"><table class="table items-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th>' + (proInv ? '<th>Stock</th>' : '') + '<th class="right">Amount</th><th></th></tr></thead><tbody id="ed-items">' + itemsHtml() + '</tbody></table></div>' +
            '<div class="row mt" style="align-items:stretch;gap:16px;flex-wrap:wrap">' +
              '<div style="flex:1;min-width:230px"><label class="f">Discount</label><div class="row"><span class="seg" id="ed-discmode">' + ['none', 'percent', 'flat'].map((m) => '<button data-m="' + m + '"' + (draft.discountMode === m ? ' class="on"' : '') + '>' + (m === 'none' ? 'None' : m === 'percent' ? '%' : 'Flat') + '</button>').join('') + '</span>' + (draft.discountMode !== 'none' ? '<input id="ed-discval" class="input" style="max-width:110px" type="number" step="0.01" value="' + draft.discountValue + '">' : '') + '</div></div>' +
              '<div style="flex:1;min-width:230px"><label class="f">' + esc(st.taxLabel) + ' / tax</label><div class="row"><span class="seg" id="ed-taxmode">' + ['none', 'percent', 'flat'].map((m) => '<button data-m="' + m + '"' + (draft.taxMode === m ? ' class="on"' : '') + '>' + (m === 'none' ? 'None' : m === 'percent' ? '%' : 'Flat') + '</button>').join('') + '</span>' + (draft.taxMode !== 'none' ? '<input id="ed-taxval" class="input" style="max-width:110px" type="number" step="0.01" value="' + draft.taxValue + '">' : '') + '</div><div class="hint">Applies to subtotal after discount</div></div>' +
              '<div style="width:270px"><div id="ed-totals" class="totals-panel">' + totalsHtml() + '</div></div>' +
            '</div></div>' +
          '</div>' +
          '<div class="card"><div class="card-b"><label class="f">Notes & payment terms (shown on invoice)</label><textarea id="ed-notes" class="input">' + esc(draft.notes) + '</textarea></div></div>' +
          /* Fitts + Jakob: on a phone the thumb reaches the bottom of the screen,
             so Save lives there with the total it produces — not up in the header,
             and the header stays clear of the status bar. Hidden ≥761px. */
          '<div class="editor-bar" id="ed-bar">' +
            '<div class="tot"><span class="k">Total</span><span class="v tnum" id="ed-bar-total">' + S.fmtMoney(totals().total, draft.currency) + '</span></div>' +
            '<button class="btn ghost" data-action="save">' + icon('check') + 'Save draft</button>' +
            '<button class="btn primary" data-action="save-send">' + icon('send') + 'Save &amp; send</button>' +
          '</div>' +
        '</div>',
      mount: (root) => {
        root.querySelector('#ed-client').addEventListener('change', (e) => {
          draft.clientId = e.target.value;
          const nc = root.querySelector('#ed-newclient');
          if (nc) { if (draft.clientId === '__new') nc.removeAttribute('hidden'); else nc.setAttribute('hidden', ''); }
          clearFieldErr(root.querySelector('#ed-client'));
          const c = S.getClient(draft.clientId);
          if (c) { draft.dueDate = S.addDays(draft.issueDate, c.terms || 30); root.querySelector('#ed-due').value = draft.dueDate; }
          if (draft.clientId === '__new') { draft.dueDate = S.addDays(draft.issueDate, S.num((draft.newClient || {}).terms) || 30); root.querySelector('#ed-due').value = draft.dueDate; }
        });
        // keep the unsaved contact in the draft as it is typed
        root.addEventListener('input', (e) => {
          const id = e.target.id || '';
          if (!draft.newClient) draft.newClient = { name: '', contact: '', email: '', phone: '', address: '', terms: 30 };
          if (id === 'ed-new-name') draft.newClient.name = e.target.value;
          else if (id === 'ed-new-contact') draft.newClient.contact = e.target.value;
          else if (id === 'ed-new-email') draft.newClient.email = e.target.value;
          else if (id === 'ed-new-phone') draft.newClient.phone = e.target.value;
          else if (id === 'ed-new-addr') draft.newClient.address = e.target.value;
          else if (id === 'ed-new-terms') { draft.newClient.terms = S.num(e.target.value) || 0; if (draft.clientId === '__new') { draft.dueDate = S.addDays(draft.issueDate, draft.newClient.terms || 30); const dd = root.querySelector('#ed-due'); if (dd) dd.value = draft.dueDate; } }
          if (id.indexOf('ed-new-') === 0) clearFieldErr(e.target);
        });
        root.querySelector('#ed-issue').addEventListener('change', (e) => { draft.issueDate = e.target.value; });
        root.querySelector('#ed-due').addEventListener('change', (e) => { draft.dueDate = e.target.value; });
        root.querySelector('#ed-cur').addEventListener('change', (e) => { draft.currency = e.target.value; refresh(root); });
        root.querySelector('#ed-rec').addEventListener('change', (e) => { draft.recurring = e.target.value || null; });
        root.querySelector('#ed-notes').addEventListener('input', (e) => { draft.notes = e.target.value; });

        root.querySelector('#ed-items').addEventListener('input', onItemsEdit);
        /* selects announce themselves with both events — share one handler;
           re-entrant work (autofill + refresh) is idempotent. */
        root.querySelector('#ed-items').addEventListener('change', onItemsEdit);
        function onItemsEdit(e) {
          const ix = +e.target.dataset.ix, f = e.target.dataset.f;
          if (!f && f !== 0) return;
          if (!Number.isInteger(ix) || !draft.items[ix]) return; // guard stray inputs without a valid row index
          if (f === 'inv') { pickInventory(root, ix, e.target.value); return; }
          draft.items[ix][f] = f === 'desc' ? e.target.value : S.num(e.target.value);
          const row = e.target.closest('tr');
          row.querySelector('.amt').textContent = S.fmtMoney(S.num(draft.items[ix].qty) * S.num(draft.items[ix].price), draft.currency);
          paintTotals(root);
        }

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
          paintTotals(root);
        }
        root.addEventListener('input', (e) => {
          if (e.target.id === 'ed-discval') { draft.discountValue = S.num(e.target.value); paintTotals(root); }
          if (e.target.id === 'ed-taxval') { draft.taxValue = S.num(e.target.value); paintTotals(root); }
        });

        /* Loss prevention: the first keystroke makes this draft unsaved, and the
           sidebar then asks once instead of throwing the work away. (Browser Back
           cannot be intercepted without trapping history, but nothing is ever
           destroyed — an unsaved draft is simply not in the list yet.) */
        root.addEventListener('input', markDirty);
        root.addEventListener('change', markDirty);
        UI.setNavGuard((route) => {
          if (!dirty) return false;
          UI.confirmDialog('You have unsaved changes', 'This invoice has edits that are not saved. Leave and lose them?', () => { clearDirty(); UI.go('#/' + route); }, 'Discard changes');
          return true;
        });
      },
      actions: {
        cancel: () => {
          if (!dirty) { location.hash = '#/invoices'; return; }
          UI.confirmDialog('Discard this invoice?', 'Nothing you typed has been saved yet.', () => { clearDirty(); location.hash = '#/invoices'; }, 'Discard');
        },
        'add-item': (d, el, e) => {
          markDirty();
          draft.items.push({ desc: '', qty: 1, price: 0 });
          refresh(document.getElementById('view'));
          const inputs = document.querySelectorAll('#ed-items input[data-f="desc"]');
          inputs[inputs.length - 1].focus();
        },
        'rm-item': (d) => {
          if (draft.items.length === 1) { UI.toast('An invoice needs at least one line item', 'red'); return; }
          const ix = +d.ix, removed = draft.items[ix];
          markDirty();
          draft.items.splice(ix, 1);
          refresh(document.getElementById('view'));
          /* a delete you can take back is a delete you are not afraid of */
          UI.toast('Line removed', '', 'trash', { undo: () => { draft.items.splice(Math.min(ix, draft.items.length), 0, removed); refresh(document.getElementById('view')); } });
        },
        save: () => doSave(false),
        'save-send': () => doSave(true)
      }
    };

    /* Jakob: when a save fails, the field admits it in its own words. A toast
       alone fades while you are still staring at the blank row, and it never
       tells you *which* row. The toast stays as the summary channel. */
    function formErr(root, msg) {
      const wrap = root.querySelector('.editor-wrap') || root;
      const el = document.createElement('div');
      el.className = 'form-err'; el.setAttribute('role', 'alert');
      el.innerHTML = icon('alert') + esc(msg);
      wrap.insertBefore(el, wrap.firstChild);
    }
    function clearFieldErr(el) {
      if (!el) return;
      el.classList.remove('bad'); el.removeAttribute('aria-invalid');
      if (el.__err && el.__err.parentNode) el.__err.remove();
      el.__err = null;
    }
    function fieldErr(el, msg) {
      clearFieldErr(el);
      if (!el) return;
      el.classList.add('bad'); el.setAttribute('aria-invalid', 'true');
      const box = document.createElement('div');
      box.className = 'field-err'; box.innerHTML = icon('alert') + esc(msg);
      el.insertAdjacentElement('afterend', box);
      el.__err = box;
      el.addEventListener('input', () => clearFieldErr(el), { once: true });
      try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
    }

    /* Two-way save: read the inline contact, create/reuse the client, link it.
       Reuses by exact email match first (avoids a duplicate when you invoice
       the same new address twice), else by exact name match. Returns the
       client id or null when the form is not usable (caller shows the error). */
    function readNewClient(root) {
      const val = (id) => ((root.querySelector(id) || {}).value || '').trim();
      const name = val('#ed-new-name');
      const data = {
        name,
        contact: val('#ed-new-contact'),
        email: val('#ed-new-email'),
        phone: val('#ed-new-phone'),
        address: root.querySelector('#ed-new-addr') ? root.querySelector('#ed-new-addr').value.trim() : '',
        terms: S.num(val('#ed-new-terms')) || 30
      };
      draft.newClient = Object.assign({}, draft.newClient, data);
      return data;
    }
    function resolveNewClientId(root) {
      const data = readNewClient(root);
      if (!data.name) {
        UI.toast('Name the new client first', 'red');
        formErr(root, 'Give the new client a business name — it prints on the invoice and saves them to Clients.');
        fieldErr(root.querySelector('#ed-new-name'), 'Required');
        return null;
      }
      const emailKey = data.email.toLowerCase();
      const dupe = emailKey
        ? S.db.clients.find((c) => String(c.email || '').toLowerCase() === emailKey)
        : S.db.clients.find((c) => String(c.name || '').toLowerCase() === data.name.toLowerCase());
      if (dupe) {
        // fill gaps on the saved record but never overwrite what is there
        ['contact', 'phone', 'address'].forEach((k) => { if (!dupe[k] && data[k]) dupe[k] = data[k]; });
        if (!dupe.email && data.email) dupe.email = data.email;
        if (!dupe.terms && data.terms) dupe.terms = data.terms;
        return dupe.id;
      }
      const created = Object.assign({ id: S.uid() }, data);
      S.db.clients.push(created);
      S.log('client', 'Client ' + created.name + ' saved while invoicing');
      return created.id;
    }

    function doSave(andSend) {
      const root = document.getElementById('view');
      const stale = root.querySelector('.form-err'); if (stale) stale.remove();
      if (draft.clientId === '__new') {
        const id = resolveNewClientId(root);
        if (!id) return;
        draft.clientId = id;
        const c = S.getClient(id);
        draft.dueDate = S.addDays(draft.issueDate, (c && c.terms) || 30);
        const sel = root.querySelector('#ed-client');
        if (sel) sel.value = id;
      }
      if (!draft.clientId || !S.getClient(draft.clientId)) {
        UI.toast('Pick a client first', 'red');
        formErr(root, 'Choose who this invoice is for — the client name prints on the document.');
        fieldErr(root.querySelector('#ed-client'), 'Required');
        return;
      }
      const cleanItems = draft.items.filter((it) => (it.desc || '').trim() || S.num(it.price) > 0);
      if (!cleanItems.length) {
        UI.toast('Add at least one line item', 'red');
        formErr(root, 'Add at least one line item — a description alone is enough to save.');
        fieldErr(root.querySelector('#ed-items input[data-f="desc"]'), 'What are you charging for?');
        return;
      }
      /* keep the inventory link (and its deduction history) — the old map here
         rebuilt rows from three fields and silently untied every stock line */
      draft.items = cleanItems.map((it) => {
        const row = { desc: (it.desc || '').trim() || 'Item', qty: S.num(it.qty) || 1, price: S.num(it.price) };
        if (it.inventory_id && S.inventoryItem(it.inventory_id)) {
          row.inventory_id = it.inventory_id;
          if (S.num(it.stock_deducted) > 0) row.stock_deducted = S.num(it.stock_deducted);
        }
        return row;
      });
      // never persist the inline scratch object on the invoice record
      delete draft.newClient;
      let inv;
      if (existing) {
        Object.assign(existing, draft);
        delete existing.newClient;
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
      clearDirty();   // the work now exists on disk — stop guarding the exit
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
