/* =====================================================================
   Auto Engineer — daily stock update (Staff › Parts › Daily stock update)
   Upload an Excel/CSV or paste "part number  quantity" lines. Every matching part gets the
   quantity. Partner shops see the exact quantity; retail customers see In stock / On order.
   ===================================================================== */
/* pnKey (part number → letters/digits, lower case) comes from app.js */
const ZERO_OPTS = [['On order', 'On order (2–5 days)'], ['Out of stock', 'Out of stock'], ['Ask', 'Ask']];

/* ---- columns: found automatically from the heading row, and the user can change them ---- */
const hNorm = x => String(x == null ? '' : x).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const COLDEF = {
  pn: {lbl: 'Part number', exact: ['partno','partnumber','pn','part','partnum','number','item','itemno','itemnumber','material','code','partcode','رقمالقطعة','رقم','ژمارە','ژمارەیپارچە'], has: ['partno','partnum','رقمالقطع','ژمارەیپارچ']},
  q: {lbl: 'Quantity', exact: ['qty','quantity','stock','onhand','soh','available','availableqty','balance','qoh','stockqty','freestock','free','qtyonhand','instock','الكمية','كمية','عدد','بڕ'], has: ['qty','quantity','onhand','كمي','بڕ']},
  w: {lbl: 'Wholesale price', exact: ['wholesale','wholesaleprice','trade','tradeprice','dealer','dealerprice','wsprice','ws','wsp','partnerprice','wholesaleiqd','price','unitprice','sellingprice','saleprice','netprice','السعر','سعر','سعرالجملة','نرخ','نرخیکۆ'], has: ['wholesale','trade','dealer','price','سعر','نرخ'], not: ['retail','cost','total','amount','مفرد','تاک']},
  n: {lbl: 'Name', exact: ['name','description','desc','partname','itemname','itemdescription','partdescription','nomenclature','الاسم','اسم','الوصف','وصف','ناو','ناوی'], has: ['name','desc','اسم','وصف','ناو']}
};
function findCol(h, def, used){
  let i = h.findIndex((x, k) => !used.includes(k) && def.exact.includes(x)); if(i >= 0) return i;
  return h.findIndex((x, k) => !used.includes(k) && x && def.has.some(z => x.includes(z)) && !(def.not || []).some(z => x.includes(z)));
}
function detectCols(rows){
  for(let r = 0; r < Math.min(rows.length, 15); r++){
    const h = (rows[r] || []).map(hNorm); const pn = findCol(h, COLDEF.pn, []); if(pn < 0) continue;
    const q = findCol(h, COLDEF.q, [pn]); if(q < 0) continue;
    const w = findCol(h, COLDEF.w, [pn, q]), n = findCol(h, COLDEF.n, [pn, q, w]);
    return {start: r + 1, hdr: (rows[r] || []).map(x => String(x == null ? '' : x).trim()), pn, q, w, n};
  }
  return null;
}
/* rows: array of arrays → [{pn, key, qty, w, n}] (same part on several lines is added up) */
function parseStockRows(rows, cols){
  cols = cols === undefined ? detectCols(rows) : cols;
  const out = new Map(); let bad = 0;
  for(let r = cols ? cols.start : 0; r < rows.length; r++){
    const row = (rows[r] || []).map(x => String(x == null ? '' : x).trim()); let pn, q;
    if(cols){ pn = row[cols.pn]; q = row[cols.q]; }
    else{ const cells = row.filter(Boolean); pn = cells.find(z => /\d/.test(z) && pnKey(z).length >= 5);
      const nums = cells.filter(z => z !== pn && /^-?\d+(\.\d+)?$/.test(z.replace(/,/g, ''))); q = nums.length ? nums[nums.length - 1] : ''; }
    const k = pnKey(pn); if(k.length < 4){ if(row.some(Boolean)) bad++; continue; }
    const n = Number(String(q == null ? '' : q).replace(/,/g, '')); if(q === '' || q == null || !isFinite(n)){ bad++; continue; }
    const wv = cols && cols.w >= 0 ? Number(String(row[cols.w] || '').replace(/[^0-9.]/g, '')) : 0, w = wv > 0 ? wv : null;
    const nm = cols && cols.n >= 0 ? String(row[cols.n] || '').trim() : '';
    const e = out.get(k); out.set(k, {pn: e ? e.pn : String(pn).trim(), key: k, qty: (e ? e.qty : 0) + Math.max(0, Math.floor(n)), w: w || (e ? e.w : null), n: nm || (e ? e.n : '')});
  }
  return {items: [...out.values()], bad, cols};
}
const textRows = txt => String(txt || '').split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim()).map(l =>
  l.includes('\t') ? l.split('\t').map(x => x.trim()) // keep empty cells so columns stay in place
    : l.split(/;|\||,(?!\d{3}(?!\d))|\s+/).map(x => x.trim()).filter(x => x && x.toLowerCase() !== 'x'));

const StockAPI = {
  live: () => S.mode === 'supabase',
  async preview(keys, col){
    if(this.live()){ const {data, error} = await S.sb.rpc('stock_preview', {p_keys: keys, p_col: col}); if(error) throw error; return data; }
    const parts = Store.all(col), have = new Set(parts.map(p => pnKey(p.partNo))), ks = new Set(keys), unk = keys.filter(k => !have.has(k));
    return {matched: keys.length - unk.length, unknownCount: unk.length, unknown: unk.slice(0, 300),
      missing: parts.filter(p => !ks.has(pnKey(p.partNo)) && ((+p.qty || 0) > 0 || p.stock === 'In stock')).length};
  },
  async apply(items, zs, col, onProgress){ let changed = 0;
    for(let i = 0; i < items.length; i += 1500){ const part = items.slice(i, i + 1500);
      if(this.live()){ const {data, error} = await S.sb.rpc('stock_apply', {p_rows: part.map(x => { const o = {k: x.key, q: x.qty}; if(x.w) o.w = x.w; if(col === 'wparts'){ o.pn = x.pn; if(x.n) o.n = x.n; } return o; }), p_zero_status: zs, p_col: col}); if(error) throw error; changed += data || 0; }
      else{ const by = new Map(part.map(x => [x.key, x])), seen = new Set();
        for(const p of Store.all(col)){ const x = by.get(pnKey(p.partNo)); if(!x) continue; seen.add(x.key); const q = x.qty, st = q > 0 ? 'In stock' : zs;
          if(p.qty === q && p.stock === st && (!x.w || +p.wholesalePrice === x.w) && !(col === 'wparts' && x.n && x.n !== p.name)) continue;
          const d = {...p, qty: q, stock: st}; if(x.w) d.wholesalePrice = x.w; if(col === 'wparts' && x.n) d.name = x.n; delete d.id; await Store.set(col, p.id, d); changed++; }
        if(col === 'wparts') for(const x of part){ if(seen.has(x.key)) continue; const d = {partNo: x.pn, name: x.n || '', qty: x.qty, stock: x.qty > 0 ? 'In stock' : zs, createdAt: Date.now()}; if(x.w) d.wholesalePrice = x.w; await Store.set('wparts', wpId(x.pn), d); changed++; } }
      onProgress && onProgress(Math.min(items.length, i + 1500), items.length); }
    return changed; },
  async zeroMissing(keys, zs, col){ let total = 0;
    if(this.live()){ for(let guard = 0; guard < 200; guard++){ const {data, error} = await S.sb.rpc('stock_zero_missing', {p_keys: keys, p_zero_status: zs, p_lim: 2000, p_col: col}); if(error) throw error; total += data || 0; if((data || 0) < 2000) break; } return total; }
    const ks = new Set(keys);
    for(const p of Store.all(col)){ if(ks.has(pnKey(p.partNo)) || !((+p.qty || 0) > 0 || p.stock === 'In stock')) continue; const d = {...p, qty: 0, stock: zs}; delete d.id; await Store.set(col, p.id, d); total++; }
    return total; },
  async done(lines, matched, col){ const w = col === 'wparts', info = w ? 'wstockinfo' : 'stockinfo';
    if(this.live()){ const {data, error} = await S.sb.rpc('stock_done', {p_lines: lines, p_matched: matched, p_col: col}); if(error) throw error; S.data.config = {...S.data.config, [info]: {at: data, lines, matched}}; return data; }
    const at = Date.now(); await Store.set('config', 'settings', {...settings(), [w ? 'wStockUpdatedAt' : 'stockUpdatedAt']: at}); await Store.set('config', info, {at, lines, matched, by: S.me || ''}); return at; }
};

function stockInfoLine(col){ const si = Store.get('config', col === 'wparts' ? 'wstockinfo' : 'stockinfo'); if(!si || !si.at) return t('Stock has not been uploaded yet.');
  return t('Last stock update: {d} · {n} part numbers', {d: dtStr(si.at), n: (si.matched || 0).toLocaleString('en-US')}); }

function openStockUpdate(col){ col = col === 'wparts' ? 'wparts' : 'parts'; const W = col === 'wparts';
  const st = {items: [], bad: 0, pv: null};
  openModal(mHead((W ? '🏪 ' + t('Wholesale catalog') : '🛒 ' + t('Retail catalog')) + ' · ' + t('Daily stock update'), stockInfoLine(col)) + `<div class="modal-body">
    <p class="mini">${t('Upload your stock report (Excel or CSV) or paste it below: one part number and its quantity per line. Columns are found automatically (e.g. PartNo and Qty).')} ${W ? t('For wholesale, add Name and Wholesale price columns: new part numbers are added to the wholesale catalog.') : ''}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><label class="btn red" style="cursor:pointer">📄 ${t('Choose Excel / CSV')}<input type="file" id="skF" accept=".xlsx,.xls,.csv,.txt" hidden></label><span class="mini" id="skFile" style="align-self:center"></span></div>
    <textarea id="skT" class="sel" rows="7" dir="ltr" style="width:100%;font-family:monospace" placeholder="${W ? 'PartNo\tName\tQty\tWholesale\n04465-0K290\tBrake pads\t12\t55000' : '04465-0K290   12\n90915-YZZE1   140\n48510-0K330   0'}"></textarea>
    <div class="row2" style="margin-top:12px"><div class="f"><label>${t('When the quantity is 0, show customers')}</label><select id="skZ" class="sel">${ZERO_OPTS.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></div>
      <div class="f"><label>&nbsp;</label><label class="mini" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="skM" checked style="width:auto;margin-top:3px"> <span>${t('This is my full stock list: parts that are not in the list now have 0.')}</span></label></div></div>
    <div id="skCols"></div><div id="skR"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn" id="skChk">${t('Check list')}</button><button class="btn red hidden" id="skGo">${t('Update stock')}</button></div></div>`, true);
  const reset = () => { st.pv = null; $('#skGo').classList.add('hidden'); $('#skR').innerHTML = ''; };
  $('#skT').oninput = () => { reset(); st.fromFile = false; }; $('#skM').onchange = () => { if(st.pv) showPv(); };
  $('#skF').onchange = async e => { const f = e.target.files[0]; if(!f) return; reset();
    try{ let rows; if(/\.(csv|txt)$/i.test(f.name) && !window.XLSX) rows = textRows(await f.text());
      else{ if(!window.XLSX){ toast(t('Excel reader still loading. Try again in a moment.')); return; } const wb = XLSX.read(await f.arrayBuffer()); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: '', raw: false}); }
      st.raw = rows; st.cols = detectCols(rows); st.fromFile = true; st.fname = f.name; parseNow(); await check(); }
    catch(x){ toast(t('Could not read this file.')); } };
  // re-read the rows with the chosen columns and show the column pickers
  const parseNow = () => { const r = parseStockRows(st.raw || [], st.cols || null); st.items = r.items; st.bad = r.bad;
    if(st.fromFile){ $('#skT').value = r.items.slice(0, 1500).map(x => [x.pn, x.qty, W ? (x.w || '') : null, W ? x.n : null].filter(v => v !== null).join('\t')).join('\n') + (r.items.length > 1500 ? '\n…' : '');
      $('#skFile').textContent = st.fname + ' · ' + t('{n} part numbers', {n: r.items.length.toLocaleString('en-US')}); }
    const c = st.cols; if(!c){ $('#skCols').innerHTML = W && st.raw && st.raw.length ? `<p class="err">${t('No heading row found. Add a first row with column names, e.g. PartNo, Name, Qty, Wholesale.')}</p>` : ''; return; }
    const opt = (k, opt) => `<label class="mini" style="display:grid;gap:4px">${t(COLDEF[k].lbl)}<select class="sel" data-col="${k}">${opt ? `<option value="-1" ${c[k] < 0 ? 'selected' : ''}>— ${t('none')} —</option>` : ''}${c.hdr.map((h, i) => `<option value="${i}" ${c[k] === i ? 'selected' : ''}>${esc(h || t('Column {n}', {n: i + 1}))}</option>`).join('')}</select></label>`;
    $('#skCols').innerHTML = `<div class="box" style="margin-top:12px"><h4 style="margin:0 0 8px">${t('Columns in your file')}</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">${opt('pn')}${opt('q')}${W ? opt('w', 1) + opt('n', 1) : ''}</div></div>`; };
  $('#skCols') && ($('#skCols').onchange = async e => { const sel = e.target.closest('[data-col]'); if(!sel || !st.cols) return; st.cols[sel.dataset.col] = +sel.value; st.pv = null; $('#skGo').classList.add('hidden'); parseNow(); await check(); });
  const check = async () => {
    if(!st.fromFile){ st.raw = textRows($('#skT').value); st.cols = detectCols(st.raw); parseNow(); }
    if(!st.items.length){ $('#skR').innerHTML = `<p class="err">${t('No part numbers with quantities found.')}</p>`; return; }
    const b = $('#skChk'); b.disabled = true; b.textContent = t('Checking…');
    try{ st.pv = await StockAPI.preview(st.items.map(x => x.key), col); showPv(); }catch(x){ $('#skR').innerHTML = `<p class="err">${t('Could not check the list')}: ${esc(x.message || x)}</p>`; }
    b.disabled = false; b.textContent = t('Check list'); };
  const showPv = () => { const pv = st.pv, byKey = new Map(st.items.map(x => [x.key, x.pn])), zero = $('#skM').checked;
    const inStock = st.items.filter(x => x.qty > 0).length, withW = st.items.filter(x => x.w).length;
    $('#skR').innerHTML = `<div class="box" style="margin-top:12px"><h4>${t('Ready to update')}</h4>
      <p>✅ ${t('{n} parts found in your catalog', {n: (+pv.matched).toLocaleString('en-US')})} · ${t('{n} with quantity above 0', {n: inStock.toLocaleString('en-US')})}</p>
      ${withW ? `<p>🏪 ${t('{n} wholesale prices will be updated too', {n: withW.toLocaleString('en-US')})}</p>` : W ? `<p class="err">⚠️ ${t('No prices found in this list: partner shops will see "Price on request". Choose the price column above.')}</p>` : ''}
      ${W ? (n => n ? `<p>🏷️ ${t('{n} names will be updated', {n: n.toLocaleString('en-US')})}</p>` : `<p class="err">⚠️ ${t('No names found: partner shops will only see the part number. Choose the name column above.')}</p>`)(st.items.filter(x => x.n).length) : ''}
      ${zero ? `<p>⬇️ ${t('{n} parts not in the list will go to 0', {n: (+pv.missing).toLocaleString('en-US')})}</p>` : `<p class="mini">${t('Parts not in the list keep their current stock.')}</p>`}
      ${pv.unknownCount && W ? `<p>➕ ${t('{n} new part numbers will be added to the wholesale catalog', {n: (+pv.unknownCount).toLocaleString('en-US')})}</p>` : ''}
      ${pv.unknownCount && !W ? `<p class="err">⚠️ ${t('{n} part numbers are not in your catalog and will be skipped', {n: (+pv.unknownCount).toLocaleString('en-US')})}:<br><span class="mini ltr">${(pv.unknown || []).slice(0, 60).map(k => esc(byKey.get(k) || k)).join(', ')}${pv.unknownCount > 60 ? ' …' : ''}</span></p>` : ''}
      ${st.bad ? `<p class="mini">${t('{n} lines without a part number or quantity were ignored.', {n: st.bad})}</p>` : ''}</div>`;
    $('#skGo').classList.toggle('hidden', !(pv.matched || (W && pv.unknownCount))); };
  $('#skChk').onclick = check;
  $('#skGo').onclick = async () => { const zs = $('#skZ').value, zero = $('#skM').checked, b = $('#skGo'); b.disabled = true; $('#skChk').disabled = true;
    const msg = x => { b.textContent = x; };
    try{ msg(t('Saving…')); const changed = await StockAPI.apply(st.items, zs, col, (a, n) => msg(t('Saving…') + ` ${a.toLocaleString('en-US')} / ${n.toLocaleString('en-US')}`));
      const zeroed = zero ? await StockAPI.zeroMissing(st.items.map(x => x.key), zs, col) : 0;
      await StockAPI.done(st.items.length, (+st.pv.matched || 0) + (W ? +st.pv.unknownCount || 0 : 0), col);
      closeModal(); toast(t('Stock updated: {a} changed, {z} set to 0', {a: changed.toLocaleString('en-US'), z: zeroed.toLocaleString('en-US')}));
      if(W && window.WP) WP.rows = null; if(typeof renderAdmin === 'function') renderAdmin(); }
    catch(x){ b.disabled = false; $('#skChk').disabled = false; b.textContent = t('Update stock'); toast(t('Could not save') + ': ' + (x.message || x)); } };
}

/* text for a part's stock: partners and staff see the number */
function stockText(p, exact){ if(exact && p.qty !== undefined && p.qty !== null && p.qty !== ''){ const q = +p.qty || 0; return q > 0 ? t('{n} in stock', {n: q.toLocaleString('en-US')}) : t(p.stock && p.stock !== 'In stock' ? p.stock : 'Out of stock'); }
  return p.stock ? t(p.stock) : ''; }
window.openStockUpdate = openStockUpdate; window.stockText = stockText; window.stockInfoLine = stockInfoLine;
