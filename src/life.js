// Lo que se mueve: gente, animales, aves y partículas (humo, fuego, hojas, neblina).
import * as THREE from 'three';
import { ParticleBatch, TEX } from './gfx.js';
import { height, POI, CERRO, riverZ, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL, FOGON } from './village.js';

const mats = new Map();
const mat = (c) => mats.get(c) || mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, side: THREE.DoubleSide })).get(c);
const weave = TEX.grainBump.clone(); weave.repeat.set(7, 7); weave.needsUpdate = true;
const vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide, bumpMap: weave, bumpScale: 1.4 }); // la ropa tiene trama de tejido
const shadows = (g) => { g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); return g; };
const mesh = (geo, c, par, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); par.add(m); return m; };
const ball = (r, c, par, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = mesh(new THREE.SphereGeometry(r, 12, 10), c, par, x, y, z); m.scale.set(sx, sy, sz); return m; };
// segmento de extremidad que cuelga de su articulación
const seg = (len, r0, r1, c, par) => mesh(new THREE.CylinderGeometry(r0, r1, len, 8), c, par, 0, -len / 2, 0);
// prenda de revolución (poncho, vestido, manto), con franjas de color según la altura
function drape(profile, zs, colorAt, par) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 16), P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const c = new THREE.Color(colorAt(P.getY(i))); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.scale(1, 1, zs); g.computeVertexNormals();
  const m = new THREE.Mesh(g, vmat); par.add(m); return m;
}

// Figura humana hecha por código, con proporciones reales y articulaciones (rodillas, codos, cuello).
// Se construye con altura 1 y luego se escala. kind: 'man' | 'woman' | 'boy' | 'girl'.
export function buildPerson({ h = 1.38, kind = 'boy', skin = 0xa9714b, cloth = 0x3a3440, trim = 0xb3262e, band = 0xb3262e, hair = 0x1b1819 } = {}) {
  const g = new THREE.Group(), woman = kind === 'woman' || kind === 'girl', child = kind === 'boy' || kind === 'girl', hs = child ? 1.16 : 1; // la cabeza de un niño es más grande
  const body = new THREE.Group(); g.add(body);
  // piernas: muslo, canilla y pie
  const leg = (sx) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.052, 0.52, 0); body.add(hip); seg(0.26, 0.047, 0.038, skin, hip);
    const knee = new THREE.Group(); knee.position.y = -0.26; hip.add(knee); seg(0.25, 0.036, 0.026, skin, knee);
    const foot = mesh(new THREE.SphereGeometry(0.034, 8, 6), skin, knee, 0, -0.245, 0.032); foot.scale.set(0.95, 0.55, 2.0);
    return [hip, knee];
  };
  const [legL, shinL] = leg(1), [legR, shinR] = leg(-1);
  // tronco y cuello
  drape([[0.07, 0.5], [0.088, 0.55], [0.08, 0.62], [0.096, 0.72], [0.112, 0.8], [0.07, 0.845], [0.032, 0.865]], 0.7, () => skin, body);
  mesh(new THREE.CylinderGeometry(0.027, 0.031, 0.05, 8), skin, body, 0, 0.885, 0);
  // brazos: brazo, antebrazo y mano
  const arm = (sx) => {
    const sho = new THREE.Group(); sho.position.set(sx * 0.122, 0.815, 0); body.add(sho); seg(0.17, 0.031, 0.026, skin, sho);
    const elb = new THREE.Group(); elb.position.y = -0.17; sho.add(elb); seg(0.16, 0.025, 0.02, skin, elb);
    const hand = mesh(new THREE.SphereGeometry(0.024, 8, 6), skin, elb, 0, -0.175, 0.004); hand.scale.set(0.8, 1.25, 1);
    sho.rotation.z = sx * 0.1; return [sho, elb];
  };
  const [armL, foreL] = arm(1), [armR, foreR] = arm(-1);
  // cabeza: cráneo, mandíbula, nariz, ojos, orejas y pelo
  const head = new THREE.Group(); head.position.y = 0.94; head.scale.setScalar(hs); body.add(head);
  ball(0.068, skin, head, 0, 0.004, 0, 0.93, 1.06, 1); ball(0.05, skin, head, 0, -0.034, 0.012, 0.95, 0.9, 1);
  ball(0.012, skin, head, 0, -0.012, 0.066, 0.9, 1.2, 1); // nariz
  for (const sx of [-1, 1]) { ball(0.0075, 0x15110f, head, sx * 0.025, 0.006, 0.058); ball(0.014, skin, head, sx * 0.064, -0.006, -0.002, 0.5, 1, 0.8); mesh(new THREE.BoxGeometry(0.022, 0.005, 0.006), hair, head, sx * 0.025, 0.021, 0.061); }
  mesh(new THREE.BoxGeometry(0.026, 0.005, 0.006), 0x6a3a2c, head, 0, -0.04, 0.056); // boca
  const cap = mesh(new THREE.SphereGeometry(0.074, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hair, head, 0, 0.008, -0.006); cap.rotation.x = -0.42;
  if (woman) { const back = ball(0.06, hair, head, 0, -0.1, -0.058, 0.85, 2.3, 0.42); back.rotation.x = 0.1; for (const sx of [-1, 1]) { const tr = mesh(new THREE.CylinderGeometry(0.014, 0.009, 0.3, 6), hair, body, sx * 0.062, 0.76, 0.05); tr.rotation.z = sx * 0.08; } } // pelo largo y trenzas
  else ball(0.062, hair, head, 0, -0.03, -0.03, 0.98, 1.0, 0.75);
  mesh(new THREE.CylinderGeometry(0.0715, 0.0715, 0.017, 16), band, head, 0, 0.03, 0); // trarilonko (cintillo)
  // ropa
  if (woman) {
    drape([[0.034, 0.868], [0.108, 0.825], [0.098, 0.72], [0.086, 0.62], [0.104, 0.5], [0.118, 0.3], [0.128, 0.075]], 0.76, (y) => (y < 0.1 ? trim : cloth), body); // küpam (vestido)
    mesh(new THREE.CylinderGeometry(0.09, 0.092, 0.03, 14), trim, body, 0, 0.615, 0).scale.z = 0.78; // trarüwe (faja)
    drape([[0.04, 0.875], [0.128, 0.835], [0.152, 0.72], [0.158, 0.62]], 0.7, (y) => (y < 0.645 ? trim : 0x17151b), body); // ikülla (manto)
  } else {
    drape([[0.074, 0.58], [0.098, 0.52], [0.1, 0.4], [0.094, 0.33]], 0.82, () => 0x7a6a56, body); // chiripa
    drape([[0.038, 0.872], [0.13, 0.838], [0.172, 0.74], [0.186, 0.6], [0.192, 0.47]], 0.6, (y) => ((y > 0.5 && y < 0.53) || (y > 0.57 && y < 0.585) ? trim : cloth), body); // makuñ (poncho) con franjas
  }
  g.scale.setScalar(h); shadows(g);
  return { g, body, head, legL, legR, shinL, shinR, armL, armR, foreL, foreR, h, woman };
}
// phase: fase del paso; amp: 0 quieto, 1 corriendo; air: en el aire
export function animatePerson(p, phase, amp, air = false) {
  if (air) { p.legL.rotation.x = -0.7; p.shinL.rotation.x = 1.0; p.legR.rotation.x = 0.35; p.shinR.rotation.x = 0.5; p.armL.rotation.x = p.armR.rotation.x = -0.5; p.armL.rotation.z = 0.8; p.armR.rotation.z = -0.8; p.foreL.rotation.x = p.foreR.rotation.x = -0.5; p.body.rotation.x = 0.1; return; }
  const s = Math.sin(phase), c = Math.cos(phase), k = p.woman ? 0.55 : 1; // el vestido acorta el paso
  p.legL.rotation.x = -s * amp * 0.75 * k; p.legR.rotation.x = s * amp * 0.75 * k;
  p.shinL.rotation.x = Math.max(0, c) * amp * 1.1 * k + amp * 0.08; p.shinR.rotation.x = Math.max(0, -c) * amp * 1.1 * k + amp * 0.08; // la rodilla se dobla al adelantar la pierna
  p.armL.rotation.x = s * amp * 0.6; p.armR.rotation.x = -s * amp * 0.6; p.armL.rotation.z = 0.1; p.armR.rotation.z = -0.1;
  p.foreL.rotation.x = -0.15 - amp * 0.35 - Math.max(0, -s) * amp * 0.4; p.foreR.rotation.x = -0.15 - amp * 0.35 - Math.max(0, s) * amp * 0.4;
  p.body.rotation.x = amp * 0.09; p.body.rotation.y = s * amp * 0.07; p.body.position.y = Math.abs(c) * amp * 0.012;
}

// Weke: pariente de la llama. Medidas reales: 1,1 m a la cruz, cuello largo y erguido, cabeza chica
// de orejas largas, cuerpo lanudo sobre patas delgadas.
// Pudú: ciervo enano de 40 cm a la cruz, cuerpo redondo con la grupa más alta que los hombros,
// patas cortas, cabeza pequeña y, el macho, dos cuernos como espinas.
function buildQuad({ s = 1, kind = 'weke', body = 0xd9d0b6, legs = 0x8a7a66 }) {
  const g = new THREE.Group(), weke = kind === 'weke', dark = 0x1a1512, hoof = 0x2a2420;
  const H = weke ? 1.02 : 0.34, L = weke ? 1.05 : 0.5, legLen = weke ? 0.72 : 0.22;
  const cap = (r, len, c, x, y, z, rx = Math.PI / 2) => { const m = mesh(new THREE.CapsuleGeometry(r, len, 5, 12), c, g, x, y, z); m.rotation.x = rx; return m; };
  if (weke) {
    cap(0.27, 0.5, body, 0, H, 0); ball(0.29, body, g, 0, H - 0.04, -0.1, 1.02, 0.95, 1.2);      // tronco lanudo
    ball(0.22, body, g, 0, H + 0.02, 0.32, 0.95, 1.05, 0.9); ball(0.25, body, g, 0, H, -0.36, 1, 1, 0.9); // pecho y grupa
    ball(0.06, body, g, 0, H + 0.1, -0.6, 1, 1.5, 0.9);                                           // cola corta
  } else {
    const b = cap(0.125, 0.22, body, 0, H, 0); b.rotation.x = Math.PI / 2 + 0.12;                 // lomo que sube hacia la grupa
    ball(0.135, body, g, 0, H + 0.025, -0.13, 1, 1.05, 1); ball(0.105, body, g, 0, H - 0.015, 0.15, 1, 1, 1);
    ball(0.028, legs, g, 0, H + 0.07, -0.27);
  }
  const neck = new THREE.Group(); neck.position.set(0, H + (weke ? 0.1 : 0.03), L * (weke ? 0.36 : 0.36)); g.add(neck);
  const nl = weke ? 0.62 : 0.12; mesh(new THREE.CylinderGeometry(weke ? 0.07 : 0.045, weke ? 0.13 : 0.07, nl, 10), body, neck, 0, nl / 2, 0);
  if (weke) ball(0.11, body, neck, 0, 0.08, -0.02, 1, 1.4, 1.05);                                  // lana en la base del cuello
  const hd = new THREE.Group(); hd.position.y = nl; neck.add(hd);
  if (weke) {
    ball(0.078, body, hd, 0, 0.04, 0.02, 0.9, 0.95, 1.15); ball(0.05, legs, hd, 0, 0.012, 0.115, 0.85, 0.8, 1.25); // cráneo y hocico largo
    ball(0.016, dark, hd, 0, 0.012, 0.178, 1.3, 0.7, 0.6); mesh(new THREE.BoxGeometry(0.035, 0.004, 0.02), dark, hd, 0, -0.012, 0.16); // nariz y boca partida
    for (const sx of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.022, 0.15, 6), legs, hd, sx * 0.045, 0.16, -0.03); e.rotation.z = -sx * 0.18; e.rotation.x = -0.15; ball(0.011, dark, hd, sx * 0.058, 0.055, 0.075); }
  } else {
    ball(0.055, body, hd, 0, 0.03, 0.03, 0.95, 0.95, 1.15); ball(0.03, legs, hd, 0, 0.012, 0.085, 0.9, 0.85, 1.2); ball(0.01, dark, hd, 0, 0.012, 0.118);
    for (const sx of [-1, 1]) { ball(0.022, legs, hd, sx * 0.045, 0.08, -0.005, 0.5, 1.1, 0.9); ball(0.007, dark, hd, sx * 0.04, 0.045, 0.055); if (legs !== body) { const a = mesh(new THREE.ConeGeometry(0.007, 0.05, 4), 0x4a3c30, hd, sx * 0.02, 0.1, 0.0); a.rotation.z = -sx * 0.15; } }
  }
  hd.rotation.x = -0.35; neck.rotation.x = 0.35;
  const Ls = [], Ks = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const hip = new THREE.Group(); hip.position.set(x * (weke ? 0.15 : 0.07), legLen + (weke ? 0.1 : 0.03), z * L * (weke ? 0.33 : 0.3)); g.add(hip);
    seg(legLen * 0.5 + (weke ? 0.1 : 0.03), weke ? 0.06 : 0.03, weke ? 0.038 : 0.019, body, hip);                      // muslo, más grueso arriba
    const knee = new THREE.Group(); knee.position.y = -legLen * 0.5 - (weke ? 0.1 : 0.03); hip.add(knee); seg(legLen * 0.5, weke ? 0.035 : 0.018, weke ? 0.028 : 0.013, legs, knee);
    ball(weke ? 0.036 : 0.016, hoof, knee, 0, -legLen * 0.5 + 0.01, weke ? 0.012 : 0.005, 1, 0.6, 1.3); // pezuña
    Ls.push(hip); Ks.push(knee);
  }
  g.scale.setScalar(s); shadows(g);
  return { g, legs: Ls, knees: Ks, neck, headPivot: hd };
}

// Aves con sus colores reales:
// traro: pardo oscuro, cuello crema, cara anaranjada, alas anchas con una mancha clara en la punta;
// choroy: verde, de cola larga y rojiza, pico largo; rayadito: pequeño, canela, con ceja clara.
const BIRDS = {
  traro: { body: 0x2c241e, head: 0xe6dcc0, cap: 0x1c1612, beak: 0xe07a2a, wing: 0x2c241e, tip: 0xb8ae96, tail: 0xd8ceb2, span: 1.25, len: 0.55, wide: 0.3, tailLen: 0.24 },
  choroy: { body: 0x4a8a3a, head: 0x4a8a3a, cap: 0x8a3428, beak: 0x2a2622, wing: 0x3d7a34, tip: 0x2a5a8a, tail: 0x7a3a2c, span: 0.55, len: 0.4, wide: 0.13, tailLen: 0.2 },
  small: { body: 0x9a6a3c, head: 0x3a2c22, cap: 0xe8d8a8, beak: 0x2a2622, wing: 0x5a4030, tip: 0xc89a5a, tail: 0x5a4030, span: 0.2, len: 0.14, wide: 0.06, tailLen: 0.07 },
};
function buildBird(type) {
  const B = BIRDS[type], g = new THREE.Group(), k = B.len;
  const part = (pts, c, par) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setIndex(pts.length === 12 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat(c)); par.add(m); return m; };
  ball(1, B.body, g, 0, 0, 0, k * 0.2, k * 0.19, k * 0.5);                                           // cuerpo
  ball(1, B.head, g, 0, k * 0.1, k * 0.46, k * 0.14, k * 0.14, k * 0.17); ball(1, B.cap, g, 0, k * 0.17, k * 0.43, k * 0.115, k * 0.07, k * 0.15); // cabeza y copete
  const bk = mesh(new THREE.ConeGeometry(k * 0.05, k * (type === 'choroy' ? 0.26 : 0.18), 5), B.beak, g, 0, k * 0.07, k * 0.66); bk.rotation.x = Math.PI / 2 + (type === 'choroy' ? 0.5 : 0.2);
  part([-k * 0.1, 0, -k * 0.4, k * 0.1, 0, -k * 0.4, k * (type === 'traro' ? 0.22 : 0.07), 0, -k * 0.4 - B.tailLen, -k * (type === 'traro' ? 0.22 : 0.07), 0, -k * 0.4 - B.tailLen], B.tail, g); // cola
  const wing = (sx) => { // ala en dos tramos: el de afuera se dobla al batir
    const inner = new THREE.Group(); inner.position.set(sx * k * 0.14, k * 0.05, k * 0.05); g.add(inner);
    part([0, 0, B.wide * 0.6, sx * B.span * 0.24, 0, B.wide * 0.55, sx * B.span * 0.24, 0, -B.wide * 0.5, 0, 0, -B.wide * 0.5], B.wing, inner);
    const outer = new THREE.Group(); outer.position.x = sx * B.span * 0.24; inner.add(outer);
    part([0, 0, B.wide * 0.55, sx * B.span * 0.26, 0, B.wide * 0.25, sx * B.span * 0.24, 0, -B.wide * 0.4, 0, 0, -B.wide * 0.5], B.tip, outer);
    return [inner, outer];
  };
  const [wl, wlo] = wing(1), [wr, wro] = wing(-1);
  shadows(g);
  return { g, wl, wr, wlo, wro };
}

export function buildLife({ scene, rng, emit, trees }) {
  const R = (a, b) => a + (b - a) * rng(), actors = [], quads = [], birds = [];

  // ---------- gente de la aldea ----------
  const person = (opts, x, z, beh) => { const p = buildPerson(opts); p.x = x; p.z = z; p.face = beh.face ?? 0; p.phase = R(0, 6); p.speed = 0; p.wait = R(0, 3); p.i = 0; Object.assign(p, beh); p.g.position.set(x, height(x, z), z); scene.add(p.g); actors.push(p); return p; };
  const man = { kind: 'man', h: 1.66, skin: 0x96603c, cloth: 0x2a2630 }, woman = { kind: 'woman', h: 1.56, skin: 0xa0683f, cloth: 0x1f1c26, trim: 0xb3262e, band: 0xc23a36 };
  person({ ...man, band: 0xe9dcb8, trim: 0xb3262e }, 2, -9, { name: 'Curiñancu', mode: 'idle', face: Math.PI });
  person(woman, -9.6, -5.4, { name: 'Millaray', mode: 'work', face: 2.2 });
  person({ ...woman, h: 1.46, hair: 0xb9b4a4, cloth: 0x2e2a36, trim: 0x8a4a2c }, 2.6, 1.6, { name: 'la abuela', mode: 'idle', face: -2.2 });
  person({ kind: 'girl', h: 1.08, cloth: 0x4a2a2c, trim: 0xd99a1c }, -6, 4, { name: 'Ayelén', mode: 'walk', pts: [[-6, 4], [-11, 8], [-4, 11], [3, 7], [-2, -5]], pace: 2.2 });
  person({ kind: 'girl', h: 1.42, cloth: 0x26323a, trim: 0xd99a1c, band: 0xd99a1c }, POI.cancha.x, POI.cancha.z, { name: 'Rayen', mode: 'walk', pts: [[-48, -24], [-58, -27], [-40, -20], [-52, -21]], pace: 2.6 });
  person({ ...woman, cloth: 0x14283a, trim: 0xe9dcb8, band: 0xe9dcb8 }, 18.4, 17.6, { name: 'la machi', mode: 'idle', face: 0.4 });
  person({ ...man, h: 1.58, hair: 0xc9c4b4, cloth: 0x4a3a2c, trim: 0xe9dcb8 }, 23.6, 1.6, { name: 'Ñamku', mode: 'idle', face: -1.9 });
  person({ ...man, cloth: 0x4a2a22, trim: 0x17151b }, 8, -8, { mode: 'walk', pts: [[8, -8], [9, -13], [-17, -1], [-6, 14], [5, 4]], pace: 1.3 });
  person({ ...woman, cloth: 0x2a3326, trim: 0xd99a1c }, -2, 14, { mode: 'walk', pts: [[-2, 14], [-3, 40], [-2, 14], [12, 10], [4, 3]], pace: 1.2 });
  person({ ...man, h: 1.7, cloth: 0x2a2630, trim: 0x8a4a2c }, -20, 6, { mode: 'work', face: -2.6 });

  // ---------- animales ----------
  const quad = (opts, x, z, beh) => { const q = buildQuad(opts); q.x = x; q.z = z; q.face = R(0, 6); q.phase = R(0, 6); q.wait = R(0, 4); q.tx = x; q.tz = z; q.speed = 0; Object.assign(q, beh); q.kind = opts.kind || 'weke'; scene.add(q.g); quads.push(q); };
  for (const [body, legs, s] of [[0xe4dcc4, 0xb9ad94, 1], [0x6a4a34, 0x3a2a20, 1.05], [0xd9d0b6, 0x6a4a34, 0.95], [0x2e2622, 0x2e2622, 1], [0xcfa878, 0x8a6a4a, 0.68]])
    quad({ body, legs, s }, CORRAL.x + R(-3, 3), CORRAL.z + R(-3, 3), { hx: CORRAL.x, hz: CORRAL.z, hr: CORRAL.r - 1.8, pace: 0.8 });
  for (const [x, z] of [[POI.viejo.x + 16, POI.viejo.z + 12], [-70, -70], [40, -52], [-60, 66], [70, 40], [-140, 20]])
    quad({ kind: 'pudu', body: 0x8a5230, legs: 0x5a3420 }, x, z, { hx: x, hz: z, hr: 16, pace: 0.6, shy: true });

  // ---------- aves ----------
  const bird = (color, span, f, type) => { const b = buildBird(type); b.f = f; b.type = type; b.o = R(0, 6.28); scene.add(b.g); birds.push(b); };
  bird(0x2e2622, 1.5, (t, b) => [CERRO[0] + Math.cos(t * 0.16) * 46, 78 + Math.sin(t * 0.23) * 6, CERRO[1] + Math.sin(t * 0.16) * 46, 0.25, 1.6], 'traro'); // el traro
  for (let i = 0; i < 9; i++) { const dx = R(-7, 7), dy = R(-2.5, 2.5), dz = R(-7, 7); bird(0x4f8a3a, 0.55, (t) => [Math.cos(t * 0.11) * 150 + dx, 38 + Math.sin(t * 0.3) * 6 + dy, Math.sin(t * 0.11) * 105 + dz, 0.7, 13], 'choroy'); } // bandada de choroyes
  for (const [cx, cz] of [[6, -30], [-34, 14], [30, 26], [-70, -40], [0, -80], [-90, 50], [60, -30]]) { const r = R(5, 11), sp = R(0.5, 0.9) * (rng() < 0.5 ? 1 : -1), hh = R(5, 11); bird(0x6a4a34, 0.3, (t, b) => [cx + Math.cos(t * sp + b.o) * r, height(cx, cz) + hh + Math.sin(t * 1.7 + b.o) * 1.5, cz + Math.sin(t * sp + b.o) * r * 0.7, 0.8, 16], 'small'); }

  // ---------- partículas ----------
  const P = (fill, opts) => { const b = new ParticleBatch(); fill(b); const m = b.build(opts); scene.add(m); return m; };
  const pick = (cols) => cols[(rng() * cols.length) | 0];
  P((b) => { for (const [x, y, z, k] of emit.smoke) for (let i = 0; i < 26 * k; i++) b.add(x + R(-0.2, 0.2), y, z + R(-0.2, 0.2), R(0.8, 1.3) * (0.6 + k * 0.4), R(0.7, 1.2), pick([0x8a8782, 0xa6a39c, 0x6c6a66])); }, { span: 14, speed: 1.0, drift: 0.8, wob: 0.6, s0: 0.5, s1: 3.4, opacity: 0.2, wind: [0.28, 0, 0.1] });
  P((b) => { for (const [x, y, z] of emit.fire) for (let i = 0; i < 26; i++) b.add(x + R(-0.3, 0.3), y, z + R(-0.3, 0.3), R(0.45, 0.8), R(0.8, 1.4), pick([0xff5a18, 0xff9a2a, 0xffd060])); }, { span: 1.3, speed: 1.9, drift: 0.12, wob: 5, s0: 1, s1: 0.25, opacity: 0.8, aspect: 1.5, glow: true, boost: 2.6 });
  P((b) => { for (const t of trees) if (t.kind === 'roble') for (let i = 0; i < 4; i++) b.add(t.x + R(-3, 3), t.y + t.H * R(0.5, 0.95), t.z + R(-3, 3), R(0.12, 0.2), R(0.6, 1.3), pick([0xc48a28, 0xdcaa3a, 0xa86a1c])); }, { dir: [0, -1, 0], span: 11, speed: 1.0, drift: 1.4, wob: 1.6, opacity: 1, wind: [0.2, 0, 0.08], aspect: 0.6, hard: true });
  P((b) => { for (const [cx, cz, r, n] of [[0, 0, 34, 200], [POI.maqui.x, POI.maqui.z, 24, 200], [POI.pewen.x, POI.pewen.z, 50, 200], [POI.antiguos.x, POI.antiguos.z, 16, 80], [POI.viejo.x, POI.viejo.z, 40, 160]]) for (let i = 0; i < n; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; b.add(x, height(x, z) + R(0.4, 5), z, R(0.04, 0.07), R(0.5, 1.5), 0xfff4c8); } }, { dir: [0, 1, 0], span: 2.5, speed: 0.25, drift: 1.3, wob: 0.7, opacity: 0.8, glow: true, boost: 2.2 });
  // luces que flotan en los lugares con dueño: el bosque viejo, el menoko y el lugar de los antiguos
  P((b) => { for (const [cx, cz, r, n] of [[POI.viejo.x, POI.viejo.z, 46, 34], [POI.menoko.x, POI.menoko.z, 40, 30], [POI.antiguos.x, POI.antiguos.z, 13, 12], [CERRO[0], CERRO[1], 9, 6]]) for (let i = 0; i < n; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; b.add(x, Math.max(WATER_Y, height(x, z)) + R(0.8, 3.2), z, R(0.22, 0.4), R(0.5, 1.2), pick([0xbfe8ff, 0xe8f6ff, 0xc8ffe6])); } }, { dir: [0, 0.4, 0], span: 3, speed: 0.12, drift: 2.2, wob: 0.5, opacity: 0.9, glow: true, boost: 3 });
  P((b) => {
    for (let i = 0; i < 70; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * 44, x = POI.menoko.x + Math.cos(a) * d, z = POI.menoko.z + Math.sin(a) * d * 0.8; b.add(x, Math.max(WATER_Y, height(x, z)) + R(0.6, 2.2), z, R(9, 15), R(0.6, 1.2), 0xe6eef0); }
    for (let i = 0; i < 60; i++) { const x = R(-190, 170); b.add(x, WATER_Y + R(0.5, 1.6), riverZ(x) + R(-7, 7), R(8, 13), R(0.6, 1.2), 0xe6eef0); }
  }, { dir: [0, 0, 0], span: 30, speed: 0.9, drift: 0.8, wob: 0.25, s0: 0.8, s1: 1.3, opacity: 0.1, wind: [1, 0, 0.1], aspect: 0.35 });

  const turn = (o, tx, tz, dt, k = 6) => { let d = Math.atan2(tx - o.x, tz - o.z) - o.face; d = Math.atan2(Math.sin(d), Math.cos(d)); o.face += d * Math.min(1, dt * k); };

  function update(dt, t, pp) {
    for (const p of actors) {
      if (p.mode === 'walk') {
        const [tx, tz] = p.pts[p.i], d = Math.hypot(tx - p.x, tz - p.z);
        if (p.wait > 0) { p.wait -= dt; p.speed += (0 - p.speed) * Math.min(1, dt * 8); }
        else if (d < 0.5) { p.i = (p.i + 1) % p.pts.length; p.wait = R(1.5, 5); }
        else { turn(p, tx, tz, dt); p.speed += (p.pace - p.speed) * Math.min(1, dt * 5); p.x += Math.sin(p.face) * p.speed * dt; p.z += Math.cos(p.face) * p.speed * dt; }
        p.phase += dt * (1.5 + p.speed * 3.4 / Math.sqrt(p.h)); animatePerson(p, p.phase, Math.min(1, p.speed / 2.4) * 0.75 + (p.speed > 0.1 ? 0.2 : 0));
      } else if (p.mode === 'work') { p.phase += dt * 2.2; animatePerson(p, 0, 0); p.armL.rotation.x = -0.9 + Math.sin(p.phase) * 0.3; p.armR.rotation.x = -0.9 + Math.sin(p.phase + 2) * 0.3; p.foreL.rotation.x = -0.7 + Math.sin(p.phase + 1) * 0.3; p.foreR.rotation.x = -0.7 + Math.sin(p.phase + 3) * 0.3; p.head.rotation.x = 0.2; }
      else { p.phase += dt; animatePerson(p, 0, 0); p.armL.rotation.x = Math.sin(p.phase * 0.6) * 0.05; p.body.rotation.z = Math.sin(p.phase * 0.35) * 0.015; p.head.rotation.y = Math.sin(p.phase * 0.23) * 0.3; if (Math.hypot(pp.x - p.x, pp.z - p.z) < 6) { turn(p, pp.x, pp.z, dt, 2.5); p.head.rotation.y *= 0.3; } }
      p.g.position.set(p.x, height(p.x, p.z) + Math.sin(p.phase * 0.8) * 0.008, p.z); p.g.rotation.y = p.face;
    }
    for (const q of quads) {
      const dp = Math.hypot(pp.x - q.x, pp.z - q.z), flee = q.shy && dp < api.shyR;
      if (flee) { q.tx = q.x + ((q.x - pp.x) / dp) * 14; q.tz = q.z + ((q.z - pp.z) / dp) * 14; q.wait = 0; }
      const d = Math.hypot(q.tx - q.x, q.tz - q.z), want = flee ? 5.2 : q.pace;
      if (q.wait > 0) { q.wait -= dt; q.speed += (0 - q.speed) * Math.min(1, dt * 6); q.neck.rotation.x += ((q.graze ? 1.75 : 0.35) - q.neck.rotation.x) * Math.min(1, dt * 3); q.headPivot.rotation.x = -q.neck.rotation.x * 0.6; }
      else if (d < 0.4) { q.wait = R(2, 8); q.graze = rng() < 0.6; const a = R(0, 6.28), r = Math.sqrt(rng()) * q.hr; q.tx = q.hx + Math.cos(a) * r; q.tz = q.hz + Math.sin(a) * r; }
      else { turn(q, q.tx, q.tz, dt, flee ? 9 : 3); q.speed += (want - q.speed) * Math.min(1, dt * 5); q.x += Math.sin(q.face) * q.speed * dt; q.z += Math.cos(q.face) * q.speed * dt; q.neck.rotation.x += (0.35 - q.neck.rotation.x) * Math.min(1, dt * 5); q.headPivot.rotation.x = -0.35; }
      q.phase += dt * (1 + q.speed * 5); const sw = Math.sin(q.phase) * Math.min(0.7, q.speed * 0.6);
      q.legs[0].rotation.x = sw; q.legs[3].rotation.x = sw; q.legs[1].rotation.x = -sw; q.legs[2].rotation.x = -sw;
      const kb = Math.max(0, Math.cos(q.phase)) * Math.min(0.9, q.speed * 0.7), kb2 = Math.max(0, -Math.cos(q.phase)) * Math.min(0.9, q.speed * 0.7); q.knees[0].rotation.x = q.knees[3].rotation.x = kb; q.knees[1].rotation.x = q.knees[2].rotation.x = kb2;
      q.g.position.set(q.x, height(q.x, q.z), q.z); q.g.rotation.y = q.face;
    }
    for (const b of birds) {
      const [x, y, z, amp, fq] = b.f(t, b), [x2, y2, z2] = b.f(t + 0.05, b);
      b.g.position.set(x, y, z); b.g.rotation.y = Math.atan2(x2 - x, z2 - z); b.g.rotation.x = -(y2 - y) * 2;
      const fl = Math.sin(t * fq + b.o) * amp; b.wl.rotation.z = fl; b.wr.rotation.z = -fl; b.wlo.rotation.z = fl * 0.7 + Math.cos(t * fq + b.o) * amp * 0.3; b.wro.rotation.z = -b.wlo.rotation.z;
    }
  }
  const api = { update, actors, quads, birds, shyR: 9 }; // shyR: a qué distancia huyen los animales tímidos
  return api;
}
