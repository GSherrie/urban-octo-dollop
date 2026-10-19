/* ============ SherPay view: Inventory ============ */
/* Pro feature. Stock that auto-deducts when you bill it on an invoice. */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;

  UI.VIEWS.inventory = function (parts) {
    const isNew = parts[1] === 'new';
    const editingId = (isNew || parts[1]) ? (parts[1] || null) : null;
    const editing = editingId ? S.inventoryItem(editingId) : null;
    const notFound = editingId && !editing;
    const empty = !editing && S.db.inventory.length === 0;
    const isPro = S.upgrades.isPro();


    const formVisible = isPro && !(empty && !editing);
    const formHtml = (function () {
      if (notFound) return '<div class="empty">Inventory item not found.</div>';
      if (!formVisible) return '';
      const f = editing || { id: null, sku: '', name: '', qty: 0, unit: 'unit', cost: 0, note: '' };
      const UNIT_OPTIONS = ['unit', 'box', 'pack', 'jar', 'roll', 'sheet', 'each', 'metre', 'litre'].map(function (u) {
        const sel = u === (f.unit || 'unit') ? ' selected' : '';
        return '<option value="' + u + '"' + sel + '>' + u + '</option>';
      }).join('');
      const submitBtn = editing ? 'Update stock' : 'Add to stock';
      return '<div class="card card-b" style="background:var(--bg);border-style:dashed">'
        + '<div class="small mb" style="font-weight:700">' + (editing ? 'Edit stock level' : 'Add stock to sell from') + '</div>'
        + '<div class="fgrid c3">'
        + '<div><label class="f">SKU</label><input id="inv-sku" class="input" value="' + esc(f.sku || '') + '" placeholder="e.g. BAT-4PK"></div>'
        + '<div><label class="f">Name *</label><input id="inv-name" class="input" value="' + esc(f.name || '') + '" placeholder="e.g. AA Alkaline Batteries"></div>'
        + '<div><label class="f">Qty</label><input id="inv-qty" class="input" type="number" min="0" value="' + (S.num(f.qty) || 0) + '"></div>'
        + '<div><label class="f">Unit</label><select id="inv-unit" class="input">' + UNIT_OPTIONS + '</select></div>'
        + '<div><label class="f">Cost / unit</label><input id="inv-cost" class="input" type="number" step="0.01" min="0" value="' + (S.num(f.cost) || 0) + '"></div>'
        + '<div style="grid-column:1/-1"><label class="f">Note</label><input id="inv-note" class="input" value="' + esc(f.note || '') + '" placeholder="e.g. per client PO"></div>'
        + '</div>'
        + '<div class="row mt" style="gap:8px;flex-wrap:wrap">'
        + '<button class="btn ghost" data-action="cancel-inv">' + icon('x') + 'Cancel</button>'
        + '<button class="btn primary" data-action="save-inv">' + icon('check') + ' ' + submitBtn + '</button>'
        + '</div>'
        + '</div>'
        + '</div>';
    })();

    const hasStock = S.db.inventory.length > 0;
    const title = isPro ? 'Inventory' : 'Inventory (Pro)';
    const sub = isPro
      ? (hasStock ? S.db.inventory.length + ' item' + (S.db.inventory.length === 1 ? '' : 's') + ' on hand' : 'No stock — add items to start tracking')
      : 'Pro feature · 1 GHS once, 12 months';
    const listHtml = isPro
      ? (hasStock
          ? '<div class="scroll-x"><table class="table items-table"><thead><tr><th>SKU</th><th>Name</th><th class="right">Qty</th><th>Unit</th><th class="right">Cost</th><th></th></tr></thead><tbody id="inv-items">' + S.db.inventory.map(function (item) {
              const low = (item.qty || 0) < 10 ? 'warn' : '';
              return '<tr' + (low ? ' class="' + low + '"' : '') + '>'
                + '<td><b>' + esc(item.sku || '—') + '</b><div class="tiny muted">' + esc(item.name) + '</div></td>'
                + '<td class="right"><b>' + (S.num(item.qty) || 0) + '</b></td>'
                + '<td>' + esc(item.unit || 'unit') + '</td>'
                + '<td class="right">' + S.fmtMoney(S.num(item.cost), 'GHS') + '</td>'
                + '<td><button class="btn icon ghost" data-action="edit-inv" data-id="' + item.id + '" aria-label="Edit ' + esc(item.name) + '">' + icon('edit') + '</button></td>'
                + '</tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="empty">Nothing in stock yet. <button class="btn primary" data-action="add">Add item</button></div>')
      : '<div class="empty">SherPay Pro unlocks inventory management.</div>';

    const html = ''
      + '<div class="card">'
        + '<div class="card-h"><h3>' + title + '</h3><div class="spacer"></div>'
        + '<span class="tiny muted">' + sub + '</span></div>'
        + listHtml
      + '</div>'
      + formHtml;

    const actions = {
      'add': () => UI.go('#/inventory/new'),
      'edit-inv': (d) => UI.go('#/inventory/' + d.id),
      'cancel-inv': () => UI.go('#/inventory'),
      'open-inv': () => UI.go('#/inventory'),
      'save-inv': function (data) {
        const m = UI.$(data && data.target) || {};
        const sku = m.querySelector('#inv-sku').value.trim();
        const name = m.querySelector('#inv-name').value.trim();
        const qty = S.num(m.querySelector('#inv-qty').value) || 0;
        const unit = m.querySelector('#inv-unit').value || 'unit';
        const cost = S.num(m.querySelector('#inv-cost').value) || 0;
        const note = m.querySelector('#inv-note').value.trim();
        if (!name) { UI.toast('Item name is required', 'red'); return; }
        if (editing) {
          S.updateInventoryItem(editing.id, { sku, qty, unit, cost, note });
          UI.toast('Stock updated', 'green', 'box');
        } else {
          S.addInventoryItem({ sku, name, qty, unit, cost, note });
          UI.toast('Item added to stock', 'green', 'box');
        }
        UI.go('#/inventory');
      }
    };

    return { title: title, sub: sub, html: html, actions: actions };
  };
})();
