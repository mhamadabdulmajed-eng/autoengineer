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

const TECH_SVG = `<svg class="tech-svg" viewBox="0 0 260 440" aria-hidden="true">
  <defs>
    <radialGradient id="tgGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF3B1F" stop-opacity=".32"/><stop offset="1" stop-color="#FF3B1F" stop-opacity="0"/></radialGradient>
    <linearGradient id="tgSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eab48a"/><stop offset="1" stop-color="#d39a6e"/></linearGradient>
    <linearGradient id="tgShirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a6da3"/><stop offset="1" stop-color="#36548a"/></linearGradient>
    <linearGradient id="tgNavy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26324a"/><stop offset="1" stop-color="#18202f"/></linearGradient>
    <linearGradient id="tgCap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3550"/><stop offset="1" stop-color="#151c2b"/></linearGradient>
  </defs>
  <circle cx="130" cy="230" r="130" fill="url(#tgGlow)"/>
  <ellipse cx="132" cy="428" rx="78" ry="8" fill="#000" opacity=".4"/>
  <g class="tech-body">
    <!-- legs and shoes -->
    <path d="M98 296 h34 v104 q0 5 -5 5 h-24 q-5 0 -5 -5 Z" fill="url(#tgNavy)"/>
    <path d="M136 296 h34 v104 q0 5 -5 5 h-24 q-5 0 -5 -5 Z" fill="url(#tgNavy)"/>
    <rect x="98" y="356" width="34" height="5" fill="#FF3B1F"/><rect x="136" y="356" width="34" height="5" fill="#FF3B1F"/>
    <path d="M86 418 q0 -16 16 -16 h26 q8 0 8 8 v8 Z" fill="#151922"/><path d="M132 418 v-8 q0 -8 8 -8 h26 q16 0 16 16 Z" fill="#151922"/>
    <rect x="86" y="416" width="50" height="5" rx="2" fill="#FF3B1F"/><rect x="132" y="416" width="50" height="5" rx="2" fill="#FF3B1F"/>
    <!-- shirt, overalls -->
    <path d="M80 236 q0 -30 28 -32 h44 q28 2 28 32 v34 h-100 Z" fill="url(#tgShirt)"/>
    <path d="M86 262 h88 v40 q0 6 -6 6 h-76 q-6 0 -6 -6 Z" fill="url(#tgNavy)"/>
    <rect x="102" y="232" width="56" height="50" rx="7" fill="url(#tgNavy)"/>
    <path d="M104 236 L92 208 M156 236 L168 208" stroke="#FF3B1F" stroke-width="7" stroke-linecap="round"/>
    <circle cx="104" cy="238" r="4" fill="#d6dbe3"/><circle cx="156" cy="238" r="4" fill="#d6dbe3"/>
    <rect x="86" y="284" width="88" height="6" fill="#111724"/>
    <path d="M116 204 l14 16 l14 -16 Z" fill="#2c4675"/>
    <rect x="109" y="250" width="42" height="12" rx="3" fill="#f4f5f7"/>
    <text x="130" y="258.6" text-anchor="middle" font-size="6.6" font-weight="800" fill="#18202f" font-family="Inter,Arial,sans-serif">MOHAMMED</text>
    <g transform="translate(130 272)"><circle r="6.5" fill="#FF3B1F"/><path d="M-1.8 -2.6 h3.6 M-1.8 0 h3 M-1.8 2.6 h3.6 M-1.8 -2.6 v5.2" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></g>
    <!-- waving arm -->
    <g class="tech-wave">
      <path d="M90 218 Q62 210 54 176" stroke="url(#tgShirt)" stroke-width="21" fill="none" stroke-linecap="round"/>
      <circle cx="53" cy="164" r="12" fill="url(#tgSkin)"/>
      <path d="M45 160 v-10 M50 157 v-12 M55 157 v-12 M60 159 v-9" stroke="#d39a6e" stroke-width="5" stroke-linecap="round"/>
      <path d="M41 168 q-6 -4 -4 -10" stroke="#d39a6e" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
    <!-- arm holding the check sheet -->
    <path d="M172 216 Q198 262 152 300" stroke="url(#tgShirt)" stroke-width="20" fill="none" stroke-linecap="round"/>
    <!-- neck + head -->
    <g transform="translate(0 15)">
    <path d="M117 166 h26 v40 q-13 8 -26 0 Z" fill="#c4875c"/>
    <ellipse cx="79" cy="122" rx="9" ry="13" fill="#d39a6e"/><ellipse cx="181" cy="122" rx="9" ry="13" fill="#d39a6e"/>
    <ellipse cx="130" cy="118" rx="50" ry="55" fill="url(#tgSkin)"/>
    <path d="M82 112 C82 96 88 90 96 88 L97 116 Z M178 112 C178 96 172 90 164 88 L163 116 Z" fill="#20160f"/>
    <path d="M81 124 C83 160 104 174 130 174 C156 174 177 160 179 124 C173 148 162 158 152 161 Q130 170 108 161 C98 158 87 148 81 124 Z" fill="#2a1c13"/>
    <circle cx="99" cy="140" r="8.5" fill="#ff7f6e" opacity=".35"/><circle cx="161" cy="140" r="8.5" fill="#ff7f6e" opacity=".35"/>
    <path d="M100 104 q10 -8 20 -2 M140 102 q10 -6 20 2" stroke="#20160f" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <g class="tech-eyes"><ellipse cx="110" cy="121" rx="6" ry="7.5" fill="#1b130d"/><ellipse cx="150" cy="121" rx="6" ry="7.5" fill="#1b130d"/>
      <circle cx="112.3" cy="118.4" r="2.3" fill="#fff"/><circle cx="152.3" cy="118.4" r="2.3" fill="#fff"/><circle cx="108.5" cy="124" r="1" fill="#fff"/><circle cx="148.5" cy="124" r="1" fill="#fff"/></g>
    <path d="M130 122 q-5 11 -1 14 q4 1.5 8 -1" stroke="#b47a50" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M112 142 Q130 135 148 142 Q139 146 130 144 Q121 146 112 142 Z" fill="#2a1c13"/>
    <g class="tech-mouth"><path d="M111 147 Q130 172 149 147 Q130 152 111 147 Z" fill="#7d2b20"/>
      <path d="M113.5 148 Q130 152.5 146.5 148 L145.2 151.6 Q130 155.5 114.8 151.6 Z" fill="#fff"/>
      <path d="M121 161 Q130 156 139 161 Q130 166 121 161 Z" fill="#e56f5c"/></g>
    <!-- cap -->
    <path d="M78 102 C76 62 102 48 130 48 C158 48 184 62 182 102 Q130 90 78 102 Z" fill="url(#tgCap)"/>
    <path d="M130 48 v46" stroke="#0b0f18" stroke-width="1.4" opacity=".55"/>
    <path d="M74 101 Q130 85 186 101 Q191 110 130 105 Q69 110 74 101 Z" fill="#FF3B1F"/>
    <g transform="translate(130 74)"><circle r="10" fill="none" stroke="#FF3B1F" stroke-width="2.8" stroke-dasharray="3.4 2.3"/><path d="M-3.2 -4.5 h6.4 M-3.2 0 h5.2 M-3.2 4.5 h6.4 M-3.2 -4.5 v9" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/></g>
    <!-- AI headset -->
    <rect x="176" y="106" width="14" height="28" rx="5.5" fill="#2a3245"/>
    <circle class="tech-led" cx="183" cy="114" r="2.4" fill="#3ee6ff"/>
    <path d="M182 132 C186 152 174 160 160 160" stroke="#8d97a8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle class="tech-mic" cx="158" cy="160" r="4.2" fill="#3ee6ff"/>
    </g>
    <!-- the check sheet -->
    <g transform="translate(160 226) rotate(7)">
      <rect x="0" y="0" width="80" height="104" rx="7" fill="#9a6538"/>
      <rect x="6" y="11" width="68" height="88" rx="2.5" fill="#fbfbf8"/>
      <rect x="25" y="-4" width="30" height="13" rx="3.5" fill="#c3cad4"/><rect x="33" y="-7" width="14" height="6" rx="3" fill="#c3cad4"/>
      <text x="40" y="23" text-anchor="middle" font-size="7.2" font-weight="800" fill="#18202f" font-family="Inter,Arial,sans-serif" letter-spacing=".4">CAR CHECK</text>
      <rect x="12" y="26.5" width="56" height="1.4" fill="#FF3B1F"/>
      ${['MODEL','YEAR','ENGINE','VIN','KM'].map((l, i) => { const y = 39 + i * 13; return `<rect x="12" y="${y - 6}" width="8" height="8" rx="1.5" fill="none" stroke="#9aa3b2" stroke-width="1.2"/>
      <text x="24" y="${y + 1}" font-size="6.4" font-weight="700" fill="#4a5262" font-family="Inter,Arial,sans-serif">${l}</text><rect x="46" y="${y}" width="22" height="1" fill="#d5d9e0"/>
      <path class="ck" d="M13 ${y - 2} l3 3 l6 -8" stroke="#16a34a" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('')}
    </g>
    <circle cx="152" cy="300" r="11" fill="url(#tgSkin)"/>
    <path d="M145 295 q6 -3 13 0" stroke="#d39a6e" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

const TECH_FUELS = ['Petrol','Diesel','Hybrid'];
const TECH_ENGINES = ['1.3','1.5','1.6','1.8','2.0','2.4','2.5','2.7','2.8','3.0','3.5','4.0','4.5','4.6','5.7'];
const TECH_TRANS = ['Automatic','Manual'];
const TECH_SPECS = ['Iraqi / Gulf (GCC)','American','Other import'];

function mountTechnician(host, opts = {}){
  if(!host) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let first = false; try{ first = sessionStorage.getItem('ae:tech') !== '1'; if(!opts.lazy) sessionStorage.setItem('ae:tech', '1'); }catch(e){}
  const animate = (first || opts.lazy) && !reduce && !opts.quiet;
  const uid = 't' + Math.random().toString(36).slice(2, 7);
  host.innerHTML = `<div class="tech"><div class="tech-av">${TECH_SVG.replace(/(id="|url\(#)tg/g, '$1' + uid)}</div>
    <div class="tech-chat"><div class="tech-name"><b>${t('Mohammed')}</b><span>${t('AI Technician')}</span><i class="tech-on" aria-hidden="true"></i></div>
    <div class="tech-log" aria-live="polite"></div><div class="tech-ans"></div></div></div>`;
  const root = host.firstElementChild, log = root.querySelector('.tech-log'), ans = root.querySelector('.tech-ans');
  let token = 0;   // stops old timers when the conversation restarts
  let draft = null, step = 0, instant = !animate;

  /* tick the boxes on his check sheet as the customer answers */
  const sheet = c => { c = c || {}; const done = [c.model, c.year, c.fuel || c.engine || c.trans, c.vin, c.km];
    root.querySelectorAll('.ck').forEach((el, i) => el.classList.toggle('on', !!done[i])); };
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
    { key:'model', ask:() => t('Which car do you drive?'),
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
    step = i; sheet(draft); if(i >= Q.length) return summary();
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
    const car = Garage.active(); sheet(car);
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
    const car = Garage.active(), g = Garage.get(); if(!car) return start(); sheet(car);
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
  if(opts.lazy && 'IntersectionObserver' in window){ sheet(Garage.active());
    const io = new IntersectionObserver(es => { if(es.some(e => e.isIntersecting)){ io.disconnect(); start(); } }, {threshold: .35}); io.observe(root); }
  else start();
}
window.mountTechnician = mountTechnician;
