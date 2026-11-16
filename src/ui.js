// Interfaz: minimapa, cuaderno de investigación (notas con foto y puntos), bolsa y mapa.
import { B, POI, PATHS, height, zone, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL } from './village.js';
import { NOTES, CATS, LEVELS } from './notes.js';
const $ = (id) => document.getElementById(id);
const BY = Object.fromEntries(NOTES.map((n) => [n.id, n]));
const SAVE = 'leftraru.cuaderno';

export function createUI({ world, onToast, onClose }) {
  // lo descubierto se guarda en este navegador: id -> foto
  let found = {}; try { found = JSON.parse(localStorage.getItem(SAVE) || '{}'); } catch { found = {}; }
  for (const id in found) if (!BY[id]) delete found[id];
  const bag = {}; let open = null, cat = 'naturaleza', sel = null;
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(found)); } catch { /* sin espacio: se pierde al recargar */ } };
  const points = (c) => NOTES.reduce((s, n) => s + (found[n.id] !== undefined && (!c || n.cat === c) ? CATS[n.cat].pts : 0), 0);
  const total = NOTES.reduce((s, n) => s + CATS[n.cat].pts, 0);
  const level = () => { const p = points(); let l = LEVELS[0]; for (const x of LEVELS) if (p >= x[0]) l = x; const nx = LEVELS[LEVELS.indexOf(l) + 1]; return { name: l[1], next: nx ? nx[0] : null }; };
  const refreshScore = () => { $('score-n').textContent = points(); };

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

  const places = new Set(); let last = { x: 0, z: 0, f: 0 };
  const ZOOM = 1.5; // el mapa sigue al jugador, que queda siempre al centro
  function drawMap(pos, facing) {
    last = { x: pos.x, z: pos.z, f: facing };
    const [px, py] = P(pos.x, pos.z), R = S / 2 - 3;
    ctx.clearRect(0, 0, S, S); ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, R, 0, 7); ctx.clip();
    ctx.fillStyle = '#8f7d52'; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.scale(ZOOM, ZOOM); ctx.translate(-px, -py); ctx.drawImage(base, 0, 0); ctx.restore();
    ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 2.5;
    for (const it of world.items) if (!it.taken) {
      const [x, y] = P(it.base.x, it.base.z); let dx = (x - px) * ZOOM, dy = (y - py) * ZOOM; const d = Math.hypot(dx, dy), far = d > R - 20;
      if (far) { dx *= (R - 20) / d; dy *= (R - 20) / d; } // fuera de vista: se marca en el borde, indicando la dirección
      ctx.fillStyle = far ? '#ffe9a8' : '#f2b441'; ctx.beginPath(); ctx.arc(S / 2 + dx, S / 2 + dy, far ? 7 : 10, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.translate(S / 2, S / 2); ctx.rotate(-facing); // la flecha apunta hacia donde camina
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14110f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(12, -13); ctx.lineTo(0, -6); ctx.lineTo(-12, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // aro: una línea de cobre con cuatro marcas escalonadas en los puntos cardinales
    ctx.strokeStyle = '#14110f'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(S / 2, S / 2, R - 2, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#c98a4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(S / 2, S / 2, R - 2, 0, 7); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = '#14110f'; ctx.fillRect(-13, -R - 2, 26, 10); ctx.fillRect(-8, -R + 8, 16, 6); ctx.fillStyle = i ? '#c98a4a' : '#e9dfc6'; ctx.fillRect(-4, -R + 1, 8, 8); ctx.restore(); }
  }

  // ---------- paneles ----------
  const panel = $('panel'), body = $('panel-body');
  const thumb = (n) => found[n.id] ? `<img src="${found[n.id]}" alt="">` : '<span class="q">?</span>';
  function render() {
    panel.dataset.kind = open;
    if (open === 'mapa') {
      $('panel-title').textContent = 'Mapa del territorio';
      body.innerHTML = '<canvas id="bigmap"></canvas><p class="muted">Los lugares muestran su nombre cuando los visitas. Los puntos dorados son los piñones que faltan.</p>';
      const c = $('bigmap'); c.width = base.width; c.height = base.height; const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      g.textAlign = 'center'; g.font = 'italic bold 19px Georgia'; g.lineWidth = 5; g.strokeStyle = '#efe6cf'; g.fillStyle = '#2a2018';
      for (const key in POI) { const [x, y] = P(POI[key].x, POI[key].z), t = places.has(key) ? POI[key].name : '?'; g.strokeText(t, x, y - 14); g.fillText(t, x, y - 14); }
      for (const it of world.items) if (!it.taken) { const [x, y] = P(it.base.x, it.base.z); g.fillStyle = '#f2b441'; g.strokeStyle = '#3a2408'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
      const [px, py] = P(last.x, last.z); g.translate(px, py); g.rotate(-last.f); g.fillStyle = '#fff'; g.strokeStyle = '#14110f'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 18); g.lineTo(11, -12); g.lineTo(0, -5); g.lineTo(-11, -12); g.closePath(); g.fill(); g.stroke();
    } else if (open === 'bolsa') {
      const ids = Object.keys(bag);
      $('panel-title').textContent = 'Bolsa';
      body.innerHTML = '<p class="muted">Lo que Leftraru lleva consigo.</p><div class="grid">' + ids.map((id) => `<div class="slot">${thumb(BY[id])}<b>${BY[id].title}</b><i>× ${bag[id]}</i></div>`).join('') +
        Array.from({ length: Math.max(0, 8 - ids.length) }, () => '<div class="slot empty"></div>').join('') + '</div>';
    } else {
      $('panel-title').textContent = 'Cuaderno de Leftraru';
      const lv = level(), list = NOTES.filter((n) => n.cat === cat), cur = BY[sel] && BY[sel].cat === cat ? BY[sel] : null, have = found[sel] !== undefined;
      body.innerHTML = `<div class="score"><div><b>${points()}</b> de ${total} puntos de investigación</div><div class="lvl">${lv.name}${lv.next ? ` · siguiente nivel a los ${lv.next}` : ''}</div><div class="bar"><i style="width:${(points() / total * 100).toFixed(1)}%"></i></div></div>` +
        '<div class="tabs">' + Object.keys(CATS).map((c) => `<button data-cat="${c}" class="${c === cat ? 'on' : ''}">${CATS[c].name}<small>${NOTES.filter((n) => n.cat === c && found[n.id] !== undefined).length} / ${NOTES.filter((n) => n.cat === c).length}</small></button>`).join('') + '</div>' +
        `<p class="muted how">${CATS[cat].how} Cada descubrimiento suma ${CATS[cat].pts} puntos.</p>` +
        '<div class="dex"><div class="cards">' + list.map((n) => `<button class="card${found[n.id] !== undefined ? '' : ' locked'}${n.id === sel ? ' on' : ''}" data-note="${n.id}">${thumb(n)}<span>${found[n.id] !== undefined ? n.title : 'Sin descubrir'}</span></button>`).join('') + '</div>' +
        (cur ? (have ? `<article>${found[cur.id] ? `<img src="${found[cur.id]}" alt="${cur.title}">` : ''}<h3>${cur.title}</h3><h4>${cur.sub}</h4><p>${cur.text}</p><em>+${CATS[cur.cat].pts} puntos de investigación</em></article>`
          : `<article class="unknown"><div class="big-q">?</div><h3>Sin descubrir</h3><p>${cur.hint || 'Sigue explorando.'}</p></article>`)
          : '<article class="unknown"><p>Elige una ficha. Las que aún no descubres te dan una pista de dónde buscar.</p></article>') + '</div>';
    }
  }
  function show(which) {
    if (open === which || which === null) { const was = open; open = null; panel.classList.remove('on'); if (was) onClose?.(); return; }
    open = which; document.exitPointerLock?.(); panel.classList.add('on'); if (which === 'notas') $('btn-notas').classList.remove('new'); render();
  }
  body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), n = e.target.closest('[data-note]');
    if (c) { cat = c.dataset.cat; sel = null; render(); } else if (n) { sel = n.dataset.note; render(); }
  });
  $('btn-notas').addEventListener('click', () => show('notas'));
  $('btn-bolsa').addEventListener('click', () => show('bolsa'));
  $('btn-mapa').addEventListener('click', () => show('mapa'));
  $('panel-close').addEventListener('click', () => show(null));
  cv.addEventListener('click', () => show('mapa'));
  refreshScore();

  return {
    drawMap, show, points,
    get open() { return open; },
    has: (id) => found[id] !== undefined,
    // registra un descubrimiento con su foto; devuelve true si era nuevo
    discover(id, img = '') {
      const n = BY[id]; if (!n || found[id] !== undefined) return false;
      found[id] = img; save(); cat = n.cat; sel = id; refreshScore();
      onToast(`${n.title} · +${CATS[n.cat].pts} puntos de investigación`); $('btn-notas').classList.add('new'); if (open) render(); return true;
    },
    place(key) { places.add(key); },
    addItem(id) { bag[id] = (bag[id] || 0) + 1; if (open) render(); },
    reset() { found = {}; save(); refreshScore(); },
    state: { get found() { return found; }, bag },
  };
}
