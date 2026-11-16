// Interfaz: minimapa (abajo a la izquierda), notas y bolsa (abajo a la derecha).
import { B, POI, PATHS, height, zone, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL } from './village.js';
const $ = (id) => document.getElementById(id);
const svg = (body, bg = '#e9dcb8') => `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="150" fill="${bg}"/>${body}</svg>`;

// Ilustraciones provisionales, dibujadas por código
const ART = {
  pewen: svg('<rect x="95" y="50" width="10" height="90" fill="#54463c"/><path d="M40 62 Q100 20 160 62 Q130 50 100 52 Q70 50 40 62Z" fill="#24502d"/><path d="M55 48 Q100 14 145 48 Q100 36 55 48Z" fill="#4f7f3a"/><path d="M72 34 Q100 12 128 34 Q100 26 72 34Z" fill="#24502d"/><rect y="138" width="200" height="12" fill="#7a5f38"/>', '#cfe0e4'),
  pinon: svg('<g transform="translate(100 78)"><path d="M0 -48 Q20 -10 0 46 Q-20 -10 0 -48Z" fill="#c98a2c" stroke="#6a4310" stroke-width="3"/><path d="M-50 -30 Q-22 -4 -44 40 Q-66 0 -50 -30Z" fill="#e0a640" stroke="#6a4310" stroke-width="3" transform="rotate(-18)"/><path d="M50 -30 Q22 -4 44 40 Q66 0 50 -30Z" fill="#b97a22" stroke="#6a4310" stroke-width="3" transform="rotate(18)"/></g>'),
  copihue: svg('<path d="M20 10 Q90 30 180 20" stroke="#2f5d2a" stroke-width="5" fill="none"/><path d="M60 22 q-16 20 -6 60 q10 26 22 30 q12 -4 20 -30 q10 -40 -8 -62Z" fill="#c93040"/><path d="M70 30 q-6 30 6 78" stroke="#ee6a6a" stroke-width="5" fill="none"/><path d="M130 24 q-10 14 -4 40 q6 16 14 18 q8 -2 12 -18 q6 -26 -6 -40Z" fill="#8e1f2a"/><ellipse cx="110" cy="14" rx="18" ry="7" fill="#5c9440"/><ellipse cx="160" cy="34" rx="16" ry="6" fill="#2f5d2a"/>', '#dfe6cf'),
  traro: svg('<path d="M30 70 Q70 40 100 72 Q130 40 170 70 Q132 60 104 86 L100 96 L96 86 Q68 60 30 70Z" fill="#3a2e28"/><circle cx="100" cy="70" r="7" fill="#f2ead6"/><path d="M100 64 l8 4 l-8 3Z" fill="#d99a1c"/><path d="M0 130 Q60 100 110 126 T200 116 V150 H0Z" fill="#46607a" opacity=".6"/>', '#cfe0e4'),
  nahuelbuta: svg('<path d="M0 110 L40 60 L75 95 L110 45 L150 90 L175 70 L200 100 V150 H0Z" fill="#5f7f92"/><path d="M0 125 Q50 95 100 120 T200 112 V150 H0Z" fill="#24502d"/><path d="M0 138 Q60 120 120 136 T200 130 V150 H0Z" fill="#4f7f3a"/>', '#f0d9a8'),
  ngen: svg('<rect x="30" y="0" width="12" height="150" fill="#2e2622"/><rect x="150" y="0" width="14" height="150" fill="#2e2622"/><rect x="86" y="0" width="9" height="150" fill="#3a2e28"/><g fill="none" stroke="#fff6c8" stroke-width="3" opacity=".9"><path d="M100 110 q-30 -20 -6 -42 q26 -18 10 -40"/><circle cx="104" cy="24" r="6" fill="#fff6c8"/></g><circle cx="104" cy="24" r="22" fill="#fff6c8" opacity=".18"/>', '#1f3a2a'),
  leftraru: svg('<g transform="translate(100 20)"><circle cy="22" r="18" fill="#a9714b"/><path d="M-19 20 q19 -34 38 0 q-19 -12 -38 0Z" fill="#1d1a1c"/><rect x="-19" y="12" width="38" height="6" fill="#b3262e"/><path d="M-22 44 L22 44 L38 112 L-38 112Z" fill="#3a3440"/><rect x="-36" y="100" width="72" height="8" fill="#b3262e"/></g>', '#d9c9a0'),
  curinancu: svg('<g transform="translate(100 10)"><circle cy="24" r="20" fill="#96603c"/><path d="M-21 22 q21 -38 42 0 l2 26 q-8 -24 -44 -24Z" fill="#1d1a1c"/><rect x="-21" y="12" width="42" height="7" fill="#e9dcb8"/><path d="M-28 48 L28 48 L50 136 L-50 136Z" fill="#2a2630"/><path d="M-40 96 h80 M-44 112 h88" stroke="#b3262e" stroke-width="6"/><rect x="56" y="10" width="5" height="130" fill="#54463c"/></g>', '#d9c9a0'),
};

export const NOTES = {
  mitologia: [
    { id: 'ngen', title: 'Ngen, los dueños del bosque', art: 'ngen', text: 'Para el pueblo mapuche, cada parte de la naturaleza tiene un ngen: un espíritu dueño que la cuida. El bosque tiene el suyo, y también el agua, el viento y los cerros. Por eso, antes de tomar algo se pide permiso, y se toma solo lo necesario.' },
    { id: 'pewen-sagrado', title: 'El pewen, árbol sagrado', art: 'pewen', text: 'El pewen no es solo un árbol: es un regalo que alimenta a la gente durante el invierno. No se sacude ni se golpea. Se recogen los piñones que el árbol deja caer por sí mismo.' },
  ],
  personajes: [
    { id: 'leftraru', title: 'Leftraru', art: 'leftraru', text: 'Tiene once años. Su nombre significa "traro veloz". Es curioso y paciente: le gusta quedarse quieto mirando cómo se mueven los animales. Con el tiempo, la historia lo conocerá como Lautaro.' },
    { id: 'curinancu', title: 'Curiñancu', art: 'curinancu', text: 'Padre de Leftraru y lonko (jefe) de su comunidad. Su nombre significa "aguilucho negro". Habla poco y enseña haciendo. Según la tradición, así se llamaba el padre de Lautaro.' },
  ],
  naturaleza: [
    { id: 'pewen', title: 'Pewen (araucaria)', art: 'pewen', text: 'Árbol de tronco recto y copa en forma de paraguas. Crece muy lento y puede vivir más de mil años. Habita en la cordillera de los Andes y en Nahuelbuta.' },
    { id: 'pinon', title: 'Piñón (ngülliw)', art: 'pinon', text: 'La semilla del pewen. Madura al final del verano y cae en otoño. Se come cocido o tostado, se muele para hacer harina y se guarda para pasar el invierno.' },
    { id: 'copihue', title: 'Copihue (kopiwe)', art: 'copihue', text: 'Enredadera del bosque húmedo que trepa por los troncos. Sus flores rojas con forma de campana aparecen desde el final del verano hasta el invierno.' },
    { id: 'traro', title: 'Traro', art: 'traro', text: 'Ave rapaz de cara rojiza y copete oscuro. Camina tanto como vuela y observa largo rato antes de actuar. De ella viene el nombre de Leftraru.' },
    { id: 'nahuelbuta', title: 'Nahuelbuta', art: 'nahuelbuta', text: 'Cordillera cercana al mar, cubierta de bosque. Su nombre viene de nawel (el gran felino) y futa (grande). Desde sus cumbres se ven el océano hacia un lado y los volcanes hacia el otro.' },
  ],
};
const CATS = { mitologia: 'Mitología', personajes: 'Personajes', naturaleza: 'Naturaleza' };
const ITEMS = { pinon: { name: 'Piñones', art: 'pinon', text: 'Semillas del pewen, para la celebración.' } };

export function createUI({ world, onToast }) {
  const unlocked = new Set(), bag = {};
  let open = null, cat = 'naturaleza', sel = null;

  // ---------- minimapa: se pinta a partir del terreno real ----------
  const cv = $('minimap'), S = cv.width, ctx = cv.getContext('2d'), k = 2; // 2 píxeles por metro
  const base = document.createElement('canvas'); base.width = (B.x1 - B.x0) * k; base.height = (B.z1 - B.z0) * k;
  const b = base.getContext('2d'), P = (x, z) => [(x - B.x0) * k, (z - B.z0) * k];
  const MC = { forest: [150, 140, 96], grassy: [156, 162, 98], needles: [168, 132, 92], moss: [112, 138, 92], meadow: [186, 190, 110], marsh: [128, 160, 128], earth: [206, 178, 124], path: [226, 204, 158], pebble: [190, 186, 166], bed: [110, 160, 186], rock: [150, 148, 142], alpine: [176, 172, 118] };
  { const img = b.createImageData(base.width, base.height), d = img.data;
    for (let py = 0, o = 0; py < base.height; py++) for (let px = 0; px < base.width; px++, o += 4) {
      const x = B.x0 + px / k, z = B.z0 + py / k, h = height(x, z), c = h < WATER_Y ? [104, 156, 186] : MC[zone(x, z, h, 1)], sh = 0.9 + Math.min(0.2, h * 0.004) + ((px * 7 + py * 13) % 5) * 0.012;
      d[o] = c[0] * sh; d[o + 1] = c[1] * sh; d[o + 2] = c[2] * sh; d[o + 3] = 255;
    }
    b.putImageData(img, 0, 0);
  }
  b.strokeStyle = '#7a5a34'; b.lineWidth = 2; b.setLineDash([5, 5]);
  for (const path of PATHS) { b.beginPath(); path.forEach(([x, z], n) => { const [a, c] = P(x, z); n ? b.lineTo(a, c) : b.moveTo(a, c); }); b.stroke(); }
  b.setLineDash([]);
  for (const t of world.trees) { const [x, y] = P(t.x, t.z); b.fillStyle = t.kind === 'roble' ? '#b98a2e' : t.kind === 'pewen' ? '#2c4f30' : '#3f6b3a'; b.beginPath(); b.arc(x, y, t.kind === 'giant' ? 5 : 3, 0, 7); b.fill(); }
  b.fillStyle = '#6a4a2a'; b.strokeStyle = '#2a1c10'; b.lineWidth = 1.5;
  for (const r of RUKAS) { const [x, y] = P(r.x, r.z); b.beginPath(); b.ellipse(x, y, 7 * r.s, 6 * r.s, 0, 0, 7); b.fill(); b.stroke(); }
  { const [x, y] = P(CORRAL.x, CORRAL.z); b.beginPath(); b.arc(x, y, CORRAL.r * k, 0, 7); b.stroke(); }
  const found = new Set(); let last = { x: 0, z: 0, f: 0 };
  const ZOOM = 1.5; // el mapa sigue al jugador, que queda siempre al centro
  function drawMap(pos, facing) {
    last = { x: pos.x, z: pos.z, f: facing };
    const [px, py] = P(pos.x, pos.z), R = S / 2 - 3;
    ctx.clearRect(0, 0, S, S); ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, R, 0, 7); ctx.clip();
    ctx.fillStyle = '#8f7d52'; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.scale(ZOOM, ZOOM); ctx.translate(-px, -py); ctx.drawImage(base, 0, 0); ctx.restore();
    ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 2.5;
    for (const it of world.items) if (!it.taken) {
      const [x, y] = P(it.base.x, it.base.z); let dx = (x - px) * ZOOM, dy = (y - py) * ZOOM; const d = Math.hypot(dx, dy), far = d > R - 16;
      if (far) { dx *= (R - 16) / d; dy *= (R - 16) / d; } // fuera de vista: se marca en el borde, indicando la dirección
      ctx.fillStyle = far ? '#fff0b0' : '#ffd24a'; ctx.beginPath(); ctx.arc(S / 2 + dx, S / 2 + dy, far ? 7 : 10, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.translate(S / 2, S / 2); ctx.rotate(-facing); // la flecha apunta hacia donde camina
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b1f1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(12, -13); ctx.lineTo(0, -6); ctx.lineTo(-12, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // aro tejido: negro con triángulos rojos y crudos
    ctx.strokeStyle = '#17151b'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(S / 2, S / 2, R - 5, 0, 7); ctx.stroke();
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a), w = 0.06; ctx.fillStyle = i % 2 ? '#a82a2e' : '#f1e7cf'; ctx.beginPath(); ctx.moveTo(S / 2 + c * (R - 12), S / 2 + s2 * (R - 12)); ctx.lineTo(S / 2 + Math.cos(a - w) * (R + 1), S / 2 + Math.sin(a - w) * (R + 1)); ctx.lineTo(S / 2 + Math.cos(a + w) * (R + 1), S / 2 + Math.sin(a + w) * (R + 1)); ctx.fill(); }
    ctx.fillStyle = '#17151b'; ctx.beginPath(); ctx.arc(S / 2, 22, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#f1e7cf'; ctx.font = 'bold 20px Georgia'; ctx.textAlign = 'center'; ctx.fillText('N', S / 2, 29);
  }

  // ---------- paneles ----------
  const panel = $('panel'), body = $('panel-body');
  function render() {
    if (open === 'mapa') {
      $('panel-title').textContent = 'Mapa';
      body.innerHTML = '<canvas id="bigmap" style="max-width:100%;max-height:62vh;border:3px solid #3a2c18;border-radius:8px;display:block;margin:auto"></canvas><p class="muted" style="margin:10px 0 0">Los lugares aparecen con su nombre cuando los visitas.</p>';
      const c = $('bigmap'); c.width = base.width; c.height = base.height; const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      g.textAlign = 'center'; g.font = 'italic bold 19px Georgia'; g.lineWidth = 5; g.strokeStyle = '#e9dcb8'; g.fillStyle = '#3a2c18';
      for (const key in POI) { const [x, y] = P(POI[key].x, POI[key].z), t = found.has(key) ? POI[key].name : '?'; g.strokeText(t, x, y - 14); g.fillText(t, x, y - 14); }
      for (const it of world.items) if (!it.taken) { const [x, y] = P(it.base.x, it.base.z); g.fillStyle = '#ffd24a'; g.strokeStyle = '#5a3a08'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
      const [px, py] = P(last.x, last.z); g.translate(px, py); g.rotate(-last.f); g.fillStyle = '#fff'; g.strokeStyle = '#1b1f1a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 18); g.lineTo(11, -12); g.lineTo(0, -5); g.lineTo(-11, -12); g.closePath(); g.fill(); g.stroke();
    } else if (open === 'bolsa') {
      const ids = Object.keys(bag);
      $('panel-title').textContent = 'Bolsa';
      body.innerHTML = '<div class="grid">' + (ids.length ? ids.map((id) => `<div class="slot" title="${ITEMS[id].text}">${ART[ITEMS[id].art]}<b>${ITEMS[id].name}</b><i>× ${bag[id]}</i></div>`).join('') : '') +
        Array.from({ length: Math.max(0, 8 - ids.length) }, () => '<div class="slot empty"></div>').join('') + '</div>' + (ids.length ? '' : '<p class="muted">Aún no llevas nada.</p>');
    } else {
      $('panel-title').textContent = 'Notas';
      const list = NOTES[cat], cur = list.find((n) => n.id === sel && unlocked.has(n.id));
      body.innerHTML = '<div class="tabs">' + Object.keys(CATS).map((c) => `<button data-cat="${c}" class="${c === cat ? 'on' : ''}">${CATS[c]} <small>${NOTES[c].filter((n) => unlocked.has(n.id)).length}/${NOTES[c].length}</small></button>`).join('') + '</div>' +
        '<div class="notes"><ul>' + list.map((n) => unlocked.has(n.id) ? `<li data-note="${n.id}" class="${n.id === sel ? 'on' : ''}">${n.title}</li>` : '<li class="locked">· · · por descubrir</li>').join('') + '</ul>' +
        (cur ? `<article>${ART[cur.art]}<h3>${cur.title}</h3><p>${cur.text}</p></article>` : '<article class="muted"><p>Elige una nota de la lista.</p></article>') + '</div>';
    }
  }
  function show(which) {
    if (open === which || which === null) { open = null; panel.classList.remove('on'); return; }
    open = which; document.exitPointerLock?.(); panel.classList.add('on'); render();
  }
  body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), n = e.target.closest('[data-note]');
    if (c) { cat = c.dataset.cat; sel = null; render(); } else if (n) { sel = n.dataset.note; render(); }
  });
  $('btn-notas').addEventListener('click', () => show('notas'));
  $('btn-bolsa').addEventListener('click', () => show('bolsa'));
  $('panel-close').addEventListener('click', () => show(null));
  cv.addEventListener('click', () => show('mapa'));

  return {
    drawMap, show,
    get open() { return open; },
    unlock(...ids) {
      for (const id of ids) {
        if (unlocked.has(id)) continue;
        unlocked.add(id);
        for (const c in NOTES) { const n = NOTES[c].find((x) => x.id === id); if (n) { cat = c; sel = id; onToast(`Nueva nota: ${n.title}  (N)`); } }
      }
      $('btn-notas').classList.add('new'); if (open) render();
    },
    discover(key) { if (found.has(key)) return; found.add(key); onToast(`Lugar descubierto: ${POI[key].name}`); },
    addItem(id) { bag[id] = (bag[id] || 0) + 1; if (open) render(); },
    seen() { $('btn-notas').classList.remove('new'); },
    state: { unlocked, bag },
  };
}
