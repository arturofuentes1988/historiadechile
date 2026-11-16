// Cosas que Leftraru puede hacer en el mundo además de observar: recoger plantas, llevar encargos,
// ayudar en la aldea, sentarse al fogón, saludar al bosque, seguir huellas, jugar palin y tirar piedras al río.
import * as THREE from 'three';
import { height, POI, riverZ, WATER_Y } from './terrain.js';
import { FOGON, CORRAL } from './village.js';

const KEY = 'leftraru.tareas';
// qué se recoge, cómo se llama en la mano y de dónde sale
const ITEMS = {
  canelo: { uno: 'hojas de canelo', tree: 'canelo' }, quillay: { uno: 'corteza de quillay', tree: 'quillay' }, maqui: { uno: 'hojas de maqui', bush: true },
  murtilla: { uno: 'murtilla', plant: 'murtilla' }, michay: { uno: 'raíz de michay', plant: 'michay' }, nalca: { uno: 'tallo de nalca', plant: 'nalca' },
};
const FUEGO = [
  ['La abuela', 'El fuego no se deja solo, niño. Mientras arde, la casa está viva.'],
  ['La abuela', 'Dicen que el primer fuego lo trajo un pájaro en el pico. Por eso a los pájaros no se les tira piedras.'],
  ['La abuela', 'Mira el humo: si sube derecho, mañana no llueve. Si se acuesta, guarda la leña bajo techo.'],
  ['La abuela', 'Antes de comer, el primer bocado es para la tierra. Ella comió primero que nosotros y comerá después.'],
  ['La abuela', 'Cuando yo era chica, mi abuela me contaba estas mismas cosas en este mismo lugar. Algún día las contarás tú.'],
];
const LUGARES = { viejo: 'el bosque viejo', menoko: 'el menoko', antiguos: 'el lugar de los antiguos' };
const HUELLAS = [[-70, -70], [40, -52], [-60, 66]];

export function createActions({ world, ui, snd, scene, hint, speak, ripple, player }) {
  const S = Object.assign({ f: {}, inv: {} }, JSON.parse(localStorage.getItem(KEY) || '{}')), save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const f = S.f, inv = S.inv, have = (id) => inv[id] || 0, d2 = (p, x, z) => Math.hypot(p.x - x, p.z - z), actor = (name) => world.life.actors.find((a) => a.name === name);
  for (const id in inv) if (ITEMS[id]) for (let i = 0; i < inv[id]; i++) ui.addItem(id);
  const give = (id, n = 1) => { inv[id] = have(id) + n; if (ITEMS[id]) for (let i = 0; i < n; i++) ui.addItem(id); save(); };
  const take = (id, n) => { inv[id] = Math.max(0, have(id) - n); if (ITEMS[id]) ui.takeItem(id, n); save(); };
  const set = (k, v = 1) => { f[k] = v; save(); };

  // ---------- lo que hace falta ahora, según los encargos abiertos ----------
  function needs() {
    const n = {};
    if (f.m3 === 1) { n.canelo = 2; n.quillay = 1; n.maqui = 2; }
    if (f.ab === 1) n.murtilla = 3;
    if (f.mi === 1) n.michay = 2;
    if (f.na === 1) n.nalca = 2;
    for (const k in n) n[k] = Math.max(0, n[k] - have(k));
    return n;
  }
  const falta = () => { const n = needs(), l = Object.keys(n).filter((k) => n[k] > 0).map((k) => `${n[k]} de ${ITEMS[k].uno}`); return l.length ? l.join(', ') : ''; };
  const listo = (ids) => { const n = needs(); return ids.every((k) => !n[k]); };

  // ---------- conversaciones de los encargos ----------
  // devuelve las líneas que corresponden a esta persona ahora, o nada si no hay encargo pendiente
  function talk(id) {
    if (id === 'machi') {
      if (!f.m3) return { lines: ['Leftraru, qué bueno que viniste. El viejo Ñamku amaneció con fiebre y la tos no lo deja dormir.', 'Voy a prepararle un lawen, pero mis piernas ya no están para andar por el monte. Tú serás mis pies.', 'Tráeme hojas de canelo, de dos árboles distintos: crece cerca del agua y en el lugar de los antiguos. Un trozo de corteza de quillay, del monte donde pega el sol. Y hojas de maqui, del claro del oriente.', 'Antes de cortar, pide. Di para quién es. La planta que se saca sin permiso no sana a nadie.'], done: () => { set('m3', 1); hint('Nueva misión: Las plantas de la machi. Usa la tecla de acción junto a cada planta.', 7); } };
      if (f.m3 === 1 && !listo(['canelo', 'quillay', 'maqui'])) return { lines: [`Todavía falta: ${falta()}.`, 'No te apures. Mira bien cada planta antes de cortarla: hay que conocerla para pedirle.'] };
      if (f.m3 === 1) return { lines: ['Déjame ver… Sí. Las cortaste con cuidado, se nota.', 'El canelo abre el camino, el quillay suelta el pecho y el maqui baja la fiebre. Pero lo que sana es que alguien fue a buscarlas pensando en el enfermo.', 'Ya está. Llévaselo a Ñamku mientras está tibio. Y dile que se lo tome todo, que yo sé que es porfiado.'], done: () => { take('canelo', 2); take('quillay', 1); take('maqui', 2); inv.lawen = 1; set('m3', 2); hint('Recibiste el lawen. Llévaselo a Ñamku.', 6); } };
      if (f.m3 === 2) return { lines: ['El lawen se enfría, niño. Ñamku está en su ruka, al oriente.'] };
    }
    if (id === 'namku' && f.m3 === 2) return { lines: ['¿Eso es para mí? Huele al monte entero… La machi te mandó a ti, ¿no? Así se aprende.', 'Amargo. Bien amargo. Así tiene que ser.', 'Cuando yo tenía tu edad, mi abuelo se enfermó y fui yo a buscar las plantas. Me perdí dos días. Volví con las hojas equivocadas, y él se mejoró igual, de puro reírse.', 'Gracias, Leftraru. Uno no se sana solo: lo sana su gente.'], done: () => { inv.lawen = 0; set('m3', 3); } };
    if (id === 'abuela') {
      if (!f.ab) return { lines: ['Leftraru, ¿me harías un favor? Tengo antojo de murtilla y ya no llego hasta donde crece.', 'Es una mata bajita de frutos rojos. Se da en los claros y en las laderas con sol. Tráeme tres puñados.'], done: () => set('ab', 1) };
      if (f.ab === 1 && !listo(['murtilla'])) return { lines: [`Todavía me falta: ${falta()}. Busca donde llega el sol.`] };
      if (f.ab === 1) return { lines: ['¡Qué perfume! Así olía la ruka de mi madre al final del verano.', 'Ella las secaba al sol y las guardaba para el invierno. En las noches largas nos daba un puñado a cada uno, y había que hacerlo durar hasta que terminara el cuento.', 'Toma, come tú también. Y cuando seas viejo, acuérdate de a qué sabía.'], done: () => { take('murtilla', 3); set('ab', 2); } };
    }
    if (id === 'millaray') {
      if (!f.mi) return { lines: ['Hijo, me quedé sin amarillo para la manta. Se saca de la raíz del michay, ese arbusto de espinas y flores anaranjadas.', 'Tráeme dos raíces. Escarba con cuidado y deja la mata en pie: tiene que seguir dando.'], done: () => set('mi', 1) };
      if (f.mi === 1 && !listo(['michay'])) return { lines: [`Aún falta: ${falta()}. Crece en las laderas donde pega el sol.`] };
      if (f.mi === 1) return { lines: ['Estas sirven. Mira: se hierven con la lana y sale un amarillo como de sol de invierno.', 'Cada color viene de un lugar. Cuando te pongas esta manta vas a llevar encima el monte entero, aunque estés lejos.'], done: () => { take('michay', 2); set('mi', 2); } };
    }
    if (id === 'curinancu' && ui.has('nalca')) {
      if (!f.na) return { lines: ['Para el We Tripantu vamos a cocer la comida bajo tierra, y hay que taparla con hojas grandes.', 'Tráeme dos tallos de nalca con su hoja. Crece junto al agua, en el menoko y a la orilla del río.'], done: () => set('na', 1) };
      if (f.na === 1 && !listo(['nalca'])) return { lines: [`Falta: ${falta()}. Busca cerca del agua.`] };
      if (f.na === 1) return { lines: ['Buenas hojas. Con estas no entra ni una piedra a la comida.', 'El tallo pélalo y cómetelo: es ácido y quita la sed. Te lo ganaste.'], done: () => { take('nalca', 2); set('na', 2); } };
    }
    if (id === 'rayen') {
      if (palin) return { lines: ['¡Menos conversa y más juego!'] };
      if (f.palin === 2) return { lines: ['¿Otra vez? Cuando quieras, mirón. Usa la tecla de acción en la cancha.'] };
      return { lines: ['¿Te atreves a un palin, mirón? A dos rayas.', 'Empuja el pali corriendo contra él y llévalo más allá de mi raya, al fondo de la cancha. Yo voy a hacer lo mismo para el otro lado.'], done: () => { if (!f.palin) set('palin', 1); startPalin(); } };
    }
    return null;
  }
  const wants = (id) => !!({ machi: !f.m3 || (f.m3 === 1 && listo(['canelo', 'quillay', 'maqui'])), namku: f.m3 === 2, abuela: !f.ab || (f.ab === 1 && listo(['murtilla'])), millaray: !f.mi || (f.mi === 1 && listo(['michay'])), curinancu: ui.has('nalca') && (!f.na || (f.na === 1 && listo(['nalca']))), rayen: !f.palin }[id]);

  // ---------- recoger ----------
  function source(id, p) {
    const it = ITEMS[id]; let s = null;
    if (it.plant) s = world.nearPlant(it.plant, p.x, p.z, 1.6);
    else if (it.bush) s = d2(p, POI.maqui.x, POI.maqui.z) < 30 ? world.nearBush(p.x, p.z, 2.4) : null;
    else { const t = world.nearTree(p.x, p.z, 3.2); if (t && t.kind === it.tree) s = { d: t.d, rec: t.rec }; }
    return s && !s.rec.picked ? s : null;
  }
  function pick(id, rec) { rec.picked = true; give(id); snd.play('arbusto-1', 0.35); const n = needs()[id] || 0; hint(n ? `Recogiste ${ITEMS[id].uno}. Faltan ${n}.` : `Recogiste ${ITEMS[id].uno}. Ya tienes lo necesario.`, 4); }

  // ---------- luces que responden al saludo ----------
  const luzTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(200,240,255,0.5)'); g.addColorStop(1, 'rgba(200,240,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const luces = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: luzTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false })); s.scale.setScalar(0.22 + (i % 3) * 0.08); s.visible = false; scene.add(s); return s; });
  let luzT = 0;

  // ---------- huellas de pudú ----------
  const huellas = [];
  { const g = new THREE.CircleGeometry(0.028, 8).rotateX(-Math.PI / 2), m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x1c140e, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), HUELLAS.length * 44), M = new THREE.Matrix4(); let n = 0;
    for (const [hx, hz] of HUELLAS) { const a = Math.atan2(-hz, -hx) + 0.5; for (let i = 0; i < 22; i++) { const u = 30 - i * 1.3, wob = Math.sin(i * 0.9) * 1.6, x = hx + Math.cos(a) * u - Math.sin(a) * wob, z = hz + Math.sin(a) * u + Math.cos(a) * wob;
      for (const sd of [-1, 1]) { const px = x - Math.sin(a) * sd * 0.05, pz = z + Math.cos(a) * sd * 0.05 + sd * 0.08; M.makeTranslation(px, height(px, pz) + 0.03, pz); m.setMatrixAt(n++, M); } huellas.push({ x, z, hx, hz }); } }
    m.frustumCulled = false; scene.add(m); }

  // ---------- palin ----------
  const PC = 0.94, PS = 0.34, toUV = (x, z) => { const dx = x - POI.cancha.x, dz = z - POI.cancha.z; return [dx * PC + dz * PS, -dx * PS + dz * PC]; }, toXZ = (u, v) => [POI.cancha.x + u * PC - v * PS, POI.cancha.z + u * PS + v * PC];
  const pali = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.8 })); pali.castShadow = true; pali.visible = false; scene.add(pali);
  let palin = null;
  function startPalin() { const r = actor('Rayen'); palin = { u: 0, v: 0, vu: 0, vv: 0, yo: 0, ella: 0, cd: 0, r, pts: r.pts, pace: r.pace }; r.pts = [[POI.cancha.x, POI.cancha.z]]; r.i = 0; r.wait = 0; r.pace = 3.0; pali.visible = true; hint('Palin: lleva el pali más allá de la raya del fondo (hacia el poniente). A dos rayas.', 7); }
  function endPalin(win) { const g = palin; g.r.pts = g.pts; g.r.pace = g.pace; g.r.i = 0; palin = null; pali.visible = false; set('palin', 2); if (win) set('gano', 1); speak('Rayen', win ? ['¡Dos rayas! Está bien, mirón, hoy ganaste. No te acostumbres.', 'En el palin de verdad no gana el más rápido, sino el que ve dónde va a estar el pali. Tú ves.'] : ['¡Dos rayas para mí! No pongas esa cara.', 'Miras mucho y corres poco. Vuelve cuando quieras la revancha.']); }
  function updatePalin(dt, p) {
    const g = palin, [pu, pv] = toUV(p.x, p.z), r = g.r, [ru, rv] = toUV(r.x, r.z);
    if (Math.hypot(pu, pv) > 45) { hint('Dejaste la cancha: el juego queda para otro día.', 5); const w = g; w.r.pts = w.pts; w.r.pace = w.pace; palin = null; pali.visible = false; return; }
    if (Math.hypot(pu - g.u, pv - g.v) < 0.75 && player.speed > 0.5) { const [du, dv] = [player.dirX * PC + player.dirZ * PS, -player.dirX * PS + player.dirZ * PC], k = Math.max(4.5, player.speed * 1.7); g.vu = du * k; g.vv = dv * k; if (g.cd <= 0) snd.play('ui-clic', 0.5, 0.8); g.cd = 0.25; }
    g.cd -= dt; g.hit = (g.hit || 0) - dt;
    if (Math.hypot(ru - g.u, rv - g.v) < 0.95 && g.hit <= 0) { g.vu = 7.5; g.vv = (Math.random() - 0.5) * 4; g.hit = 1.4; snd.play('ui-clic', 0.5, 0.7); } // Rayen lo manda hacia tu lado
    g.u += g.vu * dt; g.v += g.vv * dt; const fr = Math.exp(-dt * 1.3); g.vu *= fr; g.vv *= fr; if (Math.abs(g.v) > 5.2) { g.v = Math.sign(g.v) * 5.2; g.vv *= -0.6; }
    const [bx, bz] = toXZ(g.u, g.v); pali.position.set(bx, height(bx, bz) + 0.1, bz); r.pts[0] = [bx + PC * -0.5, bz + PS * -0.5]; r.i = 0; if (r.wait > 0.3) r.wait = 0.3;
    if (Math.abs(g.u) > 15) { if (g.u < 0) g.yo++; else g.ella++; snd.play('ui-hallazgo', 0.4); if (g.yo >= 2 || g.ella >= 2) return endPalin(g.yo >= 2); hint(`Raya para ${g.u < 0 ? 'ti' : 'Rayen'}. Vas ${g.yo} a ${g.ella}.`, 4); g.u = g.v = g.vu = g.vv = 0; }
  }

  // ---------- piedras al río ----------
  const piedra = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 1 })); piedra.visible = false; scene.add(piedra); let tiro = null;

  // ---------- qué se puede hacer aquí ----------
  let sitting = false, fuegoI = 0;
  function scan(p) {
    if (sitting) return { label: 'Levantarse', run: () => { sitting = false; } };
    const out = [], add = (d, label, run) => out.push({ d, label, run }), n = needs();
    for (const id in n) if (n[id] > 0) { const s = source(id, p); if (s) add(s.d - 5, `Recoger ${ITEMS[id].uno}`, () => pick(id, s.rec)); }
    const df = d2(p, FOGON.x, FOGON.z);
    if (df > 2.2 && df < 3.8) add(df, 'Sentarse junto al fuego', () => { sitting = true; const [who, line] = FUEGO[fuegoI++ % FUEGO.length]; const ab = actor('la abuela'); if (ab && d2(ab, FOGON.x, FOGON.z) < 6) speak(who, [line]); else hint('El fuego crepita. Se está bien aquí.', 5); if (!f.fogon) set('fogon', 1); });
    // tareas de la aldea
    if (ui.has('millaray') && !f.lana && d2(p, -10.6, -4.2) < 3) add(1, 'Alcanzarle la lana a Millaray', () => { set('lana', 1); speak('Millaray', ['Gracias, hijo. La roja primero… esa. Así no tengo que soltar el hilo.']); });
    const rz = riverZ(p.x), dr = Math.abs(p.z - rz);
    if (!f.agua && !have('agua') && dr < 5 && p.y < WATER_Y + 1.6) add(2, 'Llenar la vasija con agua', () => { inv.agua = 1; save(); snd.play('paso-agua-1', 0.5); hint('Llenaste la vasija. Llévala a la olla del fogón.', 5); });
    if (!f.agua && have('agua') && df < 4.2) add(0.5, 'Echar el agua a la olla', () => { inv.agua = 0; set('agua', 1); snd.play('paso-agua-2', 0.5); speak('La abuela', ['¡Agua fresca! Con esto alcanza para el caldo. Así da gusto.']); });
    const dc = d2(p, CORRAL.x, CORRAL.z);
    if (!f.weke && !have('pasto') && dc > 9 && world.nearPlant('grass', p.x, p.z, 1.2)) add(6, 'Cortar pasto para los weke', () => { inv.pasto = 1; save(); snd.play('arbusto-2', 0.35); hint('Cortaste un atado de pasto. Llévalo al corral.', 5); });
    if (!f.weke && have('pasto') && dc < CORRAL.r + 2.5) add(1, 'Dar pasto a los weke', () => { inv.pasto = 0; set('weke', 1); for (const q of world.life.quads) if (q.kind === 'weke') { q.tx = p.x; q.tz = p.z; q.wait = 0; } hint('Los weke se acercan a comer de tu mano.', 5); });
    // saludar al entrar a los lugares con dueño
    for (const k in LUGARES) if (!f['s-' + k] && d2(p, POI[k].x, POI[k].z) < 30) add(4, `Saludar a ${LUGARES[k]}`, () => { set('s-' + k, 1); luzT = 8; snd.play('hablar', 0.4, 0.8); hint('«Mari mari. Soy Leftraru, hijo de Curiñancu. Vengo de paso y no tomaré más de lo que necesito.»', 7); });
    // huellas
    for (const h of huellas) if (d2(p, h.x, h.z) < 1.3) { add(3, 'Mirar las huellas', () => { set('huella', 1); const dx = h.hx - p.x, dz = h.hz - p.z, dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'oriente' : 'poniente') : (dz > 0 ? 'sur' : 'norte'); hint(`Huellas de pudú, chicas y frescas. Siguen hacia el ${dir}. Si caminas despacio, quizás lo veas.`, 7); }); break; }
    // palin
    if (!palin && f.palin && d2(p, POI.cancha.x, POI.cancha.z) < 14 && actor('Rayen') && d2(actor('Rayen'), POI.cancha.x, POI.cancha.z) < 30) add(5, 'Jugar palin con Rayen', startPalin);
    // el río
    if (dr < 7 && dr > 1.5 && !tiro) add(8, 'Tirar una piedra al río', () => { tiro = { t: 0, x0: p.x, y0: p.y + 0.4, z0: p.z, x1: p.x + (Math.random() - 0.5) * 3, z1: rz + (Math.random() - 0.5) * 2 }; piedra.visible = true; });
    if (d2(p, POI.poza.x, POI.poza.z) < 9 && dr < 3) add(7, 'Beber agua de la poza', () => { snd.play('paso-agua-2', 0.4); hint('El agua está helada y sabe a piedra y a lluvia.', 5); });
    return out.sort((a, b) => a.d - b.d)[0] || null;
  }

  function update(dt, t, p) {
    if (palin) updatePalin(dt, p);
    if (luzT > 0) { luzT -= dt; const k = Math.min(1, luzT, (8 - luzT) * 2); luces.forEach((s, i) => { const a = t * (0.5 + (i % 4) * 0.12) + i * 0.9, r = 1.1 + (i % 5) * 0.35; s.visible = luzT > 0; s.position.set(p.x + Math.cos(a) * r, p.y + 0.2 + Math.sin(t * 0.8 + i) * 0.5 + (i % 3) * 0.3, p.z + Math.sin(a) * r); s.material.opacity = Math.max(0, k) * 0.9; }); }
    if (tiro) { tiro.t += dt / 0.9; const u = tiro.t, x = tiro.x0 + (tiro.x1 - tiro.x0) * u, z = tiro.z0 + (tiro.z1 - tiro.z0) * u, y = tiro.y0 + (WATER_Y - tiro.y0) * u + Math.sin(Math.PI * u) * 2.2; piedra.position.set(x, y, z); if (u >= 1) { piedra.visible = false; ripple(tiro.x1, tiro.z1); snd.play('paso-agua-1', 0.6, 0.8); tiro = null; } }
  }
  // postura sentado: se dobla por la cadera y las rodillas
  function pose(boy) { if (!sitting) return; boy.g.position.y -= 0.38; boy.legL.rotation.x = boy.legR.rotation.x = -1.45; boy.shinL.rotation.x = boy.shinR.rotation.x = 1.5; boy.armL.rotation.x = boy.armR.rotation.x = -0.5; boy.foreL.rotation.x = boy.foreR.rotation.x = -0.6; }

  return { scan, talk, wants, update, pose, get sitting() { return sitting; }, stand() { sitting = false; },
    ctx: () => ({ f, hierbas: Math.min(2, have('canelo')) + Math.min(1, have('quillay')) + Math.min(2, have('maqui')) }),
    reset() { localStorage.removeItem(KEY); } };
}
