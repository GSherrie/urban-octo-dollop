/* ============ SherPay views: Clients (CRM), Expenses + OCR receipt scan, Time tracking ============ */
(function () {
  const S = window.Store, UI = window.UI;
  const icon = UI.icon, esc = S.esc;

  /* ================= CLIENTS ================= */
  UI.VIEWS.clients = function () {
    return {
      title: 'Clients',
      sub: S.db.clients.length + ' saved contacts · auto-fill on invoicing',
      topActions: '<button class="btn primary" data-action="add">' + icon('plus') + 'New client</button>',
      html: '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">' +
        S.db.clients.map((c) => {
          const invs = S.db.invoices.filter((i) => i.clientId === c.id);
          const billed = invs.reduce((s, i) => s + S.computeTotals(i).total, 0);
          const outstanding = invs.reduce((s, i) => s + (S.displayStatus(i) === 'paid' || S.displayStatus(i) === 'draft' ? 0 : S.computeTotals(i).balance), 0);
          return '<div class="card"><div class="card-b">' +
            '<div class="row" style="gap:12px">' + UI.avatar(c.name) + '<div style="flex:1;min-width:0"><b>' + esc(c.name) + '</b><div class="tiny muted">' + esc(c.contact || '') + '</div></div>' +
            '<button class="btn icon ghost" data-action="edit" data-id="' + c.id + '">' + icon('edit') + '</button>' +
            '<button class="btn icon ghost" data-action="del" data-id="' + c.id + '">' + icon('trash') + '</button></div>' +
            '<div class="tiny muted mt" style="white-space:pre-line">' + esc(c.address || '') + '</div>' +
            '<div class="tiny mt">' + icon('mail') + ' <a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></div>' +
            '<div class="tiny">' + icon('msg') + ' ' + esc(c.phone || '—') + ' · terms ' + (c.terms || 30) + ' days</div>' +
            '<div class="row mt" style="gap:8px"><span class="chip">' + invs.length + ' invoices</span><span class="chip">billed ' + S.fmtMoney(billed, S.db.settings.currency) + '</span>' + (outstanding > 0 ? '<span class="chip" style="background:var(--amber-soft);border-color:transparent;color:#A56A00">due ' + S.fmtMoney(outstanding, S.db.settings.currency) + '</span>' : '') + '</div>' +
            '<button class="btn sm primary mt" style="width:100%" data-action="invoice" data-id="' + c.id + '">' + icon('invoice') + 'New invoice for ' + esc(c.name.split(' ')[0]) + '</button>' +
            '</div></div>';
        }).join('') + '</div>',
      actions: {
        add: () => clientModal(null),
        edit: (d) => clientModal(d.id),
        del: (d) => UI.confirmDialog('Delete client?', 'Their invoices stay on record but lose the contact link.', () => {
          S.db.clients = S.db.clients.filter((c) => c.id !== d.id); S.save(); UI.toast('Client deleted', 'green', 'trash'); UI.render();
        }),
        invoice: (d) => { UI.__prefillClient = d.id; location.hash = '#/invoices/new'; }
      }
    };
  };

  function clientModal(id) {
    const c = id ? S.getClient(id) : { id: null, name: '', contact: '', email: '', phone: '', address: '', terms: 30 };
    UI.openModal({
      title: id ? 'Edit client' : 'New client',
      body: '<div class="fgrid c2">' +
        '<div style="grid-column:1/-1"><label class="f">Business name</label><input id="cl-name" class="input" value="' + esc(c.name) + '"></div>' +
        '<div><label class="f">Contact person</label><input id="cl-contact" class="input" value="' + esc(c.contact) + '"></div>' +
        '<div><label class="f">Payment terms (days)</label><input id="cl-terms" class="input" type="number" value="' + (c.terms || 30) + '"></div>' +
        '<div><label class="f">Email</label><input id="cl-email" class="input" type="email" value="' + esc(c.email) + '"></div>' +
        '<div><label class="f">Phone</label><input id="cl-phone" class="input" value="' + esc(c.phone) + '"></div>' +
        '<div style="grid-column:1/-1"><label class="f">Billing address</label><textarea id="cl-addr" class="input">' + esc(c.address) + '</textarea></div>' +
        '</div>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="cl-save">' + icon('check') + 'Save client</button>',
      mount: (m) => m.querySelector('#cl-save').addEventListener('click', () => {
        const name = m.querySelector('#cl-name').value.trim();
        if (!name) { UI.toast('Client name is required', 'red'); return; }
        const data = { name, contact: m.querySelector('#cl-contact').value.trim(), email: m.querySelector('#cl-email').value.trim(), phone: m.querySelector('#cl-phone').value.trim(), address: m.querySelector('#cl-addr').value.trim(), terms: S.num(m.querySelector('#cl-terms').value) || 30 };
        if (id) Object.assign(c, data); else S.db.clients.push(Object.assign({ id: S.uid() }, data));
        S.save(); UI.closeModal(); UI.toast('Client saved to CRM', 'green', 'clients'); UI.render();
      })
    });
  }

  /* ================= EXPENSES + RECEIPT SCAN ================= */
  UI.VIEWS.expenses = function () {
    let cat = 'all';
    const list = () => S.db.expenses.filter((e) => cat === 'all' || e.category === cat).sort((a, b) => b.date.localeCompare(a.date));
    function tableHtml() {
      const l = list();
      if (!l.length) return '<div class="empty">' + icon('expenses') + '<b>No expenses here</b>Scan a receipt or log one manually.</div>';
      return '<div class="scroll-x"><table class="table"><thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th class="hide-sm">Tax</th><th class="right">Total</th><th class="hide-sm">Attachment</th><th></th></tr></thead><tbody>' +
        l.map((e) => '<tr><td class="small muted">' + S.fmtDate(e.date) + '</td><td><b class="small">' + esc(e.merchant) + '</b><div class="tiny muted">' + esc(e.notes || '') + '</div></td>' +
          '<td><span class="chip">' + esc(e.category) + '</span></td>' +
          '<td class="small tnum hide-sm">' + S.fmtMoney(e.tax, S.db.settings.currency) + '</td>' +
          '<td class="right tnum small">' + S.fmtMoney(e.total, S.db.settings.currency) + '</td>' +
          '<td class="hide-sm">' + (e.attachment ? '<button class="btn sm ghost" data-action="att" data-id="' + e.id + '">' + icon('file') + ' ' + esc(String(e.attachment.name || '').slice(0, 14)) + '</button>' : '<span class="tiny muted">—</span>') + '</td>' +
          '<td class="right"><button class="btn icon ghost" data-action="edit" data-id="' + e.id + '" title="Edit expense">' + icon('edit') + '</button><button class="btn icon ghost" data-action="del" data-id="' + e.id + '">' + icon('trash') + '</button></td></tr>').join('') +
        '</tbody></table></div>';
    }
    const byCat = {};
    S.db.expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.total; });
    const maxCat = Math.max(1, ...Object.values(byCat));
    const totalExp = S.db.expenses.reduce((s, e) => s + e.total, 0);
    const totalTax = S.db.expenses.reduce((s, e) => s + e.tax, 0);

    return {
      title: 'Expenses & Receipts',
      sub: S.fmtMoney(totalExp, S.db.settings.currency) + ' logged · ' + S.fmtMoney(totalTax, S.db.settings.currency) + ' recoverable tax',
      topActions: '<button class="btn ghost" data-action="csv">' + icon('download') + 'CSV</button><button class="btn ghost" data-action="add">' + icon('plus') + 'Log expense</button><button class="btn primary" data-action="scan">' + icon('scan') + 'Scan receipt</button>',
      html: '<div class="grid two">' +
        '<div class="card"><div class="card-h"><div class="row wrap" style="gap:6px"><button class="chip on" data-action="chip" data-s="all">All</button>' + S.CATEGORIES.map((c) => '<button class="chip" data-action="chip" data-s="' + c + '">' + c + '</button>').join('') + '</div></div><div id="exp-table">' + tableHtml() + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>By category</h3><div class="spacer"></div><span class="tiny muted">tax-deduction view</span></div><div class="card-b grid" style="gap:12px">' +
          Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div><div class="row small" style="margin-bottom:5px"><b style="flex:1">' + k + '</b><span class="tnum">' + S.fmtMoney(v, S.db.settings.currency) + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + (v / maxCat * 100) + '%"></div></div></div>').join('') +
        '</div></div></div>',
      actions: {
        chip: (d, el) => { cat = d.s; document.querySelectorAll('#view .card-h .chip').forEach((c) => c.classList.toggle('on', c.dataset.s === d.s)); document.getElementById('exp-table').innerHTML = tableHtml(); },
        add: () => expenseModal(null),
        edit: (d) => { const ex = S.db.expenses.find((x) => x.id === d.id); if (ex) expenseModal(JSON.parse(JSON.stringify(ex)), ex.id); },
        scan: () => scanModal(),
        del: (d) => UI.confirmDialog('Delete expense?', 'This removes the receipt record and attachment.', () => { S.db.expenses = S.db.expenses.filter((e) => e.id !== d.id); S.save(); UI.render(); UI.toast('Expense deleted', 'green', 'trash'); }),
        att: (d) => {
          const e = S.db.expenses.find((x) => x.id === d.id);
          if (!e || !e.attachment) return;
          if (!e.attachment.dataUrl) { UI.toast('Attachment stored as metadata only (file too large)', 'red'); return; }
          fetch(e.attachment.dataUrl).then((r) => r.blob()).then((b) => {
            const url = URL.createObjectURL(b);
            const w = window.open(url, '_blank');
            if (!w) location.href = url; else setTimeout(() => URL.revokeObjectURL(url), 60000);
          }).catch(() => UI.toast('Could not open attachment', 'red'));
        },
        csv: () => {
          const rows = [['Date', 'Merchant', 'Category', 'Tax', 'Total', 'Notes']];
          S.db.expenses.forEach((e) => rows.push([e.date, e.merchant, e.category, e.tax.toFixed(2), e.total.toFixed(2), e.notes || '']));
          S.download('sherpay-expenses-' + S.todayISO() + '.csv', S.toCSV(rows), 'text/csv');
          UI.toast('Expenses exported', 'green', 'download');
        }
      }
    };
  };

  function expenseModal(prefill, editId) {
    const e = prefill || { date: S.todayISO(), merchant: '', category: S.CATEGORIES[0], tax: 0, total: 0, notes: '', attachment: null };
    UI.openModal({
      title: editId ? 'Edit expense' : (prefill && prefill.merchant ? 'Confirm scanned receipt' : 'Log expense'),
      body: (prefill && prefill.merchant ? '<div class="row mb" style="gap:8px;color:var(--green-dark)">' + icon('scan') + '<b class="small">Fields extracted via OCR — review & adjust before saving.</b></div>' : '') +
        '<div class="fgrid c2">' +
        '<div><label class="f">Merchant</label><input id="ex-mer" class="input" value="' + esc(e.merchant) + '"></div>' +
        '<div><label class="f">Date</label><input id="ex-date" class="input" type="date" value="' + e.date + '"></div>' +
        '<div><label class="f">Category</label><select id="ex-cat" class="input">' + S.CATEGORIES.map((c) => '<option' + (c === e.category ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>' +
        '<div><label class="f">Tax portion</label><input id="ex-tax" class="input" type="number" step="0.01" value="' + e.tax + '"></div>' +
        '<div><label class="f">Total</label><input id="ex-total" class="input" type="number" step="0.01" value="' + e.total + '"></div>' +
        '<div><label class="f">Attachment (PDF / image)</label><input id="ex-file" class="input" type="file" accept="image/*,application/pdf" style="padding:6px"></div>' +
        '<div style="grid-column:1/-1"><label class="f">Notes</label><input id="ex-notes" class="input" value="' + esc(e.notes || '') + '" placeholder="e.g. client lunch, deductible"></div>' +
        '</div>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="ex-save">' + icon('check') + 'Save expense</button>',
      mount: (m) => {
        let attachment = e.attachment || null;
        m.querySelector('#ex-file').addEventListener('change', (ev) => readFile(ev.target.files[0], (att) => { attachment = att; UI.toast('Attachment linked', 'green', 'file'); }));
        m.querySelector('#ex-save').addEventListener('click', () => {
          const merchant = m.querySelector('#ex-mer').value.trim();
          const total = S.num(m.querySelector('#ex-total').value);
          if (!merchant || total <= 0) { UI.toast('Merchant and total are required', 'red'); return; }
          const tax = S.num(m.querySelector('#ex-tax').value);
          if (tax < 0 || tax > total) { UI.toast('Tax portion must be between 0 and the total', 'red'); return; }
          const data = { date: m.querySelector('#ex-date').value || S.todayISO(), merchant, category: m.querySelector('#ex-cat').value, tax, total, notes: m.querySelector('#ex-notes').value.trim(), attachment };
          if (editId) {
            const rec = S.db.expenses.find((x) => x.id === editId);
            if (rec) Object.assign(rec, data);
            S.log('scan', 'Expense updated: ' + merchant + ' — ' + S.fmtMoney(total, S.db.settings.currency));
          } else {
            S.db.expenses.unshift(Object.assign({ id: S.uid() }, data));
            S.log('scan', 'Expense logged: ' + merchant + ' — ' + S.fmtMoney(total, S.db.settings.currency));
          }
          S.save(); UI.closeModal(); UI.toast(editId ? 'Expense updated' : 'Expense saved & categorised', 'green', 'expenses'); UI.render();
        });
      }
    });
  }

  function readFile(file, cb) {
    if (!file) return cb(null);
    if (file.size > 1800000) { cb({ name: file.name, type: file.type, dataUrl: null }); return; }
    const r = new FileReader();
    r.onload = () => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          try {
            const max = 1600, scale = Math.min(1, max / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            cb({ name: file.name, type: 'image/jpeg', dataUrl: c.toDataURL('image/jpeg', 0.82) });
          } catch (err) { cb({ name: file.name, type: file.type, dataUrl: r.result }); }
        };
        img.onerror = () => cb({ name: file.name, type: file.type, dataUrl: r.result });
        img.src = r.result;
      } else cb({ name: file.name, type: file.type, dataUrl: r.result });
    };
    r.readAsDataURL(file);
  }

  /* ---- simulated OCR scanner ---- */
  const DEMO_RECEIPTS = [
    { merchant: 'Shell Oasis Station', category: 'Travel', total: 486.5, tax: 63.4, notes: 'Fuel — client site visit' },
    { merchant: 'Café Kwae', category: 'Meals', total: 218.0, tax: 28.4, notes: 'Team breakfast' },
    { merchant: 'Zoom Communications', category: 'Software', total: 172.4, tax: 22.5, notes: 'Pro licence, monthly' },
    { merchant: 'Melcom Stores', category: 'Office', total: 356.9, tax: 46.4, notes: 'Office supplies' }
  ];
  function scanModal() {
    let picked = null;
    const liveSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    UI.openModal({
      title: 'Scan a receipt (OCR)',
      wide: true,
      body: '<div class="grid half" style="gap:18px">' +
        '<div><div class="scan-frame" id="scan-frame"><div class="scan-corners"><i></i><i></i><i></i><i></i></div><div id="scan-msg" style="color:#9FD8FF;font-size:13px;font-weight:600;text-align:center;padding:0 20px">Point your camera at a receipt,<br>or upload a photo / PDF</div></div>' +
        '<div class="row mt" style="gap:8px;flex-wrap:wrap">' +
          '<label class="btn primary" style="flex:1;cursor:pointer">' + icon('scan') + ' Take photo<input id="scan-cam" type="file" accept="image/*" capture="environment" hidden></label>' +
          (liveSupported ? '<button class="btn ghost" id="scan-live" style="flex:1">' + icon('play') + ' Restart camera</button>' : '') +
          '<label class="btn ghost" style="flex:1;cursor:pointer">' + icon('file') + ' Upload<input id="scan-file" type="file" accept="image/*,application/pdf" hidden></label>' +
          '<button class="btn ghost" id="scan-demo">' + icon('play') + '<span class="hide-sm"> Demo</span></button>' +
        '</div>' +
        '<p class="hint">“Take photo” opens your rear camera directly. “Live camera” streams the viewfinder here and captures a frame. OCR extracts merchant, date, tax & total. Works offline — syncs when you reconnect.</p></div>' +
        '<div><label class="f">Extracted fields</label><div id="scan-out" class="grid" style="gap:9px"><div class="empty small">Waiting for scan…</div></div></div>' +
        '</div>',
      footer: '<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" id="scan-use" disabled>' + icon('check') + 'Use extracted data</button>',
      mount: (m) => {
        const frame = m.querySelector('#scan-frame'), out = m.querySelector('#scan-out'), use = m.querySelector('#scan-use');
        let liveStream = null;
        const stopLive = () => { if (liveStream) { liveStream.getTracks().forEach((t) => t.stop()); liveStream = null; } };
        // stop the camera the moment the modal closes (backdrop, cancel, X, or successful use)
        const mo = new MutationObserver(() => { if (!document.body.contains(frame)) { stopLive(); mo.disconnect(); } });
        mo.observe(document.getElementById('modal-root'), { childList: true });
        function runScan(imgDataUrl, fileName, att) {
          stopLive();
          frame.innerHTML = (imgDataUrl ? '<img src="' + imgDataUrl + '" alt="">' : '') + '<div class="scan-line"></div><div class="scan-corners"><i></i><i></i><i></i><i></i></div>';
          out.innerHTML = '<div class="empty small">Extracting merchant, date, tax, total…</div>';
          use.disabled = true;
          setTimeout(() => {
            const d = picked || DEMO_RECEIPTS[Math.floor(Math.random() * DEMO_RECEIPTS.length)];
            const guess = { date: S.todayISO(), merchant: d.merchant, category: d.category, tax: d.tax, total: d.total, notes: d.notes, attachment: att || (imgDataUrl ? { name: fileName || 'receipt.jpg', type: 'image/jpeg', dataUrl: imgDataUrl } : null) };
            out.innerHTML = '<div class="card" style="box-shadow:none"><div class="card-b grid" style="gap:7px">' +
              [['Merchant', guess.merchant], ['Date', S.fmtDate(guess.date)], ['Category', guess.category], ['Tax', S.fmtMoney(guess.tax, S.db.settings.currency)], ['Total', S.fmtMoney(guess.total, S.db.settings.currency)]]
                .map((r) => '<div class="row small"><span class="muted" style="width:76px">' + r[0] + '</span><b>' + esc(String(r[1])) + '</b></div>').join('') +
              '<div class="tiny" style="color:var(--green-dark)">' + icon('check') + ' Confidence 94% · editable on next step</div></div></div>';
            frame.innerHTML = (imgDataUrl ? '<img src="' + imgDataUrl + '" alt="">' : '<div style="color:#9FD8FF;font-size:13px;font-weight:600">✓ Scan complete</div>') + '<div class="scan-corners"><i></i><i></i><i></i><i></i></div>';
            use.disabled = false;
            use.onclick = () => { UI.closeModal(); expenseModal(guess); };
          }, 1700);
        }
        m.querySelector('#scan-file').addEventListener('change', (ev) => {
          const f = ev.target.files[0]; if (!f) return;
          picked = null;
          if (f.type.startsWith('image/')) readFile(f, (att) => runScan(att && att.dataUrl, f.name));
          else readFile(f, (att) => runScan(null, f.name, att));
        });
        // direct rear-camera capture — opens the OS camera app (works in installed PWAs too)
        m.querySelector('#scan-cam').addEventListener('change', (ev) => {
          const f = ev.target.files[0]; if (!f) return;
          picked = null;
          readFile(f, (att) => runScan(att && att.dataUrl, f.name));
        });
        // live viewfinder via getUserMedia — auto-opens IN the scan frame (the boxed area)
        function startLive() {
          frame.innerHTML = '<video id="scan-video" autoplay playsinline muted style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000"></video><div class="scan-corners"><i></i><i></i><i></i><i></i></div>' +
            '<button id="scan-snap" class="btn green" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%)">' + icon('scan') + ' Capture</button>';
          navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
            .then((stream) => {
              liveStream = stream;
              const v = frame.querySelector('#scan-video');
              v.srcObject = stream; v.play().catch(() => {});
              frame.querySelector('#scan-snap').addEventListener('click', () => {
                const c = document.createElement('canvas');
                c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
                c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
                picked = null;
                runScan(c.toDataURL('image/jpeg', 0.85), 'camera-capture.jpg');
              });
            })
            .catch(() => {
              frame.innerHTML = '<div class="scan-corners"><i></i><i></i><i></i><i></i></div><div style="color:#9FD8FF;font-size:13px;font-weight:600;text-align:center;padding:0 20px">Camera unavailable or blocked.<br>Use “Take photo” or “Upload” below.</div>';
            });
        }
        const liveBtn = m.querySelector('#scan-live');
        if (liveBtn) liveBtn.addEventListener('click', startLive);
        if (liveSupported) startLive(); // camera lights up in the frame the moment the scanner opens
        m.querySelector('#scan-demo').addEventListener('click', () => { picked = DEMO_RECEIPTS[Math.floor(Math.random() * DEMO_RECEIPTS.length)]; runScan(null, null); });
      }
    });
  }
  UI.VIEWS.expenses.__scan = scanModal;

  /* ================= TIME TRACKING ================= */
  // running timer survives reloads (persisted separately from the main db)
  const TIMER_KEY = 'sherpay_timer_v1';
  let running = null; // {clientId, desc, startedAt}
  try { running = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null') || null; } catch (e) { running = null; }
  const persistTimer = () => { try { if (running) localStorage.setItem(TIMER_KEY, JSON.stringify(running)); else localStorage.removeItem(TIMER_KEY); } catch (e) {} };
  UI.VIEWS.time = function () {
    const rate = S.db.settings.hourlyRate;
    function fmtDur(ms) {
      const s = Math.floor(ms / 1000);
      return S.pad(Math.floor(s / 3600), 2) + ':' + S.pad(Math.floor(s / 60) % 60, 2) + ':' + S.pad(s % 60, 2);
    }
    const entries = S.db.timeEntries.slice().sort((a, b) => (b.end || b.startedAt).localeCompare(a.end || a.startedAt));
    const unbilled = entries.filter((e) => !e.invoiced);
    const unbilledValue = unbilled.reduce((s, e) => s + ((new Date(e.end) - new Date(e.startedAt)) / 3600000) * (e.rate || rate), 0);
    return {
      title: 'Time Tracking',
      sub: 'Stopwatch → billable hours → invoice line items',
      topActions: '<button class="btn primary" data-action="invoice-sel" ' + (unbilled.length ? '' : 'disabled') + '>' + icon('invoice') + 'Invoice ' + unbilled.length + ' entr' + (unbilled.length === 1 ? 'y' : 'ies') + ' (' + S.fmtMoney(unbilledValue, S.db.settings.currency) + ')</button>',
      html: '<div class="grid two">' +
        '<div class="card"><div class="card-b" style="text-align:center;padding:26px">' +
          '<div class="timer-big' + (running ? ' run' : '') + '" id="tm-clock">' + (running ? fmtDur(Date.now() - running.startedAt) : '00:00:00') + '</div>' +
          '<div class="tiny muted mb">' + (running ? 'Tracking: ' + esc(running.desc || 'Untitled task') + ' · ' + esc((S.getClient(running.clientId) || {}).name || '') : 'Timer idle') + '</div>' +
          (running ? '<button class="btn green" style="padding:12px 30px;font-size:15px" data-action="stop">' + icon('stop') + 'Stop & save</button>'
            : '<div class="fgrid c2 mt" style="text-align:left"><div><label class="f">Client</label><select id="tm-client" class="input">' + S.db.clients.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select></div><div><label class="f">Task</label><input id="tm-desc" class="input" placeholder="e.g. Homepage redesign"></div></div><button class="btn primary mt" style="padding:12px 30px;font-size:15px" data-action="start">' + icon('play') + 'Start timer</button>') +
          '<div class="hint mt">Billable at ' + S.fmtMoney(rate, S.db.settings.currency) + '/h (change in Settings)</div>' +
        '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Time entries</h3><div class="spacer"></div><span class="tiny muted">' + unbilled.length + ' unbilled</span></div>' +
          (entries.length ? '<div class="scroll-x"><table class="table"><thead><tr><th>Task</th><th>Client</th><th class="right">Duration</th><th class="right">Value</th><th></th></tr></thead><tbody>' +
            entries.map((e) => { const dur = (new Date(e.end) - new Date(e.startedAt)) / 3600000; return '<tr><td><b class="small">' + esc(e.desc || 'Untitled') + '</b><div class="tiny muted">' + S.fmtDate(e.startedAt.slice(0, 10)) + '</div></td><td class="small">' + esc((S.getClient(e.clientId) || {}).name || '—') + '</td><td class="right tnum small">' + dur.toFixed(2) + 'h</td><td class="right tnum small">' + S.fmtMoney(dur * e.rate, S.db.settings.currency) + '</td><td>' + (e.invoiced ? '<span class="badge paid">Invoiced</span>' : '<span class="badge partial">Unbilled</span>') + '</td></tr>'; }).join('') +
            '</tbody></table></div>' : '<div class="empty">' + icon('time') + '<b>No time entries yet</b>Start the stopwatch to capture billable hours.</div>') +
        '</div></div>',
      mount: (root) => {
        if (running) {
          const clock = root.querySelector('#tm-clock');
          const iv = setInterval(() => { if (!document.body.contains(clock)) { clearInterval(iv); return; } clock.textContent = fmtDur(Date.now() - running.startedAt); }, 1000);
        }
      },
      actions: {
        start: () => {
          running = { clientId: document.getElementById('tm-client').value, desc: document.getElementById('tm-desc').value.trim(), startedAt: new Date().toISOString() };
          persistTimer();
          UI.toast('Timer started', 'green', 'play'); UI.render();
        },
        stop: () => {
          const entry = { id: S.uid(), clientId: running.clientId, desc: running.desc, startedAt: running.startedAt, end: new Date().toISOString(), rate: S.db.settings.hourlyRate, invoiced: false };
          S.db.timeEntries.push(entry); running = null; persistTimer(); S.save();
          const dur = (new Date(entry.end) - new Date(entry.startedAt)) / 3600000;
          UI.toast('Saved ' + dur.toFixed(2) + 'h — ' + S.fmtMoney(dur * entry.rate, S.db.settings.currency) + ' billable', 'green', 'time');
          UI.render();
        },
        'invoice-sel': () => {
          const unb = S.db.timeEntries.filter((e) => !e.invoiced);
          if (!unb.length) return;
          const byClient = {};
          unb.forEach((e) => { (byClient[e.clientId] = byClient[e.clientId] || []).push(e); });
          // one draft invoice per client — entries must never be billed to the wrong client
          const created = [];
          Object.keys(byClient).forEach((clientId) => {
            const items = byClient[clientId].map((e) => ({ desc: (e.desc || 'Billable time') + ' (' + ((new Date(e.end) - new Date(e.startedAt)) / 3600000).toFixed(2) + 'h @ ' + e.rate + '/h)', qty: 1, price: +(((new Date(e.end) - new Date(e.startedAt)) / 3600000) * e.rate).toFixed(2) }));
            const inv = { id: S.uid(), number: S.newInvoiceNumber(S.todayISO()), clientId, issueDate: S.todayISO(), dueDate: S.addDays(S.todayISO(), (S.getClient(clientId) || { terms: 30 }).terms || 30), currency: S.db.settings.currency, items, taxMode: 'none', taxValue: 0, discountMode: 'none', discountValue: 0, status: 'draft', payments: [], notes: 'Generated from tracked time.', recurring: null };
            S.db.invoices.unshift(inv);
            byClient[clientId].forEach((e) => { e.invoiced = true; });
            S.log('created', 'Invoice ' + inv.number + ' created from ' + items.length + ' time entries');
            created.push(inv);
          });
          S.save();
          UI.toast(created.length === 1 ? 'Draft ' + created[0].number + ' created from time entries' : created.length + ' drafts created — one per client', 'green', 'invoice');
          location.hash = '#/invoices/' + created[0].id + '/edit';
        }
      }
    };
  };
})();
