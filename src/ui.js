// Interfaz: minimapa, cuaderno de investigación (notas con foto y puntos), bolsa y mapa.
import { B, POI, PATHS, height, zone, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL, FOGON } from './village.js';
import { PERSON } from './explore.js';
import { NOTES, CATS, LEVELS, SKILLS, MISSIONS, FOTOS, POR_SABER } from './notes.js';
const $ = (id) => document.getElementById(id);
const BY = Object.fromEntries(NOTES.map((n) => [n.id, n]));
const SAVE = 'leftraru.cuaderno';

export function createUI({ world, onToast, onClose, onSkill, onGuide }) {
  // lo descubierto se guarda en este navegador: id -> foto
  let data = {}; try { data = JSON.parse(localStorage.getItem(SAVE) || '{}'); } catch { data = {}; }
  if (!data.found) data = { found: data }; // formato antiguo: solo las fotos
  let found = data.found, skills = data.skills || [], done = data.done || {}, extra = data.extra || 0, seen = data.seen || {}, where = data.where || {}, mctx = null; // seen: encargos secundarios que ya te dieron
  for (const id in found) if (!BY[id]) delete found[id];
  const SK = Object.fromEntries(SKILLS.map((k) => [k.id, k]));
  const recien = {}; let lista = '';
  const bag = {}; let open = null, cat = 'flora', sel = null, selM = null, selK = null;
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ found, skills, done, extra, seen, where })); } catch { /* sin espacio: se pierde al recargar */ } };
  // Puntos de investigación: todo lo ganado (cuaderno + misiones + extras). No se gastan: se van sumando, y cada
  // POR_SABER puntos dan un punto de saber, que es lo que se usa para aprender un saber.
  const earned = () => points() + extra + MISSIONS.reduce((t, m) => t + (done[m.id] ? m.pts : 0), 0);
  const avail = () => Math.max(0, Math.floor(earned() / POR_SABER) - skills.length); // puntos de saber sin usar
  const points = (c) => NOTES.reduce((s, n) => s + (found[n.id] !== undefined && (!c || n.cat === c) ? CATS[n.cat].pts : 0), 0);
  const total = NOTES.reduce((s, n) => s + CATS[n.cat].pts, 0);
  const level = () => { const p = points(); let l = LEVELS[0]; for (const x of LEVELS) if (p >= x[0]) l = x; const nx = LEVELS[LEVELS.indexOf(l) + 1]; return { name: l[1], next: nx ? nx[0] : null }; };
  let sabidos = -1; // cuántos puntos de saber se llevaban ganados la última vez que se miró
  const refreshScore = () => { // la barra de arriba: la suma de puntos de investigación y cuánto falta para el próximo punto de saber
    const e = earned(), a = avail(), ganados = Math.floor(e / POR_SABER), quedan = SKILLS.some((k) => !skills.includes(k.id)), txt = $('pts-txt');
    $('score-n').textContent = e; $('pts-bar').style.width = `${((e % POR_SABER) / POR_SABER) * 100}%`;
    txt.textContent = a > 0 && quedan ? `Tienes ${a} ${a === 1 ? 'punto' : 'puntos'} de saber para usar` : `Faltan ${POR_SABER - (e % POR_SABER)} para un punto de saber`; txt.classList.toggle('listo', a > 0 && quedan);
    if (sabidos >= 0 && ganados > sabidos) onToast('Ganaste un punto de saber: úsalo en Saberes para aprender algo nuevo', 'logro');
    sabidos = ganados;
  };

  // ---------- minimapa: se pinta a partir del terreno real ----------
  const cv = $('minimap'), S = cv.width, ctx = cv.getContext('2d'), k = 2; // 2 píxeles por metro
  const base = document.createElement('canvas'); base.width = (B.x1 - B.x0) * k; base.height = (B.z1 - B.z0) * k;
  // El fondo se guarda en la memoria común (willReadFrequently) y no en la de la tarjeta gráfica: si el navegador pierde
  // el contexto gráfico y lo recupera, el dibujo sigue ahí. Por si acaso, además se puede volver a pintar (paintBase).
  const b = base.getContext('2d', { willReadFrequently: true }), P = (x, z) => [(x - B.x0) * k, (z - B.z0) * k];
  const MC = { forest: [150, 140, 96], grassy: [156, 162, 98], needles: [168, 132, 92], moss: [112, 138, 92], meadow: [186, 190, 110], marsh: [128, 160, 128], earth: [206, 178, 124], path: [226, 204, 158], pebble: [190, 186, 166], bed: [110, 160, 186], rock: [150, 148, 142], alpine: [176, 172, 118] };
  function paintBase() {
    const img = b.createImageData(base.width, base.height), d = img.data;
    for (let py = 0, o = 0; py < base.height; py++) for (let px = 0; px < base.width; px++, o += 4) {
      const x = B.x0 + px / k, z = B.z0 + py / k, h = height(x, z), c = h < WATER_Y ? [104, 156, 186] : MC[zone(x, z, h, 1)], sh = 0.9 + Math.min(0.2, h * 0.004) + ((px * 7 + py * 13) % 5) * 0.012;
      d[o] = c[0] * sh; d[o + 1] = c[1] * sh; d[o + 2] = c[2] * sh; d[o + 3] = 255;
    }
    b.putImageData(img, 0, 0);
    b.strokeStyle = '#7a5a34'; b.lineWidth = 2; b.setLineDash([5, 5]);
    for (const path of PATHS) { b.beginPath(); path.forEach(([x, z], n) => { const [a, c] = P(x, z); n ? b.lineTo(a, c) : b.moveTo(a, c); }); b.stroke(); }
    b.setLineDash([]);
    for (const t of world.trees) { const [x, y] = P(t.x, t.z); b.fillStyle = t.kind === 'roble' ? '#b98a2e' : t.kind === 'pewen' ? '#2c4f30' : '#3f6b3a'; b.beginPath(); b.arc(x, y, t.kind === 'giant' ? 5 : 3, 0, 7); b.fill(); }
    b.fillStyle = '#6a4a2a'; b.strokeStyle = '#2a1c10'; b.lineWidth = 1.5;
    for (const r of RUKAS) { const [x, y] = P(r.x, r.z); b.beginPath(); b.ellipse(x, y, 7 * r.s, 6 * r.s, 0, 0, 7); b.fill(); b.stroke(); }
    { const [x, y] = P(CORRAL.x, CORRAL.z); b.beginPath(); b.arc(x, y, CORRAL.r * k, 0, 7); b.stroke(); }
  }
  paintBase(); base.addEventListener('contextrestored', paintBase);
  // La línea de guía: trazos rojos con borde claro, que avanzan hacia el destino. Roja para que no se confunda con los
  // senderos, que en el mapa también son de trazos. pts son puntos [x, z] del mundo.
  function trazo(g, pts, toXY, w = 1) {
    if (!pts || pts.length < 2) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((q, n) => { const [x, y] = toXY(q[0], q[1]); n ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.setLineDash([10 * w, 9 * w]); g.lineDashOffset = -((performance.now() / 55) % (19 * w));
    g.strokeStyle = '#14110f'; g.lineWidth = 9.5 * w; g.stroke(); g.strokeStyle = '#fff1d0'; g.lineWidth = 7.2 * w; g.stroke(); g.strokeStyle = '#e8321c'; g.lineWidth = 4.2 * w; g.stroke(); g.restore();
  }
  // el destino: un banderín rojo
  function meta(g, x, y, k = 1) { g.save(); g.translate(x, y); g.lineWidth = 2.4 * k; g.strokeStyle = '#14110f'; g.fillStyle = '#d0483a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -22 * k); g.stroke(); g.beginPath(); g.moveTo(0, -22 * k); g.lineTo(15 * k, -16 * k); g.lineTo(0, -10 * k); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#14110f'; g.beginPath(); g.arc(0, 0, 3.2 * k, 0, 7); g.fill(); g.restore(); }

  const places = new Set(); let last = { x: 0, z: 0, f: 0 };
  const ZOOM = 1.5; // el mapa sigue al jugador, que queda siempre al centro
  // símbolos del mapa: la aldea (una ruka), misión principal (estrella dorada), encargo (rombo celeste), persona sin conocer (círculo)
  function sym(g, x, y, kind, k = 1) {
    g.save(); g.translate(x, y); g.lineWidth = 2.5 * k; g.strokeStyle = '#14110f';
    const poly = (n, r0, r1) => { g.beginPath(); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, r = i % 2 ? r1 : r0; g.lineTo(Math.sin(a) * r * k, -Math.cos(a) * r * k); } g.closePath(); g.fill(); g.stroke(); };
    if (kind === 'main') { g.fillStyle = '#f2b441'; poly(16, 13, 6.5); }
    else if (kind === 'sec') { g.fillStyle = '#8fd0e0'; poly(4, 11, 11); }
    else if (kind === 'nuevo') { g.fillStyle = '#f1e4c4'; g.beginPath(); g.arc(0, 0, 6 * k, 0, 7); g.fill(); g.stroke(); }
    else { g.fillStyle = '#c89a4a'; g.beginPath(); g.arc(0, 3 * k, 12 * k, Math.PI, 0); g.lineTo(12 * k, 8 * k); g.lineTo(-12 * k, 8 * k); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#14110f'; g.fillRect(-3 * k, 0, 6 * k, 8 * k); g.beginPath(); g.moveTo(-3 * k, -12 * k); g.lineTo(3 * k, -6 * k); g.moveTo(3 * k, -12 * k); g.lineTo(-3 * k, -6 * k); g.stroke(); }
    g.restore();
  }
  // hoja verde: aquí hay algo que te pidieron ir a buscar
  function hoja(g, x, y, k = 1) { g.save(); g.translate(x, y); g.rotate(-0.6); g.fillStyle = '#9fd66a'; g.strokeStyle = '#14110f'; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(0, -11 * k); g.quadraticCurveTo(9 * k, -2 * k, 0, 11 * k); g.quadraticCurveTo(-9 * k, -2 * k, 0, -11 * k); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, -7 * k); g.lineTo(0, 8 * k); g.lineWidth = 1.2 * k; g.stroke(); g.restore(); }
  const FIJOS = { kutral: [FOGON.x, FOGON.z], rewe: [20, 19], witral: [-10.6, -4.2], ruka: [RUKAS[0].x, RUKAS[0].z], chemamull: [POI.antiguos.x, POI.antiguos.z], gigante: [POI.viejo.x, POI.viejo.z], weke: [CORRAL.x, CORRAL.z], palin: [POI.cancha.x, POI.cancha.z] };
  let rot = null, rotT = 0; // cuánto está girado el minimapa
  function drawMap(pos, facing, vista = facing) { // vista: hacia dónde mira la cámara
    last = { x: pos.x, z: pos.z, f: facing };
    const [px, py] = P(pos.x, pos.z), R = S / 2 - 3, now = performance.now();
    // El mapa gira con la cámara: lo que el jugador tiene delante en la pantalla queda siempre arriba, también cuando
    // gira la vista con el ratón sin caminar. Lo sigue casi al instante, con un mínimo de suavizado.
    { const want = vista + Math.PI; if (rot === null) rot = want; let d = want - rot; d = Math.atan2(Math.sin(d), Math.cos(d)); rot += d * (1 - Math.exp(-Math.min(200, now - rotT) / 55)); rotT = now; }
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const off = (x, z) => { const [a, c] = P(x, z), dx = (a - px) * ZOOM, dy = (c - py) * ZOOM; return [dx * cr - dy * sr, dx * sr + dy * cr]; }; // de un punto del mundo a su lugar en el minimapa, medido desde el centro
    const edge = (dx, dy, m) => { const d = Math.hypot(dx, dy), far = d > R - m; return far ? [dx * (R - m) / d, dy * (R - m) / d, true] : [dx, dy, false]; }; // lo que queda fuera se dibuja en el borde, en su dirección
    ctx.clearRect(0, 0, S, S); ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, R, 0, 7); ctx.clip();
    ctx.fillStyle = '#8f7d52'; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(rot); ctx.scale(ZOOM, ZOOM); ctx.translate(-px, -py); ctx.drawImage(base, 0, 0); ctx.restore();
    if (api.guide) { const q = (x, z) => { const [dx, dy] = off(x, z); return [S / 2 + dx, S / 2 + dy]; }; trazo(ctx, api.guide.pts, q, 1.15); }
    if (open === 'mapa') drawBig(); // con el mapa abierto, se va actualizando
    ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 2.5;
    for (const it of world.items) if (!it.taken && !it.off) { const [dx, dy, far] = edge(...off(it.base.x, it.base.z), 20); ctx.fillStyle = far ? '#ffe9a8' : '#f2b441'; ctx.beginPath(); ctx.arc(S / 2 + dx, S / 2 + dy, far ? 7 : 10, 0, 7); ctx.fill(); ctx.stroke(); }
    // la aldea y la gente con algo pendiente
    for (const mk of [{ x: 0, z: 0, kind: 'aldea' }, ...api.people]) { const [dx, dy, far] = edge(...off(mk.x, mk.z), 18); if (far && mk.kind === 'nuevo') continue; sym(ctx, S / 2 + dx, S / 2 + dy, mk.kind, far ? 0.75 : 1); }
    for (const gl of api.goals) { const [dx, dy, far] = edge(...off(gl.x, gl.z), 20); hoja(ctx, S / 2 + dx, S / 2 + dy, far ? 0.8 : 1.15); }
    for (const mk of api.marks) { const [dx, dy] = off(mk.x, mk.z); if (Math.hypot(dx, dy) < R - 14) { ctx.fillStyle = '#14110f'; ctx.beginPath(); ctx.arc(S / 2 + dx, S / 2 + dy, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#e9dfc6'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.fillText('?', S / 2 + dx, S / 2 + dy + 5); } }
    // el banderín del destino va encima de todo lo demás; si queda fuera del minimapa, se ve en el borde, hacia donde está
    if (api.guide) { const [ex, ey, far] = edge(...off(api.guide.x, api.guide.z), 14); meta(ctx, S / 2 + ex, S / 2 + ey, far ? 0.95 : 1.15); }
    // Leftraru: siempre al centro. La flecha apunta hacia donde mira él: arriba si va hacia donde mira la cámara
    ctx.translate(S / 2, S / 2); ctx.rotate(rot - Math.PI - facing); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14110f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(12, 13); ctx.lineTo(0, 6); ctx.lineTo(-12, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // aro: una línea de cobre con cuatro marcas en los puntos cardinales, que giran con el mapa; la clara, con la N, es el norte
    ctx.strokeStyle = '#14110f'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(S / 2, S / 2, R - 2, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#c98a4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(S / 2, S / 2, R - 2, 0, 7); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(rot + i * Math.PI / 2); ctx.fillStyle = '#14110f'; ctx.fillRect(-13, -R - 2, 26, 10); ctx.fillRect(-8, -R + 8, 16, 6); ctx.fillStyle = i ? '#c98a4a' : '#e9dfc6'; ctx.fillRect(-4, -R + 1, 8, 8);
      if (!i) { ctx.translate(0, -R + 27); ctx.rotate(-rot); ctx.font = 'bold 17px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#14110f'; ctx.strokeText('N', 0, 0); ctx.fillStyle = '#e9dfc6'; ctx.fillText('N', 0, 0); } ctx.restore(); }
  }

  // ---------- paneles ----------
  const panel = $('panel'), body = $('panel-body');
  const pic = (id) => (found[id] === undefined ? '' : FOTOS.has(id) ? `assets/cuaderno/${id}.webp` : found[id]); // foto fija y detallada; los lugares, la que tomaste
  const thumb = (n) => pic(n.id) ? `<img src="${pic(n.id)}" alt="" loading="lazy">` : '<span class="q">?</span>';
  // El mapa grande. Se vuelve a dibujar mientras está abierto, para que la guía y la gente se vean al día.
  function drawBig() {
    const c = $('bigmap'); if (!c) return; if (c.width !== base.width) { c.width = base.width; c.height = base.height; }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(base, 0, 0);
    g.textAlign = 'center'; g.font = 'italic bold 19px Georgia'; g.lineWidth = 5; g.strokeStyle = '#efe6cf'; g.fillStyle = '#2a2018';
    for (const key in POI) { const [x, y] = P(POI[key].x, POI[key].z), t = places.has(key) ? POI[key].name : '?'; g.strokeText(t, x, y - 14); g.fillText(t, x, y - 14); }
    // Los nombres de lo descubierto: cada cosa queda anotada donde la encontraste (la gente, donde está ahora).
    // Si dos nombres se pisarían, se deja el punto y se omite el segundo nombre.
    { const boxes = Object.keys(POI).map((key) => { const [x, y] = P(POI[key].x, POI[key].z); return [x - 80, y - 32, 160, 24]; }), COL = { cultura: '#8a3a22', personas: '#2a2018', fauna: '#6a3a14', flora: '#2a4a18' }, list = [];
      for (const a of world.life.actors) { const id = PERSON[a.name]; if (id && found[id] !== undefined) list.push([a.x, a.z, BY[id].title, 'personas']); }
      for (const n of NOTES) { if (found[n.id] === undefined || !COL[n.cat] || n.cat === 'personas') continue; const w = where[n.id] || FIJOS[n.id]; if (w) list.push([w[0], w[1], n.title, n.cat]); }
      const ORD = ['cultura', 'personas', 'fauna', 'flora']; list.sort((a, b) => ORD.indexOf(a[3]) - ORD.indexOf(b[3]));
      g.font = 'italic bold 14px Georgia'; g.lineWidth = 4;
      const libre = (bx) => !boxes.some((o) => bx[0] < o[0] + o[2] && bx[0] + bx[2] > o[0] && bx[1] < o[1] + o[3] && bx[1] + bx[3] > o[1]);
      for (const [wx, wz, name, cat] of list) { const [x, y] = P(wx, wz), tw = g.measureText(name).width;
        g.fillStyle = COL[cat]; g.strokeStyle = '#efe6cf'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.stroke();
        // el nombre busca un lugar libre alrededor de su punto: abajo, arriba, a la derecha, a la izquierda, y un poco más lejos
        const cand = [[x, y + 19], [x, y - 9], [x + tw / 2 + 9, y + 5], [x - tw / 2 - 9, y + 5], [x, y + 35], [x, y - 25], [x + tw / 2 + 9, y + 21], [x - tw / 2 - 9, y + 21], [x + tw / 2 + 9, y - 11], [x - tw / 2 - 9, y - 11]];
        const at = cand.find(([cx, cy]) => libre([cx - tw / 2 - 3, cy - 13, tw + 6, 17])); if (!at) continue;
        boxes.push([at[0] - tw / 2 - 3, at[1] - 13, tw + 6, 17]); g.lineWidth = 4; g.strokeText(name, at[0], at[1]); g.fillText(name, at[0], at[1]); }
      g.font = 'italic bold 19px Georgia'; g.lineWidth = 5; g.strokeStyle = '#efe6cf'; g.fillStyle = '#2a2018'; }
    if (api.guide) trazo(g, api.guide.pts, P, 1.5);
    for (const it of world.items) if (!it.taken && !it.off) { const [x, y] = P(it.base.x, it.base.z); g.fillStyle = '#f2b441'; g.strokeStyle = '#3a2408'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
    { const [x, y] = P(0, 0); sym(g, x, y + 6, 'aldea', 1.2); } for (const mk of api.people) { const [x, y] = P(mk.x, mk.z); sym(g, x, y, mk.kind, 1.1); }
    g.font = 'italic bold 15px Georgia'; for (const gl of api.goals) { const [x, y] = P(gl.x, gl.z); hoja(g, x, y, 1.3); g.lineWidth = 4; g.strokeStyle = '#efe6cf'; g.fillStyle = '#2a4a18'; g.strokeText(gl.label, x, y + 28); g.fillText(gl.label, x, y + 28); }
    if (api.guide) { const [x, y] = P(api.guide.x, api.guide.z); meta(g, x, y, 1.7); }
    const [px, py] = P(last.x, last.z); g.translate(px, py); g.rotate(-last.f); g.fillStyle = '#fff'; g.strokeStyle = '#14110f'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 18); g.lineTo(11, -12); g.lineTo(0, -5); g.lineTo(-11, -12); g.closePath(); g.fill(); g.stroke();
    const txt = api.guide ? `Guía hacia ${api.guide.label} · ${Math.round(api.guide.len)} pasos` : 'Sin guía. Haz clic en el mapa para marcar a dónde quieres ir.';
    if ($('guia-txt').textContent !== txt) { $('guia-txt').textContent = txt; $('guia-off').hidden = !api.guide; }
  }
  // Un clic en el mapa marca el destino de la guía: una persona con algo pendiente, algo que hay que ir a buscar, un lugar o un punto cualquiera.
  function pickOnMap(x, z) {
    const near = (list, r) => list.map((o) => [Math.hypot(o.x - x, o.z - z), o]).filter((q) => q[0] < r).sort((a, b) => a[0] - b[0])[0]?.[1];
    if (api.guide && Math.hypot(api.guide.x - x, api.guide.z - z) < 9) return onGuide(null); // clic en el destino: se quita
    const who = near(api.people, 9), gl = near(api.goals, 9), it = near(world.items.filter((i) => !i.taken && !i.off).map((i) => ({ x: i.base.x, z: i.base.z })), 8), key = Object.keys(POI).find((q) => Math.hypot(POI[q].x - x, POI[q].z - z) < 12);
    if (who) return onGuide(who.kind === 'main' && actId ? { kind: 'mision', id: actId } : { kind: 'persona', id: who.id });
    if (gl) return onGuide({ kind: 'punto', x: gl.x, z: gl.z, label: gl.label });
    if (it) return onGuide({ kind: 'punto', x: it.x, z: it.z, label: 'un piñón' });
    if (key) return onGuide({ kind: 'punto', x: POI[key].x, z: POI[key].z, label: places.has(key) ? POI[key].name : 'un lugar que aún no conoces' });
    onGuide({ kind: 'punto', x, z, label: 'el punto que marcaste' });
  }
  const toggleGuide = (id) => onGuide(api.guideKey === 'm:' + id ? null : { kind: 'mision', id });
  function render() {
    panel.dataset.kind = open;
    if (open === 'mapa') {
      $('panel-title').textContent = 'Mapa del territorio';
      body.innerHTML = '<canvas id="bigmap"></canvas><div class="guiabar"><span id="guia-txt"></span><button id="guia-off" class="btn" hidden>Quitar la guía</button></div><p class="muted">Haz clic en el mapa para marcar un destino: una línea roja de trazos te muestra el camino y se va acortando a medida que avanzas. También puedes hacer clic en una estrella, un rombo o una hoja. Los lugares muestran su nombre cuando los visitas, y todo lo que descubres queda anotado con su nombre donde lo encontraste. Los puntos dorados son piñones; la estrella, la historia; el rombo, un encargo; el círculo, alguien que aún no conoces; la hoja verde, algo que te pidieron ir a buscar.</p>';
      drawBig();
    } else if (open === 'misiones') {
      // Principales: todas a la vista y en orden; cada una se abre al terminar la anterior.
      // Secundarias: solo las que ya te encargaron; las demás aparecen al conversar con la gente.
      $('panel-title').textContent = 'Misiones';
      const st = (m) => (done[m.id] ? 'done' : m.soon || (m.pide && !done[m.pide]) ? 'locked' : 'open');
      const vis = (m) => m.main || !!done[m.id] || !!seen[m.id];
      const row = (m) => { const r = m.check && mctx ? m.check(mctx) : [false, 0, 1], k = st(m);
        return `<button class="mrow2 ${k}${m.id === selM ? ' on' : ''}" data-mis="${m.id}"><span class="dot"></span><span class="t">${m.title}</span><span class="p">${k === 'done' ? 'hecha' : k === 'locked' ? (m.soon ? 'próximamente' : 'bloqueada') : r[2] > 1 ? `${r[1]} / ${r[2]}` : 'en curso'}</span></button>`; };
      const sec = MISSIONS.filter((x) => !x.main), mine = sec.filter(vis);
      const m = MISSIONS.find((x) => x.id === selM && vis(x)) || MISSIONS.find((x) => x.main && st(x) === 'open') || MISSIONS[0], k = st(m), r = m.check && mctx ? m.check(mctx) : [false, 0, 1];
      const text = typeof m.text === 'function' ? (mctx ? m.text(mctx) : '') : m.text;
      body.innerHTML = '<div class="mis2"><div><h4 class="sec2">Historia</h4>' + MISSIONS.filter((x) => x.main).map(row).join('') + '<h4 class="sec2">Encargos</h4>' + mine.map(row).join('') +
        (mine.length < sec.length ? `<p class="muted how">${mine.length ? 'Hay más encargos: conversa con la gente de la aldea.' : 'Aún no tienes encargos. Conversa con la gente de la aldea: cada quien tiene algo que pedirte o enseñarte.'}</p>` : '') + '</div>' +
        `<aside><small>${m.main ? `Historia · misión ${m.n} de ${MISSIONS.filter((x) => x.main).length}` : 'Encargo · opcional'}</small><h3>${m.title}</h3>` +
        (m.soon ? '<p class="muted">Llegará con los próximos capítulos.</p>' : k === 'locked' ? '<p class="muted">Se abre al terminar la misión anterior.</p>' :
          `<p>${text}</p>${m.who ? `<p class="muted">${m.main ? 'Misión' : 'Encargo'} de ${m.who}.</p>` : ''}<div class="prog"><i style="width:${(k === 'done' ? 1 : r[1] / r[2]) * 100}%"></i></div><em>${k === 'done' ? 'Completada' : `${r[1]} de ${r[2]}`} · ${m.pts} puntos</em>` +
          (k === 'open' ? `<p><button class="btn${api.guideKey === 'm:' + m.id ? '' : ' main'}" data-guia="${m.id}">${api.guideKey === 'm:' + m.id ? 'Quitar la guía' : 'Guiarme en el mapa'}</button></p>` : '')) + '</aside></div>';
    } else if (open === 'saberes') {
      // árbol: Leftraru arriba, y de él bajan las ramas; cada nudo es un saber
      $('panel-title').textContent = 'Saberes';
      const POS = { raiz: [50, 8], vista: [12, 46], rastro: [12, 84], pudu: [37, 46], ligero: [63, 46], salto: [63, 84], memoria: [88, 46] };
      const info = (k) => { const have = skills.includes(k.id), teacher = BY[k.de], met = found[k.de] !== undefined, pre = !k.pide || skills.includes(k.pide), can = !have && met && pre && avail() >= 1;
        return { have, can, teacher, why: have ? 'Ya lo aprendiste.' : !met ? `Habla primero con ${teacher.title}.` : !pre ? `Antes debes aprender ${SK[k.pide].name}.` : avail() < 1 ? `Te falta un punto de saber: se gana uno cada ${POR_SABER} puntos de investigación.` : '' }; };
      const line = (a, b, on) => `<line x1="${POS[a][0]}" y1="${POS[a][1]}" x2="${POS[b][0]}" y2="${POS[b][1]}" class="${on ? 'on' : ''}"/>`;
      const k = SK[selK] || SKILLS[0], d = info(k);
      body.innerHTML = `<div class="score"><div><b>${avail()}</b> ${avail() === 1 ? 'punto' : 'puntos'} de saber para usar</div><div class="lvl">${earned()} puntos de investigación · cada ${POR_SABER} dan un punto de saber · faltan ${POR_SABER - (earned() % POR_SABER)} para el próximo</div><div class="bar"><i style="width:${(((earned() % POR_SABER) / POR_SABER) * 100).toFixed(1)}%"></i></div></div>` +
        '<div class="tree2"><div class="canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none">' + SKILLS.map((x) => line(x.pide || 'raiz', x.id, skills.includes(x.id))).join('') + '</svg>' +
        `<div class="node root" style="left:${POS.raiz[0]}%;top:${POS.raiz[1]}%"><i></i><span>Leftraru<small>Observar</small></span></div>` +
        ['El bosque|24', 'El cuerpo|63', 'La palabra|88'].map((x) => { const [n, l] = x.split('|'); return `<div class="branch" style="left:${l}%">${n}</div>`; }).join('') +
        SKILLS.map((x) => { const q = info(x); return `<button class="node${q.have ? ' have' : q.can ? ' can' : ''}${x.id === k.id ? ' on' : ''}" data-node="${x.id}" style="left:${POS[x.id][0]}%;top:${POS[x.id][1]}%"><i></i><span>${x.name}<small>${q.have ? 'aprendido' : '1 punto de saber'}</small></span></button>`; }).join('') + '</div>' +
        `<aside><small>${k.rama}</small><h3>${k.name}</h3><p>${k.text}</p><p class="muted">Lo enseña ${d.teacher.title}. Cuesta 1 punto de saber.</p>${d.can ? `<button class="btn main" data-skill="${k.id}">Aprender</button>` : `<em>${d.why}</em>`}</aside></div>`;
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
        (cur ? (have ? `<article>${pic(cur.id) ? `<img src="${pic(cur.id)}" alt="${cur.title}">` : ''}<h3>${cur.title}</h3><h4>${cur.sub}</h4><p>${cur.text}</p><em>+${CATS[cur.cat].pts} puntos de investigación</em></article>`
          : `<article class="unknown"><div class="big-q">?</div><h3>Sin descubrir</h3><p>${cur.hint || 'Sigue explorando.'}</p></article>`)
          : '<article class="unknown"><p>Elige una ficha. Las que aún no descubres te dan una pista de dónde buscar.</p></article>') + '</div>';
    }
  }
  function show(which) {
    if (open === which || which === null) { const was = open; open = null; panel.classList.remove('on'); if (was) onClose?.(); return; }
    open = which; document.exitPointerLock?.(); panel.classList.add('on'); if (which === 'notas') $('btn-notas').classList.remove('new'); if (which === 'misiones') $('btn-misiones').classList.remove('new'); render();
  }
  body.addEventListener('click', (e) => {
    const bm = e.target.closest('#bigmap'), gu = e.target.closest('[data-guia]');
    if (bm) { const r = bm.getBoundingClientRect(); return pickOnMap(B.x0 + ((e.clientX - r.left) / r.width) * (B.x1 - B.x0), B.z0 + ((e.clientY - r.top) / r.height) * (B.z1 - B.z0)); }
    if (e.target.closest('#guia-off')) return onGuide(null);
    if (gu) { toggleGuide(gu.dataset.guia); return render(); }
    const c = e.target.closest('[data-cat]'), n = e.target.closest('[data-note]'), k = e.target.closest('[data-skill]'), mi = e.target.closest('[data-mis]'), nd = e.target.closest('[data-node]');
    if (mi) { selM = mi.dataset.mis; return render(); } if (nd) { selK = nd.dataset.node; return render(); }
    if (c) { cat = c.dataset.cat; sel = null; render(); } else if (n) { sel = n.dataset.note; render(); }
    else if (k && avail() >= 1) { skills.push(k.dataset.skill); save(); refreshScore(); onToast(`Aprendiste: ${SK[k.dataset.skill].name}`, 'logro'); onSkill?.(); render(); }
  });
  $('btn-notas').addEventListener('click', () => show('notas'));
  $('btn-bolsa').addEventListener('click', () => show('bolsa'));
  $('btn-mapa').addEventListener('click', () => show('mapa'));
  $('btn-misiones').addEventListener('click', () => show('misiones'));
  $('btn-saberes').addEventListener('click', () => show('saberes'));
  $('panel-close').addEventListener('click', () => show(null));
  cv.addEventListener('click', () => show('mapa'));
  $('mis-lista').addEventListener('click', (e) => { const r = e.target.closest('[data-guia]'); if (r) toggleGuide(r.dataset.guia); }); // un clic en una misión de la lista de la izquierda pone (o quita) su guía
  let actId = null; // la misión de la historia que está abierta
  refreshScore();

  const api = {
    drawMap, show, points,
    get open() { return open; },
    has: (id) => found[id] !== undefined,
    // registra un descubrimiento con su foto; devuelve true si era nuevo
    discover(id, img = '', at = null) { // at: dónde estaba lo descubierto, para anotar su nombre en el mapa
      const n = BY[id]; if (!n || found[id] !== undefined) return false;
      if (at && Number.isFinite(at.x + at.z)) where[id] = [Math.round(at.x), Math.round(at.z)];
      const bonus = skills.includes('memoria') ? 5 : 0; extra += bonus;
      found[id] = img; save(); cat = n.cat; sel = id; refreshScore();
      onToast(`${n.title} · +${CATS[n.cat].pts + bonus} puntos de investigación`, 'hallazgo'); $('btn-notas').classList.add('new'); if (open) render(); return true;
    },
    retake(id, img) { if (found[id] === undefined) return; found[id] = img; save(); onToast(`Foto actualizada: ${BY[id].title}`, 'foto'); if (open) render(); },
    place(key) { places.add(key); },
    addItem(id) { bag[id] = (bag[id] || 0) + 1; if (open) render(); },
    takeItem(id, n = 1) { bag[id] = (bag[id] || 0) - n; if (bag[id] <= 0) delete bag[id]; if (open) render(); },
    reset() { found = {}; skills = []; done = {}; extra = 0; seen = {}; where = {}; save(); refreshScore(); },
    skill: (id) => skills.includes(id), avail, earned,
    // Revisa las misiones con el estado actual: anota los encargos que te acaban de dar, entrega recompensas
    // y devuelve la misión de la historia que está abierta, con el aviso de lo que toca hacer.
    missions(c) {
      mctx = { ...c, has: (id) => found[id] !== undefined };
      const fresh = [], won = [];
      for (const m of MISSIONS) {
        if (!m.check || done[m.id] || (m.pide && !done[m.pide])) continue;
        if (!m.main && !seen[m.id]) { if (m.ver && !m.ver(mctx)) continue; seen[m.id] = 1; fresh.push(m.title); } // un encargo no corre hasta que te lo dan
        if (m.check(mctx)[0]) { done[m.id] = 1; won.push(m); }
      }
      if (fresh.length) { onToast(fresh.length > 3 ? `Tienes ${fresh.length} encargos nuevos: míralos en Misiones` : `${fresh.length === 1 ? 'Nuevo encargo' : 'Nuevos encargos'}: ${fresh.join(' · ')}`, 'encargo'); $('btn-misiones').classList.add('new'); }
      for (const m of won) onToast(`Misión completada: ${m.title} · +${m.pts} puntos`, 'logro');
      if (fresh.length || won.length) { save(); refreshScore(); if (open) render(); }
      for (const m of won) recien[m.id] = performance.now();
      const act = MISSIONS.find((m) => m.main && m.check && !done[m.id] && (!m.pide || done[m.pide])); actId = act ? act.id : null;
      const now = performance.now(), row = (m, cls) => { const r = m.check(mctx), on = api.guideKey === 'm:' + m.id; return `<div class="ml ${cls}${on ? ' guiada' : ''}"${cls !== 'hecha' ? ` data-guia="${m.id}" title="${on ? 'Quitar la guía' : 'Guiarme hasta aquí en el mapa'}"` : ''}><i></i><span>${m.title}</span><em>${cls !== 'hecha' && r[2] > 1 ? `${r[1]} / ${r[2]}` : ''}</em></div>`; };
      let h = '<h5>Historia</h5>';
      for (const m of MISSIONS) if (m.main && m.check) { if (done[m.id]) h += row(m, 'hecha'); else if (m === act) h += row(m, 'actual') + `<div class="paso">${act.paso ? act.paso(mctx) : ''}</div>`; }
      if (!act) h += '<div class="paso">Continuará…</div>';
      const enc = MISSIONS.filter((m) => !m.main && seen[m.id] && (!done[m.id] || now - (recien[m.id] || 0) < 15000)); // un encargo recién cumplido se ve tachado un momento
      if (enc.length) h += '<h5>Encargos</h5>' + enc.slice(0, 5).map((m) => row(m, done[m.id] ? 'hecha' : '')).join('') + (enc.length > 5 ? `<div class="paso">y ${enc.length - 5} más</div>` : '');
      if (h !== lista) { lista = h; $('mis-lista').innerHTML = h; }
      return act ? { id: act.id, title: act.title, prog: act.check(mctx), aviso: typeof act.aviso === 'function' ? act.aviso(mctx) : act.aviso, fijo: !!(act.fijo && act.fijo(mctx)) } : null;
    },
    marks: [], people: [], goals: [],
    guide: null, guideKey: '', // la línea de guía ({ pts, x, z, label, len }) y a qué apunta ('m:id' si es una misión)
    repaint: paintBase, done: (id) => !!done[id],
    state: { get found() { return found; }, bag, get skills() { return skills; }, get done() { return done; } },
  };
  return api;
}
