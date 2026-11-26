/* =====================================================================
   Auto Engineer — WHOLESALE catalog (separate from retail)
   Its own part numbers, names, stock and prices ('wparts'). Shown only to staff and to
   signed-in partner shops in the wholesale room; the retail shop never sees it.
   ===================================================================== */
const wpId = no => 'w_' + String(no || rid(8)).toUpperCase().replace(/[^A-Z0-9_.-]/g, '_').slice(0, 80);
const WP = {q: '', rows: null, total: 0, lim: 100, sec: ''};

const WPartsAPI = {
  remote: () => S.mode === 'supabase',
  // rows come back with .price = what THIS partner pays (staff: the wholesale price)
  async search({q = '', lim = 30, off = 0, staff = false, sec = '', brand = ''} = {}){
    if(this.remote()){ const {data, error} = await S.sb.rpc('wparts_search', {q, lim, off, staff, sec, brand}); if(error) throw error;
      return {rows: (data || []).map(r => ({...r.data, id: r.id, price: r.price})), total: data && data.length ? +data[0].total : 0}; }
    const words = String(q).toLowerCase().trim().split(/\s+/).filter(Boolean), qk = pnKey(q);
    let rows = Store.all('wparts').filter(p => (staff && S.admin) || !p.hidden).filter(p => !sec || (sec === '-' ? !p.section : String(p.section || '').toLowerCase() === sec.toLowerCase())).filter(p => !brand || String(p.brand || '').toLowerCase() === brand.toLowerCase()).filter(p => { const hay = [p.partNo, p.name, p.nameAr, p.nameKu, p.brand, p.section].join(' ').toLowerCase() + ' ' + pnKey(p.partNo);
      return words.every(w => hay.includes(w) || (pnKey(w).length > 2 && pnKey(p.partNo).startsWith(pnKey(w)))); });
    rows.sort((a, b) => (pnKey(b.partNo) === qk) - (pnKey(a.partNo) === qk) || ((+b.qty || 0) > 0) - ((+a.qty || 0) > 0) || String(a.partNo).localeCompare(String(b.partNo)));
    const price = p => staff && S.admin ? (nz(p.wholesalePrice) ? +p.wholesalePrice : null) : ptLocalPrice({...p, retailPrice: null});
    return {rows: rows.slice(off, off + lim).map(p => ({...p, price: price(p)})), total: rows.length};
  },
  async facets(){ // sections and brands with counts
    if(this.remote()){ const {data, error} = await S.sb.rpc('wparts_facets'); if(error) throw error; return data || {sections: {}, brands: []}; }
    const sec = {}, br = {}; Store.all('wparts').filter(p => !p.hidden).forEach(p => { const s = p.section || '-'; sec[s] = (sec[s] || 0) + 1; if(p.brand) br[p.brand] = (br[p.brand] || 0) + 1; });
    return {sections: sec, brands: Object.entries(br).sort((a, b) => b[1] - a[1]).map(([b, n]) => ({b, n}))};
  }
};

/* ---------------- Staff › Wholesale catalog ---------------- */
async function adminWParts(){
  const body = $('#adminBody'), canEdit = can('parts');
  body.innerHTML = `<div class="panel" style="padding:14px 16px;margin-bottom:12px;background:#FFF8E6;box-shadow:none"><b>🏪 ${t('Wholesale catalog')}</b> · <span class="mini">${t('Separate from the retail shop: these parts, prices and stock are shown only to your partner shops in the wholesale room. Retail customers never see them.')}</span></div>
    <div class="toolbar">${searchBox(t('Search part number or name…'))}<select class="sel" id="wpSec"><option value="">${t('All sections')}</option>${wsSections().map(s => `<option value="${esc(s)}" ${WP.sec === s ? 'selected' : ''}>${esc(secName(s))}</option>`).join('')}<option value="-" ${WP.sec === '-' ? 'selected' : ''}>${t('No section')}</option></select>${canEdit ? `<button class="btn red" id="wpAdd">+ ${t('Add part')}</button>` : ''}${canEdit && ['owner','admin','manager'].includes(S.role || 'admin') ? `<button class="btn" id="wpStock">📦 ${t('Upload stock & prices')}</button>` : ''}</div>
    <p class="mini" style="margin:-6px 0 12px">📦 ${stockInfoLine('wparts')}</p>
    <p class="mini" id="wpCount" style="margin:0 0 8px"></p>
    <div class="panel" style="padding:8px"><div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part number')}</th><th>${t('Name')}</th><th>${t('Section')} / ${t('Brand')}</th><th class="num">${t('Wholesale price')}</th><th class="num">🔥 ${t('Offer')}</th><th>${t('Stock')}</th><th></th></tr></thead><tbody id="wpRows"><tr><td colspan="7" class="mini" style="padding:30px;text-align:center">${t('Loading…')}</td></tr></tbody></table></div>
    <div style="text-align:center;margin:10px 0" id="wpMoreW"></div></div>`;
  const draw = () => { const rows = WP.rows || [];
    $('#wpCount').textContent = t('{n} parts', {n: (WP.total || 0).toLocaleString('en-US')});
    $('#wpRows').innerHTML = rows.length ? rows.map(p => `<tr class="click" data-wp="${esc(p.id)}"><td class="ltr"><b>${esc(p.partNo)}</b></td><td>${esc(pName(p))}${p.hidden ? ` <span class="mini">(${t('hidden')})</span>` : ''}</td><td class="mini">${p.section ? esc(secName(p.section)) : '—'}${p.brand ? `<br><b>${esc(p.brand)}</b>` : ''}</td>
        <td class="num">${nz(p.wholesalePrice) ? usd(p.wholesalePrice) : '<span class="mini">' + t('Price on request') + '</span>'}</td><td class="num">${nz(p.offerPrice) && +p.offerPrice > 0 ? usd(p.offerPrice) : '—'}</td>
        <td class="mini">${stockText(p, true)}</td><td>${can('delete') ? `<button class="rm" data-wpdel="${esc(p.id)}">${t('Delete')}</button>` : ''}</td></tr>`).join('')
      : `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">${WP.q ? t('No parts found') : t('No wholesale parts yet. Tap "Upload stock & prices" and upload your wholesale list (PartNo, Name, Qty, Wholesale).')}</td></tr>`;
    $('#wpMoreW').innerHTML = rows.length < WP.total ? `<button class="btn sm ghost" id="wpMore">${t('Show more')}</button>` : ''; };
  const load = async more => { const off = more ? (WP.rows || []).length : 0;
    try{ const r = await WPartsAPI.search({q: WP.q, lim: WP.lim, off, staff: true, sec: WP.sec}); WP.total = r.total; WP.rows = more ? [...(WP.rows || []), ...r.rows] : r.rows; }
    catch(e){ WP.rows = []; WP.total = 0; toast(t('Could not load data.')); }
    if(S.adminTab === 'wparts' && $('#wpRows')) draw(); };
  const sb = $('#adminSearch'); if(sb){ sb.value = WP.q; let tm; sb.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { WP.q = sb.value.trim(); load(); }, 250); }; }
  $('#wpSec').onchange = e => { WP.sec = e.target.value; load(); };
  if($('#wpAdd')) $('#wpAdd').onclick = () => wpEdit(null);
  if($('#wpStock')) $('#wpStock').onclick = () => openStockUpdate('wparts');
  body.onclick = async e => {
    if(e.target.closest('#wpMore')){ load(true); return; }
    const d = e.target.closest('[data-wpdel]'); if(d){ e.stopPropagation(); const p = (WP.rows || []).find(x => x.id === d.dataset.wpdel);
      confirmBox(t('Delete {p} from the wholesale catalog?', {p: p ? p.partNo : ''}), async () => { await Store.del('wparts', d.dataset.wpdel).catch(() => {}); WP.rows = (WP.rows || []).filter(x => x.id !== d.dataset.wpdel); WP.total = Math.max(0, WP.total - 1); closeModal(); draw(); }); return; }
    const r = e.target.closest('[data-wp]'); if(r){ const p = (WP.rows || []).find(x => x.id === r.dataset.wp); if(p) wpEdit(p); } };
  if(WP.rows) draw(); load();
}

function wpEdit(p){
  const isNew = !p; p = p || {stock: 'In stock'}; const v = k => esc(p[k] ?? '');
  openModal(mHead(isNew ? '🏪 ' + t('New wholesale part') : '🏪 ' + esc(p.partNo), t('Wholesale catalog')) + `<form class="modal-body" id="wpF">
    <div class="row2"><div class="f"><label>${t('Part number')}</label><input name="partNo" dir="ltr" required value="${v('partNo')}" ${isNew ? '' : 'readonly'}></div><div class="f"><label>${t('Brand')}</label><input name="brand" value="${v('brand')}" placeholder="${esc(t('e.g. Toyota, Mobil, SKF, Denso'))}"></div></div>
    <div class="row2"><div class="f"><label>${t('Name')}</label><input name="name" required value="${v('name')}"></div><div class="f"><label>${t('Section')}</label><select name="section"><option value="">— ${t('none')} —</option>${[...new Set([...wsSections(), ...(p.section ? [p.section] : [])])].map(s => `<option value="${esc(s)}" ${p.section === s ? 'selected' : ''}>${esc(secName(s))}</option>`).join('')}</select></div></div>
    <div class="row2"><div class="f"><label>${t('Arabic name')}</label><input name="nameAr" dir="rtl" value="${v('nameAr')}"></div><div class="f"><label>${t('Kurdish name')}</label><input name="nameKu" dir="rtl" value="${v('nameKu')}"></div></div>
    <div class="row2"><div class="f"><label>${t('Wholesale price')} (USD $) <i>(${t('empty = on request')})</i></label><input name="wholesalePrice" type="number" min="0" step="any" value="${v('wholesalePrice')}"></div>
      <div class="f"><label>${t('Stock')}</label><div style="display:flex;gap:6px"><select name="stock" style="flex:1">${STOCKS.map(c => `<option value="${c}" ${p.stock === c ? 'selected' : ''}>${t(c)}</option>`).join('')}</select><input name="qty" type="number" min="0" step="1" style="width:110px" placeholder="${esc(t('Quantity'))}" value="${v('qty')}"></div></div></div>
    <div class="row2"><div class="f"><label>🔥 ${t('Offer price')} <i>(${t('empty = no offer')})</i></label><input name="offerPrice" type="number" min="0" step="any" value="${v('offerPrice')}"></div><div class="f"><label>${t('Offer note')}</label><input name="offerNote" value="${v('offerNote')}" placeholder="${esc(t('e.g. until stock lasts'))}"></div></div>
    <div class="f"><label>${t('Visibility')}</label><select name="hidden"><option value="">${t('Shown to partner shops')}</option><option value="1" ${p.hidden ? 'selected' : ''}>${t('Hidden')}</option></select></div>
    <p class="err hidden" id="wpErr"></p>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button type="button" class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn red">${t('Save')}</button></div></form>`, true);
  $('#wpF').onsubmit = async e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target)), num = x => x === '' || x == null ? null : Number(x);
    const pn = fd.partNo.trim(); if(pnKey(pn).length < 4){ $('#wpErr').textContent = t('Check the part number.'); $('#wpErr').classList.remove('hidden'); return; }
    const id = isNew ? wpId(pn) : p.id;
    if(isNew){ const ex = await WPartsAPI.search({q: pn, lim: 5, staff: true}).catch(() => ({rows: []})); if((ex.rows || []).some(x => pnKey(x.partNo) === pnKey(pn))){ $('#wpErr').textContent = t('This part number is already in the wholesale catalog.'); $('#wpErr').classList.remove('hidden'); return; } }
    const d = {...(isNew ? {createdAt: Date.now()} : p), partNo: pn, name: fd.name.trim(), nameAr: fd.nameAr.trim(), nameKu: fd.nameKu.trim(), brand: fd.brand.trim(), section: fd.section || '',
      wholesalePrice: num(fd.wholesalePrice), offerPrice: num(fd.offerPrice), offerNote: fd.offerNote.trim(), stock: fd.stock, qty: num(fd.qty), hidden: !!fd.hidden, updatedAt: Date.now()};
    if(d.qty != null){ d.qty = Math.max(0, Math.floor(d.qty)); if(d.qty > 0) d.stock = 'In stock'; else if(d.stock === 'In stock') d.stock = 'Out of stock'; }
    delete d.id; delete d.price; delete d.total;
    try{ await Store.set('wparts', id, d); closeModal(); toast(t('Saved'));
      const row = {...d, id}; if(WP.rows){ const i = WP.rows.findIndex(x => x.id === id); if(i >= 0) WP.rows[i] = row; else{ WP.rows.unshift(row); WP.total++; } } renderAdmin(); }
    catch(x){ $('#wpErr').textContent = t('Could not save'); $('#wpErr').classList.remove('hidden'); } };
}
window.adminWParts = adminWParts; window.WPartsAPI = WPartsAPI; window.wpId = wpId; window.WP = WP;
