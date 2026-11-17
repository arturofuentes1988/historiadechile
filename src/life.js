// Lo que se mueve: gente, animales, aves y partículas (humo, fuego, hojas, neblina).
import * as THREE from 'three';
import { ParticleBatch, photo, TEX } from './gfx.js';
import { height, POI, CERRO, riverZ, WATER_Y } from './terrain.js';
import { RUKAS, CORRAL, FOGON } from './village.js';

const mats = new Map();
const mat = (c) => { let m = mats.get(c); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, side: THREE.DoubleSide }); m.userData.liso = true; mats.set(c, m); } return m; }; // liso: un color parejo y nada más (al juntar las piezas, ese color pasa a los vértices)
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

// ---------- juntar las piezas de un cuerpo ----------
// Una persona o un animal se arma con decenas de piezas sueltas colgadas de sus articulaciones, y cada pieza era una
// orden de dibujo aparte (dos, contando su sombra): entre todos sumaban más de la mitad de las órdenes de cada cuadro.
// Aquí, terminado de armar el cuerpo, las piezas que comparten material se juntan en una sola malla «con esqueleto»:
// cada vértice queda amarrado a la articulación de la que colgaba su pieza. Las articulaciones siguen siendo las mismas
// y se animan igual que antes, así que el cuerpo se ve y se mueve igual; solo cambia cuántas veces hay que mandarlo a dibujar.
const lisoMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: THREE.DoubleSide }); // todas las piezas de color parejo, cada una con su color en los vértices
const SUELTAS = new URLSearchParams(location.search).has('sueltas'); // con ?sueltas en la dirección no se junta nada: sirve para comparar si algo se ve distinto
function fuse(root) {
  if (SUELTAS) return [];
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), M = new THREE.Matrix4(), bones = [], lots = new Map(), old = [];
  const walk = (o, joint) => {
    if (!o.isMesh) { for (const c of o.children) walk(c, o); return; } // lo que no es una pieza es una articulación
    let b = bones.indexOf(joint); if (b < 0) b = bones.push(joint) - 1;
    const liso = !!o.material.userData.liso, shell = !!o.userData.shell, key = (liso ? 'liso' : o.material.uuid) + (shell ? '-pelo' : '');
    const lot = lots.get(key) || lots.set(key, { mat: liso ? lisoMat : o.material, shell, pos: [], nor: [], uv: [], col: [], bone: [], idx: [] }).get(key);
    const geo = o.geometry.clone(); if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.applyMatrix4(M.multiplyMatrices(inv, o.matrixWorld)); // la pieza, puesta donde está en el cuerpo en reposo
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, C = geo.attributes.color, I = geo.index, n0 = lot.pos.length / 3, flip = M.determinant() < 0, c = o.material.color;
    for (let i = 0; i < P.count; i++) {
      lot.pos.push(P.getX(i), P.getY(i), P.getZ(i)); lot.nor.push(N.getX(i), N.getY(i), N.getZ(i)); lot.uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
      if (liso) lot.col.push(c.r, c.g, c.b); else if (C) lot.col.push(C.getX(i), C.getY(i), C.getZ(i)); else lot.col.push(1, 1, 1);
      lot.bone.push(b);
    }
    for (let i = 0, n = I ? I.count : P.count; i < n; i += 3) { const v0 = I ? I.getX(i) : i, v1 = I ? I.getX(i + 1) : i + 1, v2 = I ? I.getX(i + 2) : i + 2; lot.idx.push(n0 + v0, n0 + (flip ? v2 : v1), n0 + (flip ? v1 : v2)); }
    old.push(o); for (const ch of o.children) walk(ch, joint); // el pelaje fino cuelga de su piel: va con la misma articulación
  };
  for (const c of root.children) walk(c, root);
  if (!old.length) return [];
  for (const o of old) o.removeFromParent();
  const skeleton = new THREE.Skeleton(bones), out = []; // la postura en que quedó armado es su postura de reposo
  for (const lot of lots.values()) {
    const n = lot.bone.length, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), g = new THREE.BufferGeometry();
    for (let i = 0; i < n; i++) { si[i * 4] = lot.bone[i]; sw[i * 4] = 1; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(lot.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(lot.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(lot.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(lot.col, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); g.setIndex(lot.idx); g.computeBoundingBox();
    const m = new THREE.SkinnedMesh(g, lot.mat); if (lot.shell) m.userData.shell = true; root.add(m); m.bind(skeleton);
    out.push(m);
  }
  // Para decidir si está en pantalla, todas las mallas de un mismo cuerpo usan la misma esfera: la del cuerpo entero, con
  // holgura para cuando estira el cuello, abre los brazos o pliega las alas. (Con una esfera por malla, los ojos de un animal
  // que baja la cabeza a pastar quedaban fuera de la suya y dejaban de dibujarse cerca del borde de la pantalla.)
  const box = new THREE.Box3(); for (const m of out) box.union(m.geometry.boundingBox);
  const sph = box.getBoundingSphere(new THREE.Sphere()); sph.radius *= 1.6;
  for (const m of out) { m.boundingSphere = sph.clone(); m.geometry.boundingSphere = sph.clone(); }
  return out;
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
  g.scale.setScalar(h); fuse(g); shadows(g);
  return { g, body, head, legL, legR, shinL, shinR, armL, armR, foreL, foreR, h, woman };
}
// Cuánto sube (+) o baja (−) el terreno hacia donde mira alguien parado en (x, z): metros de alto por metro de avance.
export const slopeAhead = (x, z, face) => { const fx = Math.sin(face), fz = Math.cos(face); return (height(x + fx * 0.8, z + fz * 0.8) - height(x - fx * 0.3, z - fz * 0.3)) / 1.1; };
// phase: fase del paso; amp: 0 quieto, 1 corriendo; air: en el aire; slope: pendiente hacia donde camina.
// La pierna que avanza dobla la rodilla y levanta el talón; la que apoya cede un poco. Cuesta arriba el paso se acorta,
// el muslo sube más, las rodillas trabajan más y el cuerpo se echa hacia adelante; cuesta abajo se frena con las rodillas.
export function animatePerson(p, phase, amp, air = false, slope = 0) {
  if (air) { p.legL.rotation.x = -0.7; p.shinL.rotation.x = 1.0; p.legR.rotation.x = 0.35; p.shinR.rotation.x = 0.5; p.armL.rotation.x = p.armR.rotation.x = -0.5; p.armL.rotation.z = 0.8; p.armR.rotation.z = -0.8; p.foreL.rotation.x = p.foreR.rotation.x = -0.5; p.body.rotation.x = 0.1; p.body.rotation.z = 0; return; }
  const s = Math.sin(phase), c = Math.cos(phase), k = p.woman ? 0.6 : 1; // el vestido acorta el paso
  const up = Math.min(1, Math.max(0, slope * 2.2)), dn = Math.min(1, Math.max(0, -slope * 2.2)), sw = [Math.max(0, c), Math.max(0, -c)]; // sw: cuánto va en el aire cada pierna
  const stride = amp * (0.78 - up * 0.2) * k, lift = amp * up * 0.5, bend = amp * (1.45 + up * 0.7) * k, give = amp * (0.14 + up * 0.32 + dn * 0.28);
  p.legL.rotation.x = -s * stride - sw[0] * lift - up * amp * 0.1; p.legR.rotation.x = s * stride - sw[1] * lift - up * amp * 0.1;
  p.shinL.rotation.x = sw[0] ** 0.8 * bend + (1 - sw[0]) * give; p.shinR.rotation.x = sw[1] ** 0.8 * bend + (1 - sw[1]) * give;
  p.armL.rotation.x = s * amp * (0.6 + up * 0.15); p.armR.rotation.x = -s * amp * (0.6 + up * 0.15); p.armL.rotation.z = 0.1; p.armR.rotation.z = -0.1;
  p.foreL.rotation.x = -0.15 - amp * 0.35 - Math.max(0, -s) * amp * 0.4; p.foreR.rotation.x = -0.15 - amp * 0.35 - Math.max(0, s) * amp * 0.4;
  p.body.rotation.x = amp * 0.09 + Math.min(1, amp * 2) * (up * 0.3 - dn * 0.07); p.body.rotation.y = s * amp * 0.07; p.body.rotation.z = c * amp * 0.025; // la cadera se balancea con cada paso
  p.body.position.y = Math.abs(c) * amp * 0.014 - amp * (up + dn) * 0.012;
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
  // Zorro culpeo: 40 cm a la cruz, cuerpo largo y bajo, hocico fino, orejas grandes en punta y cola larga y tupida de punta negra.
  zorro: {
    torso: [[0.4, -0.37, 0.01, 0.01], [0.42, -0.3, 0.075, 0.085], [0.42, -0.12, 0.095, 0.11], [0.41, 0.06, 0.095, 0.115], [0.41, 0.2, 0.08, 0.1], [0.42, 0.29, 0.045, 0.055], [0.42, 0.32, 0.01, 0.01]],
    neckAt: [0.44, 0.24], neck: [[-0.05, -0.04, 0.065, 0.075], [0.03, 0.03, 0.05, 0.055], [0.1, 0.08, 0.045, 0.048], [0.13, 0.1, 0.02, 0.02]],
    headAt: [0.11, 0.085], head: [[0, -0.05, 0.012, 0.012], [0.015, -0.02, 0.048, 0.05], [0.016, 0.03, 0.046, 0.046], [0.004, 0.08, 0.026, 0.024], [-0.004, 0.125, 0.016, 0.014], [-0.006, 0.14, 0.006, 0.006]],
    hipY: 0.335, hipX: 0.06, hipZ: [0.2, -0.24], thigh: [[0, 0, 0.04, 0.055], [-0.09, 0, 0.026, 0.032], [-0.17, 0, 0.016, 0.018]], shin: [[0, 0, 0.016, 0.018], [-0.08, 0, 0.012, 0.013], [-0.15, 0, 0.011, 0.012], [-0.16, 0.006, 0.016, 0.018], [-0.165, 0.006, 0.004, 0.004]],
    tailAt: [0.4, -0.33], tail: [[0, 0, 0.025, 0.025], [-0.04, -0.12, 0.055, 0.055], [-0.1, -0.28, 0.062, 0.062], [-0.14, -0.4, 0.032, 0.032], [-0.15, -0.44, 0.008, 0.008]], tip: 0x1c1612,
    ear: 0.085, earAt: [0.03, 0.05, -0.005], eyeAt: [0.036, 0.028, 0.045, 0.007], rough: 0.03, fur: 0.02,
  },
};
function buildQuad({ s = 1, kind = 'weke', body = 0xb07a4a, belly = 0xf0e8d8, legs = 0x7a6a5e, horns = false }) {
  const A = ANIMAL[kind], g = new THREE.Group(), dark = 0x18130f, weke = kind === 'weke';
  const coat = (t, sa) => mixHex(body, belly, (-sa - 0.25) * 2.2);                          // lomo de un color, vientre más claro
  const F = A.fur; g.add(skin(A.torso, coat, { rings: 22, rough: A.rough, fur: F }));
  const tail = new THREE.Group(); tail.position.set(0, A.tailAt[0], A.tailAt[1]); tail.add(skin(A.tail, (t) => (A.tip && t > 0.74 ? A.tip : body), { rings: A.tip ? 14 : 6, radial: 8, fur: F * 0.8 })); g.add(tail); // el zorro lleva la punta de la cola negra
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
  g.scale.setScalar(s); fuse(g); shadows(g);
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
  // chucao: rechoncho, lomo pardo, garganta y pecho rojizos, vientre barrado de blanco y negro, cola corta y parada
  chucao: { k: 0.2, span: 0.24, chord: 0.085, tailLen: 0.075, tailFan: 0.2, beak: 0x2a2622, cere: 0x2a2622,
    coat: (t, sa) => (t > 0.8 ? (sa > 0.1 ? 0x3a2c22 : 0xb8502a) : sa < -0.15 ? (t > 0.5 ? 0xb8502a : Math.sin(t * 70) > 0 ? 0xe8e0d0 : 0x3a322c) : 0x4a3826),
    wing: () => 0x3e2e20, tail: () => 0x33261c },
  // carpintero negro: todo negro, con la cabeza roja y una mancha blanca en las alas; pico largo y recto, color hueso
  carpintero: { k: 0.42, span: 0.62, chord: 0.17, tailLen: 0.17, tailFan: 0.1, beak: 0xd8d2c4, cere: 0x15120f, long: true,
    coat: (t) => (t > 0.74 ? 0xb81e1a : 0x15120f), wing: (f, u) => (f < 0.45 && u < 0.45 ? 0xf0ece0 : 0x15120f), tail: () => 0x15120f },
  // picaflor: diminuto, verde, de vientre claro y corona rojiza; pico fino y largo
  picaflor: { k: 0.1, span: 0.14, chord: 0.04, tailLen: 0.04, tailFan: 0.25, beak: 0x1a1614, cere: 0x1a1614, long: true,
    coat: (t, sa) => (t > 0.86 && sa > 0.2 ? 0xd8642a : sa < -0.2 ? 0xd8d4c4 : 0x3f8a4a), wing: () => 0x3a3a40, tail: () => 0x2a5a36 },
  // chuncho: búho pequeño y cabezón, pardo con rayas claras en el pecho y la cara más clara
  chuncho: { k: 0.3, span: 0.38, chord: 0.13, tailLen: 0.09, tailFan: 0.2, beak: 0xd8c890, cere: 0xd8c890, hook: true,
    coat: (t, sa) => (t > 0.7 ? (sa < 0.1 ? 0xd8ccb0 : 0x6a4a30) : sa < -0.15 ? (Math.sin(t * 50) > 0.2 ? 0xe8e0cc : 0x6a4a30) : 0x6a4a30),
    wing: (f, u) => (Math.sin(u * 20 + f * 9) > 0.6 ? 0xd8c8a0 : 0x5a3e28), tail: (u) => (Math.sin(u * 16) > 0 ? 0x5a3e28 : 0x8a6a48) },
};
// Monito del monte: un marsupial que cabe en una mano. Cuerpo redondo, ojos grandes con antifaz oscuro, orejas redondas
// y una cola gruesa en la base (ahí guarda su grasa) con la que se afirma de las ramas. Va al doble de su porte para que se distinga.
function buildMonito() {
  const g = new THREE.Group(), fur = 0x8c7c68, belly = 0xe6dccb, dark = 0x2a2018;
  g.add(skin([[0.03, -0.055, 0.005, 0.005], [0.036, -0.035, 0.027, 0.027], [0.04, 0, 0.034, 0.037], [0.044, 0.035, 0.03, 0.031], [0.048, 0.058, 0.014, 0.014]], (t, sa) => mixHex(fur, belly, (-sa - 0.2) * 2.2), { rings: 12, radial: 12, fur: 0.006 }));
  const hd = new THREE.Group(); hd.position.set(0, 0.052, 0.06); g.add(hd);
  hd.add(skin([[0, -0.022, 0.008, 0.008], [0.004, -0.006, 0.026, 0.025], [0.003, 0.018, 0.024, 0.022], [-0.002, 0.038, 0.012, 0.011], [-0.004, 0.048, 0.004, 0.004]], (t, sa) => (t > 0.9 ? 0xc89a8a : mixHex(fur, belly, (-sa - 0.1) * 2 + (t - 0.6))), { rings: 10, radial: 12, fur: 0.004 }));
  for (const sx of [-1, 1]) { ball(0.0105, dark, hd, sx * 0.016, 0.008, 0.02, 1, 1, 0.5); ball(0.0068, dark, hd, sx * 0.0165, 0.0085, 0.0235).material = eyeMat; ball(0.012, 0xc8a090, hd, sx * 0.022, 0.024, -0.004, 1, 1, 0.3).rotation.y = sx * 0.5; }
  g.add(skin([[0.032, -0.05, 0.012, 0.012], [0.012, -0.085, 0.013, 0.013], [-0.022, -0.1, 0.012, 0.012], [-0.055, -0.085, 0.01, 0.01], [-0.066, -0.055, 0.008, 0.008], [-0.05, -0.036, 0.005, 0.005]], () => 0x7a6a58, { rings: 16, radial: 8, fur: 0.003 }));
  for (const [x, z] of [[0.02, 0.035], [-0.02, 0.035], [0.022, -0.03], [-0.022, -0.03]]) ball(0.008, 0xd8b0a0, g, x, 0.008, z, 1, 0.6, 1.4);
  g.scale.setScalar(2); fuse(g); shadows(g); g.traverse((o) => { if (o.userData.shell) o.castShadow = false; });
  return { g, hd };
}
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
  fuse(g); shadows(g);
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
  // Tienen cuerpo, pero no dentro del motor de física: son círculos que el juego revisa a mano al mover a Leftraru.
  // (Como cuerpos del motor obligaban a reordenar todo el mundo en cada cuadro.)
  const solids = [], solid = (o, r) => { o.rad = r; solids.push(o); };
  const markMats = Object.fromEntries(['main', 'sec', 'nuevo'].map((k) => [k, new THREE.SpriteMaterial({ map: markTexture(k), fog: false, toneMapped: false, depthWrite: false })]));

  // ---------- gente de la aldea ----------
  const person = (opts, x, z, beh) => { const p = buildPerson(opts); p.x = x; p.z = z; p.face = beh.face ?? 0; p.phase = R(0, 6); p.speed = 0; p.wait = R(0, 3); p.i = 0; Object.assign(p, beh); p.g.position.set(x, height(x, z), z); scene.add(p.g); actors.push(p); solid(p, 0.26, p.h * 0.5 - 0.26, p.h * 0.5);
    if (p.name) { p.mark = new THREE.Sprite(markMats.nuevo); p.mark.scale.setScalar(0.3); p.mark.visible = false; p.mark.renderOrder = 5; scene.add(p.mark); }
    return p; };
  const man = { kind: 'man', h: 1.66, skin: 0x96603c, cloth: 0x2a2630 }, woman = { kind: 'woman', h: 1.56, skin: 0xa0683f, cloth: 0x1f1c26, trim: 0xb3262e, band: 0xc23a36 };
  person({ ...man, band: 0xe9dcb8, trim: 0xb3262e }, 2, -9, { name: 'Curiñancu', mode: 'idle', face: Math.PI });
  { const m = person(woman, -9.6, -5.4, { name: 'Millaray', mode: 'work', face: 2.2 }); // lleva un palo de revolver, que solo se ve cuando está junto a la olla
    const mano = new THREE.Group(); mano.position.set(0, -0.175, 0.004); mano.rotation.x = 0.99; m.foreR.add(mano); // el palo cuelga derecho de la mano aunque el brazo vaya estirado
    m.palo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.36, 6), new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 })); m.palo.position.y = -0.14; m.palo.castShadow = true; m.palo.visible = false; mano.add(m.palo); }
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
  for (const [x, z] of [[POI.viejo.x + 16, POI.viejo.z + 12], [-70, -70], [40, -52], [-60, 66], [70, 40], [-140, 20], [22, -62], [-30, -48], [58, -20], [-22, 52], [36, 58], [-96, -20]]) // pudúes: también cerca de los senderos, para que se dejen ver
    quad({ kind: 'pudu', body: 0x8a5230, belly: 0xa9764c, legs: 0x5a3420, horns: rng() < 0.5 }, x, z, { hx: x, hz: z, hr: 16, pace: 0.6, shy: true });
  for (const [x, z] of [[-73, -67], [38, 61]]) quad({ kind: 'pudu', s: 0.62, body: 0x94603a, belly: 0xb88a5c, legs: 0x5a3420 }, x, z, { hx: x, hz: z, hr: 9, pace: 0.6, shy: true }); // dos crías, cerca de sus madres
  // zorros culpeo: rondan los bordes del bosque; son menos asustadizos que el pudú, pero no se dejan acercar corriendo
  for (const [x, z] of [[52, 34], [-84, -52], [-30, 68], [118, -34]]) quad({ kind: 'zorro', body: 0xa8683e, belly: 0xe8dcc8, legs: 0x8a4a2a }, x, z, { hx: x, hz: z, hr: 24, pace: 0.95, shy: true });

  // ---------- aves ----------
  // Cada ave (o bandada) alterna entre volar por su recorrido y posarse en una rama seca de un árbol.
  // Solo se las observa posadas: quietas se ven bien; en vuelo y de lejos son un borrón que no se deja mirar.
  const TR = { giant: 1.3, pewen: 0.48, pewenYoung: 0.16, coigue: 0.6, roble: 0.5, canelo: 0.2, peumo: 0.34, boldo: 0.26, quillay: 0.36, litre: 0.2 }, UP = new THREE.Vector3(0, 1, 0);
  const ramaMat = new THREE.MeshStandardMaterial({ map: photo('corteza-roble'), color: 0xa89888, roughness: 1 }), groups = [];
  const closest = (list, x, z, n = 1, minD = 0) => list.map((t) => [Math.hypot(t.x - x, t.z - z), t]).filter((q) => q[0] >= minD).sort((a, b) => a[0] - b[0]).slice(0, n).map((q) => q[1]);
  // La percha: una rama seca que sale del tronco a cierta altura. Devuelve dónde queda el ave, hacia dónde mira y desde dónde se la ve mejor.
  function percha(t, hh, ang, len) {
    const L = (TR[t.rec.kind] || 0.3) * t.rec.s * 0.9 + len, tilt = 0.22, dx = Math.cos(ang) * Math.cos(tilt), dz = Math.sin(ang) * Math.cos(tilt), dy = Math.sin(tilt), y0 = t.y + hh;
    const g = new THREE.CylinderGeometry(0.012 + len * 0.012, 0.03 + len * 0.028, L, 6); g.translate(0, L / 2, 0);
    const m = new THREE.Mesh(g, ramaMat); m.position.set(t.x, y0, t.z); m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx, dy, dz)); m.castShadow = true; scene.add(m);
    const d = L - 0.1 - len * 0.1, ox = Math.cos(ang), oz = Math.sin(ang), cl = Math.hypot(ox * 0.9 - oz * 0.42, oz * 0.9 + ox * 0.42); // el ave se posa cerca de la punta, atravesada en la rama; se la mira casi de perfil, con el tronco de fondo
    return { x: t.x + dx * d, y: y0 + dy * d, z: t.z + dz * d, r: 0.018 + len * 0.014, yaw: Math.atan2(-oz, ox), cam: [(ox * 0.9 - oz * 0.42) / cl, (oz * 0.9 + ox * 0.42) / cl], tree: t };
  }
  // grupo: lo que comparten las aves que andan juntas (una bandada baja y se levanta junta). fly y rest: cuánto vuela y cuánto descansa.
  const group = (o) => { const g = { ft: 0, st: 'fly', tm: 0, dur: 0, hold: 0, list: [], T: 4, ...o }; groups.push(g); return g; };
  const bird = (type, f, g, perch) => { const b = buildBird(type); b.f = f; b.type = type; b.o = R(0, 6.28); b.grp = g; b.perch = perch || null; b.lag = g.list.length * 0.4; b.ph = R(0, 6); b.yaw = 0; b.pitch = 0; b.up = 0; b.perched = false; b.g.rotation.order = 'YXZ'; g.list.push(b); scene.add(b.g); birds.push(b); return b; };
  // al terminar de armar un grupo: dónde está su posadero respecto del recorrido, y si parte volando o posado
  const ready = (g, perched) => {
    const ps = g.list.map((b) => b.perch).filter(Boolean); if (!ps.length) return;
    g.pc = { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, z: ps.reduce((s, p) => s + p.z, 0) / ps.length }; g.maxLag = g.list[g.list.length - 1].lag;
    let best = 1e9, bt = 0; for (let t = 0; t < 130; t += 0.5) { const [x, , z] = g.list[0].f(t, g.list[0]), d = Math.hypot(x - g.pc.x, z - g.pc.z); if (d < best) { best = d; bt = t; } }
    g.landR = best + 9; g.ft = bt + (perched ? 0 : R(8, 30)); g.st = perched ? 'perch' : 'fly'; g.dur = perched ? R(g.rest[0], g.rest[1]) : R(4, 12);
  };
  const tall = trees.filter((t) => t.kind === 'pewen' && t.H > 14);
  { // el traro: planea sobre el cerro y se posa en un pewen cerca de la cima
    const t0 = closest(tall.length ? tall : trees, CERRO[0], CERRO[1], 1, 12)[0], g = group({ fly: [40, 60], rest: [45, 70], T: 5 });
    bird('traro', (t) => [CERRO[0] + Math.cos(t * 0.16) * 46, 78 + Math.sin(t * 0.23) * 6, CERRO[1] + Math.sin(t * 0.16) * 46, 0.25, 1.6], g, t0 && percha(t0, t0.H * 0.56, Math.atan2(CERRO[1] - t0.z, CERRO[0] - t0.x), 1.5)); ready(g, true);
  }
  { // la bandada de choroyes: cruza el valle y baja a los pewenes del bosque del norte, donde están los piñones
    const ps = closest(tall, 0, -100, 3), g = group({ fly: [45, 70], rest: [40, 60], T: 5 });
    for (let i = 0; i < 9; i++) { const dx = R(-7, 7), dy = R(-2.5, 2.5), dz = R(-7, 7), t0 = ps[i % (ps.length || 1)];
      bird('choroy', (t) => [Math.cos(t * 0.11) * 150 + dx, 38 + Math.sin(t * 0.3) * 6 + dy, Math.sin(t * 0.11) * 105 + dz, 0.7, 13], g, t0 && percha(t0, t0.H * (0.4 + 0.1 * Math.floor(i / ps.length)), i * 2.3 + 0.5, 1.3)); }
    ready(g, false);
  }
  // los rayaditos: revolotean entre los árboles y se posan en ramas bajas; si te acercas corriendo, se van
  for (const [cx, cz] of [[6, -30], [-34, 14], [30, 26], [-70, -40], [0, -80], [-90, 50], [60, -30]]) { const r = R(5, 11), sp = R(0.5, 0.9) * (rng() < 0.5 ? 1 : -1), hh = R(5, 11), t0 = closest(trees, cx, cz)[0], g = group({ fly: [12, 24], rest: [20, 36], T: 2.6, shy: true });
    bird('small', (t, b) => [cx + Math.cos(t * sp + b.o) * r, height(cx, cz) + hh + Math.sin(t * 1.7 + b.o) * 1.5, cz + Math.sin(t * sp + b.o) * r * 0.7, 0.8, 16], g, t0 && percha(t0, R(2.1, 3.2), R(0, 6.28), 0.75)); ready(g, rng() < 0.6); }
  // el chucao: casi no vuela; anda cerca del suelo en lo más espeso y se posa bajo
  for (const [qx, qz] of [[-18, -58], [-92, -62], [-44, 62]]) { const t0 = closest(trees, qx, qz)[0], cx = t0.x + 2.5, cz = t0.z + 1.5, r = R(3, 5), sp = R(0.5, 0.8), g = group({ fly: [8, 16], rest: [24, 42], T: 2.2, shy: true });
    bird('chucao', (t, b) => [cx + Math.cos(t * sp + b.o) * r, height(cx, cz) + 1.3 + Math.sin(t * 1.3 + b.o) * 0.5, cz + Math.sin(t * sp + b.o) * r * 0.8, 0.9, 20], g, percha(t0, R(0.6, 1.0), R(0, 6.28), 0.6)); ready(g, true); }
  // el carpintero negro: en los árboles grandes y viejos
  { const big = trees.filter((t) => t.H > 16 && t.kind !== 'pewen');
    for (const [qx, qz] of [[32, -50], [-112, -84]]) { const t0 = closest(big.length ? big : trees, qx, qz)[0], cx = t0.x, cz = t0.z, r = R(10, 15), sp = R(0.3, 0.45), g = group({ fly: [14, 26], rest: [30, 50], T: 3.2 });
      bird('carpintero', (t, b) => [cx + Math.cos(t * sp + b.o) * r, height(cx, cz) + 11 + Math.sin(t * 0.9 + b.o) * 2, cz + Math.sin(t * sp + b.o) * r, 0.7, 9], g, percha(t0, R(4.5, 6.5), R(0, 6.28), 0.9)); ready(g, true); } }
  // el picaflor: se queda suspendido en el aire, va y viene, y descansa en una ramita
  for (const [qx, qz] of [[-62, 40], [10, 58], [-100, 52]]) { const t0 = closest(trees, qx, qz)[0], cx = t0.x + 2.4, cz = t0.z + 1.2, g = group({ fly: [10, 18], rest: [12, 20], T: 1.6, shy: true });
    bird('picaflor', (t, b) => [cx + Math.sin(t * 0.9 + b.o) * 2.2, height(cx, cz) + 1.7 + Math.sin(t * 2.3 + b.o) * 0.35, cz + Math.sin(t * 1.8 + b.o * 2) * 1.4, 1.0, 55], g, percha(t0, R(1.4, 1.9), R(0, 6.28), 0.6)); ready(g, false); }
  // el chuncho: quieto en su rama, mirando; no se va
  for (const [qx, qz] of [[POI.viejo.x + 6, POI.viejo.z - 8], [POI.antiguos.x - 16, POI.antiguos.z + 6]]) { const t0 = closest(trees, qx, qz)[0], g = group({ fly: [1, 1], rest: [1e9, 1e9], T: 3 });
    bird('chuncho', () => [t0.x + 3, t0.y + 6, t0.z + 3, 0.6, 8], g, percha(t0, R(3, 4.2), R(0, 6.28), 0.8)); ready(g, true); }
  // monitos del monte: en ramas bajas de lo más húmedo del bosque
  const critters = [];
  for (const [qx, qz] of [[POI.viejo.x + 12, POI.viejo.z + 4], [-104, -60], [-66, -36]]) { const t0 = closest(trees, qx, qz)[0], p = percha(t0, R(1.5, 2.1), R(0, 6.28), 0.75), m = buildMonito();
    m.g.position.set(p.x, p.y + p.r - 0.01, p.z); m.g.rotation.y = Math.atan2(p.x - t0.x, p.z - t0.z); scene.add(m.g); critters.push({ id: 'monito', ...m, x: p.x, y: p.y + p.r + 0.07, z: p.z, cam: p.cam, tree: t0, o: R(0, 6) }); }

  // ---------- partículas ----------
  const P = (fill, opts) => { const b = new ParticleBatch(); fill(b); const m = b.build(opts); scene.add(m); return m; };
  const pick = (cols) => cols[(rng() * cols.length) | 0];
  P((b) => { for (const [x, y, z, k] of emit.smoke) for (let i = 0; i < 26 * k; i++) b.add(x + R(-0.2, 0.2), y, z + R(-0.2, 0.2), R(0.8, 1.3) * (0.6 + k * 0.4), R(0.7, 1.2), pick([0x8a8782, 0xa6a39c, 0x6c6a66])); }, { span: 14, speed: 1.0, drift: 0.8, wob: 0.6, s0: 0.5, s1: 3.4, opacity: 0.2, wind: [0.28, 0, 0.1] });
  // el vapor de la olla: bocanadas blancas, chicas, que suben un poco y se deshacen
  P((b) => { for (const [x, y, z] of emit.steam || []) for (let i = 0; i < 24; i++) b.add(x + R(-0.07, 0.07), y, z + R(-0.07, 0.07), R(0.18, 0.3), R(0.8, 1.3), pick([0xf4f2ec, 0xe6e8ea])); }, { span: 1.3, speed: 0.55, drift: 0.08, wob: 1.3, s0: 0.4, s1: 2.0, opacity: 0.2, wind: [0.1, 0, 0.04] });
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

  const slopeOf = (o, dt) => { o.slope = (o.slope || 0) + ((o.speed > 0.2 ? slopeAhead(o.x, o.z, o.face) : 0) - (o.slope || 0)) * Math.min(1, dt * 4); return o.slope; };
  const turn = (o, tx, tz, dt, k = 6) => { let d = Math.atan2(tx - o.x, tz - o.z) - o.face; d = Math.atan2(Math.sin(d), Math.cos(d)); o.face += d * Math.min(1, dt * k); };

  function update(dt, t, pp, speed = 0) {
    for (const p of actors) {
      if (p.mode === 'walk') {
        const [tx, tz] = p.pts[p.i], d = Math.hypot(tx - p.x, tz - p.z);
        const near = Math.hypot(pp.x - p.x, pp.z - p.z); if (near < 1.7) { p.wait = Math.max(p.wait, 0.6); turn(p, pp.x, pp.z, dt, 3); } // si te cruzas, se detiene y te mira
        if (p.wait > 0) { p.wait -= dt; p.speed += (0 - p.speed) * Math.min(1, dt * 8); }
        else if (d < 0.5) { p.i = (p.i + 1) % p.pts.length; p.wait = R(1.5, 5); }
        else { turn(p, tx, tz, dt); p.speed += (p.pace - p.speed) * Math.min(1, dt * 5); p.x += Math.sin(p.face) * p.speed * dt; p.z += Math.cos(p.face) * p.speed * dt; }
        p.phase += dt * (1.5 + p.speed * 3.4 / Math.sqrt(p.h)); animatePerson(p, p.phase, Math.min(1, p.speed / 2.4) * 0.75 + (p.speed > 0.1 ? 0.2 : 0), false, slopeOf(p, dt));
      } else if (p.mode === 'work') { p.phase += dt * 2.2; animatePerson(p, 0, 0); p.armL.rotation.x = -0.9 + Math.sin(p.phase) * 0.3; p.armR.rotation.x = -0.9 + Math.sin(p.phase + 2) * 0.3; p.foreL.rotation.x = -0.7 + Math.sin(p.phase + 1) * 0.3; p.foreR.rotation.x = -0.7 + Math.sin(p.phase + 3) * 0.3; p.head.rotation.x = 0.2; }
      else if (p.mode === 'cook') { // junto a la olla: algo inclinada, mirándola, y con el palo en la mano derecha dando vueltas
        p.phase += dt * 2.6; animatePerson(p, 0, 0); const s = Math.sin(p.phase), c = Math.cos(p.phase);
        p.body.rotation.x = 0.13; p.head.rotation.x = 0.4; p.head.rotation.y = -0.12;
        p.armR.rotation.x = -0.62 + c * 0.07; p.armR.rotation.z = -0.1 + s * 0.09; p.foreR.rotation.x = -0.5 + s * 0.05;
        p.armL.rotation.x = -0.2; p.foreL.rotation.x = -1.2; }
      else if (p.mode === 'lead') { p.phase += dt * (1.5 + p.speed * 3.4 / Math.sqrt(p.h)); animatePerson(p, p.phase, Math.min(1, p.speed / 2.4) * 0.75 + (p.speed > 0.1 ? 0.2 : 0), false, slopeOf(p, dt)); p.head.rotation.y += ((p.mira || 0) - p.head.rotation.y) * Math.min(1, dt * 4); } // va guiando: su paso lo decide acciones.js
      else { p.phase += dt; animatePerson(p, 0, 0); p.armL.rotation.x = Math.sin(p.phase * 0.6) * 0.05; p.body.rotation.z = Math.sin(p.phase * 0.35) * 0.015; p.head.rotation.y = Math.sin(p.phase * 0.23) * 0.3; if (p.quieto) p.head.rotation.y *= 0.2; else if (Math.hypot(pp.x - p.x, pp.z - p.z) < 6) { turn(p, pp.x, pp.z, dt, 2.5); p.head.rotation.y *= 0.3; } }
      const gy = height(p.x, p.z); p.g.position.set(p.x, gy + Math.sin(p.phase * 0.8) * 0.008, p.z); p.g.rotation.y = p.face;
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
      // los weke levantan la cabeza y te siguen con la mirada cuando te acercas
      let look = 0; if (!q.shy && dp < 5) { look = Math.atan2(pp.x - q.x, pp.z - q.z) - q.face; look = Math.max(-1.2, Math.min(1.2, Math.atan2(Math.sin(look), Math.cos(look)))); if (dp < 3.2) q.graze = false; }
      q.neck.rotation.y += (look * 0.6 - q.neck.rotation.y) * Math.min(1, dt * 3); q.headPivot.rotation.y = q.neck.rotation.y * 0.7;
      const fine = dp < 26; if (fine !== q.fine) { q.fine = fine; for (const sh of q.shells) sh.visible = fine; } // el pelaje fino solo se dibuja de cerca
    }
    // cada grupo: vuela → baja a su posadero → descansa → se levanta. El recorrido se detiene mientras está posado.
    for (const g of groups) {
      g.tm += dt; g.hold = Math.max(0, g.hold - dt);
      if (!g.pc) { g.ft += dt; continue; }
      if (g.st === 'fly') { g.ft += dt; if (g.tm > g.dur) { const [x, , z] = g.list[0].f(g.ft, g.list[0]); if (Math.hypot(x - g.pc.x, z - g.pc.z) < g.landR) { g.st = 'land'; g.tm = 0; } } }
      else if (g.st === 'land') { g.ft += dt * Math.max(0.12, 1 - g.tm / g.T); if (g.tm > g.T + g.maxLag) { g.st = 'perch'; g.tm = 0; g.dur = R(g.rest[0], g.rest[1]); } }
      else if (g.st === 'perch') { const scared = g.shy && speed > 4.2 && Math.hypot(pp.x - g.pc.x, pp.z - g.pc.z) < 6; if ((g.tm > g.dur && g.hold <= 0) || scared) { g.st = 'off'; g.tm = 0; } } // mientras la observas no se va
      else { g.ft += dt * Math.min(1, 0.12 + g.tm / g.T); if (g.tm > g.T + g.maxLag) { g.st = 'fly'; g.tm = 0; g.dur = R(g.fly[0], g.fly[1]); } }
    }
    const sm = (a, b2, v) => { const q = Math.min(1, Math.max(0, (v - a) / (b2 - a))); return q * q * (3 - 2 * q); };
    for (const c of critters) { c.hd.rotation.y = Math.sin(t * 0.5 + c.o) * 0.55; c.hd.rotation.x = Math.sin(t * 0.33 + c.o * 2) * 0.15; c.g.scale.y = 2 * (1 + Math.sin(t * 2.2 + c.o) * 0.02); } // el monito mira alrededor y respira
    for (const b of birds) {
      const g = b.grp, p = b.perch, [fx, fy, fz, amp, fq] = b.f(g.ft, b); let k = 0; // k: 0 en vuelo … 1 posada
      if (p && g.st !== 'fly') { const u = sm(0, 1, (g.tm - b.lag) / g.T); k = g.st === 'perch' ? 1 : g.st === 'land' ? u : 1 - u; }
      const scare = g.shy && k === 0 && Math.hypot(pp.x - fx, pp.z - fz) < 9 && speed > 1; b.up += ((scare ? 7 : 0) - b.up) * Math.min(1, dt * (scare ? 2.5 : 0.25)); // los pajaritos suben cuando pasas debajo
      const sit = p ? p.r + BIRDS[b.type].k * 0.15 : 0, x = p ? fx + (p.x - fx) * k : fx, y = p ? fy + b.up * (1 - k) + (p.y + sit - fy) * k + Math.sin(Math.PI * k) * 1.2 : fy + b.up, z = p ? fz + (p.z - fz) * k : fz; // llega a la rama un poco desde arriba
      // rumbo y cabeceo según hacia dónde se mueve de verdad; al posarse queda atravesada en la rama, más erguida, y mira alrededor
      const o = b.g.position, mx = x - o.x, my = y - o.y, mz = z - o.z, hs = Math.hypot(mx, mz), F = sm(0.82, 1, k); let yaw = b.yaw, pitch = b.pitch;
      if (b.seen && dt > 0 && hs > dt * 0.3) { yaw = Math.atan2(mx, mz); pitch = Math.max(-0.7, Math.min(0.7, -Math.atan2(my, hs) * 0.7)); }
      if (p && F > 0) { let d = p.yaw + Math.sin(t * 0.37 + b.o) * 0.35 * F - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * F; pitch += (-0.42 - pitch) * F; }
      let dy = yaw - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw += dy * Math.min(1, dt * 7); b.pitch += (pitch - b.pitch) * Math.min(1, dt * 6); if (!b.seen) { b.yaw = yaw; b.seen = true; }
      o.set(x, y, z); b.g.rotation.y = b.yaw; b.g.rotation.x = b.pitch;
      // alas: baten más fuerte al frenar y al despegar, y se pliegan contra el cuerpo al quedar posada
      const brake = Math.sin(Math.PI * k) * (1 - F); b.ph += dt * fq * (1 + brake * 1.3);
      const fl = Math.sin(b.ph) * (amp + brake * 0.55) * (1 - F);
      b.wl.rotation.z = fl - F * 0.5; b.wr.rotation.z = -fl + F * 0.5; b.wlo.rotation.z = (fl * 0.7 + Math.cos(b.ph) * amp * 0.3) * (1 - F); b.wro.rotation.z = -b.wlo.rotation.z;
      b.wl.rotation.y = F * 1.3; b.wr.rotation.y = -F * 1.3; b.wlo.rotation.y = F * 0.9; b.wro.rotation.y = -F * 0.9;
      b.perched = k === 1;
    }
  }
  const api = { update, actors, quads, birds, critters, solids, markMats, shyR: 9 }; // shyR: a qué distancia huyen los animales tímidos
  return api;
}
