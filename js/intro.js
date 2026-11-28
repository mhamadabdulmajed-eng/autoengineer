/* Partamo — short room intros (about 3.5 seconds, once per visit, with Skip)
   Retail   : a real Toyota photo shatters into pieces and snaps back together, then search opens.
   Wholesale: parts fly in from cities around the world into one search bar.                    */
(function () {
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = k => { try { return sessionStorage.getItem('ae:intro:' + k) === '1'; } catch (e) { return false; } };
  const mark = k => { try { sessionStorage.setItem('ae:intro:' + k, '1'); } catch (e) {} };
  const tr = s => (window.t ? t(s) : s);

  // part icons used in the wholesale intro (simple stroke drawings)
  const ICONS = [
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>', // gear
    '<rect x="7" y="3" width="10" height="18" rx="3"/><path d="M7 8h10M7 12h10M7 16h10"/>', // filter
    '<rect x="6" y="3" width="12" height="9" rx="2"/><path d="M8 12l1 4h6l1-4M12 16v5"/>', // piston
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>', // wheel
    '<path d="M3 15l3-6h12l3 6v3H3z"/><circle cx="7.5" cy="18" r="2"/><circle cx="16.5" cy="18" r="2"/>', // car
    '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 6V4h8v2M8 12h8"/>', // box
  ];
  const CITIES = [ // x,y in % of the map box; label
    [83, 34, 'Tokyo'], [78, 40, 'Shanghai'], [74, 52, 'Bangkok'], [61, 44, 'Dubai'], [52, 30, 'Istanbul'],
    [49, 24, 'Germany'], [44, 22, 'UK'], [22, 32, 'USA'], [27, 64, 'Brazil'], [52, 66, 'S. Africa'], [86, 70, 'Australia'], [70, 34, 'India'],
  ];

  function overlay(cls) {
    const el = document.createElement('div');
    el.className = 'room-intro ' + cls;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', tr('Opening the room'));
    document.body.appendChild(el);
    return el;
  }

  function retail(el, done) {
    const img = 'img/models/land-cruiser.webp';
    const COLS = 9, ROWS = 5;
    let pieces = '';
    // each grid cell is split into two triangles; every piece is a full-size layer clipped to its triangle
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x0 = c / COLS * 100, x1 = (c + 1) / COLS * 100, y0 = r / ROWS * 100, y1 = (r + 1) / ROWS * 100;
      const flip = (r + c) % 2;
      const tris = flip ? [[[x0, y0], [x1, y0], [x0, y1]], [[x1, y0], [x1, y1], [x0, y1]]]
                        : [[[x0, y0], [x1, y1], [x0, y1]], [[x0, y0], [x1, y0], [x1, y1]]];
      tris.forEach(tri => {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        pieces += `<i class="shard" data-cx="${cx}" data-cy="${cy}" style="clip-path:polygon(${tri.map(p => p[0] + '% ' + p[1] + '%').join(',')});transform-origin:${cx}% ${cy}%;background-image:url(${img})"></i>`;
      });
    }
    el.innerHTML = `<div class="ri-stage"><img class="ri-whole" src="${img}" alt=""><div class="ri-car">${pieces}</div></div>
      <div class="ri-text"><span class="ri-eyebrow">${tr('Retail room')}</span><b>${tr('Every part of your Toyota.')}</b><b class="ri-red">${tr('One search.')}</b></div>
      <button class="ri-skip">${tr('Skip')} →</button>`;
    const shards = [...el.querySelectorAll('.shard')];
    const tl = gsap.timeline({ onComplete: done });
    // the whole photo is shown until it breaks apart, so no seams are visible
    tl.set('.room-intro .ri-whole', { opacity: 1 }).set('.room-intro .ri-car', { opacity: 0 })
      .from('.room-intro .ri-stage', { opacity: 0, x: -120, duration: .45, ease: 'power3.out' })
      .set('.room-intro .ri-whole', { opacity: 0 }, .55).set('.room-intro .ri-car', { opacity: 1 }, .55)
      .to(shards, {
        duration: .9, ease: 'power3.out', stagger: { each: .004, from: 'center' },
        x: i => (shards[i].dataset.cx - 50) * (5 + Math.random() * 6),
        y: i => (shards[i].dataset.cy - 50) * (5 + Math.random() * 6) + (Math.random() * 80 - 40),
        rotation: () => Math.random() * 300 - 150, scale: () => .55 + Math.random() * .5, opacity: .9,
      }, .55)
      .to(shards, { duration: .85, ease: 'power3.inOut', stagger: { each: .004, from: 'edges' }, x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }, 1.65)
      // the whole photo fades in over the pieces so no seams are left
      .to('.room-intro .ri-whole', { opacity: 1, duration: .2 }, 2.48).set('.room-intro .ri-car', { opacity: 0 }, 2.7)
      .fromTo('.room-intro .ri-stage', { scale: 1 }, { scale: 1.03, duration: .14, yoyo: true, repeat: 1, ease: 'power1.out' }, 2.5)
      .from('.room-intro .ri-text > *', { y: 24, opacity: 0, stagger: .08, duration: .4, ease: 'power3.out' }, 2.45)
      .to(el, { opacity: 0, duration: .35, ease: 'power2.in' }, 3.35);
    return tl;
  }

  function wholesale(el, done) {
    const lines = [];
    for (let i = 1; i < 6; i++) lines.push(`<ellipse cx="50" cy="50" rx="${i * 8}" ry="40" class="ri-mer"/>`);
    for (let i = -3; i <= 3; i++) lines.push(`<line x1="${50 - Math.sqrt(1600 - (i * 11) ** 2)}" y1="${50 + i * 11}" x2="${50 + Math.sqrt(1600 - (i * 11) ** 2)}" y2="${50 + i * 11}" class="ri-par"/>`);
    el.innerHTML = `<div class="ri-world">
        <svg class="ri-globe" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" class="ri-ball"/>${lines.join('')}</svg>
        ${CITIES.map((c, i) => `<span class="ri-city" style="left:${c[0]}%;top:${c[1]}%"><i></i><em>${c[2]}</em></span>
          <span class="ri-part" data-i="${i}" style="left:${c[0]}%;top:${c[1]}%"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[i % ICONS.length]}</svg></span>`).join('')}
        <div class="ri-bar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>${tr('Search parts from around the world')}</span><b class="ri-count">0</b></div>
      </div>
      <div class="ri-text"><span class="ri-eyebrow">${tr('Wholesale room')}</span><b>${tr('Parts from around the world.')}</b><b class="ri-red">${tr('One search.')}</b></div>
      <button class="ri-skip">${tr('Skip')} →</button>`;
    const world = el.querySelector('.ri-world'), bar = el.querySelector('.ri-bar');
    const parts = [...el.querySelectorAll('.ri-part')];
    const tl = gsap.timeline({ onComplete: done });
    tl.from('.room-intro .ri-globe', { scale: .6, opacity: 0, duration: .5, ease: 'back.out(1.6)' })
      .to('.room-intro .ri-mer', { attr: { rx: (i) => 40 - i * 8 }, duration: 3.2, ease: 'none' }, 0)
      .from('.room-intro .ri-city', { scale: 0, opacity: 0, stagger: .05, duration: .3, ease: 'back.out(2)' }, .25)
      .from(bar, { y: 30, opacity: 0, duration: .4, ease: 'power3.out' }, .6);
    // each part travels in an arc from its city into the search bar
    parts.forEach((p, i) => {
      const at = .85 + i * .1;
      const go = () => {
        const w = world.getBoundingClientRect(), b = bar.getBoundingClientRect(), r = p.getBoundingClientRect();
        return { dx: b.left + b.width / 2 - (r.left + r.width / 2), dy: b.top + b.height / 2 - (r.top + r.height / 2) };
      };
      tl.fromTo(p, { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: .2 }, at)
        .to(p, { x: () => go().dx, duration: .75, ease: 'power1.inOut' }, at + .15)
        .to(p, { y: () => go().dy, duration: .75, ease: 'power2.in' }, at + .15)
        .to(p, { scale: .2, opacity: 0, duration: .15 }, at + .82)
        .call(() => { const c = el.querySelector('.ri-count'); if (c) c.textContent = ((i + 1) * 2500).toLocaleString('en') + '+'; }, null, at + .85);
    });
    tl.to(bar, { scale: 1.06, duration: .15, yoyo: true, repeat: 1 }, 2.55)
      .from('.room-intro .ri-text > *', { y: 24, opacity: 0, stagger: .08, duration: .4, ease: 'power3.out' }, 2.45)
      .to(el, { opacity: 0, duration: .35, ease: 'power2.in' }, 3.35);
    return tl;
  }

  // kind: 'retail' | 'wholesale'. Calls after() when finished or skipped.
  window.playRoomIntro = function (kind, after) {
    const fin = () => { after && after(); };
    if (!window.gsap || reduce() || seen(kind) || document.querySelector('.langpick')) { fin(); return; }
    mark(kind);
    const el = overlay(kind === 'wholesale' ? 'ri-wholesale' : 'ri-retail');
    let ended = false;
    const end = () => { if (ended) return; ended = true; el.remove(); document.removeEventListener('keydown', onKey); fin(); };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); end(); } };
    document.addEventListener('keydown', onKey);
    const tl = (kind === 'wholesale' ? wholesale : retail)(el, end);
    el.querySelector('.ri-skip').onclick = () => { tl.kill(); end(); };
    el.querySelector('.ri-skip').focus({ preventScroll: true });
  };
})();
