/* Auto Engineer — Partner portal (trusted shops)
   Windows: Overview · My stock (free stock management) · Buy from Auto Engineer · My orders · Sell (next step) · Account
   Staff side: Partners (create/pause/reset password) and Partner orders (approve → paid → shipped → delivered).
   Partners only ever see their own data (enforced in the database, see supabase/partners.sql). */
'use strict';

const PARTNER_DOMAIN = 'partner.autoengineeriq.com';
const PO_FLOW = ['new','approved','shipped','delivered','received'];
const PO_LABEL = {new:'Waiting for approval',approved:'Approved',rejected:'Rejected',paid:'Paid',shipped:'On the way',delivered:'Delivered',received:'Received',cancelled:'Cancelled'};
const pModal = (html, wide) => openModal('<div class="pt-modal">' + html + '</div>', wide);
const PS = {cache:{}, tab:'overview', q:'', filter:'all', cart:[], buyQ:'', buyRows:[], buyPrices:{}, buyTimer:null};

/* ---------------- data layer ---------------- */
const PartnerAPI = {
  remote(){ return S.mode === 'supabase'; },
  disc(){ return Number((S.partner || {}).discount) || 0; },
  localPrice(p){ if(!p) return null; if(nz(p.wholesalePrice) && +p.wholesalePrice > 0) return +p.wholesalePrice;
    if(!nz(p.retailPrice) || !(+p.retailPrice > 0)) return null; return Math.ceil(+p.retailPrice * (1 - Math.min(90, Math.max(0, this.disc())) / 100) / 250) * 250; },
  async login(phone, pw){
    const pk = phoneKey(phone);
    if(this.remote()){ const {error} = await S.sb.auth.signInWithPassword({email: pk + '@' + PARTNER_DOMAIN, password: pw}); if(error) throw error; return; }
    let p = Store.get('partners', 'pt_' + pk), role = 'owner', u = null;
    if(!p){ u = Store.get('pusers', 'pu_' + pk); if(u && u.active !== false){ p = Store.get('partners', u.pid); role = u.role || 'seller'; } }
    const pw0 = u ? u.demoPassword : p && p.demoPassword;
    if(!p || p.status === 'paused' || !pw0 || pw0 !== pw) throw new Error('login');
    S.partner = {...p, role, userName: u ? u.name : ''}; S.partnerLocal = true; renderCurrent();
  },
  async logout(){ if(this.remote()) await S.sb.auth.signOut(); S.partner = null; S.partnerLocal = false; PS.cart = []; renderCurrent(); },
  async load(){ // live site: load my own stock, movements and orders
    if(!this.remote() || !S.partner) return;
    try{ const rows = await sbFetchAll('docs', q => q.in('col', ['pstock','pmoves','porders','plistings','psales','pledger','pnotify','pusers']));
      ['pstock','pmoves','porders','plistings','psales','pledger','pnotify','pusers'].forEach(c => S.data[c] = {}); rows.forEach(r => { (S.data[r.col] = S.data[r.col] || {})[r.id] = r.data; });
    }catch(e){ toast(t('Could not load data.')); }
    Store.emit('pstock');
  },
  async prices(ids){
    if(!ids.length) return {};
    if(ptPreview()){ const o = {}; ids.forEach(id => { const p = PS.cache[id] || Store.get('parts', id); if(p) o[id] = ptLocalPrice(p); }); return o; }
    if(this.remote()){ const {data} = await S.sb.rpc('partner_prices', {ids}); return data || {}; }
    const o = {}; ids.forEach(id => { const p = Store.get('parts', id); if(p && !p.hidden) o[id] = ptLocalPrice(p); }); return o;
  },
  async placeOrder(lines, pay, note){
    if(this.remote()){ const {data, error} = await S.sb.rpc('partner_place_order', {p_lines: lines, p_pay: pay, p_note: note}); if(error) throw error; await this.load(); return data; }
    const out = []; let tot = 0;
    lines.forEach(l => { const p = Store.get('parts', l.partId); if(!p || p.hidden) return; const pr = ptLocalPrice(p); out.push({partId: l.partId, partNo: p.partNo, name: p.name, nameAr: p.nameAr, nameKu: p.nameKu, qty: +l.qty, price: pr}); tot += (pr || 0) * l.qty; });
    if(pay === 'credit'){ const lim = +S.partner.creditLimit || 0; if(!lim) throw new Error('no credit'); if(ptBalance() + tot > lim) throw new Error('credit limit'); }
    const c = clone((S.data.config || {}).pocounter || {}); const y = new Date().getFullYear(); if(c.year !== y){ c.year = y; c.n = 0; } c.n = (c.n || 0) + 1; await Store.set('config', 'pocounter', c);
    const no = 'PO-' + y + '-' + String(c.n).padStart(4, '0'), now = Date.now();
    await Store.set('porders', no, {pid: S.partner.id, shop: S.partner.shop, phone: S.partner.phone, city: S.partner.city, lines: out, total: tot, pay, note, status: 'new', createdAt: now, updatedAt: now, log: [{at: now, s: 'new'}]});
    return no;
  },
  async cancel(no){
    if(this.remote()){ const {error} = await S.sb.rpc('partner_cancel_order', {p_no: no}); if(error) throw error; return this.load(); }
    const o = clone(Store.get('porders', no)); if(!o || o.status !== 'new') return; o.status = 'cancelled'; o.updatedAt = Date.now(); o.log = [...(o.log || []), {at: Date.now(), s: 'cancelled'}]; await Store.set('porders', no, o);
  },
  async receive(no){
    if(this.remote()){ const {error} = await S.sb.rpc('partner_receive_order', {p_no: no}); if(error) throw error; return this.load(); }
    const o = clone(Store.get('porders', no)); if(!o || !['shipped','delivered'].includes(o.status)) return; const now = Date.now();
    for(const l of o.lines){ const sid = stockId(l.partNo), cur = Store.get('pstock', sid);
      await Store.set('pstock', sid, cur ? {...cur, qty: (+cur.qty || 0) + (+l.qty), cost: l.price, updatedAt: now, lastMove: now}
                                         : {pid: S.partner.id, partNo: l.partNo, name: l.name, nameAr: l.nameAr, nameKu: l.nameKu, qty: +l.qty, cost: l.price, min: 0, reorder: 0, createdAt: now, updatedAt: now, lastMove: now});
      await Store.set('pmoves', 'pm_' + rid(12), {pid: S.partner.id, stockId: sid, partNo: l.partNo, delta: +l.qty, kind: 'purchase', note: no, at: now}); }
    o.status = 'received'; o.updatedAt = now; o.log = [...(o.log || []), {at: now, s: 'received'}]; await Store.set('porders', no, o);
  },
  async rpc(name, args){ // server functions, with a local stand-in for the preview mode
    if(this.remote() && !ptPreview()){ const {data, error} = await S.sb.rpc(name, args || {}); if(error) throw error; return data; }
    return ptLocalRpc(name, args || {});
  },
  async setUser(phone, name, role, pw, active){
    if(this.remote()){ const {data, error} = await S.sb.rpc('partner_set_user', {p_phone: phone, p_name: name, p_role: role, p_password: pw || '', p_active: active}); if(error) throw error; await this.load(); return data; }
    const pk = phoneKey(phone), id = 'pu_' + pk, ex = Store.get('pusers', id);
    if(Store.get('partners', 'pt_' + pk) || (ex && ex.pid !== S.partner.id)) throw new Error('phone in use');
    await Store.set('pusers', id, {...(ex || {createdAt: Date.now()}), pid: S.partner.id, phone, name, role, active, loginEmail: pk + '@' + PARTNER_DOMAIN, ...(pw ? {demoPassword: pw} : {})});
  },
  async setLogin(pid, pw){ // staff: create or reset the partner's password
    if(this.remote()){ const {data, error} = await S.sb.rpc('staff_set_partner_login', {p_pid: pid, p_password: pw}); if(error) throw error; return data; }
    const p = clone(Store.get('partners', pid)); p.demoPassword = pw; await Store.set('partners', pid, p); return p.loginEmail;
  }
};
window.PartnerAPI = PartnerAPI;

/* staff can open the portal as any partner to see what the shop sees (read-only) */
const PT_TABS = {overview: ['owner','buyer','seller'], counter: ['owner','buyer','seller'], stock: ['owner','buyer','seller'], buy: ['owner','buyer'], orders: ['owner','buyer'],
  web: ['owner'], trends: ['owner','buyer','seller'], vin: ['owner','buyer','seller'], account: ['owner','buyer','seller']};
const ROLE_LABEL = {owner: 'Owner', buyer: 'Buyer', seller: 'Seller'};
const ptRole = () => (S.partner && S.partner.role) || 'owner';
const ptOwner = () => ptRole() === 'owner';
const ptBalance = () => Store.all('pledger').filter(x => x.pid === (S.partner || {}).id).reduce((s, x) => s + (+x.amount || 0), 0);
const ptPreview = () => !!(S.partnerPreview && S.partner && S.partner.id === S.partnerPreview);
const ro = () => { if(ptPreview()){ toast(t('Staff preview: read-only. The shop does this from its own account.')); return true; } return false; };
const stockId = no => 'ps_' + (S.partner ? S.partner.id : '') + '_' + String(no || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const myStock = () => Store.all('pstock').filter(s => !S.partner || s.pid === S.partner.id);
const myOrders = () => Store.all('porders').filter(o => !S.partner || o.pid === S.partner.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const sName = s => (LANG === 'ar' && s.nameAr) || (LANG === 'ku' && s.nameKu) || s.name || '';
const lowOf = s => (+s.qty || 0) <= 0 ? 'out' : ((+s.min || 0) > 0 && (+s.qty || 0) <= (+s.min || 0) ? 'low' : '');
const slowOf = s => (+s.qty || 0) > 0 && Date.now() - (s.lastMove || s.createdAt || Date.now()) > 90 * 864e5;
const needQty = s => Math.max((+s.reorder || 0) || ((+s.min || 0) * 2 - (+s.qty || 0)), (+s.min || 0) - (+s.qty || 0) + 1, 1);
const poBadge = st => `<span class="pst ${st}">${t(PO_LABEL[st] || st)}</span>`;
const payOpts = () => { const s = settings(); return {cod: s.payCOD !== false, online: !!s.payOnline}; };

/* ---------------- partner portal ---------------- */
function renderPartner(fromData){
  const page = $('#partnerPage'); if(!page) return;
  if(!S.ready){ page.innerHTML = `<div class="lock">${t('Loading…')}</div>`; return; }
  if(S.partnerPreview && S.admin && (!S.partner || S.partner.id !== S.partnerPreview)){ const p = Store.get('partners', S.partnerPreview); if(p) S.partner = p; }
  if(!S.partner && S.admin){ staffPicker(page); return; }
  if(!S.partner){ if(!fromData || !$('#ptLogin')) partnerLogin(page); return; }
  const focus = document.activeElement && document.activeElement.id;
  const st = myStock(), low = st.filter(s => lowOf(s)), ords = myOrders(), open = ords.filter(o => !['received','cancelled','rejected'].includes(o.status));
  const role = ptRole(), can = k => PT_TABS[k].includes(role);
  const pendingL = Store.all('plistings').filter(l => l.pid === S.partner.id && l.status === 'pending').length;
  const tabs = [['overview','Overview',0],['counter','Counter sale',0],['stock','My stock',low.length],['buy','Buy from Auto Engineer',PS.cart.length],['orders','My orders',open.length],['web','Sell on website',pendingL],['trends','Customer searches',0],['vin','VIN lookup',0],['account','Account',0]].filter(([k]) => can(k));
  if(!can(PS.tab)) PS.tab = 'overview';
  page.innerHTML = `${ptPreview() ? `<div class="pt-preview">👁 ${t('Staff preview of {s}: you see exactly what this shop sees. Read-only.', {s: esc(S.partner.shop)})} <button class="linkbtn" id="ptExitPv">${t('Exit preview')}</button></div>` : ''}<div class="page-head pt-head"><div><span class="eyebrow">${t('Partner portal')}</span><h1>${esc(S.partner.shop || t('My shop'))}</h1>
      <p class="sub">${esc([S.partner.city, S.partner.phone].filter(Boolean).join(' · '))} · <span class="pt-verified">✓ ${t('Verified partner')}</span>${S.partner.userName ? ` · ${esc(S.partner.userName)} (${t(ROLE_LABEL[role] || role)})` : ''}</p></div>
      <div class="mini" style="text-align:end"><button class="linkbtn" id="ptOut">${t('Sign out')}</button></div></div>
    <div class="tabs">${tabs.map(([k, l, n]) => `<button data-pt="${k}" class="${PS.tab === k ? 'on' : ''}">${t(l)}${n ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div><div id="ptBody"></div>`;
  $('#ptOut').onclick = () => { if(ptPreview()){ S.partnerPreview = null; S.partner = null; renderPartner(); return; } PartnerAPI.logout(); };
  if($('#ptExitPv')) $('#ptExitPv').onclick = () => { S.partnerPreview = null; S.partner = null; S.adminTab = 'partners'; location.hash = 'admin'; };
  page.querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-pt]'); if(b){ PS.tab = b.dataset.pt; renderPartner(); } };
  ({overview: ptOverview, counter: ptCounter, stock: ptStock, buy: ptBuy, orders: ptOrders, web: ptWeb, trends: ptTrends, vin: ptVin, account: ptAccount})[PS.tab]();
  if(focus && $('#' + focus) && /^pt(Q|BuyQ)$/.test(focus)){ const i = $('#' + focus); i.focus(); try{ i.setSelectionRange(i.value.length, i.value.length); }catch(e){} }
}
window.renderPartner = renderPartner;

function staffPicker(page){
  const list = Store.all('partners').sort((a, b) => String(a.shop).localeCompare(String(b.shop)));
  page.innerHTML = `<div class="page-head"><div><span class="eyebrow">${t('Wholesale room')}</span><h1>${t('Partner portal')}</h1>
      <p class="sub">${t('You are signed in as staff. Open the portal as one of your partner shops to see exactly what they see.')}</p></div>
      <div class="room-switch"><a href="#shop">${t('Retail')}</a><a href="#partner" class="on">${t('Wholesale')}</a></div></div>
    ${list.length ? `<div class="pt-pick">${list.map(p => `<button class="panel" data-pv="${esc(p.id)}"><b>${esc(p.shop)}</b><span>${esc([p.city, p.phone].filter(Boolean).join(' · '))}</span><em>${t('Open portal')} →</em></button>`).join('')}</div>`
      : `<div class="panel empty">${t('No partner shops yet.')} <a class="linkbtn" href="#admin" id="ptToAdd">${t('Add your first partner in Staff › Partners')}</a></div>`}`;
  page.onclick = e => { const b = e.target.closest('[data-pv]'); if(b){ S.partnerPreview = b.dataset.pv; S.partner = Store.get('partners', b.dataset.pv); PS.tab = 'overview'; renderPartner(); }
    if(e.target.closest('#ptToAdd')) S.adminTab = 'partners'; };
}

function partnerLogin(page){
  page.onclick = null;
  page.innerHTML = `<div class="page-head"><div><span class="eyebrow">${t('Wholesale room')}</span><h1>${t('Partner portal')}</h1>
      <p class="sub">${t('For trusted partner shops: trade prices, bulk orders, a free stock system and selling on our website.')}</p></div>
      <div class="room-switch"><a href="#shop">${t('Retail')}</a><a href="#partner" class="on">${t('Wholesale')}</a></div></div>
    <div class="pt-login"><div class="panel"><span class="eyebrow">${t('Partner portal')}</span><h2 style="margin:6px 0 4px">${t('Sign in to your shop')}</h2>
    <p class="sub">${t('For trusted partner shops of Auto Engineer. Your account is created by Auto Engineer.')}</p>
    <form id="ptLogin" class="form"><label>${t('Phone number')}<input name="phone" type="tel" inputmode="tel" dir="ltr" placeholder="0750 123 4567" required></label>
    <label>${t('Password')}<input name="pw" type="password" required minlength="8"></label>
    <p class="err hidden" id="ptErr"></p><button class="btn red" style="width:100%">${t('Sign in')}</button></form>
    <p class="mini" style="margin-top:14px">${t('Want to become a partner?')} <button type="button" class="linkbtn" id="ptApplyBtn">${t('Apply here')}</button></p>
    <form id="ptApply" class="form hidden" style="margin-top:14px;border-top:1px solid #e4e7eb;padding-top:14px"><b>${t('Apply to become a partner')}</b>
      <label>${t('Shop name')}<input name="company" required></label><label>${t('Your name')}<input name="name" required></label>
      <label>${t('Phone')}<input name="phone" type="tel" dir="ltr" required></label><label>${t('City')}<input name="location" required></label>
      <button class="btn">${t('Send application')}</button></form></div>
    <div class="pt-why">${[['📦','Free stock system','Know what you have, what is running low and what to reorder.'],['🛒','Buy at trade price','Order from Auto Engineer at your own partner price.'],['🏪','Sell on our website','List your parts for thousands of customers (coming soon).']].map(([i, h, p]) => `<div><b>${i} ${t(h)}</b><span>${t(p)}</span></div>`).join('')}</div></div>`;
  $('#ptApplyBtn').onclick = () => { $('#ptApply').classList.toggle('hidden'); };
  $('#ptApply').onsubmit = async e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target)), k = phoneKey(fd.phone);
    if(k.length < 12){ toast(t('Check the phone number.')); return; }
    try{ await Store.set('wholesalers', 'w_' + k, {...fd, phoneKey: k, btype: 'Parts shop / reseller', status: 'pending', lang: LANG, createdAt: Date.now()});
      e.target.innerHTML = `<div class="success"><div class="tick">✓</div><b>${t('Application sent')}</b><p class="sub">${t('We will contact you after reviewing it.')}</p></div>`; }catch(x){ toast(t('Could not save')); } };
  const f = $('#ptLogin');
  f.onsubmit = async e => { e.preventDefault(); const err = $('#ptErr'); err.classList.add('hidden'); const b = f.querySelector('button'); b.disabled = true;
    try{ await PartnerAPI.login(f.phone.value, f.pw.value); }catch(x){ err.textContent = t('Phone number or password is not correct.'); err.classList.remove('hidden'); }
    b.disabled = false; };
}

function ptOverview(){
  const st = myStock(), val = st.reduce((s, x) => s + (+x.qty || 0) * (+x.cost || 0), 0), low = st.filter(s => lowOf(s) === 'low'), out = st.filter(s => lowOf(s) === 'out'), slow = st.filter(slowOf);
  const need = st.filter(s => lowOf(s)).sort((a, b) => (+a.qty || 0) - (+b.qty || 0));
  const ords = myOrders().filter(o => !['received','cancelled','rejected'].includes(o.status));
  $('#ptBody').innerHTML = `<div class="pt-start">
      <button data-go="stock"><i>📦</i><b>${t('My stock')}</b><span>${t('Add your items, see what you have and what is running low.')}</span></button>
      <button data-go="buy"><i>🛒</i><b>${t('Place an order')}</b><span>${t('Buy from Auto Engineer at your partner price.')}</span></button>
      <button data-go="sell"><i>🏪</i><b>${t('Sell my parts')}</b><span>${t('List your parts on autoengineeriq.com.')}</span></button></div>
    <div class="kpis">
      <div class="kpi"><span>${t('Items in stock')}</span><b>${st.length.toLocaleString('en')}</b></div>
      <div class="kpi"><span>${t('Stock value (cost)')}</span><b>${money(val) || '0'}</b></div>
      <div class="kpi warn"><span>${t('Running low')}</span><b>${low.length}</b></div>
      <div class="kpi bad"><span>${t('Out of stock')}</span><b>${out.length}</b></div>
      <div class="kpi"><span>${t('Not moving 90+ days')}</span><b>${slow.length}</b></div>
      <div class="kpi"><span>${t('Open orders')}</span><b>${ords.length}</b></div></div>
    <div class="panel"><div class="pt-row"><h3>${t('What you need')}</h3>${need.length ? `<button class="btn red sm" id="ptNeedAll">${t('Order all from Auto Engineer')}</button>` : ''}</div>
      <p class="sub">${t('Items at or below the minimum level you set. Order them from Auto Engineer in one tap.')}</p>
      ${need.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part number')}</th><th>${t('Description')}</th><th class="num">${t('In stock')}</th><th class="num">${t('Minimum')}</th><th class="num">${t('Suggested order')}</th><th></th></tr></thead><tbody>
        ${need.slice(0, 50).map(s => `<tr><td class="ltr"><b>${esc(s.partNo)}</b></td><td>${esc(sName(s))}</td><td class="num"><span class="qty ${lowOf(s)}">${+s.qty || 0}</span></td><td class="num">${+s.min || 0}</td><td class="num">${needQty(s)}</td>
          <td><button class="btn sm ghost" data-need="${esc(s.partNo)}" data-q="${needQty(s)}">${t('Add to order')}</button></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${st.length ? t('Everything is above its minimum level. Set minimum levels in My stock to get reminders.') : t('Add your items in My stock to start. You can import them from Excel.')}</div>`}</div>`;
  const add = async list => { const ids = list.map(([no]) => partId(no)); const pr = await PartnerAPI.prices(ids); let n = 0;
    list.forEach(([no, q]) => { const id = partId(no); if(pr[id] === undefined) return; const ex = PS.cart.find(c => c.partId === id); if(ex) ex.qty = Math.max(ex.qty, q); else PS.cart.push({partId: id, partNo: no, qty: q}); n++; });
    toast(n ? t('{n} added to your order', {n}) : t('Auto Engineer does not have these parts in the catalog.')); if(n){ PS.tab = 'buy'; renderPartner(); } };
  $('#ptBody').onclick = e => { const g = e.target.closest('[data-go]'); if(g){ PS.tab = g.dataset.go; renderPartner(); return; } const b = e.target.closest('[data-need]'); if(b) add([[b.dataset.need, +b.dataset.q]]); if(e.target.closest('#ptNeedAll')) add(need.map(s => [s.partNo, needQty(s)])); };
}

function ptStock(){
  let st = myStock(); const q = PS.q.trim().toLowerCase();
  if(q) st = st.filter(s => (s.partNo + ' ' + s.name + ' ' + (s.nameAr || '') + ' ' + (s.nameKu || '') + ' ' + (s.shelf || '')).toLowerCase().includes(q));
  if(PS.filter === 'low') st = st.filter(s => lowOf(s) === 'low'); else if(PS.filter === 'out') st = st.filter(s => lowOf(s) === 'out'); else if(PS.filter === 'slow') st = st.filter(slowOf);
  st.sort((a, b) => String(a.partNo).localeCompare(String(b.partNo)));
  const shown = st.slice(0, 300);
  $('#ptBody').innerHTML = `<div class="admin-bar"><input id="ptQ" class="input" placeholder="${esc(t('Search part number, name or shelf…'))}" value="${esc(PS.q)}">
      <select id="ptF" class="sel">${[['all','All items'],['low','Running low'],['out','Out of stock'],['slow','Not moving 90+ days']].map(([v, l]) => `<option value="${v}" ${PS.filter === v ? 'selected' : ''}>${t(l)}</option>`).join('')}</select>
      <button class="btn red sm" id="ptAdd">+ ${t('Add item')}</button><button class="btn sm ghost" id="ptImp">${t('Import Excel')}</button><button class="btn sm ghost" id="ptExp">${t('Export Excel')}</button><input type="file" id="ptFile" accept=".xlsx,.xls,.csv" hidden></div>
    <p class="mini" style="margin:0 0 10px">${t('{n} items', {n: st.length.toLocaleString('en')})}${st.length > 300 ? ' · ' + t('showing the first 300, search to narrow') : ''}</p>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part number')}</th><th>${t('Description')}</th><th>${t('Shelf')}</th><th class="num">${t('In stock')}</th><th class="num">${t('Minimum')}</th><th class="num">${t('Cost')}</th><th class="num">${t('Selling price')}</th><th></th></tr></thead><tbody>
    ${shown.length ? shown.map(s => `<tr data-id="${esc(s.id)}"><td class="ltr"><b>${esc(s.partNo)}</b></td><td>${esc(sName(s))}${slowOf(s) ? ` <span class="mini">· ${t('not moving')}</span>` : ''}</td><td>${esc(s.shelf || '')}</td>
      <td class="num"><span class="qbtns"><button data-mv="-1" aria-label="−">−</button><span class="qty ${lowOf(s)}">${+s.qty || 0}</span><button data-mv="1" aria-label="+">+</button></span></td>
      <td class="num">${+s.min || 0}</td><td class="num">${s.cost ? money(s.cost) : '—'}</td><td class="num">${s.price ? money(s.price) : '—'}</td>
      <td><button class="linkbtn" data-ed>${t('Edit')}</button> · <button class="linkbtn" data-hist>${t('History')}</button></td></tr>`).join('')
      : `<tr><td colspan="8" class="empty">${myStock().length ? t('No items match.') : t('No items yet. Add them one by one or import your Excel list.')}</td></tr>`}</tbody></table></div>`;
  $('#ptQ').oninput = e => { PS.q = e.target.value; ptStock(); const i = $('#ptQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
  $('#ptF').onchange = e => { PS.filter = e.target.value; ptStock(); };
  $('#ptAdd').onclick = () => ptItemModal(null);
  $('#ptExp').onclick = ptExport;
  $('#ptImp').onclick = () => $('#ptFile').click(); $('#ptFile').onchange = e => ptImport(e.target.files[0]);
  $('#ptBody').querySelector('tbody').onclick = e => { const tr = e.target.closest('tr[data-id]'); if(!tr) return; const s = Store.get('pstock', tr.dataset.id);
    const mv = e.target.closest('[data-mv]'); if(mv){ ptMove(s, +mv.dataset.mv, mv.dataset.mv === '-1' ? 'out' : 'in', ''); return; }
    if(e.target.closest('[data-ed]')) ptItemModal(s); if(e.target.closest('[data-hist]')) ptHistory(s); };
}

async function ptMove(s, delta, kind, note){
  if(ro()) return;
  const now = Date.now(), q = (+s.qty || 0) + delta; if(q < 0){ toast(t('Not enough stock.')); return; }
  await Store.set('pstock', s.id, {...s, qty: q, updatedAt: now, lastMove: now});
  await Store.set('pmoves', 'pm_' + rid(12), {pid: S.partner.id, stockId: s.id, partNo: s.partNo, delta, kind, note: note || '', at: now});
}

function ptItemModal(s){
  if(ro()) return;
  const isNew = !s; s = s || {qty: 0, min: 0, reorder: 0};
  pModal(`<h3>${isNew ? t('Add item') : t('Edit item')}</h3><form id="ptItemF" class="form grid2">
    <label>${t('Part number')}<input name="partNo" dir="ltr" required value="${esc(s.partNo || '')}" ${isNew ? '' : 'readonly'} autocomplete="off"></label>
    <label>${t('Shelf / location')}<input name="shelf" value="${esc(s.shelf || '')}" placeholder="A-12"></label>
    <label class="span2">${t('Description')}<input name="name" required value="${esc(s.name || '')}"></label>
    ${isNew ? `<label>${t('Quantity in stock')}<input name="qty" type="number" min="0" step="1" value="0" dir="ltr"></label>` : `<label>${t('Quantity in stock')}<input value="${+s.qty || 0}" disabled dir="ltr"><small>${t('Use stock in / out to change the quantity.')}</small></label>`}
    <label>${t('Minimum level')}<input name="min" type="number" min="0" step="1" value="${+s.min || 0}" dir="ltr"><small>${t('Warn me when stock reaches this.')}</small></label>
    <label>${t('Reorder quantity')}<input name="reorder" type="number" min="0" step="1" value="${+s.reorder || 0}" dir="ltr"></label>
    <label>${t('Cost (IQD)')}<input name="cost" type="number" min="0" step="250" value="${esc(s.cost ?? '')}" dir="ltr"></label>
    <label>${t('Selling price (IQD)')}<input name="price" type="number" min="0" step="250" value="${esc(s.price ?? '')}" dir="ltr"></label>
    ${isNew ? '' : `<div class="span2 pt-io"><b>${t('Stock in / out')}</b><input name="mvq" type="number" min="1" step="1" placeholder="${esc(t('Quantity'))}" dir="ltr"><input name="mvn" placeholder="${esc(t('Note (optional)'))}">
      <button type="button" class="btn sm" data-io="in">+ ${t('Stock in')}</button><button type="button" class="btn sm" data-io="out">− ${t('Stock out / sold')}</button></div>`}
    <p class="err hidden span2" id="ptItemErr"></p>
    <div class="span2 actions">${isNew ? '' : `<button type="button" class="linkbtn danger" id="ptDel">${t('Delete item')}</button>`}<span style="flex:1"></span><button type="button" class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn red">${t('Save')}</button></div></form>`);
  const f = $('#ptItemF');
  if(isNew) f.partNo.onchange = async () => { const no = fmtPartNo(f.partNo.value); f.partNo.value = no; if(f.name.value) return;
    const r = await PartsAPI.search({q: no, lim: 1, off: 0}).catch(() => null); const p = r && r.rows && r.rows.find(x => String(x.partNo).replace(/-/g, '') === no.replace(/-/g, '')); if(p && !f.name.value) f.name.value = pName(p); };
  f.onclick = async e => { const b = e.target.closest('[data-io]'); if(!b) return; const q = Math.round(+f.mvq.value); if(!(q > 0)){ f.mvq.focus(); return; }
    const cur = Store.get('pstock', s.id); await ptMove(cur, b.dataset.io === 'in' ? q : -q, b.dataset.io, f.mvn.value.trim()); closeModal(); toast(t('Stock updated')); };
  if($('#ptDel')) $('#ptDel').onclick = async () => { if(!confirm(t('Delete this item from your stock?'))) return; await Store.del('pstock', s.id); closeModal(); };
  f.onsubmit = async e => { e.preventDefault(); const no = fmtPartNo(f.partNo.value.trim()); const id = isNew ? stockId(no) : s.id;
    if(isNew && Store.get('pstock', id)){ const er = $('#ptItemErr'); er.textContent = t('This part number is already in your stock.'); er.classList.remove('hidden'); return; }
    const now = Date.now(), num = v => v === '' ? null : Math.max(0, Math.round(+v));
    const d = {...(isNew ? {} : Store.get('pstock', id)), pid: S.partner.id, partNo: no, name: f.name.value.trim(), shelf: f.shelf.value.trim(), min: num(f.min.value) || 0, reorder: num(f.reorder.value) || 0, cost: num(f.cost.value), price: num(f.price.value), updatedAt: now};
    if(isNew){ d.qty = num(f.qty.value) || 0; d.createdAt = now; d.lastMove = now; }
    delete d.id; await Store.set('pstock', id, d);
    if(isNew && d.qty) await Store.set('pmoves', 'pm_' + rid(12), {pid: S.partner.id, stockId: id, partNo: no, delta: d.qty, kind: 'adjust', note: t('Opening stock'), at: now});
    closeModal(); toast(t('Saved')); };
}

function ptHistory(s){
  const mv = Store.all('pmoves').filter(m => m.stockId === s.id).sort((a, b) => b.at - a.at).slice(0, 100);
  const kl = {in: 'Stock in', out: 'Stock out / sold', purchase: 'Bought from Auto Engineer', adjust: 'Adjustment', sale: 'Sold on website'};
  pModal(`<h3>${esc(s.partNo)} · ${esc(sName(s))}</h3><p class="sub">${t('In stock')}: <b>${+s.qty || 0}</b></p>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Date')}</th><th>${t('Movement')}</th><th class="num">${t('Quantity')}</th><th>${t('Note')}</th></tr></thead><tbody>
    ${mv.length ? mv.map(m => `<tr><td>${dtStr(m.at)}</td><td>${t(kl[m.kind] || m.kind)}</td><td class="num"><b class="${m.delta < 0 ? 'neg' : 'pos'}">${m.delta > 0 ? '+' : ''}${m.delta}</b></td><td>${esc(m.note || '')}</td></tr>`).join('') : `<tr><td colspan="4" class="empty">${t('No movements yet.')}</td></tr>`}</tbody></table></div>
    <div class="actions"><button class="btn" data-mclose>${t('Close')}</button></div>`, true);
}

async function ptImport(file){
  if(!file || ro()) return; if(!window.XLSX){ toast(t('Excel reader still loading. Try again in a moment.')); return; }
  const wb = XLSX.read(await file.arrayBuffer()); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval: ''});
  const norm = s => String(s).toLowerCase().replace(/[^a-z؀-ۿ]/g, '');
  const pick = (r, keys) => { for(const k of Object.keys(r)){ const n = norm(k); if(keys.some(x => n.includes(x))) return r[k]; } return ''; };
  const now = Date.now(); let added = 0, updated = 0;
  for(const r of rows){
    const no = fmtPartNo(String(pick(r, ['partnumber','partno','pn','number','رقم','ژمارە'])).trim()); if(!no) continue;
    const id = stockId(no), ex = Store.get('pstock', id), n = v => v === '' || v === null ? null : Math.max(0, Math.round(+String(v).replace(/[^0-9.]/g, '')));
    const d = {...(ex || {}), pid: S.partner.id, partNo: no, name: String(pick(r, ['description','name','وصف','اسم','ناو'])).trim() || (ex && ex.name) || '', updatedAt: now};
    const q = n(pick(r, ['qty','quantity','stock','الكمية','بڕ'])), mi = n(pick(r, ['min'])), co = n(pick(r, ['cost','كلفة','تكلفة'])), pr = n(pick(r, ['price','sell','سعر','نرخ'])), sh = String(pick(r, ['shelf','location','رف'])).trim();
    if(q !== null) d.qty = q; else if(!ex) d.qty = 0; if(mi !== null) d.min = mi; if(co !== null) d.cost = co; if(pr !== null) d.price = pr; if(sh) d.shelf = sh;
    if(!ex){ d.createdAt = now; d.lastMove = now; d.min = d.min || 0; d.reorder = 0; added++; } else updated++;
    delete d.id; await Store.set('pstock', id, d);
  }
  toast(t('Import done: {a} added, {u} updated', {a: added, u: updated})); ptStock();
}

function ptExport(){
  if(!window.XLSX){ toast(t('Excel reader still loading. Try again in a moment.')); return; }
  const rows = myStock().map(s => ({'Part number': s.partNo, 'Description': s.name, 'Shelf': s.shelf || '', 'Qty': +s.qty || 0, 'Min': +s.min || 0, 'Reorder qty': +s.reorder || 0, 'Cost': s.cost ?? '', 'Selling price': s.price ?? '', 'Value': (+s.qty || 0) * (+s.cost || 0)}));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{'Part number': '', 'Description': '', 'Shelf': '', 'Qty': '', 'Min': '', 'Reorder qty': '', 'Cost': '', 'Selling price': ''}]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Stock'); XLSX.writeFile(wb, (S.partner.shop || 'stock').replace(/[^\w\- ]+/g, '') + ' - stock.xlsx');
}

/* ---- buy from Auto Engineer ---- */
function ptBuy(){
  const pay = payOpts(), cartTot = PS.cart.reduce((s, c) => s + (+PS.buyPrices[c.partId] || 0) * c.qty, 0);
  $('#ptBody').innerHTML = `<div class="pt-buy"><div>
      <div class="searchbar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="ptBuyQ" type="search" placeholder="${esc(t('Search: 04465-0K290, brake pads, oil filter…'))}" value="${esc(PS.buyQ)}"></div>
      <p class="mini">${t('Your partner prices. Every order is confirmed by Auto Engineer before delivery.')}</p><div id="ptBuyRes" class="pt-res"></div></div>
    <aside class="panel pt-cart"><h3>${t('Your order')}</h3>
      ${PS.cart.length ? `<div class="pt-lines">${PS.cart.map((c, i) => `<div class="pt-line"><div><b class="ltr">${esc(c.partNo)}</b><span>${esc(c.name || '')}</span></div>
        <input type="number" min="1" step="1" value="${c.qty}" data-cq="${i}" dir="ltr"><span class="num">${PS.buyPrices[c.partId] ? money(PS.buyPrices[c.partId] * c.qty) : '—'}</span><button class="linkbtn" data-cx="${i}" aria-label="${esc(t('Remove'))}">×</button></div>`).join('')}</div>
        <div class="pt-tot"><span>${t('Total')}</span><b>${money(cartTot) || '—'}</b></div>
        <label class="mini">${t('Payment')}<select id="ptPay" class="sel">${pay.cod ? `<option value="cod">${t('Cash on delivery')}</option>` : ''}${pay.online ? `<option value="online">${t('Online payment')}</option>` : ''}</select></label>
        ${!pay.cod && !pay.online ? `<p class="err">${t('Online payment is coming soon. Ordering will open then.')}</p>` : ''}
        <textarea id="ptNote" class="input" rows="2" placeholder="${esc(t('Note for Auto Engineer (optional)'))}"></textarea>
        <button class="btn red" id="ptSend" style="width:100%" ${!pay.cod && !pay.online ? 'disabled' : ''}>${t('Send order for approval')}</button>`
      : `<div class="empty">${t('Search for parts and add them here.')}</div>`}</aside></div>`;
  $('#ptBuyQ').oninput = e => { PS.buyQ = e.target.value; clearTimeout(PS.buyTimer); PS.buyTimer = setTimeout(ptBuySearch, 250); };
  const cart = $('.pt-cart');
  cart.oninput = e => { const i = e.target.dataset.cq; if(i === undefined) return; PS.cart[+i].qty = Math.max(1, Math.round(+e.target.value) || 1); };
  cart.onchange = e => { if(e.target.dataset.cq !== undefined) ptBuy(); };
  cart.onclick = async e => { const x = e.target.closest('[data-cx]'); if(x){ PS.cart.splice(+x.dataset.cx, 1); ptBuy(); return; }
    if(e.target.closest('#ptSend')){ if(ro()) return; const b = $('#ptSend'); b.disabled = true;
      try{ const no = await PartnerAPI.placeOrder(PS.cart.map(c => ({partId: c.partId, qty: c.qty})), $('#ptPay').value, $('#ptNote').value.trim());
        PS.cart = []; PS.tab = 'orders'; toast(t('Order {no} sent. Auto Engineer will confirm it.', {no})); renderPartner();
      }catch(er){ toast(t('Could not send the order. Try again.')); b.disabled = false; } } };
  ptBuySearch(true); ptCartPrices();
}
async function ptCartPrices(){ const ids = PS.cart.map(c => c.partId).filter(id => PS.buyPrices[id] === undefined); if(!ids.length) return;
  Object.assign(PS.buyPrices, await PartnerAPI.prices(ids)); if(PS.tab === 'buy') ptBuy(); }
async function ptBuySearch(keep){
  const el = $('#ptBuyRes'); if(!el) return; const q = PS.buyQ.trim();
  if(!q){ el.innerHTML = `<div class="empty">${t('Type a part number or part name.')}</div>`; return; }
  if(!(keep && PS.buyRows.length && PS.buyRows.q === q)){ el.innerHTML = `<div class="empty">${t('Searching…')}</div>`;
    const r = await PartsAPI.search({q, lim: 30, off: 0}).catch(() => ({rows: []})); const rows = r.rows || []; rows.q = q; PS.buyRows = rows; rows.forEach(p => PS.cache[p.id] = p);
    Object.assign(PS.buyPrices, await PartnerAPI.prices(rows.map(p => p.id).filter(id => PS.buyPrices[id] === undefined))); }
  if(PS.buyQ.trim() !== q) return;
  const inC = new Set(PS.cart.map(c => c.partId));
  el.innerHTML = PS.buyRows.length ? PS.buyRows.map(p => { const pr = PS.buyPrices[p.id];
    return `<div class="pt-item"><div><b class="ltr">${esc(p.partNo)}</b><span>${esc(pName(p))}</span>${p.stock ? `<small>${t(p.stock)}</small>` : ''}</div>
      <div class="num">${pr ? `<b>${money(pr)}</b>` : `<small>${t('Price on request')}</small>`}</div>
      <button class="btn sm ${inC.has(p.id) ? 'ghost' : 'red'}" data-add="${esc(p.id)}" ${pr ? '' : 'disabled'}>${inC.has(p.id) ? '✓ ' + t('Added') : t('Add')}</button></div>`; }).join('')
    : `<div class="empty">${t('No parts found')}</div>`;
  el.onclick = e => { const b = e.target.closest('[data-add]'); if(!b) return; const p = PS.buyRows.find(x => x.id === b.dataset.add); const ex = PS.cart.find(c => c.partId === p.id);
    if(ex) ex.qty++; else PS.cart.push({partId: p.id, partNo: p.partNo, name: pName(p), qty: 1}); ptBuy(); };
}

function ptOrders(){
  const ords = myOrders();
  $('#ptBody').innerHTML = ords.length ? ords.map(o => `<div class="panel pt-order"><div class="pt-row"><div><b>${esc(o.id)}</b> · ${dateStr(o.createdAt)} · ${poBadge(o.status)}</div><b>${money(o.total) || ''}</b></div>
      ${['rejected','cancelled'].includes(o.status) ? '' : `<div class="pt-steps">${PO_FLOW.map((s, i) => `<span class="${PO_FLOW.indexOf(o.status) >= i ? 'on' : ''}">${t(PO_LABEL[s])}</span>`).join('')}</div>`}
      <div class="tblwrap"><table class="tbl"><tbody>${(o.lines || []).map(l => `<tr><td class="ltr">${esc(l.partNo)}</td><td>${esc(sName(l))}</td><td class="num">× ${l.qty}</td><td class="num">${money((l.price || 0) * l.qty)}</td></tr>`).join('')}</tbody></table></div>
      <p class="mini">${t('Payment')}: ${o.pay === 'online' ? t('Online payment') : t('Cash on delivery')}${o.courier ? ' · ' + t('Delivery') + ': ' + esc(o.courier) + (o.tracking ? ' (' + esc(o.tracking) + ')' : '') : ''}${o.reply ? '<br>' + t('Auto Engineer') + ': ' + esc(o.reply) : ''}</p>
      <div class="actions">${o.status === 'new' ? `<button class="btn sm ghost" data-cancel="${esc(o.id)}">${t('Cancel order')}</button>` : ''}
        ${['shipped','delivered'].includes(o.status) ? `<button class="btn sm red" data-recv="${esc(o.id)}">${t('I received it → add to my stock')}</button>` : ''}</div></div>`).join('')
    : `<div class="empty panel">${t('No orders yet.')} <button class="linkbtn" id="ptGoBuy">${t('Buy from Auto Engineer')}</button></div>`;
  $('#ptBody').onclick = async e => {
    if(e.target.closest('#ptGoBuy')){ PS.tab = 'buy'; renderPartner(); return; }
    const c = e.target.closest('[data-cancel]'); if(c && ro()) return; if(c && confirm(t('Cancel this order?'))){ await PartnerAPI.cancel(c.dataset.cancel).catch(() => toast(t('Could not save'))); renderPartner(); }
    const r = e.target.closest('[data-recv]'); if(r && ro()) return; if(r && confirm(t('Confirm you received everything? The parts will be added to your stock.'))){ r.disabled = true;
      try{ await PartnerAPI.receive(r.dataset.recv); toast(t('Added to your stock')); }catch(er){ toast(t('Could not save')); } renderPartner(); }
  };
}

function ptSell(){
  $('#ptBody').innerHTML = `<div class="panel"><h3>${t('Sell on autoengineeriq.com')}</h3>
    <p>${t('Soon you will list your own parts on our website, with your shop name as a verified partner. Every listing and every sale is approved by Auto Engineer.')}</p>
    <ul class="pt-list"><li>${t('List items straight from My stock in one tap')}</li><li>${t('Customers pay online; Auto Engineer pays you after delivery')}</li><li>${t('Commission: {c}% per sale', {c: S.partner.commission ?? 1.5})}</li></ul>
    <p class="mini">${t('Keep your stock up to date now, so your items are ready to list on day one.')}</p></div>`;
}

function ptAccount(){
  const p = S.partner;
  $('#ptBody').innerHTML = `<div class="grid2"><div class="panel"><h3>${t('Shop details')}</h3>
      <dl class="pt-dl"><dt>${t('Shop')}</dt><dd>${esc(p.shop || '')}</dd><dt>${t('Owner')}</dt><dd>${esc(p.owner || '')}</dd><dt>${t('Phone')}</dt><dd class="ltr">${esc(p.phone || '')}</dd><dt>${t('City')}</dt><dd>${esc(p.city || '')}</dd>
      <dt>${t('Partner discount')}</dt><dd>${+p.discount || 0}%</dd><dt>${t('Commission on sales')}</dt><dd>${p.commission ?? 1.5}%</dd></dl>
      <p class="mini">${t('To change these details, contact Auto Engineer.')}</p></div>
    <div class="panel"><h3>${t('Change password')}</h3><form id="ptPw" class="form"><label>${t('New password')}<input name="a" type="password" minlength="8" required></label><label>${t('Repeat new password')}<input name="b" type="password" minlength="8" required></label>
      <p class="err hidden" id="ptPwErr"></p><button class="btn red">${t('Save')}</button></form></div></div>`;
  $('#ptPw').onsubmit = async e => { e.preventDefault(); if(ro()) return; const f = e.target, er = $('#ptPwErr'); er.classList.add('hidden');
    if(f.a.value !== f.b.value){ er.textContent = t('The two passwords are different.'); er.classList.remove('hidden'); return; }
    try{ if(S.mode === 'supabase'){ const {error} = await S.sb.auth.updateUser({password: f.a.value}); if(error) throw error; } else { const d = clone(Store.get('partners', p.id)); d.demoPassword = f.a.value; await Store.set('partners', p.id, d); }
      f.reset(); toast(t('Password changed')); }catch(x){ er.textContent = t('Could not save'); er.classList.remove('hidden'); } };
}

/* ---------------- staff: partners ---------------- */
function adminPartners(){
  const list = Store.all('partners').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), stock = Store.all('pstock'), pos = Store.all('porders');
  const apps = Store.all('wholesalers').filter(w => w.status === 'pending').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $('#adminBody').innerHTML = `${apps.length ? `<div class="panel" style="margin-bottom:16px"><h3 style="margin:0 0 8px">${t('Applications')} (${apps.length})</h3><div class="tblwrap"><table class="tbl"><tbody>
      ${apps.map(w => `<tr><td><b>${esc(w.company || '')}</b><br><span class="mini">${esc(w.name || '')}</span></td><td class="ltr">${esc(w.phone || '')}</td><td>${esc(w.location || '')}</td><td>${dateStr(w.createdAt)}</td>
        <td style="white-space:nowrap"><button class="btn sm red" data-mk="${esc(w.id)}">${t('Make partner')}</button> <button class="btn sm ghost" data-rj="${esc(w.id)}">${t('Reject')}</button></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    <div class="admin-bar"><span class="sub" style="flex:1">${t('Trusted shops only. You create their account; they sign in at autoengineeriq.com/#partner.')}</span><button class="btn red sm" id="apNew">+ ${t('Add partner')}</button></div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Shop')}</th><th>${t('Phone')}</th><th>${t('City')}</th><th class="num">${t('Discount')}</th><th class="num">${t('Commission')}</th><th class="num">${t('Stock items')}</th><th class="num">${t('Orders')}</th><th>${t('Status')}</th><th></th></tr></thead><tbody>
    ${list.length ? list.map(p => `<tr data-id="${esc(p.id)}"><td><b>${esc(p.shop)}</b><br><span class="mini">${esc(p.owner || '')}</span></td><td class="ltr">${esc(p.phone)}</td><td>${esc(p.city || '')}</td><td class="num">${+p.discount || 0}%</td><td class="num">${p.commission ?? 1.5}%</td>
      <td class="num">${stock.filter(s => s.pid === p.id).length}</td><td class="num">${pos.filter(o => o.pid === p.id).length}</td><td><span class="vst ${p.status === 'paused' ? 'vis' : 'cust'}">${t(p.status === 'paused' ? 'Paused' : 'Active')}</span></td>
      <td style="white-space:nowrap"><button class="linkbtn" data-pv>${t('Open portal')}</button> · <button class="linkbtn" data-acc>${t('Account')}</button> · <button class="linkbtn" data-ed>${t('Edit')}</button></td></tr>`).join('') : `<tr><td colspan="9" class="empty">${t('No partners yet.')}</td></tr>`}</tbody></table></div>`;
  $('#apNew').onclick = () => partnerModal(null);
  $('#adminBody').onclick = async e => {
    const mk = e.target.closest('[data-mk]'); if(mk){ const w = Store.get('wholesalers', mk.dataset.mk); partnerModal(null, {shop: w.company, owner: w.name, phone: w.phone, city: w.location, appId: w.id}); return; }
    const rj = e.target.closest('[data-rj]'); if(rj){ const w = clone(Store.get('wholesalers', rj.dataset.rj)); w.status = 'rejected'; w.reviewedAt = Date.now(); delete w.id; await Store.set('wholesalers', rj.dataset.rj, w); return; }
    const tr = e.target.closest('tr[data-id]'); if(!tr) return;
    if(e.target.closest('[data-acc]')){ ledgerModal(tr.dataset.id); return; }
    if(e.target.closest('[data-pv]')){ S.partnerPreview = tr.dataset.id; S.partner = Store.get('partners', tr.dataset.id); PS.tab = 'overview'; location.hash = 'partner'; return; }
    partnerModal(Store.get('partners', tr.dataset.id)); };
}
const genPw = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(10)); r.forEach(x => s += a[x % a.length]); return s.slice(0, 5) + '-' + s.slice(5); };
function partnerModal(p, pre){
  const isNew = !p; p = p || {discount: 10, commission: 1.5, status: 'active', ...(pre || {})};
  pModal(`<h3>${isNew ? t('Add partner') : esc(p.shop)}</h3><form id="apF" class="form grid2">
    <label>${t('Shop name')}<input name="shop" required value="${esc(p.shop || '')}"></label><label>${t('Owner name')}<input name="owner" value="${esc(p.owner || '')}"></label>
    <label>${t('Phone (sign-in)')}<input name="phone" type="tel" dir="ltr" required value="${esc(p.phone || '')}" ${isNew ? '' : 'readonly'}></label><label>${t('City')}<input name="city" value="${esc(p.city || '')}"></label>
    <label class="span2">${t('Address')}<input name="address" value="${esc(p.address || '')}"></label>
    <label>${t('Partner discount % (off retail price)')}<input name="discount" type="number" min="0" max="90" step="0.5" dir="ltr" value="${+p.discount || 0}"></label>
    <label>${t('Commission % on their sales')}<input name="commission" type="number" min="0" max="50" step="0.1" dir="ltr" value="${p.commission ?? 1.5}"></label>
    <label>${t('Credit limit (IQD, 0 = no credit)')}<input name="creditLimit" type="number" min="0" step="50000" dir="ltr" value="${+p.creditLimit || 0}"></label><span></span>
    <label class="span2">${t('Private notes (partner cannot see)')}<input name="notes" value="${esc(p.notes || '')}"></label>
    ${isNew ? `<label class="span2">${t('Starting password')}<input name="pw" dir="ltr" required minlength="8" value="${genPw()}"><small>${t('Give this to the partner. They can change it in Account.')}</small></label>` : ''}
    <p class="err hidden span2" id="apErr"></p>
    <div class="span2 actions">${isNew ? '' : `<button type="button" class="btn sm ghost" id="apPause">${t(p.status === 'paused' ? 'Activate' : 'Pause')}</button><button type="button" class="btn sm ghost" id="apReset">${t('Reset password')}</button>`}
      <span style="flex:1"></span><button type="button" class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn red">${t('Save')}</button></div></form>`, true);
  const f = $('#apF'), er = $('#apErr'), fail = m => { er.textContent = m; er.classList.remove('hidden'); };
  const share = (pt, pw) => { const msg = `${t('Your Auto Engineer partner account')}\n${location.origin}/#partner\n${t('Phone')}: ${pt.phone}\n${t('Password')}: ${pw}`;
    pModal(`<h3>${t('Account ready')}</h3><p>${t('Send these sign-in details to the partner:')}</p><pre class="pt-pre">${esc(msg)}</pre>
      <div class="actions"><a class="btn red" target="_blank" rel="noopener" href="https://wa.me/${phoneKey(pt.phone)}?text=${encodeURIComponent(msg)}">WhatsApp</a><button class="btn ghost" id="apCopy">${t('Copy')}</button><button class="btn" data-mclose>${t('Done')}</button></div>`);
    $('#apCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(msg); toast(t('Copied')); }; };
  f.onsubmit = async e => { e.preventDefault(); er.classList.add('hidden'); const pk = phoneKey(f.phone.value); if(pk.length < 12) return fail(t('Check the phone number.'));
    const id = isNew ? 'pt_' + pk : p.id; if(isNew && Store.get('partners', id)) return fail(t('A partner with this phone number already exists.'));
    const d = {...(isNew ? {} : Store.get('partners', id)), shop: f.shop.value.trim(), owner: f.owner.value.trim(), city: f.city.value.trim(), address: f.address.value.trim(), notes: f.notes.value.trim(),
      discount: Math.min(90, Math.max(0, +f.discount.value || 0)), commission: Math.min(50, Math.max(0, +f.commission.value || 0)), creditLimit: Math.max(0, Math.round(+f.creditLimit.value || 0)), updatedAt: Date.now()};
    if(isNew) Object.assign(d, {phone: f.phone.value.trim(), phoneKey: pk, loginEmail: pk + '@' + PARTNER_DOMAIN, status: 'active', createdAt: Date.now()});
    delete d.id; const btn = f.querySelector('button.red'); btn.disabled = true;
    try{ await Store.set('partners', id, d); if(isNew){ await PartnerAPI.setLogin(id, f.pw.value);
      if(p.appId){ const w = clone(Store.get('wholesalers', p.appId) || {}); if(w.phone){ w.status = 'approved'; w.partnerId = id; w.reviewedAt = Date.now(); delete w.id; await Store.set('wholesalers', p.appId, w); } }
      share(d, f.pw.value); } else { closeModal(); toast(t('Saved')); } }
    catch(x){ btn.disabled = false; fail(t('Could not save') + (x && x.message ? ' — ' + x.message : '')); } };
  if($('#apPause')) $('#apPause').onclick = async () => { const d = clone(Store.get('partners', p.id)); d.status = d.status === 'paused' ? 'active' : 'paused'; delete d.id; await Store.set('partners', p.id, d); closeModal(); };
  if($('#apReset')) $('#apReset').onclick = async () => { const pw = genPw(); try{ await PartnerAPI.setLogin(p.id, pw); share(p, pw); }catch(x){ fail(t('Could not save')); } };
}

/* ---------------- staff: partner orders ---------------- */
function adminPOrders(){
  const list = Store.all('porders').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); const f = S.poF || 'open';
  const shown = list.filter(o => f === 'all' || (f === 'open' ? !['received','cancelled','rejected'].includes(o.status) : o.status === f));
  $('#adminBody').innerHTML = `<div class="admin-bar"><select id="poF" class="sel">${[['open','Open orders'],['new','Waiting for approval'],['all','All orders']].map(([v, l]) => `<option value="${v}" ${f === v ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Order')}</th><th>${t('Shop')}</th><th>${t('Date')}</th><th class="num">${t('Items')}</th><th class="num">${t('Total')}</th><th>${t('Payment')}</th><th>${t('Status')}</th></tr></thead><tbody>
    ${shown.length ? shown.map(o => `<tr data-id="${esc(o.id)}" style="cursor:pointer"><td><b>${esc(o.id)}</b></td><td>${esc(o.shop || '')}</td><td>${dtStr(o.createdAt)}</td><td class="num">${(o.lines || []).reduce((s, l) => s + l.qty, 0)}</td><td class="num">${money(o.total)}</td><td>${t(o.pay === 'online' ? 'Online payment' : 'Cash on delivery')}</td><td>${poBadge(o.status)}</td></tr>`).join('')
      : `<tr><td colspan="7" class="empty">${t('No partner orders.')}</td></tr>`}</tbody></table></div>`;
  $('#poF').onchange = e => { S.poF = e.target.value; adminPOrders(); };
  $('#adminBody').querySelector('tbody').onclick = e => { const tr = e.target.closest('tr[data-id]'); if(tr) poModal(Store.get('porders', tr.dataset.id)); };
}
function poModal(o){
  const next = {new: [['approved','Approve'],['rejected','Reject']], approved: [['shipped','Mark as on the way']], paid: [['shipped','Mark as on the way']], shipped: [['delivered','Mark as delivered']]}[o.status] || [];
  pModal(`<h3>${esc(o.id)} · ${esc(o.shop || '')}</h3><p class="sub">${dtStr(o.createdAt)} · ${poBadge(o.status)} · ${t(o.pay === 'online' ? 'Online payment' : 'Cash on delivery')} · <span class="ltr">${esc(o.phone || '')}</span> · ${esc(o.city || '')}</p>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part number')}</th><th>${t('Description')}</th><th class="num">${t('Qty')}</th><th class="num">${t('Price')}</th><th class="num">${t('Total')}</th></tr></thead><tbody>
    ${(o.lines || []).map(l => `<tr><td class="ltr"><b>${esc(l.partNo)}</b></td><td>${esc(l.name || '')}</td><td class="num">${l.qty}</td><td class="num">${money(l.price)}</td><td class="num">${money((l.price || 0) * l.qty)}</td></tr>`).join('')}
    <tr class="grp"><td colspan="4"><b>${t('Total')}</b></td><td class="num"><b>${money(o.total)}</b></td></tr></tbody></table></div>
    ${o.note ? `<p><b>${t('Partner note')}:</b> ${esc(o.note)}</p>` : ''}
    ${o.pay === 'credit' ? (() => { const pt = Store.get('partners', o.pid) || {}, bal = Store.all('pledger').filter(x => x.pid === o.pid).reduce((s, x) => s + (+x.amount || 0), 0), lim = +pt.creditLimit || 0;
      return `<p class="${bal + (o.ledgered ? 0 : +o.total) > lim ? 'err' : 'mini'}">${t('On credit')} · ${t('Credit limit')}: ${money(lim) || '0'} · ${t('They owe')}: ${money(bal) || '0'}${o.ledgered ? '' : ' · ' + t('after this order') + ': ' + money(bal + (+o.total || 0))}</p>`; })() : ''}
    <form id="poF2" class="form grid2"><label>${t('Delivery company')}<input name="courier" value="${esc(o.courier || '')}"></label><label>${t('Tracking number')}<input name="tracking" dir="ltr" value="${esc(o.tracking || '')}"></label>
      <label class="span2">${t('Message to partner')}<input name="reply" value="${esc(o.reply || '')}"></label>
      <div class="span2 actions"><button type="button" class="btn ghost" data-mclose>${t('Close')}</button><button type="button" class="btn ghost" data-st="">${t('Save')}</button>${next.map(([s, l]) => `<button type="button" class="btn ${s === 'rejected' ? 'ghost' : 'red'}" data-st="${s}">${t(l)}</button>`).join('')}</div></form>`, true);
  $('#poF2').onclick = async e => { const b = e.target.closest('[data-st]'); if(!b) return; const f = $('#poF2'), d = clone(Store.get('porders', o.id)), now = Date.now();
    d.courier = f.courier.value.trim(); d.tracking = f.tracking.value.trim(); d.reply = f.reply.value.trim(); d.updatedAt = now;
    if(b.dataset.st){ d.status = b.dataset.st; d.log = [...(d.log || []), {at: now, s: d.status, by: S.me || ''}]; }
    delete d.id; await Store.set('porders', o.id, d); await poLedger(o.id).catch(() => {}); closeModal(); toast(t('Saved'));
    if(b.dataset.st){ const pt = Store.get('partners', o.pid) || {}; ptWaPrompt(pt.phone || o.phone, `${t('Auto Engineer')} · ${o.id}: ${t(PO_LABEL[d.status] || d.status)}${d.courier ? ' · ' + d.courier + (d.tracking ? ' (' + d.tracking + ')' : '') : ''}${d.reply ? '\n' + d.reply : ''}`); } };
}
window.adminPartners = adminPartners; window.adminPOrders = adminPOrders;
