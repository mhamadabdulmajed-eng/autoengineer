/* Auto Engineer — FIND MY PART: for customers who don't know the part number.
   1) choose Toyota + year (VIN optional)  2) plain-word search in our own catalog
   3) not found → description + photos → arrives in Staff › Orders as a "Find my part" order. */
'use strict';

/* common parts in plain words (English / Arabic / Kurdish + everyday names) → our catalog */
const COMMON_PARTS = [
  {en:'Front brake pads', ar:'فحمات فرامل أمامية', ku:'پاتی برێکی پێشەوە', cat:'Brakes', kw:['brake pad','pad'], syn:['فحمات','فحمة','قماش','پات','پاتی برێک','brake']},
  {en:'Rear brake pads', ar:'فحمات فرامل خلفية', ku:'پاتی برێکی دواوە', cat:'Brakes', kw:['brake pad','rear pad','brake shoe'], syn:['فحمات خلفية','پاتی دواوە']},
  {en:'Brake discs', ar:'أقراص الفرامل (هوبات)', ku:'دیسکی برێک', cat:'Brakes', kw:['disc','rotor'], syn:['هوب','هوبات','ديسك','دیسک','rotor']},
  {en:'Oil filter', ar:'فلتر زيت', ku:'فلتەری زەیت', cat:'Filters', kw:['oil filter'], syn:['فلتر زيت','فلتەری زەیت','فلتر دهن']},
  {en:'Air filter', ar:'فلتر هواء', ku:'فلتەری هەوا', cat:'Filters', kw:['air filter','air cleaner'], syn:['فلتر هوا','فلتر هواء','فلتەری هەوا']},
  {en:'AC / cabin filter', ar:'فلتر مكيف', ku:'فلتەری سپلیت', cat:'Filters', kw:['cabin filter','a/c filter','air conditioner filter'], syn:['فلتر مكيف','فلتر سبلت','فلتەری سپلیت','cabin']},
  {en:'Fuel filter', ar:'فلتر بنزين / ديزل', ku:'فلتەری بەنزین', cat:'Filters', kw:['fuel filter'], syn:['فلتر بنزين','فلتر ديزل','فلتەری بەنزین','فلتەری گازوایل']},
  {en:'Spark plugs', ar:'بواجي', ku:'پلاک', cat:'Engine', kw:['spark plug','plug'], syn:['بواجي','بوجي','پلاک','بلاك']},
  {en:'Timing belt / chain', ar:'سير تايمن', ku:'قایشی تایمین', cat:'Engine', kw:['timing belt','timing chain'], syn:['تايمن','تایمین','قشاط']},
  {en:'Drive belt', ar:'سير المحرك', ku:'قایشی بزوێنەر', cat:'Engine', kw:['v-ribbed belt','drive belt','fan belt','belt'], syn:['سير','قشاط','قایش']},
  {en:'Engine oil', ar:'زيت محرك', ku:'زەیتی بزوێنەر', cat:'Oils & Fluids', kw:['engine oil','oil'], syn:['دهن','زيت','زەیت','ڕۆن']},
  {en:'Coolant', ar:'ماء رديتر', ku:'ئاوی ڕادیەیتەر', cat:'Oils & Fluids', kw:['coolant'], syn:['ماي رديتر','كولنت','ئاوی ڕادیەیتەر']},
  {en:'Radiator', ar:'رديتر', ku:'ڕادیەیتەر', cat:'Cooling', kw:['radiator'], syn:['رديتر','راديتر','ڕادیەیتەر']},
  {en:'Water pump', ar:'مضخة ماء (واتر بمب)', ku:'پەمپی ئاو', cat:'Cooling', kw:['water pump'], syn:['واتر بمب','ماطور ماي','پەمپی ئاو']},
  {en:'Battery', ar:'بطارية', ku:'پاتری', cat:'Electrical', kw:['battery'], syn:['بطارية','باتري','پاتری','باتری']},
  {en:'Alternator', ar:'داينمو', ku:'داینەمۆ', cat:'Electrical', kw:['alternator'], syn:['داينمو','دينمو','داینەمۆ']},
  {en:'Starter motor', ar:'سلف', ku:'سەلف', cat:'Electrical', kw:['starter'], syn:['سلف','سەلف']},
  {en:'Headlight', ar:'ضوء أمامي (فنر)', ku:'گڵۆپی پێشەوە', cat:'Lighting', kw:['headlamp','headlight'], syn:['فنر','فنر امامي','ضوء امامي','لايت','گڵۆپی پێشەوە','فەنەر']},
  {en:'Tail light', ar:'ضوء خلفي', ku:'گڵۆپی دواوە', cat:'Lighting', kw:['tail lamp','rear lamp','tail light'], syn:['فنر خلفي','ستوب','گڵۆپی دواوە']},
  {en:'Side mirror', ar:'مراية جانبية', ku:'ئاوێنەی تەنیشت', cat:'Body', kw:['mirror'], syn:['مراية','مرايه','ئاوێنە','مەرایە']},
  {en:'Front bumper', ar:'دعامية أمامية', ku:'دەعامیەی پێشەوە', cat:'Body', kw:['bumper'], syn:['دعامية','صدام','دەعامیە']},
  {en:'Wiper blades', ar:'مساحات', ku:'مەسحە', cat:'Body', kw:['wiper'], syn:['مساحات','مساحة','مەسحە']},
  {en:'Shock absorber', ar:'ممتص صدمات (دبل)', ku:'سەدمە', cat:'Suspension', kw:['shock absorber','absorber','strut'], syn:['دبل','دبلات','ممتص','سەدمە','ئەمۆرتیسەر']},
  {en:'Control arm', ar:'مقص', ku:'مقەس', cat:'Suspension', kw:['control arm','arm'], syn:['مقص','مقصات','مقەس']},
  {en:'Clutch kit', ar:'طقم كلتش', ku:'کلەچ', cat:'Transmission', kw:['clutch'], syn:['كلتش','كلج','کلەچ']}
];
const fpNorm = s => String(s||'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ').trim();
function commonPartOf(q){
  const n = fpNorm(q); if(n.length < 2) return null;
  let best=null, bestLen=0;
  for(const c of COMMON_PARTS){
    for(const w of [c.en,c.ar,c.ku,...c.syn,...c.kw].map(fpNorm)){
      if(w && (n.includes(w) || (w.includes(n) && n.length>=3)) && w.length>bestLen){best=c;bestLen=w.length}
    }
  }
  return best;
}
const cpName = c => (LANG==='ar'?c.ar:LANG==='ku'?c.ku:c.en);

/* VIN: 17 characters; the 10th character gives the model year */
const VIN_YEAR = 'ABCDEFGHJKLMNPRSTVWXY';
function vinInfo(v){
  const s = String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(s.length !== 17) return {ok:false, s};
  const c = s[9]; let y = null;
  if(/[1-9]/.test(c)) y = 2000 + Number(c);
  else { const i = VIN_YEAR.indexOf(c); if(i>=0){ y = 2010 + i; if(y > new Date().getFullYear()+1) y -= 30; } }
  return {ok:true, s, year:y, toyota:/^(JT|4T|5T|2T|MR|MH|NM|AH|SB|VN|JTE|JTM|JTN)/.test(s)};
}

/* search our own catalog for the chosen model/year */
function fpSearch(F){
  const cp = commonPartOf(F.q);
  const toks = fpNorm(F.q).split(' ').filter(w=>w.length>1);
  return Store.all('parts').filter(p=>{
    if(p.hidden || (p.make && !/toyota/i.test(p.make))) return false;
    if(F.model){ const pm = modelIdOf(p.model); if(pm!=='*' && pm!==F.model) return false; }
    if(F.year){ const y=+F.year; if(p.yearFrom && y<p.yearFrom) return false; if(p.yearTo && y>p.yearTo) return false; }
    const cat = F.cat || (cp && cp.cat);
    if(cat && p.category !== cat) return false;
    if(!F.q) return !!cat;
    const hay = fpNorm([p.partNo,p.name,p.nameAr,p.nameKu,p.desc,p.category,t(p.category||'')].join(' '));
    if(cp && cp.kw.some(k=>hay.includes(fpNorm(k)))) return true;
    const pn = String(p.partNo||'').toLowerCase().replace(/[^a-z0-9]/g,''), qn = String(F.q).toLowerCase().replace(/[^a-z0-9]/g,'');
    if(qn.length>3 && pn.includes(qn)) return true;
    return toks.length && toks.every(w=>hay.includes(w));
  }).slice(0,30);
}

let FP = null;
function openFindPart(preset){
  FP = Object.assign({step:1, model:S.f.model||'', year:S.f.year||'', vin:'', q:'', cat:'', photos:[], note:''}, preset||{});
  drawFindPart();
}
function fpHead(){
  const steps=['Your Toyota','What you need','Send to our team'];
  return `<div class="modal-head fp-head"><div><span class="eyebrow">${t('Find my part')}</span><h3>${t('No part number? No problem.')}</h3>
    <div class="fp-steps">${steps.map((s,i)=>`<span class="${FP.step===i+1?'on':FP.step>i+1?'done':''}"><b>${i+1}</b>${t(s)}</span>`).join('')}</div></div><button class="x" data-mclose>×</button></div>`;
}
function drawFindPart(){
  const M = window.TOYOTA_MODELS||[], m = modelById(FP.model);
  let body='';
  if(FP.step===1){
    const years=[];for(let y=new Date().getFullYear()+1;y>=1990;y--)years.push(y);
    const vi = vinInfo(FP.vin);
    body=`<p class="fp-lead">${t('Choose your Toyota. If you have the chassis number (VIN), add it and we can be 100% sure the part fits.')}</p>
    <div class="fp-models">${M.map(x=>`<button class="fp-model ${FP.model===x.id?'on':''}" data-fm="${x.id}">${modelArt(x,{cls:'fp-art'})}<span>${esc(x.name)}</span></button>`).join('')}</div>
    <div class="row2" style="margin-top:16px"><div class="f"><label>${t('Year')}</label><select id="fpYear"><option value="">${t('Not sure')}</option>${years.map(y=>`<option ${String(FP.year)===String(y)?'selected':''}>${y}</option>`).join('')}</select></div>
      <div class="f"><label>${t('Chassis number (VIN)')} <i>(${t('optional')})</i></label><input id="fpVin" dir="ltr" maxlength="20" placeholder="JTEBR3FJ…" value="${esc(FP.vin)}" style="text-transform:uppercase;letter-spacing:.06em">
      <small class="mini" id="fpVinMsg">${FP.vin?(vi.ok?'✓ '+t('Valid VIN')+(vi.year?' · '+vi.year:''):t('A VIN has 17 letters and numbers')):t('Find it on your car registration card or at the bottom of the windscreen.')}</small></div></div>
    <div class="fp-nav"><span></span><button class="btn red" id="fpNext" ${FP.model?'':'disabled'}>${t('Next')} →</button></div>`;
  } else if(FP.step===2){
    const cp = commonPartOf(FP.q), res = fpSearch(FP);
    const cat = FP.cat || (cp&&cp.cat) || '';
    const chips = COMMON_PARTS.filter(c=>!cat || c.cat===cat);
    body=`<div class="fp-car">${m?modelArt(m,{cls:'fp-car-art'}):''}<div><b>Toyota ${esc(m?m.name:'')}</b>${FP.year?` · ${FP.year}`:''}${FP.vin?` · <span class="ltr mini">${esc(FP.vin.toUpperCase())}</span>`:''}<br><button class="linkbtn" id="fpChange">${t('Change car')}</button></div></div>
    <div class="searchbar fp-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="fpQ" placeholder="${esc(t('Write the part in your own words, e.g. front brake pads, فحمات, پاتی برێک'))}" value="${esc(FP.q)}" autocomplete="off"></div>
    <div class="fp-cats"><button class="chip ${!FP.cat?'on':''}" data-fc="">${t('All')}</button>${CATS.map(([c])=>`<button class="chip ${FP.cat===c?'on':''}" data-fc="${esc(c)}">${icon(c,1.8)}${t(c)}</button>`).join('')}</div>
    <div class="fp-common">${chips.map(c=>`<button class="fp-cp ${cp===c?'on':''}" data-cp="${esc(c.en)}">${esc(cpName(c))}</button>`).join('')}</div>
    <div id="fpRes">${fpResults(res,cp)}</div>
    <div class="fp-nav"><button class="btn ghost" id="fpBack">← ${t('Back')}</button><button class="btn" id="fpAsk">${t('Not sure? Ask our team')} →</button></div>`;
  } else {
    const ws=S.ws, last=ls('ae:me')||{}, pre=ws?{name:ws.name,phone:ws.phone,location:ws.location}:last;
    const cp=commonPartOf(FP.q);
    body=`<div class="fp-car">${m?modelArt(m,{cls:'fp-car-art'}):''}<div><b>Toyota ${esc(m?m.name:'')}</b>${FP.year?` · ${FP.year}`:''}${FP.vin?` · <span class="ltr mini">${esc(FP.vin.toUpperCase())}</span>`:''}</div></div>
    <p class="fp-lead">${t('Tell us what you need and add photos if you can. Our Toyota parts team finds the exact part number and sends you the price.')}</p>
    <form id="fpForm"><div class="f"><label>${t('What do you need?')}</label><textarea name="need" required placeholder="${esc(t('e.g. front left headlight, the glass is broken'))}">${esc(FP.note || (cp?cpName(cp):FP.q))}</textarea></div>
      <div class="f"><label>${t('Photos')} <i>(${t('up to 3, of the part or the damaged area')})</i></label><label class="fp-drop"><input type="file" accept="image/*" multiple id="fpPh" hidden><span>📷 ${t('Add photos')}</span></label><div class="thumbs" id="fpThumbs">${FP.photos.map(s=>`<img src="${s}">`).join('')}</div></div>
      <div class="row3"><div class="f"><label>${t('Name')}</label><input name="name" required value="${esc(pre.name||'')}"></div><div class="f"><label>${t('Phone / WhatsApp')}</label><input name="phone" type="tel" required dir="ltr" value="${esc(pre.phone||'')}"></div><div class="f"><label>${t('Location')}</label><input name="location" list="cities" required value="${esc(pre.location||'')}"></div></div>
      <div class="err hidden" id="fpErr"></div>
      <div class="fp-nav"><button type="button" class="btn ghost" id="fpBack">← ${t('Back')}</button><button class="btn red" id="fpSend">${t('Send to our team')}</button></div></form>${citiesList()}`;
  }
  openModal(fpHead()+`<div class="modal-body fp-body">${body}</div>`, true);
  bindFindPart();
}
function fpResults(res,cp){
  if(!FP.q && !FP.cat) return `<p class="mini fp-hint">${t('Type the part, or tap a system or a common part above.')}</p>`;
  if(!res.length) return `<div class="fp-none"><b>${t('We couldn’t find it in the online catalog yet.')}</b><p>${t('No problem: send it to our team with a photo and we’ll find the exact part for your car.')}</p><button class="btn red" id="fpAsk2">${t('Ask our team')} →</button></div>`;
  const inB=new Set(S.basket.map(b=>b.partId));
  return `<p class="mini" style="margin:4px 0 8px">${t('{n} parts fit your Toyota',{n:res.length})}</p><div class="fp-list">${res.map(p=>{const pr=priceFor(p,'retail');return `<div class="fp-item"><div class="fp-ico">${p.image?`<img src="${esc(p.image)}" alt="">`:icon(p.category,1.4)}</div><div class="fp-txt"><b>${esc(pName(p))}</b><small><span class="ltr">${esc(p.partNo)}</span> · ${esc(fitText(p))}</small></div><div class="fp-pr">${pr!==null?money(pr):`<small>${t('Price on request')}</small>`}</div><button class="add ${inB.has(p.id)?'done':''}" data-fadd="${esc(p.id)}">${inB.has(p.id)?'✓ '+t('Added'):t('Add')}</button></div>`}).join('')}</div>
   <p class="mini" style="margin-top:10px">${t('Not the right one?')} <button class="linkbtn" id="fpAsk3">${t('Ask our team')}</button></p>`;
}
function bindFindPart(){
  const box=$('#modalBox');
  box.onclick=e=>{
    const el=e.target.closest('button');if(!el)return;
    if(el.dataset.fm){FP.model=el.dataset.fm;$$('.fp-model').forEach(b=>b.classList.toggle('on',b===el));$('#fpNext').disabled=false;return}
    if(el.id==='fpNext'){FP.year=$('#fpYear').value;FP.vin=$('#fpVin').value.trim();FP.step=2;drawFindPart();setTimeout(()=>$('#fpQ')&&$('#fpQ').focus(),50);return}
    if(el.id==='fpChange'||(el.id==='fpBack'&&FP.step===2)){FP.step=1;drawFindPart();return}
    if(el.id==='fpBack'&&FP.step===3){FP.step=2;drawFindPart();return}
    if(['fpAsk','fpAsk2','fpAsk3'].includes(el.id)){FP.step=3;drawFindPart();return}
    if(el.dataset.fc!==undefined){FP.cat=el.dataset.fc;drawFindPart();return}
    if(el.dataset.cp){const c=COMMON_PARTS.find(x=>x.en===el.dataset.cp);FP.q=cpName(c);FP.cat=c.cat;drawFindPart();return}
    if(el.dataset.fadd){const p=Store.get('parts',el.dataset.fadd);if(p){addToBasket(p);el.classList.add('done');el.textContent='✓ '+t('Added')}return}
  };
  const v=$('#fpVin');
  if(v)v.oninput=()=>{const vi=vinInfo(v.value);FP.vin=v.value.trim();$('#fpVinMsg').textContent=!v.value?t('Find it on your car registration card or at the bottom of the windscreen.'):vi.ok?('✓ '+t('Valid VIN')+(vi.year?' · '+vi.year:'')):t('A VIN has 17 letters and numbers');if(vi.ok&&vi.year&&$('#fpYear')){$('#fpYear').value=String(vi.year);FP.year=String(vi.year)}};
  const q=$('#fpQ');
  if(q)q.oninput=()=>{FP.q=q.value;const cp=commonPartOf(FP.q);$('#fpRes').innerHTML=fpResults(fpSearch(FP),cp);$$('.fp-cp').forEach(b=>b.classList.toggle('on',!!cp&&b.dataset.cp===cp.en))};
  const ph=$('#fpPh');
  if(ph)ph.onchange=async e=>{for(const f of [...e.target.files].slice(0,3-FP.photos.length)){try{FP.photos.push(await compressImg(f,1000,.65))}catch(_){}}$('#fpThumbs').innerHTML=FP.photos.map(s=>`<img src="${s}">`).join('');e.target.value=''};
  const fm=$('#fpForm');
  if(fm){fm.need.oninput=()=>FP.note=fm.need.value;fm.onsubmit=sendFindPart}
}
async function sendFindPart(e){
  e.preventDefault();const f=e.target,fd=Object.fromEntries(new FormData(f)),k=phoneKey(fd.phone);
  if(k.length<8){const er=$('#fpErr');er.textContent=t('Please enter a valid phone number');er.classList.remove('hidden');return}
  if(!S.canWrite){toast(t('Ordering is not available in this view.'));return}
  const btn=$('#fpSend');btn.disabled=true;btn.textContent=t('Sending…');
  const m=modelById(FP.model),vi=vinInfo(FP.vin),d=new Date();
  const no='AE-'+String(d.getFullYear()).slice(2)+pad(d.getMonth()+1,2)+pad(d.getDate(),2)+'-'+rid(4);
  const fit='Toyota '+(m?m.name:'')+(FP.year?' '+FP.year:'');
  const order={no,room:'retail',status:'new',kind:'find',lang:LANG,fulfil:'delivery',branch:'',
    customer:{name:fd.name.trim(),phone:fd.phone.trim(),phoneKey:k,location:fd.location.trim(),company:''},
    comment:fd.need.trim(),find:{model:FP.model,modelName:m?m.name:'',year:FP.year||'',vin:vi.ok?vi.s:(FP.vin||'').toUpperCase(),photos:FP.photos,need:fd.need.trim()},
    lines:[{partId:null,partNo:'',name:fd.need.trim().slice(0,120),fit,qty:1,price:null,listPrice:null,avail:'',custom:true}],
    discountType:'pct',discount:0,delivery:0,notes:'',payments:[],credits:[],createdAt:Date.now(),updatedAt:Date.now(),log:[{at:Date.now(),s:'new'}]};
  try{await Store.set('orders',no,order);await API.upsertCustomer(order).catch(()=>{});
    ls('ae:me',{name:fd.name,phone:fd.phone,location:fd.location});S.lastOrder={no,phone:fd.phone};
    openModal(mHead('')+`<div class="modal-body"><div class="success"><div class="tick">✓</div><h3 style="font-family:var(--display);font-size:26px">${t('Sent to our parts team')}</h3><p style="color:var(--muted)">${t('Your request number')}</p><code class="ltr">${esc(no)}</code>
      <p style="color:var(--muted);line-height:1.6;margin:8px 0 18px">${t('We’ll find the exact part for your Toyota and contact you on {p} with the part number and price.',{p:'<b class="ltr">'+esc(fd.phone)+'</b>'})}</p><a class="btn block" href="#track" id="fpTrack">${t('Track this request')}</a></div></div>`);
    $('#fpTrack').onclick=closeAll;FP=null;
  }catch(err){btn.disabled=false;btn.textContent=t('Try again')}
}

/* staff view: what the customer sent */
function findInfoHtml(o){
  if(o.kind!=='find'||!o.find)return '';const f=o.find;
  return `<div class="fp-staff"><div class="fp-staff-h"><span class="fp-badge">${t('FIND MY PART')}</span><b>Toyota ${esc(f.modelName||'')}</b>${f.year?' · '+esc(f.year):''}${f.vin?` · VIN <b class="ltr">${esc(f.vin)}</b> <button type="button" class="linkbtn" data-copy="${esc(f.vin)}">${t('Copy')}</button>`:''}</div>
    <p style="margin:6px 0">${esc(f.need||'')}</p>${(f.photos||[]).length?`<div class="thumbs">${f.photos.map((p,i)=>`<img src="${p}" data-zoom="${i}" style="cursor:zoom-in;width:110px;height:110px">`).join('')}</div>`:''}
    <p class="mini" style="margin-top:8px">${t('Look it up in the EPC, then replace the request line with the right part: use “Add from catalog…” or type the part number and price. Then send the quotation.')}</p></div>`;
}
document.addEventListener('click',e=>{
  const z=e.target.closest('[data-zoom]');if(z){const w=document.createElement('div');w.className='fp-zoom';w.innerHTML=`<img src="${z.src}">`;w.onclick=()=>w.remove();document.body.appendChild(w);return}
  const c=e.target.closest('[data-copy]');if(c){try{navigator.clipboard.writeText(c.dataset.copy);toast(t('Copied'))}catch(_){}}
});
