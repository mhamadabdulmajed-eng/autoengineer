/* =====================================================================
   Auto Engineer — partner SHOP PAGES and PRICE LISTS
   Partner (owner) builds "My shop page": logo, cover, name, about, details  →  'pbrand' (draft)
   Auto Engineer approves  →  'pshop' (published, public page #store/<slug>)
   Partner uploads a price list (part number, name, price IQD, qty)  →  pstock + plistings (pending)
   Customers order through Auto Engineer; contact details stay private.
   ===================================================================== */
const MAKES = ['Toyota','Lexus','Nissan','Hyundai','Kia','Mitsubishi','Honda','Mazda','Chevrolet','Ford','GMC','Mercedes-Benz','BMW','Land Rover','Isuzu','Suzuki'];
const PSERV = {delivery: 'Delivery', install: 'Fitting / installation', warranty: 'Warranty', order: 'Order on request', wholesale: 'Wholesale', used: 'Used parts'};
const BRAND_ST = {draft: 'Draft', pending: 'Waiting for approval', approved: 'Published', rejected: 'Needs changes'};
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'shop';
const shopUrl = slug => (/^https?:/.test(location.origin) ? location.origin : 'https://autoengineeriq.com') + '/#store/' + slug;

/* shrink an image file to a small webp/jpeg data URL (logo 300px, cover 1400px) */
function imgToData(file, max, ratio){ return new Promise((res, rej) => { if(!file || !/^image\//.test(file.type)) return rej(new Error('not an image'));
  const fr = new FileReader(); fr.onerror = rej; fr.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
    let w = im.width, h = im.height, sx = 0, sy = 0, sw = w, sh = h;
    if(ratio){ const r = w / h; if(r > ratio){ sw = h * ratio; sx = (w - sw) / 2; } else { sh = w / ratio; sy = (h - sh) / 2; } }
    const sc = Math.min(1, max / Math.max(sw, sh)), c = document.createElement('canvas'); c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
    let d = c.toDataURL('image/webp', .82); if(!/^data:image\/webp/.test(d)) d = c.toDataURL('image/jpeg', .82); res(d); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }

/* ---------------- shop pages: data access ---------------- */
let shopCache = null, shopAt = 0;
async function loadShops(force){ if(!force && shopCache && Date.now() - shopAt < 3e5) return shopCache;
  try{ if(S.mode === 'supabase'){ // light list (no images) for links; the page itself loads the full shop
      const {data} = await S.sb.from('docs').select('id,pid:data->>pid,slug:data->>slug,name:data->>name,city:data->>city').eq('col', 'pshop').limit(3000); shopCache = (data || []).map(r => ({...r})); }
    else shopCache = Store.all('pshop').filter(x => !x.hidden); }catch(e){ shopCache = shopCache || []; }
  shopAt = Date.now(); return shopCache; }
const shopOf = pid => (shopCache || []).find(s => s.pid === pid);

/* ================= PARTNER PORTAL: "My shop page" (owner) ================= */
function myBrand(){ return Store.get('pbrand', 'pb_' + S.partner.id); }
function ptBrand(){
  const p = S.partner, b = myBrand() || {}, sh = (Store.get('pshop', 'sh_' + p.id)) || shopOf(p.id), st = b.status || 'draft';
  const v = k => esc(b[k] ?? ''), mk = new Set(b.makes || []), sv = new Set(b.services || []), sc = new Set(b.sections || []);
  $('#ptBody').innerHTML = `<div class="panel"><div class="pt-row"><div><h3>🏪 ${t('My shop page')}</h3><p class="sub" style="margin:4px 0 0">${t('Build your own shop page on autoengineeriq.com: your logo, name and story. Customers find your shop and order your parts through Auto Engineer. Every change is checked by Auto Engineer before it is published.')}</p></div>
      <span class="pst ${st === 'approved' ? 'received' : st === 'pending' ? 'new' : st === 'rejected' ? 'rejected' : ''}">${t(BRAND_ST[st] || st)}</span></div>
    ${b.reply && st === 'rejected' ? `<p class="err">${t('Auto Engineer')}: ${esc(b.reply)}</p>` : ''}
    ${sh && sh.slug ? `<div class="box" style="margin-top:10px">🌐 ${t('Your page is live')}: <a href="${shopUrl(sh.slug)}" target="_blank" rel="noopener" class="ltr">${esc(shopUrl(sh.slug))}</a> <button class="linkbtn" id="brShare">📤 ${t('Share')}</button>${st === 'pending' ? `<br><span class="mini">${t('Your latest changes are waiting for approval; customers still see the published version.')}</span>` : ''}</div>` : ''}</div>
  <form id="brF" class="panel form">
    <div class="br-head"><label class="br-cover" style="${b.cover ? `background-image:url(${b.cover})` : ''}">${b.cover ? '' : `<span>🖼 ${t('Add a cover photo (your shop, shelves or team)')}</span>`}<input type="file" accept="image/*" id="brCov" hidden></label>
      <label class="br-logo">${b.logo ? `<img src="${b.logo}" alt="">` : `<span>${t('Logo')}</span>`}<input type="file" accept="image/*" id="brLogo" hidden></label></div>
    <div class="grid2"><label>${t('Shop name (as customers see it)')}<input name="name" required maxlength="60" value="${v('name') || esc(p.shop || '')}"></label>
      <label>${t('Short slogan')}<input name="tagline" maxlength="90" value="${v('tagline')}" placeholder="${esc(t('e.g. Genuine Toyota parts since 2008'))}"></label>
      <label class="span2">${t('About your shop')}<textarea name="about" rows="4" maxlength="1200" placeholder="${esc(t('What you sell, your experience, why customers trust you…'))}">${v('about')}</textarea></label>
      <label>${t('City')}<input name="city" value="${v('city') || esc(p.city || '')}"></label><label>${t('Area / street')}<input name="area" value="${v('area')}"></label>
      <label>${t('Opening hours')}<input name="hours" value="${v('hours')}" placeholder="${esc(t('e.g. Sat–Thu 9:00–19:00'))}"></label><label>${t('Year founded')}<input name="since" type="number" min="1950" max="2030" dir="ltr" value="${v('since')}"></label></div>
    <h4 style="margin:16px 0 6px">${t('What you sell')}</h4><div class="br-chips">${wsSections().map(s => `<label class="chip"><input type="checkbox" name="sc" value="${esc(s)}" ${sc.has(s) ? 'checked' : ''}> ${esc(secName(s))}</label>`).join('')}</div>
    <label style="display:block;margin-top:10px">${t('Your own brands or the brands you distribute')}<input name="ownBrands" value="${v('ownBrands')}" placeholder="${esc(t('e.g. our own oil brand, Mobil, Bosch'))}"></label>
    <h4 style="margin:16px 0 6px">${t('Car brands you specialise in')}</h4><div class="br-chips">${MAKES.map(m => `<label class="chip"><input type="checkbox" name="mk" value="${m}" ${mk.has(m) ? 'checked' : ''}> ${m}</label>`).join('')}</div>
    <h4 style="margin:16px 0 6px">${t('Services')}</h4><div class="br-chips">${Object.entries(PSERV).map(([k, l]) => `<label class="chip"><input type="checkbox" name="sv" value="${k}" ${sv.has(k) ? 'checked' : ''}> ${t(l)}</label>`).join('')}</div>
    <h4 style="margin:18px 0 4px">🔒 ${t('Private details')}</h4><p class="mini" style="margin:0 0 8px">${t('Only Auto Engineer sees these. Customers always order through Auto Engineer.')}</p>
    <div class="grid2"><label>${t('Owner / manager name')}<input name="owner" value="${v('owner') || esc(p.owner || '')}"></label><label>${t('Shop phone')}<input name="phone" dir="ltr" value="${v('phone') || esc(p.phone || '')}"></label>
      <label>${t('Google Maps link')}<input name="maps" dir="ltr" value="${v('maps')}" placeholder="https://maps.google.com/…"></label><label>${t('Team size')}<input name="team" type="number" min="1" dir="ltr" value="${v('team')}"></label>
      <label>${t('Instagram')}<input name="ig" dir="ltr" value="${v('ig')}" placeholder="@yourshop"></label><label>${t('Facebook / TikTok')}<input name="fb" dir="ltr" value="${v('fb')}"></label>
      <label class="span2">${t('Main suppliers and part brands you carry')}<input name="suppliers" value="${v('suppliers')}" placeholder="${esc(t('e.g. Toyota Genuine, Denso, Aisin, KYB'))}"></label></div>
    <p class="err hidden" id="brErr"></p>
    <div class="actions" style="margin-top:14px"><span class="mini" style="flex:1">${b.updatedAt ? t('Last saved {d}', {d: dtStr(b.updatedAt)}) : ''}</span><button type="button" class="btn ghost" id="brPrev">👁 ${t('Preview')}</button>${ptPreview() ? '' : `<button class="btn red">${t('Save and send for approval')}</button>`}</div>
    ${ptPreview() ? `<p class="err" style="margin-top:10px">👁 ${t('You are in staff preview, so nothing is saved here. To test, sign in as the shop on your phone or in a private window (autoengineeriq.com/#partner).')}</p>` : ''}</form>
  <div class="panel"><div class="pt-row"><div><h3>📄 ${t('Your price list')}</h3><p class="sub" style="margin:4px 0 0">${t('Upload the parts you sell with your retail price (IQD). They appear on your shop page and in Retail search after approval.')}</p></div>${ptPreview() ? '' : `<button class="btn red sm" id="brPL">📄 ${t('Upload price list')}</button>`}</div>
    <p class="mini">${t('{n} items on the website · {p} waiting for approval', {n: myListings().filter(l => l.status === 'approved').length, p: myListings().filter(l => l.status === 'pending').length})} · <button class="linkbtn" id="brGoWeb">${t('See all items')}</button></p></div>`;
  const draft = {logo: b.logo || '', cover: b.cover || ''};
  $('#brLogo').onchange = async e => { try{ draft.logo = await imgToData(e.target.files[0], 300, 1); const box = $('.br-logo'); let im = box.querySelector('img'); if(!im){ const sp = box.querySelector('span'); if(sp) sp.remove(); im = document.createElement('img'); box.prepend(im); } im.src = draft.logo; }catch(x){ toast(t('Could not read this image.')); } };
  $('#brCov').onchange = async e => { try{ draft.cover = await imgToData(e.target.files[0], 1400, 3); const c = $('.br-cover'); c.style.backgroundImage = `url(${draft.cover})`; c.querySelector('span') && c.querySelector('span').remove(); }catch(x){ toast(t('Could not read this image.')); } };
  const collect = () => { const f = $('#brF'), fd = new FormData(f), o = {}; ['name','tagline','about','city','area','hours','since','owner','phone','maps','team','ig','fb','suppliers','ownBrands'].forEach(k => o[k] = String(fd.get(k) || '').trim());
    o.makes = fd.getAll('mk'); o.services = fd.getAll('sv'); o.sections = fd.getAll('sc'); return {...o, logo: draft.logo, cover: draft.cover}; };
  $('#brPrev').onclick = () => { const d = collect(); openModal(`<div class="modal-head"><h3>👁 ${t('Preview')}</h3><button class="x" data-mclose>×</button></div><div class="modal-body">${storeHeader({...d, shop: d.name})}</div>`, true); };
  $('#brF').onsubmit = async e => { e.preventDefault(); if(ro()) return; const d = collect(), er = $('#brErr'); er.classList.add('hidden');
    if(!d.logo){ er.textContent = t('Please add your logo.'); er.classList.remove('hidden'); return; }
    if(d.about.length < 20){ er.textContent = t('Please write a few sentences about your shop.'); er.classList.remove('hidden'); return; }
    const doc = {...(b || {}), ...d, pid: p.id, status: 'pending', reply: '', updatedAt: Date.now(), createdAt: b.createdAt || Date.now()}; delete doc.id;
    try{ await Store.set('pbrand', 'pb_' + p.id, doc); toast(t('Sent for approval')); ptBrand(); }catch(x){ er.textContent = t('Could not save') + (x && x.message && /too large|payload/i.test(x.message) ? ' — ' + t('the images are too large') : ''); er.classList.remove('hidden'); } };
  if($('#brPL')) $('#brPL').onclick = () => ptPriceList();
  $('#brGoWeb').onclick = () => { PS.tab = 'web'; renderPartner(); };
  if($('#brShare')) $('#brShare').onclick = () => { const u = shopUrl(sh.slug), msg = `${d0(b.name || p.shop)}\n${u}`; if(navigator.share) navigator.share({title: b.name || p.shop, url: u}).catch(() => {}); else { navigator.clipboard && navigator.clipboard.writeText(msg); toast(t('Copied')); } };
}
const d0 = s => String(s || '');

/* ---- price list upload: part number, name, price (IQD), qty  →  my stock + website items (pending) ---- */
function ptPriceList(){
  if(ro()) return; const st = {raw: null, cols: null, items: []};
  pModal(`<h3>📄 ${t('Upload price list')}</h3><p class="sub">${t('Excel or CSV with a heading row: Part number, Name, Price (IQD), Qty. Or paste it from Excel. Every item is checked by Auto Engineer before it is shown.')}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><label class="btn red" style="cursor:pointer">📄 ${t('Choose Excel / CSV')}<input type="file" id="plF" accept=".xlsx,.xls,.csv,.txt" hidden></label><span class="mini" id="plFile" style="align-self:center"></span></div>
    <textarea id="plT" class="sel" rows="6" dir="ltr" style="width:100%;font-family:monospace" placeholder="PartNo\tName\tPrice\tQty\n04465-0K290\tBrake pads\t85000\t4"></textarea>
    <div class="grid2" style="margin-top:10px"><label>${t('Condition')}<select id="plC" class="sel">${Object.entries(PCOND).map(([k, v]) => `<option value="${k}">${t(v)}</option>`).join('')}</select></label><span></span></div>
    <div id="plCols"></div><div id="plR"></div>
    <div class="actions" style="margin-top:12px"><span style="flex:1"></span><button class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn" id="plChk">${t('Check list')}</button><button class="btn red hidden" id="plGo">${t('Send for approval')}</button></div>`, true);
  const parse = () => { const r = parseStockRows(st.raw || [], st.cols || null); st.items = r.items.filter(x => x.w > 0); st.noPrice = r.items.length - st.items.length; st.bad = r.bad; };
  const cols = () => { const c = st.cols; if(!c){ $('#plCols').innerHTML = st.raw && st.raw.length ? `<p class="err">${t('No heading row found. Add a first row with column names, e.g. PartNo, Name, Price, Qty.')}</p>` : ''; return; }
    const o = (k, lbl, none) => `<label class="mini" style="display:grid;gap:4px">${t(lbl)}<select class="sel" data-col="${k}">${none ? `<option value="-1" ${c[k] < 0 ? 'selected' : ''}>— ${t('none')} —</option>` : ''}${c.hdr.map((h, i) => `<option value="${i}" ${c[k] === i ? 'selected' : ''}>${esc(h || t('Column {n}', {n: i + 1}))}</option>`).join('')}</select></label>`;
    $('#plCols').innerHTML = `<div class="box" style="margin-top:10px"><h4 style="margin:0 0 8px">${t('Columns in your file')}</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">${o('pn', 'Part number')}${o('n', 'Name', 1)}${o('b', 'Brand', 1)}${o('w', 'Price (IQD)')}${o('q', 'Quantity')}</div></div>`; };
  const show = () => { $('#plR').innerHTML = st.items.length ? `<div class="box" style="margin-top:10px"><p>✅ ${t('{n} parts with a price', {n: st.items.length})}${st.items.some(x => !x.n) ? ` · <span class="err">${t('{n} without a name', {n: st.items.filter(x => !x.n).length})}</span>` : ''}</p>${st.noPrice ? `<p class="mini">${t('{n} lines without a price are skipped.', {n: st.noPrice})}</p>` : ''}
      <div class="tblwrap" style="max-height:220px;overflow:auto"><table class="tbl"><tbody>${st.items.slice(0, 50).map(x => `<tr><td class="ltr"><b>${esc(x.pn)}</b></td><td>${esc(x.n || '—')}</td><td class="num">${money(x.w)}</td><td class="num">${x.qty}</td></tr>`).join('')}</tbody></table></div></div>`
      : `<p class="err">${t('No parts with a price found. Check the Price column.')}</p>`; $('#plGo').classList.toggle('hidden', !st.items.length); };
  const check = () => { if(!st.fromFile){ st.raw = textRows($('#plT').value); st.cols = detectCols(st.raw); } parse(); cols(); show(); };
  $('#plT').oninput = () => { st.fromFile = false; $('#plGo').classList.add('hidden'); $('#plR').innerHTML = ''; };
  $('#plChk').onclick = check;
  $('#plCols').onchange = e => { const s = e.target.closest('[data-col]'); if(!s || !st.cols) return; st.cols[s.dataset.col] = +s.value; parse(); show(); };
  $('#plF').onchange = async e => { const f = e.target.files[0]; if(!f) return;
    try{ let rows; if(/\.(csv|txt)$/i.test(f.name) && !window.XLSX) rows = textRows(await f.text());
      else{ if(!window.XLSX){ toast(t('Excel reader still loading. Try again in a moment.')); return; } const wb = XLSX.read(await f.arrayBuffer()); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: '', raw: false}); }
      st.raw = rows; st.cols = detectCols(rows); st.fromFile = true; $('#plFile').textContent = f.name; parse(); cols(); show(); }catch(x){ toast(t('Could not read this file.')); } };
  $('#plGo').onclick = async () => { const b = $('#plGo'); b.disabled = true; const cond = $('#plC').value, now = Date.now(), pid = S.partner.id, docs = [];
    for(const x of st.items.slice(0, 3000)){ const sid = stockId(x.pn), cur = Store.get('pstock', sid) || {};
      const s = {...cur, pid, partNo: cur.partNo || x.pn, name: x.n || cur.name || x.pn, brand: x.b || cur.brand || '', qty: x.qty, price: Math.round(x.w), min: cur.min || 0, reorder: cur.reorder || 0, createdAt: cur.createdAt || now, updatedAt: now, lastMove: cur.lastMove || now}; delete s.id;
      const lid = 'pl_' + pid + '_' + pk2(x.pn), ol = Store.get('plistings', lid) || {};
      docs.push(['pstock', sid, s]);
      if(x.qty > 0) docs.push(['plistings', lid, {pid, shop: S.partner.shop, city: S.partner.city || '', stockId: sid, partNo: s.partNo, name: s.name, brand: s.brand || '', nameAr: cur.nameAr || '', nameKu: cur.nameKu || '', price: Math.round(x.w), qty: x.qty, cond: ol.cond || cond, note: ol.note || '', status: 'pending', createdAt: ol.createdAt || now, updatedAt: now}]); }
    try{ await bulkSet(docs, (a, n) => { b.textContent = t('Saving…') + ` ${a}/${n}`; }); closeModal(); toast(t('{n} items sent for approval', {n: docs.filter(d => d[0] === 'plistings').length})); PS.tab = 'web'; renderPartner(); }
    catch(x){ b.disabled = false; b.textContent = t('Send for approval'); toast(t('Could not save') + ': ' + (x.message || x)); } };
}
/* write many documents at once (live: batches of 200) */
async function bulkSet(docs, onP){
  if(S.mode === 'supabase'){ for(let i = 0; i < docs.length; i += 200){ const part = docs.slice(i, i + 200), {error} = await S.sb.from('docs').upsert(part.map(([col, id, data]) => ({col, id, data})));
      if(error) throw error; part.forEach(([col, id, data]) => { S.data[col] = {...(S.data[col] || {}), [id]: data}; }); onP && onP(Math.min(i + 200, docs.length), docs.length); }
    [...new Set(docs.map(d => d[0]))].forEach(c => Store.emit(c)); return; }
  let k = 0; for(const [col, id, data] of docs){ await Store.set(col, id, data); onP && onP(++k, docs.length); } }

/* ================= PUBLIC SHOP PAGE  #store/<slug> ================= */
function storeHeader(s){ const mk = s.makes || [], sv = s.services || [], sc = s.sections || [], ob = String(s.ownBrands || '').split(/[,،]+/).map(x => x.trim()).filter(Boolean);
  return `<div class="store-head"><div class="store-cover" style="${s.cover ? `background-image:url(${s.cover})` : ''}"></div>
    <div class="store-id">${s.logo ? `<img class="store-logo" src="${s.logo}" alt="">` : `<div class="store-logo ph">${esc((s.name || s.shop || '?').slice(0, 1))}</div>`}
      <div><h1>${esc(s.name || s.shop || '')}</h1>${s.tagline ? `<p class="store-tag">${esc(s.tagline)}</p>` : ''}
        <p class="store-meta"><b class="store-ver">✓ ${t('Verified partner of Auto Engineer')}</b>${s.city ? ' · 📍 ' + esc(s.city) + (s.area ? ', ' + esc(s.area) : '') : ''}${s.hours ? ' · 🕘 ' + esc(s.hours) : ''}${s.since ? ' · ' + t('Since {y}', {y: esc(s.since)}) : ''}</p></div></div>
    ${s.about ? `<p class="store-about">${esc(s.about)}</p>` : ''}
    ${sc.length ? `<div class="br-chips static" style="margin-bottom:8px">${sc.map(x => `<span class="chip">${esc(secName(x))}</span>`).join('')}</div>` : ''}
    ${ob.length ? `<p class="mini" style="margin:0 0 8px">🏷️ ${t('Brands')}: ${ob.map(x => `<b>${esc(x)}</b>`).join(' · ')}</p>` : ''}
    ${mk.length || sv.length ? `<div class="br-chips static">${mk.map(m => `<span class="chip">🚗 ${esc(m)}</span>`).join('')}${sv.map(k => `<span class="chip">✔ ${t(PSERV[k] || k)}</span>`).join('')}</div>` : ''}</div>`; }

async function renderStore(){
  const el = $('#storePage'); if(!el) return; const slug = S.storeSlug || ''; el.innerHTML = `<div class="inv-wait">${t('Loading…')}</div>`;
  await storeReady; let s = null;
  try{ if(S.mode === 'supabase'){ const {data} = await S.sb.from('docs').select('id,data').eq('col', 'pshop').eq('data->>slug', slug).limit(1); s = data && data[0] ? {...data[0].data, id: data[0].id} : null; }
    else s = Store.all('pshop').find(x => x.slug === slug && !x.hidden) || null; }catch(e){ s = null; }
  if(current !== 'store' || S.storeSlug !== slug) return;
  if(!s){ el.innerHTML = `<div class="panel inv-none"><h2>${t('Shop not found')}</h2><p>${t('This shop page is not available.')}</p><a class="btn red" href="#shop">${t('Browse parts')}</a></div>`; return; }
  const L = (await loadListings()).filter(l => l.pid === s.pid && (+l.qty || 0) > 0);
  el.innerHTML = `${storeHeader(s)}
    <div class="store-bar"><input type="search" id="stQ" placeholder="${esc(t('Search this shop: part number or name'))}"><span class="mini">${t('{n} parts', {n: L.length})}</span><button class="btn sm ghost" id="stShare">📤 ${t('Share')}</button></div>
    <div id="stGrid"></div><p class="mini" style="text-align:center;margin:18px 0">${t('You order through Auto Engineer: we confirm the part, the price and the delivery with you.')}</p>`;
  const CL = {genuine: 'New genuine', aftermarket: 'New aftermarket', used: 'Used'};
  const draw = () => { const q = ($('#stQ').value || '').trim().toLowerCase(), qk = q.replace(/[^a-z0-9]/g, ''); const inB = new Set(S.basket.map(b => b.listingId));
    const rows = L.filter(l => !q || (qk && pk2(l.partNo).toLowerCase().includes(qk)) || [l.name, l.nameAr, l.nameKu, l.note, l.brand].some(x => String(x || '').toLowerCase().includes(q))).slice(0, 300);
    $('#stGrid').innerHTML = rows.length ? `<div class="grid">${rows.map(l => `<article class="pcard plist"><div class="pbody"><span class="pno">${esc(l.partNo)}</span><span class="pname">${l.brand ? `<em class="pt-brand">${esc(l.brand)}</em> ` : ''}${esc((LANG === 'ar' && l.nameAr) || (LANG === 'ku' && l.nameKu) || l.name)}</span>
      <span class="pfit">${t(CL[l.cond] || '')}${l.note ? ' · ' + esc(l.note) : ''}</span><div class="prow"><span class="price">${money(l.price)}</span><button class="add ${inB.has(l.id) ? 'done' : ''}" data-ladd="${esc(l.id)}">${inB.has(l.id) ? '✓ ' + t('Added') : t('Add')}</button></div></div></article>`).join('')}</div>`
      : `<div class="empty">${t('No parts found')}</div>`; };
  draw(); $('#stQ').oninput = draw;
  $('#stGrid').onclick = e => { const b = e.target.closest('[data-ladd]'); if(!b) return; const l = L.find(x => x.id === b.dataset.ladd); const ex = S.basket.find(x => x.listingId === l.id);
    if(ex) ex.qty = Math.min(+l.qty || 1, ex.qty + 1); else S.basket.push({key: rid(6), partId: null, listingId: l.id, pid: l.pid, shop: l.shop, partNo: l.partNo, name: l.name, fit: '', qty: 1, price: +l.price, room: 'retail'});
    saveBasket(); b.classList.add('done'); b.textContent = '✓ ' + t('Added'); toast(t('Added: {x}', {x: l.name})); };
  $('#stShare').onclick = () => { const u = shopUrl(s.slug); if(navigator.share) navigator.share({title: s.name, url: u}).catch(() => {}); else { navigator.clipboard && navigator.clipboard.writeText(u); toast(t('Copied')); } };
  document.title = (s.name || 'Shop') + ' — Auto Engineer';
}

/* ================= STAFF: shop pages (approve / publish) ================= */
function adminPShops(){
  const list = Store.all('pbrand').sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || (b.updatedAt || 0) - (a.updatedAt || 0));
  $('#adminBody').innerHTML = `<p class="sub">${t('Shop pages your partners built. Nothing is public until you approve it; after a change the old version stays live until you approve again.')}</p>
    <div class="tblwrap"><table class="tbl"><thead><tr><th></th><th>${t('Shop')}</th><th>${t('City')}</th><th>${t('Updated')}</th><th>${t('Status')}</th><th></th></tr></thead><tbody>
    ${list.length ? list.map(b => { const sh = Store.get('pshop', 'sh_' + b.pid); return `<tr data-id="${esc(b.id)}" class="click"><td>${b.logo ? `<img src="${b.logo}" alt="" style="width:40px;height:40px;border-radius:10px;object-fit:cover">` : ''}</td><td><b>${esc(b.name || '')}</b><br><span class="mini">${esc((Store.get('partners', b.pid) || {}).shop || '')}</span></td><td>${esc(b.city || '')}</td><td class="mini">${dtStr(b.updatedAt)}</td>
      <td><span class="pst ${b.status === 'approved' ? 'received' : b.status === 'pending' ? 'new' : b.status === 'rejected' ? 'rejected' : ''}">${t(BRAND_ST[b.status] || b.status)}</span>${sh && !sh.hidden ? ` <span class="mini">🌐 ${t('live')}</span>` : ''}</td><td><button class="linkbtn">${t('Open')}</button></td></tr>`; }).join('')
      : `<tr><td colspan="6" class="empty">${t('No shop pages yet. Partners build them in their portal under "My shop page".')}</td></tr>`}</tbody></table></div>`;
  $('#adminBody').querySelector('tbody').onclick = e => { const tr = e.target.closest('tr[data-id]'); if(tr) brandReview(tr.dataset.id); };
}
function brandReview(id){
  const b = Store.get('pbrand', id); if(!b) return; const pt = Store.get('partners', b.pid) || {}, sh = Store.get('pshop', 'sh_' + b.pid);
  const priv = [['Owner / manager name', b.owner], ['Shop phone', b.phone], ['Google Maps link', b.maps], ['Team size', b.team], ['Instagram', b.ig], ['Facebook / TikTok', b.fb], ['Main suppliers and part brands you carry', b.suppliers]].filter(x => x[1]);
  const slug0 = (sh && sh.slug) || slugify(b.name || pt.shop) + '-' + String(b.pid).slice(-4).toLowerCase();
  openModal(`<div class="modal-head"><h3>🏪 ${esc(b.name || '')}</h3><button class="x" data-mclose>×</button></div><div class="modal-body">${storeHeader(b)}
    ${priv.length ? `<div class="box" style="margin-top:12px"><h4 style="margin:0 0 6px">🔒 ${t('Private details')}</h4><dl class="pt-dl">${priv.map(([k, v]) => `<dt>${t(k)}</dt><dd>${/^https?:/.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</dd>`).join('')}</dl></div>` : ''}
    <div class="grid2" style="margin-top:12px"><label>${t('Page address')}<div style="display:flex;align-items:center;gap:4px"><span class="mini ltr">/#store/</span><input id="brSlug" dir="ltr" value="${esc(slug0)}"></div></label><label>${t('Message to the shop (if changes are needed)')}<input id="brReply" value="${esc(b.reply || '')}"></label></div>
    <div class="actions" style="margin-top:14px">${sh && !sh.hidden ? `<a class="btn ghost" href="${shopUrl(sh.slug)}" target="_blank" rel="noopener">🌐 ${t('View live page')}</a><button class="btn ghost" id="brHide">${t('Unpublish')}</button>` : ''}<span style="flex:1"></span>
      <button class="btn ghost" id="brRej">${t('Ask for changes')}</button><button class="btn red" id="brOk">✓ ${t(sh ? 'Approve and update page' : 'Approve and publish')}</button></div></div>`, true);
  const notify = msg => { if(pt.phone) ptWaPrompt(pt.phone, msg); };
  $('#brOk').onclick = async () => { const slug = slugify($('#brSlug').value); if((await loadShops(true)).some(x => x.slug === slug && x.pid !== b.pid)){ toast(t('This page address is already used. Choose another.')); return; }
    const pub = {pid: b.pid, slug, name: b.name, tagline: b.tagline || '', about: b.about || '', city: b.city || '', area: b.area || '', hours: b.hours || '', since: b.since || '', makes: b.makes || [], services: b.services || [], sections: b.sections || [], ownBrands: b.ownBrands || '', logo: b.logo || '', cover: b.cover || '', hidden: false, publishedAt: Date.now()};
    try{ await Store.set('pshop', 'sh_' + b.pid, pub); const d = clone(b); delete d.id; d.status = 'approved'; d.reply = ''; d.reviewedAt = Date.now(); await Store.set('pbrand', id, d); shopCache = null;
      closeModal(); toast(t('Published')); notify(`${t('Auto Engineer')}: ${t('Your shop page is live')} — ${shopUrl(slug)}`); }catch(x){ toast(t('Could not save')); } };
  $('#brRej').onclick = async () => { const d = clone(b); delete d.id; d.status = 'rejected'; d.reply = $('#brReply').value.trim(); d.reviewedAt = Date.now();
    try{ await Store.set('pbrand', id, d); closeModal(); notify(`${t('Auto Engineer')}: ${t('Your shop page needs changes')}${d.reply ? ' — ' + d.reply : ''}`); }catch(x){ toast(t('Could not save')); } };
  if($('#brHide')) $('#brHide').onclick = async () => { const s = clone(sh); delete s.id; s.hidden = true; await Store.set('pshop', 'sh_' + b.pid, s); shopCache = null; closeModal(); toast(t('Page unpublished')); };
}
window.ptBrand = ptBrand; window.renderStore = renderStore; window.adminPShops = adminPShops; window.loadShops = loadShops; window.shopOf = shopOf; window.bulkSet = bulkSet;
