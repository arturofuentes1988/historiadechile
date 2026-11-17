// Exploración: qué hay cerca de Leftraru que se pueda observar o con quién se puede hablar.
import { POI, CERRO, riverZ, height } from './terrain.js';
import { RUKAS, FOGON } from './village.js';
import { TALK } from './notes.js';

export const PERSON = { 'Curiñancu': 'curinancu', 'Millaray': 'millaray', 'la abuela': 'abuela', 'Ayelén': 'ayelen', 'Rayen': 'rayen', 'la machi': 'machi', 'Ñamku': 'namku' };
const TREE = { pewen: ['pewen', 'el pewen'], coigue: ['coigue', 'el coigüe'], roble: ['roble', 'el roble'], canelo: ['canelo', 'el canelo'], giant: ['gigante', 'el árbol abuelo'], peumo: ['peumo', 'el peumo'], boldo: ['boldo', 'el boldo'], quillay: ['quillay', 'el quillay'], litre: ['litre', 'el litre'] };
// Las aves solo se observan posadas. Números: desde cuán lejos se la puede observar y a qué distancia se pone la cámara de ella.
const BIRD = { traro: ['traro', 'el traro', 36, 2.5], choroy: ['choroy', 'el choroy', 32, 1.8], small: ['rayadito', 'el rayadito', 11, 0.72] };

export function createExplorer({ world, ui }) {
  let reach = 1; // la «vista de traro» lo aumenta
  const H = (x, z) => height(x, z), d2 = (p, x, z) => Math.hypot(p.x - x, p.z - z);
  // Devuelve lo más interesante al alcance: primero lo que falta descubrir
  // still: si Leftraru lleva un rato quieto, también ofrece volver a observar lo ya conocido (para actualizar su foto)
  function scan(p, still = false) {
    const k = reach * 0.7, c = [], // hay que acercarse bastante a las cosas para observarlas
          add = (id, verb, label, d, target, shot, extra) => c.push({ id, verb, label, d, target, shot, known: ui.has(id), ...extra });
    for (const a of world.life.actors) { const id = PERSON[a.name], d = d2(p, a.x, a.z); if (id && d < 2.1) add(id, 'Hablar con', TALK[id].name, d - 10, { x: a.x, y: H(a.x, a.z) + a.h * 0.78, z: a.z }, { dist: 2.1, up: 0.1, fov: 40 }, { person: a }); }
    for (const q of world.life.quads) { const d = d2(p, q.x, q.z), w = q.kind === 'weke'; if (d < (w ? 5 : 5.5) * k) add(w ? 'weke' : 'pudu', 'Observar', w ? 'el weke' : 'el pudú', d, null, { dist: w ? 2.7 : 1.25, up: w ? 0.2 : 0.12, fov: w ? 42 : 34 }, { live: () => ({ x: q.x, y: H(q.x, q.z) + (w ? 0.95 : 0.3) * (q.g.scale.x), z: q.z }) }); }
    for (const b of world.life.birds) { if (!b.perched) continue; const [id, label, r, dist] = BIRD[b.type], bp = b.g.position, d = d2(p, bp.x, bp.z); if (d < r * reach) add(id, 'Observar', label, d / 8, null, { dist, up: dist * 0.1, fov: 36, side: b.perch.cam }, { live: () => b.g.position, rec: b.perch.tree.rec, bird: b.grp }); }
    let rk = null; for (const r of RUKAS) { const d = d2(p, r.x, r.z); if (d < 6 && (!rk || d < rk.d)) rk = { ...r, d }; }
    if (rk) add('ruka', 'Observar', 'la ruka', rk.d, { x: rk.x, y: H(rk.x, rk.z) + 1.7, z: rk.z }, { dist: 9.5, up: 1.2, fov: 48 });
    const fix = (id, label, x, z, r, y, shot) => { const d = d2(p, x, z); if (d < r * k) add(id, 'Observar', label, d, { x, y: H(x, z) + y, z }, shot); };
    fix('kutral', 'el fogón', FOGON.x, FOGON.z, 4.2, 0.5, { dist: 4.6, up: 1.3, fov: 45 });
    fix('rewe', 'el rewe', 20, 19, 4, 1.7, { dist: 5.5, up: 0.6, fov: 45 });
    fix('witral', 'el telar', -10.6, -4.2, 3.2, 1.1, { dist: 3.6, up: 0.3, fov: 42 });
    fix('chemamull', 'las figuras de madera', POI.antiguos.x, POI.antiguos.z, 8, 1.6, { dist: 8.5, up: 0.8, fov: 46 });
    if (d2(p, CERRO[0], CERRO[1]) < 11) { add('pillan', 'Mirar', 'el volcán', 1, null, { view: 'pillan' }); add('lafken', 'Mirar', 'el mar', 1.5, null, { view: 'lafken' }); }
    const rz = riverZ(p.x); if (Math.abs(p.z - rz) < 6) add('rio', 'Observar', 'el río', Math.abs(p.z - rz), { x: p.x + 4, y: -1.3, z: rz }, { dist: 11, up: 3.2, fov: 55 });
    // el árbol entero, en plano general
    const t = world.nearTree(p.x, p.z, 3.6 * k); if (t) { const [id, label] = TREE[t.kind]; add(id, 'Observar', label, t.d, { x: t.x, y: t.y + t.H * 0.5, z: t.z }, { dist: t.H * 1.12 + 3, up: -t.H * 0.28, fov: 56, tree: true }, { rec: t.rec }); }
    // las plantas, de cerca: se calcula su centro y su tamaño reales, y las planas se miran de frente
    for (const [kind, id, label, r, cy, dist, up, fov, face] of [['fern', 'helecho', 'el helecho', 1.8, 0.42, 1.25, 0.75, 44, false], ['reed', 'junco', 'los juncos', 2, 0.85, 2.3, 0.05, 42, true], ['flower', 'flores', 'las flores', 1.6, 0.26, 0.85, 0.3, 40, false], ['quila', 'quila', 'la quila', 3, 1.3, 5, 0.3, 46, false], ['copihue', 'copihue', 'el copihue', 2.4, 0.95, 2.5, 0, 42, false], ['murtilla', 'murtilla', 'la murtilla', 1.6, 0.25, 1.0, 0.3, 42, false], ['michay', 'michay', 'el michay', 2, 0.6, 2.0, 0.3, 44, false], ['chilco', 'chilco', 'el chilco', 2, 0.7, 2.2, 0.2, 44, false], ['nalca', 'nalca', 'la nalca', 2.2, 0.6, 2.6, 0.5, 46, false]]) {
      const s = world.nearPlant(kind, p.x, p.z, r * k); if (s) add(id, 'Observar', label, s.d, { x: s.x, y: s.y + cy * s.s * (face ? s.rec.sy || 1 : 1), z: s.z }, { dist: dist * s.s, up: up * s.s, fov, face }, { rec: s.rec });
    }
    if (d2(p, POI.maqui.x, POI.maqui.z) < 28) { const s = world.nearBush(p.x, p.z, 2.6 * k); if (s) add('maqui', 'Observar', 'el maqui', s.d, { x: s.x, y: s.y + 1.0 * s.s, z: s.z }, { dist: 3.3 * s.s, up: 0.1, fov: 44 }, { rec: s.rec }); }
    const urgent = c.filter((x) => x.person && api.urgent && api.urgent(x.id)).sort((a, b) => a.d - b.d)[0]; if (urgent) return urgent; // quien tiene un encargo pendiente va primero
    const fresh = c.filter((x) => !x.known).sort((a, b) => a.d - b.d)[0];
    if (fresh) return fresh;
    const who = c.filter((x) => x.person).sort((a, b) => a.d - b.d)[0]; if (who) return who;
    const again = still ? c.filter((x) => x.shot && !x.shot.view).sort((a, b) => a.d - b.d)[0] : null;
    return again ? { ...again, verb: 'Volver a observar' } : null;
  }
  // para el «rastreador»: cosas fijas aún sin descubrir, cerca
  function hints(p) {
    const out = [], add = (id, x, z) => { if (!ui.has(id) && d2(p, x, z) < 70) out.push({ x, z }); };
    for (const a of world.life.actors) if (PERSON[a.name]) add(PERSON[a.name], a.x, a.z);
    for (const q of world.life.quads) add(q.kind === 'weke' ? 'weke' : 'pudu', q.x, q.z);
    add('ruka', RUKAS[0].x, RUKAS[0].z); add('kutral', FOGON.x, FOGON.z); add('rewe', 20, 19); add('witral', -10.6, -4.2); add('chemamull', POI.antiguos.x, POI.antiguos.z); add('gigante', POI.viejo.x, POI.viejo.z); add('pillan', CERRO[0], CERRO[1]);
    for (const key in POI) add('l-' + key, POI[key].x, POI[key].z);
    return out;
  }
  const api = { scan, hints, urgent: null, set reach(v) { reach = v; } };
  return api;
}
