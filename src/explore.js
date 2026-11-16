// Exploración: qué hay cerca de Leftraru que se pueda observar o con quién se puede hablar.
import { POI, CERRO, riverZ, height } from './terrain.js';
import { RUKAS, FOGON } from './village.js';
import { TALK } from './notes.js';

const PERSON = { 'Curiñancu': 'curinancu', 'Millaray': 'millaray', 'la abuela': 'abuela', 'Ayelén': 'ayelen', 'Rayen': 'rayen', 'la machi': 'machi', 'Ñamku': 'namku' };
const TREE = { pewen: ['pewen', 'el pewen'], coigue: ['coigue', 'el coigüe'], roble: ['roble', 'el roble'], canelo: ['canelo', 'el canelo'], giant: ['gigante', 'el árbol abuelo'] };
const BIRD = { traro: ['traro', 'el traro', 85, 9], choroy: ['choroy', 'los choroyes', 75, 12], small: ['rayadito', 'los rayaditos', 17, 15] };

export function createExplorer({ world, ui }) {
  const H = (x, z) => height(x, z), d2 = (p, x, z) => Math.hypot(p.x - x, p.z - z);
  // Devuelve lo más interesante al alcance: primero lo que falta descubrir
  function scan(p) {
    const c = [], add = (id, verb, label, d, target, shot, extra) => c.push({ id, verb, label, d, target, shot, known: ui.has(id), ...extra });
    for (const a of world.life.actors) { const id = PERSON[a.name], d = d2(p, a.x, a.z); if (id && d < 3) add(id, 'Hablar con', TALK[id].name, d - 10, { x: a.x, y: H(a.x, a.z) + a.h * 0.78, z: a.z }, { dist: 2.1, up: 0.1, fov: 40 }, { person: a }); }
    for (const q of world.life.quads) { const d = d2(p, q.x, q.z), w = q.kind === 'weke'; if (d < (w ? 6.5 : 7)) add(w ? 'weke' : 'pudu', 'Observar', w ? 'el weke' : 'el pudú', d, { x: q.x, y: H(q.x, q.z) + (w ? 0.75 : 0.25), z: q.z }, { dist: w ? 3 : 1.9, up: w ? 0.35 : 0.25, fov: 38 }); }
    for (const b of world.life.birds) { const [id, label, r, fov] = BIRD[b.type], bp = b.g.position, d = d2(p, bp.x, bp.z); if (d < r) add(id, 'Observar', label, d / 8, { x: bp.x, y: bp.y, z: bp.z }, { fromPlayer: true, fov }); }
    let rk = null; for (const r of RUKAS) { const d = d2(p, r.x, r.z); if (d < 8 && (!rk || d < rk.d)) rk = { ...r, d }; }
    if (rk) add('ruka', 'Observar', 'la ruka', rk.d, { x: rk.x, y: H(rk.x, rk.z) + 1.7, z: rk.z }, { dist: 9.5, up: 1.2, fov: 48 });
    const fix = (id, label, x, z, r, y, shot) => { const d = d2(p, x, z); if (d < r) add(id, 'Observar', label, d, { x, y: H(x, z) + y, z }, shot); };
    fix('kutral', 'el fogón', FOGON.x, FOGON.z, 4.2, 0.5, { dist: 4.6, up: 1.3, fov: 45 });
    fix('rewe', 'el rewe', 20, 19, 4, 1.7, { dist: 5.5, up: 0.6, fov: 45 });
    fix('witral', 'el telar', -10.6, -4.2, 3.2, 1.1, { dist: 3.6, up: 0.3, fov: 42 });
    fix('chemamull', 'las figuras de madera', POI.antiguos.x, POI.antiguos.z, 8, 1.6, { dist: 8.5, up: 0.8, fov: 46 });
    if (d2(p, CERRO[0], CERRO[1]) < 11) { add('pillan', 'Mirar', 'el volcán', 1, null, { view: 'pillan' }); add('lafken', 'Mirar', 'el mar', 1.5, null, { view: 'lafken' }); }
    const rz = riverZ(p.x); if (Math.abs(p.z - rz) < 9) add('rio', 'Observar', 'el río', Math.abs(p.z - rz), { x: p.x + 4, y: -1.3, z: rz }, { dist: 11, up: 3.2, fov: 55 });
    const t = world.nearTree(p.x, p.z, 5.5); if (t) { const [id, label] = TREE[t.kind]; add(id, 'Observar', label, t.d, { x: t.x, y: t.y + t.H * 0.55, z: t.z }, { dist: t.H * 1.15 + 3, up: -t.H * 0.2, fov: 58 }); }
    for (const [kind, id, label, r, y, shot] of [['fern', 'helecho', 'el helecho', 2.4, 0.4, { dist: 1.9, up: 0.5, fov: 42 }], ['reed', 'junco', 'los juncos', 2.8, 0.8, { dist: 2.6, up: 0.4, fov: 45 }], ['flower', 'flores', 'las flores', 2.4, 0.2, { dist: 1.3, up: 0.45, fov: 40 }]]) {
      const s = world.nearPlant(kind, p.x, p.z, r); if (s) add(id, 'Observar', label, s.d, { x: s.x, y: s.y + y, z: s.z }, shot);
    }
    if (d2(p, POI.maqui.x, POI.maqui.z) < 28) { const s = world.nearBush(p.x, p.z, 3.5); if (s) add('maqui', 'Observar', 'el maqui', s.d, { x: s.x, y: s.y + 0.9, z: s.z }, { dist: 3, up: 0.3, fov: 45 }); }
    const fresh = c.filter((x) => !x.known).sort((a, b) => a.d - b.d)[0];
    return fresh || c.filter((x) => x.person).sort((a, b) => a.d - b.d)[0] || null;
  }
  return { scan };
}
