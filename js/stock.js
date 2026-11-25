/* =====================================================================
   Auto Engineer — daily stock update (Staff › Parts › Daily stock update)
   Upload an Excel/CSV or paste "part number  quantity" lines. Every matching part gets the
   quantity. Partner shops see the exact quantity; retail customers see In stock / On order.
   ===================================================================== */
const pnKey = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const ZERO_OPTS = [['On order', 'On order (2–5 days)'], ['Out of stock', 'Out of stock'], ['Ask', 'Ask']];

/* rows: array of arrays (from Excel or pasted text) → [{pn, key, qty}] (same part on several lines is added up) */
function parseStockRows(rows){
  const H_PN = ['partno','partnumber','pn','part','partnum','number','item','itemno','itemnumber','material','code','partcode'];
  const H_Q = ['qty','quantity','stock','onhand','soh','available','availableqty','balance','qoh','stockqty','freestock','free','qtyonhand','instock'];
  let pi = -1, qi = -1, start = 0;
  for(let r = 0; r < Math.min(rows.length, 15); r++){
    const h = (rows[r] || []).map(x => String(x).toLowerCase().replace(/[^a-z]/g, ''));
    const a = h.findIndex(x => H_PN.includes(x)), b = h.findIndex(x => H_Q.includes(x));
    if(a >= 0 && b >= 0 && a !== b){ pi = a; qi = b; start = r + 1; break; }
  }
  const out = new Map(); let bad = 0;
  for(let r = start; r < rows.length; r++){
    const row = (rows[r] || []).map(x => String(x == null ? '' : x).trim()); let pn, q;
    if(pi >= 0){ pn = row[pi]; q = row[qi]; }
    else{ const cells = row.filter(Boolean); pn = cells.find(z => /\d/.test(z) && pnKey(z).length >= 5);
      const nums = cells.filter(z => z !== pn && /^-?\d+(\.\d+)?$/.test(z.replace(/,/g, ''))); q = nums.length ? nums[nums.length - 1] : ''; }
    const k = pnKey(pn); if(k.length < 4){ if(row.some(Boolean)) bad++; continue; }
    const n = Number(String(q).replace(/,/g, '')); if(q === '' || !isFinite(n)){ bad++; continue; }
    const e = out.get(k); out.set(k, {pn: e ? e.pn : String(pn).trim(), key: k, qty: (e ? e.qty : 0) + Math.max(0, Math.floor(n))});
  }
  return {items: [...out.values()], bad};
}
const textRows = txt => String(txt || '').split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim()).map(l =>
  (l.includes('\t') ? l.split('\t') : l.split(/;|\||,(?!\d{3}(?!\d))|\s+/)).map(x => x.trim()).filter(x => x && x.toLowerCase() !== 'x'));

const StockAPI = {
  live: () => S.mode === 'supabase',
  async preview(keys){
    if(this.live()){ const {data, error} = await S.sb.rpc('stock_preview', {p_keys: keys}); if(error) throw error; return data; }
    const parts = Store.all('parts'), have = new Set(parts.map(p => pnKey(p.partNo))), ks = new Set(keys), unk = keys.filter(k => !have.has(k));
    return {matched: keys.length - unk.length, unknownCount: unk.length, unknown: unk.slice(0, 300),
      missing: parts.filter(p => !ks.has(pnKey(p.partNo)) && ((+p.qty || 0) > 0 || p.stock === 'In stock')).length};
  },
  async apply(items, zs, onProgress){ let changed = 0;
    for(let i = 0; i < items.length; i += 1500){ const part = items.slice(i, i + 1500);
      if(this.live()){ const {data, error} = await S.sb.rpc('stock_apply', {p_rows: part.map(x => ({k: x.key, q: x.qty})), p_zero_status: zs}); if(error) throw error; changed += data || 0; }
      else{ const by = new Map(part.map(x => [x.key, x.qty]));
        for(const p of Store.all('parts')){ const q = by.get(pnKey(p.partNo)); if(q === undefined) continue; const st = q > 0 ? 'In stock' : zs;
          if(p.qty === q && p.stock === st) continue; const d = {...p, qty: q, stock: st}; delete d.id; await Store.set('parts', p.id, d); changed++; } }
      onProgress && onProgress(Math.min(items.length, i + 1500), items.length); }
    return changed; },
  async zeroMissing(keys, zs){ let total = 0;
    if(this.live()){ for(let guard = 0; guard < 200; guard++){ const {data, error} = await S.sb.rpc('stock_zero_missing', {p_keys: keys, p_zero_status: zs, p_lim: 2000}); if(error) throw error; total += data || 0; if((data || 0) < 2000) break; } return total; }
    const ks = new Set(keys);
    for(const p of Store.all('parts')){ if(ks.has(pnKey(p.partNo)) || !((+p.qty || 0) > 0 || p.stock === 'In stock')) continue; const d = {...p, qty: 0, stock: zs}; delete d.id; await Store.set('parts', p.id, d); total++; }
    return total; },
  async done(lines, matched){
    if(this.live()){ const {data, error} = await S.sb.rpc('stock_done', {p_lines: lines, p_matched: matched}); if(error) throw error; await Store.set('config', 'stockinfo', {at: data, lines, matched}).catch(() => {}); return data; }
    const at = Date.now(); await Store.set('config', 'settings', {...settings(), stockUpdatedAt: at}); await Store.set('config', 'stockinfo', {at, lines, matched, by: S.me || ''}); return at; }
};

function stockInfoLine(){ const si = Store.get('config', 'stockinfo'); if(!si || !si.at) return t('Stock has not been uploaded yet.');
  return t('Last stock update: {d} · {n} part numbers', {d: dtStr(si.at), n: (si.matched || 0).toLocaleString('en-US')}); }

function openStockUpdate(){
  const st = {items: [], bad: 0, pv: null};
  openModal(mHead(t('Daily stock update'), stockInfoLine()) + `<div class="modal-body">
    <p class="mini">${t('Upload your stock report (Excel or CSV) or paste it below: one part number and its quantity per line. Columns are found automatically (e.g. PartNo and Qty).')}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><label class="btn red" style="cursor:pointer">📄 ${t('Choose Excel / CSV')}<input type="file" id="skF" accept=".xlsx,.xls,.csv,.txt" hidden></label><span class="mini" id="skFile" style="align-self:center"></span></div>
    <textarea id="skT" class="sel" rows="7" dir="ltr" style="width:100%;font-family:monospace" placeholder="04465-0K290   12\n90915-YZZE1   140\n48510-0K330   0"></textarea>
    <div class="row2" style="margin-top:12px"><div class="f"><label>${t('When the quantity is 0, show customers')}</label><select id="skZ" class="sel">${ZERO_OPTS.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></div>
      <div class="f"><label>&nbsp;</label><label class="mini" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="skM" checked style="width:auto;margin-top:3px"> <span>${t('This is my full stock list: parts that are not in the list now have 0.')}</span></label></div></div>
    <div id="skR"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn" id="skChk">${t('Check list')}</button><button class="btn red hidden" id="skGo">${t('Update stock')}</button></div></div>`, true);
  const reset = () => { st.pv = null; $('#skGo').classList.add('hidden'); $('#skR').innerHTML = ''; };
  $('#skT').oninput = () => { reset(); st.fromFile = false; }; $('#skM').onchange = () => { if(st.pv) showPv(); };
  $('#skF').onchange = async e => { const f = e.target.files[0]; if(!f) return; reset();
    try{ let rows; if(/\.(csv|txt)$/i.test(f.name) && !window.XLSX) rows = textRows(await f.text());
      else{ if(!window.XLSX){ toast(t('Excel reader still loading. Try again in a moment.')); return; } const wb = XLSX.read(await f.arrayBuffer()); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: '', raw: false}); }
      const r = parseStockRows(rows); st.items = r.items; st.bad = r.bad; $('#skT').value = r.items.slice(0, 2000).map(x => x.pn + '\t' + x.qty).join('\n') + (r.items.length > 2000 ? '\n…' : '');
      st.fromFile = true; $('#skFile').textContent = f.name + ' · ' + t('{n} part numbers', {n: r.items.length.toLocaleString('en-US')}); await check(); }
    catch(x){ toast(t('Could not read this file.')); } };
  const check = async () => {
    if(!st.fromFile){ const r = parseStockRows(textRows($('#skT').value)); st.items = r.items; st.bad = r.bad; }
    if(!st.items.length){ $('#skR').innerHTML = `<p class="err">${t('No part numbers with quantities found.')}</p>`; return; }
    const b = $('#skChk'); b.disabled = true; b.textContent = t('Checking…');
    try{ st.pv = await StockAPI.preview(st.items.map(x => x.key)); showPv(); }catch(x){ $('#skR').innerHTML = `<p class="err">${t('Could not check the list')}: ${esc(x.message || x)}</p>`; }
    b.disabled = false; b.textContent = t('Check list'); };
  const showPv = () => { const pv = st.pv, byKey = new Map(st.items.map(x => [x.key, x.pn])), zero = $('#skM').checked;
    const inStock = st.items.filter(x => x.qty > 0).length;
    $('#skR').innerHTML = `<div class="box" style="margin-top:12px"><h4>${t('Ready to update')}</h4>
      <p>✅ ${t('{n} parts found in your catalog', {n: (+pv.matched).toLocaleString('en-US')})} · ${t('{n} with quantity above 0', {n: inStock.toLocaleString('en-US')})}</p>
      ${zero ? `<p>⬇️ ${t('{n} parts not in the list will go to 0', {n: (+pv.missing).toLocaleString('en-US')})}</p>` : `<p class="mini">${t('Parts not in the list keep their current stock.')}</p>`}
      ${pv.unknownCount ? `<p class="err">⚠️ ${t('{n} part numbers are not in your catalog and will be skipped', {n: (+pv.unknownCount).toLocaleString('en-US')})}:<br><span class="mini ltr">${(pv.unknown || []).slice(0, 60).map(k => esc(byKey.get(k) || k)).join(', ')}${pv.unknownCount > 60 ? ' …' : ''}</span></p>` : ''}
      ${st.bad ? `<p class="mini">${t('{n} lines without a part number or quantity were ignored.', {n: st.bad})}</p>` : ''}</div>`;
    $('#skGo').classList.toggle('hidden', !pv.matched); };
  $('#skChk').onclick = check;
  $('#skGo').onclick = async () => { const zs = $('#skZ').value, zero = $('#skM').checked, b = $('#skGo'); b.disabled = true; $('#skChk').disabled = true;
    const msg = x => { b.textContent = x; };
    try{ msg(t('Saving…')); const changed = await StockAPI.apply(st.items, zs, (a, n) => msg(t('Saving…') + ` ${a.toLocaleString('en-US')} / ${n.toLocaleString('en-US')}`));
      const zeroed = zero ? await StockAPI.zeroMissing(st.items.map(x => x.key), zs) : 0;
      await StockAPI.done(st.items.length, +st.pv.matched || 0);
      closeModal(); toast(t('Stock updated: {a} changed, {z} set to 0', {a: changed.toLocaleString('en-US'), z: zeroed.toLocaleString('en-US')}));
      if(typeof renderAdmin === 'function') renderAdmin(); }
    catch(x){ b.disabled = false; $('#skChk').disabled = false; b.textContent = t('Update stock'); toast(t('Could not save') + ': ' + (x.message || x)); } };
}

/* text for a part's stock: partners and staff see the number */
function stockText(p, exact){ if(exact && p.qty !== undefined && p.qty !== null && p.qty !== ''){ const q = +p.qty || 0; return q > 0 ? t('{n} in stock', {n: q.toLocaleString('en-US')}) : t(p.stock && p.stock !== 'In stock' ? p.stock : 'Out of stock'); }
  return p.stock ? t(p.stock) : ''; }
window.openStockUpdate = openStockUpdate; window.stockText = stockText; window.stockInfoLine = stockInfoLine;
