/* Auto Engineer — "Mohammed", the AI Technician (Retail room).
   He greets the customer and registers their car one question at a time:
   model, year, fuel, engine size, gearbox, where the car was first sold, VIN and mileage.
   Cars are kept on the phone (localStorage 'ae:garage') and sent to the visitor record
   (Staff › Visitors) so the team can see which car each customer drives. */
'use strict';

const Garage = {
  get(){ const g = ls('ae:garage'); return g && Array.isArray(g.cars) ? g : {cars:[], active:''}; },
  save(g){ ls('ae:garage', g); this.sync(); },
  active(){ const g = this.get(); return g.cars.find(c => c.id === g.active) || g.cars[0] || null; },
  upsert(car){ const g = this.get(); const i = g.cars.findIndex(c => c.id === car.id);
    if(i >= 0) g.cars[i] = car; else g.cars.unshift(car); g.cars = g.cars.slice(0, 5); g.active = car.id; this.save(g); },
  remove(id){ const g = this.get(); g.cars = g.cars.filter(c => c.id !== id); if(g.active === id) g.active = g.cars[0] ? g.cars[0].id : ''; this.save(g); },
  async sync(){ const v = typeof Visitor !== 'undefined' && Visitor.get(); if(!v || S.admin) return; const cars = this.get().cars;
    try{
      if(S.mode === 'supabase') await S.sb.rpc('track_vehicles', {pk: v.pk, cars});
      else { const id = 'v_' + v.pk, ex = Store.get('visitors', id); if(ex) await Store.set('visitors', id, {...ex, vehicles: cars, lastAt: Date.now()}); }
    }catch(e){}
  }
};
window.Garage = Garage;

/* how a car is written in one line, e.g. "Toyota Hilux 2019 · 2.7 Petrol · Automatic · 85,000 km" */
function carName(c){ if(!c) return ''; const m = c.model && c.model !== 'other' && modelById(c.model);
  return ('Toyota ' + (m ? m.name : (c.modelName || ''))).trim() + (c.year ? ' ' + c.year : ''); }
function carLine(c, withKm = true){ if(!c) return '';
  const bits = [[c.engine, c.fuel ? t(c.fuel) : ''].filter(Boolean).join(' '), c.trans ? t(c.trans) : '', c.spec ? t(c.spec) : ''];
  if(withKm && c.km) bits.push(Number(c.km).toLocaleString('en') + ' ' + t('km'));
  return bits.filter(Boolean).join(' · '); }
window.carName = carName; window.carLine = carLine;

const TECH_SVG = `<svg class="tech-svg" viewBox="0 0 240 270" aria-hidden="true">
  <defs>
    <radialGradient id="tgGlow" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="#FF3B1F" stop-opacity=".35"/><stop offset="1" stop-color="#FF3B1F" stop-opacity="0"/></radialGradient>
    <linearGradient id="tgSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0aa80"/><stop offset="1" stop-color="#c88e64"/></linearGradient>
    <linearGradient id="tgShirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a55"/><stop offset="1" stop-color="#1a2335"/></linearGradient>
    <linearGradient id="tgCap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232c3f"/><stop offset="1" stop-color="#121826"/></linearGradient>
  </defs>
  <circle cx="120" cy="140" r="118" fill="url(#tgGlow)"/>
  <g class="tech-body">
    <!-- shoulders, shirt and overall bib -->
    <path d="M30 270 C32 214 66 196 120 196 C174 196 208 214 210 270 Z" fill="url(#tgShirt)"/>
    <path d="M100 198 L120 226 L140 198 Z" fill="#c88e64"/>
    <path d="M96 197 L120 230 L102 236 L86 204 Z M144 197 L120 230 L138 236 L154 204 Z" fill="#33466a"/>
    <path d="M74 270 L80 232 Q120 244 160 232 L166 270 Z" fill="#141b29"/>
    <path d="M80 232 L70 204 M160 232 L170 204" stroke="#FF3B1F" stroke-width="7" stroke-linecap="round"/>
    <circle cx="80" cy="234" r="4.5" fill="#cfd5de"/><circle cx="160" cy="234" r="4.5" fill="#cfd5de"/>
    <rect x="124" y="246" width="40" height="11" rx="2.5" fill="#f4f5f7"/>
    <text x="144" y="254" text-anchor="middle" font-size="5.8" font-weight="800" fill="#141b29" font-family="Inter,Arial,sans-serif">MOHAMMED</text>
    <g transform="translate(94 252)"><circle r="8" fill="#FF3B1F"/><circle r="4.2" fill="#141b29"/><path d="M-2 -2.2 h3.6 M-2 0 h3 M-2 2.2 h3.6 M-2 -2.2 v4.4" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/></g>
    <!-- neck and head -->
    <path d="M104 168 h32 v30 q-16 10 -32 0 Z" fill="#b97f57"/>
    <ellipse cx="81" cy="134" rx="7" ry="11" fill="#c88e64"/><ellipse cx="159" cy="134" rx="7" ry="11" fill="#c88e64"/>
    <ellipse cx="120" cy="130" rx="39" ry="46" fill="url(#tgSkin)"/>
    <!-- hair, beard, moustache -->
    <path d="M82 120 C82 104 88 98 96 96 L96 124 Z M158 120 C158 104 152 98 144 96 L144 124 Z" fill="#20160f"/>
    <path d="M82 132 C83 170 100 180 120 180 C140 180 157 170 158 132 C154 152 146 160 138 160 Q120 150 102 160 C94 160 86 152 82 132 Z" fill="#2a1c13"/>
    <path d="M104 152 Q120 143 136 152 Q120 150 104 152 Z" fill="#2a1c13" stroke="#2a1c13" stroke-width="3" stroke-linejoin="round"/>
    <path class="tech-mouth" d="M110 160 Q120 168 130 160 Q120 163 110 160 Z" fill="#8a3324"/>
    <!-- face -->
    <path d="M97 116 q8 -5 15 -1 M128 115 q7 -4 15 1" stroke="#20160f" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <g class="tech-eyes"><ellipse cx="105" cy="128" rx="4.6" ry="5.2" fill="#1b130d"/><ellipse cx="135" cy="128" rx="4.6" ry="5.2" fill="#1b130d"/>
      <circle cx="106.6" cy="126.2" r="1.5" fill="#fff"/><circle cx="136.6" cy="126.2" r="1.5" fill="#fff"/></g>
    <path d="M120 130 q-4 10 -1 14 q3 1 6 -1" stroke="#a8714b" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- cap -->
    <path d="M78 114 C76 80 98 66 120 66 C142 66 164 80 162 114 Q120 104 78 114 Z" fill="url(#tgCap)"/>
    <path d="M120 66 v42" stroke="#0b0f18" stroke-width="1.4" opacity=".6"/>
    <path d="M74 113 Q120 99 168 113 Q172 121 120 116 Q72 121 74 113 Z" fill="#FF3B1F"/>
    <g transform="translate(120 88)"><circle r="9.5" fill="none" stroke="#FF3B1F" stroke-width="2.6" stroke-dasharray="3.2 2.2"/><path d="M-3 -4.2 h6 M-3 0 h5 M-3 4.2 h6 M-3 -4.2 v8.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></g>
    <!-- AI headset -->
    <rect x="152" y="116" width="13" height="26" rx="5" fill="#2a3245"/>
    <circle class="tech-led" cx="158.5" cy="124" r="2.2" fill="#3ee6ff"/>
    <path d="M156 140 C160 156 152 164 140 164" stroke="#8d97a8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle class="tech-mic" cx="138" cy="164" r="4" fill="#3ee6ff"/>
  </g>
  <!-- tablet in his hand -->
  <g class="tech-tab" transform="translate(150 196) rotate(-9)">
    <rect x="0" y="0" width="74" height="52" rx="7" fill="#0c1018" stroke="#46516a" stroke-width="2"/>
    <rect x="5" y="5" width="64" height="42" rx="3" fill="#0f1b26"/>
    <path d="M14 34 q4 -10 14 -11 l8 -6 h12 l7 7 q6 1 7 6 v4 h-48 Z" fill="none" stroke="#3ee6ff" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="22" cy="38" r="3.5" fill="#0f1b26" stroke="#3ee6ff" stroke-width="1.4"/><circle cx="53" cy="38" r="3.5" fill="#0f1b26" stroke="#3ee6ff" stroke-width="1.4"/>
    <text x="9" y="14" font-size="6" fill="#3ee6ff" font-family="Inter,Arial,sans-serif" font-weight="700">VIN ▸ SCAN</text>
    <rect class="tech-scan" x="5" y="5" width="64" height="3" fill="#3ee6ff" opacity=".55"/>
    <ellipse cx="-2" cy="34" rx="9" ry="11" fill="#c88e64"/>
  </g>
  <g transform="translate(36 196)"><rect width="30" height="18" rx="5" fill="#0c1018" stroke="#3ee6ff" stroke-width="1.6"/><text x="15" y="13" text-anchor="middle" font-size="10.5" font-weight="800" fill="#3ee6ff" font-family="Inter,Arial,sans-serif">AI</text></g>
</svg>`;

const TECH_FUELS = ['Petrol','Diesel','Hybrid'];
const TECH_ENGINES = ['1.3','1.5','1.6','1.8','2.0','2.4','2.5','2.7','2.8','3.0','3.5','4.0','4.5','4.6','5.7'];
const TECH_TRANS = ['Automatic','Manual'];
const TECH_SPECS = ['Iraqi / Gulf (GCC)','American','Other import'];

function mountTechnician(host, opts = {}){
  if(!host) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let first = false; try{ first = sessionStorage.getItem('ae:tech') !== '1'; sessionStorage.setItem('ae:tech', '1'); }catch(e){}
  const animate = first && !reduce && !opts.quiet;
  host.innerHTML = `<div class="tech"><div class="tech-av">${TECH_SVG}</div>
    <div class="tech-chat"><div class="tech-name"><b>${t('Mohammed')}</b><span>${t('AI Technician')}</span><i class="tech-on" aria-hidden="true"></i></div>
    <div class="tech-log" aria-live="polite"></div><div class="tech-ans"></div></div></div>`;
  const root = host.firstElementChild, log = root.querySelector('.tech-log'), ans = root.querySelector('.tech-ans');
  let token = 0;   // stops old timers when the conversation restarts
  let draft = null, step = 0, instant = !animate;

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const talk = on => root.classList.toggle('talking', on);
  function say(lines, then){
    const my = ++token; ans.innerHTML = ''; lines = [].concat(lines).filter(Boolean);
    const next = i => {
      if(my !== token) return;
      if(i >= lines.length){ talk(false); if(then) then(); scroll(); return; }
      if(instant || reduce){ log.insertAdjacentHTML('beforeend', `<div class="tb bot">${lines[i]}</div>`); next(i + 1); return; }
      talk(true); log.insertAdjacentHTML('beforeend', `<div class="tb bot typing"><i></i><i></i><i></i></div>`); scroll();
      setTimeout(() => { if(my !== token) return; const el = log.lastElementChild; el.classList.remove('typing'); el.innerHTML = lines[i]; scroll();
        setTimeout(() => next(i + 1), 260); }, Math.min(1100, 380 + lines[i].length * 9));
    };
    next(0);
  }
  const me = txt => { instant = false; log.insertAdjacentHTML('beforeend', `<div class="tb me">${esc(txt)}</div>`); scroll(); };
  const chips = (list, cur, extra = '') => `<div class="tchips">${list.map(([v, l]) => `<button type="button" class="tchip ${String(cur) === String(v) ? 'on' : ''}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}${extra}</div>`;
  const backBtn = () => step > 0 ? `<button type="button" class="tlink" data-back>‹ ${t('Back')}</button>` : '';

  /* ---------- the questions ---------- */
  const years = []; for(let y = new Date().getFullYear() + 1; y >= 1985; y--) years.push(y);
  const Q = [
    { key:'model', ask:() => t('Which Toyota do you drive?'),
      ui:() => chips((window.TOYOTA_MODELS || []).map(m => [m.id, m.name]), draft.model, `<button type="button" class="tchip ${draft.model === 'other' ? 'on' : ''}" data-v="other">${t('Other')}</button>`),
      pick:(v, done) => { if(v !== 'other'){ draft.model = v; draft.modelName = modelById(v).name; return done(modelById(v).name); }
        ans.innerHTML = `<form class="tform"><input name="x" maxlength="40" placeholder="${esc(t('Model name, e.g. Fortuner'))}" value="${esc(draft.model === 'other' ? draft.modelName || '' : '')}" required><button class="btn red sm">${t('OK')}</button></form>`;
        const f = ans.querySelector('form'); f.x.focus(); f.onsubmit = e => { e.preventDefault(); const x = f.x.value.trim(); if(!x) return; const id = modelIdOf(x);
          if(id && id !== '*'){ draft.model = id; draft.modelName = modelById(id).name; } else { draft.model = 'other'; draft.modelName = x; } done(draft.modelName); }; } },
    { key:'year', ask:() => t('What year was it made?'),
      ui:() => `<form class="tform"><select name="x" class="sel">${years.map(y => `<option ${String(draft.year || 2018) === String(y) ? 'selected' : ''}>${y}</option>`).join('')}</select><button class="btn red sm">${t('OK')}</button></form><button type="button" class="tlink" data-skip>${t('Not sure')}</button>`,
      form:(f, done) => { draft.year = f.x.value; done(draft.year); } },
    { key:'fuel', ask:() => t('Petrol, diesel or hybrid?'),
      ui:() => chips(TECH_FUELS.map(x => [x, t(x)]), draft.fuel, `<button type="button" class="tlink" data-skip>${t('Not sure')}</button>`) },
    { key:'engine', ask:() => t('What is the engine size?') + ` <small>${t('It is written on the back of the car, or on the registration card.')}</small>`,
      ui:() => chips(TECH_ENGINES.map(x => [x, x]), draft.engine, `<button type="button" class="tlink" data-skip>${t('Not sure')}</button>`) },
    { key:'trans', ask:() => t('Automatic or manual gearbox?'),
      ui:() => chips(TECH_TRANS.map(x => [x, t(x)]), draft.trans, `<button type="button" class="tlink" data-skip>${t('Not sure')}</button>`) },
    { key:'spec', ask:() => t('Where was the car first sold?') + ` <small>${t('American cars often need different parts from Gulf cars.')}</small>`,
      ui:() => chips(TECH_SPECS.map(x => [x, t(x)]), draft.spec, `<button type="button" class="tlink" data-skip>${t('Not sure')}</button>`) },
    { key:'vin', ask:() => t('Do you have the chassis number (VIN)? With it I can find the exact part.') + ` <small>${t('Find it on your car registration card or at the bottom of the windscreen.')}</small>`,
      ui:() => `<form class="tform"><input name="x" dir="ltr" maxlength="20" autocapitalize="characters" placeholder="JTEBR3FJ…" value="${esc(draft.vin || '')}" style="text-transform:uppercase;letter-spacing:.06em"><button class="btn red sm">${t('OK')}</button></form><small class="tmsg"></small><button type="button" class="tlink" data-skip>${t('Skip for now')}</button>`,
      form:(f, done) => { const s = f.x.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(s)){ ans.querySelector('.tmsg').textContent = t('A VIN has 17 letters and numbers'); f.x.focus(); return; }
        draft.vin = s; const vi = window.vinInfo ? vinInfo(s) : null; if(vi && vi.year && !draft.year) draft.year = String(vi.year); done(s); } },
    { key:'km', ask:() => t('How many kilometres has it done?') + ` <small>${t('So I can remind you when service parts are due.')}</small>`,
      ui:() => `<form class="tform"><input name="x" type="number" inputmode="numeric" min="0" max="2000000" step="1" dir="ltr" placeholder="85000" value="${esc(draft.km || '')}"><span class="tunit">${t('km')}</span><button class="btn red sm">${t('OK')}</button></form><button type="button" class="tlink" data-skip>${t('Not sure')}</button>`,
      form:(f, done) => { const n = Math.round(+f.x.value); if(!(n >= 0) || f.x.value === ''){ f.x.focus(); return; } draft.km = n; draft.kmAt = Date.now(); done(n.toLocaleString('en') + ' ' + t('km')); } }
  ];

  function ask(i){
    step = i; if(i >= Q.length) return summary();
    const q = Q[i];
    say(q.ask(), () => {
      ans.innerHTML = q.ui() + backBtn();
      const done = shown => { me(shown); ask(i + 1); };
      ans.onclick = e => {
        if(e.target.closest('[data-back]')){ for(let k = 0; k < 3 && log.lastElementChild; k++) log.lastElementChild.remove(); ask(i - 1); return; }
        if(e.target.closest('[data-skip]')){ draft[q.key] = ''; done(t('Not sure')); return; }
        const b = e.target.closest('[data-v]'); if(!b) return;
        if(q.pick) q.pick(b.dataset.v, done); else { draft[q.key] = b.dataset.v; done(b.textContent); }
      };
      const f = ans.querySelector('form'); if(f && q.form){ f.onsubmit = e => { e.preventDefault(); q.form(f, done); }; if(i > 0 && !matchMedia('(pointer:coarse)').matches) f.x.focus(); }
    });
  }
  function summary(){
    say([t('Here is your car:') + `<div class="tcar"><b>${esc(carName(draft))}</b><span>${esc(carLine(draft)) || '—'}</span>${draft.vin ? `<span class="ltr">VIN ${esc(draft.vin)}</span>` : ''}</div>`], () => {
      ans.innerHTML = `<div class="tchips"><button type="button" class="btn red sm" data-a="save">${t('Save my car')}</button><button type="button" class="tchip" data-a="redo">${t('Change something')}</button></div>`;
      ans.onclick = e => { const a = e.target.closest('[data-a]'); if(!a) return;
        if(a.dataset.a === 'redo'){ me(t('Change something')); ask(0); return; }
        draft.at = draft.at || Date.now(); draft.updatedAt = Date.now(); Garage.upsert({...draft}); me(t('Save my car'));
        if(typeof Visitor !== 'undefined') Visitor.search(carName(draft), 0, 'car');
        say([t('Saved! I will remember your {car} next time.', {car: esc(carName(draft))}), t('Search by part number or name above, or tell me what you need and our team will find the right part for your car.')], home);
      };
    });
  }

  /* ---------- the start screens ---------- */
  function start(){
    const car = Garage.active();
    if(!car){
      say([t('Hi! I’m Mohammed, your AI technician.'), t('Tell me about your car once, and I will help you find parts that fit it.')], () => {
        ans.innerHTML = `<div class="tchips"><button type="button" class="btn red sm" data-a="reg">${t('Register my car')}</button><button type="button" class="tchip" data-a="later">${t('Later')}</button></div>`;
        ans.onclick = e => { const a = e.target.closest('[data-a]'); if(!a) return;
          if(a.dataset.a === 'later'){ me(t('Later')); say(t('No problem. I’m here when you need me.'), () => { ans.innerHTML = `<div class="tchips"><button type="button" class="tchip" data-a="reg">${t('Register my car')}</button></div>`; }); return; }
          me(t('Register my car')); draft = {id: 'car' + Date.now().toString(36)}; ask(0); };
      });
    } else {
      say([t('Welcome back! Your {car}.', {car: `<b>${esc(carName(car))}</b>`}) + (carLine(car) ? `<br><small>${esc(carLine(car))}</small>` : '')], home);
    }
  }
  function home(){
    const car = Garage.active(), g = Garage.get(); if(!car) return start();
    ans.innerHTML = `<div class="tchips"><button type="button" class="btn red sm" data-a="find">${t('Find a part for this car')}</button>
      <button type="button" class="tchip" data-a="km">${t('Update mileage')}</button><button type="button" class="tchip" data-a="edit">${t('Edit car')}</button>
      ${g.cars.length > 1 ? `<button type="button" class="tchip" data-a="switch">${t('Switch car')}</button>` : ''}<button type="button" class="tchip" data-a="add">+ ${t('Add another car')}</button></div>`;
    ans.onclick = e => { const a = e.target.closest('[data-a]'); if(!a) return; const k = a.dataset.a;
      if(k === 'find'){ if(opts.onFind) opts.onFind(car); return; }
      if(k === 'edit'){ me(t('Edit car')); draft = {...car}; ask(0); return; }
      if(k === 'add'){ me(t('Add another car')); draft = {id: 'car' + Date.now().toString(36)}; ask(0); return; }
      if(k === 'km'){ me(t('Update mileage')); draft = {...car}; step = 0;
        say(t('How many kilometres has it done?'), () => {
          ans.innerHTML = `<form class="tform"><input name="x" type="number" inputmode="numeric" min="0" max="2000000" dir="ltr" placeholder="${esc(car.km || '85000')}"><span class="tunit">${t('km')}</span><button class="btn red sm">${t('OK')}</button></form>`;
          const f = ans.querySelector('form'); f.onsubmit = e2 => { e2.preventDefault(); const n = Math.round(+f.x.value); if(!(n >= 0) || f.x.value === '') return;
            Garage.upsert({...car, km: n, kmAt: Date.now(), updatedAt: Date.now()}); me(n.toLocaleString('en') + ' ' + t('km')); say(t('Updated. Thank you!'), home); };
        }); return; }
      if(k === 'switch'){ me(t('Switch car'));
        ans.innerHTML = chips(g.cars.map(c => [c.id, carName(c)]), car.id) + `<button type="button" class="tlink" data-a="del">${t('Remove {car}', {car: carName(car)})}</button>`;
        ans.onclick = e2 => { if(e2.target.closest('[data-a="del"]')){ Garage.remove(car.id); me(t('Remove {car}', {car: carName(car)})); start(); return; }
          const b = e2.target.closest('[data-v]'); if(!b) return; const gg = Garage.get(); gg.active = b.dataset.v; Garage.save(gg); me(b.textContent); start(); };
        return; }
    };
  }
  start();
}
window.mountTechnician = mountTechnician;
