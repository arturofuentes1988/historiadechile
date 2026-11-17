// Vegetación realista por código. Cada especie tiene unos pocos árboles modelo (tronco, ramas y
// tarjetas de follaje con textura de hojas) que se repiten por el mapa con distinto tamaño y giro.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TEX, MAT, mulberry32, photo, withWind } from './gfx.js';
import { height } from './terrain.js';

const PI = Math.PI, UP = new THREE.Vector3(0, 1, 0);

export function makeFlora({ rng, scene, physics, RAPIER, fixed }) {
  const R = (a, b) => a + (b - a) * rng();

  // ---------- piezas ----------
  function cyl(parts, p0, p1, r0, r1, seg = 7) { // tronco o rama entre dos puntos
    const d = new THREE.Vector3().subVectors(p1, p0), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(r0 * 4)), uv.getY(i) * L * 0.3);
    g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(p0.x, p0.y, p0.z); parts.push(g);
  }
  function quad(parts, c, u, v, n) { // tarjeta: centro c, ejes u y v (largo completo), normal n para la luz
    const g = new THREE.BufferGeometry(), P = [];
    for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) P.push(c.x + u.x * a + v.x * b, c.y + u.y * a + v.y * b, c.z + u.z * a + v.z * b);
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); parts.push(g);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function cluster(parts, c, rr, n, size, r, sy = 1) { // racimo de tarjetas de hojas alrededor de un punto; sy < 1 lo aplasta en bandeja
    for (let i = 0; i < n; i++) {
      const o = V(r() * 2 - 1, r() * 1.7 - 0.7, r() * 2 - 1).normalize(), p = c.clone().addScaledVector(o, rr * (0.35 + r() * 0.7)); p.y = c.y + (p.y - c.y) * sy;
      const u = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), v = V(r() - 0.5, r() - 0.5, r() - 0.5).cross(u).normalize(), s = size * (0.75 + r() * 0.5);
      quad(parts, p, u.multiplyScalar(s), v.multiplyScalar(s), o.clone().lerp(UP, 0.25).normalize());
    }
  }

  // ---------- árboles modelo ----------
  function broadleafModel(seed, { H = 16, r0 = 0.42, limbs = 4, spread = 0.27, cone = false, cards = 20, size = 2.3, flat = 1, fork = [0.4, 0.52] }) {
    const r = mulberry32(seed), Q = (a, b) => a + (b - a) * r(), wood = [], leaves = [];
    const top = H * (cone ? 0.82 : Q(fork[0], fork[1])), bx = Q(-1, 1) * H * 0.035, bz = Q(-1, 1) * H * 0.035, mid = V(bx * 0.6, top * 0.5, bz * 0.6), tp = V(bx, top, bz);
    cyl(wood, V(0, -0.5, 0), V(0, 0.9, 0), r0 * 1.55, r0, 9); cyl(wood, V(0, 0.9, 0), mid, r0, r0 * 0.82, 9); cyl(wood, mid, tp, r0 * 0.82, r0 * (cone ? 0.25 : 0.62), 8);
    if (cone) {
      for (let i = 0; i < 8; i++) { const f = i / 7, a = Q(0, 6.28), rad = (1 - f) * H * spread + 0.4, b = V(bx * f, H * (0.28 + f * 0.7), bz * f), e = b.clone().add(V(Math.cos(a) * rad, 0.4, Math.sin(a) * rad)); cyl(wood, b.clone().setY(b.y - 0.3), e, r0 * 0.28, 0.04, 5); cluster(leaves, e, 1.5 * (1 - f * 0.45), cards * 0.8, size * 0.8, r); }
      cluster(leaves, V(bx, H, bz), 1.1, cards * 0.6, size * 0.7, r);
    } else {
      const off = Q(0, 6.28);
      for (let i = 0; i < limbs; i++) {
        const a = off + (i / limbs) * PI * 2 + Q(-0.4, 0.4), low = i % 2 === 1, out = H * spread * Q(0.6, 1), ey = H * (low ? Q(0.58, 0.74) : Q(0.8, 0.96)), lr = r0 * Q(0.36, 0.5);
        const e = V(bx + Math.cos(a) * out, ey, bz + Math.sin(a) * out), m = V(bx + Math.cos(a) * out * 0.55, top + (ey - top) * 0.45, bz + Math.sin(a) * out * 0.55);
        cyl(wood, tp.clone().setY(top - 0.2), m, lr, lr * 0.62, 6); cyl(wood, m, e, lr * 0.62, lr * 0.2, 5);
        const rr = Q(1.9, 2.8) * (H / 16) * (flat < 1 ? 1.3 : 1); cluster(leaves, e.clone().setY(e.y + rr * 0.25 * flat), rr, cards, size, r, flat);
        const a2 = a + Q(0.7, 1.3) * (r() < 0.5 ? 1 : -1), s = V(m.x + Math.cos(a2) * out * 0.5, m.y + H * Q(0.04, 0.14), m.z + Math.sin(a2) * out * 0.5);
        cyl(wood, m, s, lr * 0.4, lr * 0.12, 5); cluster(leaves, s.clone().setY(s.y + 0.3), rr * 0.75, cards * 0.7, size * 0.9, r, flat);
      }
      cluster(leaves, V(bx, H, bz), Q(1.8, 2.5) * (H / 16), cards, size, r, flat);
    }
    return { wood: mergeGeometries(wood), leaves: mergeGeometries(leaves), H };
  }
  function pewenModel(seed, young) {
    const r = mulberry32(seed), Q = (a, b) => a + (b - a) * r(), wood = [], leaves = [], H = young ? 6 : 18, r0 = young ? 0.16 : 0.42, sc = H / 18;
    cyl(wood, V(0, -0.5, 0), V(0, 1, 0), r0 * 1.4, r0, 10); cyl(wood, V(0, 1, 0), V(0, H * 0.97, 0), r0, r0 * 0.45, 10);
    const W = young ? 7 : 5, y0 = H * (young ? 0.2 : 0.76);
    for (let w = 0; w < W; w++) {
      const tt = w / (W - 1), yw = y0 + (H * 0.97 - y0) * tt, L = young ? 2.4 * (1 - tt * 0.85) : (6.8 - 5 * tt * tt), k = young ? 6 : 9 - w, off = Q(0, 6.28), S = 4;
      for (let b = 0; b < k; b++) {
        const a = off + (b / k) * PI * 2 + Q(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a); let prev = V(0, yw, 0);
        for (let j = 1; j <= S; j++) {
          const u = j / S, p = V(ca * L * u, yw + (-0.45 * Math.sin(u * PI) + 1.6 * u * u * u) * sc * (young ? 0.6 : 1 - tt * 0.5), sa * L * u), d = p.clone().sub(prev), len = d.length();
          cyl(wood, prev, p, (0.11 * (1 - u * 0.6) + 0.03) * (young ? 0.5 : 1), (0.09 * (1 - u * 0.6) + 0.02) * (young ? 0.5 : 1), 5);
          if (j > 1) { const c = prev.clone().add(p).multiplyScalar(0.5), side = V(-sa, 0, ca), upv = d.clone().cross(side).normalize(), wd = young ? 0.7 : 1.15; quad(leaves, c, d.clone().multiplyScalar(1.25), side.clone().multiplyScalar(wd), UP); quad(leaves, c, d.clone().multiplyScalar(1.25), upv.multiplyScalar(wd), V(ca, 0.5, sa).normalize()); }
          prev = p; void len;
        }
        const tip = prev; for (let q = 0; q < 2; q++) quad(leaves, tip, V(Q(-1, 1), 0.3, Q(-1, 1)).normalize().multiplyScalar(young ? 0.9 : 1.5), V(Q(-0.3, 0.3), 1, Q(-0.3, 0.3)).normalize().multiplyScalar(young ? 0.6 : 1.0), UP);
      }
    }
    for (let q = 0; q < 6; q++) quad(leaves, V(0, H, 0), V(Math.cos(q), 0.2, Math.sin(q)).multiplyScalar(young ? 1.2 : 2.4), V(0, 1, 0).multiplyScalar(young ? 0.8 : 1.3), UP);
    return { wood: mergeGeometries(wood), leaves: mergeGeometries(leaves), H };
  }

  // El tamaño de cada tarjeta de follaje se ajustó a la hoja real de la especie: las de coigüe son chicas,
  // las de roble medianas y las de canelo grandes. Todas van algo agrandadas para que se distingan.
  // Cada especie con su porte real: altura del modelo (H), grosor del tronco (r0), a qué altura se abre (fork) y forma de la copa
  // cortezas y hojas fotográficas de cada especie
  const bark = (n, tint = 0xffffff) => { const m = MAT.bark(tint, photo(n)); m.bumpScale = 3; return m; }, leaf = (n, tint) => MAT.leaf(photo(n, { cut: true }), tint);
  const barkPewen = bark('corteza-pewen'), bCoigue = bark('corteza-coigue'), bRoble = bark('corteza-roble'), bCanelo = bark('corteza-canelo'), bPeumo = bark('corteza-peumo'), bQuillay = bark('corteza-quillay');
  const SPEC = {
    coigue: { n: 3, make: (i) => broadleafModel(11 + i, { H: 22, r0: 0.6, cards: 62, size: 1.75, flat: 0.42, spread: 0.3 }), leaf: leaf('hoja-coigue'), bark: bCoigue },          // alto, de copa en pisos horizontales
    roble: { n: 3, make: (i) => broadleafModel(31 + i, { H: 20, r0: 0.5, cards: 32, size: 1.95, fork: [0.45, 0.6] }), leaf: leaf('hoja-roble'), bark: bRoble },                    // tronco recto y oscuro, copa abierta
    canelo: { n: 2, make: (i) => broadleafModel(51 + i, { H: 9, r0: 0.2, cone: true, spread: 0.2, cards: 38, size: 1.25 }), leaf: leaf('hoja-canelo'), bark: bCanelo },            // delgado, cónico, de corteza clara
    giant: { n: 2, make: (i) => broadleafModel(71 + i, { H: 32, r0: 1.3, limbs: 6, spread: 0.3, cards: 76, size: 2.3, flat: 0.5 }), leaf: leaf('hoja-coigue', 0xd0e0c8), bark: bark('corteza-coigue', 0xe8ecd8) },
    pewen: { n: 3, make: (i) => pewenModel(91 + i, false), leaf: leaf('rama-pewen'), bark: barkPewen },                                                                             // corteza gruesa en placas
    pewenYoung: { n: 2, make: (i) => pewenModel(111 + i, true), leaf: leaf('rama-pewen'), bark: barkPewen },
    // bosque esclerófilo: árboles más bajos, de hoja dura y siempre verde, en las laderas soleadas
    peumo: { n: 2, make: (i) => broadleafModel(151 + i, { H: 12, r0: 0.34, limbs: 5, spread: 0.36, cards: 48, size: 1.6, fork: [0.24, 0.34] }), leaf: leaf('hoja-peumo'), bark: bPeumo },   // copa redonda y densa
    boldo: { n: 2, make: (i) => broadleafModel(171 + i, { H: 8, r0: 0.26, limbs: 5, spread: 0.42, cards: 54, size: 1.15, fork: [0.16, 0.26] }), leaf: leaf('hoja-boldo'), bark: bPeumo },    // bajo, ramificado desde abajo
    quillay: { n: 2, make: (i) => broadleafModel(191 + i, { H: 13, r0: 0.36, limbs: 4, spread: 0.3, cards: 38, size: 1.25, fork: [0.36, 0.5] }), leaf: leaf('hoja-quillay'), bark: bQuillay },  // copa rala e irregular, corteza gris agrietada
    litre: { n: 2, make: (i) => broadleafModel(211 + i, { H: 6, r0: 0.2, limbs: 5, spread: 0.5, cards: 36, size: 1.1, fork: [0.2, 0.3] }), leaf: leaf('hoja-litre'), bark: bQuillay },         // pequeño y ancho, casi un arbusto
    bush: { n: 2, make: (i) => { const r = mulberry32(131 + i), w = [], l = []; for (let k = 0; k < 4; k++) cyl(w, V(0, 0, 0), V(r() - 0.5, 0.9, r() - 0.5), 0.05, 0.02, 4); cluster(l, V(0, 1, 0), 1.0, 34, 1.1, r); return { wood: mergeGeometries(w), leaves: mergeGeometries(l), H: 1 }; }, leaf: leaf('hoja-maqui'), bark: MAT.bark(0xa08a74) },
  };
  for (const k in SPEC) { SPEC[k].models = Array.from({ length: SPEC[k].n }, (_, i) => SPEC[k].make(i)); SPEC[k].inst = SPEC[k].models.map(() => []); SPEC[k].far = SPEC[k].models.map(() => []); }

  function tree(kind, x, y, z, H, tint, solid = true) {
    const sp = SPEC[kind], v = (rng() * sp.n) | 0, s = H / sp.models[v].H;
    const rec = { x, y, z, s, yaw: R(0, 6.28), tint: tint ?? 0.82 + rng() * 0.3, kind, tree: true, rad: kind === 'bush' ? s : Math.max(1.2, sp.models[v].H * s * 0.24) };
    (solid ? sp.inst : sp.far)[v].push(rec);
    const r = kind === 'bush' ? 0 : ({ giant: 1.3, pewen: 0.48, pewenYoung: 0.16, coigue: 0.6, roble: 0.5, canelo: 0.2, peumo: 0.34, boldo: 0.26, quillay: 0.36, litre: 0.2 }[kind]) * s;
    if (solid && r > 0.08) physics.createCollider(RAPIER.ColliderDesc.cylinder(H * 0.3, r).setTranslation(x, y + H * 0.3 - 0.5, z), fixed);
    if (solid && kind === 'bush') physics.createCollider(RAPIER.ColliderDesc.cylinder(0.55 * s, 0.42 * s).setTranslation(x, y + 0.55 * s, z), fixed); // los arbustos ya no se atraviesan
    return rec;
  }

  // ---------- pasto, helechos, juncos y flores: por trozos de mapa, los lejanos no se dibujan ----------
  const CS = 40, cross = (w, h, n = 3) => { const parts = []; for (let i = 0; i < n; i++) { const a = (i / n) * PI; quad(parts, V(0, h / 2, 0), V(Math.cos(a) * w, 0, Math.sin(a) * w), V(0, h, 0), UP); } return mergeGeometries(parts); };
  const fernGeo = (() => { const parts = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2, d = V(Math.cos(a), 0.75, Math.sin(a)).normalize(); quad(parts, d.clone().multiplyScalar(0.55), V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.42), d.clone().multiplyScalar(1.1), UP); } return mergeGeometries(parts); })();
  // ---------- plantas modeladas en 3D, livianas: tallos, hojas, flores y frutos con volumen ----------
  const plantMat = withWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: THREE.DoubleSide }), 0.05, true);
  const put = (parts, geo, m, color) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.deleteAttribute('uv'); if (ROUND.has(geo)) { const P0 = g.attributes.position, N0 = new Float32Array(P0.count * 3), t = V(); for (let i = 0; i < P0.count; i++) { t.fromBufferAttribute(P0, i); if (geo === bellG || geo === bellF) t.y = 0.25; t.normalize(); N0[i * 3] = t.x; N0[i * 3 + 1] = t.y; N0[i * 3 + 2] = t.z; } g.setAttribute('normal', new THREE.BufferAttribute(N0, 3)); if (m) g.applyMatrix4(m); } else { if (m) g.applyMatrix4(m); g.computeVertexNormals(); } // frutos y flores redondeados, sin caras marcadas
    const n = g.attributes.position.count, c = new THREE.Color(color), C = new Float32Array(n * 3); for (let i = 0; i < n; i++) { C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(C, 3)); parts.push(g); };
  const TM4 = (pos, dir, sx, sy = sx, sz = sx) => new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()), V(sx, sy, sz));
  const stemG = new THREE.CylinderGeometry(0.6, 1, 1, 4, 1, true).translate(0, 0.5, 0), berryG = new THREE.OctahedronGeometry(1, 1), bellG = new THREE.CylinderGeometry(0.35, 1, 1, 6, 1, true).translate(0, -0.5, 0);
  // Las mismas piezas con pocas caras, para la versión que se dibuja de lejos (ver «de lejos» en build y update): a esa
  // distancia una baya mide un par de puntos de pantalla, y casi todos los triángulos de estas matas eran sus bayas y flores.
  const stemF = new THREE.CylinderGeometry(0.6, 1, 1, 3, 1, true).translate(0, 0.5, 0), berryF = new THREE.OctahedronGeometry(1, 0), bellF = new THREE.CylinderGeometry(0.35, 1, 1, 3, 1, true).translate(0, -0.5, 0), ROUND = new Set([berryG, bellG, berryF, bellF]);
  const leafG = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.5, 0.45, 0.12, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0.5, 0.45, 0.12], 3)); return g; })(); // hoja plegada por el nervio
  const finish = (parts, H) => { const g = mergeGeometries(parts), P = g.attributes.position, U = new Float32Array(P.count * 2); for (let i = 0; i < P.count; i++) U[i * 2 + 1] = Math.pow(Math.min(1, Math.max(0, P.getY(i) / H)), 1.4); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return g; }; // la base queda firme y las puntas se mecen
  const pr = mulberry32(77), Q = (a, b) => a + (b - a) * pr();
  // un tallo arqueado con hojas a los lados; devuelve los puntos para colgarle flores o frutos
  // far: si se pasa, ahí se arma a la vez la misma rama con piezas de pocas caras (misma forma, para que el cambio no se note)
  const spray = (parts, a, L, lean, { r = 0.012, seg = 4, leaves = 6, leaf = 0.07, lw = 0.6, cols = [0x3f6a2c], stem = 0x5a4630, far = null } = {}) => {
    const ca = Math.cos(a), sa = Math.sin(a), pt = (u) => V(ca * lean * L * u * u, L * u * (1 - 0.25 * lean * u), sa * lean * L * u * u), pts = [];
    for (let i = 0; i < seg; i++) { const p0 = pt(i / seg), p1 = pt((i + 1) / seg), d = p1.clone().sub(p0), m = TM4(p0, d, r * (1 - i / seg * 0.6), d.length(), r * (1 - i / seg * 0.6)); put(parts, stemG, m, stem); if (far) put(far, stemF, m, stem); }
    for (let i = 0; i < leaves; i++) { const u = 0.25 + (i / leaves) * 0.75, p0 = pt(u), side = i % 2 ? 1 : -1, d = V(-sa * side + ca * 0.5, 0.45 + Q(-0.2, 0.3), ca * side + sa * 0.5); const m = TM4(p0, d, leaf * lw, leaf * Q(0.8, 1.2), leaf * lw); put(parts, leafG, m, cols[i % cols.length]); if (far) put(far, leafG, m, cols[i % cols.length]); pts.push(p0); }
    return pts;
  };
  const MODELS = {
    // murtilla (Ugni molinae): mata baja de hojitas brillantes y frutos rojos
    // (murtilla, michay y chilco devuelven dos modelos de la misma mata: geo, con todo su detalle, y far, para verla de lejos)
    murtilla: () => { const p = [], f = []; for (let k = 0; k < 13; k++) { const pts = spray(p, k * 0.5 + Q(-0.2, 0.2), Q(0.3, 0.6), Q(0.3, 0.9), { r: 0.014, leaves: 12, leaf: 0.1, lw: 0.75, cols: [0x4a7a34, 0x5a8c3a, 0x6a5a30], stem: 0x7a5a3a, far: f }); for (let j = 1; j < pts.length; j += 3) { const m = new THREE.Matrix4().compose(pts[j].clone().add(V(Q(-0.02, 0.02), -0.02, Q(-0.02, 0.02))), new THREE.Quaternion(), V(0.026, 0.026, 0.026)); put(p, berryG, m, 0xc02830); put(f, berryF, m, 0xc02830); } } return { geo: finish(p, 0.55), far: finish(f, 0.55) }; },
    // michay (Berberis darwinii): arbusto espinoso, hojas chicas oscuras y racimos de flores anaranjadas
    michay: () => { const p = [], fr = []; for (let k = 0; k < 8; k++) { const pts = spray(p, k * 0.8 + Q(-0.2, 0.2), Q(0.8, 1.3), Q(0.25, 0.7), { r: 0.026, seg: 5, leaves: 18, leaf: 0.12, lw: 0.7, cols: [0x2e5426, 0x3a622c], stem: 0x6a5238, far: fr }); for (let j = 2; j < pts.length; j += 3) { for (let f = 0; f < 3; f++) put(p, berryG, new THREE.Matrix4().compose(pts[j].clone().add(V(Q(-0.03, 0.03), -0.03 - f * 0.022, Q(-0.03, 0.03))), new THREE.Quaternion(), V(0.026, 0.03, 0.026)), f % 2 ? 0xf0901c : 0xe8b020);
      put(fr, berryF, new THREE.Matrix4().compose(pts[j].clone().add(V(0, -0.052, 0)), new THREE.Quaternion(), V(0.042, 0.056, 0.042)), 0xeca61e); } } return { geo: finish(p, 1.3), far: finish(fr, 1.3) }; }, // de lejos, cada racimo de tres flores es un solo bulto del mismo color
    // chilco (Fuchsia magellanica): ramas arqueadas con flores colgantes, rojas por fuera y moradas por dentro
    chilco: () => { const p = [], f = []; for (let k = 0; k < 7; k++) { const pts = spray(p, k * 0.9 + Q(-0.2, 0.2), Q(1.0, 1.6), Q(0.5, 1.0), { r: 0.022, seg: 5, leaves: 18, leaf: 0.17, lw: 0.55, cols: [0x4a7e38, 0x5a9040], stem: 0x8a4a3a, far: f }); for (let j = 3; j < pts.length; j += 2) { const q0 = pts[j].clone().add(V(Q(-0.03, 0.03), -0.03, Q(-0.03, 0.03))), m1 = new THREE.Matrix4().compose(q0, new THREE.Quaternion(), V(0.03, 0.07, 0.03)), m2 = new THREE.Matrix4().compose(q0.clone().add(V(0, -0.04, 0)), new THREE.Quaternion(), V(0.02, 0.05, 0.02));
      put(p, stemG, TM4(q0.clone().add(V(0, 0.03, 0)), V(0, -1, 0), 0.003, 0.04), 0x8a2a3a); put(p, bellG, m1, 0xd8203c); put(p, bellG, m2, 0x6a30a0); put(f, bellF, m1, 0xd8203c); put(f, bellF, m2, 0x6a30a0); } } return { geo: finish(p, 1.5), far: finish(f, 1.5) }; },
    // nalca (Gunnera tinctoria): hojas enormes, redondas y lobuladas, sobre tallos gruesos y rojizos
    nalca: () => { const p = []; for (let k = 0; k < 6; k++) { const a = k * 1.05 + Q(-0.2, 0.2), L = Q(0.7, 1.25), lean = Q(0.35, 0.8), top = V(Math.cos(a) * lean * L, L * 0.85, Math.sin(a) * lean * L); put(p, new THREE.CylinderGeometry(0.5, 1, 1, 5, 1, true).translate(0, 0.5, 0), TM4(V(0, 0, 0), top, 0.04, top.length(), 0.04), 0x7a4a3a);
      const R0 = Q(0.45, 0.7), g = new THREE.CircleGeometry(1, 14), P = g.attributes.position; for (let i = 1; i < P.count; i++) { const an = Math.atan2(P.getY(i), P.getX(i)), rr = 1 + 0.16 * Math.cos(an * 7) + 0.06 * Math.cos(an * 13); P.setXYZ(i, P.getX(i) * rr, P.getY(i) * rr, 0.22); } P.setXYZ(0, 0, 0, 0); // el centro hundido: la hoja hace de embudo
      g.rotateX(-PI / 2); put(p, g, TM4(top, V(Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45), R0), k % 2 ? 0x4c7a34 : 0x3f6a2e); } return finish(p, 1.4); },
    // copihue (Lapageria rosea): enredadera de hojas duras con flores rojas en campana
    copihue: () => { const p = [], pt = (u) => V(Math.sin(u * 9) * 0.07, u * 1.9, Math.cos(u * 7) * 0.07); for (let i = 0; i < 10; i++) { const p0 = pt(i / 10), p1 = pt((i + 1) / 10), d = p1.clone().sub(p0); put(p, stemG, TM4(p0, d, 0.008, d.length(), 0.008), 0x4a4a2a); const sd = i % 2 ? 1 : -1; put(p, leafG, TM4(p0, V(sd * 0.8, 0.25, Q(-0.5, 0.5)), 0.07, 0.15, 0.07), 0x24482a);
        if (i % 2 && i > 1) { const q0 = p0.clone().add(V(-sd * 0.06, -0.01, Q(-0.03, 0.03))); put(p, bellG, new THREE.Matrix4().compose(q0, new THREE.Quaternion(), V(0.038, 0.11, 0.038)), 0xc8203a); put(p, bellG, new THREE.Matrix4().compose(q0.clone().add(V(0, -0.012, 0)), new THREE.Quaternion(), V(0.03, 0.1, 0.03)), 0xe86a78); } } return finish(p, 2.6); },
    // flores del claro: tallos finos con una corola de pétalos y el centro amarillo
    flower: () => { const p = []; for (let k = 0; k < 6; k++) { const a = k * 1.1, L = Q(0.25, 0.48), top = V(Math.cos(a) * Q(0.05, 0.22), L, Math.sin(a) * Q(0.05, 0.22)); put(p, stemG, TM4(V(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03), top, 0.005, top.length(), 0.005), 0x5a8a3a); put(p, leafG, TM4(V(Math.cos(a) * 0.03, 0.02, Math.sin(a) * 0.03), V(Math.cos(a + 1), 0.7, Math.sin(a + 1)), 0.03, 0.14, 0.03), 0x4a7a32);
      for (let j = 0; j < 7; j++) { const b = (j / 7) * 6.283; put(p, leafG, TM4(top, V(Math.cos(b), 0.35, Math.sin(b)), 0.022, 0.05, 0.022), 0xffffff); } put(p, berryG, new THREE.Matrix4().compose(top.clone().add(V(0, 0.006, 0)), new THREE.Quaternion(), V(0.014, 0.008, 0.014)), 0xf0c020); } return finish(p, 0.5); },
  };
  // helecho: frondas arqueadas de verdad, cada una doblada en tramos, con la foto de la fronda encima
  const fern3D = (() => { const g = new THREE.BufferGeometry(), P = [], U = [], N = [], I = []; let n = 0;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2 + (k % 2) * 0.2, ca = Math.cos(a), sa = Math.sin(a), L = 1.05 + (k % 3) * 0.12, SEG = 5;
      for (let i = 0; i <= SEG; i++) { const u = i / SEG, out = L * (0.12 + 0.88 * u), y = Math.sin(u * 2.3) * 0.62 * L - u * u * 0.18, w = 0.24 * Math.sin(Math.min(1, u * 1.15 + 0.12) * PI) + 0.02; P.push(ca * out - sa * w, y, sa * out + ca * w, ca * out + sa * w, y, sa * out - ca * w); U.push(0, u, 1, u); N.push(ca * 0.3, 1, sa * 0.3, ca * 0.3, 1, sa * 0.3); if (i < SEG) { const b = n + i * 2; I.push(b, b + 1, b + 3, b, b + 3, b + 2); } }
      n += (SEG + 1) * 2; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); return g; })();
  const SCATTER = {
    murtilla: { ...MODELS.murtilla(), mat: plantMat, range: 60, cells: new Map() }, michay: { ...MODELS.michay(), mat: plantMat, range: 75, cells: new Map() },
    chilco: { ...MODELS.chilco(), mat: plantMat, range: 75, cells: new Map() }, nalca: { geo: MODELS.nalca(), mat: plantMat, range: 85, cells: new Map() },
    grass: { geo: cross(1.0, 0.62), mat: MAT.grass(photo('pasto', { cut: true })), range: 75, cells: new Map() },
    grass2: { geo: cross(0.8, 1.05), mat: MAT.grass(photo('pasto-espiga', { cut: true })), range: 80, cells: new Map() },
    reed: { geo: cross(0.9, 1.7), mat: MAT.grass(photo('junco', { cut: true })), range: 110, cells: new Map() },
    fern: { geo: fern3D, mat: MAT.grass(photo('helecho', { cut: true })), range: 95, cells: new Map() },
    flower: { geo: MODELS.flower(), mat: plantMat, range: 55, cells: new Map() },
    quila: { geo: (() => { const p = []; for (let k = 0; k < 11; k++) { const a = (k / 11) * PI * 2 + (k % 3) * 0.3, L = 3 + (k % 4) * 0.5, ca = Math.cos(a), sa = Math.sin(a), pt = (u) => V(ca * u * L * 0.55, Math.sin(u * 1.7) * L * 0.72, sa * u * L * 0.55); for (let j = 0; j < 3; j++) { const a0 = pt(j / 3), a1 = pt((j + 1) / 3); quad(p, a0.clone().add(a1).multiplyScalar(0.5), V(-sa, 0, ca).multiplyScalar(0.9), a1.clone().sub(a0).multiplyScalar(1.08), UP); } } return mergeGeometries(p); })(), mat: MAT.grass(photo('quila', { cut: true })), range: 120, cells: new Map() },
    copihue: { geo: MODELS.copihue(), mat: plantMat, range: 70, cells: new Map() },
    litter: { geo: (() => { const p = []; quad(p, V(0, 0.04, 0), V(1.5, 0, 0), V(0, 0, 1.5), UP); return mergeGeometries(p); })(), mat: new THREE.MeshStandardMaterial({ map: photo('hoja-roble', { cut: true }), alphaTest: 0.3, roughness: 1 }), range: 60, cells: new Map() }, // hojarasca
  };
  function scatter(kind, x, y, z, s = 1, color = 0xffffff) {
    const sc = SCATTER[kind], k = Math.floor(x / CS) + ',' + Math.floor(z / CS);
    (sc.cells.get(k) || sc.cells.set(k, []).get(k)).push({ x, y, z, s, color });
    if (kind === 'michay' || kind === 'chilco') physics.createCollider(RAPIER.ColliderDesc.cylinder(0.45 * s, 0.28 * s).setTranslation(x, y + 0.45 * s, z), fixed);
    if (kind === 'quila') physics.createCollider(RAPIER.ColliderDesc.cylinder(1.1 * s, 0.75 * s).setTranslation(x, y + 1.1 * s, z), fixed); // una mata de quila es una maraña cerrada
  }

  // ---------- rocas y troncos caídos ----------
  // Tres formas de roca, cada una en dos versiones de la misma forma: 320 caras para las rocas y las piedras, y 80 para las
  // piedritas más chicas (menos de un palmo). Son miles: con el modelo detallado y su sombra pesaban tanto como todas las rocas juntas.
  // (Se probó aligerar también las piedras del porte de un puño, pero de cerca se les notaban los cantos: quedaron como estaban.)
  const rockGeo = (i, detail) => { const g = new THREE.IcosahedronGeometry(1, detail), P = g.attributes.position, sd = i * 37.7; for (let k = 0; k < P.count; k++) { const x = P.getX(k), y = P.getY(k), z = P.getZ(k), d = 1 + 0.26 * Math.sin(x * 3.1 + sd) * Math.sin(y * 2.7 + sd * 1.3) + 0.13 * Math.sin(z * 5.3 + sd * 0.7) + 0.05 * Math.sin(x * 11 + y * 9 + sd); P.setXYZ(k, x * d, y * d, z * d); } const m = BufferGeometryUtilsMerge(g); m.computeVertexNormals(); return m; };
  const rockGeos = [0, 1, 2].map((i) => rockGeo(i, 3)), rockLod = [rockGeos, [0, 1, 2].map((i) => rockGeo(i, 1))]; // rockLod[nivel][forma]: 0 con todo el detalle, 1 liviana
  function BufferGeometryUtilsMerge(g) { // suaviza las normales compartiendo vértices
    const P = g.attributes.position, map = new Map(), pos = [], uv = [], idx = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = x.toFixed(4) + y.toFixed(4) + z.toFixed(4); let j = map.get(k); if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(x, y, z); uv.push(Math.atan2(z, x) / PI * 1.5, y * 1.2); } idx.push(j); }
    const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); o.setIndex(idx); return o;
  }
  const rocks = [[], [], []], logs = [];
  function rock(x, y, z, s, { squash = 0.7, color = 0xb4b4b0 } = {}) {
    const v = (rng() * 3) | 0, m = new THREE.Matrix4().compose(V(x, y + s * squash * 0.3, z), new THREE.Quaternion().setFromAxisAngle(UP, R(0, 6.28)), V(s, s * squash, s * R(0.75, 1.15)));
    rocks[v].push({ m, color, lod: s < 0.1 ? 1 : 0 }); // s es el radio: bajo 10 cm es una piedrita
    if (s > 0.28) { const P = rockGeos[v].attributes.position, pts = new Float32Array(P.count * 3), t = V(); for (let i = 0; i < P.count; i++) { t.fromBufferAttribute(P, i).applyMatrix4(m); pts[i * 3] = t.x; pts[i * 3 + 1] = t.y; pts[i * 3 + 2] = t.z; } physics.createCollider(RAPIER.ColliderDesc.convexHull(pts) || RAPIER.ColliderDesc.ball(s), fixed); }
  }
  function log(x, y, z, len, r, yaw) {
    logs.push(new THREE.Matrix4().compose(V(x, y + r * 0.7, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, PI / 2)), V(r, len, r)));
    physics.createCollider(RAPIER.ColliderDesc.cuboid(len / 2, r * 0.8, r * 0.8).setTranslation(x, y + r * 0.6, z).setRotation(new THREE.Quaternion().setFromAxisAngle(UP, yaw)), fixed);
    for (let i = 0; i < 3; i++) scatter('fern', x + R(-1, 1) * len * 0.4, height(x, z), z + R(-1, 1), R(0.6, 0.9));
  }

  // ---------- arma las mallas repetidas ----------
  const chunks = [];
  function build() {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let tris = 0;
    for (const k in SPEC) for (const far of [false, true]) SPEC[k].models.forEach((mdl, v) => { // los árboles de fuera del mapa no proyectan sombra
      const list = (far ? SPEC[k].far : SPEC[k].inst)[v]; if (!list.length) return;
      const wood = new THREE.InstancedMesh(mdl.wood, SPEC[k].bark, list.length), leaf = new THREE.InstancedMesh(mdl.leaves, SPEC[k].leaf, list.length);
      list.forEach((t, i) => { M.compose(V(t.x, t.y, t.z), q.setFromAxisAngle(UP, t.yaw), V(t.s, t.s, t.s)); wood.setMatrixAt(i, M); leaf.setMatrixAt(i, M); leaf.setColorAt(i, c.setScalar(t.tint)); t.meshes = [wood, leaf]; t.i = i; });
      for (const m of [wood, leaf]) { m.castShadow = !far; m.receiveShadow = m === wood && !far; m.frustumCulled = false; scene.add(m); } // la copa no se sombrea a sí misma: se vería negra
      tris += (mdl.wood.index.count + mdl.leaves.index.count) / 3 * list.length;
    });
    for (const k in SCATTER) for (const [key, list] of SCATTER[k].cells) {
      // Las matas que tienen modelo «de lejos» llevan dos mallas con las mismas plantas en los mismos lugares; update muestra una u otra.
      const sc = SCATTER[k], m = new THREE.InstancedMesh(sc.geo, sc.mat, list.length), far = sc.far ? new THREE.InstancedMesh(sc.far, sc.mat, list.length) : null, both = far ? [m, far] : [m], [ci, cj] = key.split(',').map(Number);
      list.forEach((t, i) => { t.yaw = rng() * 6.28; t.sy = 0.8 + rng() * 0.5; t.meshes = both; t.i = i; M.compose(V(t.x, t.y - 0.03, t.z), q.setFromAxisAngle(UP, t.yaw), V(t.s, t.s * t.sy, t.s)); c.set(t.color).multiplyScalar(0.62 + rng() * 0.34); for (const o of both) { o.setMatrixAt(i, M); o.setColorAt(i, c); } });
      for (const o of both) { o.receiveShadow = true; o.frustumCulled = false; scene.add(o); } if (far) far.visible = false;
      chunks.push({ m, far, cx: (ci + 0.5) * CS, cz: (cj + 0.5) * CS, range: sc.range });
    }
    const rm = MAT.rock();
    rocks.forEach((list, v) => { // una malla por nivel de detalle; las piedritas (nivel 1) no proyectan sombra: medía un par de puntos
      const n = [0, 0]; for (const t of list) n[t.lod]++;
      const ms = n.map((k, lod) => (k ? new THREE.InstancedMesh(rockLod[lod][v], rm, k) : null)), at = [0, 0];
      for (const t of list) { const m = ms[t.lod], i = at[t.lod]++; m.setMatrixAt(i, t.m); m.setColorAt(i, c.set(t.color).multiplyScalar(0.85 + rng() * 0.3)); }
      ms.forEach((m, lod) => { if (!m) return; m.castShadow = lod === 0; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
    });
    if (logs.length) { const g = new THREE.CylinderGeometry(1, 0.85, 1, 10), m = new THREE.InstancedMesh(g, MAT.bark(0xa89a78), logs.length); logs.forEach((mm, i) => m.setMatrixAt(i, mm)); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
    return tris;
  }
  // Cada trozo de mapa se dibuja solo si está a la vista. Los que tienen modelo «de lejos» usan el detallado cuando la cámara
  // está a menos de CERCA metros de su centro (así toda mata a menos de unos 17 m va siempre con todo su detalle) y el liviano más allá.
  const CERCA = 45;
  function update(p) { for (const c of chunks) { const d = Math.hypot(p.x - c.cx, p.z - c.cz), on = d < c.range + 30; if (c.far) { c.m.visible = on && d < CERCA; c.far.visible = on && d >= CERCA; } else c.m.visible = on; } }

  // ---------- despejar la vista: al observar algo, lo que tapa el encuadre se oculta un momento ----------
  const hidden = [], ZERO = new THREE.Matrix4().makeScale(0, 0, 0), TM = new THREE.Matrix4(), TQ = new THREE.Quaternion();
  const segDist = (px, pz, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.min(1, Math.max(0, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz || 1))); return [Math.hypot(px - a.x - dx * t, pz - a.z - dz * t), t]; };
  // cuántos árboles estorban entre la cámara (a) y el objeto (b)
  function blockers(a, b, except) {
    const out = [];
    for (const k in SPEC) for (const l of SPEC[k].inst) for (const t of l) { if (t === except) continue; const [d, u] = segDist(t.x, t.z, a, b); if (d < t.rad && (u < 0.92 || d < t.rad * 0.5)) out.push(t); }
    return out;
  }
  function clearView(a, b, except, plants = true) {
    const list = blockers(a, b, except);
    if (plants) for (const k in SCATTER) { const i0 = Math.floor(Math.min(a.x, b.x) / CS) - 1, i1 = Math.floor(Math.max(a.x, b.x) / CS) + 1, j0 = Math.floor(Math.min(a.z, b.z) / CS) - 1, j1 = Math.floor(Math.max(a.z, b.z) / CS) + 1;
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = SCATTER[k].cells.get(i + ',' + j); if (l) for (const t of l) if (t !== except && k !== 'litter' && segDist(t.x, t.z, a, b)[0] < 0.75) list.push(t); } }
    for (const t of list) { for (const m of t.meshes) { m.setMatrixAt(t.i, ZERO); m.instanceMatrix.needsUpdate = true; } hidden.push(t); }
  }
  function restoreView() {
    for (const t of hidden) { if (t.tree) TM.compose(V(t.x, t.y, t.z), TQ.setFromAxisAngle(UP, t.yaw), V(t.s, t.s, t.s)); else TM.compose(V(t.x, t.y - 0.03, t.z), TQ.setFromAxisAngle(UP, t.yaw), V(t.s, t.s * t.sy, t.s)); for (const m of t.meshes) { m.setMatrixAt(t.i, TM); m.instanceMatrix.needsUpdate = true; } }
    hidden.length = 0;
  }

  // búsquedas para la exploración: ¿hay una planta de este tipo cerca?
  function nearScatter(kind, x, z, r) {
    const ci = Math.floor(x / CS), cj = Math.floor(z / CS); let best = null;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = SCATTER[kind].cells.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) { const d = Math.hypot(t.x - x, t.z - z); if (d < r && (!best || d < best.d)) best = { x: t.x, y: t.y, z: t.z, d, s: t.s, rec: t }; } }
    return best;
  }
  // la planta de este tipo más cercana en todo el mapa (para poder marcar dónde ir a buscarla)
  function findScatter(kind, x, z) { let best = null, bd = Infinity; for (const l of SCATTER[kind].cells.values()) for (const t of l) { if (t.picked) continue; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = t; } } return best && { x: best.x, z: best.z }; }
  // Un arbusto puesto a mano. No usa el azar del mundo, para no mover de lugar todo lo que se reparte después.
  function bushAt(x, y, z, s, yaw = 0, v = 0) { const rec = { x, y, z, s, yaw, tint: 0.96, kind: 'bush', tree: true, rad: s }; SPEC.bush.inst[v % SPEC.bush.n].push(rec); physics.createCollider(RAPIER.ColliderDesc.cylinder(0.55 * s, 0.42 * s).setTranslation(x, y + 0.55 * s, z), fixed); return rec; }
  function bushesIn(x, z, r) { const out = []; for (const l of SPEC.bush.inst) for (const t of l) if (Math.hypot(t.x - x, t.z - z) < r) out.push(t); return out; } // todos los arbustos a menos de r
  function nearBush(x, z, r) { let best = null; for (const l of SPEC.bush.inst) for (const t of l) { const d = Math.hypot(t.x - x, t.z - z); if (d < r && (!best || d < best.d)) best = { x: t.x, y: t.y, z: t.z, d, s: t.s, rec: t }; } return best; }

  return { tree, scatter, rock, log, build, update, nearScatter, findScatter, nearBush, bushAt, bushesIn, blockers, clearView, restoreView };
}
