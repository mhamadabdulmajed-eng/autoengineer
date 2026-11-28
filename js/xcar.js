/* Partamo — Retail room "exploded car": an SUV made of real, separate spare parts.
   It comes apart into labelled parts and goes back together inside the Retail page header.
   One tap on the car toggles it; tapping a part's label searches for that part.            */
(function () {
  const W = '#EEF1F4';
  const ZOOM = 1.32; // the assembled car is shown larger; it zooms out as it comes apart
  // part: key, label (English, translated with t()), search words, explode vector [dx, dy, rotate],
  //       label offset from the part centre [lx, ly], centre [cx, cy], inside (hidden until exploded)
  const P = {
    rack:    { label: 'Roof rack',      q: 'roof rack',      v: [0, -85, 0],     c: [330, 63],  l: [0, -26] },
    hood:    { label: 'Bonnet',         q: 'hood',           v: [92, -125, -8],  c: [708, 170], l: [0, -30] },
    mirror:  { label: 'Side mirror',    q: 'outer mirror',   v: [48, -100, 10],   c: [612, 140], l: [0, -32] },
    head:    { label: 'Headlamp',       q: 'headlamp',       v: [179, -32, 0],   c: [746, 187], l: [0, 32] },
    fbump:   { label: 'Front bumper',   q: 'front bumper',   v: [169, 27, 6],    c: [736, 245], l: [0, 44] },
    fdoor:   { label: 'Front door',     q: 'front door',     v: [32, 27, 3],     c: [530, 165], l: [0, 0] },
    rdoor:   { label: 'Rear door',      q: 'rear door',      v: [-30, 27, -3],   c: [328, 165], l: [0, 0] },
    tail:    { label: 'Tail lamp',      q: 'rear lamp',      v: [-158, -22, 0],   c: [53, 127],  l: [0, -42] },
    rbump:   { label: 'Rear bumper',    q: 'rear bumper',    v: [-155, 27, -6],   c: [70, 245],  l: [0, 44] },
    fwheel:  { label: 'Wheel & tyre',   q: 'wheel',          v: [125, 143, 360], c: [610, 262], l: [0, 74] },
    rwheel:  { label: 'Wheel & tyre',   q: 'wheel',          v: [-110, 143, -360], c: [190, 262], l: [0, 74] },
    fdisc:   { label: 'Brake disc',     q: 'disc brake',     v: [-45, 133, 0],     c: [610, 262], l: [0, 52] },
    rdisc:   { label: 'Brake disc',     q: 'disc brake',     v: [60, 133, 0],    c: [190, 262], l: [0, 52] },
    fshock:  { label: 'Shock absorber', q: 'shock absorber', v: [345, -176, 0],  c: [610, 214], l: [0, -56] },
    rshock:  { label: 'Shock absorber', q: 'shock absorber', v: [-230, -234, 0],   c: [190, 214], l: [0, -56] },
    engine:  { label: 'Engine',         q: 'engine',         v: [-140, -252, 0],   c: [700, 210], l: [0, -48], inside: true },
    battery: { label: 'Battery',        q: 'battery',        v: [125, -246, 0],  c: [690, 214], l: [0, -36], inside: true },
    seat:    { label: 'Seat',           q: 'seat',           v: [-250, -228, 0], c: [400, 190], l: [0, -58], inside: true },
    exhaust: { label: 'Exhaust',        q: 'exhaust pipe',   v: [78, 137, 0],    c: [330, 268], l: [0, 32], inside: true },
  };
  const g = (k, art) => `<g class="xp" data-k="${k}"><g class="xr">${art}</g></g>`;
  const wheel = (cx) => `<circle cx="${cx}" cy="262" r="50" fill="#15181c"/><circle cx="${cx}" cy="262" r="50" fill="none" stroke="#2a2f36" stroke-width="7"/>
    <circle cx="${cx}" cy="262" r="33" fill="url(#xRim)"/>${[0, 60, 120, 180, 240, 300].map(a => `<path d="M${cx} 262 L${cx - 6} 232 L${cx + 6} 232 Z" fill="#c9cfd5" transform="rotate(${a} ${cx} 262)"/>`).join('')}
    <circle cx="${cx}" cy="262" r="33" fill="none" stroke="#7d868f" stroke-width="2"/><circle cx="${cx}" cy="262" r="8" fill="#2a2f36"/>
    ${[0, 72, 144, 216, 288].map(a => `<circle cx="${cx}" cy="250" r="2" fill="#9aa2aa" transform="rotate(${a} ${cx} 262)"/>`).join('')}`;
  const disc = (cx) => `<circle cx="${cx}" cy="262" r="30" fill="url(#xDisc)"/><circle cx="${cx}" cy="262" r="12" fill="#5d656e"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<circle cx="${cx}" cy="242" r="1.8" fill="#3c434b" transform="rotate(${a} ${cx} 262)"/>`).join('')}
    <path d="M${cx + 14} 236 a30 30 0 0 1 16 22 l-9 3 a20 20 0 0 0 -12 -17 z" fill="#E2290F"/>`;
  const shock = (cx) => `<rect x="${cx - 5}" y="188" width="10" height="52" rx="3" fill="#8b949d"/>
    <path d="M${cx - 13} 196 ${[0, 1, 2, 3, 4].map(i => `L${cx + 13} ${200 + i * 8} L${cx - 13} ${204 + i * 8}`).join(' ')}" fill="none" stroke="#E2290F" stroke-width="4" stroke-linejoin="round"/>`;

  function svg() {
    return `<svg class="xcar-svg" viewBox="-215 -150 1240 660" role="img" aria-label="Toyota SUV made of spare parts">
<defs>
 <linearGradient id="xBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${W}"/><stop offset=".55" stop-color="#d5dbe1"/><stop offset="1" stop-color="#aab3bc"/></linearGradient>
 <linearGradient id="xGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4552"/><stop offset=".5" stop-color="#1b222b"/><stop offset="1" stop-color="#0f141a"/></linearGradient>
 <radialGradient id="xRim" cx=".4" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#b9c0c8"/><stop offset="1" stop-color="#6f7882"/></radialGradient>
 <radialGradient id="xDisc" cx=".45" cy=".4"><stop offset="0" stop-color="#d9dde1"/><stop offset="1" stop-color="#7a838c"/></radialGradient>
 <linearGradient id="xLamp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe6ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
 <linearGradient id="xTail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7e0d00"/><stop offset="1" stop-color="#ff4a2b"/></linearGradient>
 <linearGradient id="xMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ac"/><stop offset="1" stop-color="#4c545d"/></linearGradient>
 <filter id="xShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
</defs>
<g class="xall">
<ellipse class="xground" cx="400" cy="314" rx="380" ry="14" fill="rgba(0,0,0,.45)"/>
<g filter="url(#xShadow)">
${g('exhaust', `<rect x="250" y="258" width="150" height="16" rx="8" fill="url(#xMetal)"/><rect x="290" y="252" width="70" height="28" rx="12" fill="#6b737c"/><rect x="236" y="262" width="20" height="8" rx="3" fill="#3c434b"/>`)}
${g('rshock', shock(190))}${g('fshock', shock(610))}
<g class="xp xbody" data-k="body"><g class="xr">
 <path d="M48 248 L48 120 Q50 76 98 72 L555 70 Q585 72 600 90 L655 160 L742 170 Q766 175 768 198 L768 248 L672 248 A62 62 0 0 0 548 248 L252 248 A62 62 0 0 0 128 248 Z" fill="url(#xBody)" stroke="#8d969f" stroke-width="1.5"/>
 <path d="M238 84 L418 84 L418 246 L238 246 Z M422 84 L560 84 L630 160 L640 246 L422 246 Z" fill="#1a1e24"/>
 <path d="M102 86 L232 84 L232 158 L100 160 Z" fill="url(#xGlass)"/>
 <path d="M60 176 L760 186" stroke="#b7c0c8" stroke-width="2" fill="none"/>
 <path d="M118 248 A72 72 0 0 1 262 248 M538 248 A72 72 0 0 1 682 248" fill="none" stroke="#2a2f36" stroke-width="12"/>
 <path d="M262 236 L538 236 L538 250 L262 250 Z M48 236 L118 236 L118 250 L48 250 Z M682 236 L768 236 L768 250 L682 250 Z" fill="#2a2f36"/>
</g></g>
${g('seat', `<path d="M368 120 Q362 112 372 108 L388 108 Q396 110 394 122 L392 196 L438 196 Q450 198 448 210 L446 226 L372 226 Q364 222 366 210 Z" fill="#3a3f46" stroke="#555c64" stroke-width="2"/><rect x="370" y="98" width="22" height="14" rx="5" fill="#3a3f46"/>`)}
${g('engine', `<rect x="664" y="190" width="74" height="40" rx="5" fill="#4a525b"/><rect x="668" y="178" width="66" height="14" rx="5" fill="#E2290F"/>${[0, 1, 2, 3].map(i => `<circle cx="${676 + i * 16}" cy="210" r="5" fill="#2a2f36"/>`).join('')}<circle cx="654" cy="214" r="10" fill="#8b949d"/>`)}
${g('battery', `<rect x="672" y="200" width="40" height="28" rx="3" fill="#20252b"/><rect x="672" y="200" width="40" height="7" fill="#3b424a"/><rect x="678" y="194" width="6" height="6" fill="#E2290F"/><rect x="700" y="194" width="6" height="6" fill="#9aa2aa"/>`)}
${g('rdisc', disc(190))}${g('fdisc', disc(610))}
${g('rwheel', wheel(190))}${g('fwheel', wheel(610))}
${g('rdoor', `<path d="M238 84 L418 84 L418 246 L238 246 Z" fill="url(#xBody)" stroke="#8d969f" stroke-width="1.5"/><path d="M246 92 L410 92 L410 158 L246 158 Z" fill="url(#xGlass)"/><rect x="384" y="180" width="24" height="6" rx="3" fill="#8d969f"/>`)}
${g('fdoor', `<path d="M422 84 L560 84 L630 160 L640 246 L422 246 Z" fill="url(#xBody)" stroke="#8d969f" stroke-width="1.5"/><path d="M430 92 L556 92 L616 158 L430 158 Z" fill="url(#xGlass)"/><rect x="434" y="180" width="24" height="6" rx="3" fill="#8d969f"/>`)}
${g('hood', `<path d="M652 158 L742 168 Q760 172 764 182 L662 178 Z" fill="url(#xBody)" stroke="#8d969f" stroke-width="1.5"/>`)}
${g('mirror', `<path d="M598 128 L626 132 Q632 140 624 150 L600 148 Z" fill="url(#xBody)" stroke="#8d969f" stroke-width="1.5"/><path d="M604 134 L620 136 L618 144 L604 143 Z" fill="url(#xGlass)"/>`)}
${g('head', `<path d="M728 178 L764 183 L765 197 L730 196 Z" fill="url(#xLamp)" stroke="#8d969f" stroke-width="1.2"/><circle cx="752" cy="189" r="4" fill="#9cc8ff"/>`)}
${g('tail', `<path d="M46 102 L60 104 L60 152 L48 150 Z" fill="url(#xTail)"/>`)}
${g('fbump', `<path d="M700 230 L768 224 Q776 240 772 258 L706 264 Q697 250 700 230 Z" fill="url(#xBody)" stroke="#8d969f" stroke-width="1.5"/><rect x="742" y="236" width="20" height="7" rx="3" fill="#fff6c8"/><path d="M710 254 L768 250" stroke="#2a2f36" stroke-width="4"/>`)}
${g('rbump', `<path d="M40 228 L100 232 Q105 248 98 262 L44 260 Q35 246 40 228 Z" fill="url(#xBody)" stroke="#8d969f" stroke-width="1.5"/><rect x="44" y="238" width="16" height="5" rx="2" fill="#ff4a2b"/>`)}
${g('rack', `<rect x="120" y="60" width="420" height="6" rx="3" fill="#2a2f36"/>${[140, 250, 400, 520].map(x => `<rect x="${x}" y="64" width="12" height="8" rx="2" fill="#2a2f36"/>`).join('')}`)}
</g>
<g class="xlabels">${Object.entries(P).map(([k, p]) => `<g class="xl" data-k="${k}" data-q="${p.q}" transform="translate(${p.c[0] + p.v[0] + p.l[0]} ${p.c[1] + p.v[1] + p.l[1]})" role="button" tabindex="-1"><g class="xli"><rect class="xl-bg" x="-82" y="-20" width="164" height="40" rx="20"/><text text-anchor="middle" y="8">${(window.t ? t(p.label) : p.label)}</text></g></g>`).join('')}</g>
</g>
</svg>`;
  }

  // explode (true) or assemble (false)
  function animate(root, open, dur) {
    if (!window.gsap) return;
    const d = dur == null ? .9 : dur;
    root.classList.toggle('open', open);
    Object.entries(P).forEach(([k, p], i) => {
      const el = root.querySelector(`.xp[data-k="${k}"]`); if (!el) return;
      const r = el.querySelector('.xr');
      gsap.to(el, { x: open ? p.v[0] : 0, y: open ? p.v[1] : 0, duration: d, ease: open ? 'power3.out' : 'power3.inOut', delay: open ? i * .015 : (18 - i) * .01, overwrite: true });
      gsap.to(r, { rotation: open ? p.v[2] : 0, svgOrigin: `${p.c[0]} ${p.c[1]}`, duration: d, ease: 'power2.inOut', overwrite: true });
      if (p.inside) gsap.to(el, { opacity: open ? 1 : 0, duration: open ? .3 : .25, delay: open ? .1 : d - .25 });
    });
    gsap.to(root.querySelector('.xbody'), { y: open ? -12 : 0, duration: d, ease: 'power2.inOut', overwrite: true });
    gsap.to(root.querySelectorAll('.xl'), { opacity: open ? 1 : 0, duration: open ? .35 : .2, delay: open ? d * .7 : 0, stagger: open ? .02 : 0, overwrite: true });
    gsap.to(root.querySelector('.xground'), { opacity: open ? .25 : 1, duration: d });
    gsap.to(root.querySelector('.xall'), { scale: open ? 1 : ZOOM, svgOrigin: '405 200', duration: d, ease: 'power2.inOut', overwrite: true });
  }

  window.mountRetailCar = function (host, opts) {
    if (!host) return null;
    host.innerHTML = `<div class="xcar" tabindex="0" aria-label="${(window.t ? t('Tap the car to see its parts') : 'Tap the car to see its parts')}">${svg()}</div>
      <p class="xcar-hint">${window.t ? t('Tap the car to see its parts') : 'Tap the car to see its parts'}</p>`;
    const root = host.querySelector('.xcar');
    Object.entries(P).forEach(([k, p]) => { if (p.inside && window.gsap) gsap.set(root.querySelector(`.xp[data-k="${k}"]`), { opacity: 0 }); });
    if (window.gsap) { gsap.set(root.querySelectorAll('.xl'), { opacity: 0 }); gsap.set(root.querySelector('.xall'), { scale: ZOOM, svgOrigin: '405 200' }); }
    let open = false;
    const toggle = () => { open = !open; animate(root, open); };
    root.addEventListener('click', e => {
      const l = e.target.closest('.xl');
      if (l && open && opts && opts.onPart) { opts.onPart(l.dataset.q, l.querySelector('text').textContent); return; }
      toggle();
    });
    root.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // play once per visit: come apart, hold, go back together
    if (opts && opts.autoplay && !reduce) {
      setTimeout(() => { open = true; animate(root, true, 1); }, 450);
      setTimeout(() => { if (open) { open = false; animate(root, false, .95); } }, 3300);
    }
    return { toggle };
  };
})();
