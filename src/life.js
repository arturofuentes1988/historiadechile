// Lo que se mueve: gente, animales, aves y partículas (humo, fuego, hojas, neblina).
import * as THREE from 'three';
import { ParticleBatch, photo, TEX } from './gfx.js';
import { height, POI, CERRO, riverZ, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL, FOGON } from './village.js';

const mats = new Map();
const mat = (c) => mats.get(c) || mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, side: THREE.DoubleSide })).get(c);
const weave = photo('tejido', { repeat: [5, 5] });
const vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide, map: weave, bumpMap: weave, bumpScale: 2 }); // la ropa tiene trama de tejido
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

// ---------- animales con piel continua ----------
// Cada parte (tronco, cuello, cabeza, patas) es un tubo de sección ovalada que sigue una línea
// de puntos [alto, largo, radio horizontal, radio vertical], como el contorno real del animal.
const furTex = TEX.fur.clone(); furTex.repeat.set(3, 3); furTex.needsUpdate = true; // pelos cortos dibujados: la foto de pelaje no calza con la forma del cuerpo y se veía a franjas
const furMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: furTex, bumpMap: furTex, bumpScale: 1.6, roughness: 1 });
// Pelaje de verdad: sobre la piel van varias capas apenas separadas, y en cada una solo se dibujan las hebras
// que llegan hasta esa altura. De cerca se ven los pelos sueltos y el contorno deja de ser liso.
const SHELLS = 5, strandTex = TEX.strand.clone(); strandTex.repeat.set(5, 4); strandTex.needsUpdate = true;
const shellMat = Array.from({ length: SHELLS }, (_, k) => { const f = (k + 1) / SHELLS; return new THREE.MeshStandardMaterial({ vertexColors: true, alphaMap: strandTex, alphaTest: 0.12 + f * 0.7, roughness: 1, color: new THREE.Color().setScalar(0.74 + f * 0.36) }); });
function skin(spine, colorAt, { rings = 18, radial = 14, rough = 0, fur = 0 } = {}) {
  const curve = new THREE.CatmullRomCurve3(spine.map(([y, z]) => new THREE.Vector3(0, y, z))), pos = [], col = [], uv = [], idx = [], c = new THREE.Color(), n = spine.length - 1;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, p = curve.getPoint(t), T = curve.getTangent(t), f = t * n, k = Math.min(n - 1, Math.floor(f)), u = f - k;
    const rx = spine[k][2] + (spine[k + 1][2] - spine[k][2]) * u, ry = spine[k][3] + (spine[k + 1][3] - spine[k][3]) * u, ny = T.z, nz = -T.y; // la normal del anillo, perpendicular a la línea
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), w = 1 + rough * Math.sin(a * 5 + t * 23) * Math.sin(t * 31 + a * 3); // mechones
      pos.push(ca * rx * w, p.y + ny * sa * ry * w, p.z + nz * sa * ry * w); uv.push(j / radial, t * 2);
      c.set(colorAt(t, sa, ca)); col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, furMat);
  if (fur) for (let k = 0; k < SHELLS; k++) {
    const f = (k + 1) / SHELLS, gg = g.clone(), P = gg.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) + N.getX(i) * fur * f, P.getY(i) + N.getY(i) * fur * f - fur * f * f * 0.45, P.getZ(i) + N.getZ(i) * fur * f - fur * f * f * 0.3); // el pelo cae y se peina hacia atrás
    const sh = new THREE.Mesh(gg, shellMat[k]); sh.userData.shell = true; m.add(sh);
  }
  return m;
}
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.12, metalness: 0.3 }); // ojo húmedo, con brillo
const mixHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t))).getHex();

// Weke (chilihueque): por los restos estudiados, lo más probable es que fuera un guanaco domesticado.
// Porte de guanaco: 1,1 m a la cruz, esbelto, cuello largo, lomo canela y vientre blanco, cara gris.
// Pudú: ciervo enano de 40 cm, cuerpo redondo con la grupa más alta que los hombros, patas cortas.
const ANIMAL = {
  weke: {
    torso: [[1.04, -0.6, 0.02, 0.02], [1.07, -0.52, 0.14, 0.16], [1.05, -0.32, 0.19, 0.22], [1.0, -0.05, 0.2, 0.25], [0.98, 0.2, 0.19, 0.26], [1.0, 0.38, 0.15, 0.21], [1.02, 0.5, 0.08, 0.1], [1.02, 0.54, 0.02, 0.02]],
    neckAt: [1.12, 0.36], neck: [[-0.14, -0.06, 0.13, 0.17], [0.02, 0.02, 0.1, 0.12], [0.25, 0.07, 0.07, 0.08], [0.48, 0.09, 0.058, 0.065], [0.6, 0.1, 0.055, 0.06], [0.66, 0.1, 0.03, 0.03]],
    headAt: [0.63, 0.1], head: [[0, -0.08, 0.02, 0.02], [0.03, -0.03, 0.062, 0.07], [0.035, 0.04, 0.066, 0.072], [0.02, 0.11, 0.05, 0.05], [0.005, 0.18, 0.036, 0.034], [0, 0.215, 0.03, 0.026], [0, 0.232, 0.012, 0.012]],
    hipY: 0.86, hipX: 0.11, hipZ: [0.34, -0.4], thigh: [[0, 0, 0.07, 0.1], [-0.18, 0, 0.05, 0.065], [-0.4, 0, 0.032, 0.036]], shin: [[0, 0, 0.032, 0.036], [-0.2, 0, 0.024, 0.026], [-0.4, 0, 0.022, 0.024], [-0.44, 0.01, 0.03, 0.034], [-0.46, 0.01, 0.01, 0.01]],
    tailAt: [1.1, -0.56], tail: [[0, 0, 0.03, 0.03], [0.04, -0.07, 0.045, 0.05], [0.0, -0.15, 0.02, 0.02]], ear: 0.14, earAt: [0.04, 0.1, -0.005], eyeAt: [0.058, 0.05, 0.07, 0.011], rough: 0.035, fur: 0.034,
  },
  pudu: {
    torso: [[0.4, -0.3, 0.01, 0.01], [0.42, -0.24, 0.09, 0.1], [0.41, -0.1, 0.115, 0.125], [0.38, 0.05, 0.11, 0.125], [0.36, 0.16, 0.085, 0.105], [0.36, 0.23, 0.04, 0.05], [0.36, 0.25, 0.01, 0.01]],
    neckAt: [0.4, 0.17], neck: [[-0.06, -0.04, 0.07, 0.085], [0.02, 0.02, 0.05, 0.055], [0.09, 0.05, 0.042, 0.046], [0.12, 0.06, 0.02, 0.02]],
    headAt: [0.1, 0.055], head: [[0, -0.045, 0.012, 0.012], [0.012, -0.015, 0.042, 0.046], [0.014, 0.03, 0.042, 0.044], [0.006, 0.075, 0.028, 0.027], [0, 0.1, 0.02, 0.018], [0, 0.11, 0.006, 0.006]],
    hipY: 0.265, hipX: 0.055, hipZ: [0.15, -0.2], thigh: [[0, 0, 0.035, 0.05], [-0.07, 0, 0.024, 0.03], [-0.13, 0, 0.014, 0.016]], shin: [[0, 0, 0.014, 0.016], [-0.07, 0, 0.011, 0.012], [-0.12, 0, 0.01, 0.011], [-0.13, 0.004, 0.014, 0.016], [-0.135, 0.004, 0.004, 0.004]],
    tailAt: [0.42, -0.28], tail: [[0, 0, 0.012, 0.012], [0.005, -0.03, 0.018, 0.018], [0, -0.05, 0.006, 0.006]], ear: 0.05, earAt: [0.03, 0.055, -0.005], eyeAt: [0.036, 0.03, 0.04, 0.007], rough: 0.02, fur: 0.013,
  },
};
function buildQuad({ s = 1, kind = 'weke', body = 0xb07a4a, belly = 0xf0e8d8, legs = 0x7a6a5e, horns = false }) {
  const A = ANIMAL[kind], g = new THREE.Group(), dark = 0x18130f, weke = kind === 'weke';
  const coat = (t, sa) => mixHex(body, belly, (-sa - 0.25) * 2.2);                          // lomo de un color, vientre más claro
  const F = A.fur; g.add(skin(A.torso, coat, { rings: 22, rough: A.rough, fur: F }));
  const tail = new THREE.Group(); tail.position.set(0, A.tailAt[0], A.tailAt[1]); tail.add(skin(A.tail, () => body, { rings: 6, radial: 8, fur: F * 0.8 })); g.add(tail);
  const neck = new THREE.Group(); neck.position.set(0, A.neckAt[0], A.neckAt[1]); g.add(neck);
  neck.add(skin(A.neck, (t, sa) => mixHex(body, belly, (-sa - 0.1) * 2.5 * (weke ? 1 : 0.5)), { rings: 12, rough: A.rough * 0.6, fur: F * 0.75 })); // garganta clara
  const hd = new THREE.Group(); hd.position.set(0, A.headAt[0], A.headAt[1]); neck.add(hd);
  hd.add(skin(A.head, (t, sa) => (t > 0.86 ? dark : mixHex(weke ? legs : body, belly, (t - 0.55) * (weke ? 0.6 : 0.3) + (-sa - 0.5))), { rings: 12, radial: 12, fur: F * 0.22 })); // cara y hocico oscuro
  for (const sx of [-1, 1]) {
    const e = mesh(new THREE.ConeGeometry(A.ear * 0.2, A.ear, 6), weke ? legs : body, hd, sx * A.earAt[0], A.earAt[1] + A.ear * 0.4, A.earAt[2]); e.scale.z = 0.45; e.rotation.z = -sx * 0.22; e.rotation.x = -0.12;
    ball(A.eyeAt[3], dark, hd, sx * A.eyeAt[0], A.eyeAt[1], A.eyeAt[2]).material = eyeMat;
    ball(A.eyeAt[3] * 0.45, dark, hd, sx * A.eyeAt[0] * 0.35, A.eyeAt[1] * 0.25, A.head[A.head.length - 2][1] + 0.004); // orificio de la nariz
    if (horns) { const a = mesh(new THREE.ConeGeometry(0.006, 0.05, 4), 0x4a3c30, hd, sx * 0.018, 0.075, -0.005); a.rotation.z = -sx * 0.18; }
  }
  const Ls = [], Ks = [];
  for (const z of A.hipZ) for (const x of [1, -1]) {
    const hip = new THREE.Group(); hip.position.set(x * A.hipX, A.hipY, z); g.add(hip); hip.add(skin(A.thigh, (t) => mixHex(body, legs, t * 1.1 - 0.3), { rings: 8, radial: 10, fur: F * 0.45 }));
    const knee = new THREE.Group(); knee.position.y = A.thigh[A.thigh.length - 1][0]; hip.add(knee); knee.add(skin(A.shin, (t) => (t > 0.86 ? dark : legs), { rings: 9, radial: 8 })); // la pezuña es oscura
    Ls.push(hip); Ks.push(knee);
  }
  hd.rotation.x = -0.3; neck.rotation.x = 0.3;
  g.scale.setScalar(s); shadows(g);
  const shells = []; g.traverse((o) => { if (o.userData.shell) { o.castShadow = false; shells.push(o); } });
  return { g, shells, legs: [Ls[0], Ls[1], Ls[2], Ls[3]], knees: Ks, neck, headPivot: hd, tail };
}

// ---------- aves ----------
// Cuerpo continuo con plumaje, alas hechas de plumas separadas (cobertoras y remeras) y cola en abanico.
// Colores de cada especie:
// traro: pardo oscuro con casquete negro, cuello y pecho crema barrado, cara anaranjada,
//        mancha blanca en la punta del ala y cola clara con banda oscura al final;
// choroy: verde, frente y vientre con rojo oscuro, cola larga rojiza, pico largo y ganchudo;
// rayadito: canela, cabeza negra con ceja color ante, cola terminada en puntas.
const BIRDS = {
  traro: { k: 0.56, span: 1.25, chord: 0.3, tailLen: 0.26, tailFan: 0.5, beak: 0xd8d2c0, cere: 0xe8802a, hook: true,
    coat: (t, sa) => (t > 0.86 ? (sa > 0.15 ? 0x16110e : 0xe8802a) : t > 0.62 ? (sa > 0.55 ? 0x241c16 : 0xe6dcc0) : sa < -0.2 && t > 0.3 ? (Math.sin(t * 60) > 0 ? 0xd8ccac : 0x4a3c30) : 0x2c241e),
    wing: (f, u) => (f > 0.62 && u > 0.35 && u < 0.8 ? 0xe4dcc8 : f > 0.62 && u >= 0.8 ? 0x1c1612 : 0x2c241e), tail: (u) => (u > 0.78 ? 0x1c1612 : 0xe0d8c2) },
  choroy: { k: 0.4, span: 0.56, chord: 0.13, tailLen: 0.22, tailFan: 0.16, beak: 0x2a2622, cere: 0x4a4038, hook: true, long: true,
    coat: (t, sa) => (t > 0.9 && sa > 0 ? 0x8a2e26 : sa < -0.5 && t > 0.2 && t < 0.5 ? 0x8a3a2c : sa > 0.3 ? 0x3d7a34 : 0x58983e),
    wing: (f, u) => (u > 0.6 && f > 0.5 ? 0x2a5a7a : 0x3d7a34), tail: () => 0x8a3e2c },
  small: { k: 0.15, span: 0.2, chord: 0.06, tailLen: 0.075, tailFan: 0.25, beak: 0x2a2622, cere: 0x2a2622,
    coat: (t, sa) => (t > 0.72 ? (sa > 0.65 ? 0x1c1612 : sa > 0.25 ? 0xe2c890 : 0x1c1612) : sa < -0.2 ? 0xe8dcc0 : 0xa86a38),
    wing: (f, u) => (u > 0.5 && f > 0.4 ? 0x2a2018 : (u > 0.3 && u < 0.5 ? 0xd8a860 : 0x6a4428)), tail: (u) => (u > 0.6 ? 0x2a2018 : 0xa86a38) },
};
const featherMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: furTex, roughness: 0.9, side: THREE.DoubleSide });
// Pluma: una lámina angosta de punta redondeada, con su color a lo largo (u de 0 en la base a 1 en la punta)
function feathers(list) {
  const pos = [], col = [], uv = [], idx = [], c = new THREE.Color(); let n = 0;
  for (const { base, dir, len, wid, colorAt } of list) {
    const side = new THREE.Vector3(dir.z, 0, -dir.x).normalize(), N = 4;
    for (let i = 0; i <= N; i++) { const u = i / N, w = wid * (i === N ? 0.25 : 1 - u * 0.25) * 0.5; c.set(colorAt(u)); for (const s of [-1, 1]) { pos.push(base.x + dir.x * len * u + side.x * w * s, base.y + dir.y * len * u - u * u * len * 0.06, base.z + dir.z * len * u + side.z * w * s); col.push(c.r, c.g, c.b); uv.push(s * 0.5 + 0.5, u); } }
    for (let i = 0; i < N; i++) { const a = n + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } n += (N + 1) * 2;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, featherMat);
}
function buildBird(type) {
  const B = BIRDS[type], g = new THREE.Group(), k = B.k, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // cuerpo, cuello y cabeza en una sola piel: cola → vientre → pecho → cuello → cabeza
  g.add(skin([[0, -0.5 * k, 0.01, 0.01], [0.01 * k, -0.34 * k, 0.09 * k, 0.08 * k], [0.02 * k, -0.05 * k, 0.17 * k, 0.16 * k], [0.04 * k, 0.2 * k, 0.15 * k, 0.15 * k], [0.08 * k, 0.36 * k, 0.085 * k, 0.09 * k], [0.11 * k, 0.47 * k, 0.095 * k, 0.1 * k], [0.1 * k, 0.56 * k, 0.06 * k, 0.065 * k], [0.095 * k, 0.6 * k, 0.012, 0.012]], B.coat, { rings: 18, radial: 12, rough: 0.03 }));
  // pico: ganchudo en las rapaces y los loros
  const bk = mesh(new THREE.ConeGeometry(0.045 * k, (B.long ? 0.2 : 0.15) * k, 6), B.beak, g, 0, 0.09 * k, (B.long ? 0.67 : 0.65) * k); bk.rotation.x = Math.PI / 2 + (B.hook ? 0.35 : 0.1);
  if (B.hook) { const tip = mesh(new THREE.ConeGeometry(0.022 * k, 0.07 * k, 5), B.beak, g, 0, 0.045 * k, (B.long ? 0.75 : 0.71) * k); tip.rotation.x = Math.PI * 0.95; }
  ball(0.05 * k, B.cere, g, 0, 0.1 * k, 0.585 * k, 1, 0.8, 0.9);
  for (const sx of [-1, 1]) { const e = ball(0.02 * k, 0x0c0a08, g, sx * 0.075 * k, 0.135 * k, 0.5 * k); e.material = eyeMat; }
  // cola en abanico
  const T = 7; g.add(feathers(Array.from({ length: T }, (_, i) => { const a = (i / (T - 1) - 0.5) * B.tailFan * 2; return { base: V(0, 0.01 * k, -0.4 * k), dir: V(Math.sin(a), 0, -Math.cos(a)), len: B.tailLen, wid: B.tailLen * 0.3, colorAt: B.tail }; })));
  // ala: brazo con cobertoras y secundarias, y mano con las remeras largas abiertas en dedos
  const wing = (sx) => {
    const inner = new THREE.Group(); inner.position.set(sx * 0.12 * k, 0.06 * k, 0.1 * k); g.add(inner);
    const L1 = B.span * 0.22, L2 = B.span * 0.28, sec = [], pri = [];
    for (let i = 0; i < 7; i++) { const f = i / 6; sec.push({ base: V(sx * L1 * f, 0, B.chord * 0.25), dir: V(sx * 0.12, 0, -1).normalize(), len: B.chord * (0.95 - f * 0.1), wid: L1 / 5.2, colorAt: (u) => B.wing(f * 0.5, u) }); }
    for (let i = 0; i < 5; i++) { const f = i / 4; sec.push({ base: V(sx * L1 * f, 0.004, B.chord * 0.3), dir: V(sx * 0.1, 0, -1).normalize(), len: B.chord * 0.5, wid: L1 / 3.6, colorAt: () => B.wing(0, 0) }); } // cobertoras
    inner.add(feathers(sec));
    const outer = new THREE.Group(); outer.position.x = sx * L1; inner.add(outer);
    for (let i = 0; i < 8; i++) { const f = i / 7, a = f * 1.25; pri.push({ base: V(sx * L2 * 0.25 * f, 0, B.chord * 0.22), dir: V(sx * Math.sin(a), 0, -Math.cos(a)).normalize(), len: B.chord * 0.9 + L2 * 0.75 * Math.sin(a), wid: B.chord * 0.2, colorAt: (u) => B.wing(0.5 + f * 0.5, u) }); }
    outer.add(feathers(pri));
    return [inner, outer];
  };
  const [wl, wlo] = wing(1), [wr, wro] = wing(-1);
  shadows(g);
  return { g, wl, wr, wlo, wro };
}

// Símbolos que flotan sobre la gente: estrella dorada de ocho puntas = misión principal,
// rombo escalonado celeste = encargo secundario, círculo claro = alguien que aún no conoces.
function markTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.translate(64, 64);
  const star = (r0, r1, col, n = 16) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, r = i % 2 ? r1 : r0; x.lineTo(Math.sin(a) * r, -Math.cos(a) * r); } x.closePath(); x.fill(); };
  if (kind === 'main') { star(60, 30, '#1c1410'); star(52, 25, '#f2b441'); star(34, 17, '#b3262e'); star(15, 8, '#f8e6b0'); }
  else if (kind === 'sec') { star(56, 56, '#1c1410', 4); star(47, 47, '#8fd0e0', 4); star(30, 30, '#1f5a70', 4); star(13, 13, '#e8f6fa', 4); }
  else { x.fillStyle = '#1c1410'; x.beginPath(); x.arc(0, 0, 34, 0, 7); x.fill(); x.fillStyle = '#f1e4c4'; x.beginPath(); x.arc(0, 0, 26, 0, 7); x.fill(); x.fillStyle = '#1c1410'; for (const dx of [-11, 0, 11]) { x.beginPath(); x.arc(dx, 0, 4, 0, 7); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildLife({ scene, rng, emit, trees, physics, RAPIER }) {
  const R = (a, b) => a + (b - a) * rng(), actors = [], quads = [], birds = [];
  // personas y animales tienen cuerpo: ya no se los atraviesa
  const solid = (o, r, hh, cy) => { o.rb = physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(o.x, height(o.x, o.z) + cy, o.z)); physics.createCollider(RAPIER.ColliderDesc.capsule(hh, r), o.rb); o.cy = cy; };
  const markMats = Object.fromEntries(['main', 'sec', 'nuevo'].map((k) => [k, new THREE.SpriteMaterial({ map: markTexture(k), fog: false, toneMapped: false, depthWrite: false })]));

  // ---------- gente de la aldea ----------
  const person = (opts, x, z, beh) => { const p = buildPerson(opts); p.x = x; p.z = z; p.face = beh.face ?? 0; p.phase = R(0, 6); p.speed = 0; p.wait = R(0, 3); p.i = 0; Object.assign(p, beh); p.g.position.set(x, height(x, z), z); scene.add(p.g); actors.push(p); solid(p, 0.26, p.h * 0.5 - 0.26, p.h * 0.5);
    if (p.name) { p.mark = new THREE.Sprite(markMats.nuevo); p.mark.scale.setScalar(0.3); p.mark.visible = false; p.mark.renderOrder = 5; scene.add(p.mark); }
    return p; };
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
  const quad = (opts, x, z, beh) => { const q = buildQuad(opts); q.x = x; q.z = z; q.face = R(0, 6); q.phase = R(0, 6); q.wait = R(0, 4); q.tx = x; q.tz = z; q.speed = 0; Object.assign(q, beh); q.kind = opts.kind || 'weke'; scene.add(q.g); quads.push(q); const k = opts.s || 1; if (q.kind === 'weke') solid(q, 0.4 * k, 0.25 * k, 0.75 * k); else solid(q, 0.17, 0.03, 0.22); };
  // weke: la mayoría con el pelaje del guanaco; el blanco era el más apreciado
  for (const [body, belly, legs, s] of [[0xb07a4a, 0xf0e8d8, 0x7a6a5e, 1], [0xa87044, 0xece2d0, 0x74645a, 1.04], [0xeee6d8, 0xf8f2e6, 0x9a9088, 0.98], [0x6e4c36, 0xbfa88c, 0x3e322c, 1], [0xb8824e, 0xf0e8d8, 0x7a6a5e, 0.66]])
    quad({ body, belly, legs, s }, CORRAL.x + R(-3, 3), CORRAL.z + R(-3, 3), { hx: CORRAL.x, hz: CORRAL.z, hr: CORRAL.r - 1.9, pace: 0.8 });
  for (const [x, z] of [[POI.viejo.x + 16, POI.viejo.z + 12], [-70, -70], [40, -52], [-60, 66], [70, 40], [-140, 20]])
    quad({ kind: 'pudu', body: 0x8a5230, belly: 0xa9764c, legs: 0x5a3420, horns: rng() < 0.5 }, x, z, { hx: x, hz: z, hr: 16, pace: 0.6, shy: true });

  // ---------- aves ----------
  const bird = (color, span, f, type) => { const b = buildBird(type); b.f = f; b.type = type; b.o = R(0, 6.28); scene.add(b.g); birds.push(b); };
  bird(0x2e2622, 1.5, (t, b) => [CERRO[0] + Math.cos(t * 0.16) * 46, 78 + Math.sin(t * 0.23) * 6, CERRO[1] + Math.sin(t * 0.16) * 46, 0.25, 1.6], 'traro'); // el traro
  for (let i = 0; i < 9; i++) { const dx = R(-7, 7), dy = R(-2.5, 2.5), dz = R(-7, 7); bird(0x4f8a3a, 0.55, (t) => [Math.cos(t * 0.11) * 150 + dx, 38 + Math.sin(t * 0.3) * 6 + dy, Math.sin(t * 0.11) * 105 + dz, 0.7, 13], 'choroy'); } // bandada de choroyes
  for (const [cx, cz] of [[6, -30], [-34, 14], [30, 26], [-70, -40], [0, -80], [-90, 50], [60, -30]]) { const r = R(5, 11), sp = R(0.5, 0.9) * (rng() < 0.5 ? 1 : -1), hh = R(5, 11); bird(0x6a4a34, 0.3, (t, b) => [cx + Math.cos(t * sp + b.o) * r, height(cx, cz) + hh + Math.sin(t * 1.7 + b.o) * 1.5, cz + Math.sin(t * sp + b.o) * r * 0.7, 0.8, 16], 'small'); }

  // ---------- partículas ----------
  const P = (fill, opts) => { const b = new ParticleBatch(); fill(b); const m = b.build(opts); scene.add(m); return m; };
  const pick = (cols) => cols[(rng() * cols.length) | 0];
  P((b) => { for (const [x, y, z, k] of emit.smoke) for (let i = 0; i < 26 * k; i++) b.add(x + R(-0.2, 0.2), y, z + R(-0.2, 0.2), R(0.8, 1.3) * (0.6 + k * 0.4), R(0.7, 1.2), pick([0x8a8782, 0xa6a39c, 0x6c6a66])); }, { span: 14, speed: 1.0, drift: 0.8, wob: 0.6, s0: 0.5, s1: 3.4, opacity: 0.2, wind: [0.28, 0, 0.1] });
  P((b) => { for (const [x, y, z] of emit.fire) for (let i = 0; i < 26; i++) b.add(x + R(-0.3, 0.3), y, z + R(-0.3, 0.3), R(0.45, 0.8), R(0.8, 1.4), pick([0xff5a18, 0xff9a2a, 0xffd060])); }, { span: 1.3, speed: 1.9, drift: 0.12, wob: 5, s0: 1, s1: 0.25, opacity: 0.35, aspect: 1.5, glow: true, boost: 2.2 });
  // chispas que suben del fogón
  P((b) => { for (const [x, y, z] of emit.fire) for (let i = 0; i < 30; i++) b.add(x + R(-0.25, 0.25), y + 0.4, z + R(-0.25, 0.25), R(0.025, 0.05), R(0.6, 1.6), pick([0xffb040, 0xff7a20, 0xffe090])); }, { span: 4.2, speed: 1.5, drift: 0.55, wob: 3, opacity: 1, glow: true, boost: 5, wind: [0.15, 0, 0.05] });
  P((b) => { for (const t of trees) if (t.kind === 'roble') for (let i = 0; i < 4; i++) b.add(t.x + R(-3, 3), t.y + t.H * R(0.5, 0.95), t.z + R(-3, 3), R(0.12, 0.2), R(0.6, 1.3), pick([0xc48a28, 0xdcaa3a, 0xa86a1c])); }, { dir: [0, -1, 0], span: 11, speed: 1.0, drift: 1.4, wob: 1.6, opacity: 1, wind: [0.2, 0, 0.08], aspect: 0.6, hard: true });
  P((b) => { for (const [cx, cz, r, n] of [[0, 0, 34, 200], [POI.maqui.x, POI.maqui.z, 24, 200], [POI.pewen.x, POI.pewen.z, 50, 200], [POI.antiguos.x, POI.antiguos.z, 16, 80], [POI.viejo.x, POI.viejo.z, 40, 160]]) for (let i = 0; i < n; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; b.add(x, height(x, z) + R(0.4, 5), z, R(0.04, 0.07), R(0.5, 1.5), 0xfff4c8); } }, { dir: [0, 1, 0], span: 2.5, speed: 0.25, drift: 1.3, wob: 0.7, opacity: 0.8, glow: true, boost: 2.2 });
  // luces que flotan en los lugares con dueño: el bosque viejo, el menoko y el lugar de los antiguos
  P((b) => { for (const [cx, cz, r, n] of [[POI.viejo.x, POI.viejo.z, 46, 34], [POI.menoko.x, POI.menoko.z, 40, 30], [POI.antiguos.x, POI.antiguos.z, 13, 12], [CERRO[0], CERRO[1], 9, 6]]) for (let i = 0; i < n; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; b.add(x, Math.max(WATER_Y, height(x, z)) + R(0.8, 3.2), z, R(0.22, 0.4), R(0.5, 1.2), pick([0xbfe8ff, 0xe8f6ff, 0xc8ffe6])); } }, { dir: [0, 0.4, 0], span: 3, speed: 0.12, drift: 2.2, wob: 0.5, opacity: 0.9, glow: true, boost: 3 });
  P((b) => {
    for (let i = 0; i < 70; i++) { const a = R(0, 6.28), d = Math.sqrt(rng()) * 44, x = POI.menoko.x + Math.cos(a) * d, z = POI.menoko.z + Math.sin(a) * d * 0.8; b.add(x, Math.max(WATER_Y, height(x, z)) + R(0.6, 2.2), z, R(9, 15), R(0.6, 1.2), 0xe6eef0); }
    for (let i = 0; i < 60; i++) { const x = R(-190, 170); b.add(x, WATER_Y + R(0.5, 1.6), riverZ(x) + R(-7, 7), R(8, 13), R(0.6, 1.2), 0xe6eef0); }
  }, { dir: [0, 0, 0], span: 30, speed: 0.9, drift: 0.8, wob: 0.25, s0: 0.8, s1: 1.3, opacity: 0.1, wind: [1, 0, 0.1], aspect: 0.35 });

  const turn = (o, tx, tz, dt, k = 6) => { let d = Math.atan2(tx - o.x, tz - o.z) - o.face; d = Math.atan2(Math.sin(d), Math.cos(d)); o.face += d * Math.min(1, dt * k); };

  function update(dt, t, pp, speed = 0) {
    for (const p of actors) {
      if (p.mode === 'walk') {
        const [tx, tz] = p.pts[p.i], d = Math.hypot(tx - p.x, tz - p.z);
        const near = Math.hypot(pp.x - p.x, pp.z - p.z); if (near < 1.7) { p.wait = Math.max(p.wait, 0.6); turn(p, pp.x, pp.z, dt, 3); } // si te cruzas, se detiene y te mira
        if (p.wait > 0) { p.wait -= dt; p.speed += (0 - p.speed) * Math.min(1, dt * 8); }
        else if (d < 0.5) { p.i = (p.i + 1) % p.pts.length; p.wait = R(1.5, 5); }
        else { turn(p, tx, tz, dt); p.speed += (p.pace - p.speed) * Math.min(1, dt * 5); p.x += Math.sin(p.face) * p.speed * dt; p.z += Math.cos(p.face) * p.speed * dt; }
        p.phase += dt * (1.5 + p.speed * 3.4 / Math.sqrt(p.h)); animatePerson(p, p.phase, Math.min(1, p.speed / 2.4) * 0.75 + (p.speed > 0.1 ? 0.2 : 0));
      } else if (p.mode === 'work') { p.phase += dt * 2.2; animatePerson(p, 0, 0); p.armL.rotation.x = -0.9 + Math.sin(p.phase) * 0.3; p.armR.rotation.x = -0.9 + Math.sin(p.phase + 2) * 0.3; p.foreL.rotation.x = -0.7 + Math.sin(p.phase + 1) * 0.3; p.foreR.rotation.x = -0.7 + Math.sin(p.phase + 3) * 0.3; p.head.rotation.x = 0.2; }
      else { p.phase += dt; animatePerson(p, 0, 0); p.armL.rotation.x = Math.sin(p.phase * 0.6) * 0.05; p.body.rotation.z = Math.sin(p.phase * 0.35) * 0.015; p.head.rotation.y = Math.sin(p.phase * 0.23) * 0.3; if (Math.hypot(pp.x - p.x, pp.z - p.z) < 6) { turn(p, pp.x, pp.z, dt, 2.5); p.head.rotation.y *= 0.3; } }
      const gy = height(p.x, p.z); p.g.position.set(p.x, gy + Math.sin(p.phase * 0.8) * 0.008, p.z); p.g.rotation.y = p.face;
      p.rb.setNextKinematicTranslation({ x: p.x, y: gy + p.cy, z: p.z });
      if (p.mark) { p.mark.position.set(p.x, gy + p.h + 0.36 + Math.sin(t * 2.2 + p.x) * 0.045, p.z); p.mark.material.rotation = Math.sin(t * 0.9) * 0.12; }
    }
    for (const q of quads) {
      const dp = Math.hypot(pp.x - q.x, pp.z - q.z), flee = q.shy && dp < api.shyR * (speed > 4 ? 1 : 0.4); // corriendo los espantas de lejos; caminando puedes acercarte
      if (flee) { q.tx = q.x + ((q.x - pp.x) / dp) * 14; q.tz = q.z + ((q.z - pp.z) / dp) * 14; q.wait = 0; }
      const d = Math.hypot(q.tx - q.x, q.tz - q.z), want = flee ? 5.2 : q.pace;
      if (q.wait > 0) { q.wait -= dt; q.speed += (0 - q.speed) * Math.min(1, dt * 6); q.neck.rotation.x += ((q.graze ? 1.7 : 0.3) - q.neck.rotation.x) * Math.min(1, dt * 3); q.headPivot.rotation.x = -q.neck.rotation.x * 0.6; q.tail.rotation.x = Math.sin(q.phase * 3 + q.x) * 0.25; }
      else if (d < 0.4) { q.wait = R(2, 8); q.graze = rng() < 0.6; const a = R(0, 6.28), r = Math.sqrt(rng()) * q.hr; q.tx = q.hx + Math.cos(a) * r; q.tz = q.hz + Math.sin(a) * r; }
      else { turn(q, q.tx, q.tz, dt, flee ? 9 : 3); q.speed += (want - q.speed) * Math.min(1, dt * 5); q.x += Math.sin(q.face) * q.speed * dt; q.z += Math.cos(q.face) * q.speed * dt; q.neck.rotation.x += (0.3 + Math.sin(q.phase) * 0.05 - q.neck.rotation.x) * Math.min(1, dt * 5); q.headPivot.rotation.x = -0.3; }
      q.phase += dt * (1 + q.speed * 5); const amp = Math.min(0.6, q.speed * 0.55), OFF = [Math.PI / 2, Math.PI * 1.5, 0, Math.PI]; // delantera izq., delantera der., trasera izq., trasera der.
      for (let i = 0; i < 4; i++) { q.legs[i].rotation.x = -Math.sin(q.phase + OFF[i]) * amp; q.knees[i].rotation.x = Math.max(0, Math.cos(q.phase + OFF[i])) * amp * 1.3; }
      q.g.rotation.z = Math.sin(q.phase) * amp * 0.04;
      const gy = height(q.x, q.z); q.g.position.set(q.x, gy + Math.abs(Math.sin(q.phase)) * Math.min(0.02, q.speed * 0.01), q.z); q.g.rotation.y = q.face;
      q.rb.setNextKinematicTranslation({ x: q.x, y: gy + q.cy, z: q.z });
      // los weke levantan la cabeza y te siguen con la mirada cuando te acercas
      let look = 0; if (!q.shy && dp < 5) { look = Math.atan2(pp.x - q.x, pp.z - q.z) - q.face; look = Math.max(-1.2, Math.min(1.2, Math.atan2(Math.sin(look), Math.cos(look)))); if (dp < 3.2) q.graze = false; }
      q.neck.rotation.y += (look * 0.6 - q.neck.rotation.y) * Math.min(1, dt * 3); q.headPivot.rotation.y = q.neck.rotation.y * 0.7;
      const fine = dp < 26; if (fine !== q.fine) { q.fine = fine; for (const sh of q.shells) sh.visible = fine; } // el pelaje fino solo se dibuja de cerca
    }
    for (const b of birds) {
      const [x, y, z, amp, fq] = b.f(t, b), [x2, y2, z2] = b.f(t + 0.05, b);
      const scare = b.type === 'small' && Math.hypot(pp.x - x, pp.z - z) < 9 && speed > 1; b.up = (b.up || 0) + ((scare ? 7 : 0) - (b.up || 0)) * Math.min(1, dt * (scare ? 2.5 : 0.25)); // los pajaritos suben cuando pasas debajo
      b.g.position.set(x, y + b.up, z); b.g.rotation.y = Math.atan2(x2 - x, z2 - z); b.g.rotation.x = -(y2 - y) * 2;
      const fl = Math.sin(t * fq + b.o) * amp; b.wl.rotation.z = fl; b.wr.rotation.z = -fl; b.wlo.rotation.z = fl * 0.7 + Math.cos(t * fq + b.o) * amp * 0.3; b.wro.rotation.z = -b.wlo.rotation.z;
    }
  }
  const api = { update, actors, quads, birds, markMats, shyR: 9 }; // shyR: a qué distancia huyen los animales tímidos
  return api;
}
