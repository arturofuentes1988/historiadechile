// Lo que se mueve: gente, animales, aves y partículas (humo, fuego, hojas, neblina).
import * as THREE from 'three';
import { PAL, ParticleBatch, paintMaterial, shade } from './strokes.js';
import { height, POI, CERRO, riverZ, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL, FOGON } from './village.js';

const mats = new Map();
const mat = (c) => mats.get(c) || mats.set(c, paintMaterial({ color: c, side: THREE.DoubleSide })).get(c);
const limb = (c, len, r) => { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 7), mat(c)); m.position.y = -len / 2; p.add(m); return p; };

// Figura humana simple (provisional). Sirve para Leftraru y para la gente de la aldea.
export function buildPerson({ scale = 1, skin = 0xa9714b, cloth = 0x3a3440, band = 0xb3262e, hair = 0x1d1a1c, long = false, woman = false } = {}) {
  const g = new THREE.Group(), add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  const legL = limb(skin, 0.5, 0.07), legR = limb(skin, 0.5, 0.07); legL.position.set(0.1, 0.5, 0); legR.position.set(-0.1, 0.5, 0);
  const armL = limb(skin, 0.42, 0.055), armR = limb(skin, 0.42, 0.055); armL.position.set(0.27, 0.98, 0); armR.position.set(-0.27, 0.98, 0);
  g.add(legL, legR, armL, armR);
  if (woman) { add(new THREE.CylinderGeometry(0.16, 0.3, 0.86, 9), cloth, 0, 0.63, 0); add(new THREE.CylinderGeometry(0.2, 0.22, 0.07, 9), band, 0, 0.78, 0); }
  else { add(new THREE.CylinderGeometry(0.17, 0.33, 0.6, 9), cloth, 0, 0.76, 0); add(new THREE.CylinderGeometry(0.3, 0.335, 0.07, 9), band, 0, 0.52, 0); add(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 8), 0x8a7a66, 0, 0.42, 0); }
  add(new THREE.SphereGeometry(0.155, 12, 10), skin, 0, 1.2, 0);
  add(new THREE.SphereGeometry(0.17, 12, 10), hair, 0, 1.23, -0.035);
  if (long) add(new THREE.CylinderGeometry(0.1, 0.06, 0.5, 7), hair, 0, 0.98, -0.14);
  add(new THREE.CylinderGeometry(0.168, 0.168, 0.045, 12), band, 0, 1.26, 0);
  g.scale.setScalar(scale);
  return { g, legL, legR, armL, armR };
}
export function animatePerson(p, phase, amp, air = false) {
  const sw = Math.sin(phase) * amp;
  if (air) { p.legL.rotation.x = 0.5; p.legR.rotation.x = -0.35; p.armL.rotation.x = p.armR.rotation.x = -0.4; p.armL.rotation.z = 0.9; p.armR.rotation.z = -0.9; return; }
  p.legL.rotation.x = sw; p.legR.rotation.x = -sw; p.armL.rotation.x = -sw * 0.8; p.armR.rotation.x = sw * 0.8; p.armL.rotation.z = 0.12; p.armR.rotation.z = -0.12;
}

// Cuadrúpedo simple: weke (llama) o pudú
function buildQuad({ len = 1.1, hgt = 0.95, neck = 0.7, body = 0xd9d0b6, legs = 0x8a7a66, wool = true }) {
  const g = new THREE.Group(), add = (geo, c, x, y, z, par = g) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); par.add(m); return m; };
  const b = add(new THREE.SphereGeometry(1, 10, 8), body, 0, hgt, 0); b.scale.set(len * 0.3, hgt * (wool ? 0.36 : 0.3), len * 0.55);
  const nk = new THREE.Group(); nk.position.set(0, hgt + 0.08, len * 0.42); g.add(nk);
  const nm = add(new THREE.CylinderGeometry(0.075 * hgt + 0.03, 0.11 * hgt + 0.04, neck, 7), body, 0, neck / 2, 0, nk);
  const hd = add(new THREE.SphereGeometry(1, 8, 7), body, 0, neck + 0.04, 0.07, nk); hd.scale.set(0.09 + hgt * 0.04, 0.09 + hgt * 0.04, 0.15 + hgt * 0.05);
  for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.03, 0.12, 5), legs, s * 0.06, neck + 0.16, 0, nk);
  nk.rotation.x = 0.35; void nm;
  const L = []; for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const l = limb(legs, hgt * 0.78, 0.035 + hgt * 0.02); l.position.set(x * len * 0.17, hgt * 0.8, z * len * 0.36); g.add(l); L.push(l); }
  return { g, legs: L, neck: nk };
}

function buildBird(color, span) {
  const g = new THREE.Group(), tri = (s) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.16 * span, 0, 0, -0.14 * span, s * span * 0.5, 0, -0.04 * span], 3)); geo.computeVertexNormals(); const p = new THREE.Group(); p.add(new THREE.Mesh(geo, mat(color))); g.add(p); return p; };
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.05 * span, 0.42 * span, 5), mat(color)); body.rotation.x = Math.PI / 2; g.add(body);
  return { g, wl: tri(1), wr: tri(-1) };
}

export function buildLife({ scene, rng, emit, trees }) {
  const R = (a, b) => a + (b - a) * rng(), actors = [], quads = [], birds = [];

  // ---------- gente de la aldea ----------
  const person = (opts, x, z, beh) => { const p = buildPerson(opts); p.x = x; p.z = z; p.face = beh.face ?? 0; p.phase = R(0, 6); p.speed = 0; p.wait = R(0, 3); p.i = 0; Object.assign(p, beh); p.g.position.set(x, height(x, z), z); scene.add(p.g); actors.push(p); return p; };
  const man = { scale: 1.28, skin: 0x96603c, cloth: 0x2a2630 }, woman = { scale: 1.2, skin: 0xa0683f, cloth: 0x1f1c26, woman: true, long: true, band: 0xc23a36 };
  person({ ...man, band: 0xe9dcb8 }, 2, -9, { name: 'Curiñancu', mode: 'idle', face: Math.PI });
  person(woman, -9.6, -5.4, { name: 'Millaray', mode: 'work', face: 2.2 });
  person({ ...woman, scale: 1.08, hair: 0xb9b4a4, cloth: 0x2e2a36 }, 2.6, 1.6, { name: 'la abuela', mode: 'idle', face: -2.2 });
  person({ scale: 0.72, cloth: 0x7a3a2c, woman: true, long: true }, -6, 4, { name: 'Ayelén', mode: 'walk', pts: [[-6, 4], [-11, 8], [-4, 11], [3, 7], [-2, -5]], pace: 2.4 });
  person({ scale: 1.02, cloth: 0x33414a, woman: true, long: true, band: 0xd99a1c }, POI.cancha.x, POI.cancha.z, { name: 'Rayen', mode: 'walk', pts: [[-48, -24], [-58, -27], [-40, -20], [-52, -21]], pace: 2.8 });
  person({ ...woman, cloth: 0x14283a, band: 0xe9dcb8 }, 18.4, 17.6, { name: 'la machi', mode: 'idle', face: 0.4 });
  person({ ...man, scale: 1.18, hair: 0xc9c4b4, cloth: 0x4a3a2c }, 23.6, 1.6, { name: 'Ñamku', mode: 'idle', face: -1.9 });
  person({ ...man, cloth: 0x4a2a22 }, 8, -8, { mode: 'walk', pts: [[8, -8], [9, -13], [-17, -1], [-6, 14], [5, 4]], pace: 1.3 });
  person({ ...woman, cloth: 0x2a3326 }, -2, 14, { mode: 'walk', pts: [[-2, 14], [-3, 40], [-2, 14], [12, 10], [4, 3]], pace: 1.2 });
  person({ ...man, scale: 1.2, cloth: 0x2a2630 }, -20, 6, { mode: 'work', face: -2.6 });

  // ---------- animales ----------
  const quad = (opts, x, z, beh) => { const q = buildQuad(opts); q.x = x; q.z = z; q.face = R(0, 6); q.phase = R(0, 6); q.wait = R(0, 4); q.tx = x; q.tz = z; q.speed = 0; Object.assign(q, beh); if (opts.s) q.g.scale.setScalar(opts.s); scene.add(q.g); quads.push(q); };
  for (const [body, legs, s] of [[0xe4dcc4, 0xb9ad94, 1], [0x6a4a34, 0x3a2a20, 1.05], [0xd9d0b6, 0x6a4a34, 0.95], [0x2e2622, 0x2e2622, 1], [0xcfa878, 0x8a6a4a, 0.72]])
    quad({ body, legs, s }, CORRAL.x + R(-3, 3), CORRAL.z + R(-3, 3), { hx: CORRAL.x, hz: CORRAL.z, hr: CORRAL.r - 1.6, pace: 0.8 });
  for (const [x, z] of [[POI.viejo.x + 16, POI.viejo.z + 12], [-70, -70], [40, -52], [-60, 66], [70, 40], [-140, 20]])
    quad({ len: 0.62, hgt: 0.36, neck: 0.2, body: 0x8a5230, legs: 0x5a3420, wool: false }, x, z, { hx: x, hz: z, hr: 16, pace: 0.6, shy: true });

  // ---------- aves ----------
  const bird = (color, span, f) => { const b = buildBird(color, span); b.f = f; b.o = R(0, 6.28); scene.add(b.g); birds.push(b); };
  bird(0x2e2622, 1.5, (t, b) => [CERRO[0] + Math.cos(t * 0.16) * 46, 78 + Math.sin(t * 0.23) * 6, CERRO[1] + Math.sin(t * 0.16) * 46, 0.25, 1.6]); // el traro
  for (let i = 0; i < 9; i++) { const dx = R(-7, 7), dy = R(-2.5, 2.5), dz = R(-7, 7); bird(0x4f8a3a, 0.55, (t) => [Math.cos(t * 0.11) * 150 + dx, 38 + Math.sin(t * 0.3) * 6 + dy, Math.sin(t * 0.11) * 105 + dz, 0.7, 13]); } // bandada de choroyes
  for (const [cx, cz] of [[6, -30], [-34, 14], [30, 26], [-70, -40], [0, -80], [-90, 50], [60, -30]]) { const r = R(5, 11), sp = R(0.5, 0.9) * (rng() < 0.5 ? 1 : -1), hh = R(5, 11); bird(0x6a4a34, 0.3, (t, b) => [cx + Math.cos(t * sp + b.o) * r, height(cx, cz) + hh + Math.sin(t * 1.7 + b.o) * 1.5, cz + Math.sin(t * sp + b.o) * r * 0.7, 0.8, 16]); }

  // ---------- partículas ----------
  const P = (fill, opts) => { const b = new ParticleBatch(); fill(b); const m = b.build(opts); scene.add(m); return m; };
  const pick = (pal) => shade(pal, 0, R(-0.6, 1), 0, rng);
  P((b) => { for (const [x, y, z, k] of emit.smoke) for (let i = 0; i < 22 * k; i++) b.add(x + R(-0.2, 0.2), y, z + R(-0.2, 0.2), R(0.7, 1.2) * (0.6 + k * 0.4), R(0.7, 1.2), pick(PAL.smoke)); }, { span: 13, speed: 1.0, drift: 0.8, wob: 0.6, s0: 0.5, s1: 2.6, opacity: 0.5, wind: [0.28, 0, 0.1], aspect: 0.85, blend: true });
  P((b) => { for (const [x, y, z] of emit.fire) for (let i = 0; i < 22; i++) b.add(x + R(-0.3, 0.3), y, z + R(-0.3, 0.3), R(0.4, 0.75), R(0.8, 1.4), pick(PAL.fire)); }, { span: 1.3, speed: 1.9, drift: 0.12, wob: 5, s0: 1, s1: 0.25, opacity: 1.3, aspect: 1.5 });
  P((b) => { for (const t of trees) if (t.kind === 'roble') for (let i = 0; i < 4; i++) b.add(t.x + R(-3, 3), t.y + t.H * R(0.5, 0.95), t.z + R(-3, 3), R(0.16, 0.26), R(0.6, 1.3), pick(PAL.leafFall)); }, { dir: [0, -1, 0], span: 11, speed: 1.0, drift: 1.4, wob: 1.6, opacity: 1.6, wind: [0.2, 0, 0.08], aspect: 0.7 });
  P((b) => { for (const [cx, cz, r, n] of [[0, 0, 34, 220], [POI.maqui.x, POI.maqui.z, 24, 200], [POI.pewen.x, POI.pewen.z, 50, 200], [POI.antiguos.x, POI.antiguos.z, 16, 80], [POI.viejo.x, POI.viejo.z, 40, 160]]) for (let i = 0; i < n; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; b.add(x, height(x, z) + R(0.4, 5), z, R(0.05, 0.09), R(0.5, 1.5), pick(PAL.mote)); } }, { dir: [0, 1, 0], span: 2.5, speed: 0.25, drift: 1.3, wob: 0.7, opacity: 1.5, aspect: 1 });
  P((b) => { for (let i = 0; i < 46; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * 20, x = POI.maqui.x + Math.cos(a) * d, z = POI.maqui.z + Math.sin(a) * d; b.add(x, height(x, z) + R(0.5, 1.6), z, R(0.13, 0.19), R(0.6, 1.2), pick(PAL.fly)); } }, { dir: [0, 0, 0], span: 1, speed: 0.07, drift: 2.4, wob: 1.4, opacity: 2.5, aspect: 0.8 });
  P((b) => {
    for (let i = 0; i < 80; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * 44, x = POI.menoko.x + Math.cos(a) * d, z = POI.menoko.z + Math.sin(a) * d * 0.8; b.add(x, Math.max(WATER_Y, height(x, z)) + R(0.6, 2.4), z, R(7, 12), R(0.6, 1.2), pick(PAL.mist)); }
    for (let i = 0; i < 70; i++) { const x = R(-190, 170); b.add(x, WATER_Y + R(0.5, 1.8), riverZ(x) + R(-7, 7), R(6, 10), R(0.6, 1.2), pick(PAL.mist)); }
  }, { dir: [0, 0, 0], span: 30, speed: 0.9, drift: 0.8, wob: 0.25, s0: 0.8, s1: 1.3, opacity: 0.2, wind: [1, 0, 0.1], aspect: 0.4, blend: true });

  const turn = (o, tx, tz, dt, k = 6) => { let d = Math.atan2(tx - o.x, tz - o.z) - o.face; d = Math.atan2(Math.sin(d), Math.cos(d)); o.face += d * Math.min(1, dt * k); };

  function update(dt, t, pp) {
    for (const p of actors) {
      if (p.mode === 'walk') {
        const [tx, tz] = p.pts[p.i], d = Math.hypot(tx - p.x, tz - p.z);
        if (p.wait > 0) { p.wait -= dt; p.speed += (0 - p.speed) * Math.min(1, dt * 8); }
        else if (d < 0.5) { p.i = (p.i + 1) % p.pts.length; p.wait = R(1.5, 5); }
        else { turn(p, tx, tz, dt); p.speed += (p.pace - p.speed) * Math.min(1, dt * 5); p.x += Math.sin(p.face) * p.speed * dt; p.z += Math.cos(p.face) * p.speed * dt; }
        p.phase += dt * (2.5 + p.speed * 2.6); animatePerson(p, p.phase, Math.min(1, p.speed / 1.6) * 0.6);
      } else if (p.mode === 'work') { p.phase += dt * 2.2; animatePerson(p, 0, 0); p.armL.rotation.x = -1.1 + Math.sin(p.phase) * 0.35; p.armR.rotation.x = -1.1 + Math.sin(p.phase + 2) * 0.35; }
      else { p.phase += dt; animatePerson(p, 0, 0); p.armL.rotation.x = Math.sin(p.phase * 0.6) * 0.06; if (Math.hypot(pp.x - p.x, pp.z - p.z) < 6) turn(p, pp.x, pp.z, dt, 2.5); }
      p.g.position.set(p.x, height(p.x, p.z) + Math.sin(p.phase * 0.8) * 0.008, p.z); p.g.rotation.y = p.face;
    }
    for (const q of quads) {
      const dp = Math.hypot(pp.x - q.x, pp.z - q.z), flee = q.shy && dp < 9;
      if (flee) { q.tx = q.x + ((q.x - pp.x) / dp) * 14; q.tz = q.z + ((q.z - pp.z) / dp) * 14; q.wait = 0; }
      const d = Math.hypot(q.tx - q.x, q.tz - q.z), want = flee ? 5.2 : q.pace;
      if (q.wait > 0) { q.wait -= dt; q.speed += (0 - q.speed) * Math.min(1, dt * 6); q.neck.rotation.x += ((q.graze ? 1.9 : 0.35) - q.neck.rotation.x) * Math.min(1, dt * 3); }
      else if (d < 0.4) { q.wait = R(2, 8); q.graze = rng() < 0.6; const a = R(0, 6.28), r = Math.sqrt(rng()) * q.hr; q.tx = q.hx + Math.cos(a) * r; q.tz = q.hz + Math.sin(a) * r; }
      else { turn(q, q.tx, q.tz, dt, flee ? 9 : 3); q.speed += (want - q.speed) * Math.min(1, dt * 5); q.x += Math.sin(q.face) * q.speed * dt; q.z += Math.cos(q.face) * q.speed * dt; q.neck.rotation.x += (0.35 - q.neck.rotation.x) * Math.min(1, dt * 5); }
      q.phase += dt * (1 + q.speed * 5); const sw = Math.sin(q.phase) * Math.min(0.7, q.speed * 0.6);
      q.legs[0].rotation.x = sw; q.legs[3].rotation.x = sw; q.legs[1].rotation.x = -sw; q.legs[2].rotation.x = -sw;
      q.g.position.set(q.x, height(q.x, q.z), q.z); q.g.rotation.y = q.face;
    }
    for (const b of birds) {
      const [x, y, z, amp, fq] = b.f(t, b), [x2, y2, z2] = b.f(t + 0.05, b);
      b.g.position.set(x, y, z); b.g.rotation.y = Math.atan2(x2 - x, z2 - z); b.g.rotation.x = -(y2 - y) * 2;
      const fl = Math.sin(t * fq + b.o) * amp; b.wl.rotation.z = fl; b.wr.rotation.z = -fl;
    }
  }
  return { update, actors, quads, birds };
}
