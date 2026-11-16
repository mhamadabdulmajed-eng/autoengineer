/* Auto Engineer — Toyota models, model artwork and the exploding engine.
   Model photos: put an image named after the model id in img/models/ (for example
   img/models/land-cruiser.jpg). When a photo exists it replaces the drawn outline everywhere. */
'use strict';

window.TOYOTA_MODELS = [
  {id:'land-cruiser', name:'Land Cruiser', body:'suv',     tag:'Legendary 4x4'},
  {id:'prado',        name:'Land Cruiser Prado', body:'suv', tag:'Land Cruiser 250 Series', alias:['prado','lc250','landcruiser250']},
  {id:'hilux',        name:'Hilux',        body:'pickup',  tag:'Unbreakable pickup'},
  {id:'camry',        name:'Camry',        body:'sedan',   tag:'Executive sedan'},
  {id:'corolla',      name:'Corolla',      body:'sedan',   tag:'World favourite'},
  {id:'rav4',         name:'RAV4',         body:'suv',     tag:'Compact SUV'},
  {id:'yaris',        name:'Yaris',        body:'hatch',   tag:'City car'},
  {id:'avalon',       name:'Avalon',       body:'sedan',   tag:'Full-size sedan'},
  {id:'hiace',        name:'Hiace',        body:'van',     tag:'Workhorse van'},
  {id:'coaster',      name:'Coaster',      body:'bus',     tag:'Minibus'},
  {id:'tacoma',       name:'Tacoma',       body:'pickup',  tag:'Mid-size pickup'},
  {id:'tundra',       name:'Tundra',       body:'pickup',  tag:'Full-size pickup'},
  {id:'4runner',      name:'4Runner',      body:'suv',     tag:'Off-road SUV'},
  {id:'sequoia',      name:'Sequoia',      body:'suv',     tag:'Full-size SUV'},
  {id:'supra',        name:'GR Supra',     body:'sports',  tag:'Sports car', alias:['supra']}
];
window.MODEL_PHOTO_EXT = ['webp','jpg','png'];
window.MODEL_PHOTO_V = '202611152049';
/* models that have a photo in img/models/ (add the id here when you add a photo) */
window.MODEL_PHOTOS = ['land-cruiser','prado','hilux','camry','corolla','rav4','tacoma','avalon','coaster','4runner','yaris','supra','tundra','hiace','sequoia'];

const _norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
/* which model does a part (or a search text) belong to? '' = none, '*' = all models */
window.modelIdOf = function(text){
  const n = _norm(text);
  if(!n) return '';
  if(n.includes('allmodels') || n === 'all' || n === 'universal') return '*';
  // longest names first so "landcruiser" wins over shorter matches
  const list = [...TOYOTA_MODELS].sort((a,b)=>b.name.length-a.name.length);
  for(const m of list){
    const keys = [m.name, m.id, ...(m.alias||[])].map(_norm);
    if(keys.some(k => k && n.includes(k))) return m.id;
  }
  return '';
};
window.modelById = id => TOYOTA_MODELS.find(m => m.id === id) || null;

/* ---------- original side-view outlines by body type (not any specific design) ---------- */
const BODY = {
  suv:    {d:'M40 150 L52 112 Q60 96 80 94 L150 92 L198 52 Q206 46 220 46 L430 46 Q446 46 452 56 L484 92 L538 98 Q560 102 562 122 L564 150 Z', win:'M210 58 L236 58 L236 90 L166 90 Z M248 58 L340 58 L340 90 L248 90 Z M352 58 L436 58 Q442 58 446 64 L468 90 L352 90 Z', w:[[150,150],[460,150]]},
  pickup: {d:'M36 150 L46 112 Q54 98 74 96 L150 94 L196 54 Q204 48 218 48 L330 48 Q342 48 346 58 L352 96 L560 98 Q568 98 568 108 L568 150 Z', win:'M208 60 L236 60 L236 92 L166 92 Z M248 60 L330 60 L336 92 L248 92 Z', w:[[148,150],[470,150]], extra:'M356 100 L562 100'},
  sedan:  {d:'M36 148 L44 124 Q52 110 80 106 L170 98 L228 62 Q240 56 258 56 L384 56 Q402 56 414 66 L462 100 L540 110 Q564 114 566 132 L566 148 Z', win:'M240 68 L300 68 L300 98 L190 98 Z M312 68 L384 68 Q396 68 404 74 L440 98 L312 98 Z', w:[[148,148],[464,148]]},
  hatch:  {d:'M70 148 L76 122 Q84 108 106 104 L180 96 L232 60 Q242 54 256 54 L398 54 Q418 54 428 70 L452 110 Q462 118 462 132 L462 148 Z', win:'M244 66 L296 66 L296 96 L198 96 Z M308 66 L396 66 Q408 66 414 76 L428 96 L308 96 Z', w:[[160,148],[392,148]]},
  van:    {d:'M30 152 L30 70 Q30 40 62 38 L120 34 L540 34 Q566 34 568 60 L570 152 Z', win:'M44 52 Q46 46 60 46 L118 44 L118 92 L44 92 Z M132 46 L230 46 L230 88 L132 88 Z M242 46 L340 46 L340 88 L242 88 Z M352 46 L450 46 L450 88 L352 88 Z M462 46 L554 46 L554 88 L462 88 Z', w:[[120,152],[470,152]]},
  bus:    {d:'M20 156 L20 50 Q20 26 46 24 L572 24 Q586 24 588 40 L590 156 Z', win:'M32 38 L84 38 L84 96 L32 96 Z M96 38 L160 38 L160 82 L96 82 Z M170 38 L234 38 L234 82 L170 82 Z M244 38 L308 38 L308 82 L244 82 Z M318 38 L382 38 L382 82 L318 82 Z M392 38 L456 38 L456 82 L392 82 Z M466 38 L530 38 L530 82 L466 82 Z M540 38 L578 38 L578 82 L540 82 Z', w:[[110,156],[480,156]]},
  sports: {d:'M30 146 L34 128 Q42 116 70 112 L196 102 L268 70 Q284 64 304 64 L376 64 Q396 64 412 74 L470 104 L548 118 Q570 122 572 136 L572 146 Z', win:'M284 76 L330 76 L330 100 L232 100 Z M342 76 L380 76 Q394 76 404 84 L426 100 L342 100 Z', w:[[150,146],[468,146]]}
};
window.carSVG = function(body, opts={}){
  const b = BODY[body] || BODY.suv, id = 'g'+Math.random().toString(36).slice(2,7);
  const wheels = b.w.map(([x,y])=>`<g transform="translate(${x} ${y})"><circle r="36" fill="#0b0d10"/><circle r="27" fill="url(#${id}r)"/><circle r="8" fill="#0b0d10"/>${[0,72,144,216,288].map(a=>`<rect x="-3" y="-25" width="6" height="16" rx="2" fill="#1a1f25" transform="rotate(${a})"/>`).join('')}</g>`).join('');
  return `<svg viewBox="0 0 600 200" class="carsvg" aria-hidden="true"><defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${opts.top||'#f5f6f7'}"/><stop offset=".55" stop-color="${opts.mid||'#c9ced4'}"/><stop offset="1" stop-color="${opts.bot||'#7d858f'}"/></linearGradient>
    <linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3644"/><stop offset="1" stop-color="#0c1118"/></linearGradient>
    <radialGradient id="${id}r"><stop offset="0" stop-color="#d9dde2"/><stop offset="1" stop-color="#6e7781"/></radialGradient></defs>
    <ellipse cx="300" cy="${Math.max(...b.w.map(w=>w[1]))+36}" rx="270" ry="10" fill="rgba(0,0,0,.35)"/>
    <path d="${b.d}" fill="url(#${id}b)"/>
    <path d="${b.win}" fill="url(#${id}w)"/>
    ${b.extra?`<path d="${b.extra}" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`:''}
    <path d="${b.d}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
    ${wheels}</svg>`;
};
/* model artwork: drawn outline, replaced by a real photo when one is uploaded */
window.modelArt = function(m, opts={}){
  if(!m) return '';
  const src = `img/models/${m.id}.`;
  if(!MODEL_PHOTOS.includes(m.id)) return `<div class="mart ${opts.cls||''}" data-model="${m.id}">${carSVG(m.body, opts)}</div>`;
  return `<div class="mart has-photo ${opts.cls||''}" data-model="${m.id}">${carSVG(m.body, opts)}<img class="mphoto" decoding="async" alt="${m.name}" data-src-base="${src}" data-ext="0" src="${src}${MODEL_PHOTO_EXT[0]}?v=${MODEL_PHOTO_V}" onload="this.parentNode.classList.add('has-photo')" onerror="nextModelPhoto(this)"></div>`;
};
window.nextModelPhoto = function(img){
  const i = (+img.dataset.ext||0) + 1;
  if(i >= MODEL_PHOTO_EXT.length){ img.parentNode&&img.parentNode.classList.remove('has-photo'); img.remove(); return; }
  img.dataset.ext = i; img.src = img.dataset.srcBase + MODEL_PHOTO_EXT[i] + '?v=' + MODEL_PHOTO_V;
};

/* ---------- the exploding engine (original illustration) ---------- */
/* each part: assembled drawing + explode vector [dx, dy, rotate] + label + category */
window.ENGINE_PARTS = [
  {k:'cover',  cat:'Engine',        label:'Valve cover',     v:[0,-230,-4],  lx:400, ly:-2},
  {k:'plugs',  cat:'Engine',        label:'Spark plugs',     v:[0,-120,0],   lx:400, ly:108},
  {k:'head',   cat:'Engine',        label:'Cylinder head',   v:[0,-70,0],    lx:640, ly:162},
  {k:'pistons',cat:'Engine',        label:'Pistons & rods',  v:[0,-18,0],    lx:640, ly:300},
  {k:'crank',  cat:'Engine',        label:'Crankshaft',      v:[0,110,0],    lx:400, ly:574},
  {k:'pan',    cat:'Oils & Fluids', label:'Oil pan',         v:[0,200,0],    lx:400, ly:720},
  {k:'belt',   cat:'Engine',        label:'Timing belt',     v:[-170,0,-6],  lx:28,  ly:462},
  {k:'pump',   cat:'Cooling',       label:'Water pump',      v:[-250,-90,0], lx:-100, ly:264},
  {k:'starter',cat:'Electrical',    label:'Starter motor',   v:[-220,140,8], lx:-50, ly:634},
  {k:'alt',    cat:'Electrical',    label:'Alternator',      v:[210,-120,10],lx:838, ly:182},
  {k:'filter', cat:'Filters',       label:'Oil filter',      v:[230,110,-10],lx:870, ly:570},
  {k:'intake', cat:'Filters',       label:'Air intake',      v:[150,-210,0], lx:860, ly:24}
];
window.engineSVG = function(){
  const M='url(#emet)', D='url(#edark)', R='url(#ered)', C='url(#echr)';
  const bolt=(x,y,r=4)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ebolt)" stroke="rgba(0,0,0,.45)" stroke-width="1"/><circle cx="${x-r*.3}" cy="${y-r*.3}" r="${r*.3}" fill="rgba(255,255,255,.7)"/>`;
  const pulley=(r,grooves=3)=>`<circle r="${r}" fill="${C}"/>${Array.from({length:grooves},(_,i)=>`<circle r="${r-4-i*4}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/>`).join('')}<circle r="${r*.42}" fill="${D}"/><circle r="${r*.18}" fill="${C}"/>${[0,72,144,216,288].map(a=>{const t=a*Math.PI/180;return `<circle cx="${(Math.cos(t)*r*.3).toFixed(1)}" cy="${(Math.sin(t)*r*.3).toFixed(1)}" r="2.2" fill="#0d1014"/>`}).join('')}`;
  const piece = {
    cover: `<rect x="236" y="150" width="328" height="58" rx="22" fill="${R}"/>
      <rect x="244" y="154" width="312" height="14" rx="7" fill="rgba(255,255,255,.28)"/>
      <g fill="rgba(0,0,0,.22)">${[0,1,2,3,4,5,6,7,8].map(i=>`<rect x="${262+i*32}" y="172" width="16" height="30" rx="4"/>`).join('')}</g>
      ${[250,550].map(x=>bolt(x,179,5)).join('')}${[300,400,500].map(x=>bolt(x,160,3.5)).join('')}
      <rect x="236" y="150" width="328" height="58" rx="22" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
      <rect x="330" y="176" width="140" height="22" rx="6" fill="rgba(0,0,0,.35)"/>
      <text x="400" y="192" text-anchor="middle" font-family="Archivo,Inter,sans-serif" font-size="13" font-weight="800" fill="#fff" letter-spacing="3">DOHC 16V</text>`,
    plugs: [0,1,2,3].map(i=>{const x=290+i*74;return `<g transform="translate(${x} 150)"><rect x="-9" y="-8" width="18" height="14" rx="4" fill="#1b1f24"/><rect x="-7" y="4" width="14" height="22" rx="3" fill="url(#ecer)"/><path d="M-8 26 h16 l-2 6 h-12 z" fill="${C}"/><rect x="-5" y="32" width="10" height="14" fill="url(#ethr)"/><rect x="-1.5" y="46" width="3" height="7" fill="#c7ccd2"/></g>`}).join(''),
    head:  `<rect x="244" y="206" width="312" height="52" rx="8" fill="url(#ealu)"/>
      <rect x="244" y="206" width="312" height="8" rx="4" fill="rgba(255,255,255,.4)"/>
      <g>${[0,1,2,3,4,5,6,7].map(i=>`<g transform="translate(${270+i*37} 230)"><circle r="10" fill="${D}"/><circle r="6" fill="none" stroke="#7d8790" stroke-width="2"/></g>`).join('')}</g>
      ${[252,548].map(x=>bolt(x,250,4)).join('')}
      <rect x="244" y="248" width="312" height="10" fill="rgba(0,0,0,.28)"/>`,
    pistons: [0,1,2,3].map(i=>{const x=284+i*74;return `<g transform="translate(${x} 262)"><rect x="-26" y="0" width="52" height="44" rx="6" fill="url(#epis)"/><rect x="-26" y="0" width="52" height="5" rx="2" fill="rgba(255,255,255,.6)"/><g stroke="rgba(0,0,0,.35)" stroke-width="2"><line x1="-25" y1="10" x2="25" y2="10"/><line x1="-25" y1="16" x2="25" y2="16"/><line x1="-25" y1="22" x2="25" y2="22"/></g><circle cy="33" r="5" fill="${D}"/><path d="M-9 40 L-12 98 L12 98 L9 40 Z" fill="url(#erod)"/><line x1="0" y1="44" x2="0" y2="94" stroke="rgba(255,255,255,.35)" stroke-width="2"/><circle cy="104" r="13" fill="${C}"/><circle cy="104" r="7" fill="${D}"/></g>`}).join(''),
    block: `<path fill-rule="evenodd" fill="url(#eblk)" d="M222 254 H578 Q586 254 586 262 V396 Q586 404 578 404 H222 Q214 404 214 396 V262 Q214 254 222 254 Z ${[0,1,2,3].map(i=>{const x=284+i*74;return `M${x-30} 262 H${x+30} V350 H${x-30} Z`}).join(' ')}"/>
      ${[0,1,2,3].map(i=>{const x=284+i*74;return `<rect x="${x-30}" y="262" width="60" height="88" fill="url(#ebore)" opacity=".55"/><rect x="${x-30}" y="262" width="4" height="88" fill="rgba(0,0,0,.35)"/><rect x="${x+26}" y="262" width="4" height="88" fill="rgba(255,255,255,.12)"/>`}).join('')}
      <rect x="214" y="254" width="372" height="6" rx="3" fill="rgba(255,255,255,.18)"/>
      <g stroke="rgba(0,0,0,.28)" stroke-width="3">${[0,1,2,3,4,5,6,7,8,9,10].map(i=>`<line x1="${228+i*34}" y1="362" x2="${228+i*34}" y2="398"/>`).join('')}</g>
      ${[224,576].map(x=>bolt(x,270,4.5)+bolt(x,390,4.5)).join('')}
      <rect x="214" y="354" width="372" height="3" fill="rgba(255,255,255,.14)"/>
      <text x="400" y="384" text-anchor="middle" font-family="Archivo,Inter,sans-serif" font-size="12" font-weight="800" fill="rgba(255,255,255,.4)" letter-spacing="6">AUTO ENGINEER</text>`,
    crank: `<path d="M224 418 H262 V400 H306 V436 H336 V400 H380 V436 H410 V400 H454 V436 H484 V400 H528 V418 H576" stroke="url(#ecrk)" stroke-width="16" fill="none" stroke-linejoin="round"/>
      <path d="M224 414 H262 M306 432 H336 M380 432 H410 M454 432 H484 M528 414 H576" stroke="rgba(255,255,255,.55)" stroke-width="3"/>
      ${[0,1,2,3].map(i=>`<g transform="translate(${284+i*74} 418)"><circle r="16" fill="${C}"/><circle r="9" fill="${D}"/></g>`).join('')}
      <g transform="translate(224 418)">${pulley(24,3)}</g>`,
    pan:   `<path d="M236 440 H564 L548 490 Q544 502 530 502 H270 Q256 502 252 490 Z" fill="url(#epan)"/>
      <rect x="236" y="440" width="328" height="7" fill="rgba(255,255,255,.25)"/>
      <g stroke="rgba(255,255,255,.1)" stroke-width="2">${[0,1,2,3,4,5,6].map(i=>`<line x1="${280+i*40}" y1="454" x2="${284+i*40}" y2="492"/>`).join('')}</g>
      ${[250,330,410,490,550].map(x=>bolt(x,444,3.5)).join('')}${bolt(520,488,6)}`,
    belt:  `<path d="M196 170 Q170 170 170 196 V400 Q170 430 198 430 Q226 430 226 400 V196 Q226 170 196 170 Z" fill="none" stroke="#14181c" stroke-width="15"/>
      <path d="M196 170 Q170 170 170 196 V400 Q170 430 198 430 Q226 430 226 400 V196 Q226 170 196 170 Z" fill="none" stroke="#2b333b" stroke-width="15" stroke-dasharray="3 4"/>
      <g transform="translate(198 196)">${pulley(23,2)}</g><g transform="translate(198 402)">${pulley(21,2)}</g>`,
    pump:  `<g transform="translate(150 300)"><circle r="34" fill="url(#ealu)"/><circle r="34" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2"/>${[45,135,225,315].map(a=>{const t=a*Math.PI/180;return bolt(+(Math.cos(t)*27).toFixed(1),+(Math.sin(t)*27).toFixed(1),3.5)}).join('')}<circle r="21" fill="${D}"/>${[0,45,90,135,180,225,270,315].map(a=>`<path d="M2 -2 C10 -8 17 -6 19 -2 L4 3 Z" fill="${C}" transform="rotate(${a})"/>`).join('')}<circle r="6" fill="${C}"/></g>`,
    starter:`<g transform="translate(170 450) rotate(-8)"><rect x="-58" y="-21" width="90" height="42" rx="19" fill="url(#estr)"/><g stroke="rgba(0,0,0,.35)" stroke-width="2">${[-40,-28,-16,-4,8].map(x=>`<line x1="${x}" y1="-19" x2="${x}" y2="19"/>`).join('')}</g><rect x="-58" y="-21" width="90" height="10" rx="5" fill="rgba(255,255,255,.18)"/><rect x="-30" y="-34" width="40" height="16" rx="6" fill="${C}"/><rect x="28" y="-15" width="32" height="30" rx="6" fill="${C}"/><g fill="rgba(0,0,0,.4)">${[0,1,2,3].map(i=>`<rect x="${60}" y="${-12+i*7}" width="8" height="4"/>`).join('')}</g><rect x="-66" y="-6" width="10" height="12" rx="2" fill="#b9c0c8"/></g>`,
    alt:   `<g transform="translate(628 238)"><circle r="46" fill="url(#ealu)"/><circle r="46" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2"/><circle r="36" fill="${D}"/>${Array.from({length:12},(_,i)=>`<rect x="-2.5" y="-34" width="5" height="16" rx="2" fill="#8d96a0" transform="rotate(${i*30})"/>`).join('')}<g transform="translate(0 0)">${pulley(14,2)}</g>${[0,120,240].map(a=>{const t=a*Math.PI/180;return bolt(+(Math.cos(t)*41).toFixed(1),+(Math.sin(t)*41).toFixed(1),3.5)}).join('')}</g>`,
    filter:`<g transform="translate(640 392)"><rect x="-31" y="-46" width="62" height="92" rx="12" fill="url(#efil)"/><rect x="-31" y="-46" width="62" height="16" rx="7" fill="url(#ebold)"/><g fill="rgba(0,0,0,.28)">${Array.from({length:8},(_,i)=>`<rect x="${-28+i*7.5}" y="-46" width="3" height="16"/>`).join('')}</g><g stroke="rgba(0,0,0,.18)" stroke-width="2">${[-14,-2,10,22,34].map(y=>`<line x1="-31" y1="${y}" x2="31" y2="${y}"/>`).join('')}</g><rect x="-20" y="-6" width="40" height="22" rx="4" fill="rgba(255,255,255,.88)"/><text y="9" text-anchor="middle" font-family="Archivo,Inter,sans-serif" font-size="9" font-weight="900" fill="#c4200b">OIL</text><rect x="-31" y="-30" width="9" height="74" fill="rgba(255,255,255,.22)"/></g>`,
    intake:`<path d="M556 214 C600 214 610 170 650 168 L700 166" stroke="#14181c" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M556 214 C600 214 610 170 650 168 L700 166" stroke="url(#ehose)" stroke-width="24" fill="none" stroke-linecap="round" stroke-dasharray="6 3"/><rect x="684" y="128" width="114" height="76" rx="14" fill="url(#ebox)"/><rect x="684" y="128" width="114" height="14" rx="7" fill="rgba(255,255,255,.14)"/><g stroke="#20262d" stroke-width="3">${[0,1,2,3,4,5].map(i=>`<line x1="${702+i*16}" y1="146" x2="${702+i*16}" y2="194"/>`).join('')}</g>${[692,790].map(x=>bolt(x,136,3.5)+bolt(x,196,3.5)).join('')}`
  };
  const order = ['belt','pump','starter','crank','pan','block','pistons','head','plugs','cover','alt','filter','intake'];
  const groups = order.map(k=>{
    if(k==='block') return `<g class="ep ep-block" filter="url(#eshd)">${piece.block}</g>`;
    const p = ENGINE_PARTS.find(x=>x.k===k);
    return `<g class="ep" data-k="${k}" data-cat="${p.cat}" data-v="${p.v.join(',')}"><g class="ep-art" filter="url(#eshd)">${piece[k]}</g></g>`;
  }).join('');
  const labels = ENGINE_PARTS.map(p=>`<g transform="translate(${p.lx} ${p.ly})"><g class="ep-lbl" data-k="${p.k}" data-cat="${p.cat}"><rect class="ep-pill" x="-70" y="-17" width="140" height="34" rx="17"/><text text-anchor="middle" y="5" class="ep-txt" data-label="${p.label}">${p.label}</text></g></g>`).join('');
  const lg=(id,stops,v)=>`<linearGradient id="${id}" x1="0" y1="0" ${v?'x2="0" y2="1"':'x2="1" y2="0"'}>${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  return `<svg viewBox="-140 -80 1080 820" class="engine-svg" aria-label="Engine"><defs>
    ${lg('emet',[[0,'#f4f6f8'],[.35,'#c3c9cf'],[.55,'#8a939c'],[.75,'#b9c0c7'],[1,'#5f6871']],1)}
    ${lg('echr',[[0,'#ffffff'],[.3,'#d5dade'],[.5,'#7e8790'],[.7,'#c9cfd4'],[1,'#5a626b']],1)}
    ${lg('ealu',[[0,'#d9dde1'],[.45,'#a4acb4'],[.5,'#8f98a1'],[1,'#5d666f']],1)}
    ${lg('edark',[[0,'#46505b'],[1,'#121519']],1)}
    ${lg('ered',[[0,'#ff7a5f'],[.45,'#e8321a'],[.8,'#b51d08'],[1,'#7e1203']],1)}
    ${lg('eblk',[[0,'#6b747e'],[.5,'#454c55'],[1,'#22272d']],1)}
    ${lg('ebore',[[0,'#0b0d10'],[.5,'#2a3038'],[1,'#0b0d10']])}
    ${lg('epan',[[0,'#59626c'],[.4,'#3a414a'],[1,'#15191e']],1)}
    ${lg('epis',[[0,'#7f8892'],[.25,'#d7dce0'],[.5,'#f7f9fa'],[.75,'#c2c8ce'],[1,'#7a838c']])}
    ${lg('erod',[[0,'#6f7882'],[.5,'#dfe3e7'],[1,'#6f7882']])}
    ${lg('ecrk',[[0,'#e8ebee'],[.5,'#8d96a0'],[1,'#4f5760']],1)}
    ${lg('efil',[[0,'#8f1806'],[.3,'#e33a20'],[.5,'#ff6b50'],[.7,'#d42f16'],[1,'#7e1203']])}
    ${lg('ebold',[[0,'#e6e9ec'],[1,'#6f7882']],1)}
    ${lg('ecer',[[0,'#d9dcdf'],[.5,'#ffffff'],[1,'#c3c7cb']])}
    ${lg('ethr',[[0,'#7b848d'],[.5,'#e5e8eb'],[1,'#7b848d']])}
    ${lg('estr',[[0,'#59626c'],[.4,'#2d343c'],[1,'#121519']],1)}
    ${lg('ehose',[[0,'#3a424b'],[.4,'#1c2126'],[1,'#0d1013']],1)}
    ${lg('ebox',[[0,'#3e4650'],[1,'#171b20']],1)}
    <radialGradient id="ebolt" cx=".35" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#a9b1b9"/><stop offset="1" stop-color="#4d555e"/></radialGradient>
    <radialGradient id="eglow"><stop offset="0" stop-color="rgba(255,59,31,.35)"/><stop offset="1" stop-color="rgba(255,59,31,0)"/></radialGradient>
    <filter id="eshd" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".55"/></filter></defs>
    <ellipse cx="400" cy="330" rx="420" ry="330" fill="url(#eglow)" class="ep-glow"/>
    ${groups}<g class="ep-labels">${labels}</g></svg>`;
};
/* model artwork: drawn outline, replaced by a real photo when one is uploaded */
window.modelArt = function(m, opts={}){
  if(!m) return '';
  const src = `img/models/${m.id}.`;
  if(!MODEL_PHOTOS.includes(m.id)) return `<div class="mart ${opts.cls||''}" data-model="${m.id}">${carSVG(m.body, opts)}</div>`;
  return `<div class="mart has-photo ${opts.cls||''}" data-model="${m.id}">${carSVG(m.body, opts)}<img class="mphoto" decoding="async" alt="${m.name}" data-src-base="${src}" data-ext="0" src="${src}${MODEL_PHOTO_EXT[0]}?v=${MODEL_PHOTO_V}" onload="this.parentNode.classList.add('has-photo')" onerror="nextModelPhoto(this)"></div>`;
};
window.nextModelPhoto = function(img){
  const i = (+img.dataset.ext||0) + 1;
  if(i >= MODEL_PHOTO_EXT.length){ img.parentNode&&img.parentNode.classList.remove('has-photo'); img.remove(); return; }
  img.dataset.ext = i; img.src = img.dataset.srcBase + MODEL_PHOTO_EXT[i] + '?v=' + MODEL_PHOTO_V;
};

/* ---------- the exploding engine (original illustration) ---------- */
/* each part: assembled drawing + explode vector [dx, dy, rotate] + label + category */
window.ENGINE_PARTS = [
  {k:'cover',  cat:'Engine',        label:'Valve cover',     v:[0,-230,-4],  lx:400, ly:-2},
  {k:'plugs',  cat:'Engine',        label:'Spark plugs',     v:[0,-120,0],   lx:400, ly:108},
  {k:'head',   cat:'Engine',        label:'Cylinder head',   v:[0,-70,0],    lx:640, ly:162},
  {k:'pistons',cat:'Engine',        label:'Pistons & rods',  v:[0,-18,0],    lx:640, ly:300},
  {k:'crank',  cat:'Engine',        label:'Crankshaft',      v:[0,110,0],    lx:400, ly:574},
  {k:'pan',    cat:'Oils & Fluids', label:'Oil pan',         v:[0,200,0],    lx:400, ly:720},
  {k:'belt',   cat:'Engine',        label:'Timing belt',     v:[-170,0,-6],  lx:28,  ly:462},
  {k:'pump',   cat:'Cooling',       label:'Water pump',      v:[-250,-90,0], lx:-100, ly:264},
  {k:'starter',cat:'Electrical',    label:'Starter motor',   v:[-220,140,8], lx:-50, ly:634},
  {k:'alt',    cat:'Electrical',    label:'Alternator',      v:[210,-120,10],lx:838, ly:182},
  {k:'filter', cat:'Filters',       label:'Oil filter',      v:[230,110,-10],lx:870, ly:570},
  {k:'intake', cat:'Filters',       label:'Air intake',      v:[150,-210,0], lx:860, ly:24}
];
window.engineSVG = function(){
  const M='url(#emet)', D='url(#edark)', R='url(#ered)';
  const piece = {
    cover: `<rect x="236" y="150" width="328" height="58" rx="22" fill="${R}"/><g stroke="rgba(0,0,0,.25)" stroke-width="3">${[0,1,2,3,4,5,6,7].map(i=>`<line x1="${270+i*36}" y1="160" x2="${262+i*36}" y2="198"/>`).join('')}</g><rect x="236" y="150" width="328" height="58" rx="22" fill="none" stroke="rgba(255,255,255,.35)"/><text x="400" y="186" text-anchor="middle" font-family="Archivo,Inter,sans-serif" font-size="15" font-weight="800" fill="#fff" letter-spacing="4">DOHC 16V</text>`,
    plugs: [0,1,2,3].map(i=>{const x=290+i*74;return `<g transform="translate(${x} 158)"><rect x="-7" y="0" width="14" height="22" rx="3" fill="#f2f2f2"/><rect x="-5" y="22" width="10" height="16" fill="${M}"/><rect x="-2" y="38" width="4" height="10" fill="#b8bec6"/></g>`}).join(''),
    head:  `<rect x="244" y="206" width="312" height="52" rx="8" fill="${M}"/><g fill="${D}">${[0,1,2,3,4,5,6,7].map(i=>`<circle cx="${270+i*37}" cy="222" r="9"/>`).join('')}</g><rect x="244" y="246" width="312" height="6" fill="rgba(0,0,0,.25)"/>`,
    pistons: [0,1,2,3].map(i=>{const x=284+i*74;return `<g transform="translate(${x} 262)"><rect x="-26" y="0" width="52" height="44" rx="6" fill="url(#epis)"/><g stroke="rgba(0,0,0,.3)" stroke-width="2"><line x1="-24" y1="9" x2="24" y2="9"/><line x1="-24" y1="16" x2="24" y2="16"/></g><path d="M-8 44 L-12 100 L12 100 L8 44 Z" fill="${M}"/><circle cy="104" r="12" fill="${D}" stroke="#9aa3ad" stroke-width="2"/></g>`}).join(''),
    block: `<path fill-rule="evenodd" fill="url(#eblk)" d="M222 254 H578 Q586 254 586 262 V396 Q586 404 578 404 H222 Q214 404 214 396 V262 Q214 254 222 254 Z ${[0,1,2,3].map(i=>{const x=284+i*74;return `M${x-30} 262 H${x+30} V350 H${x-30} Z`}).join(' ')}"/><g fill="rgba(0,0,0,.18)">${[0,1,2].map(i=>`<rect x="${316+i*74}" y="262" width="12" height="88"/>`).join('')}</g><rect x="214" y="354" width="372" height="4" fill="rgba(255,255,255,.12)"/><text x="400" y="388" text-anchor="middle" font-family="Archivo,Inter,sans-serif" font-size="13" font-weight="700" fill="rgba(255,255,255,.35)" letter-spacing="6">AUTO ENGINEER</text>`,
    crank: `<path d="M224 418 H262 V400 H306 V436 H336 V400 H380 V436 H410 V400 H454 V436 H484 V400 H528 V418 H576" stroke="${M}" stroke-width="14" fill="none" stroke-linejoin="round"/>${[0,1,2,3].map(i=>`<circle cx="${284+i*74}" cy="418" r="15" fill="${D}" stroke="#aab2bb" stroke-width="3"/>`).join('')}<circle cx="224" cy="418" r="22" fill="${M}"/>`,
    pan:   `<path d="M236 440 H564 L548 490 Q544 500 532 500 H268 Q256 500 252 490 Z" fill="url(#epan)"/><g stroke="rgba(255,255,255,.15)">${[0,1,2,3,4].map(i=>`<line x1="${290+i*55}" y1="452" x2="${290+i*55}" y2="490"/>`).join('')}</g><circle cx="520" cy="486" r="6" fill="${D}"/>`,
    belt:  `<path d="M196 170 Q172 170 172 196 V400 Q172 428 198 428 Q224 428 224 400 V196 Q224 170 196 170 Z" fill="none" stroke="#1d232a" stroke-width="14"/><circle cx="198" cy="196" r="22" fill="${M}"/><circle cx="198" cy="402" r="20" fill="${M}"/><circle cx="198" cy="196" r="7" fill="${D}"/><circle cx="198" cy="402" r="6" fill="${D}"/>`,
    pump:  `<g transform="translate(150 300)"><circle r="32" fill="${M}"/><circle r="22" fill="${D}"/>${[0,60,120,180,240,300].map(a=>`<path d="M0 0 L18 -6 L16 6 Z" fill="#9aa3ad" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="#cfd5db"/></g>`,
    starter:`<g transform="translate(170 450) rotate(-8)"><rect x="-56" y="-20" width="88" height="40" rx="18" fill="${D}" stroke="#5c646e" stroke-width="2"/><rect x="28" y="-14" width="30" height="28" rx="6" fill="${M}"/><rect x="-62" y="-6" width="10" height="12" fill="#b9c0c8"/></g>`,
    alt:   `<g transform="translate(628 238)"><circle r="44" fill="${M}"/><circle r="34" fill="${D}"/><g stroke="#8d96a0" stroke-width="3">${[0,30,60,90,120,150].map(a=>`<line x1="-30" y1="0" x2="30" y2="0" transform="rotate(${a})"/>`).join('')}</g><circle r="11" fill="${M}"/></g>`,
    filter:`<g transform="translate(640 392)"><rect x="-30" y="-46" width="60" height="92" rx="12" fill="url(#efil)"/><g stroke="rgba(0,0,0,.25)" stroke-width="3">${[-30,-20,-10,0,10,20,30].map(y=>`<line x1="-30" y1="${y}" x2="30" y2="${y}"/>`).join('')}</g><rect x="-30" y="-46" width="60" height="12" rx="6" fill="rgba(255,255,255,.25)"/></g>`,
    intake:`<path d="M556 214 C600 214 610 170 650 168 L700 166" stroke="${M}" stroke-width="26" fill="none" stroke-linecap="round"/><rect x="684" y="132" width="110" height="70" rx="14" fill="${D}" stroke="#5c646e" stroke-width="2"/><g stroke="#2b333c" stroke-width="3">${[0,1,2,3,4,5].map(i=>`<line x1="${700+i*16}" y1="142" x2="${700+i*16}" y2="192"/>`).join('')}</g>`
  };
  const order = ['belt','pump','starter','crank','pan','block','pistons','head','plugs','cover','alt','filter','intake'];
  const groups = order.map(k=>{
    if(k==='block') return `<g class="ep ep-block">${piece.block}</g>`;
    const p = ENGINE_PARTS.find(x=>x.k===k);
    return `<g class="ep" data-k="${k}" data-cat="${p.cat}" data-v="${p.v.join(',')}"><g class="ep-art">${piece[k]}</g></g>`;
  }).join('');
  const labels = ENGINE_PARTS.map(p=>`<g transform="translate(${p.lx} ${p.ly})"><g class="ep-lbl" data-k="${p.k}" data-cat="${p.cat}"><rect class="ep-pill" x="-70" y="-17" width="140" height="34" rx="17"/><text text-anchor="middle" y="5" class="ep-txt" data-label="${p.label}">${p.label}</text></g></g>`).join('');
  return `<svg viewBox="-140 -80 1080 820" class="engine-svg" aria-label="Engine"><defs>
    <linearGradient id="emet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e9ec"/><stop offset=".5" stop-color="#a7afb8"/><stop offset="1" stop-color="#6d7680"/></linearGradient>
    <linearGradient id="edark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a424c"/><stop offset="1" stop-color="#15191e"/></linearGradient>
    <linearGradient id="ered" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a4f"/><stop offset=".6" stop-color="#e2290f"/><stop offset="1" stop-color="#a31806"/></linearGradient>
    <linearGradient id="eblk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b646e"/><stop offset="1" stop-color="#2a3038"/></linearGradient>
    <linearGradient id="epan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a525c"/><stop offset="1" stop-color="#1c2127"/></linearGradient>
    <linearGradient id="epis" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f98a2"/><stop offset=".5" stop-color="#eef1f3"/><stop offset="1" stop-color="#8f98a2"/></linearGradient>
    <linearGradient id="efil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b3200b"/><stop offset=".5" stop-color="#ff5a3f"/><stop offset="1" stop-color="#b3200b"/></linearGradient>
    <radialGradient id="eglow"><stop offset="0" stop-color="rgba(255,59,31,.35)"/><stop offset="1" stop-color="rgba(255,59,31,0)"/></radialGradient></defs>
    <ellipse cx="400" cy="330" rx="420" ry="330" fill="url(#eglow)" class="ep-glow"/>
    ${groups}<g class="ep-labels">${labels}</g></svg>`;
};
