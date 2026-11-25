/* Auto Engineer — Partner portal, step 2
   Counter sales · selling on the website (listings) · credit account & statement · quick order from a list ·
   order again · back-in-stock alerts · purchase invoices · partner-only offers · volume rewards ·
   customer searches · VIN lookup · shop staff accounts · WhatsApp updates (staff side). */
'use strict';

const PCOND = {genuine: 'New genuine', aftermarket: 'New aftermarket', used: 'Used'};
const LST_LABEL = {pending: 'Waiting for approval', approved: 'On the website', rejected: 'Rejected', paused: 'Paused'};
const pk2 = no => String(no || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const monthStart = k => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - k); return d.getTime(); };
const rewardTiers = () => (settings().rewardTiers || []).filter(x => +x.min > 0 && +x.pct > 0).sort((a, b) => a.min - b.min);
const rewardPct = amt => rewardTiers().reduce((p, x) => amt >= x.min ? Math.max(p, +x.pct) : p, 0);
const myListings = () => Store.all('plistings').filter(l => l.pid === S.partner.id).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
const mySales = () => Store.all('psales').filter(x => x.pid === S.partner.id).sort((a, b) => (b.at || 0) - (a.at || 0));
const myLedger = () => Store.all('pledger').filter(x => x.pid === S.partner.id).sort((a, b) => (a.at || 0) - (b.at || 0));
const waTo = (phone, msg) => 'https://wa.me/' + phoneKey(phone) + '?text=' + encodeURIComponent(msg);
const seesCost = () => ptRole() !== 'seller';

/* ---------- local stand-ins (preview / offline mode) ---------- */
function ptMonthTotal(pid, k){ return Store.all('porders').filter(o => o.pid === pid && ['approved','paid','shipped','delivered','received'].includes(o.status) && o.createdAt >= monthStart(k) && o.createdAt < monthStart(k - 1)).reduce((s, o) => s + (+o.total || 0), 0); }
function ptLocalPrice(p){
  if(!p) return null; const disc = (Number((S.partner || {}).discount) || 0) + rewardPct(ptMonthTotal((S.partner || {}).id, 1));
  const d = Math.min(90, Math.max(0, disc)), dd = Math.min(90, Math.max(0, +((Store.get('config', 'pricing') || {}).wholesaleDiscount) || 0));
  const ws = nz(p.wholesalePrice) && +p.wholesalePrice > 0 ? +p.wholesalePrice : null, rp = nz(p.retailPrice) && +p.retailPrice > 0 ? +p.retailPrice : null;
  let base = ws !== null ? (d ? Math.ceil(ws * (1 - d / 100) / 250) * 250 : ws) : rp !== null ? (d || dd ? Math.ceil(rp * (1 - dd / 100) * (1 - d / 100) / 250) * 250 : rp) : null;
  const off = nz(p.offerPrice) && +p.offerPrice > 0 ? +p.offerPrice : null;
  return base === null ? off : (off === null ? base : Math.min(base, off));
}
function ptLocalRpc(name){
  const pid = S.partner.id;
  if(name === 'partner_reward_status') return {thisMonth: ptMonthTotal(pid, 0), lastMonth: ptMonthTotal(pid, 1), activePct: rewardPct(ptMonthTotal(pid, 1)), tiers: rewardTiers()};
  if(name === 'partner_offers') return Store.all('wparts').filter(p => !p.hidden && nz(p.offerPrice) && +p.offerPrice > 0).map(p => ({id: p.id, partNo: p.partNo, name: p.name, nameAr: p.nameAr, nameKu: p.nameKu, stock: p.stock, qty: p.qty, wholesalePrice: p.wholesalePrice, price: ptLocalPrice({...p, retailPrice: null}), offerNote: p.offerNote}));
  if(name === 'partner_notify_status') return Store.all('pnotify').filter(n => n.pid === pid).map(n => { const p = Store.get('wparts', n.partId) || PS.cache[n.partId]; return {id: n.id, partId: n.partId, stock: p ? p.stock : null, qty: p ? p.qty : null}; });
  if(name === 'partner_sales') return Store.all('orders').flatMap(o => (o.lines || []).filter(l => l.pid === pid).map(l => ({order: o.no, at: o.createdAt, status: o.status, partNo: l.partNo, name: l.name, qty: l.qty, price: l.price, listingId: l.listingId}))).sort((a, b) => b.at - a.at);
  if(name === 'partner_trends'){ const since = Date.now() - 30 * 864e5, top = {}, miss = {};
    Store.all('visitors').forEach(v => (v.searches || []).forEach(x => { if((x.at || 0) < since || String(x.q || '').length < 3) return; const k = String(x.q).trim().toLowerCase();
      if(['search','find'].includes(x.k || 'search')){ top[k] = top[k] || {q: x.q, n: 0, found: false}; top[k].n++; if(x.n > 0) top[k].found = true; }
      if((x.k || 'search') === 'search' && !x.n){ miss[k] = miss[k] || {q: x.q, n: 0}; miss[k].n++; } }));
    const srt = o => Object.values(o).sort((a, b) => b.n - a.n); return {top: srt(top).slice(0, 30), missing: srt(miss).slice(0, 20)}; }
  return null;
}

/* ---------- printable invoices / statements ---------- */
function ptPrint(o){
  const s = settings(), w = window.open('', '_blank'); if(!w){ toast(t('Allow pop-ups to print.')); return; }
  const rtl = LANGS[LANG] && LANGS[LANG].dir === 'rtl';
  const rows = (o.lines || []).map(l => `<tr><td style="direction:ltr;text-align:left">${esc(l.partNo || '')}</td><td>${esc(l.name || '')}</td><td class=n>${l.qty}</td><td class=n>${money(l.price)}</td><td class=n>${money((+l.price || 0) * l.qty)}</td></tr>`).join('');
  w.document.write(`<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(o.no || '')}</title><style>
    body{font-family:Inter,Arial,sans-serif;color:#101318;margin:32px;font-size:14px}h1{margin:0;font-size:26px}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #FF3B1F;padding-bottom:14px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:8px;border-bottom:1px solid #e4e7eb;text-align:start}th{background:#f6f7f9;font-size:12px;text-transform:uppercase}.n{text-align:end;white-space:nowrap}
    .tot td{font-weight:700;font-size:16px;border:0}.muted{color:#69717C}.foot{margin-top:28px;color:#69717C;font-size:12px}@media print{button{display:none}}</style></head><body>
    <div class="top"><div><h1>${esc(o.fromName || s.company)}</h1><div class="muted">${esc([o.fromCity, o.fromPhone].filter(Boolean).join(' · '))}</div></div>
      <div style="text-align:end"><b style="font-size:18px">${esc(o.title)}</b><div>${esc(o.no || '')}</div><div class="muted">${dtStr(o.at || Date.now())}</div></div></div>
    ${o.to ? `<div><span class="muted">${t('Customer')}:</span> <b>${esc(o.to)}</b></div>` : ''}
    <table><thead><tr><th>${t('Part number')}</th><th>${t('Description')}</th><th class=n>${t('Qty')}</th><th class=n>${t('Price')}</th><th class=n>${t('Total')}</th></tr></thead><tbody>${rows}
    ${o.discount ? `<tr><td colspan=4>${t('Discount')}</td><td class=n>− ${money(o.discount)}</td></tr>` : ''}<tr class="tot"><td colspan=4>${t('Total')}</td><td class=n>${money(o.total)}</td></tr></tbody></table>
    ${o.extra ? `<p>${o.extra}</p>` : ''}<div class="foot">${esc(o.footer || '')}</div><p><button onclick="print()">${t('Print')}</button></p><script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}

/* ================= OVERVIEW (replaces step-1 version) ================= */
async function ptOverview(){
  const st = myStock(), val = st.reduce((s, x) => s + (+x.qty || 0) * (+x.cost || 0), 0), low = st.filter(s => lowOf(s) === 'low'), out = st.filter(s => lowOf(s) === 'out'), slow = st.filter(slowOf);
  const need = st.filter(s => lowOf(s)).sort((a, b) => (+a.qty || 0) - (+b.qty || 0));
  const ords = myOrders().filter(o => !['received','cancelled','rejected'].includes(o.status));
  const buyer = PT_TABS.buy.includes(ptRole()), today = mySales().filter(x => x.at >= new Date().setHours(0, 0, 0, 0));
  const tiles = [['counter','🧾','Counter sale','Sell to a customer in your shop and print the invoice.'],['stock','📦','My stock','Add your items, see what you have and what is running low.'],
    ['buy','🛒','Place an order','Buy from Auto Engineer at your partner price.'],['web','🏪','Sell my parts','List your parts on autoengineeriq.com.']].filter(([k]) => PT_TABS[k].includes(ptRole()));
  $('#ptBody').innerHTML = `<div class="pt-start">${tiles.map(([k, i, h, p]) => `<button data-go="${k}"><i>${i}</i><b>${t(h)}</b><span>${t(p)}</span></button>`).join('')}</div>
    <div id="ptAlerts"></div>
    <div class="kpis"><div class="kpi"><span>${t('Sales today')}</span><b>${money(today.reduce((s, x) => s + (+x.total || 0), 0)) || '0'}</b></div>
      <div class="kpi"><span>${t('Items in stock')}</span><b>${st.length.toLocaleString('en')}</b></div>
      ${seesCost() ? `<div class="kpi"><span>${t('Stock value (cost)')}</span><b>${money(val) || '0'}</b></div>` : ''}
      <div class="kpi warn"><span>${t('Running low')}</span><b>${low.length}</b></div><div class="kpi bad"><span>${t('Out of stock')}</span><b>${out.length}</b></div>
      <div class="kpi"><span>${t('Not moving 90+ days')}</span><b>${slow.length}</b></div>${buyer ? `<div class="kpi"><span>${t('Open orders')}</span><b>${ords.length}</b></div>` : ''}</div>
    <div class="panel"><div class="pt-row"><h3>${t('What you need')}</h3>${need.length && buyer ? `<button class="btn red sm" id="ptNeedAll">${t('Order all from Auto Engineer')}</button>` : ''}</div>
      <p class="sub">${t('Items at or below the minimum level you set. Order them from Auto Engineer in one tap.')}</p>
      ${need.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part number')}</th><th>${t('Description')}</th><th class="num">${t('In stock')}</th><th class="num">${t('Minimum')}</th><th class="num">${t('Suggested order')}</th><th></th></tr></thead><tbody>
        ${need.slice(0, 50).map(s => `<tr><td class="ltr"><b>${esc(s.partNo)}</b></td><td>${esc(sName(s))}</td><td class="num"><span class="qty ${lowOf(s)}">${+s.qty || 0}</span></td><td class="num">${+s.min || 0}</td><td class="num">${needQty(s)}</td>
          <td>${buyer ? `<button class="btn sm ghost" data-need="${esc(s.partNo)}" data-q="${needQty(s)}">${t('Add to order')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${st.length ? t('Everything is above its minimum level. Set minimum levels in My stock to get reminders.') : t('Add your items in My stock to start. You can import them from Excel.')}</div>`}</div>`;
  const add = async list => { const ids = list.map(([no]) => partId(no)); const pr = await PartnerAPI.prices(ids); let n = 0;
    list.forEach(([no, q]) => { const id = partId(no); if(pr[id] === undefined || pr[id] === null) return; const ex = PS.cart.find(c => c.partId === id); if(ex) ex.qty = Math.max(ex.qty, q); else PS.cart.push({partId: id, partNo: no, qty: q}); n++; });
    toast(n ? t('{n} added to your order', {n}) : t('Auto Engineer does not have these parts in the catalog.')); if(n){ PS.tab = 'buy'; renderPartner(); } };
  $('#ptBody').onclick = async e => { const g = e.target.closest('[data-go]'); if(g){ PS.tab = g.dataset.go; renderPartner(); return; }
    const b = e.target.closest('[data-need]'); if(b) add([[b.dataset.need, +b.dataset.q]]); if(e.target.closest('#ptNeedAll')) add(need.map(s => [s.partNo, needQty(s)]));
    const bk = e.target.closest('[data-bis]'); if(bk){ const ex = PS.cart.find(c => c.partId === bk.dataset.bis); if(!ex) PS.cart.push({partId: bk.dataset.bis, partNo: bk.dataset.no, qty: 1}); await Store.del('pnotify', bk.dataset.nid).catch(() => {}); PS.tab = 'buy'; renderPartner(); }
    const dx = e.target.closest('[data-bisx]'); if(dx){ await Store.del('pnotify', dx.dataset.bisx).catch(() => {}); dx.closest('.pt-alert').remove(); }
    if(e.target.closest('[data-goffers]')){ PS.tab = 'buy'; PS.buyQ = ''; renderPartner(); } };
  if(!buyer) return;
  // alerts: back in stock · rewards · offers
  const al = []; const [ns, rw, of] = await Promise.all([PartnerAPI.rpc('partner_notify_status').catch(() => []), PartnerAPI.rpc('partner_reward_status').catch(() => null), PartnerAPI.rpc('partner_offers').catch(() => [])]);
  (ns || []).filter(n => n.stock === 'In stock').forEach(n => { const d = Store.get('pnotify', n.id) || {};
    al.push(`<div class="pt-alert ok">🔔 <span><b class="ltr">${esc(d.partNo || '')}</b> ${esc(d.name || '')} — ${t('back in stock')}</span><button class="btn sm red" data-bis="${esc(n.partId)}" data-no="${esc(d.partNo || '')}" data-nid="${esc(n.id)}">${t('Add to order')}</button><button class="linkbtn" data-bisx="${esc(n.id)}">${t('Dismiss')}</button></div>`); });
  if(rw && (rw.tiers || []).length){ const next = rw.tiers.find(x => rw.thisMonth < x.min), pct = next ? Math.min(100, Math.round(rw.thisMonth / next.min * 100)) : 100;
    al.push(`<div class="pt-alert rw"><div style="flex:1"><b>🏆 ${t('Volume reward')}</b> · ${rw.activePct ? t('You have an extra {p}% off this month.', {p: rw.activePct}) : t('Buy more this month to unlock an extra discount next month.')}
      <div class="pt-bar"><i style="width:${pct}%"></i></div><small>${t('This month')}: <b>${money(rw.thisMonth) || '0'}</b>${next ? ' · ' + t('{a} more to unlock {p}% next month', {a: money(next.min - rw.thisMonth), p: next.pct}) : ' · ' + t('Top reward reached!')}</small></div></div>`); }
  if((of || []).length) al.push(`<div class="pt-alert of">🔥 <span>${t('{n} special offers for partners', {n: of.length})}</span><button class="btn sm" data-goffers>${t('See offers')}</button></div>`);
  const box = $('#ptAlerts'); if(box) box.innerHTML = al.join('');
}

/* ================= COUNTER SALE ================= */
function ptCounter(){
  PS.sale = PS.sale || {lines: [], name: '', phone: '', disc: 0, pay: 'cash'}; const sl = PS.sale;
  const sub = sl.lines.reduce((s, l) => s + (+l.price || 0) * l.qty, 0), tot = Math.max(0, sub - (+sl.disc || 0));
  const today0 = new Date().setHours(0, 0, 0, 0), recent = mySales().slice(0, 15), todayT = mySales().filter(x => x.at >= today0).reduce((s, x) => s + (+x.total || 0), 0);
  $('#ptBody').innerHTML = `<div class="pt-buy"><div>
      <div class="searchbar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="ptCQ" type="search" placeholder="${esc(t('Search your stock: part number or name'))}" value="${esc(PS.cq || '')}"></div>
      <div id="ptCRes" class="pt-res"></div>
      <div class="panel" style="margin-top:16px"><div class="pt-row"><h3>${t('Recent sales')}</h3><span class="mini">${t('Today')}: <b>${money(todayT) || '0'}</b></span></div>
        ${recent.length ? `<div class="tblwrap"><table class="tbl"><tbody>${recent.map(x => `<tr><td><b>${esc(x.no)}</b><br><span class="mini">${dtStr(x.at)}</span></td><td>${esc((x.customer || {}).name || '—')}</td><td class="num">${(x.lines || []).reduce((s, l) => s + l.qty, 0)}</td><td class="num"><b>${money(x.total)}</b></td>
          <td style="white-space:nowrap"><button class="linkbtn" data-reprint="${esc(x.id)}">${t('Invoice')}</button>${(x.customer || {}).phone ? ` · <a class="linkbtn" target="_blank" rel="noopener" href="${waTo(x.customer.phone, ptSaleText(x))}">WhatsApp</a>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${t('No sales yet.')}</div>`}</div></div>
    <aside class="panel pt-cart"><h3>${t('New sale')}</h3>
      ${sl.lines.length ? `<div class="pt-lines">${sl.lines.map((l, i) => `<div class="pt-line pt-sline"><div><b class="ltr">${esc(l.partNo)}</b><span>${esc(l.name)}</span></div>
        <input type="number" min="1" step="1" value="${l.qty}" data-sq="${i}" dir="ltr" title="${esc(t('Quantity'))}"><input type="number" min="0" step="250" value="${l.price ?? ''}" data-sp="${i}" dir="ltr" title="${esc(t('Price'))}" placeholder="${esc(t('Price'))}"><button class="linkbtn" data-sx="${i}" aria-label="${esc(t('Remove'))}">×</button></div>`).join('')}</div>`
        : `<div class="empty">${t('Search your stock and tap items to add them.')}</div>`}
      <div class="form" style="gap:8px;margin-top:8px"><label>${t('Customer name (optional)')}<input id="ptSN" value="${esc(sl.name)}"></label><label>${t('Customer phone (optional)')}<input id="ptSP" type="tel" dir="ltr" value="${esc(sl.phone)}"></label>
        <label>${t('Discount (IQD)')}<input id="ptSD" type="number" min="0" step="250" dir="ltr" value="${+sl.disc || ''}"></label>
        <label>${t('Payment')}<select id="ptSPay">${[['cash','Cash'],['card','Card'],['transfer','Transfer (FIB / ZainCash)'],['account','On customer account']].map(([v, l]) => `<option value="${v}" ${sl.pay === v ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label></div>
      <div class="pt-tot"><span>${t('Total')}</span><b>${money(tot) || '0'}</b></div>
      <button class="btn red" id="ptSSave" style="width:100%" ${sl.lines.length ? '' : 'disabled'}>${t('Save sale and print invoice')}</button>
      ${sl.lines.length ? `<button class="linkbtn" id="ptSClear" style="margin-top:8px">${t('Clear')}</button>` : ''}</aside></div>`;
  const drawRes = () => { const q = (PS.cq || '').trim().toLowerCase(), el = $('#ptCRes'); if(!el) return;
    if(!q){ el.innerHTML = ''; return; }
    const rows = myStock().filter(s => (s.partNo + ' ' + s.name + ' ' + (s.nameAr || '') + ' ' + (s.nameKu || '') + ' ' + (s.shelf || '')).toLowerCase().includes(q)).slice(0, 30);
    el.innerHTML = rows.length ? rows.map(s => `<div class="pt-item"><div><b class="ltr">${esc(s.partNo)}</b><span>${esc(sName(s))}</span><small>${t('In stock')}: ${+s.qty || 0}${s.shelf ? ' · ' + esc(s.shelf) : ''}</small></div>
      <div class="num">${s.price ? `<b>${money(s.price)}</b>` : `<small>${t('No price set')}</small>`}</div><button class="btn sm red" data-sadd="${esc(s.id)}" ${(+s.qty || 0) > 0 ? '' : 'disabled'}>${t('Add')}</button></div>`).join('')
      : `<div class="empty">${t('Not found in your stock.')}</div>`; };
  drawRes();
  $('#ptCQ').oninput = e => { PS.cq = e.target.value; drawRes(); };
  $('#ptBody').onclick = async e => {
    const a = e.target.closest('[data-sadd]'); if(a){ const s = Store.get('pstock', a.dataset.sadd); const ex = sl.lines.find(l => l.stockId === s.id);
      if(ex) ex.qty++; else sl.lines.push({stockId: s.id, partNo: s.partNo, name: sName(s), qty: 1, price: s.price ?? null}); ptCounter(); $('#ptCQ').focus(); return; }
    const x = e.target.closest('[data-sx]'); if(x){ sl.lines.splice(+x.dataset.sx, 1); ptCounter(); return; }
    const rp = e.target.closest('[data-reprint]'); if(rp){ ptPrintSale(Store.get('psales', rp.dataset.reprint)); return; }
    if(e.target.closest('#ptSClear')){ PS.sale = null; ptCounter(); return; }
    if(e.target.closest('#ptSSave')) ptSaveSale();
  };
  $('#ptBody').onchange = e => { const q = e.target.dataset.sq, p = e.target.dataset.sp;
    if(q !== undefined){ sl.lines[+q].qty = Math.max(1, Math.round(+e.target.value) || 1); ptCounter(); }
    if(p !== undefined){ sl.lines[+p].price = e.target.value === '' ? null : Math.max(0, Math.round(+e.target.value)); ptCounter(); }
    if(e.target.id === 'ptSD'){ sl.disc = Math.max(0, Math.round(+e.target.value) || 0); ptCounter(); }
    if(e.target.id === 'ptSPay') sl.pay = e.target.value; };
  $('#ptSN').oninput = e => sl.name = e.target.value; $('#ptSP').oninput = e => sl.phone = e.target.value;
}
function ptSaleText(x){ return `${S.partner.shop} — ${t('Invoice')} ${x.no}\n` + (x.lines || []).map(l => `• ${l.partNo} ${l.name} × ${l.qty} = ${money((+l.price || 0) * l.qty)}`).join('\n') + (x.discount ? `\n${t('Discount')}: −${money(x.discount)}` : '') + `\n${t('Total')}: ${money(x.total)}\n${t('Thank you!')}`; }
function ptPrintSale(x){ ptPrint({title: t('Invoice'), no: x.no, at: x.at, fromName: S.partner.shop, fromCity: S.partner.city, fromPhone: S.partner.phone, to: [(x.customer || {}).name, (x.customer || {}).phone].filter(Boolean).join(' · '), lines: x.lines, discount: x.discount, total: x.total, footer: t('Thank you for your business.')}); }
async function ptSaveSale(){
  if(ro()) return; const sl = PS.sale;
  for(const l of sl.lines){ const s = Store.get('pstock', l.stockId); if(!s || (+s.qty || 0) < l.qty){ toast(t('Not enough stock for {p}.', {p: l.partNo})); return; } if(l.price === null || l.price === undefined){ toast(t('Set a price for {p}.', {p: l.partNo})); return; } }
  const b = $('#ptSSave'); b.disabled = true; const y = new Date().getFullYear();
  const n = mySales().filter(x => new Date(x.at).getFullYear() === y).reduce((m, x) => Math.max(m, +String(x.no || '').split('-').pop() || 0), 0) + 1;
  const no = 'S-' + y + '-' + String(n).padStart(4, '0'), sub = sl.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const sale = {pid: S.partner.id, no, customer: {name: sl.name.trim(), phone: sl.phone.trim()}, lines: sl.lines.map(l => ({...l})), subtotal: sub, discount: +sl.disc || 0, total: Math.max(0, sub - (+sl.disc || 0)), pay: sl.pay, by: S.partner.userName || '', at: Date.now()};
  try{ await Store.set('psales', 'psl_' + S.partner.id + '_' + no, sale);
    for(const l of sl.lines){ const s = Store.get('pstock', l.stockId); await ptMove(s, -l.qty, 'sale', no); }
    PS.sale = null; toast(t('Sale {no} saved', {no})); ptPrintSale(sale); ptCounter();
  }catch(x){ b.disabled = false; toast(t('Could not save')); }
}

/* ================= SELL ON THE WEBSITE ================= */
async function ptWeb(){
  const L = myListings(), com = S.partner.commission ?? 1.5;
  $('#ptBody').innerHTML = `<div class="panel"><div class="pt-row"><div><h3>${t('Your items on autoengineeriq.com')}</h3><p class="sub" style="margin:4px 0 0">${t('Customers see them in the Retail room as "Sold by {s} · Verified partner". Auto Engineer approves every item and every sale.', {s: esc(S.partner.shop)})}</p></div>
      <button class="btn red sm" id="ptLNew">+ ${t('List an item')}</button></div>
      <ol class="pt-how"><li>${t('List an item from your stock and set your price.')}</li><li>${t('Auto Engineer approves it; it appears on the website.')}</li><li>${t('A customer orders and pays; we tell you to prepare the part.')}</li><li>${t('After delivery we pay you the price minus {c}% commission.', {c: com})}</li></ol>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part number')}</th><th>${t('Description')}</th><th>${t('Condition')}</th><th class="num">${t('Qty')}</th><th class="num">${t('Your price')}</th><th>${t('Status')}</th><th></th></tr></thead><tbody>
      ${L.length ? L.map(l => `<tr data-id="${esc(l.id)}"><td class="ltr"><b>${esc(l.partNo)}</b></td><td>${esc(sName(l))}${l.reply ? `<br><span class="mini">${t('Auto Engineer')}: ${esc(l.reply)}</span>` : ''}</td><td>${t(PCOND[l.cond] || l.cond || '')}</td><td class="num">${+l.qty || 0}</td><td class="num">${money(l.price)}</td>
        <td><span class="pst ${l.status === 'approved' ? 'received' : l.status === 'pending' ? 'new' : l.status === 'rejected' ? 'rejected' : ''}">${t(LST_LABEL[l.status] || l.status)}</span></td>
        <td style="white-space:nowrap"><button class="linkbtn" data-led>${t('Edit')}</button> · ${l.status === 'paused' ? `<button class="linkbtn" data-lres>${t('Resume')}</button>` : `<button class="linkbtn" data-lpause>${t('Pause')}</button>`} · <button class="linkbtn danger" data-ldel>${t('Remove')}</button></td></tr>`).join('')
        : `<tr><td colspan="7" class="empty">${t('Nothing listed yet. Tap "List an item" or use "Sell on website" in My stock.')}</td></tr>`}</tbody></table></div></div>
    <div class="panel"><h3>${t('Your website sales')}</h3><div id="ptWS"><div class="empty">${t('Loading…')}</div></div></div>`;
  $('#ptLNew').onclick = () => ptPickStock();
  $('#ptBody').querySelector('tbody').onclick = async e => { const tr = e.target.closest('tr[data-id]'); if(!tr) return; const l = Store.get('plistings', tr.dataset.id); if(!l) return;
    if(e.target.closest('[data-led]')) return ptListModal(Store.get('pstock', l.stockId), l);
    if(ro()) return; const d = {...l}; delete d.id;
    if(e.target.closest('[data-lpause]')){ d.status = 'paused'; await Store.set('plistings', l.id, d); return ptWeb(); }
    if(e.target.closest('[data-lres]')){ d.status = 'pending'; d.updatedAt = Date.now(); await Store.set('plistings', l.id, d); toast(t('Sent for approval')); return ptWeb(); }
    if(e.target.closest('[data-ldel]') && confirm(t('Remove this item from the website?'))){ await Store.del('plistings', l.id); ptWeb(); } };
  const rows = await PartnerAPI.rpc('partner_sales').catch(() => []); const el = $('#ptWS'); if(!el) return;
  const fee = x => Math.round((+x.price || 0) * x.qty * com / 100);
  el.innerHTML = (rows || []).length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Order')}</th><th>${t('Date')}</th><th>${t('Part number')}</th><th class="num">${t('Qty')}</th><th class="num">${t('Total')}</th><th class="num">${t('Commission')}</th><th class="num">${t('You receive')}</th><th>${t('Status')}</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td class="ltr">${esc(x.order)}</td><td>${dateStr(x.at)}</td><td class="ltr">${esc(x.partNo)}</td><td class="num">${x.qty}</td><td class="num">${money((+x.price || 0) * x.qty)}</td><td class="num">${money(fee(x))}</td><td class="num"><b>${money((+x.price || 0) * x.qty - fee(x))}</b></td><td>${esc(stl(x.status))}</td></tr>`).join('')}</tbody></table></div>
    <p class="mini">${t('Money you are owed appears in Account › Credit account after delivery.')}</p>` : `<div class="empty">${t('No website sales yet.')}</div>`;
}
function ptPickStock(){
  const draw = q => myStock().filter(s => (+s.qty || 0) > 0 && (!q || (s.partNo + ' ' + s.name).toLowerCase().includes(q.toLowerCase()))).slice(0, 40)
    .map(s => `<button class="pt-pickrow" data-ps="${esc(s.id)}"><b class="ltr">${esc(s.partNo)}</b><span>${esc(sName(s))}</span><em>${+s.qty} ${t('in stock')}</em></button>`).join('') || `<div class="empty">${t('No items with stock. Add items in My stock first.')}</div>`;
  pModal(`<h3>${t('Choose an item from your stock')}</h3><input class="input" id="ptPSQ" placeholder="${esc(t('Search part number or name'))}" style="margin-bottom:10px"><div id="ptPSL" class="pt-picklist">${draw('')}</div>`);
  $('#ptPSQ').oninput = e => $('#ptPSL').innerHTML = draw(e.target.value);
  $('#ptPSL').onclick = e => { const b = e.target.closest('[data-ps]'); if(b) ptListModal(Store.get('pstock', b.dataset.ps), null); };
}
function ptListModal(s, l){
  if(ro()) return; if(!s){ toast(t('This item is no longer in your stock.')); return; }
  l = l || {cond: 'genuine', price: s.price || '', qty: s.qty};
  pModal(`<h3>${t('Sell on website')}</h3><p class="sub"><b class="ltr">${esc(s.partNo)}</b> · ${esc(sName(s))} · ${t('In stock')}: ${+s.qty || 0}</p>
    <form id="ptLF" class="form grid2"><label>${t('Your selling price (IQD)')}<input name="price" type="number" min="250" step="250" dir="ltr" required value="${esc(l.price)}"></label>
      <label>${t('Quantity to offer')}<input name="qty" type="number" min="1" max="${+s.qty || 1}" step="1" dir="ltr" required value="${Math.min(+l.qty || 1, +s.qty || 1)}"></label>
      <label>${t('Condition')}<select name="cond">${Object.entries(PCOND).map(([k, v]) => `<option value="${k}" ${l.cond === k ? 'selected' : ''}>${t(v)}</option>`).join('')}</select></label>
      <label>${t('Note for customers (optional)')}<input name="note" value="${esc(l.note || '')}" placeholder="${esc(t('e.g. original box, fits 2016–2020'))}"></label>
      <p class="mini span2">${t('You receive the price minus {c}% commission. Changes are checked again by Auto Engineer.', {c: S.partner.commission ?? 1.5})}</p>
      <div class="span2 actions"><span style="flex:1"></span><button type="button" class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn red">${t('Send for approval')}</button></div></form>`);
  $('#ptLF').onsubmit = async e => { e.preventDefault(); const f = e.target, now = Date.now(); const id = l.id || ('pl_' + S.partner.id + '_' + pk2(s.partNo));
    const d = {pid: S.partner.id, shop: S.partner.shop, city: S.partner.city || '', stockId: s.id, partNo: s.partNo, name: s.name, nameAr: s.nameAr || '', nameKu: s.nameKu || '',
      price: Math.round(+f.price.value), qty: Math.min(+s.qty || 1, Math.max(1, Math.round(+f.qty.value))), cond: f.cond.value, note: f.note.value.trim(), status: 'pending', createdAt: l.createdAt || now, updatedAt: now};
    try{ await Store.set('plistings', id, d); closeModal(); toast(t('Sent for approval')); PS.tab = 'web'; renderPartner(); }catch(x){ toast(t('Could not save')); } };
}

/* ================= CUSTOMER SEARCHES ================= */
async function ptTrends(){
  $('#ptBody').innerHTML = `<div class="empty panel">${t('Loading…')}</div>`;
  const r = await PartnerAPI.rpc('partner_trends').catch(() => null); if(PS.tab !== 'trends') return;
  const have = q => { const k = q.toLowerCase(); return myStock().some(s => (+s.qty || 0) > 0 && (s.partNo.toLowerCase().includes(k) || String(s.name || '').toLowerCase().includes(k))); };
  const list = (rows, miss) => rows && rows.length ? `<div class="tblwrap"><table class="tbl"><tbody>${rows.map((x, i) => `<tr><td class="num" style="width:36px">${i + 1}</td><td><b>${esc(x.q)}</b></td><td class="num">${x.n} ${t('searches')}</td>
    <td>${miss ? `<span class="pst new">${t('Not found on our site')}</span>` : x.found ? '' : `<span class="pst new">${t('Not found on our site')}</span>`}</td><td>${have(x.q) ? `<span class="pst received">✓ ${t('You have it')}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${t('No data yet.')}</div>`;
  $('#ptBody').innerHTML = `<p class="sub">${t('What customers searched for on autoengineeriq.com in the last 30 days, across Iraq. Stock up on what is in demand.')}</p>
    <div class="grid2"><div class="panel"><h3>${t('Most searched')}</h3>${list(r && r.top, false)}</div>
    <div class="panel"><h3>${t('Searched but not found')}</h3><p class="sub">${t('Customers wanted these and could not find them. If you have them, list them on the website.')}</p>${list(r && r.missing, true)}
      ${ptOwner() ? `<button class="btn sm red" id="ptTList">+ ${t('List an item')}</button>` : ''}</div></div>`;
  if($('#ptTList')) $('#ptTList').onclick = () => ptPickStock();
}

/* ================= VIN LOOKUP ================= */
const WMI = {JTE: 'Toyota · Japan (Land Cruiser / Prado)', JTM: 'Toyota · Japan (SUV)', JTD: 'Toyota · Japan (car)', JTN: 'Toyota · Japan (car)', JTF: 'Toyota · Japan (van)', JTG: 'Toyota · Japan', JTH: 'Lexus · Japan', JTJ: 'Lexus · Japan (SUV)',
  MR0: 'Toyota · Thailand (Hilux / Fortuner)', MR1: 'Toyota · Thailand', MR2: 'Toyota · Thailand (car)', MHF: 'Toyota · Indonesia', AHT: 'Toyota · South Africa (Hilux)', NMT: 'Toyota · Turkey', SB1: 'Toyota · United Kingdom',
  '4T1': 'Toyota · USA (Camry)', '4T3': 'Toyota · USA', '5TD': 'Toyota · USA (SUV)', '5TF': 'Toyota · USA (Tundra)', '2T1': 'Toyota · Canada (Corolla)', '2T3': 'Toyota · Canada (RAV4)', VNK: 'Toyota · France (Yaris)'};
function ptVin(){
  $('#ptBody').innerHTML = `<div class="panel" style="max-width:720px"><h3>${t('VIN lookup')}</h3><p class="sub">${t('Enter the 17-character chassis number (VIN) from the registration card or windscreen.')}</p>
    <div class="searchbar"><input id="ptVinI" dir="ltr" maxlength="20" placeholder="JTEBR3FJ…" style="text-transform:uppercase;letter-spacing:.06em" value="${esc(PS.vin || '')}"><button class="btn red sm" id="ptVinGo">${t('Check')}</button></div>
    <div id="ptVinR"></div></div>`;
  const go = () => { const v = $('#ptVinI').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); PS.vin = v; const r = window.vinInfo ? vinInfo(v) : {ok: v.length === 17, s: v}; const el = $('#ptVinR');
    if(!r.ok){ el.innerHTML = `<p class="err">${t('A VIN has 17 letters and numbers')}</p>`; return; }
    const maker = WMI[v.slice(0, 3)] || (r.toyota ? 'Toyota' : t('Not a Toyota VIN (or unknown maker)'));
    el.innerHTML = `<dl class="pt-dl" style="margin-top:14px"><dt>VIN</dt><dd class="ltr">${esc(v)}</dd><dt>${t('Maker / origin')}</dt><dd>${esc(maker)}</dd><dt>${t('Model year')}</dt><dd>${r.year || '—'}</dd><dt>${t('Serial')}</dt><dd class="ltr">${esc(v.slice(11))}</dd></dl>
      <button class="btn red" id="ptVinFind">${t('Find the right parts for this car')}</button>
      <p class="mini">${t('Our team checks the exact part numbers for this VIN and replies with prices. Instant catalogue lookup is coming soon.')}</p>`;
    $('#ptVinFind').onclick = () => openFindPart({vin: v, year: r.year ? String(r.year) : ''}); };
  $('#ptVinGo').onclick = go; $('#ptVinI').onkeydown = e => { if(e.key === 'Enter') go(); }; if(PS.vin) go();
}

/* ================= BUY (replaces step-1 version) ================= */
function ptBuy(){
  const pay = payOpts(), lim = +S.partner.creditLimit || 0, bal = ptBalance(), avail = Math.max(0, lim - bal);
  const cartTot = PS.cart.reduce((s, c) => s + (+PS.buyPrices[c.partId] || 0) * c.qty, 0);
  const canOrder = pay.cod || pay.online || lim > 0;
  $('#ptBody').innerHTML = `<div class="pt-buy"><div>
      <div class="searchbar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="ptBuyQ" type="search" placeholder="${esc(t('Search: 04465-0K290, brake pads, oil filter…'))}" value="${esc(PS.buyQ)}"></div>
      <div class="pt-row" style="margin:-2px 0 6px"><p class="mini" style="margin:0">${t('Your partner prices. Every order is confirmed by Auto Engineer before delivery.')}${settings().wStockUpdatedAt ? `<br>📦 ${t('Stock updated {d}', {d: dtStr(settings().wStockUpdatedAt)})}` : ''}</p><button class="btn sm ghost" id="ptPaste">📋 ${t('Paste a list / Excel')}</button></div>
      <div id="ptBuyRes" class="pt-res"></div></div>
    <aside class="panel pt-cart"><h3>${t('Your order')}</h3>
      ${PS.cart.length ? `<div class="pt-lines">${PS.cart.map((c, i) => `<div class="pt-line"><div><b class="ltr">${esc(c.partNo)}</b><span>${esc(c.name || '')}</span>${(() => { const p = PS.cache[c.partId]; const q = p && p.qty != null && p.qty !== '' ? +p.qty : null; return q != null && c.qty > q ? `<small class="err">${q > 0 ? t('Only {n} in stock', {n: q}) : t('Out of stock')}</small>` : ''; })()}</div>
        <input type="number" min="1" step="1" value="${c.qty}" data-cq="${i}" dir="ltr"><span class="num">${PS.buyPrices[c.partId] ? money(PS.buyPrices[c.partId] * c.qty) : '—'}</span><button class="linkbtn" data-cx="${i}" aria-label="${esc(t('Remove'))}">×</button></div>`).join('')}</div>
        <div class="pt-tot"><span>${t('Total')}</span><b>${money(cartTot) || '—'}</b></div>
        <label class="mini">${t('Payment')}<select id="ptPay" class="sel">${pay.cod ? `<option value="cod" ${PS.pay === 'cod' ? 'selected' : ''}>${t('Cash on delivery')}</option>` : ''}${pay.online ? `<option value="online" ${PS.pay === 'online' ? 'selected' : ''}>${t('Online payment')}</option>` : ''}${lim > 0 ? `<option value="credit" ${PS.pay === 'credit' || (!pay.cod && !pay.online) ? 'selected' : ''}>${t('On credit (available {a})', {a: money(avail) || '0'})}</option>` : ''}</select></label>
        ${!canOrder ? `<p class="err">${t('Online payment is coming soon. Ordering will open then.')}</p>` : ''}
        <textarea id="ptNote" class="input" rows="2" placeholder="${esc(t('Note for Auto Engineer (optional)'))}"></textarea>
        <button class="btn red" id="ptSend" style="width:100%" ${canOrder ? '' : 'disabled'}>${t('Send order for approval')}</button>`
      : `<div class="empty">${t('Search for parts and add them here.')}</div>`}</aside></div>`;
  $('#ptBuyQ').oninput = e => { PS.buyQ = e.target.value; clearTimeout(PS.buyTimer); PS.buyTimer = setTimeout(ptBuySearch, 250); };
  $('#ptPaste').onclick = ptPasteList;
  const cart = $('.pt-cart');
  cart.oninput = e => { const i = e.target.dataset.cq; if(i === undefined) return; PS.cart[+i].qty = Math.max(1, Math.round(+e.target.value) || 1); };
  cart.onchange = e => { if(e.target.id === 'ptPay'){ PS.pay = e.target.value; return; } if(e.target.dataset.cq !== undefined) ptBuy(); };
  cart.onclick = async e => { const x = e.target.closest('[data-cx]'); if(x){ PS.cart.splice(+x.dataset.cx, 1); ptBuy(); return; }
    if(e.target.closest('#ptSend')){ if(ro()) return; const b = $('#ptSend'), pm = $('#ptPay').value;
      if(pm === 'credit' && cartTot > avail){ toast(t('This order is more than your available credit ({a}).', {a: money(avail) || '0'})); return; }
      b.disabled = true;
      try{ const no = await PartnerAPI.placeOrder(PS.cart.map(c => ({partId: c.partId, qty: c.qty})), pm, $('#ptNote').value.trim());
        PS.cart = []; PS.tab = 'orders'; toast(t('Order {no} sent. Auto Engineer will confirm it.', {no})); renderPartner();
      }catch(er){ toast(/credit/.test(String(er && er.message)) ? t('This order is more than your available credit ({a}).', {a: money(avail) || '0'}) : t('Could not send the order. Try again.')); b.disabled = false; } } };
  ptBuySearch(true); ptCartPrices();
}
async function ptBuySearch(keep){
  const el = $('#ptBuyRes'); if(!el) return; const q = PS.buyQ.trim();
  if(!q){ // no search: show partner offers
    el.innerHTML = `<div class="empty">${t('Type a part number or part name.')}</div>`;
    const of = await PartnerAPI.rpc('partner_offers').catch(() => []); if(PS.buyQ.trim() || !$('#ptBuyRes')) return;
    if((of || []).length){ of.forEach(p => { PS.cache[p.id] = PS.cache[p.id] || p; if(p.price) PS.buyPrices[p.id] = p.price; });
      el.innerHTML = `<h3 style="margin:4px 0 8px">🔥 ${t('Special offers for partners')}</h3>` + of.slice(0, 60).map(p => ptItemRow(p, p.price, true)).join(''); }
    return; }
  if(!(keep && PS.buyRows.length && PS.buyRows.q === q)){ el.innerHTML = `<div class="empty">${t('Searching…')}</div>`;
    const r = await WPartsAPI.search({q, lim: 30, off: 0}).catch(() => ({rows: []})); const rows = r.rows || []; rows.q = q; PS.buyRows = rows;
    rows.forEach(p => { PS.cache[p.id] = p; PS.buyPrices[p.id] = p.price ?? null; }); }
  if(PS.buyQ.trim() !== q) return;
  el.innerHTML = PS.buyRows.length ? PS.buyRows.map(p => ptItemRow(p, PS.buyPrices[p.id], nz(p.offerPrice))).join('') : `<div class="empty">${t('No parts found')}</div>`;
}
function ptItemRow(p, pr, offer){
  const inC = PS.cart.some(c => c.partId === p.id), stockOk = p.qty != null && p.qty !== '' ? +p.qty > 0 : (!p.stock || p.stock === 'In stock'), alert = Store.get('pnotify', 'pn_' + S.partner.id + '_' + p.id);
  return `<div class="pt-item"><div><b class="ltr">${esc(p.partNo)}</b><span>${esc(pName(p))}${offer ? ` <span class="pst new">🔥 ${t('Offer')}</span>` : ''}</span>${p.stock || p.qty != null ? `<small class="${(+p.qty || 0) > 0 || p.stock === 'In stock' ? 'pt-in' : ''}">${stockText(p, true)}${p.offerNote ? ' · ' + esc(p.offerNote) : ''}</small>` : ''}</div>
    <div class="num">${pr ? `<b>${money(pr)}</b>${nz(p.retailPrice) && +p.retailPrice > pr ? `<small class="pt-rrp">${t('Retail')} <s>${money(p.retailPrice)}</s></small>` : ''}` : `<small>${t('Price on request')}</small>`}</div>
    <div class="pt-acts">${!stockOk ? (alert ? `<span class="mini">🔔 ${t('Alert on')}</span>` : `<button class="btn sm ghost" data-ntf="${esc(p.id)}">🔔 ${t('Notify me')}</button>`) : ''}
    <button class="btn sm ${inC ? 'ghost' : 'red'}" data-add="${esc(p.id)}" ${pr ? '' : 'disabled'}>${inC ? '✓ ' + t('Added') : t('Add')}</button></div></div>`;
}
document.addEventListener('click', async e => { // add / notify buttons inside the buy results
  const host = e.target.closest('#ptBuyRes'); if(!host) return;
  const b = e.target.closest('[data-add]'); if(b){ const p = PS.cache[b.dataset.add]; const ex = PS.cart.find(c => c.partId === p.id);
    if(ex) ex.qty++; else PS.cart.push({partId: p.id, partNo: p.partNo, name: pName(p), qty: 1}); ptBuy(); return; }
  const n = e.target.closest('[data-ntf]'); if(n){ if(ro()) return; const p = PS.cache[n.dataset.ntf];
    await Store.set('pnotify', 'pn_' + S.partner.id + '_' + p.id, {pid: S.partner.id, partId: p.id, partNo: p.partNo, name: pName(p), at: Date.now()}).catch(() => {});
    toast(t('We will show you an alert when it is back in stock.')); ptBuySearch(true); }
});
function ptPasteList(){
  pModal(`<h3>${t('Quick order from a list')}</h3><p class="sub">${t('Paste part numbers with quantities, one per line (for example from WhatsApp or Excel), or upload an Excel file.')}</p>
    <textarea id="ptPL" class="input" rows="9" dir="ltr" placeholder="04465-0K290  2\n90915-YZZE1 x 10\n48510-0K330, 4"></textarea>
    <div class="actions"><label class="btn sm ghost" style="cursor:pointer">${t('Upload Excel')}<input type="file" id="ptPLF" accept=".xlsx,.xls,.csv" hidden></label><span style="flex:1"></span>
      <button class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn red" id="ptPLGo">${t('Add to my order')}</button></div><div id="ptPLR"></div>`, true);
  $('#ptPLF').onchange = async e => { const f = e.target.files[0]; if(!f || !window.XLSX) return; const wb = XLSX.read(await f.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''}); $('#ptPL').value = rows.map(r => r.filter(x => x !== '').join(' ')).join('\n'); };
  $('#ptPLGo').onclick = async () => {
    const lines = $('#ptPL').value.split(/\n+/).map(x => x.trim()).filter(Boolean); const want = [];
    lines.forEach(x => { const toks = x.split(/[\s,;:\t|]+|x(?=\s*\d)/i).filter(Boolean); const pn = toks.find(z => /[A-Za-z0-9]{5,}/.test(z.replace(/-/g, '')) && /\d/.test(z)); if(!pn) return;
      const nums = toks.filter(z => z !== pn && /^\d{1,4}$/.test(z)); want.push({pn: fmtPartNo(pn), qty: nums.length ? Math.max(1, +nums[nums.length - 1]) : 1}); });
    if(!want.length){ toast(t('No part numbers found in the list.')); return; }
    const b = $('#ptPLGo'); b.disabled = true; b.textContent = t('Checking…'); const miss = []; let added = 0;
    for(const w of want){ const r = await WPartsAPI.search({q: w.pn, lim: 5, off: 0}).catch(() => ({rows: []}));
      const p = (r.rows || []).find(x => pk2(x.partNo) === pk2(w.pn)); if(!p){ miss.push(w.pn); continue; } PS.cache[p.id] = p; PS.buyPrices[p.id] = p.price ?? null;
      const ex = PS.cart.find(c => c.partId === p.id); if(ex) ex.qty += w.qty; else PS.cart.push({partId: p.id, partNo: p.partNo, name: pName(p), qty: w.qty}); added++; }
    Object.assign(PS.buyPrices, await PartnerAPI.prices(PS.cart.map(c => c.partId).filter(id => PS.buyPrices[id] === undefined)));
    b.disabled = false; b.textContent = t('Add to my order');
    $('#ptPLR').innerHTML = `<p><b>${t('{n} added to your order', {n: added})}</b></p>${miss.length ? `<p class="err">${t('Not found in our catalog')}: <span class="ltr">${miss.map(esc).join(', ')}</span></p>` : ''}`;
    if(!miss.length) closeModal(); PS.tab = 'buy'; renderPartner(); };
}

/* ================= MY ORDERS (replaces step-1 version) ================= */
function ptOrders(){
  const ords = myOrders(), s = settings();
  $('#ptBody').innerHTML = ords.length ? ords.map(o => `<div class="panel pt-order"><div class="pt-row"><div><b>${esc(o.id)}</b> · ${dateStr(o.createdAt)} · ${poBadge(o.status)}</div><b>${money(o.total) || ''}</b></div>
      ${['rejected','cancelled'].includes(o.status) ? '' : `<div class="pt-steps">${PO_FLOW.map((x, i) => `<span class="${PO_FLOW.indexOf(o.status) >= i ? 'on' : ''}">${t(PO_LABEL[x])}</span>`).join('')}</div>`}
      <div class="tblwrap"><table class="tbl"><tbody>${(o.lines || []).map(l => `<tr><td class="ltr">${esc(l.partNo)}</td><td>${esc(sName(l))}</td><td class="num">× ${l.qty}</td><td class="num">${money((l.price || 0) * l.qty)}</td></tr>`).join('')}</tbody></table></div>
      <p class="mini">${t('Payment')}: ${o.pay === 'online' ? t('Online payment') : o.pay === 'credit' ? t('On credit') : t('Cash on delivery')}${o.courier ? ' · ' + t('Delivery') + ': ' + esc(o.courier) + (o.tracking ? ' (' + esc(o.tracking) + ')' : '') : ''}${o.reply ? '<br>' + t('Auto Engineer') + ': ' + esc(o.reply) : ''}</p>
      <div class="actions"><button class="btn sm ghost" data-again="${esc(o.id)}">↻ ${t('Order again')}</button>
        ${['approved','paid','shipped','delivered','received'].includes(o.status) ? `<button class="btn sm ghost" data-inv="${esc(o.id)}">🧾 ${t('Invoice')}</button>` : ''}
        ${o.status === 'new' ? `<button class="btn sm ghost" data-cancel="${esc(o.id)}">${t('Cancel order')}</button>` : ''}
        ${['shipped','delivered'].includes(o.status) ? `<button class="btn sm red" data-recv="${esc(o.id)}">${t('I received it → add to my stock')}</button>` : ''}</div></div>`).join('')
    : `<div class="empty panel">${t('No orders yet.')} <button class="linkbtn" id="ptGoBuy">${t('Buy from Auto Engineer')}</button></div>`;
  $('#ptBody').onclick = async e => {
    if(e.target.closest('#ptGoBuy')){ PS.tab = 'buy'; renderPartner(); return; }
    const ag = e.target.closest('[data-again]'); if(ag){ const o = Store.get('porders', ag.dataset.again);
      (o.lines || []).forEach(l => { const ex = PS.cart.find(c => c.partId === l.partId); if(ex) ex.qty += l.qty; else PS.cart.push({partId: l.partId, partNo: l.partNo, name: sName(l), qty: l.qty}); });
      toast(t('{n} added to your order', {n: (o.lines || []).length})); PS.tab = 'buy'; renderPartner(); return; }
    const iv = e.target.closest('[data-inv]'); if(iv){ const o = Store.get('porders', iv.dataset.inv);
      ptPrint({title: t('Invoice'), no: o.invoiceNo || o.id, at: o.invoicedAt || o.createdAt, fromName: s.company, fromCity: s.address, fromPhone: s.phone || s.whatsapp, to: o.shop, lines: (o.lines || []).map(l => ({...l, name: sName(l)})), total: o.total,
        extra: t('Payment') + ': ' + (o.pay === 'credit' ? t('On credit') : o.pay === 'online' ? t('Online payment') : t('Cash on delivery')), footer: s.invoiceNote || ''}); return; }
    const c = e.target.closest('[data-cancel]'); if(c && ro()) return; if(c && confirm(t('Cancel this order?'))){ await PartnerAPI.cancel(c.dataset.cancel).catch(() => toast(t('Could not save'))); renderPartner(); }
    const r = e.target.closest('[data-recv]'); if(r && ro()) return; if(r && confirm(t('Confirm you received everything? The parts will be added to your stock.'))){ r.disabled = true;
      try{ await PartnerAPI.receive(r.dataset.recv); toast(t('Added to your stock')); }catch(er){ toast(t('Could not save')); } renderPartner(); }
  };
}

/* ================= ACCOUNT (replaces step-1 version) ================= */
async function ptAccount(){
  const p = S.partner, own = ptOwner(), lim = +p.creditLimit || 0, led = myLedger(); let run = 0;
  const KL = {invoice: 'Purchase (on credit)', payment: 'Payment received', sale: 'Website sale (owed to you)', payout: 'Paid to you', adjust: 'Adjustment'};
  const users = Store.all('pusers').filter(u => u.pid === p.id);
  $('#ptBody').innerHTML = `${seesCost() && (lim > 0 || led.length) ? `<div class="panel"><div class="pt-row"><h3>${t('Credit account')}</h3><button class="btn sm ghost" id="ptStmt">🖨 ${t('Print statement')}</button></div>
      <div class="kpis" style="margin:10px 0"><div class="kpi"><span>${t('Credit limit')}</span><b>${money(lim) || '0'}</b></div><div class="kpi ${ptBalance() > 0 ? 'warn' : ''}"><span>${ptBalance() >= 0 ? t('You owe') : t('We owe you')}</span><b>${money(Math.abs(ptBalance())) || '0'}</b></div><div class="kpi"><span>${t('Available credit')}</span><b>${money(Math.max(0, lim - ptBalance())) || '0'}</b></div></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Date')}</th><th>${t('Type')}</th><th>${t('Reference')}</th><th class="num">${t('Amount')}</th><th class="num">${t('Balance')}</th></tr></thead><tbody>
      ${led.length ? led.map(x => { run += +x.amount || 0; return `<tr><td>${dateStr(x.at)}</td><td>${t(KL[x.kind] || x.kind)}${x.note ? `<br><span class="mini">${esc(x.note)}</span>` : ''}</td><td class="ltr">${esc(x.ref || '')}</td><td class="num"><b class="${x.amount < 0 ? 'pos' : 'neg'}">${x.amount > 0 ? '+' : '−'}${money(Math.abs(x.amount))}</b></td><td class="num">${money(run)}</td></tr>`; }).reverse().join('') : `<tr><td colspan="5" class="empty">${t('No entries yet.')}</td></tr>`}</tbody></table></div>
      <p class="mini">${t('+ means you owe Auto Engineer; − means a payment or money owed to you.')}</p></div>` : ''}
    <div id="ptRw"></div>
    <div class="grid2"><div class="panel"><h3>${t('Shop details')}</h3>
      <dl class="pt-dl"><dt>${t('Shop')}</dt><dd>${esc(p.shop || '')}</dd><dt>${t('Owner')}</dt><dd>${esc(p.owner || '')}</dd><dt>${t('Phone')}</dt><dd class="ltr">${esc(p.phone || '')}</dd><dt>${t('City')}</dt><dd>${esc(p.city || '')}</dd>
      ${seesCost() ? `<dt>${t('Partner discount')}</dt><dd>${+p.discount || 0}%</dd><dt>${t('Commission on sales')}</dt><dd>${p.commission ?? 1.5}%</dd>` : ''}</dl>
      <p class="mini">${t('To change these details, contact Auto Engineer.')}</p></div>
    <div class="panel"><h3>${t('Change password')}</h3><form id="ptPw" class="form"><label>${t('New password')}<input name="a" type="password" minlength="8" required></label><label>${t('Repeat new password')}<input name="b" type="password" minlength="8" required></label>
      <p class="err hidden" id="ptPwErr"></p><button class="btn red">${t('Save')}</button></form></div></div>
    ${own ? `<div class="panel"><div class="pt-row"><div><h3>${t('My team')}</h3><p class="sub" style="margin:4px 0 0">${t('Give your employees their own sign-in. Sellers can make counter sales and update stock; buyers can also order from Auto Engineer. Only you see costs, credit and website listings.')}</p></div><button class="btn red sm" id="ptUNew">+ ${t('Add employee')}</button></div>
      <div class="tblwrap"><table class="tbl"><tbody>${users.length ? users.map(u => `<tr data-u="${esc(u.id)}"><td><b>${esc(u.name || '')}</b></td><td class="ltr">${esc(u.phone || '')}</td><td>${t(ROLE_LABEL[u.role] || u.role)}</td><td><span class="vst ${u.active === false ? 'vis' : 'cust'}">${t(u.active === false ? 'Paused' : 'Active')}</span></td><td><button class="linkbtn" data-ued>${t('Edit')}</button></td></tr>`).join('') : `<tr><td class="empty">${t('No employees yet.')}</td></tr>`}</tbody></table></div></div>` : ''}`;
  if($('#ptStmt')) $('#ptStmt').onclick = () => { let r2 = 0; const lines = led.map(x => { r2 += +x.amount || 0; return {partNo: dateStr(x.at), name: t(KL[x.kind] || x.kind) + (x.ref ? ' · ' + x.ref : ''), qty: 1, price: x.amount}; });
    ptPrint({title: t('Statement of account'), no: p.shop, at: Date.now(), fromName: settings().company, fromPhone: settings().phone || settings().whatsapp, to: p.shop, lines, total: ptBalance(), extra: t('Credit limit') + ': ' + (money(lim) || '0')}); };
  $('#ptPw').onsubmit = async e => { e.preventDefault(); if(ro()) return; const f = e.target, er = $('#ptPwErr'); er.classList.add('hidden');
    if(f.a.value !== f.b.value){ er.textContent = t('The two passwords are different.'); er.classList.remove('hidden'); return; }
    try{ if(S.mode === 'supabase'){ const {error} = await S.sb.auth.updateUser({password: f.a.value}); if(error) throw error; } else { const id = p.role && p.role !== 'owner' ? 'pu_' + phoneKey(p.userPhone || '') : p.id; const d = clone(Store.get(p.role && p.role !== 'owner' ? 'pusers' : 'partners', id) || {}); d.demoPassword = f.a.value; delete d.id; await Store.set(p.role && p.role !== 'owner' ? 'pusers' : 'partners', id, d); }
      f.reset(); toast(t('Password changed')); }catch(x){ er.textContent = t('Could not save'); er.classList.remove('hidden'); } };
  if($('#ptUNew')) $('#ptUNew').onclick = () => ptUserModal(null);
  const tb = $('#ptBody').querySelector('[data-u]'); if(tb) tb.closest('tbody').onclick = e => { const tr = e.target.closest('tr[data-u]'); if(tr && e.target.closest('[data-ued]')) ptUserModal(Store.get('pusers', tr.dataset.u)); };
  if(PT_TABS.buy.includes(ptRole())){ const rw = await PartnerAPI.rpc('partner_reward_status').catch(() => null); const el = $('#ptRw');
    if(el && rw && (rw.tiers || []).length) el.innerHTML = `<div class="panel"><h3>🏆 ${t('Volume rewards')}</h3><p class="sub">${t('Buy more in a month and get an extra discount on everything the next month.')}</p>
      <div class="tblwrap"><table class="tbl"><tbody>${rw.tiers.map(x => `<tr class="${rw.thisMonth >= x.min ? 'pt-hit' : ''}"><td>${t('Buy {a} in a month', {a: money(x.min)})}</td><td class="num"><b>+${x.pct}%</b> ${t('next month')}</td><td>${rw.thisMonth >= x.min ? '✓' : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="mini">${t('This month')}: <b>${money(rw.thisMonth) || '0'}</b> · ${t('Last month')}: ${money(rw.lastMonth) || '0'} · ${t('Extra discount now')}: <b>${rw.activePct || 0}%</b></p></div>`; }
}
function ptUserModal(u){
  if(ro()) return; const isNew = !u; u = u || {role: 'seller', active: true};
  pModal(`<h3>${isNew ? t('Add employee') : esc(u.name)}</h3><form id="ptUF" class="form grid2">
    <label>${t('Name')}<input name="name" required value="${esc(u.name || '')}"></label><label>${t('Phone (sign-in)')}<input name="phone" type="tel" dir="ltr" required value="${esc(u.phone || '')}" ${isNew ? '' : 'readonly'}></label>
    <label>${t('Role')}<select name="role"><option value="seller" ${u.role === 'seller' ? 'selected' : ''}>${t('Seller: counter sales and stock')}</option><option value="buyer" ${u.role === 'buyer' ? 'selected' : ''}>${t('Buyer: also orders from Auto Engineer')}</option></select></label>
    <label>${t('Status')}<select name="active"><option value="1" ${u.active !== false ? 'selected' : ''}>${t('Active')}</option><option value="0" ${u.active === false ? 'selected' : ''}>${t('Paused')}</option></select></label>
    <label class="span2">${isNew ? t('Starting password') : t('New password (leave empty to keep)')}<input name="pw" dir="ltr" minlength="8" ${isNew ? 'required' : ''} value="${isNew ? genPw() : ''}"></label>
    <p class="err hidden span2" id="ptUErr"></p><div class="span2 actions"><span style="flex:1"></span><button type="button" class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn red">${t('Save')}</button></div></form>`);
  $('#ptUF').onsubmit = async e => { e.preventDefault(); const f = e.target, er = $('#ptUErr');
    if(phoneKey(f.phone.value).length < 12){ er.textContent = t('Check the phone number.'); er.classList.remove('hidden'); return; }
    try{ await PartnerAPI.setUser(f.phone.value.trim(), f.name.value.trim(), f.role.value, f.pw.value, f.active.value === '1');
      if(f.pw.value){ const msg = `${S.partner.shop} · Auto Engineer\n${location.origin}/#partner\n${t('Phone')}: ${f.phone.value}\n${t('Password')}: ${f.pw.value}`;
        pModal(`<h3>${t('Account ready')}</h3><p>${t('Send these sign-in details to your employee:')}</p><pre class="pt-pre">${esc(msg)}</pre><div class="actions"><a class="btn red" target="_blank" rel="noopener" href="${waTo(f.phone.value, msg)}">WhatsApp</a><button class="btn" data-mclose>${t('Done')}</button></div>`); }
      else{ closeModal(); toast(t('Saved')); } PS.tab = 'account'; renderPartner();
    }catch(x){ er.textContent = /in use/.test(String(x && x.message)) ? t('This phone number is already used by another account.') : t('Could not save'); er.classList.remove('hidden'); } };
}

/* stock table: add a "Sell on website" action for the owner (wraps the step-1 table) */
const _ptStock1 = ptStock;
ptStock = function(){
  _ptStock1();
  const tb = $('#ptBody').querySelector('tbody'); if(!tb) return;
  if(!seesCost()){ $('#ptBody').querySelectorAll('thead th:nth-child(6), tbody tr[data-id] td:nth-child(6)').forEach(x => x.style.display = 'none'); }
  if(ptOwner()) tb.querySelectorAll('tr[data-id] td:last-child').forEach(td => td.insertAdjacentHTML('beforeend', ` · <button class="linkbtn" data-web>${t('Sell on website')}</button>`));
  const old = tb.onclick; tb.onclick = e => { if(e.target.closest('[data-web]')){ const tr = e.target.closest('tr[data-id]'); const s = Store.get('pstock', tr.dataset.id);
    const l = Store.get('plistings', 'pl_' + S.partner.id + '_' + pk2(s.partNo)); ptListModal(s, l); return; } old && old(e); };
};

/* ================= STAFF SIDE ================= */
function adminPListings(){
  const list = Store.all('plistings').sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || (b.updatedAt || 0) - (a.updatedAt || 0));
  $('#adminBody').innerHTML = `<p class="sub">${t('Items your partner shops want to sell on the website. Nothing appears for customers until you approve it.')}</p>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Shop')}</th><th>${t('Part number')}</th><th>${t('Description')}</th><th>${t('Condition')}</th><th class="num">${t('Qty')}</th><th class="num">${t('Price')}</th><th>${t('Status')}</th><th></th></tr></thead><tbody>
    ${list.length ? list.map(l => `<tr data-id="${esc(l.id)}"><td><b>${esc(l.shop || '')}</b><br><span class="mini">${esc(l.city || '')}</span></td><td class="ltr"><b>${esc(l.partNo)}</b></td><td>${esc(l.name || '')}${l.note ? `<br><span class="mini">${esc(l.note)}</span>` : ''}</td><td>${t(PCOND[l.cond] || l.cond || '')}</td><td class="num">${+l.qty || 0}</td><td class="num">${money(l.price)}</td>
      <td><span class="pst ${l.status === 'approved' ? 'received' : l.status === 'pending' ? 'new' : l.status === 'rejected' ? 'rejected' : ''}">${t(LST_LABEL[l.status] || l.status)}</span></td>
      <td style="white-space:nowrap">${l.status !== 'approved' ? `<button class="btn sm red" data-la="approved">${t('Approve')}</button> ` : ''}${l.status !== 'rejected' ? `<button class="btn sm ghost" data-la="rejected">${t('Reject')}</button> ` : ''}${l.status === 'approved' ? `<button class="btn sm ghost" data-la="paused">${t('Pause')}</button>` : ''}</td></tr>`).join('')
      : `<tr><td colspan="8" class="empty">${t('No listings yet.')}</td></tr>`}</tbody></table></div>`;
  $('#adminBody').querySelector('tbody').onclick = async e => { const b = e.target.closest('[data-la]'); if(!b) return; const tr = e.target.closest('tr[data-id]'); const l = clone(Store.get('plistings', tr.dataset.id));
    const st = b.dataset.la; let reply = ''; if(st === 'rejected'){ reply = prompt(t('Reason for the shop (optional)')) || ''; }
    l.status = st; l.reply = reply; l.reviewedAt = Date.now(); delete l.id; await Store.set('plistings', tr.dataset.id, l);
    const pt = Store.get('partners', l.pid); if(pt) ptWaPrompt(pt.phone, `${t('Auto Engineer')}: ${l.partNo} — ${t(LST_LABEL[st])}${reply ? ' (' + reply + ')' : ''}`); };
}
function ptWaPrompt(phone, msg){ // WhatsApp update button for staff (one tap to send)
  pModal(`<h3>${t('Saved')}</h3><p>${t('Send the shop an update on WhatsApp?')}</p><pre class="pt-pre">${esc(msg)}</pre><div class="actions"><a class="btn red" target="_blank" rel="noopener" href="${waTo(phone, msg)}" data-mclose>WhatsApp</a><button class="btn ghost" data-mclose>${t('Not now')}</button></div>`);
}
function ledgerModal(pid){
  const p = Store.get('partners', pid), led = Store.all('pledger').filter(x => x.pid === pid).sort((a, b) => (b.at || 0) - (a.at || 0)), bal = led.reduce((s, x) => s + (+x.amount || 0), 0);
  pModal(`<h3>${esc(p.shop)} · ${t('Credit account')}</h3><p class="sub">${t('Credit limit')}: <b>${money(+p.creditLimit || 0) || '0'}</b> · ${bal >= 0 ? t('They owe') : t('We owe them')}: <b>${money(Math.abs(bal)) || '0'}</b></p>
    <form id="lgF" class="form grid2"><label>${t('Type')}<select name="kind"><option value="payment">${t('Payment received from shop')}</option><option value="payout">${t('Paid to shop (website sales)')}</option><option value="adjust">${t('Adjustment (+ they owe more, − less)')}</option></select></label>
      <label>${t('Amount (IQD)')}<input name="amount" type="number" step="250" dir="ltr" required></label><label class="span2">${t('Note')}<input name="note"></label>
      <div class="span2 actions"><span style="flex:1"></span><button type="button" class="btn ghost" data-mclose>${t('Close')}</button><button class="btn red">${t('Record')}</button></div></form>
    <div class="tblwrap"><table class="tbl"><tbody>${led.slice(0, 60).map(x => `<tr><td>${dateStr(x.at)}</td><td>${esc(x.kind)}${x.note ? ' · ' + esc(x.note) : ''}</td><td class="ltr">${esc(x.ref || '')}</td><td class="num"><b class="${x.amount < 0 ? 'pos' : 'neg'}">${x.amount > 0 ? '+' : '−'}${money(Math.abs(x.amount))}</b></td></tr>`).join('') || `<tr><td class="empty">${t('No entries yet.')}</td></tr>`}</tbody></table></div>`, true);
  $('#lgF').onsubmit = async e => { e.preventDefault(); const f = e.target; let a = Math.round(+f.amount.value); if(!a) return;
    if(f.kind.value === 'payment') a = -Math.abs(a); if(f.kind.value === 'payout') a = Math.abs(a);
    await Store.set('pledger', 'lg_' + rid(12), {pid, kind: f.kind.value, amount: a, note: f.note.value.trim(), ref: '', by: S.me || '', at: Date.now()}); toast(t('Saved')); ledgerModal(pid); };
}
/* when Auto Engineer ships a credit order, it goes on the shop's account (once) */
async function poLedger(no){
  const o = Store.get('porders', no); if(!o || o.pay !== 'credit' || o.ledgered || !['shipped','delivered','received'].includes(o.status)) return;
  await Store.set('pledger', 'lg_po_' + no, {pid: o.pid, kind: 'invoice', amount: +o.total || 0, ref: no, at: Date.now(), by: S.me || ''});
  const d = clone(o); d.ledgered = true; delete d.id; await Store.set('porders', no, d);
}
/* when a customer order with partner items is delivered: take the items off the shop's stock and credit the shop (price − commission) */
async function settlePartnerLines(order){
  if(!order || order.partnerSettled || !(order.lines || []).some(l => l.pid)) return false;
  for(const l of order.lines.filter(x => x.pid)){
    const pt = Store.get('partners', l.pid) || {}, com = pt.commission ?? 1.5, gross = (+l.price || 0) * (+l.qty || 0), net = Math.round(gross * (1 - com / 100));
    await Store.set('pledger', 'lg_' + order.no + '_' + (l.listingId || rid(6)), {pid: l.pid, kind: 'sale', amount: -net, ref: order.no, note: `${l.partNo} × ${l.qty} (−${com}%)`, at: Date.now(), by: S.me || ''});
    const li = l.listingId && Store.get('plistings', l.listingId);
    if(li){ const s = Store.get('pstock', li.stockId); const now = Date.now();
      if(s){ await Store.set('pstock', li.stockId, {...s, qty: Math.max(0, (+s.qty || 0) - l.qty), updatedAt: now, lastMove: now});
        await Store.set('pmoves', 'pm_' + rid(12), {pid: l.pid, stockId: li.stockId, partNo: l.partNo, delta: -l.qty, kind: 'sale', note: order.no, at: now}); }
      const d = clone(li); d.qty = Math.max(0, (+d.qty || 0) - l.qty); if(!d.qty) d.status = 'paused'; delete d.id; await Store.set('plistings', l.listingId, d); }
  }
  return true;
}
window.settlePartnerLines = settlePartnerLines; window.adminPListings = adminPListings; window.ledgerModal = ledgerModal; window.poLedger = poLedger; window.ptWaPrompt = ptWaPrompt;
