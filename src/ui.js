// Interfaz: minimapa, cuaderno de investigación (notas con foto y puntos), bolsa y mapa.
import { B, POI, PATHS, height, zone, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL } from './village.js';
import { NOTES, CATS, LEVELS, SKILLS, MISSIONS, FOTOS } from './notes.js';
const $ = (id) => document.getElementById(id);
const BY = Object.fromEntries(NOTES.map((n) => [n.id, n]));
const SAVE = 'leftraru.cuaderno';

export function createUI({ world, onToast, onClose, onSkill }) {
  // lo descubierto se guarda en este navegador: id -> foto
  let data = {}; try { data = JSON.parse(localStorage.getItem(SAVE) || '{}'); } catch { data = {}; }
  if (!data.found) data = { found: data }; // formato antiguo: solo las fotos
  let found = data.found, skills = data.skills || [], done = data.done || {}, extra = data.extra || 0, seen = data.seen || {}, mctx = null; // seen: encargos secundarios que ya te dieron
  for (const id in found) if (!BY[id]) delete found[id];
  const SK = Object.fromEntries(SKILLS.map((k) => [k.id, k]));
  const bag = {}; let open = null, cat = 'flora', sel = null, selM = null, selK = null;
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ found, skills, done, extra, seen })); } catch { /* sin espacio: se pierde al recargar */ } };
  // puntos ganados (cuaderno + misiones + extras) y puntos disponibles (ganados menos lo gastado en saberes)
  const earned = () => points() + extra + MISSIONS.reduce((t, m) => t + (done[m.id] ? m.pts : 0), 0);
  const avail = () => earned() - skills.reduce((t, id) => t + SK[id].cost, 0);
  const points = (c) => NOTES.reduce((s, n) => s + (found[n.id] !== undefined && (!c || n.cat === c) ? CATS[n.cat].pts : 0), 0);
  const total = NOTES.reduce((s, n) => s + CATS[n.cat].pts, 0);
  const level = () => { const p = points(); let l = LEVELS[0]; for (const x of LEVELS) if (p >= x[0]) l = x; const nx = LEVELS[LEVELS.indexOf(l) + 1]; return { name: l[1], next: nx ? nx[0] : null }; };
  const refreshScore = () => { $('score-n').textContent = avail(); };

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
  function drawMap(pos, facing) {
    last = { x: pos.x, z: pos.z, f: facing };
    const [px, py] = P(pos.x, pos.z), R = S / 2 - 3;
    ctx.clearRect(0, 0, S, S); ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, R, 0, 7); ctx.clip();
    ctx.fillStyle = '#8f7d52'; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.scale(ZOOM, ZOOM); ctx.translate(-px, -py); ctx.drawImage(base, 0, 0); ctx.restore();
    ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 2.5;
    for (const it of world.items) if (!it.taken && !it.off) {
      const [x, y] = P(it.base.x, it.base.z); let dx = (x - px) * ZOOM, dy = (y - py) * ZOOM; const d = Math.hypot(dx, dy), far = d > R - 20;
      if (far) { dx *= (R - 20) / d; dy *= (R - 20) / d; } // fuera de vista: se marca en el borde, indicando la dirección
      ctx.fillStyle = far ? '#ffe9a8' : '#f2b441'; ctx.beginPath(); ctx.arc(S / 2 + dx, S / 2 + dy, far ? 7 : 10, 0, 7); ctx.fill(); ctx.stroke();
    }
    // la aldea y la gente con algo pendiente: si quedan fuera de la vista, se dibujan en el borde, en su dirección
    for (const mk of [{ x: 0, z: 0, kind: 'aldea' }, ...api.people]) { const [x, y] = P(mk.x, mk.z); let dx = (x - px) * ZOOM, dy = (y - py) * ZOOM; const d = Math.hypot(dx, dy), far = d > R - 18; if (far && mk.kind === 'nuevo') continue; if (far) { dx *= (R - 18) / d; dy *= (R - 18) / d; } sym(ctx, S / 2 + dx, S / 2 + dy, mk.kind, far ? 0.75 : 1); }
    for (const mk of api.marks) { const [x, y] = P(mk.x, mk.z), dx = (x - px) * ZOOM, dy = (y - py) * ZOOM; if (Math.hypot(dx, dy) < R - 14) { ctx.fillStyle = '#14110f'; ctx.beginPath(); ctx.arc(S / 2 + dx, S / 2 + dy, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#e9dfc6'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.fillText('?', S / 2 + dx, S / 2 + dy + 5); } }
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
  const pic = (id) => (found[id] === undefined ? '' : FOTOS.has(id) ? `assets/cuaderno/${id}.webp` : found[id]); // foto fija y detallada; los lugares, la que tomaste
  const thumb = (n) => pic(n.id) ? `<img src="${pic(n.id)}" alt="" loading="lazy">` : '<span class="q">?</span>';
  function render() {
    panel.dataset.kind = open;
    if (open === 'mapa') {
      $('panel-title').textContent = 'Mapa del territorio';
      body.innerHTML = '<canvas id="bigmap"></canvas><p class="muted">Los lugares muestran su nombre cuando los visitas. Los puntos dorados son los piñones que faltan por recoger. La ruka marca la aldea; la estrella dorada, una misión principal; el rombo celeste, un encargo; el círculo, alguien que aún no conoces.</p>';
      const c = $('bigmap'); c.width = base.width; c.height = base.height; const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      g.textAlign = 'center'; g.font = 'italic bold 19px Georgia'; g.lineWidth = 5; g.strokeStyle = '#efe6cf'; g.fillStyle = '#2a2018';
      for (const key in POI) { const [x, y] = P(POI[key].x, POI[key].z), t = places.has(key) ? POI[key].name : '?'; g.strokeText(t, x, y - 14); g.fillText(t, x, y - 14); }
      for (const it of world.items) if (!it.taken && !it.off) { const [x, y] = P(it.base.x, it.base.z); g.fillStyle = '#f2b441'; g.strokeStyle = '#3a2408'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
      { const [x, y] = P(0, 0); sym(g, x, y + 6, 'aldea', 1.2); } for (const mk of api.people) { const [x, y] = P(mk.x, mk.z); sym(g, x, y, mk.kind, 1.1); }
      const [px, py] = P(last.x, last.z); g.translate(px, py); g.rotate(-last.f); g.fillStyle = '#fff'; g.strokeStyle = '#14110f'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 18); g.lineTo(11, -12); g.lineTo(0, -5); g.lineTo(-11, -12); g.closePath(); g.fill(); g.stroke();
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
          `<p>${text}</p>${m.who ? `<p class="muted">${m.main ? 'Misión' : 'Encargo'} de ${m.who}.</p>` : ''}<div class="prog"><i style="width:${(k === 'done' ? 1 : r[1] / r[2]) * 100}%"></i></div><em>${k === 'done' ? 'Completada' : `${r[1]} de ${r[2]}`} · ${m.pts} puntos</em>`) + '</aside></div>';
    } else if (open === 'saberes') {
      // árbol: Leftraru arriba, y de él bajan las ramas; cada nudo es un saber
      $('panel-title').textContent = 'Saberes';
      const POS = { raiz: [50, 8], vista: [12, 46], rastro: [12, 84], pudu: [37, 46], ligero: [63, 46], salto: [63, 84], memoria: [88, 46] };
      const info = (k) => { const have = skills.includes(k.id), teacher = BY[k.de], met = found[k.de] !== undefined, pre = !k.pide || skills.includes(k.pide), can = !have && met && pre && avail() >= k.cost;
        return { have, can, teacher, why: have ? 'Ya lo aprendiste.' : !met ? `Habla primero con ${teacher.title}.` : !pre ? `Antes debes aprender ${SK[k.pide].name}.` : avail() < k.cost ? `Te faltan ${k.cost - avail()} puntos.` : '' }; };
      const line = (a, b, on) => `<line x1="${POS[a][0]}" y1="${POS[a][1]}" x2="${POS[b][0]}" y2="${POS[b][1]}" class="${on ? 'on' : ''}"/>`;
      const k = SK[selK] || SKILLS[0], d = info(k);
      body.innerHTML = `<div class="score"><div><b>${avail()}</b> puntos para gastar</div><div class="lvl">has ganado ${earned()} en total</div></div>` +
        '<div class="tree2"><div class="canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none">' + SKILLS.map((x) => line(x.pide || 'raiz', x.id, skills.includes(x.id))).join('') + '</svg>' +
        `<div class="node root" style="left:${POS.raiz[0]}%;top:${POS.raiz[1]}%"><i></i><span>Leftraru<small>Observar</small></span></div>` +
        ['El bosque|24', 'El cuerpo|63', 'La palabra|88'].map((x) => { const [n, l] = x.split('|'); return `<div class="branch" style="left:${l}%">${n}</div>`; }).join('') +
        SKILLS.map((x) => { const q = info(x); return `<button class="node${q.have ? ' have' : q.can ? ' can' : ''}${x.id === k.id ? ' on' : ''}" data-node="${x.id}" style="left:${POS[x.id][0]}%;top:${POS[x.id][1]}%"><i></i><span>${x.name}<small>${q.have ? 'aprendido' : x.cost + ' puntos'}</small></span></button>`; }).join('') + '</div>' +
        `<aside><small>${k.rama}</small><h3>${k.name}</h3><p>${k.text}</p><p class="muted">Lo enseña ${d.teacher.title}. Cuesta ${k.cost} puntos.</p>${d.can ? `<button class="btn main" data-skill="${k.id}">Aprender</button>` : `<em>${d.why}</em>`}</aside></div>`;
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
    const c = e.target.closest('[data-cat]'), n = e.target.closest('[data-note]'), k = e.target.closest('[data-skill]'), mi = e.target.closest('[data-mis]'), nd = e.target.closest('[data-node]');
    if (mi) { selM = mi.dataset.mis; return render(); } if (nd) { selK = nd.dataset.node; return render(); }
    if (c) { cat = c.dataset.cat; sel = null; render(); } else if (n) { sel = n.dataset.note; render(); }
    else if (k && avail() >= SK[k.dataset.skill].cost) { skills.push(k.dataset.skill); save(); refreshScore(); onToast(`Aprendiste: ${SK[k.dataset.skill].name}`, 'logro'); onSkill?.(); render(); }
  });
  $('btn-notas').addEventListener('click', () => show('notas'));
  $('btn-bolsa').addEventListener('click', () => show('bolsa'));
  $('btn-mapa').addEventListener('click', () => show('mapa'));
  $('btn-misiones').addEventListener('click', () => show('misiones'));
  $('btn-saberes').addEventListener('click', () => show('saberes'));
  $('panel-close').addEventListener('click', () => show(null));
  cv.addEventListener('click', () => show('mapa'));
  refreshScore();

  const api = {
    drawMap, show, points,
    get open() { return open; },
    has: (id) => found[id] !== undefined,
    // registra un descubrimiento con su foto; devuelve true si era nuevo
    discover(id, img = '') {
      const n = BY[id]; if (!n || found[id] !== undefined) return false;
      const bonus = skills.includes('memoria') ? 5 : 0; extra += bonus;
      found[id] = img; save(); cat = n.cat; sel = id; refreshScore();
      onToast(`${n.title} · +${CATS[n.cat].pts + bonus} puntos de investigación`, 'hallazgo'); $('btn-notas').classList.add('new'); if (open) render(); return true;
    },
    retake(id, img) { if (found[id] === undefined) return; found[id] = img; save(); onToast(`Foto actualizada: ${BY[id].title}`, 'foto'); if (open) render(); },
    place(key) { places.add(key); },
    addItem(id) { bag[id] = (bag[id] || 0) + 1; if (open) render(); },
    takeItem(id, n = 1) { bag[id] = (bag[id] || 0) - n; if (bag[id] <= 0) delete bag[id]; if (open) render(); },
    reset() { found = {}; skills = []; done = {}; extra = 0; seen = {}; save(); refreshScore(); },
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
      const act = MISSIONS.find((m) => m.main && m.check && !done[m.id] && (!m.pide || done[m.pide]));
      return act ? { title: act.title, prog: act.check(mctx), aviso: typeof act.aviso === 'function' ? act.aviso(mctx) : act.aviso, fijo: !!(act.fijo && act.fijo(mctx)) } : null;
    },
    marks: [], people: [],
    state: { get found() { return found; }, bag, get skills() { return skills; }, get done() { return done; } },
  };
  return api;
}
