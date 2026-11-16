/* Auto Engineer — application */
'use strict';

/* ================= UTILITIES ================= */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rid=(n=4)=>Math.random().toString(36).slice(2,2+n).toUpperCase().padEnd(n,'X');
const clone=o=>JSON.parse(JSON.stringify(o??{}));
const pad=(n,l=4)=>String(n).padStart(l,'0');
const nz=v=>v!==null&&v!==undefined&&v!=='';
function phoneKey(p){let d=String(p||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.startsWith('0')&&d.length===11)d='964'+d.slice(1);if(d.length===10&&d.startsWith('7'))d='964'+d;return d}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),3000)}
function ls(k,v){try{if(v===undefined){const x=localStorage.getItem(k);return x?JSON.parse(x):null}localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}

/* ================= LANGUAGE ================= */
const LANGS={en:{name:'English',native:'English',dir:'ltr',short:'EN'},ar:{name:'Arabic',native:'العربية',dir:'rtl',short:'ع'},ku:{name:'Kurdish',native:'کوردی',dir:'rtl',short:'کو'}};
let LANG=ls('ae:lang')||null;
function t(s,vars,lang){const L=lang||LANG||'en';let out=(L!=='en'&&window.I18N&&I18N[L]&&I18N[L][s])||s;if(vars)out=out.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m);return out}
function setLang(l){LANG=l;ls('ae:lang',l);document.documentElement.lang=l==='ku'?'ckb':l;document.documentElement.dir=LANGS[l].dir;buildChrome();buildHome();renderCurrent();}
const isRTL=()=>LANGS[LANG||'en'].dir==='rtl';
const locale=l=>({en:'en-GB',ar:'ar-IQ-u-nu-latn',ku:'ckb-IQ-u-nu-latn'})[l||LANG||'en'];
const dateStr=(ts,l)=>ts?new Date(ts).toLocaleDateString(locale(l),{day:'2-digit',month:'short',year:'numeric'}):'';
const dtStr=(ts,l)=>ts?new Date(ts).toLocaleString(locale(l),{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';

/* ================= CONSTANTS ================= */
const CATS=[['Engine','Gaskets, belts, pistons'],['Brakes','Pads, discs, calipers'],['Suspension','Shocks, arms, bushings'],['Filters','Oil, air, fuel, cabin'],['Electrical','Sensors, starters, alternators'],['Cooling','Radiators, pumps, fans'],['Transmission','Clutch, mounts, CV joints'],['Body','Bumpers, mirrors, panels'],['Lighting','Headlamps, bulbs, tail lamps'],['Oils & Fluids','Engine oil, ATF, coolant']];
const CAT_ICON={'Engine':'<path d="M4 10h3l2-3h6l2 3h3v7h-3l-2 2H9l-2-2H4z"/><path d="M9 7V4h6v3"/>','Brakes':'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M17 5a9 9 0 0 1 3 6"/>','Suspension':'<path d="M12 2v3M12 19v3"/><path d="M8 5h8M8 19h8"/><path d="M9 7l6 2-6 2 6 2-6 2 6 2"/>','Filters':'<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4v16M12 4v16M15 4v16"/>','Electrical':'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>','Cooling':'<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 2-6 4-6s1 4-4 6zM14 12c4 0 6 2 6 4s-4 1-6-4zM12 14c0 4-2 6-4 6s-1-4 4-6zM10 12c-4 0-6-2-6-4s4-1 6 4z"/>','Transmission':'<circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v8M12 8v8M18 8v4H6"/>','Body':'<path d="M3 15l2-6h14l2 6v3H3z"/><path d="M7 9l2-4h6l2 4"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>','Lighting':'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>','Oils & Fluids':'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'};
const icon=(c,sw=1.6)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON[c]||CAT_ICON['Engine']}</svg>`;
const CITIES=['Erbil','Sulaymaniyah','Duhok','Kirkuk','Halabja','Zakho','Soran','Ranya','Koya','Baghdad','Mosul','Basra','Najaf','Karbala','Hillah','Ramadi','Tikrit','Baqubah','Nasiriyah','Diwaniyah'];
const STATUS_FLOW=['new','quoted','accepted','confirmed','delivered'];
const STATUS_LABEL={new:'New',quoted:'Quoted',accepted:'Accepted',confirmed:'Invoiced',delivered:'Delivered',cancelled:'Cancelled'};
const stl=s=>t(STATUS_LABEL[s]||s);
const CONDS=['Genuine','Aftermarket','Used'];
const STOCKS=['In stock','On order','Ask','Out of stock'];
const PAY_METHODS=['Cash','Bank transfer','FIB','ZainCash','Card','Other'];
const ROLES={admin:'Admin',manager:'Manager',sales:'Sales'};
const PERMS={admin:['orders','customers','parts','sell','wholesalers','staff','settings','delete'],manager:['orders','customers','parts','sell','wholesalers','delete'],sales:['orders','customers','sell']};
const DEFAULT_SETTINGS={company:'Auto Engineer',tagline:'Toyota Spare Parts',phone:'',whatsapp:'',email:'',address:'',currency:'IQD',quoteValidity:7,invoiceNote:'Thank you for your business.',quoteNote:'Prices are valid for the period shown. Availability is confirmed at the time of order.',branches:[],logo:''};

/* sample data — only used in local preview (no database) */
const SAMPLE_PARTS=[
 {partNo:'04465-0K290',name:'Front Brake Pad Set',brand:'Toyota Genuine',make:'Toyota',model:'Hilux',yearFrom:2016,yearTo:2024,category:'Brakes',condition:'Genuine',retailPrice:65000,wholesalePrice:55000,stock:'In stock'},
 {partNo:'90915-YZZE1',name:'Oil Filter',brand:'Toyota Genuine',make:'Toyota',model:'Camry',yearFrom:2012,yearTo:2024,category:'Filters',condition:'Genuine',retailPrice:9000,wholesalePrice:7000,stock:'In stock'},
 {partNo:'48510-0K330',name:'Front Shock Absorber',brand:'KYB',make:'Toyota',model:'Hilux',yearFrom:2016,yearTo:2024,category:'Suspension',condition:'Aftermarket',retailPrice:85000,wholesalePrice:72000,stock:'On order'},
 {partNo:'16100-39456',name:'Water Pump Assembly',brand:'Aisin',make:'Toyota',model:'Corolla',yearFrom:2014,yearTo:2019,category:'Cooling',condition:'Aftermarket',retailPrice:null,wholesalePrice:null,stock:'Ask'},
 {partNo:'08880-83716',name:'Engine Oil 5W-30 (4L)',brand:'Toyota Genuine',make:'Toyota',model:'All models',yearFrom:null,yearTo:null,category:'Oils & Fluids',condition:'Genuine',retailPrice:38000,wholesalePrice:32000,stock:'In stock'},
 {partNo:'52119-06989',name:'Front Bumper Cover',brand:'Used OEM',make:'Toyota',model:'Camry',yearFrom:2018,yearTo:2020,category:'Body',condition:'Used',retailPrice:150000,wholesalePrice:130000,stock:'In stock'}];

/* ================= STATE ================= */
const COLS=['parts','orders','customers','wholesalers','sellRequests','config','staff'];
const S={mode:'local',db:null,sb:null,user:null,admin:false,role:null,staff:null,me:null,canWrite:true,ready:false,
  data:Object.fromEntries(COLS.map(c=>[c,{}])),loaded:{},
  basket:ls('ae:basket')||[],q:'',f:{cat:'',make:'',model:'',year:'',cond:''},ws:null,wsPrices:{},adminTab:'orders',downloads:null,seenOrders:null,alerts:0};
const settings=()=>({...DEFAULT_SETTINGS,...(S.data.config.settings||{})});
const branches=()=>(settings().branches||[]).filter(b=>b&&b.name);
const can=p=>S.admin&&(PERMS[S.role||'admin']||[]).includes(p);

/* ================= DATA BACKENDS =================
   supabase: live site (autoengineer.iq)   claude: hosted on Claude   local: this browser only */
const Store={
  listeners:new Set(),
  emit(col){this.listeners.forEach(f=>f(col))},
  all(col){return Object.entries(S.data[col]||{}).map(([id,d])=>({...d,id}))},
  get(col,id){const d=(S.data[col]||{})[id];return d?{...d,id}:null},
  async set(col,id,data){const c=clone(data);delete c.id;S.data[col]={...S.data[col],[id]:c};this.emit(col);
    try{
      if(S.mode==='claude')await S.db.doc(col+'/'+id).set(c);
      else if(S.mode==='supabase'){const q=S.admin?S.sb.from('docs').upsert({col,id,data:c}):S.sb.from('docs').insert({col,id,data:c});const {error}=await q;if(error)throw error}
      else ls('ae:data:'+col,S.data[col]);
    }catch(e){handleWriteErr(e);throw e}},
  async del(col,id){const n={...S.data[col]};delete n[id];S.data[col]=n;this.emit(col);
    try{if(S.mode==='claude')await S.db.doc(col+'/'+id).delete();else if(S.mode==='supabase'){const {error}=await S.sb.from('docs').delete().match({col,id});if(error)throw error}else ls('ae:data:'+col,S.data[col])}catch(e){handleWriteErr(e);throw e}}
};
function handleWriteErr(e){const c=e&&(e.code||'');if(c==='invalid_argument'||c==='42501'){S.canWrite=S.admin;toast(t('You don’t have permission to save here.'))}else if(c==='quota_exceeded')toast(t('Storage is full. Delete old records.'));else toast(t('Could not save. Please try again.'))}

/* server-side helpers (run in the database on the live site, emulated otherwise) */
const API={
  async track(no,pk){if(S.mode==='supabase'){const {data}=await S.sb.rpc('track_order',{p_no:no,p_phone:pk});return data}
    const o=Store.get('orders',no);return o&&o.customer?.phoneKey===pk?o:null},
  async accept(no,pk){if(S.mode==='supabase'){const {error}=await S.sb.rpc('accept_quote',{p_no:no,p_phone:pk});if(error)throw error;return}
    const o=clone(Store.get('orders',no));o.status='accepted';o.updatedAt=Date.now();o.log=[...(o.log||[]),{at:Date.now(),s:'accepted'}];await Store.set('orders',no,o)},
  async wsLogin(pk,pin){if(S.mode==='supabase'){const {data}=await S.sb.rpc('ws_login',{p_phone:pk,p_pin:String(pin)});return data}
    const w=Store.get('wholesalers','w_'+pk);if(!w)return {error:'notfound'};if(w.status!=='approved')return {error:w.status};if(String(w.pin||'')!==String(pin))return {error:'pin'};
    const prices={};Store.all('parts').forEach(p=>{if(nz(p.wholesalePrice))prices[p.id]=Number(p.wholesalePrice)});return {profile:w,prices}},
  async nextNo(kind){const y=new Date().getFullYear();const pre={quote:'Q-',invoice:'INV-',credit:'CN-'}[kind];
    if(S.mode==='supabase'){const {data,error}=await S.sb.rpc('next_no',{p_kind:kind});if(error)throw error;return pre+y+'-'+pad(data)}
    const c=clone(S.data.config.counters||{});if(c.year!==y){c.year=y;c.quote=0;c.invoice=0;c.credit=0}c[kind]=(c[kind]||0)+1;await Store.set('config','counters',c);return pre+y+'-'+pad(c[kind])},
  async upsertCustomer(order){ if(S.mode==='supabase'&&!S.admin)return; // done by a database trigger on the live site
    const k=order.customer.phoneKey,ck='c_'+k,c=Store.get('customers',ck)||{};
    await Store.set('customers',ck,{...c,name:order.customer.name,phone:order.customer.phone,phoneKey:k,location:order.customer.location,type:order.room==='wholesale'?'wholesale':(c.type||'retail'),company:order.customer.company||c.company||'',lang:order.lang||c.lang||'en',firstAt:c.firstAt||Date.now(),lastAt:Date.now(),notes:c.notes||''})}
};

async function initStore(){
  const cfg=window.AE_CONFIG||{};
  if(cfg.supabaseUrl&&cfg.supabaseKey){await initSupabase(cfg);return}
  let db=null,user=null,dl=null;
  try{if(window.claude&&typeof claude.use==='function'){[db,user,dl]=await Promise.all([claude.use('db'),claude.use('user'),claude.use('downloads')])}}catch(e){}
  S.downloads=dl;S.user=user;
  if(db){
    S.mode='claude';S.db=db;
    let owner=false,editor=false;try{owner=!!(user&&await user.isOwner());editor=!!(user&&await user.canEdit())}catch(e){}
    try{const me=user&&await user.me();S.me=me&&me.email?String(me.email).toLowerCase():null}catch(e){}
    try{const cw=user?await user.can('data.write'):null;if(cw===false)S.canWrite=false}catch(e){}
    S.admin=owner||editor;S.role=owner?'admin':'manager';
    const timer=setTimeout(()=>{if(!S.loaded.parts)toast(t('Still connecting…'))},10000);
    COLS.forEach(col=>{db.collection(col).onSnapshot(snap=>{const o={};snap.docs.forEach(d=>{o[d.id]=d.data()});S.data[col]=o;
      if(!snap.metadata.fromCache||Object.keys(o).length){S.loaded[col]=true;if(col==='parts')clearTimeout(timer)}
      if(col==='staff')applyStaffRole(owner);Store.emit(col)},()=>{S.loaded[col]=true;Store.emit(col)})});
  }else{
    S.mode='local';S.admin=true;S.role='admin';
    COLS.forEach(c=>{S.data[c]=ls('ae:data:'+c)||{};S.loaded[c]=true});
    if(!Object.keys(S.data.parts).length&&!ls('ae:seeded')){SAMPLE_PARTS.forEach(p=>{S.data.parts[partId(p.partNo)]={...p,createdAt:Date.now()}});ls('ae:data:parts',S.data.parts);ls('ae:seeded',true)}
    const b=$('#modeBanner');b.textContent=t('Preview mode: data is saved in this browser only');b.classList.remove('hidden');setTimeout(()=>b.classList.add('hidden'),7000);
  }
  S.ready=true;restoreWs();renderCurrent();
}
function applyStaffRole(owner){if(owner||!S.me){return}const st=Store.get('staff',S.me);if(st&&st.active!==false){S.role=st.role||'sales';S.staff=st}}

async function initSupabase(cfg){
  S.mode='supabase';S.canWrite=true;
  try{await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')}catch(e){toast(t('Could not connect. Check your internet connection.'));return}
  S.sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const {data:{session}}=await S.sb.auth.getSession();S.session=session;
  S.sb.auth.onAuthStateChange(async(ev,s)=>{if(ev==='TOKEN_REFRESHED'||ev==='INITIAL_SESSION')return;S.session=s;await sbLoadAll();renderCurrent()});
  await sbLoadAll();S.ready=true;restoreWs();renderCurrent();
}
async function sbFetchAll(table,filter){let out=[],from=0;for(;;){let q=S.sb.from(table).select('col,id,data').range(from,from+999);if(filter)q=filter(q);const {data,error}=await q;if(error)throw error;out=out.concat(data);if(data.length<1000)break;from+=1000}return out}
async function sbLoadAll(){
  S.admin=false;S.role=null;S.staff=null;
  if(S.session){const {data}=await S.sb.rpc('my_staff');if(data&&data.active!==false){S.admin=true;S.role=data.role||'sales';S.staff=data;S.me=S.session.user.email}}
  COLS.forEach(c=>S.data[c]={});
  try{
    const rows=S.admin?await sbFetchAll('docs'):[...await sbFetchAll('public_parts'),...await sbFetchAll('docs',q=>q.eq('col','config').eq('id','settings'))];
    rows.forEach(r=>{(S.data[r.col]=S.data[r.col]||{})[r.id]=r.data});
  }catch(e){toast(t('Could not load data.'))}
  COLS.forEach(c=>S.loaded[c]=true);
  if(S.channel){S.sb.removeChannel(S.channel);S.channel=null}
  if(S.admin){S.channel=S.sb.channel('docs').on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{const r=p.new&&p.new.col?p.new:p.old;if(!r||!r.col)return;
      const m={...(S.data[r.col]||{})};if(p.eventType==='DELETE')delete m[r.id];else m[r.id]=p.new.data;S.data[r.col]=m;Store.emit(r.col)}).subscribe()}
  Store.emit('all');
}
const partId=no=>'p_'+String(no||rid(8)).toUpperCase().replace(/[^A-Z0-9_.-]/g,'_').slice(0,80);
let rq=0;Store.listeners.add(c=>{if(c==='orders')checkAlerts();if(c==='config')applyLogo();cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>renderCurrent(true))});

/* ================= MONEY ================= */
function money(v,l){if(!nz(v))return '';const cur=settings().currency;const n=Number(v);
  if(cur==='USD')return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return n.toLocaleString('en-US',{maximumFractionDigits:0})+' '+t('IQD',null,l)}
function totals(o){const lines=o.lines||[];const sub=lines.reduce((s,l)=>s+(l.avail==='unavailable'?0:(Number(l.price)||0)*(Number(l.qty)||0)),0);
  const disc=o.discountType==='amt'?(Number(o.discount)||0):sub*(Number(o.discount)||0)/100;const del=Number(o.delivery)||0;const total=Math.max(0,sub-disc+del);
  const credit=(o.credits||[]).reduce((s,c)=>s+(Number(c.amount)||0),0);const paid=(o.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0);const net=Math.max(0,total-credit);
  return {sub,disc,del,total,credit,net,paid,balance:net-paid}}
function payState(o){if(!['confirmed','delivered'].includes(o.status))return null;const t_=totals(o);if(t_.net<=0&&t_.paid<=0)return 'paid';if(t_.balance<=0.0001)return 'paid';return t_.paid>0?'partial':'unpaid'}
function priceFor(p,room){if(room==='wholesale'){const w=S.wsPrices[p.id]??p.wholesalePrice;if(nz(w))return Number(w)}return nz(p.retailPrice)?Number(p.retailPrice):null}
const availLabel=(a,l)=>t(({available:'In stock',order:'On order (2–5 days)',unavailable:'Not available','':'To confirm'})[a||'']||a,null,l);

/* ================= ROUTER ================= */
const VIEWS=['home','shop','wholesale','sell','track','admin','terms'];
let current='home';
function route(){let v=(location.hash||'#home').slice(1);if(v==='find'){history.replaceState(null,'','#shop');v='shop';setTimeout(()=>openFindPart(),350)}if(!VIEWS.includes(v))v='home';if(current!=='shop'&&current!=='wholesale')stageCur=null;current=v;const sec=v==='wholesale'?'shop':v;
  $$('.view').forEach(e=>e.classList.toggle('hidden',e.id!=='view-'+sec));$$('#navLinks a').forEach(a=>a.classList.toggle('active',a.dataset.v===v));$('#navLinks').classList.remove('open');
  window.scrollTo(0,0);renderCurrent();updateNav();if(v==='home'&&window.ScrollTrigger)setTimeout(()=>ScrollTrigger.refresh(),60)}
function renderCurrent(fromData){
  if(current==='shop'||current==='wholesale')renderShop(fromData);else if(current==='sell')renderSell(fromData);else if(current==='track')renderTrack(fromData);
  else if(current==='admin')renderAdmin(fromData);else if(current==='terms')renderTerms();else renderFoot();
  renderBasketCount();}
window.addEventListener('hashchange',route);
function updateNav(){const nav=$('#nav'),y=window.scrollY;const h=document.documentElement.scrollHeight-innerHeight;$('#progress').style.width=(h>0?y/h*100:0)+'%';
  if(current==='home'){const cats=$('#cats');const r=cats?cats.getBoundingClientRect():{top:9999,bottom:0};nav.className='nav '+((r.top<60&&r.bottom>60)?'light':(y>40?'solid':'dark'))}else nav.className='nav light'}
window.addEventListener('scroll',updateNav,{passive:true});

/* ================= CHROME (nav, language) ================= */
function buildChrome(){
  $('#navLinks').innerHTML=`<a href="#find" class="nav-find">${t('Find my part')}</a><a href="#shop" data-v="shop">${t('Retail')}</a><a href="#wholesale" data-v="wholesale">${t('Wholesale')}</a><a href="#sell" data-v="sell">${t('Sell your parts')}</a><a href="#track" data-v="track">${t('Track order')}</a><a href="#admin" data-v="admin" class="admin-link">${t('Staff')}</a>`;
  $$('#navLinks a').forEach(a=>a.classList.toggle('active',a.dataset.v===current));
  $('#basketLbl').textContent=t('Basket');$('#langBtn').textContent=LANGS[LANG||'en'].short;$('#brandName').textContent=t('AUTO ENGINEER');
  document.title=t('Auto Engineer — Toyota Spare Parts');
}
$('#menuBtn').onclick=()=>$('#navLinks').classList.toggle('open');
$('#langBtn').onclick=e=>{e.stopPropagation();const m=$('#langMenu');m.classList.toggle('hidden');m.innerHTML=Object.entries(LANGS).map(([k,v])=>`<button data-l="${k}" class="${k===LANG?'on':''}">${v.native}${k!=='en'?' · '+v.name:''}</button>`).join('')};
$('#langMenu').onclick=e=>{const b=e.target.closest('[data-l]');if(b){$('#langMenu').classList.add('hidden');setLang(b.dataset.l)}};
document.addEventListener('click',()=>$('#langMenu').classList.add('hidden'));
function showLangPicker(){const el=document.createElement('div');el.className='langpick';
  el.innerHTML=`<div class="brand"><span class="brand-mark">AE</span>AUTO ENGINEER</div><h2>زمانێک هەڵبژێرە · اختر اللغة · Choose your language</h2><div class="opts">${['ku','ar','en'].map(k=>`<button data-l="${k}"><b>${LANGS[k].native}</b><span>${LANGS[k].name}</span></button>`).join('')}</div>`;
  el.onclick=e=>{const b=e.target.closest('[data-l]');if(!b)return;setLang(b.dataset.l);el.remove()};document.body.appendChild(el)}

/* ================= HOME ================= */
let mm=null;
function buildHome(){
  const M=window.TOYOTA_MODELS||[];
  const tags=['Land Cruiser','Hilux','Camry','Brake pads','Oil filter'];
  const mk=M.map((m,i)=>`<span>${i%2?'<b>'+m.name+'</b>':m.name}</span>`).join('');
  const stmt=t('Send us your parts list. We reply with [prices], availability and your [discount], then issue your [quotation] and [invoice].');
  const stmtHtml=stmt.split(/\s+/).map(w=>{const red=/\[|\]/.test(w);return `<span class="w${red?' r':''}">${esc(w.replace(/[\[\]]/g,''))}</span>`}).join(' ');
  const h1=t('Next part.|[Smarter] part.').split('|').map(x=>`<span class="ln"><span>${esc(x).replace(/\[(.*?)\]/,'<em>$1</em>')}</span></span>`).join('');
  $('#view-home').innerHTML=`<div class="dark-zone">
  <section class="hero hero-engine" id="hero"><div class="hero-grid"></div><div class="hero-glow"></div>
    <div class="engine-wrap" id="engine">${engineSVG()}</div>
    <div class="hero-inner"><span class="eyebrow">${t('Toyota spare parts specialist')}</span><h1>${h1}</h1>
      <p class="lead">${t('Genuine Toyota parts for Land Cruiser, Hilux, Camry and every Toyota on the road. Search, add to your basket and send your list. We reply with prices, availability and your discount.')}</p>
      <form class="hero-search" id="heroSearch"><input name="q" placeholder="${esc(t('Part name, part number or Toyota model…'))}" autocomplete="off"><button>${t('Search parts')}</button></form>
      <a class="hero-find" href="#find"><span class="hf-q">${t('No part number?')}</span><b>${t('FIND MY PART')}</b><span class="hf-arrow">→</span></a>
      <div class="hero-tags" id="heroTags">${tags.map(x=>`<button type="button" data-q="${esc(t(x))}">${esc(t(x))}</button>`).join('')}</div></div>
    <div class="engine-caption" id="engineCap">${t('Every part inside your engine. Tap a part to shop it.')}</div>
    <div class="scroll-hint">${t('Scroll')}<i></i></div></section>
  <div class="marquee"><div class="marquee-track" id="marquee">${mk+mk}</div></div>
  <section class="models-sec" id="modelsSec"><div class="ms-head"><span class="eyebrow">${t('Choose your Toyota')}</span><h2>${t('Parts for every Toyota')}</h2><p>${t('Pick your model to see the parts that fit it.')}</p></div>
    <div class="mtiles">${M.map(m=>`<a class="mtile" href="#shop" data-model="${m.id}">${modelArt(m,{cls:'mt-art'})}<b>${esc(m.name)}</b></a>`).join('')}</div>
  </section>
  <section class="rooms" id="rooms"><div class="rooms-pin"><div class="rooms-track" id="roomsTrack">
    <div class="rooms-intro"><span class="eyebrow">${t('Three rooms')}</span><h2>${t('Built for how you buy')}</h2><p>${t('Retail customers, trade buyers and people with parts to sell each get their own space, with their own prices.')}</p></div>
    <a class="room-card r1" href="#shop"><span class="num">01 / ${t('RETAIL')}</span><svg class="art" viewBox="0 0 520 560" preserveAspectRatio="xMidYMid slice"><circle cx="400" cy="140" r="160" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="40"/><circle cx="400" cy="140" r="60" fill="none" stroke="rgba(255,59,31,.5)" stroke-width="2"/></svg><h3>${t('Retail room')}</h3><p>${t('For drivers and car owners. Search by part or car, see public prices, and order in a few taps.')}</p><span class="go">${t('Enter retail')} →</span></a>
    <a class="room-card r2" href="#wholesale"><span class="num">02 / ${t('WHOLESALE')}</span><svg class="art" viewBox="0 0 520 560" preserveAspectRatio="xMidYMid slice"><g stroke="rgba(255,255,255,.08)" stroke-width="2" fill="none"><rect x="300" y="40" width="160" height="110"/><rect x="330" y="70" width="160" height="110"/><rect x="360" y="100" width="160" height="110" stroke="rgba(255,59,31,.5)"/></g></svg><h3>${t('Wholesale room')}</h3><p>${t('For workshops, garages and resellers. Approved accounts see trade prices and can send bulk orders.')}</p><span class="go">${t('Enter wholesale')} →</span></a>
    <a class="room-card r3" href="#sell"><span class="num">03 / ${t('SELL')}</span><svg class="art" viewBox="0 0 520 560" preserveAspectRatio="xMidYMid slice"><path d="M280 180 L460 60" stroke="rgba(255,255,255,.08)" stroke-width="40"/><path d="M420 40 L470 60 L450 110" stroke="rgba(24,163,90,.6)" stroke-width="3" fill="none"/></svg><h3>${t('Sell your parts')}</h3><p>${t('Got new or used parts to sell? Send photos and details, and we’ll make you an offer.')}</p><span class="go">${t('Sell a part')} →</span></a>
  </div></div></section>
  <section class="steps" id="steps"><div class="sec-head"><span class="eyebrow">${t('Ordering')}</span><h2>${t('Four steps. No account needed.')}</h2></div>
    <div class="steps-grid"><svg class="steps-line" viewBox="0 0 1000 4" preserveAspectRatio="none" style="${isRTL()?'transform:scaleX(-1)':''}"><line x1="40" y1="2" x2="960" y2="2" stroke="rgba(255,255,255,.1)" stroke-width="2"/><line id="stepsLine" x1="40" y1="2" x2="960" y2="2" stroke="#FF3B1F" stroke-width="2" stroke-dasharray="920" stroke-dashoffset="920"/></svg>
    ${[['Search','Find parts by name, number, Toyota model or year.'],['Add to basket','Pick quantities. Can’t find it? Add a free-text request.'],['Send','Just your name, phone, location and an optional comment.'],['Get your price','We confirm prices, availability and discount, and send your quotation.']].map((s,i)=>`<div class="step"><div class="dot">${i+1}</div><h4>${t(s[0])}</h4><p>${t(s[1])}</p></div>`).join('')}</div></section></div>
  <section class="cats" id="cats"><div class="sec-head"><span class="eyebrow">${t('Categories')}</span><h2>${t('Shop by system')}</h2></div><div class="cat-grid" id="catGrid">${CATS.map(([c,d])=>`<button class="cat-tile" data-cat="${esc(c)}">${icon(c)}<div><b>${t(c)}</b><small>${t(d)}</small></div></button>`).join('')}</div></section>
  <div class="dark-zone"><section class="statement"><p id="statement">${stmtHtml}</p></section>
    <div class="stats">${[[M.length,'','Toyota models covered'],[4,'','Fields to place an order'],[10,'','Part categories'],[24,'h','Target reply time (hours)']].map(([n,s,l])=>`<div class="stat"><b data-count="${n}" data-suffix="${s}">0</b><span>${t(l)}</span></div>`).join('')}</div></div>
  <section class="cta"><h2>${t('Find your part today')}</h2><div class="btns"><a class="btn-w" href="#shop">${t('Browse parts')}</a><a class="btn-o" href="#wholesale">${t('Wholesale account')}</a></div></section>
  <footer><div class="foot"><div><div class="brand"><span class="brand-mark">AE</span>${t('AUTO ENGINEER')}</div><div style="opacity:.7;margin:-4px 0 10px">${t('Toyota spare parts specialist')}</div><div id="footContact" style="line-height:1.8"></div></div>
    <div><a href="#shop">${t('Retail room')}</a><a href="#wholesale">${t('Wholesale room')}</a><a href="#sell">${t('Sell your parts')}</a><a href="#track">${t('Track order')}</a><a href="#terms">${t('Terms & privacy')}</a></div>
    <div id="footBranches" style="line-height:1.8"></div></div>
    <div class="foot" style="margin-top:36px;font-size:12px;opacity:.6"><span>© ${new Date().getFullYear()} ${t('Auto Engineer')}. ${t('All rights reserved.')} ${t('Toyota and model names are trademarks of Toyota Motor Corporation.')}</span></div></footer>`;
  $$('#engine .ep-txt').forEach(x=>x.textContent=t(x.dataset.label));
  $('#heroTags').onclick=e=>{const b=e.target.closest('button');if(b){const mid=modelIdOf(b.dataset.q);if(mid&&mid!=='*'){S.f.model=mid;S.q=''}else S.q=b.dataset.q;location.hash='shop'}};
  $('#heroSearch').onsubmit=e=>{e.preventDefault();S.q=e.target.q.value.trim();location.hash='shop'};
  $('#catGrid').onclick=e=>{const b=e.target.closest('[data-cat]');if(b){S.f={cat:b.dataset.cat,model:S.f.model||'',year:'',cond:''};S.q='';location.hash='shop'}};
  $('#engine').onclick=e=>{const g=e.target.closest('[data-cat]');if(g){S.f={cat:g.dataset.cat,model:'',year:'',cond:''};S.q='';location.hash='shop'}};
  $('#modelsSec').onclick=e=>{const a=e.target.closest('[data-model]');if(a){S.f.model=a.dataset.model;S.f.cat='';S.q=''}};
  renderFoot();applyLogo();initMotion();
}
function renderFoot(){const s=settings();const fc=$('#footContact');if(!fc)return;
  fc.innerHTML=[s.address,s.phone&&(t('Phone')+': <span class="ltr">'+esc(s.phone)+'</span>'),s.whatsapp&&('WhatsApp: <span class="ltr">'+esc(s.whatsapp)+'</span>'),s.email].filter(Boolean).map(x=>x.includes('<span')?x:esc(x)).join('<br>');
  $('#footBranches').innerHTML=branches().length?`<b style="color:#fff">${t('Branches')}</b><br>`+branches().map(b=>`${esc(b.name)}${b.phone?' · <span class="ltr">'+esc(b.phone)+'</span>':''}`).join('<br>'):''}
function engineExplode(tl,rtl){
  // every part flies out along its own vector; the block stays put
  $$('#engine .ep[data-v]').forEach(g=>{const [dx,dy,r]=g.dataset.v.split(',').map(Number);tl.to(g,{x:rtl?-dx:dx,y:dy,rotation:r,transformOrigin:'50% 50%',ease:'power2.inOut',duration:1},0)});
  tl.to('#engine .ep-glow',{scale:1.25,opacity:.5,transformOrigin:'50% 50%',duration:1},0);
  tl.fromTo('#engine .ep-lbl',{opacity:0,y:10},{opacity:1,y:0,stagger:.02,duration:.3},.4);
  tl.to('#engine',{scale:.98,duration:1},0);
}
function initMotion(){
  if(mm){mm.revert();mm=null}
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!window.gsap||!window.ScrollTrigger||reduce){$$('.statement .w').forEach(w=>w.style.opacity=1);$$('[data-count]').forEach(b=>b.textContent=b.dataset.count+(b.dataset.suffix||''));$$('.step').forEach(s=>s.classList.add('on'));$$('#engine .ep-lbl').forEach(l=>l.style.opacity=1);return}
  gsap.registerPlugin(ScrollTrigger);const rtl=isRTL();
  mm=gsap.matchMedia();
  mm.add({desk:'(min-width: 861px)',mob:'(max-width: 860px)'},ctx=>{
    const {desk}=ctx.conditions;
    gsap.from('.hero h1 .ln span',{yPercent:110,duration:1,ease:'power4.out',stagger:.12});
    gsap.from('.hero .lead,.hero-search,.hero-tags,.hero .eyebrow',{y:24,opacity:0,duration:.9,delay:.3,stagger:.08,ease:'power3.out'});
    gsap.from('#engine .ep',{y:-40,opacity:0,duration:.9,stagger:.05,ease:'back.out(1.6)',delay:.2});
    // scrolling down takes the engine apart, scrolling up puts it back together
    // no pinning: the engine comes apart while the page keeps scrolling, in one movement
    const tl=gsap.timeline({scrollTrigger:{trigger:'#hero',start:'top top',end:desk?'70% top':'35% top',scrub:.25}});
    engineExplode(tl,rtl);
    // fade only the headline and text; the search box, Find My Part and quick tags stay fully usable
    if(desk)tl.to('.hero-inner .eyebrow,.hero-inner h1,.hero-inner .lead',{opacity:.1,duration:.6},.15);
    tl.fromTo('#engineCap',{opacity:0,y:20},{opacity:1,y:0,duration:.3},.5);
    tl.to('.scroll-hint',{opacity:0,duration:.2},0);
    gsap.fromTo('#marquee',{xPercent:0},{xPercent:-35,ease:'none',scrollTrigger:{trigger:'.marquee',start:'top bottom',end:'bottom top',scrub:.4}});
    const hscroll=(sec,track)=>{const tr=$(track);if(!tr)return;const dist=()=>Math.max(0,tr.scrollWidth-innerWidth);
      gsap.to(tr,{x:()=>rtl?dist():-dist(),ease:'none',scrollTrigger:{trigger:sec,start:'top top',end:()=>'+='+dist(),pin:true,scrub:.8,invalidateOnRefresh:true}})};
    if(desk){hscroll('#rooms','#roomsTrack')}
    else $$('.room-card').forEach(c=>gsap.from(c,{y:60,opacity:0,duration:.8,scrollTrigger:{trigger:c,start:'top 88%'}}));
    gsap.from('.mtile',{y:24,opacity:0,duration:.5,stagger:.03,scrollTrigger:{trigger:'#modelsSec',start:'top 85%'}});
    gsap.to('#stepsLine',{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.steps-grid',start:'top 75%',end:'bottom 45%',scrub:true,onUpdate:self=>{$$('.step').forEach((s,i)=>s.classList.toggle('on',self.progress>=i/4+.02))}}});
    gsap.from('.step',{y:40,opacity:0,stagger:.12,duration:.8,scrollTrigger:{trigger:'.steps-grid',start:'top 80%'}});
    $$('.sec-head h2').forEach(h=>gsap.from(h,{y:50,opacity:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:h,start:'top 88%'}}));
    ScrollTrigger.batch('.cat-tile',{start:'top 90%',onEnter:b=>gsap.fromTo(b,{y:50,opacity:0,rotate:rtl?2:-2},{y:0,opacity:1,rotate:0,stagger:.06,duration:.7,ease:'power3.out',overwrite:true}),onLeaveBack:b=>gsap.to(b,{y:50,opacity:0,stagger:.03,duration:.4,overwrite:true})});
    const words=$$('.statement .w');
    ScrollTrigger.create({trigger:'.statement',start:'top 75%',end:'bottom 45%',scrub:true,onUpdate:self=>{const n=Math.round(self.progress*words.length);words.forEach((w,i)=>w.style.opacity=i<n?1:.14)}});
    $$('[data-count]').forEach(b=>{const o={v:0};gsap.to(o,{v:+b.dataset.count,duration:1.4,ease:'power2.out',scrollTrigger:{trigger:b,start:'top 90%',toggleActions:'play none none reset'},onUpdate:()=>b.textContent=Math.round(o.v)+(b.dataset.suffix||'')})});
    gsap.from('.cta h2',{scale:.8,opacity:0,ease:'none',scrollTrigger:{trigger:'.cta',start:'top bottom',end:'center center',scrub:true}});
  });
}

/* ================= SHOP ================= */
let shopBuiltFor=null;
const room=()=>current==='wholesale'?'wholesale':'retail';
function restoreWs(){const w=ls('ae:ws');if(w&&w.pk&&w.pin){API.wsLogin(w.pk,w.pin).then(r=>{if(r&&r.profile){S.ws=r.profile;S.wsPrices=r.prices||{};renderCurrent()}}).catch(()=>{})}}
function renderShop(fromData){
  const r=room(),page=$('#shopPage');
  if(r==='wholesale'&&!S.ws){shopBuiltFor=null;setStage('');if(!fromData||!$('#wsLogin'))renderWsGate(page);return}
  const key=r+LANG;
  if(shopBuiltFor!==key||!fromData||!$('#results')){
    shopBuiltFor=key;const ws=S.ws;const M=window.TOYOTA_MODELS||[];
    page.innerHTML=`<div class="stage" id="stage"><div class="stage-bg" id="stageBg"></div><div class="stage-name" id="stageName"></div>
      <div class="stage-inner"><div class="page-head"><div><span class="eyebrow">${r==='wholesale'?t('Wholesale room'):t('Retail room')} · Toyota</span><h1 id="stageTitle">${r==='wholesale'?t('Trade catalog'):t('Find your part')}</h1>
        <p id="stageSub">${r==='wholesale'?t('Trade prices for approved workshops and resellers. Send your list and we confirm stock and your discount.'):t('Choose your Toyota, then search by part name or part number. We reply with price and availability.')}</p></div>
        <div class="room-switch"><a href="#shop" class="${r==='retail'?'on':''}">${t('Retail')}</a><a href="#wholesale" class="${r==='wholesale'?'on':''}">${t('Wholesale')}</a></div></div>
      ${r==='wholesale'&&ws?`<div class="ws-bar"><div>${t('Signed in as')} <b>${esc(ws.company||ws.name)}</b> · <span class="ltr">${esc(ws.phone)}</span></div><button class="btn sm ghost" style="color:#fff;border-color:rgba(255,255,255,.3)" id="wsOut">${t('Sign out')}</button></div>`:''}
      <div class="model-strip" id="modelStrip"><button class="mchip" data-m="">${t('All models')}</button>${M.map(m=>`<button class="mchip" data-m="${m.id}">${modelArt(m,{cls:'mchip-art'})}<span>${esc(m.name)}</span></button>`).join('')}</div>
      <div class="searchbar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="${esc(t('Search: brake pads, 04465-0K290, Hilux 2018…'))}" value="${esc(S.q)}"></div>
      ${r==='retail'?`<button class="stage-find" id="stageFind"><span>${t('No part number?')}</span><b>${t('FIND MY PART')}</b></button>`:''}</div></div>
    <div class="filters" id="catChips"></div>
    <div class="filters"><select class="sel" id="fYear"></select><select class="sel" id="fCond"></select><button class="linkbtn" id="fClear">${t('Clear filters')}</button></div>
    <div class="result-meta"><span id="resCount"></span><span>${t('Can’t find it?')} <button class="linkbtn" id="reqBtn">${t('Request a part')}</button></span></div>
    <div class="grid" id="results"></div>`;
    $('#q').oninput=e=>{S.q=e.target.value;if(!S.f.model){const mid=modelIdOf(S.q);setStage(mid&&mid!=='*'?mid:'')}renderResults()};
    $('#fClear').onclick=()=>{S.f={cat:'',model:'',year:'',cond:''};S.q='';$('#q').value='';renderFilters();renderResults()};
    $('#reqBtn').onclick=openRequestModal;if($('#stageFind'))$('#stageFind').onclick=()=>openFindPart({model:S.f.model||''});
    $('#modelStrip').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;S.f.model=b.dataset.m;renderFilters();renderResults();b.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})};
    [['fYear','year'],['fCond','cond']].forEach(([id,k])=>$('#'+id).onchange=e=>{S.f[k]=e.target.value;renderFilters();renderResults()});
    if($('#wsOut'))$('#wsOut').onclick=()=>{S.ws=null;S.wsPrices={};ls('ae:ws',null);renderShop()};
    stageParallax();
  }
  renderFilters();renderResults();
}
/* the big model backdrop at the top of the shop: changes with the chosen Toyota */
let stageCur=null;
function setStage(id){
  const bg=$('#stageBg'),nm=$('#stageName');if(!bg)return;
  if(stageCur===id&&bg.childElementCount)return;stageCur=id;
  const m=modelById(id);
  const old=bg.firstElementChild;
  const layer=document.createElement('div');layer.className='stage-layer';
  layer.innerHTML=m?modelArt(m,{cls:'stage-art'}):`<div class="stage-art stage-default">${engineSVG()}</div>`;
  bg.appendChild(layer);
  if(window.gsap){gsap.fromTo(layer,{opacity:0,x:isRTL()?-120:120,scale:1.04},{opacity:1,x:0,scale:1,duration:.8,ease:'power3.out'});
    if(old)gsap.to(old,{opacity:0,x:isRTL()?120:-120,duration:.6,ease:'power2.in',onComplete:()=>old.remove()})}
  else{if(old)old.remove()}
  nm.textContent=m?m.name:'TOYOTA';
  if(window.gsap)gsap.fromTo(nm,{opacity:0,y:30},{opacity:1,y:0,duration:.7,ease:'power3.out'});
  $('#stage').classList.toggle('has-model',!!m);
  const st=$('#stageTitle');if(st&&room()==='retail')st.textContent=m?t('Parts for Toyota {m}',{m:m.name}):t('Find your part');
}
function stageParallax(){
  if(!window.gsap||!window.ScrollTrigger)return;
  ScrollTrigger.getAll().filter(x=>x.vars&&x.vars.id==='stagePx').forEach(x=>x.kill());
  gsap.to('#stageBg',{yPercent:18,scale:1.06,ease:'none',scrollTrigger:{id:'stagePx',trigger:'#stage',start:'top top',end:'bottom top',scrub:true}});
}
function renderFilters(){
  $('#catChips').innerHTML=`<button class="chip ${!S.f.cat?'on':''}" data-c="">${t('All')}</button>`+CATS.map(([c])=>`<button class="chip ${S.f.cat===c?'on':''}" data-c="${esc(c)}">${t(c)}</button>`).join('');
  $('#catChips').onclick=e=>{const b=e.target.closest('[data-c]');if(b){S.f.cat=b.dataset.c;renderFilters();renderResults()}};
  const years=[];for(let y=new Date().getFullYear()+1;y>=1990;y--)years.push(y);
  $('#fYear').innerHTML=`<option value="">${t('Any year')}</option>`+years.map(y=>`<option ${String(S.f.year)===String(y)?'selected':''}>${y}</option>`).join('');
  $('#fCond').innerHTML=`<option value="">${t('Any condition')}</option>`+CONDS.map(c=>`<option value="${c}" ${S.f.cond===c?'selected':''}>${t(c)}</option>`).join('');
  $$('#modelStrip [data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===(S.f.model||'')));
  setStage(S.f.model||(()=>{const mid=modelIdOf(S.q);return mid&&mid!=='*'?mid:''})());
}
function matches(p){const f=S.f;
  if(f.cat&&p.category!==f.cat)return false;if(f.cond&&p.condition!==f.cond)return false;
  if(f.model){const pm=modelIdOf(p.model);if(pm!=='*'&&pm!==f.model)return false}
  if(f.year){const y=+f.year;if(p.yearFrom&&y<p.yearFrom)return false;if(p.yearTo&&y>p.yearTo)return false}
  const q=S.q.trim().toLowerCase();if(!q)return true;
  const hay=[p.partNo,p.name,p.nameAr,p.nameKu,p.brand,'toyota',p.model,p.category,t(p.category||''),p.condition,p.desc].join(' ').toLowerCase();const hayNo=String(p.partNo||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  return q.split(/\s+/).every(w=>{if(/^\d{4}$/.test(w)&&(p.yearFrom||p.yearTo)){const y=+w;if((!p.yearFrom||y>=p.yearFrom)&&(!p.yearTo||y<=p.yearTo))return true}const wn=w.replace(/[^a-z0-9]/g,'');
    if(wn.length>2&&modelIdOf(wn)&&modelIdOf(wn)!=='*'){const pm=modelIdOf(p.model);return pm==='*'||pm===modelIdOf(wn)}
    return hay.includes(w)||(wn.length>2&&hayNo.includes(wn))})}
const pName=p=>(LANG==='ar'&&p.nameAr)||(LANG==='ku'&&p.nameKu)||p.name;
function fitText(p){const yrs=p.yearFrom||p.yearTo?` ${p.yearFrom||''}–${p.yearTo||''}`:'';const pm=modelIdOf(p.model);const mn=pm==='*'?t('All models'):(modelById(pm)?.name||p.model||'');return ('Toyota '+mn).trim()+yrs}
function renderResults(){
  const el=$('#results');if(!el)return;
  if(S.mode!=='local'&&!S.loaded.parts){el.innerHTML=`<div class="empty" style="grid-column:1/-1">${t('Loading catalog…')}</div>`;$('#resCount').textContent='';return}
  const r=room();const list=Store.all('parts').filter(p=>!p.hidden&&(!p.make||/toyota/i.test(p.make))).filter(matches).sort((a,b)=>String(pName(a)).localeCompare(pName(b)));
  $('#resCount').textContent=t('{n} parts',{n:list.length});
  if(!list.length){el.innerHTML=`<div class="empty" style="grid-column:1/-1"><h3>${t('No parts found')}</h3><p>${t('Try another search, or send us a request and we’ll find it for you.')}</p><br><button class="btn red" id="reqBtn2">${t('Find my part')}</button></div>`;$('#reqBtn2').onclick=()=>openFindPart({model:S.f.model||'',q:S.q});return}
  const inB=new Set(S.basket.map(b=>b.partId));
  el.innerHTML=list.slice(0,240).map((p,i)=>{const pr=priceFor(p,r);const cc=p.condition==='Genuine'?'g':p.condition==='Used'?'u':'a';
    return `<article class="pcard" style="animation-delay:${Math.min(i,16)*25}ms"><div class="pimg">${p.image?`<img src="${esc(p.image)}" alt="">`:icon(p.category,1.2)}${p.condition?`<span class="badge ${cc}">${t(p.condition)}</span>`:''}${p.stock?`<span class="stock">${t(p.stock)}</span>`:''}</div>
      <div class="pbody"><span class="pno">${esc(p.partNo)}</span><span class="pname">${esc(pName(p))}</span><span class="pfit">${esc(fitText(p))}${p.brand?' · '+esc(p.brand):''}</span>
      <div class="prow">${pr!==null?`<span class="price">${money(pr)}</span>`:`<span class="price req">${t('Price on request')}</span>`}<button class="add ${inB.has(p.id)?'done':''}" data-add="${esc(p.id)}">${inB.has(p.id)?'✓ '+t('Added'):t('Add')}</button></div></div></article>`}).join('');
  el.onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;addToBasket(Store.get('parts',b.dataset.add));b.classList.add('done');b.textContent='✓ '+t('Added')};
}
const citiesList=()=>`<datalist id="cities">${CITIES.map(c=>`<option value="${t(c)}">`).join('')}</datalist>`;
function renderWsGate(page){
  page.innerHTML=`<div class="page-head"><div><span class="eyebrow">${t('Wholesale room')}</span><h1>${t('Trade access')}</h1><p>${t('Workshops, garages and resellers get trade prices after approval. Already approved? Sign in with your phone number and PIN.')}</p></div>
    <div class="room-switch"><a href="#shop">${t('Retail')}</a><a href="#wholesale" class="on">${t('Wholesale')}</a></div></div>
    <div class="gate"><form class="panel" id="wsLogin"><h3>${t('Approved account')}</h3><p class="sub">${t('Use the phone number you registered with and the PIN we sent you.')}</p>
      <div class="f"><label>${t('Phone number')}</label><input name="phone" type="tel" required placeholder="0750 123 4567" dir="ltr"></div><div class="f"><label>${t('PIN')}</label><input name="pin" type="password" inputmode="numeric" required dir="ltr"></div><div class="err hidden" id="wsErr"></div>
      <button class="btn block">${t('Enter wholesale room')}</button></form>
    <form class="panel" id="wsApply"><h3>${t('Apply for a trade account')}</h3><p class="sub">${t('We review applications and contact you, usually within one working day.')}</p>
      <div class="row2"><div class="f"><label>${t('Business name')}</label><input name="company" required></div><div class="f"><label>${t('Your name')}</label><input name="name" required></div></div>
      <div class="row2"><div class="f"><label>${t('Phone')}</label><input name="phone" type="tel" required dir="ltr"></div><div class="f"><label>${t('City / location')}</label><input name="location" list="cities" required></div></div>
      <div class="f"><label>${t('Business type')}</label><select name="btype">${['Workshop / garage','Parts shop / reseller','Fleet / company','Other'].map(x=>`<option value="${x}">${t(x)}</option>`).join('')}</select></div>
      <button class="btn red block" ${S.canWrite?'':'disabled'}>${t('Send application')}</button></form></div>${citiesList()}`;
  $('#wsLogin').onsubmit=async e=>{e.preventDefault();const pk=phoneKey(e.target.phone.value),pin=e.target.pin.value.trim();const err=$('#wsErr');
    const r=await API.wsLogin(pk,pin).catch(()=>null);
    if(!r||!r.profile){err.textContent=t(({notfound:'No trade account found for this number. Please apply.',pending:'Your application is still under review.',rejected:'This account is not active. Please contact us.',pin:'Wrong PIN. Please check the PIN we sent you.'})[r&&r.error]||'Wrong phone number or PIN.');err.classList.remove('hidden');return}
    S.ws=r.profile;S.wsPrices=r.prices||{};ls('ae:ws',{pk,pin});renderShop()};
  $('#wsApply').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));const k=phoneKey(fd.phone);
    if(k.length<8){toast(t('Please enter a valid phone number'));return}
    try{await Store.set('wholesalers','w_'+k,{...fd,phoneKey:k,status:'pending',lang:LANG,createdAt:Date.now()});
      e.target.innerHTML=`<div class="success"><div class="tick">✓</div><h3>${t('Application sent')}</h3><p class="sub">${t('We’ll contact you on {p} once approved.',{p:esc(fd.phone)})}</p></div>`}catch(_){}};
}

/* ================= BASKET & CHECKOUT ================= */
function saveBasket(){ls('ae:basket',S.basket);renderBasketCount()}
function renderBasketCount(){$('#basketCount').textContent=S.basket.reduce((s,b)=>s+(+b.qty||0),0)}
function addToBasket(p){const r=room();
  if(S.basket.length&&S.basket[0].room&&S.basket[0].room!==r)S.basket.forEach(b=>{b.room=r;if(b.partId){const pp=Store.get('parts',b.partId);b.price=pp?priceFor(pp,r):b.price}});
  const ex=S.basket.find(b=>b.partId===p.id);if(ex)ex.qty++;else S.basket.push({key:rid(6),partId:p.id,partNo:p.partNo,name:p.name,fit:fitText(p),qty:1,price:priceFor(p,r),room:r});
  saveBasket();toast(t('Added: {x}',{x:pName(p)}))}
function openBasket(){renderBasket();$('#drawer').classList.add('on');$('#scrim').classList.add('on')}
function closeAll(){$('#drawer').classList.remove('on');$('#scrim').classList.remove('on');$('#modal').classList.remove('on')}
$('#basketBtn').onclick=openBasket;$('#scrim').onclick=closeAll;$('#drawerClose').onclick=closeAll;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
function renderBasket(){
  const body=$('#basketBody'),foot=$('#basketFoot');$('#drawerTitle').textContent=t('Basket');
  if(!S.basket.length){body.innerHTML=`<div class="empty" style="background:none"><h3>${t('Your basket is empty')}</h3><p>${t('Search the catalog and add the parts you need.')}</p></div>`;foot.innerHTML=`<a class="btn block" href="#shop" id="bBrowse">${t('Browse parts')}</a>`;$('#bBrowse').onclick=closeAll;return}
  const r=S.basket[0].room||'retail';const known=S.basket.filter(b=>nz(b.price));const est=known.reduce((s,b)=>s+b.price*b.qty,0);const unknown=S.basket.length-known.length;
  body.innerHTML=`<div style="margin-bottom:8px"><span class="room-tag ${r==='wholesale'?'ws':''}">${r==='wholesale'?t('Wholesale order'):t('Retail order')}</span></div>`+S.basket.map(b=>`<div class="bline"><div class="meta"><b>${esc(b.name)}</b><small class="ltr">${esc(b.partNo||t('Custom request'))}</small>${b.fit?` <small>· ${esc(b.fit)}</small>`:''}<br><small>${nz(b.price)?money(b.price)+' '+t('each'):t('Price on request')}</small><br><button class="rm" data-rm="${b.key}">${t('Remove')}</button></div>
    <div class="qty"><button data-dec="${b.key}">−</button><span>${b.qty}</span><button data-inc="${b.key}">+</button></div></div>`).join('');
  foot.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>${t('Estimated total')}</span><b>${money(est)}</b></div><p class="mini" style="margin-bottom:14px">${unknown?t('{n} item(s) priced on request.',{n:unknown})+' ':''}${t('Final prices, availability and discount are confirmed by our team.')}</p><button class="btn red block" id="checkoutBtn">${t('Send order request')}</button>`;
  body.onclick=e=>{const el=e.target;const k=el.dataset.inc||el.dataset.dec||el.dataset.rm;if(!k)return;const i=S.basket.findIndex(b=>b.key===k);if(i<0)return;
    if(el.dataset.inc)S.basket[i].qty++;else if(el.dataset.dec){S.basket[i].qty--;if(S.basket[i].qty<1)S.basket.splice(i,1)}else S.basket.splice(i,1);saveBasket();renderBasket();if(current==='shop'||current==='wholesale')renderResults()};
  $('#checkoutBtn').onclick=openCheckout;
}
function openModal(html,wide){const mb=$('#modalBox');mb.oninput=mb.onchange=mb.onclick=null;$('#modalBox').className='modal-box'+(wide?' wide':'');$('#modalBox').innerHTML=html;$('#modal').classList.add('on');$('#scrim').classList.add('on');$$('#modalBox [data-mclose]').forEach(b=>b.onclick=closeModal)}
function closeModal(){$('#modal').classList.remove('on');if(!$('#drawer').classList.contains('on'))$('#scrim').classList.remove('on')}
$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
const mHead=(title,sub)=>`<div class="modal-head"><div><h3>${title}</h3>${sub?`<p class="mini">${sub}</p>`:''}</div><button class="x" data-mclose>×</button></div>`;

function openRequestModal(){
  openModal(mHead(t('Request a part'))+`<div class="modal-body"><p style="color:var(--muted);margin-bottom:14px">${t('Tell us what you need. We’ll add it to your order and reply with price and availability.')}</p>
    <form id="reqF"><div class="f"><label>${t('Part name / description')}</label><input name="name" required value="${esc(S.q)}"></div>
    <div class="row2"><div class="f"><label>${t('Part number')} <i>(${t('optional')})</i></label><input name="partNo" dir="ltr"></div><div class="f"><label>${t('Quantity')}</label><input name="qty" type="number" min="1" value="1"></div></div>
    <div class="f"><label>${t('Vehicle')} <i>(${t('make, model, year, or VIN')})</i></label><input name="fit" placeholder="Toyota Hilux 2019"></div>
    <button class="btn red block">${t('Add to basket')}</button></form></div>`);
  $('#reqF').onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));
    S.basket.push({key:rid(6),partId:null,partNo:fd.partNo||'',name:fd.name,fit:fd.fit||'',qty:Math.max(1,+fd.qty||1),price:null,room:S.basket[0]?.room||room(),custom:true});saveBasket();closeModal();toast(t('Request added to basket'));openBasket()};
}
function openCheckout(){
  if(!S.canWrite){toast(t('Ordering is not available in this view.'));return}
  const ws=S.ws;const last=ls('ae:me')||{};const pre=ws?{name:ws.name,phone:ws.phone,location:ws.location}:last;const brs=branches();
  openModal(mHead(t('Send your order'))+`<div class="modal-body"><p style="color:var(--muted);margin-bottom:16px;font-size:14px">${t('No account needed. We’ll contact you with prices, availability and your discount.')}</p>
    <form id="coF"><div class="f"><label>${t('Full name')}</label><input name="name" required value="${esc(pre.name||'')}" autocomplete="name"></div>
    <div class="f"><label>${t('Phone / WhatsApp')}</label><input name="phone" type="tel" required value="${esc(pre.phone||'')}" placeholder="0750 123 4567" autocomplete="tel" dir="ltr"></div>
    <div class="f"><label>${t('Location')}</label><input name="location" list="cities" required value="${esc(pre.location||'')}" placeholder="${esc(t('City, area'))}"></div>
    ${brs.length?`<div class="f"><div class="seg"><label><input type="radio" name="fulfil" value="delivery" ${pre.fulfil!=='pickup'?'checked':''}>${t('Deliver to me')}</label><label><input type="radio" name="fulfil" value="pickup" ${pre.fulfil==='pickup'?'checked':''}>${t('Pick up from branch')}</label></div></div>
      <div class="f ${pre.fulfil==='pickup'?'':'hidden'}" id="brWrap"><label>${t('Branch')}</label><select name="branch">${brs.map(b=>`<option value="${esc(b.id)}" ${pre.branch===b.id?'selected':''}>${esc(b.name)}${b.city?' — '+esc(b.city):''}</option>`).join('')}</select></div>`:''}
    <div class="f"><label>${t('Comment')} <i>(${t('optional')})</i></label><textarea name="comment" placeholder="${esc(t('VIN, delivery notes, anything else…'))}"></textarea></div>
    <p class="agree">${t('By sending you agree to our')} <a href="#terms" id="coTerms">${t('Terms & privacy')}</a>.</p>
    <div class="err hidden" id="coErr"></div><button class="btn red block" id="coBtn">${t('Send order')} · ${t('{n} items',{n:S.basket.length})}</button></form>${citiesList()}</div>`);
  $('#coTerms').onclick=closeAll;
  $$('#coF [name=fulfil]').forEach(r=>r.onchange=()=>$('#brWrap').classList.toggle('hidden',$('#coF').fulfil.value!=='pickup'));
  $('#coF').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));const k=phoneKey(fd.phone);
    if(k.length<8){const er=$('#coErr');er.textContent=t('Please enter a valid phone number');er.classList.remove('hidden');return}
    $('#coBtn').disabled=true;$('#coBtn').textContent=t('Sending…');
    const d=new Date();const no='AE-'+String(d.getFullYear()).slice(2)+pad(d.getMonth()+1,2)+pad(d.getDate(),2)+'-'+rid(4);const r=S.basket[0].room||'retail';
    const fulfil=fd.fulfil||'delivery';const branch=fulfil==='pickup'?fd.branch:(brs.find(b=>b.city&&fd.location&&fd.location.toLowerCase().includes(String(b.city).toLowerCase()))||{}).id||'';
    const order={no,room:r,status:'new',lang:LANG,fulfil,branch:branch||'',customer:{name:fd.name.trim(),phone:fd.phone.trim(),phoneKey:k,location:fd.location.trim(),company:ws?ws.company||'':''},comment:fd.comment||'',
      lines:S.basket.map(b=>({partId:b.partId,partNo:b.partNo,name:b.name,fit:b.fit,qty:b.qty,price:b.price,listPrice:b.price,avail:'',custom:!!b.custom})),
      discountType:'pct',discount:0,delivery:0,notes:'',payments:[],credits:[],createdAt:Date.now(),updatedAt:Date.now(),log:[{at:Date.now(),s:'new'}]};
    try{await Store.set('orders',no,order);await API.upsertCustomer(order).catch(()=>{});
      ls('ae:me',{name:fd.name,phone:fd.phone,location:fd.location,fulfil,branch:fd.branch});S.basket=[];saveBasket();$('#drawer').classList.remove('on');S.lastOrder={no,phone:fd.phone};
      openModal(mHead('')+`<div class="modal-body"><div class="success"><div class="tick">✓</div><h3 style="font-family:var(--display);font-size:26px">${t('Order sent')}</h3><p style="color:var(--muted)">${t('Your order number')}</p><code class="ltr">${esc(no)}</code>
        <p style="color:var(--muted);line-height:1.6;margin:8px 0 18px">${t('We’ll contact you on {p} with prices, availability and your discount. Keep this number to track your order.',{p:'<b class="ltr">'+esc(fd.phone)+'</b>'})}</p><a class="btn block" href="#track" id="goTrack">${t('Track this order')}</a></div></div>`);
      $('#goTrack').onclick=closeAll;if(current==='shop'||current==='wholesale')renderResults();
    }catch(err){$('#coBtn').disabled=false;$('#coBtn').textContent=t('Try again')}};
}

/* ================= SELL ================= */
let sellPhotos=[];
function renderSell(fromData){
  if(fromData&&$('#sellF')&&$('#sellPage').dataset.lang===LANG)return;$('#sellPage').dataset.lang=LANG;sellPhotos=[];
  $('#sellPage').innerHTML=`<div class="page-head"><div><span class="eyebrow">${t('Sell your parts')}</span><h1>${t('Turn spare parts into cash')}</h1><p>${t('New, used or surplus stock. Send us the details and a few photos, and we’ll get back to you with an offer.')}</p></div></div>
  <form class="panel" id="sellF" style="max-width:820px"><h3>${t('About the part')}</h3><p class="sub">${t('The more detail, the faster our offer.')}</p>
    <div class="row2"><div class="f"><label>${t('Part name')}</label><input name="partName" required></div><div class="f"><label>${t('Part number')} <i>(${t('optional')})</i></label><input name="partNo" dir="ltr"></div></div>
    <div class="row3"><div class="f"><label>${t('Vehicle make')}</label><input name="make" placeholder="Toyota"></div><div class="f"><label>${t('Model')}</label><input name="model" placeholder="Land Cruiser"></div><div class="f"><label>${t('Year')}</label><input name="year" placeholder="2018"></div></div>
    <div class="row3"><div class="f"><label>${t('Condition')}</label><select name="condition">${['New','Used — good','Used — fair','Refurbished'].map(x=>`<option value="${x}">${t(x)}</option>`).join('')}</select></div><div class="f"><label>${t('Quantity')}</label><input name="qty" type="number" min="1" value="1"></div><div class="f"><label>${t('Asking price')} <i>(${t('optional')})</i></label><input name="asking" type="number" min="0" placeholder="${t(settings().currency)}"></div></div>
    <div class="f"><label>${t('Photos')} <i>(${t('up to 3')})</i></label><input type="file" accept="image/*" multiple id="sellPh"><div class="thumbs" id="sellThumbs"></div></div>
    <h3 style="margin-top:12px">${t('Your details')}</h3><p class="sub">${t('We’ll contact you on this number.')}</p>
    <div class="row3"><div class="f"><label>${t('Name')}</label><input name="name" required></div><div class="f"><label>${t('Phone / WhatsApp')}</label><input name="phone" type="tel" required dir="ltr"></div><div class="f"><label>${t('Location')}</label><input name="location" list="cities" required></div></div>
    <div class="f"><label>${t('Comment')} <i>(${t('optional')})</i></label><textarea name="comment"></textarea></div>
    <button class="btn red" id="sellBtn" ${S.canWrite?'':'disabled'}>${t('Send to Auto Engineer')}</button></form>${citiesList()}`;
  $('#sellPh').onchange=async e=>{for(const f of [...e.target.files].slice(0,3-sellPhotos.length)){try{sellPhotos.push(await compressImg(f,900,.62))}catch(_){}}$('#sellThumbs').innerHTML=sellPhotos.map(s=>`<img src="${s}">`).join('');e.target.value=''};
  $('#sellF').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));const k=phoneKey(fd.phone);if(k.length<8){toast(t('Please enter a valid phone number'));return}
    $('#sellBtn').disabled=true;$('#sellBtn').textContent=t('Sending…');const id='s_'+Date.now().toString(36)+rid(3);
    try{await Store.set('sellRequests',id,{...fd,phoneKey:k,photos:sellPhotos,status:'new',offer:'',adminNotes:'',lang:LANG,createdAt:Date.now()});
      $('#sellF').innerHTML=`<div class="success"><div class="tick">✓</div><h3 style="font-family:var(--display);font-size:26px">${t('Thanks, {n}!',{n:esc(fd.name)})}</h3><p style="color:var(--muted);margin-top:8px">${t('We received your part details and will contact you with an offer.')}</p><br><button class="btn" type="button" id="sellAgain">${t('Sell another part')}</button></div>`;
      $('#sellAgain').onclick=()=>renderSell()}catch(_){$('#sellBtn').disabled=false;$('#sellBtn').textContent=t('Try again')}};
}
function compressImg(file,max,q){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',q))};img.onerror=rej;img.src=u})}

/* ================= TRACK ================= */
let trackKey=null;
function renderTrack(fromData){
  const page=$('#trackPage');
  if(!fromData||!$('#trF')||page.dataset.lang!==LANG){page.dataset.lang=LANG;const pre=S.lastOrder||{};
    page.innerHTML=`<div class="page-head"><div><span class="eyebrow">${t('Track order')}</span><h1>${t('Where’s my order?')}</h1><p>${t('Enter your order number and the phone number you used.')}</p></div></div>
    <form class="panel" id="trF" style="max-width:640px;margin-bottom:20px"><div class="row2"><div class="f"><label>${t('Order number')}</label><input name="no" required placeholder="AE-261115-AB12" value="${esc(pre.no||'')}" dir="ltr"></div><div class="f"><label>${t('Phone')}</label><input name="phone" type="tel" required value="${esc(pre.phone||'')}" dir="ltr"></div></div><button class="btn">${t('Find order')}</button></form><div id="trOut"></div>`;
    $('#trF').onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));trackKey={no:fd.no.trim().toUpperCase(),pk:phoneKey(fd.phone)};drawTrack()}}
  if(trackKey&&S.mode!=='supabase')drawTrack();
}
async function drawTrack(){
  const out=$('#trOut');if(!out||!trackKey)return;const o=await API.track(trackKey.no,trackKey.pk).catch(()=>null);
  if(!o){out.innerHTML=`<div class="empty" style="max-width:640px"><h3>${t('Order not found')}</h3><p>${t('Check the order number and phone number.')}</p></div>`;return}
  const si=STATUS_FLOW.indexOf(o.status);const priced=['quoted','accepted','confirmed','delivered'].includes(o.status);const tt=totals(o);const br=branches().find(b=>b.id===o.branch);
  const msgs=['Received. Our team is checking prices and stock.','Your quotation is ready. Review and accept below.','Accepted. We are preparing your invoice.','Invoiced. Your order is being prepared.','Delivered. Thank you!'];
  out.innerHTML=`<div class="panel" style="max-width:900px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h3 class="ltr">${esc(o.no)}</h3><p class="mini">${t('Placed')} ${dtStr(o.createdAt)} · ${o.fulfil==='pickup'?t('Pick up from branch')+(br?': '+esc(br.name):''):t('Delivery')}</p></div><span class="st ${o.status}">${stl(o.status)}</span></div>
    ${o.status!=='cancelled'?`<div class="timeline">${STATUS_FLOW.map((s,i)=>`<div class="${i<=si?'on':''}" title="${stl(s)}"></div>`).join('')}</div><p class="mini" style="margin-bottom:12px">${t(msgs[si]||'')}</p>`:''}
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part')}</th><th class="num">${t('Qty')}</th>${priced?`<th>${t('Availability')}</th><th class="num">${t('Unit price')}</th><th class="num">${t('Total')}</th>`:''}</tr></thead><tbody>
    ${o.lines.map(l=>`<tr><td><b>${esc(l.name)}</b><br><span class="mini ltr">${esc(l.partNo||'')}</span>${l.fit?` <span class="mini">· ${esc(l.fit)}</span>`:''}</td><td class="num">${l.qty}</td>${priced?`<td>${availLabel(l.avail)}</td><td class="num">${l.avail==='unavailable'?'—':money(l.price)}</td><td class="num">${l.avail==='unavailable'?'—':money((+l.price||0)*l.qty)}</td>`:''}</tr>`).join('')}</tbody></table></div>
    ${priced?`<div class="totals" style="margin-top:12px"><div><span>${t('Subtotal')}</span><span>${money(tt.sub)}</span></div>${tt.disc?`<div><span>${t('Discount')}</span><span>−${money(tt.disc)}</span></div>`:''}${tt.del?`<div><span>${t('Delivery')}</span><span>${money(tt.del)}</span></div>`:''}<div class="grand"><span>${t('Total')}</span><span>${money(tt.total)}</span></div>${tt.paid?`<div><span>${t('Paid')}</span><span>${money(tt.paid)}</span></div><div><b>${t('Balance due')}</b><b>${money(Math.max(0,tt.balance))}</b></div>`:''}</div>`:''}
    ${o.status==='quoted'&&S.canWrite?`<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn green" id="accQ">${t('Accept quotation')}</button></div>`:''}</div>`;
  if($('#accQ'))$('#accQ').onclick=async()=>{try{await API.accept(o.no,trackKey.pk);toast(t('Quotation accepted. Thank you!'));drawTrack()}catch(_){toast(t('Could not save. Please try again.'))}};
}

/* ================= TERMS ================= */
function renderTerms(){const s=settings();const page=$('#termsPage');
  const sec=[['Ordering','Sending an order request does not create a sale. We confirm prices, availability and discount in a quotation. A sale is confirmed when you accept the quotation and we issue an invoice.'],
   ['Prices','Prices shown on the website are for guidance and can change. The price on your quotation is valid for the period written on it.'],
   ['Delivery and pickup','Delivery times are estimates. For branch pickup, we will tell you when your order is ready.'],
   ['Returns','Parts can be returned in original, unused condition with the invoice, within the period stated by our team. Electrical parts and special-order parts may not be returnable. Approved returns are settled with a credit note.'],
   ['Wholesale accounts','Trade prices are for approved businesses only. Keep your PIN private. We can suspend an account at any time.'],
   ['Selling your parts','Sending details of a part does not oblige us to buy it. Any offer we make is subject to inspection of the part.'],
   ['Your information','We collect your name, phone number, location and order details only to process your orders, contact you and keep your purchase history. We do not sell your information. Contact us to see or delete your information.']];
  page.innerHTML=`<div class="page-head"><div><span class="eyebrow">${esc(s.company)}</span><h1>${t('Terms & privacy')}</h1></div></div><div class="panel terms">${sec.map(([h,p])=>`<h3>${t(h)}</h3><p>${t(p)}</p>`).join('')}<p class="mini" style="margin-top:24px">${t('Contact')}: <span class="ltr">${esc(s.phone||s.whatsapp||'')}</span> ${esc(s.email||'')}</p></div>`}

/* ================= ALERTS ================= */
function checkAlerts(){if(!S.admin)return;const ids=new Set(Object.keys(S.data.orders||{}));
  if(S.seenOrders===null){S.seenOrders=ids;return}
  const fresh=[...ids].filter(id=>!S.seenOrders.has(id));S.seenOrders=ids;if(!fresh.length)return;
  S.alerts+=fresh.length;document.title=`(${S.alerts}) ${t('New order')} — ${t('Auto Engineer')}`;toast(t('New order received: {n}',{n:fresh[0]}));beep()}
function beep(){try{const a=new (window.AudioContext||window.webkitAudioContext)();[0,.18].forEach(d=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=880;o.connect(g);g.connect(a.destination);g.gain.setValueAtTime(.15,a.currentTime+d);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d+.15);o.start(a.currentTime+d);o.stop(a.currentTime+d+.16)})}catch(e){}}
window.addEventListener('focus',()=>{if(S.alerts){S.alerts=0;document.title=t('Auto Engineer — Toyota Spare Parts')}});

/* ================= ADMIN ================= */
function renderAdmin(fromData){
  const page=$('#adminPage');if(!S.ready){page.innerHTML=`<div class="lock">${t('Loading…')}</div>`;return}
  if(!S.admin){if(S.mode==='supabase'){if(!fromData||!$('#loginF'))renderLogin(page)}else page.innerHTML=`<div class="lock panel"><h3>${t('Staff only')}</h3><p class="sub">${t('This area is for the Auto Engineer team. Ask the owner to give you access.')}</p><a class="btn" href="#home">${t('Back to home')}</a></div>`;return}
  if(S.seenOrders===null)S.seenOrders=new Set(Object.keys(S.data.orders||{}));
  const orders=visibleOrders(),sells=Store.all('sellRequests'),wss=Store.all('wholesalers');
  const tabs=[['orders','Orders',orders.filter(o=>o.status==='new'||o.status==='accepted').length,'orders'],['customers','Customers',0,'customers'],['parts','Parts catalog',0,'parts'],['sell','Sell requests',sells.filter(s=>s.status==='new').length,'sell'],['wholesalers','Wholesalers',wss.filter(w=>w.status==='pending').length,'wholesalers'],['staff','Staff',0,'staff'],['settings','Settings',0,'settings']].filter(x=>can(x[3]));
  if(!tabs.find(x=>x[0]===S.adminTab))S.adminTab=tabs[0][0];
  const focused=document.activeElement&&document.activeElement.id==='adminSearch';
  const who=S.staff?`${esc(S.staff.name||S.me)} · ${t(ROLES[S.role])}${S.staff.branch?' · '+esc((branches().find(b=>b.id===S.staff.branch)||{}).name||''):''}`:t(ROLES[S.role]||'Admin');
  page.innerHTML=`<div class="page-head"><div><span class="eyebrow">${t('Staff area')}</span><h1>${t('Control room')}</h1></div><div class="mini" style="text-align:end">${who}<br>${{supabase:t('Live database'),claude:t('Shared database'),local:t('Preview mode: data is saved in this browser only')}[S.mode]}${S.mode==='supabase'?` · <button class="linkbtn" id="logout">${t('Sign out')}</button>`:''}</div></div>
    <div class="tabs">${tabs.map(([k,l,n])=>`<button data-tab="${k}" class="${S.adminTab===k?'on':''}">${t(l)}${n?`<span class="n">${n}</span>`:''}</button>`).join('')}</div><div id="adminBody"></div>`;
  $('.tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){S.adminTab=b.dataset.tab;S.adminQ='';renderAdmin()}};
  if($('#logout'))$('#logout').onclick=async()=>{await S.sb.auth.signOut();location.hash='home'};
  ({orders:adminOrders,customers:adminCustomers,parts:adminParts,sell:adminSell,wholesalers:adminWs,staff:adminStaff,settings:adminSettings})[S.adminTab]();
  if(focused&&$('#adminSearch')){const i=$('#adminSearch');i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}
function renderLogin(page){
  page.innerHTML=`<form class="panel login" id="loginF"><h3>${t('Staff sign in')}</h3><p class="sub">${t('Sign in with the email your admin added to the staff list.')}</p>
    <div class="f"><label>${t('Email')}</label><input name="email" type="email" required dir="ltr" autocomplete="username"></div><div class="f"><label>${t('Password')}</label><input name="password" type="password" required dir="ltr" autocomplete="current-password" minlength="8"></div>
    <div class="err hidden" id="lgErr"></div><button class="btn red block" name="in">${t('Sign in')}</button>
    <p class="mini" style="margin-top:14px;text-align:center">${t('First time?')} <button type="button" class="linkbtn" id="lgNew">${t('Create your password')}</button></p></form>`;
  const f=$('#loginF'),err=$('#lgErr');
  f.onsubmit=async e=>{e.preventDefault();err.classList.add('hidden');const {error}=await S.sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value});
    if(error){err.textContent=t('Wrong email or password.');err.classList.remove('hidden');return}
    setTimeout(()=>{if(!S.admin){err.textContent=t('This email is not on the staff list. Ask your admin to add you.');err.classList.remove('hidden')}},1500)};
  $('#lgNew').onclick=async()=>{if(!f.email.value||f.password.value.length<8){err.textContent=t('Enter your email and a password of at least 8 characters, then press this again.');err.classList.remove('hidden');return}
    const {error}=await S.sb.auth.signUp({email:f.email.value.trim(),password:f.password.value});err.textContent=error?error.message:t('Account created. If asked, confirm your email, then sign in.');err.classList.remove('hidden')};
}
const searchBox=ph=>`<input type="search" id="adminSearch" placeholder="${esc(ph)}" value="${esc(S.adminQ||'')}">`;
function bindSearch(fn){const i=$('#adminSearch');if(i)i.oninput=()=>{S.adminQ=i.value;fn()}}
function visibleOrders(){const all=Store.all('orders');if(S.role==='sales'&&S.staff&&S.staff.branch)return all.filter(o=>!o.branch||o.branch===S.staff.branch);return all}
const brName=id=>(branches().find(b=>b.id===id)||{}).name||'';

function adminOrders(){
  const body=$('#adminBody');const all=visibleOrders().sort((a,b)=>b.createdAt-a.createdAt);const inv=all.filter(o=>['confirmed','delivered'].includes(o.status));
  const rev=inv.reduce((s,o)=>s+totals(o).net,0),out=inv.reduce((s,o)=>s+Math.max(0,totals(o).balance),0);
  S.oFilter=S.oFilter||'';S.oRoom=S.oRoom||'';S.oBr=S.oBr||'';S.oPay=S.oPay||'';
  body.innerHTML=`<div class="kpis"><div class="kpi"><small>${t('New / accepted')}</small><b>${all.filter(o=>o.status==='new'||o.status==='accepted').length}</b></div><div class="kpi"><small>${t('Awaiting customer')}</small><b>${all.filter(o=>o.status==='quoted').length}</b></div><div class="kpi"><small>${t('Invoiced value')}</small><b style="font-size:22px">${money(rev)}</b></div><div class="kpi"><small>${t('Outstanding balance')}</small><b style="font-size:22px;color:${out?'var(--red2)':'inherit'}">${money(out)}</b></div></div>
    <div class="toolbar">${searchBox(t('Search order no, name, phone, part…'))}<select class="sel" id="oF"><option value="">${t('All statuses')}</option>${Object.keys(STATUS_LABEL).map(k=>`<option value="${k}" ${S.oFilter===k?'selected':''}>${stl(k)}</option>`).join('')}</select>
    <select class="sel" id="oP"><option value="">${t('Any payment')}</option>${['unpaid','partial','paid'].map(k=>`<option value="${k}" ${S.oPay===k?'selected':''}>${t({unpaid:'Unpaid',partial:'Partly paid',paid:'Paid'}[k])}</option>`).join('')}</select>
    <select class="sel" id="oR"><option value="">${t('All rooms')}</option><option value="retail" ${S.oRoom==='retail'?'selected':''}>${t('Retail')}</option><option value="wholesale" ${S.oRoom==='wholesale'?'selected':''}>${t('Wholesale')}</option></select>
    ${branches().length&&S.role!=='sales'?`<select class="sel" id="oB"><option value="">${t('All branches')}</option>${branches().map(b=>`<option value="${esc(b.id)}" ${S.oBr===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select>`:''}</div>
    <div class="panel" style="padding:8px"><div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Order')}</th><th>${t('Date')}</th><th>${t('Customer')}</th><th>${t('Room')}</th><th>${t('Branch')}</th><th class="num">${t('Total')}</th><th>${t('Status')}</th></tr></thead><tbody id="oRows"></tbody></table></div></div>`;
  const draw=()=>{const q=(S.adminQ||'').toLowerCase();const rows=all.filter(o=>(!S.oFilter||o.status===S.oFilter)&&(!S.oRoom||o.room===S.oRoom)&&(!S.oBr||o.branch===S.oBr)&&(!S.oPay||payState(o)===S.oPay)&&(!q||[o.no,o.customer?.name,o.customer?.phone,o.customer?.location,o.quoteNo,o.invoiceNo,...(o.lines||[]).map(l=>l.name+' '+l.partNo)].join(' ').toLowerCase().includes(q)));
    $('#oRows').innerHTML=rows.length?rows.map(o=>{const ps=payState(o);const tt=totals(o);return `<tr class="click" data-o="${esc(o.id)}"><td><b class="ltr">${esc(o.no)}</b>${o.kind==='find'?` <span class="fp-badge sm">${t('FIND MY PART')}</span>`:''}${o.invoiceNo?`<br><span class="mini ltr">${esc(o.invoiceNo)}</span>`:o.quoteNo?`<br><span class="mini ltr">${esc(o.quoteNo)}</span>`:''}</td><td>${dateStr(o.createdAt)}</td><td>${esc(o.customer?.name)}<br><span class="mini"><span class="ltr">${esc(o.customer?.phone)}</span> · ${esc(o.customer?.location)}</span></td><td><span class="room-tag ${o.room==='wholesale'?'ws':''}">${t(o.room==='wholesale'?'Wholesale':'Retail')}</span></td><td class="mini">${o.fulfil==='pickup'?'🏬 ':'🚚 '}${esc(brName(o.branch))}</td><td class="num">${tt.total?money(tt.net):'—'}${ps?`<br><span class="pay ${ps}">${t({unpaid:'Unpaid',partial:'Partly paid',paid:'Paid'}[ps])}</span>`:''}</td><td><span class="st ${o.status}">${stl(o.status)}</span></td></tr>`}).join(''):`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">${t('No orders yet. New orders from the website appear here.')}</td></tr>`};
  draw();bindSearch(draw);
  [['oF','oFilter'],['oR','oRoom'],['oB','oBr'],['oP','oPay']].forEach(([id,k])=>{if($('#'+id))$('#'+id).onchange=e=>{S[k]=e.target.value;draw()}});
  $('#oRows').onclick=e=>{const r=e.target.closest('[data-o]');if(r)openOrder(r.dataset.o)};
}

let editing=null;
function openOrder(id){const o=Store.get('orders',id);if(!o)return;editing=clone(o);editing.id=id;editing.payments=editing.payments||[];editing.credits=editing.credits||[];editing.pdfLang=editing.pdfLang||editing.lang||'en';drawOrderModal()}
function drawOrderModal(){
  const o=editing;const cust=Store.get('customers','c_'+o.customer.phoneKey);const invd=['confirmed','delivered'].includes(o.status)&&o.invoiceNo;const tt=totals(o);
  openModal(`<div class="modal-head"><div><h3><span class="ltr">${esc(o.no)}</span> <span class="st ${o.status}" style="vertical-align:middle">${stl(o.status)}</span></h3><p class="mini">${dtStr(o.createdAt)} · <span class="room-tag ${o.room==='wholesale'?'ws':''}">${t(o.room==='wholesale'?'Wholesale':'Retail')}</span> · ${t('Customer language')}: ${LANGS[o.lang||'en'].native}${o.quoteNo?' · <span class="ltr">'+esc(o.quoteNo)+'</span>':''}${o.invoiceNo?' · <span class="ltr">'+esc(o.invoiceNo)+'</span>':''}</p></div><button class="x" data-mclose>×</button></div>
  <div class="modal-body">
    <div class="row3" style="margin-bottom:6px"><div class="f"><label>${t('Customer')}</label><input id="oc_name" value="${esc(o.customer.name)}"></div><div class="f"><label>${t('Phone')}</label><input id="oc_phone" value="${esc(o.customer.phone)}" dir="ltr"></div><div class="f"><label>${t('Location')}</label><input id="oc_loc" value="${esc(o.customer.location)}"></div></div>
    <div class="row3"><div class="f"><label>${t('Fulfilment')}</label><select id="o_ful"><option value="delivery" ${o.fulfil!=='pickup'?'selected':''}>${t('Delivery')}</option><option value="pickup" ${o.fulfil==='pickup'?'selected':''}>${t('Pick up from branch')}</option></select></div>
      <div class="f"><label>${t('Branch')}</label><select id="o_br" ${S.role==='sales'?'disabled':''}><option value="">—</option>${branches().map(b=>`<option value="${esc(b.id)}" ${o.branch===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="f"><label>${t('Status')}</label><select id="o_status">${Object.keys(STATUS_LABEL).map(k=>`<option value="${k}" ${o.status===k?'selected':''}>${stl(k)}</option>`).join('')}</select></div></div>
    ${findInfoHtml(o)}${o.comment&&o.kind!=='find'?`<div class="panel" style="padding:12px 14px;margin-bottom:14px;background:#FFF8E6;box-shadow:none"><b class="mini" style="color:#8a5a00">${t('CUSTOMER COMMENT')}</b><div style="margin-top:4px">${esc(o.comment)}</div></div>`:''}
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part')}</th><th style="width:80px">${t('Qty')}</th><th style="width:170px">${t('Availability')}</th><th style="width:150px">${t('Unit price')}</th><th class="num">${t('Line total')}</th><th></th></tr></thead><tbody>
    ${o.lines.map((l,i)=>`<tr><td><input data-l="${i}" data-k="name" value="${esc(l.name)}" style="font-weight:600"><div class="mini" style="margin-top:4px"><input data-l="${i}" data-k="partNo" value="${esc(l.partNo||'')}" placeholder="${esc(t('Part number'))}" dir="ltr" style="width:48%;display:inline-block;padding:4px 7px;font-size:12px"> ${esc(l.fit||'')}${l.custom?' · <b>'+t('custom request')+'</b>':''}</div></td>
      <td><input type="number" min="0" data-l="${i}" data-k="qty" value="${l.qty}"></td>
      <td><select data-l="${i}" data-k="avail">${['','available','order','unavailable'].map(a=>`<option value="${a}" ${l.avail===a?'selected':''}>${availLabel(a)}</option>`).join('')}</select></td>
      <td><input type="number" min="0" step="any" data-l="${i}" data-k="price" value="${l.price??''}" placeholder="${esc(t('Set price'))}">${nz(l.listPrice)&&l.listPrice!==l.price?`<div class="mini">${t('List')}: ${money(l.listPrice)}</div>`:''}</td>
      <td class="num">${l.avail==='unavailable'?'—':money((+l.price||0)*(+l.qty||0))}</td><td><button class="rm" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>
    <div style="display:flex;gap:10px;margin:10px 0 18px;flex-wrap:wrap"><button class="btn sm ghost" id="addLine">+ ${t('Add line')}</button><select class="sel" id="addFromCat" style="max-width:340px"><option value="">+ ${t('Add from catalog…')}</option>${Store.all('parts').sort((a,b)=>String(a.name).localeCompare(b.name)).map(p=>`<option value="${esc(p.id)}">${esc(p.partNo)} — ${esc(p.name)} (${esc(fitText(p))})</option>`).join('')}</select></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,340px);gap:24px">
      <div><div class="row2"><div class="f"><label>${t('Discount')}</label><div style="display:flex;gap:6px"><input type="number" min="0" step="any" id="o_disc" value="${o.discount||0}"><select id="o_dt" class="sel"><option value="pct" ${o.discountType!=='amt'?'selected':''}>%</option><option value="amt" ${o.discountType==='amt'?'selected':''}>${t(settings().currency)}</option></select></div></div><div class="f"><label>${t('Delivery fee')}</label><input type="number" min="0" step="any" id="o_del" value="${o.delivery||0}"></div></div>
        <div class="f"><label>${t('Notes on quotation / invoice')} <i>(${t('customer sees these')})</i></label><textarea id="o_notes">${esc(o.notes||'')}</textarea></div></div>
      <div class="totals" id="o_tot"></div></div>
    ${invd?`<div class="box"><h4>${t('Payments')} <span class="pay ${payState(o)}">${t({unpaid:'Unpaid',partial:'Partly paid',paid:'Paid'}[payState(o)])}</span></h4>
      ${o.payments.length?`<table class="tbl"><tbody>${o.payments.map((p,i)=>`<tr><td>${dtStr(p.at)}</td><td>${t(p.method)}</td><td class="mini">${esc(p.note||'')}</td><td class="num"><b>${money(p.amount)}</b></td><td>${can('delete')?`<button class="rm" data-pdel="${i}">✕</button>`:''}</td></tr>`).join('')}</tbody></table>`:`<p class="mini">${t('No payments recorded yet.')}</p>`}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:flex-end"><div class="f" style="margin:0;flex:1;min-width:120px"><label>${t('Amount')}</label><input type="number" min="0" step="any" id="pAmt" value="${Math.max(0,tt.balance)||''}"></div><div class="f" style="margin:0"><label>${t('Method')}</label><select id="pMeth" class="sel">${PAY_METHODS.map(m=>`<option value="${m}">${t(m)}</option>`).join('')}</select></div><div class="f" style="margin:0;flex:1;min-width:120px"><label>${t('Note')}</label><input id="pNote"></div><button class="btn green" id="pAdd">${t('Record payment')}</button></div></div>
    <div class="box"><h4>${t('Returns & credit notes')} <button class="btn sm ghost" id="cnNew">+ ${t('New credit note')}</button></h4>
      ${o.credits.length?`<table class="tbl"><tbody>${o.credits.map((c,i)=>`<tr><td class="ltr"><b>${esc(c.no)}</b></td><td>${dateStr(c.at)}</td><td class="mini">${esc(c.reason||'')}</td><td class="num">−${money(c.amount)}</td><td><button class="btn sm ghost" data-cnpdf="${i}">PDF</button></td></tr>`).join('')}</tbody></table>`:`<p class="mini">${t('No returns on this invoice.')}</p>`}</div>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;align-items:center;margin-top:18px;border-top:1px solid rgba(0,0,0,.08);padding-top:16px">
      <label class="mini">${t('Document language')} <select id="o_pl" class="sel">${Object.entries(LANGS).map(([k,v])=>`<option value="${k}" ${o.pdfLang===k?'selected':''}>${v.native}</option>`).join('')}</select></label>
      ${cust?`<button class="btn ghost" id="o_cust">${t('Customer profile')}</button>`:''}<a class="btn wa" id="o_wa" href="#" target="_blank" rel="noopener">WhatsApp</a>
      <button class="btn ghost" id="o_save">${t('Save')}</button><button class="btn" id="o_quote">${t('Quotation PDF')}</button><button class="btn red" id="o_inv">${t('Invoice PDF')}</button></div></div>`,true);
  const box=$('#modalBox');
  const drawTot=()=>{const x=totals(editing);$('#o_tot').innerHTML=`<div><span>${t('Subtotal')}</span><span>${money(x.sub)}</span></div><div><span>${t('Discount')}</span><span>−${money(x.disc)}</span></div><div><span>${t('Delivery')}</span><span>${money(x.del)}</span></div><div class="grand"><span>${t('Total')}</span><span>${money(x.total)}</span></div>${x.credit?`<div><span>${t('Credit notes')}</span><span>−${money(x.credit)}</span></div>`:''}${invd?`<div><span>${t('Paid')}</span><span>${money(x.paid)}</span></div><div><b>${x.balance<0?t('Refund due'):t('Balance due')}</b><b>${money(Math.abs(x.balance))}</b></div>`:''}`;$('#o_wa').href=waLink(editing)};
  drawTot();
  box.oninput=box.onchange=e=>{const el=e.target;
    if(el.dataset.l!==undefined){const l=editing.lines[+el.dataset.l];const k=el.dataset.k;l[k]=(k==='qty'||k==='price')?(el.value===''?null:Number(el.value)):el.value;if(e.type==='change'&&['avail','price','qty'].includes(k)){drawOrderModal();return}drawTot();return}
    const id=el.id;if(id==='o_disc')editing.discount=Number(el.value)||0;if(id==='o_dt')editing.discountType=el.value;if(id==='o_del')editing.delivery=Number(el.value)||0;if(id==='o_notes')editing.notes=el.value;if(id==='o_status')editing.status=el.value;
    if(id==='o_ful')editing.fulfil=el.value;if(id==='o_br')editing.branch=el.value;if(id==='o_pl')editing.pdfLang=el.value;
    if(id==='oc_name')editing.customer.name=el.value;if(id==='oc_phone'){editing.customer.phone=el.value;editing.customer.phoneKey=phoneKey(el.value)}if(id==='oc_loc')editing.customer.location=el.value;
    if(id==='addFromCat'&&el.value){const p=Store.get('parts',el.value);editing.lines.push({partId:p.id,partNo:p.partNo,name:p.name,fit:fitText(p),qty:1,price:priceFor(p,editing.room),listPrice:priceFor(p,editing.room),avail:''});drawOrderModal();return}
    drawTot()};
  box.onclick=async e=>{const d=e.target.closest('[data-del]');if(d){editing.lines.splice(+d.dataset.del,1);drawOrderModal();return}
    const pd=e.target.closest('[data-pdel]');if(pd){editing.payments.splice(+pd.dataset.pdel,1);await saveOrder();drawOrderModal();return}
    const cp=e.target.closest('[data-cnpdf]');if(cp){makePdf(editing,'credit',editing.credits[+cp.dataset.cnpdf]);return}
    if(e.target.id==='addLine'){editing.lines.push({partId:null,partNo:'',name:t('New item'),fit:'',qty:1,price:null,listPrice:null,avail:''});drawOrderModal()}};
  $('#o_save').onclick=async()=>{await saveOrder();toast(t('Order saved'))};
  $('#o_quote').onclick=async()=>{try{if(!editing.quoteNo)editing.quoteNo=await API.nextNo('quote');if(editing.status==='new')setStatus('quoted');editing.quotedAt=editing.quotedAt||Date.now();await saveOrder();makePdf(editing,'quote')}catch(_){}};
  $('#o_inv').onclick=async()=>{if(editing.lines.some(l=>l.avail!=='unavailable'&&!nz(l.price))){toast(t('Set a price for every available line first'));return}
    try{if(!editing.invoiceNo)editing.invoiceNo=await API.nextNo('invoice');if(!['confirmed','delivered'].includes(editing.status))setStatus('confirmed');editing.invoicedAt=editing.invoicedAt||Date.now();await saveOrder();makePdf(editing,'invoice')}catch(_){}};
  if($('#o_cust'))$('#o_cust').onclick=()=>openCustomer('c_'+editing.customer.phoneKey);
  if($('#pAdd'))$('#pAdd').onclick=async()=>{const a=Number($('#pAmt').value);if(!(a>0)){toast(t('Enter an amount'));return}editing.payments.push({at:Date.now(),amount:a,method:$('#pMeth').value,note:$('#pNote').value,by:S.me||''});await saveOrder();toast(t('Payment recorded'));drawOrderModal()};
  if($('#cnNew'))$('#cnNew').onclick=openCreditNote;
}
function setStatus(s){editing.status=s;editing.log=[...(editing.log||[]),{at:Date.now(),s}]}
async function saveOrder(){const prev=Store.get('orders',editing.id);if(prev&&prev.status!==editing.status&&!(editing.log||[]).some(x=>x.s===editing.status&&Date.now()-x.at<5000))editing.log=[...(editing.log||[]),{at:Date.now(),s:editing.status}];
  editing.updatedAt=Date.now();const data={...editing};delete data.pdfLang;data.pdfLang=editing.pdfLang;
  try{await Store.set('orders',editing.id,data);const c=Store.get('customers','c_'+editing.customer.phoneKey);if(!c||c.name!==editing.customer.name||c.location!==editing.customer.location)await API.upsertCustomer({...editing,createdAt:editing.createdAt})}catch(_){}}
function openCreditNote(){
  const o=editing;const returned=i=>o.credits.reduce((s,c)=>s+((c.lines||[]).find(x=>x.i===i)?.qty||0),0);
  const lines=o.lines.map((l,i)=>({...l,i,left:(+l.qty||0)-returned(i)})).filter(l=>l.avail!=='unavailable'&&l.left>0);
  openModal(mHead(t('New credit note'),esc(o.invoiceNo))+`<div class="modal-body"><form id="cnF"><table class="tbl"><thead><tr><th>${t('Part')}</th><th class="num">${t('Sold')}</th><th style="width:110px">${t('Return qty')}</th><th class="num">${t('Unit price')}</th></tr></thead><tbody>
    ${lines.map(l=>`<tr><td><b>${esc(l.name)}</b><br><span class="mini ltr">${esc(l.partNo)}</span></td><td class="num">${l.left}</td><td><input type="number" min="0" max="${l.left}" value="0" data-i="${l.i}" data-p="${l.price}"></td><td class="num">${money(l.price)}</td></tr>`).join('')||`<tr><td colspan="4" class="mini">${t('Nothing left to return on this invoice.')}</td></tr>`}</tbody></table>
    <div class="row2" style="margin-top:14px"><div class="f"><label>${t('Reason')}</label><input name="reason" required placeholder="${esc(t('Wrong part, damaged, not needed…'))}"></div><div class="f"><label>${t('Settlement')}</label><select name="settle"><option value="refund">${t('Cash refund')}</option><option value="credit">${t('Credit for next order')}</option></select></div></div>
    <div class="f"><label>${t('Restocking fee')} <i>(${t('optional')})</i></label><input name="fee" type="number" min="0" value="0"></div>
    <p style="margin:6px 0 14px"><b>${t('Credit amount')}: <span id="cnAmt">${money(0)}</span></b></p>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn ghost" id="cnBack">${t('Back to order')}</button><button class="btn red">${t('Create credit note')}</button></div></form></div>`,true);
  const f=$('#cnF');const calc=()=>{let s=0;$$('#cnF [data-i]').forEach(x=>s+=(+x.value||0)*(+x.dataset.p||0));if(o.discountType!=='amt'&&o.discount)s*=1-(+o.discount)/100;s=Math.max(0,s-(+f.fee.value||0));$('#cnAmt').textContent=money(s);return s};
  f.oninput=calc;$('#cnBack').onclick=drawOrderModal;
  f.onsubmit=async e=>{e.preventDefault();const amt=calc();const rl=$$('#cnF [data-i]').filter(x=>+x.value>0).map(x=>({i:+x.dataset.i,qty:Math.min(+x.value,+x.max),price:+x.dataset.p}));if(!rl.length||amt<=0){toast(t('Choose at least one item to return'));return}
    try{const no=await API.nextNo('credit');const cn={no,at:Date.now(),lines:rl,amount:Math.round(amt*100)/100,fee:+f.fee.value||0,reason:f.reason.value,settle:f.settle.value,by:S.me||''};editing.credits.push(cn);
      if(cn.settle==='refund'){const tt=totals(editing);if(tt.balance<0)editing.payments.push({at:Date.now(),amount:tt.balance,method:'Cash',note:t('Refund')+' '+no,by:S.me||''})}
      await saveOrder();toast(t('Credit note created'));makePdf(editing,'credit',cn)}catch(_){}};
}
function waLink(o){const L=o.pdfLang||o.lang||'en';const s=settings();const x=totals(o);const lines=o.lines.filter(l=>l.avail!=='unavailable').map(l=>`• ${l.name}${l.partNo?' ('+l.partNo+')':''} × ${l.qty}${nz(l.price)?' — '+money(l.price*l.qty,L):''}${l.avail?' ['+availLabel(l.avail,L)+']':''}`).join('\n');
  const un=o.lines.filter(l=>l.avail==='unavailable').map(l=>`• ${l.name}`).join('\n');
  const msg=`${t('Hello {n},',{n:o.customer.name},L)}\n\n${t('Thank you for your order {no} with {c}.',{no:o.no,c:s.company},L)}\n\n${lines}${un?`\n\n${t('Not available',null,L)}:\n${un}`:''}\n\n${t('Subtotal',null,L)}: ${money(x.sub,L)}${x.disc?`\n${t('Discount',null,L)}: −${money(x.disc,L)}`:''}${x.del?`\n${t('Delivery',null,L)}: ${money(x.del,L)}`:''}\n${t('Total',null,L)}: ${money(x.total,L)}${x.paid?`\n${t('Balance due',null,L)}: ${money(Math.max(0,x.balance),L)}`:''}\n\n${t('Track and accept your order on our website with order number {no}.',{no:o.no},L)}`;
  return `https://wa.me/${o.customer.phoneKey}?text=${encodeURIComponent(msg)}`}

/* customers */
function custOrders(pk){return Store.all('orders').filter(o=>o.customer?.phoneKey===pk).sort((a,b)=>b.createdAt-a.createdAt)}
function custStats(pk){const os=custOrders(pk);const inv=os.filter(o=>['confirmed','delivered'].includes(o.status));return {os,inv,spent:inv.reduce((s,o)=>s+totals(o).net,0),owed:inv.reduce((s,o)=>s+Math.max(0,totals(o).balance),0)}}
function adminCustomers(){
  const body=$('#adminBody');
  body.innerHTML=`<div class="toolbar">${searchBox(t('Search name, phone, location, company…'))}<select class="sel" id="cT"><option value="">${t('All types')}</option><option value="retail">${t('Retail')}</option><option value="wholesale">${t('Wholesale')}</option></select><select class="sel" id="cO"><option value="">${t('All customers')}</option><option value="owe">${t('With balance due')}</option></select></div>
    <div class="panel" style="padding:8px"><div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Customer')}</th><th>${t('Location')}</th><th>${t('Type')}</th><th class="num">${t('Orders')}</th><th class="num">${t('Purchased')}</th><th class="num">${t('Balance due')}</th><th>${t('Last order')}</th></tr></thead><tbody id="cRows"></tbody></table></div></div>`;
  const draw=()=>{const q=(S.adminQ||'').toLowerCase();const ty=$('#cT').value,ow=$('#cO').value;
    const rows=Store.all('customers').filter(c=>(!ty||c.type===ty)&&(!q||[c.name,c.phone,c.location,c.company].join(' ').toLowerCase().includes(q))).map(c=>({...c,...custStats(c.phoneKey)})).filter(c=>!ow||c.owed>0).sort((a,b)=>(b.lastAt||0)-(a.lastAt||0));
    $('#cRows').innerHTML=rows.length?rows.map(c=>`<tr class="click" data-c="${esc(c.id)}"><td><b>${esc(c.name)}</b>${c.company?` · ${esc(c.company)}`:''}<br><span class="mini ltr">${esc(c.phone)}</span></td><td>${esc(c.location)}</td><td><span class="room-tag ${c.type==='wholesale'?'ws':''}">${t(c.type==='wholesale'?'Wholesale':'Retail')}</span></td><td class="num">${c.os.length}</td><td class="num">${money(c.spent)}</td><td class="num" style="${c.owed?'color:var(--red2);font-weight:700':''}">${c.owed?money(c.owed):'—'}</td><td>${dateStr(c.lastAt)}</td></tr>`).join(''):`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">${t('Customers are created automatically when they place an order.')}</td></tr>`};
  draw();bindSearch(draw);$('#cT').onchange=draw;$('#cO').onchange=draw;$('#cRows').onclick=e=>{const r=e.target.closest('[data-c]');if(r)openCustomer(r.dataset.c)};
}
function openCustomer(id){
  const c=Store.get('customers',id);if(!c)return;const {os,inv,spent,owed}=custStats(c.phoneKey);
  const items=inv.flatMap(o=>o.lines.filter(l=>l.avail!=='unavailable').map(l=>({...l,o})));const pays=inv.flatMap(o=>(o.payments||[]).map(p=>({...p,o}))).sort((a,b)=>b.at-a.at);
  openModal(mHead(esc(c.name)+(c.company?' · '+esc(c.company):''),`<span class="ltr">${esc(c.phone)}</span> · ${esc(c.location)} · ${t('customer since')} ${dateStr(c.firstAt)}`)+`<div class="modal-body">
    <div class="kpis"><div class="kpi"><small>${t('Orders')}</small><b>${os.length}</b></div><div class="kpi"><small>${t('Invoices')}</small><b>${inv.length}</b></div><div class="kpi"><small>${t('Total purchased')}</small><b style="font-size:20px">${money(spent)}</b></div><div class="kpi"><small>${t('Balance due')}</small><b style="font-size:20px;color:${owed?'var(--red2)':'inherit'}">${money(owed)}</b></div></div>
    <div class="row3"><div class="f"><label>${t('Type')}</label><select id="cu_type"><option value="retail" ${c.type!=='wholesale'?'selected':''}>${t('Retail')}</option><option value="wholesale" ${c.type==='wholesale'?'selected':''}>${t('Wholesale')}</option></select></div><div class="f"><label>${t('Company')}</label><input id="cu_co" value="${esc(c.company||'')}"></div><div class="f"><label>&nbsp;</label><a class="btn wa" href="https://wa.me/${esc(c.phoneKey)}" target="_blank" rel="noopener">WhatsApp</a></div></div>
    <div class="f"><label>${t('Internal notes')} <i>(${t('not shown to customer')})</i></label><textarea id="cu_notes">${esc(c.notes||'')}</textarea></div><button class="btn sm" id="cu_save">${t('Save profile')}</button>
    <h3 style="margin:24px 0 8px;font-family:var(--display)">${t('Order history')}</h3>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Order')}</th><th>${t('Date')}</th><th>${t('Documents')}</th><th class="num">${t('Total')}</th><th class="num">${t('Balance due')}</th><th>${t('Status')}</th></tr></thead><tbody>${os.map(o=>{const x=totals(o);const ps=payState(o);return `<tr class="click" data-o="${esc(o.id)}"><td><b class="ltr">${esc(o.no)}</b></td><td>${dateStr(o.createdAt)}</td><td class="mini ltr">${[o.quoteNo,o.invoiceNo,...(o.credits||[]).map(c=>c.no)].filter(Boolean).map(esc).join(' · ')||'—'}</td><td class="num">${x.total?money(x.net):'—'}</td><td class="num">${ps?(ps==='paid'?`<span class="pay paid">${t('Paid')}</span>`:money(Math.max(0,x.balance))):'—'}</td><td><span class="st ${o.status}">${stl(o.status)}</span></td></tr>`}).join('')||`<tr><td colspan="6" class="mini">${t('No orders')}</td></tr>`}</tbody></table></div>
    <h3 style="margin:24px 0 8px;font-family:var(--display)">${t('Purchased items')}</h3>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Date')}</th><th>${t('Invoice')}</th><th>${t('Part number')}</th><th>${t('Description')}</th><th class="num">${t('Qty')}</th><th class="num">${t('Unit price')}</th><th class="num">${t('Total')}</th></tr></thead><tbody>${items.map(l=>`<tr><td>${dateStr(l.o.invoicedAt||l.o.createdAt)}</td><td class="mini ltr">${esc(l.o.invoiceNo||l.o.no)}</td><td class="mini ltr">${esc(l.partNo)}</td><td>${esc(l.name)}</td><td class="num">${l.qty}</td><td class="num">${money(l.price)}</td><td class="num">${money((+l.price||0)*l.qty)}</td></tr>`).join('')||`<tr><td colspan="7" class="mini">${t('No invoiced purchases yet')}</td></tr>`}</tbody></table></div>
    <h3 style="margin:24px 0 8px;font-family:var(--display)">${t('Payments')}</h3>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Date')}</th><th>${t('Invoice')}</th><th>${t('Method')}</th><th>${t('Note')}</th><th class="num">${t('Amount')}</th></tr></thead><tbody>${pays.map(p=>`<tr><td>${dtStr(p.at)}</td><td class="mini ltr">${esc(p.o.invoiceNo)}</td><td>${t(p.method)}</td><td class="mini">${esc(p.note||'')}</td><td class="num">${money(p.amount)}</td></tr>`).join('')||`<tr><td colspan="5" class="mini">${t('No payments recorded yet.')}</td></tr>`}</tbody></table></div></div>`,true);
  $('#cu_save').onclick=async()=>{try{await Store.set('customers',id,{...Store.get('customers',id),type:$('#cu_type').value,company:$('#cu_co').value,notes:$('#cu_notes').value});toast(t('Profile saved'))}catch(_){}};
  $$('#modalBox [data-o]').forEach(r=>r.onclick=()=>openOrder(r.dataset.o));
}

/* parts */
function adminParts(){
  const body=$('#adminBody');
  body.innerHTML=`<div class="toolbar">${searchBox(t('Search part number, name, model…'))}<button class="btn red" id="pAddB">+ ${t('Add part')}</button><label class="btn ghost" style="cursor:pointer">${t('Import Excel / CSV')}<input type="file" id="pImp" accept=".xlsx,.xls,.csv" hidden></label></div>
    <p class="mini" style="margin:-6px 0 14px">${t('Import columns')}: <b class="ltr">PartNo, Name, NameAr, NameKu, Brand, Make, Model, YearFrom, YearTo, Category, Condition, RetailPrice, WholesalePrice, Stock</b>. ${t('Existing part numbers are updated. Leave prices empty to show “Price on request”.')}</p>
    <div class="panel" style="padding:8px"><div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Part number')}</th><th>${t('Name')}</th><th>${t('Fits')}</th><th>${t('Category')}</th><th class="num">${t('Retail')}</th><th class="num">${t('Wholesale')}</th><th>${t('Stock')}</th><th></th></tr></thead><tbody id="pRows"></tbody></table></div></div>`;
  const draw=()=>{const q=(S.adminQ||'').toLowerCase();const rows=Store.all('parts').filter(p=>!q||[p.partNo,p.name,p.nameAr,p.nameKu,p.make,p.model,p.brand,p.category].join(' ').toLowerCase().includes(q)).sort((a,b)=>String(a.name).localeCompare(b.name));
    $('#pRows').innerHTML=rows.length?rows.slice(0,500).map(p=>`<tr class="click" data-p="${esc(p.id)}"><td class="mini ltr"><b>${esc(p.partNo)}</b></td><td>${esc(pName(p))}${p.hidden?` <span class="mini">(${t('hidden')})</span>`:''}</td><td class="mini">${esc(fitText(p))}</td><td>${t(p.category||'')}</td><td class="num">${nz(p.retailPrice)?money(p.retailPrice):'—'}</td><td class="num">${nz(p.wholesalePrice)?money(p.wholesalePrice):'—'}</td><td class="mini">${t(p.stock||'')}</td><td>${can('delete')?`<button class="rm" data-pdel="${esc(p.id)}">${t('Delete')}</button>`:''}</td></tr>`).join(''):`<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">${t('No parts yet. Add one or import your Excel list.')}</td></tr>`};
  draw();bindSearch(draw);$('#pAddB').onclick=()=>openPart();
  $('#pRows').onclick=e=>{const d=e.target.closest('[data-pdel]');if(d){e.stopPropagation();confirmBox(t('Delete this part from the catalog?'),async()=>{await Store.del('parts',d.dataset.pdel).catch(()=>{});toast(t('Part deleted'))});return}const r=e.target.closest('[data-p]');if(r)openPart(r.dataset.p)};
  $('#pImp').onchange=e=>importParts(e.target.files[0]);
}
function confirmBox(msg,fn){openModal(mHead(t('Are you sure?'))+`<div class="modal-body"><p style="margin-bottom:18px">${esc(msg)}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-mclose>${t('Cancel')}</button><button class="btn red" id="cfOk">${t('Confirm')}</button></div></div>`);$$('#modalBox [data-mclose]').forEach(b=>b.onclick=closeModal);$('#cfOk').onclick=()=>{closeModal();fn()}}
function openPart(id,prefill){
  const p=id?Store.get('parts',id):(prefill||{make:'Toyota',condition:'Genuine',stock:'In stock'});let img=p.image||'';const v=k=>esc(p[k]??'');
  openModal(mHead(id?t('Edit part'):t('Add part'))+`<div class="modal-body"><form id="pF">
    <div class="row2"><div class="f"><label>${t('Part number')}</label><input name="partNo" required value="${v('partNo')}" dir="ltr"></div><div class="f"><label>${t('Name')} (English)</label><input name="name" required value="${v('name')}"></div></div>
    <div class="row2"><div class="f"><label>${t('Name')} (العربية)</label><input name="nameAr" value="${v('nameAr')}" dir="rtl"></div><div class="f"><label>${t('Name')} (کوردی)</label><input name="nameKu" value="${v('nameKu')}" dir="rtl"></div></div>
    <div class="row3"><div class="f"><label>${t('Make')}</label><input name="make" value="${v('make')}" list="makesL"></div><div class="f"><label>${t('Model')}</label><input name="model" value="${v('model')}" list="modelsL"></div><div class="f"><label>${t('Brand')}</label><input name="brand" value="${v('brand')}" placeholder="Toyota Genuine, Denso…"></div></div>
    <div class="row3"><div class="f"><label>${t('Year from')}</label><input name="yearFrom" type="number" value="${v('yearFrom')}"></div><div class="f"><label>${t('Year to')}</label><input name="yearTo" type="number" value="${v('yearTo')}"></div><div class="f"><label>${t('Category')}</label><select name="category">${CATS.map(([c])=>`<option value="${c}" ${p.category===c?'selected':''}>${t(c)}</option>`).join('')}</select></div></div>
    <div class="row3"><div class="f"><label>${t('Condition')}</label><select name="condition">${CONDS.map(c=>`<option value="${c}" ${p.condition===c?'selected':''}>${t(c)}</option>`).join('')}</select></div><div class="f"><label>${t('Retail price')} <i>(${t('empty = on request')})</i></label><input name="retailPrice" type="number" step="any" value="${v('retailPrice')}"></div><div class="f"><label>${t('Wholesale price')}</label><input name="wholesalePrice" type="number" step="any" value="${v('wholesalePrice')}"></div></div>
    <div class="row2"><div class="f"><label>${t('Stock')}</label><select name="stock">${STOCKS.map(c=>`<option value="${c}" ${p.stock===c?'selected':''}>${t(c)}</option>`).join('')}</select></div><div class="f"><label>${t('Visibility')}</label><select name="hidden"><option value="">${t('Shown on website')}</option><option value="1" ${p.hidden?'selected':''}>${t('Hidden')}</option></select></div></div>
    <div class="f"><label>${t('Description')} <i>(${t('optional')})</i></label><textarea name="desc">${v('desc')}</textarea></div>
    <div class="f"><label>${t('Photo')}</label><input type="file" accept="image/*" id="pImg"><div class="thumbs" id="pThumb">${img?`<img src="${esc(img)}">`:''}</div></div>
    <button class="btn red block">${t('Save part')}</button></form><datalist id="makesL"><option value="Toyota"></datalist><datalist id="modelsL"><option value="All models">${(window.TOYOTA_MODELS||[]).map(m=>`<option value="${m.name}">`).join('')}</datalist></div>`);
  $('#pImg').onchange=async e=>{if(e.target.files[0]){img=await compressImg(e.target.files[0],700,.7);$('#pThumb').innerHTML=`<img src="${img}">`}};
  $('#pF').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));const num=x=>x===''||x==null?null:Number(x);
    const data={...fd,yearFrom:num(fd.yearFrom),yearTo:num(fd.yearTo),retailPrice:num(fd.retailPrice),wholesalePrice:num(fd.wholesalePrice),hidden:!!fd.hidden,image:img,updatedAt:Date.now(),createdAt:p.createdAt||Date.now()};const nid=id||partId(fd.partNo);
    try{await Store.set('parts',nid,data);if(prefill&&prefill._sellId){const s=Store.get('sellRequests',prefill._sellId);if(s)await Store.set('sellRequests',s.id,{...s,status:'bought',listedPart:nid})}closeModal();toast(t('Part saved'))}catch(_){}};
}
async function importParts(file){
  if(!file)return;if(!window.XLSX){toast(t('Excel reader still loading. Try again in a moment.'));return}
  const wb=XLSX.read(await file.arrayBuffer());const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});const norm=s=>String(s).toLowerCase().replace(/[^a-z]/g,'');
  const map={partno:'partNo',partnumber:'partNo',number:'partNo',pn:'partNo',name:'name',description:'name',partname:'name',namear:'nameAr',arabic:'nameAr',nameku:'nameKu',kurdish:'nameKu',brand:'brand',make:'make',model:'model',yearfrom:'yearFrom',from:'yearFrom',yearto:'yearTo',to:'yearTo',category:'category',condition:'condition',retailprice:'retailPrice',retail:'retailPrice',price:'retailPrice',wholesaleprice:'wholesalePrice',wholesale:'wholesalePrice',stock:'stock'};
  const items=rows.map(r=>{const o={};Object.entries(r).forEach(([k,v])=>{const f=map[norm(k)];if(f)o[f]=typeof v==='string'?v.trim():v});return o}).filter(o=>o.partNo&&o.name);
  if(!items.length){toast(t('No rows with PartNo and Name found'));return}
  openModal(mHead(t('Importing parts'))+`<div class="modal-body"><p id="impP">0 / ${items.length}</p></div>`);
  const num=x=>x===''||x==null?null:(Number(String(x).replace(/[^0-9.]/g,''))||null);let n=0;
  if(S.mode==='supabase'){for(let i=0;i<items.length;i+=200){const batch=items.slice(i,i+200).map(it=>{const id=partId(it.partNo);const ex=Store.get('parts',id)||{};return {col:'parts',id,data:buildPart(it,ex,num)}});const {error}=await S.sb.from('docs').upsert(batch);if(error){toast(error.message);break}batch.forEach(b=>S.data.parts[b.id]=b.data);n+=batch.length;$('#impP').textContent=`${n} / ${items.length}`}Store.emit('parts')}
  else for(const it of items){const id=partId(it.partNo);const ex=Store.get('parts',id)||{};try{await Store.set('parts',id,buildPart(it,ex,num))}catch(e){break}n++;if(n%10===0)$('#impP').textContent=`${n} / ${items.length}`}
  closeModal();toast(t('Imported {n} parts',{n}));
}
function buildPart(it,ex,num){const cat=CATS.find(([c])=>c.toLowerCase()===String(it.category||'').toLowerCase());const cond=CONDS.find(c=>c.toLowerCase()===String(it.condition||'').toLowerCase());
  return {...ex,...it,make:it.make||ex.make||'Toyota',category:cat?cat[0]:(ex.category||'Engine'),yearFrom:num(it.yearFrom),yearTo:num(it.yearTo),retailPrice:num(it.retailPrice),wholesalePrice:num(it.wholesalePrice),condition:cond||ex.condition||'Genuine',stock:STOCKS.find(s=>s.toLowerCase()===String(it.stock||'').toLowerCase())||ex.stock||'Ask',updatedAt:Date.now(),createdAt:ex.createdAt||Date.now()}}

/* sell requests */
function adminSell(){
  const body=$('#adminBody');S.sF=S.sF??'';const SST={new:'New',contacted:'Contacted',bought:'Bought',rejected:'Rejected'};
  body.innerHTML=`<div class="toolbar">${searchBox(t('Search part, seller, phone…'))}<select class="sel" id="sF"><option value="">${t('All')}</option>${Object.keys(SST).map(s=>`<option value="${s}" ${S.sF===s?'selected':''}>${t(SST[s])}</option>`).join('')}</select></div><div id="sList"></div>`;
  const draw=()=>{const q=(S.adminQ||'').toLowerCase();const rows=Store.all('sellRequests').filter(s=>(!S.sF||s.status===S.sF)&&(!q||[s.partName,s.partNo,s.name,s.phone,s.make,s.model].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.createdAt-a.createdAt);
    $('#sList').innerHTML=rows.length?rows.map(s=>{const L=s.lang||'en';return `<div class="sellcard"><div class="ph">${(s.photos||[]).map(p=>`<img src="${esc(p)}">`).join('')||`<div class="pimg" style="grid-column:span 2;border-radius:8px">${icon('Engine',1.2)}</div>`}</div>
      <div><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b style="font-size:16px">${esc(s.partName)}</b> <span class="mini ltr">${esc(s.partNo||'')}</span><br><span class="mini">${esc([s.make,s.model,s.year].filter(Boolean).join(' '))} · ${t(s.condition||'')} · ${t('Qty')} ${esc(s.qty)}${s.asking?' · '+t('asking')+' '+money(s.asking):''}</span></div><span class="st ${s.status}">${t(SST[s.status]||s.status)}</span></div>
      <p style="margin:8px 0;font-size:14px"><b>${esc(s.name)}</b> · <span class="ltr">${esc(s.phone)}</span> · ${esc(s.location)} · <span class="mini">${dtStr(s.createdAt)}</span></p>${s.comment?`<p class="mini" style="margin-bottom:8px">“${esc(s.comment)}”</p>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="sel" style="width:150px" type="number" placeholder="${esc(t('Our offer'))}" data-offer="${esc(s.id)}" value="${esc(s.offer||'')}"><select class="sel" data-sst="${esc(s.id)}">${Object.keys(SST).map(x=>`<option value="${x}" ${s.status===x?'selected':''}>${t(SST[x])}</option>`).join('')}</select>
      <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${esc(s.phoneKey)}?text=${encodeURIComponent(t('Hello {n}, this is {c} about the {p} you offered.',{n:s.name,c:settings().company,p:s.partName},L)+(s.offer?' '+t('We can offer {x}.',{x:money(s.offer,L)},L):''))}">WhatsApp</a>
      ${can('parts')?`<button class="btn sm ghost" data-list="${esc(s.id)}">${t('Add to catalog')}</button>`:''}${can('delete')?`<button class="rm" data-sdel="${esc(s.id)}">${t('Delete')}</button>`:''}</div></div></div>`}).join(''):`<div class="empty">${t('No sell requests yet.')}</div>`};
  draw();bindSearch(draw);$('#sF').onchange=e=>{S.sF=e.target.value;draw()};
  $('#sList').onchange=async e=>{const el=e.target;const id=el.dataset.offer||el.dataset.sst;if(!id)return;const s=Store.get('sellRequests',id);if(el.dataset.offer)s.offer=el.value;else s.status=el.value;try{await Store.set('sellRequests',id,s);toast(t('Updated'))}catch(_){}};
  $('#sList').onclick=e=>{const l=e.target.closest('[data-list]');if(l){const s=Store.get('sellRequests',l.dataset.list);openPart(null,{partNo:s.partNo||('USED-'+rid(5)),name:s.partName,make:s.make,model:s.model,yearFrom:+s.year||null,yearTo:+s.year||null,condition:'Used',stock:'In stock',image:(s.photos||[])[0]||'',category:'Engine',_sellId:s.id})}
    const d=e.target.closest('[data-sdel]');if(d)confirmBox(t('Delete this sell request?'),()=>Store.del('sellRequests',d.dataset.sdel).catch(()=>{}))};
}

/* wholesalers */
const newPin=()=>String(Math.floor(100000+Math.random()*900000));
function adminWs(){
  const body=$('#adminBody');const WST={pending:'Pending',approved:'Approved',rejected:'Rejected'};
  body.innerHTML=`<div class="toolbar">${searchBox(t('Search business, name, phone…'))}<button class="btn" id="wAdd">+ ${t('Add wholesaler')}</button></div><div class="panel" style="padding:8px"><div class="tblwrap"><table class="tbl"><thead><tr><th>${t('Business')}</th><th>${t('Contact')}</th><th>${t('Location')}</th><th>${t('Applied')}</th><th>${t('Status')}</th><th>${t('PIN')}</th><th></th></tr></thead><tbody id="wRows"></tbody></table></div></div>`;
  const draw=()=>{const q=(S.adminQ||'').toLowerCase();const rows=Store.all('wholesalers').filter(w=>!q||[w.company,w.name,w.phone,w.location].join(' ').toLowerCase().includes(q)).sort((a,b)=>(a.status==='pending'?-1:1)-(b.status==='pending'?-1:1)||b.createdAt-a.createdAt);
    $('#wRows').innerHTML=rows.length?rows.map(w=>`<tr><td><b>${esc(w.company)}</b><br><span class="mini">${t(w.btype||'')}</span></td><td>${esc(w.name)}<br><span class="mini ltr">${esc(w.phone)}</span></td><td>${esc(w.location)}</td><td>${dateStr(w.createdAt)}</td><td><span class="st ${w.status}">${t(WST[w.status]||w.status)}</span></td><td class="ltr mini">${w.status==='approved'?`<b>${esc(w.pin||'—')}</b>`:'—'}</td>
      <td style="white-space:nowrap">${w.status!=='approved'?`<button class="btn sm green" data-wa="${esc(w.id)}">${t('Approve')}</button> `:`<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${esc(w.phoneKey)}?text=${encodeURIComponent(t('Hello {n}, your {c} wholesale account is approved. Sign in on our website with your phone number and PIN: {pin}',{n:w.name,c:settings().company,pin:w.pin||''},w.lang||'en'))}">${t('Send PIN')}</a> <button class="btn sm ghost" data-wp="${esc(w.id)}">${t('New PIN')}</button> `}${w.status!=='rejected'?`<button class="btn sm ghost" data-wr="${esc(w.id)}">${w.status==='approved'?t('Suspend'):t('Reject')}</button>`:''}</td></tr>`).join(''):`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">${t('No wholesale applications yet.')}</td></tr>`};
  draw();bindSearch(draw);
  $('#wRows').onclick=async e=>{const a=e.target.closest('[data-wa]'),r=e.target.closest('[data-wr]'),p=e.target.closest('[data-wp]');const el=a||r||p;if(!el)return;const id=el.dataset.wa||el.dataset.wr||el.dataset.wp;const w=Store.get('wholesalers',id);
    if(a){w.status='approved';w.pin=w.pin||newPin()}else if(r)w.status='rejected';else w.pin=newPin();w.reviewedAt=Date.now();
    try{await Store.set('wholesalers',id,w);if(a){const ck='c_'+w.phoneKey;const c=Store.get('customers',ck)||{};await Store.set('customers',ck,{...c,name:c.name||w.name,phone:c.phone||w.phone,phoneKey:w.phoneKey,location:c.location||w.location,company:w.company,type:'wholesale',lang:w.lang||c.lang||'en',firstAt:c.firstAt||Date.now(),lastAt:c.lastAt||null,notes:c.notes||''})}toast(a?t('Approved. Send the PIN on WhatsApp.'):t('Updated'))}catch(_){}};
  $('#wAdd').onclick=()=>{openModal(mHead(t('Add wholesaler'))+`<div class="modal-body"><form id="wF"><div class="row2"><div class="f"><label>${t('Business name')}</label><input name="company" required></div><div class="f"><label>${t('Contact name')}</label><input name="name" required></div></div><div class="row2"><div class="f"><label>${t('Phone')}</label><input name="phone" required dir="ltr"></div><div class="f"><label>${t('Location')}</label><input name="location" list="cities"></div></div><button class="btn red block">${t('Add & approve')}</button></form>${citiesList()}</div>`);
    $('#wF').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));const k=phoneKey(fd.phone);try{await Store.set('wholesalers','w_'+k,{...fd,phoneKey:k,btype:'',status:'approved',pin:newPin(),lang:LANG,createdAt:Date.now(),reviewedAt:Date.now()});closeModal();toast(t('Approved. Send the PIN on WhatsApp.'))}catch(_){}}};
}

/* staff */
function adminStaff(){
  const body=$('#adminBody');
  body.innerHTML=`<div class="panel" style="margin-bottom:16px"><h3>${t('Add a staff member')}</h3><p class="sub">${S.mode==='supabase'?t('Add their email here, then they open Staff on the website, choose “Create your password” and sign in.'):t('On the shared version, also share the page with them as an Editor. Their email decides their role.')}</p>
    <form id="stF"><div class="row3"><div class="f"><label>${t('Name')}</label><input name="name" required></div><div class="f"><label>${t('Email')}</label><input name="email" type="email" required dir="ltr"></div><div class="f"><label>${t('Role')}</label><select name="role">${Object.keys(ROLES).map(r=>`<option value="${r}">${t(ROLES[r])}</option>`).join('')}</select></div></div>
    <div class="row2"><div class="f"><label>${t('Branch')}</label><select name="branch"><option value="">${t('All branches')}</option>${branches().map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></div><div class="f"><label>&nbsp;</label><button class="btn red">${t('Add staff member')}</button></div></div></form>
    <p class="mini">${t('Admin: everything. Manager: orders, customers, parts, sellers, wholesalers. Sales: orders and customers for their branch.')}</p></div>
    <div class="panel" style="padding:8px"><table class="tbl"><thead><tr><th>${t('Name')}</th><th>${t('Email')}</th><th>${t('Role')}</th><th>${t('Branch')}</th><th>${t('Status')}</th><th></th></tr></thead><tbody>${Store.all('staff').map(s=>`<tr><td><b>${esc(s.name)}</b></td><td class="ltr">${esc(s.id)}</td><td><select class="sel" data-sr="${esc(s.id)}">${Object.keys(ROLES).map(r=>`<option value="${r}" ${s.role===r?'selected':''}>${t(ROLES[r])}</option>`).join('')}</select></td><td><select class="sel" data-sb="${esc(s.id)}"><option value="">${t('All branches')}</option>${branches().map(b=>`<option value="${esc(b.id)}" ${s.branch===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></td><td><span class="st ${s.active===false?'rejected':'approved'}">${s.active===false?t('Disabled'):t('Active')}</span></td><td>${s.id!==S.me?`<button class="btn sm ghost" data-st="${esc(s.id)}">${s.active===false?t('Enable'):t('Disable')}</button>`:''}</td></tr>`).join('')||`<tr><td colspan="6" class="mini" style="padding:20px;text-align:center">${t('No staff added yet.')}</td></tr>`}</tbody></table></div>`;
  $('#stF').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));const id=fd.email.trim().toLowerCase();try{await Store.set('staff',id,{name:fd.name,role:fd.role,branch:fd.branch,active:true,addedAt:Date.now()});toast(t('Staff member added'))}catch(_){}};
  body.onchange=async e=>{const el=e.target;const id=el.dataset.sr||el.dataset.sb;if(!id)return;const s=Store.get('staff',id);if(el.dataset.sr)s.role=el.value;else s.branch=el.value;try{await Store.set('staff',id,s);toast(t('Updated'))}catch(_){}};
  body.onclick=async e=>{const b=e.target.closest('[data-st]');if(!b)return;const s=Store.get('staff',b.dataset.st);s.active=s.active===false;try{await Store.set('staff',s.id,s)}catch(_){}};
}

/* settings */
function adminSettings(){
  const s=settings();const v=k=>esc(s[k]??'');let brs=clone(s.branches||[]);
  $('#adminBody').innerHTML=`<form class="panel" id="setF" style="max-width:860px"><h3>${t('Business details')}</h3><p class="sub">${t('Shown on quotations, invoices and the website footer.')}</p>
    <div class="row2"><div class="f"><label>${t('Company name')}</label><input name="company" value="${v('company')}"></div><div class="f"><label>${t('Tagline')}</label><input name="tagline" value="${v('tagline')}"></div></div>
    <div class="row3"><div class="f"><label>${t('Phone')}</label><input name="phone" value="${v('phone')}" dir="ltr"></div><div class="f"><label>WhatsApp</label><input name="whatsapp" value="${v('whatsapp')}" dir="ltr"></div><div class="f"><label>${t('Email')}</label><input name="email" value="${v('email')}" dir="ltr"></div></div>
    <div class="f"><label>${t('Address')}</label><input name="address" value="${v('address')}"></div>
    <div class="row2"><div class="f"><label>${t('Currency')}</label><select name="currency"><option value="IQD" ${s.currency==='IQD'?'selected':''}>${t('IQD')}</option><option value="USD" ${s.currency==='USD'?'selected':''}>USD</option></select></div><div class="f"><label>${t('Quotation valid for (days)')}</label><input name="quoteValidity" type="number" value="${v('quoteValidity')}"></div></div>
    <div class="f"><label>${t('Quotation terms')}</label><textarea name="quoteNote">${v('quoteNote')}</textarea></div><div class="f"><label>${t('Invoice footer')}</label><textarea name="invoiceNote">${v('invoiceNote')}</textarea></div>
    <div class="f"><label>${t('Logo')} <i>(${t('for PDFs and website, optional')})</i></label><input type="file" accept="image/*" id="logoIn"><div class="thumbs" id="logoTh">${s.logo?`<img src="${esc(s.logo)}" style="object-fit:contain;background:#fff">`:''}</div></div>
    <h3 style="margin-top:20px">${t('Branches')}</h3><p class="sub">${t('Customers can choose a branch for pickup. Orders and sales staff can be assigned to a branch.')}</p><div id="brList"></div><button type="button" class="btn sm ghost" id="brAdd">+ ${t('Add branch')}</button>
    <div style="margin-top:20px"><button class="btn red">${t('Save settings')}</button></div></form>`;
  const drawBr=()=>{$('#brList').innerHTML=brs.map((b,i)=>`<div class="row3" style="grid-template-columns:2fr 1fr 1fr auto;align-items:end"><div class="f"><label>${t('Branch name')}</label><input data-b="${i}" data-k="name" value="${esc(b.name||'')}"></div><div class="f"><label>${t('City')}</label><input data-b="${i}" data-k="city" value="${esc(b.city||'')}" list="cities"></div><div class="f"><label>${t('Phone')}</label><input data-b="${i}" data-k="phone" value="${esc(b.phone||'')}" dir="ltr"></div><div class="f"><button type="button" class="rm" data-brdel="${i}">✕</button></div></div>`).join('')+citiesList()};drawBr();
  $('#brList').oninput=e=>{const el=e.target;if(el.dataset.b!==undefined)brs[+el.dataset.b][el.dataset.k]=el.value};
  $('#brList').onclick=e=>{const d=e.target.closest('[data-brdel]');if(d){brs.splice(+d.dataset.brdel,1);drawBr()}};
  $('#brAdd').onclick=()=>{brs.push({id:'b_'+rid(5).toLowerCase(),name:'',city:'',phone:''});drawBr()};
  let logo=s.logo||'';$('#logoIn').onchange=async e=>{if(e.target.files[0]){logo=await compressImg(e.target.files[0],500,.85);$('#logoTh').innerHTML=`<img src="${logo}" style="object-fit:contain;background:#fff">`}};
  $('#setF').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));try{await Store.set('config','settings',{...fd,quoteValidity:+fd.quoteValidity||7,logo,branches:brs.filter(b=>b.name)});toast(t('Settings saved'))}catch(_){}};
}
function applyLogo(){const s=settings();$$('.brand-mark').forEach(m=>{m.innerHTML=s.logo?`<img src="${esc(s.logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;background:#fff">`:'AE'})}

/* ================= PDF (quotation / invoice / credit note) ================= */
function docHtml(o,kind,cn){
  const L=o.pdfLang||o.lang||'en',rtl=LANGS[L].dir==='rtl',s=settings(),x=totals(o),T=(k,v)=>t(k,v,L),al=rtl?'left':'right',st=rtl?'right':'left';
  const title={quote:'Quotation',invoice:'Invoice',credit:'Credit note'}[kind];const no=kind==='quote'?o.quoteNo:kind==='invoice'?o.invoiceNo:cn.no;
  const dt=kind==='quote'?(o.quotedAt||Date.now()):kind==='invoice'?(o.invoicedAt||Date.now()):cn.at;const valid=kind==='quote'?new Date(dt+(+s.quoteValidity||7)*864e5):null;
  let lines;if(kind==='credit')lines=cn.lines.map(r=>({...o.lines[r.i],qty:r.qty,price:r.price}));else lines=o.lines.filter(l=>kind==='quote'||l.avail!=='unavailable');
  const fontD=rtl?"'Noto Kufi Arabic','Noto Sans Arabic',sans-serif":"Archivo,Inter,sans-serif",fontB=rtl?"'Noto Sans Arabic',Inter,sans-serif":"Inter,'Noto Sans Arabic',sans-serif";
  const lbl=v=>`<div style="color:#69717C;font-size:10px;font-weight:700;letter-spacing:${rtl?0:'.1em'};text-transform:uppercase;margin-bottom:4px">${v}</div>`;const br=branches().find(b=>b.id===o.branch);
  const row=(a,b,bold,color)=>`<tr><td style="padding:5px 0;color:#69717C">${a}</td><td style="text-align:${al};${bold?'font-weight:700;':''}${color?'color:'+color:''}">${b}</td></tr>`;
  let tot='';
  if(kind==='credit'){tot=row(T('Items returned'),money(cn.lines.reduce((s_,r)=>s_+r.qty*r.price,0),L))+(o.discountType!=='amt'&&o.discount?row(T('Discount')+` (${o.discount}%)`,'−'+money(cn.lines.reduce((s_,r)=>s_+r.qty*r.price,0)*o.discount/100,L)):'')+(cn.fee?row(T('Restocking fee'),'−'+money(cn.fee,L)):'')+`<tr><td style="padding:12px 0 0;border-top:2px solid #101318;font-family:${fontD};font-weight:800;font-size:18px">${T('Credit amount')}</td><td style="padding:12px 0 0;border-top:2px solid #101318;text-align:${al};font-family:${fontD};font-weight:800;font-size:18px">${money(cn.amount,L)}</td></tr>`}
  else{tot=row(T('Subtotal'),money(x.sub,L))+(x.disc?row(T('Discount')+(o.discountType!=='amt'?` (${o.discount}%)`:''),'−'+money(x.disc,L),0,'#18A35A'):'')+(x.del?row(T('Delivery'),money(x.del,L)):'')+`<tr><td style="padding:12px 0 0;border-top:2px solid #101318;font-family:${fontD};font-weight:800;font-size:18px">${T('Total')}</td><td style="padding:12px 0 0;border-top:2px solid #101318;text-align:${al};font-family:${fontD};font-weight:800;font-size:18px">${money(x.total,L)}</td></tr>`;
    if(kind==='invoice'&&(x.paid||x.credit))tot+=(x.credit?row(T('Credit notes'),'−'+money(x.credit,L)):'')+row(T('Paid'),money(x.paid,L))+row(T('Balance due'),money(Math.max(0,x.balance),L),1)}
  return `<div class="doc" dir="${rtl?'rtl':'ltr'}" style="width:794px;min-height:1123px;padding:56px 56px 60px;font-family:${fontB};color:#101318;background:#fff;font-size:12px;position:relative;text-align:${st}">
   <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #101318;padding-bottom:20px">
     <div style="display:flex;gap:14px;align-items:center">${s.logo?`<img src="${s.logo}" style="width:64px;height:64px;object-fit:contain">`:`<div style="width:56px;height:56px;border-radius:12px;background:#FF3B1F;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Archivo,Inter,sans-serif;font-weight:800;font-size:20px">AE</div>`}
       <div><div style="font-family:${fontD};font-weight:800;font-size:22px;text-transform:uppercase">${esc(s.company)}</div><div style="color:#69717C">${esc(T(s.tagline))}</div><div style="color:#69717C;margin-top:4px;line-height:1.6">${[s.address,s.phone&&(T('Phone')+': <span dir="ltr">'+esc(s.phone)+'</span>'),s.whatsapp&&('WhatsApp: <span dir="ltr">'+esc(s.whatsapp)+'</span>'),s.email].filter(Boolean).map(z=>z.includes('<span')?z:esc(z)).join('<br>')}</div></div></div>
     <div style="text-align:${al}"><div style="font-family:${fontD};font-weight:900;font-size:32px;color:${kind==='invoice'?'#FF3B1F':kind==='credit'?'#18A35A':'#101318'};text-transform:uppercase;line-height:1.1">${T(title)}</div>
       <table style="margin-${rtl?'right':'left'}:auto;margin-top:10px;font-size:12px"><tr><td style="color:#69717C;padding:2px 10px">${T('No.')}</td><td style="font-weight:700" dir="ltr">${esc(no)}</td></tr><tr><td style="color:#69717C;padding:2px 10px">${T('Date')}</td><td>${dateStr(dt,L)}</td></tr>${valid?`<tr><td style="color:#69717C;padding:2px 10px">${T('Valid until')}</td><td>${dateStr(valid,L)}</td></tr>`:''}${kind==='credit'?`<tr><td style="color:#69717C;padding:2px 10px">${T('Invoice')}</td><td dir="ltr">${esc(o.invoiceNo)}</td></tr>`:''}<tr><td style="color:#69717C;padding:2px 10px">${T('Order')}</td><td dir="ltr">${esc(o.no)}</td></tr></table></div></div>
   <div style="display:flex;justify-content:space-between;margin:22px 0;gap:20px">
     <div>${lbl(kind==='quote'?T('Prepared for'):T('Bill to'))}<div style="font-size:15px;font-weight:700">${esc(o.customer.name)}</div>${o.customer.company?`<div>${esc(o.customer.company)}</div>`:''}<div dir="ltr" style="text-align:${st}">${esc(o.customer.phone)}</div><div>${esc(o.customer.location)}</div></div>
     <div style="text-align:${al}">${lbl(o.fulfil==='pickup'?T('Pick up from branch'):T('Delivery'))}<div style="font-weight:600">${br?esc(br.name):(o.fulfil==='pickup'?'—':esc(o.customer.location))}</div>${kind==='credit'&&cn.reason?`<div style="margin-top:8px">${lbl(T('Reason'))}${esc(cn.reason)}</div>`:''}</div></div>
   <table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#101318;color:#fff"><th style="padding:9px;text-align:${st};width:28px">#</th><th style="padding:9px;text-align:${st}">${T('Part number')}</th><th style="padding:9px;text-align:${st}">${T('Description')}</th>${kind==='quote'?`<th style="padding:9px;text-align:${st}">${T('Availability')}</th>`:''}<th style="padding:9px;text-align:${al}">${T('Qty')}</th><th style="padding:9px;text-align:${al}">${T('Unit price')}</th><th style="padding:9px;text-align:${al}">${T('Amount')}</th></tr></thead>
     <tbody>${lines.map((l,i)=>`<tr style="border-bottom:1px solid #e5e3dd;${i%2?'background:#faf9f6':''}"><td style="padding:9px">${i+1}</td><td style="padding:9px;font-family:monospace" dir="ltr">${esc(l.partNo||'—')}</td><td style="padding:9px"><b>${esc(l.name)}</b>${l.fit?`<br><span style="color:#69717C">${esc(l.fit)}</span>`:''}</td>${kind==='quote'?`<td style="padding:9px">${availLabel(l.avail,L)}</td>`:''}<td style="padding:9px;text-align:${al}">${l.qty}</td><td style="padding:9px;text-align:${al}">${l.avail==='unavailable'?'—':money(l.price,L)}</td><td style="padding:9px;text-align:${al};font-weight:600">${l.avail==='unavailable'?'—':money((+l.price||0)*l.qty,L)}</td></tr>`).join('')}</tbody></table>
   <div style="display:flex;justify-content:flex-end;margin-top:16px"><table style="width:320px;font-size:13px">${tot}</table></div>
   ${o.notes&&kind!=='credit'?`<div style="margin-top:24px;padding:12px 14px;background:#f5f4f0;border-radius:8px">${lbl(T('Notes'))}${esc(o.notes).replace(/\n/g,'<br>')}</div>`:''}
   <div style="margin-top:20px;color:#69717C;line-height:1.6">${esc(kind==='quote'?T(s.quoteNote):kind==='invoice'?T(s.invoiceNote):(cn.settle==='refund'?T('Settled by cash refund.'):T('Credit can be used on your next order.')))}</div>
   ${kind!=='quote'?`<div style="display:flex;justify-content:space-between;margin-top:60px"><div style="width:220px;border-top:1px solid #101318;padding-top:6px;color:#69717C">${T('Authorized signature')}</div><div style="width:220px;border-top:1px solid #101318;padding-top:6px;color:#69717C;text-align:${al}">${T('Received by')}</div></div>`:''}
   <div style="position:absolute;bottom:28px;left:56px;right:56px;display:flex;justify-content:space-between;color:#a0a4aa;font-size:10px;border-top:1px solid #eee;padding-top:8px"><span>${esc(s.company)}</span><span dir="ltr">${esc(no)}</span></div></div>`;
}
async function makePdf(o,kind,cn){
  const html=docHtml(o,kind,cn);const no=kind==='quote'?o.quoteNo:kind==='invoice'?o.invoiceNo:cn.no;const title={quote:'Quotation',invoice:'Invoice',credit:'Credit note'}[kind];
  openModal(mHead(`${t(title)} <span class="ltr">${esc(no)}</span>`)+`<div class="modal-body"><div class="preview-frame" id="pvF"><div id="pvD" style="width:794px">${html}</div></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="btn ghost" id="pvBack">${t('Back to order')}</button><a class="btn wa" href="${waLink(o)}" target="_blank" rel="noopener">${t('Send summary on WhatsApp')}</a><button class="btn red" id="pvDl">${t('Download PDF')}</button></div><p class="mini" id="pvMsg" style="text-align:end;margin-top:8px"></p></div>`,true);
  const fit=()=>{const w=$('#pvF').clientWidth-32;const sc=Math.min(1,w/794);const d=$('#pvD');d.style.transform=`scale(${sc})`;d.style.transformOrigin=isRTL()?'top right':'top left';d.style.height=(1123*sc)+'px'};fit();
  $('#pvBack').onclick=()=>openOrder(o.id);
  $('#pvDl').onclick=async()=>{const btn=$('#pvDl');btn.disabled=true;btn.textContent=t('Preparing…');
    try{if(!window.html2canvas||!window.jspdf)throw new Error(t('PDF tools still loading. Try again.'));
      const stage=$('#pdf-stage');stage.innerHTML=html;await document.fonts.ready;const canvas=await html2canvas(stage.firstElementChild,{scale:2,backgroundColor:'#fff',useCORS:true});stage.innerHTML='';
      const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4'});const pw=210,ph=297;const per=Math.floor(canvas.width*ph/pw);let y=0,pg=0;
      while(y<canvas.height){const h=Math.min(per,canvas.height-y);const c=document.createElement('canvas');c.width=canvas.width;c.height=h;c.getContext('2d').drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);if(pg)pdf.addPage();pdf.addImage(c.toDataURL('image/jpeg',.92),'JPEG',0,0,pw,h*pw/canvas.width);y+=per;pg++}
      const blob=pdf.output('blob');const fname=`${no} - ${o.customer.name}.pdf`.replace(/[\\/:*?"<>|]/g,'');
      if(S.downloads){await S.downloads.save({filename:fname,data:blob});$('#pvMsg').textContent=t('Saved.')}
      else if(S.mode!=='claude'){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);$('#pvMsg').textContent=t('Saved.')}
      else $('#pvMsg').textContent=t('Downloads are not available in this view.');
    }catch(e){$('#pvMsg').textContent=e&&e.code==='declined'?t('Download cancelled.'):(t('Could not create PDF')+': '+(e.message||e.code||e))}
    btn.disabled=false;btn.textContent=t('Download PDF')};
}

/* ================= BOOT ================= */
(function boot(){
  if(!LANG){LANG='en';document.documentElement.dir='ltr';buildChrome();buildHome();route();showLangPicker()}
  else{document.documentElement.lang=LANG==='ku'?'ckb':LANG;document.documentElement.dir=LANGS[LANG].dir;buildChrome();buildHome();route()}
  initStore().then(applyLogo);
})();
