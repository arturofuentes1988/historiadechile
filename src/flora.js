// Vegetación realista por código. Cada especie tiene unos pocos árboles modelo (tronco, ramas y
// tarjetas de follaje con textura de hojas) que se repiten por el mapa con distinto tamaño y giro.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TEX, MAT, mulberry32 } from './gfx.js';
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

  // Cada especie con su porte real: altura del modelo (H), grosor del tronco (r0), a qué altura se abre (fork) y forma de la copa
  const SPEC = {
    coigue: { n: 3, make: (i) => broadleafModel(11 + i, { H: 22, r0: 0.6, cards: 34, size: 2.6, flat: 0.42, spread: 0.3 }), leaf: MAT.leaf(TEX.coigue), bark: MAT.bark(0xffffff, TEX.barkCoigue) },          // alto, de copa en pisos horizontales
    roble: { n: 3, make: (i) => broadleafModel(31 + i, { H: 20, r0: 0.5, cards: 22, size: 2.5, fork: [0.45, 0.6] }), leaf: MAT.leaf(TEX.roble), bark: MAT.bark(0xffffff, TEX.barkRoble) },                    // tronco recto y oscuro, copa abierta
    canelo: { n: 2, make: (i) => broadleafModel(51 + i, { H: 9, r0: 0.2, cone: true, spread: 0.2, cards: 24, size: 1.7 }), leaf: MAT.leaf(TEX.canelo), bark: MAT.bark(0xffffff, TEX.barkCanelo) },            // delgado, cónico, de corteza clara
    giant: { n: 2, make: (i) => broadleafModel(71 + i, { H: 32, r0: 1.3, limbs: 6, spread: 0.3, cards: 44, size: 3.2, flat: 0.5 }), leaf: MAT.leaf(TEX.coigue, 0xd0e0c8), bark: MAT.bark(0xe8ecd8, TEX.barkCoigue) },
    pewen: { n: 3, make: (i) => pewenModel(91 + i, false), leaf: MAT.leaf(TEX.pewen), bark: MAT.bark(0xffffff, TEX.barkPewen) },                                                                             // corteza gruesa en placas
    pewenYoung: { n: 2, make: (i) => pewenModel(111 + i, true), leaf: MAT.leaf(TEX.pewen), bark: MAT.bark(0xffffff, TEX.barkPewen) },
    // bosque esclerófilo: árboles más bajos, de hoja dura y siempre verde, en las laderas soleadas
    peumo: { n: 2, make: (i) => broadleafModel(151 + i, { H: 12, r0: 0.34, limbs: 5, spread: 0.36, cards: 36, size: 2.0, fork: [0.24, 0.34] }), leaf: MAT.leaf(TEX.peumo), bark: MAT.bark(0xffffff, TEX.barkPardo) },   // copa redonda y densa
    boldo: { n: 2, make: (i) => broadleafModel(171 + i, { H: 8, r0: 0.26, limbs: 5, spread: 0.42, cards: 34, size: 1.7, fork: [0.16, 0.26] }), leaf: MAT.leaf(TEX.boldo), bark: MAT.bark(0xffffff, TEX.barkPardo) },    // bajo, ramificado desde abajo
    quillay: { n: 2, make: (i) => broadleafModel(191 + i, { H: 13, r0: 0.36, limbs: 4, spread: 0.3, cards: 18, size: 2.0, fork: [0.36, 0.5] }), leaf: MAT.leaf(TEX.quillay), bark: MAT.bark(0xffffff, TEX.barkGris) },  // copa rala e irregular, corteza gris agrietada
    litre: { n: 2, make: (i) => broadleafModel(211 + i, { H: 6, r0: 0.2, limbs: 5, spread: 0.5, cards: 24, size: 1.5, fork: [0.2, 0.3] }), leaf: MAT.leaf(TEX.litre), bark: MAT.bark(0xffffff, TEX.barkGris) },         // pequeño y ancho, casi un arbusto
    bush: { n: 2, make: (i) => { const r = mulberry32(131 + i), w = [], l = []; for (let k = 0; k < 4; k++) cyl(w, V(0, 0, 0), V(r() - 0.5, 0.9, r() - 0.5), 0.05, 0.02, 4); cluster(l, V(0, 1, 0), 1.0, 26, 1.4, r); return { wood: mergeGeometries(w), leaves: mergeGeometries(l), H: 1 }; }, leaf: MAT.leaf(TEX.bush), bark: MAT.bark(0xa08a74) },
  };
  for (const k in SPEC) { SPEC[k].models = Array.from({ length: SPEC[k].n }, (_, i) => SPEC[k].make(i)); SPEC[k].inst = SPEC[k].models.map(() => []); SPEC[k].far = SPEC[k].models.map(() => []); }

  function tree(kind, x, y, z, H, tint, solid = true) {
    const sp = SPEC[kind], v = (rng() * sp.n) | 0, s = H / sp.models[v].H;
    (solid ? sp.inst : sp.far)[v].push({ x, y, z, s, yaw: R(0, 6.28), tint: tint ?? 0.82 + rng() * 0.3 });
    const r = kind === 'bush' ? 0 : ({ giant: 1.3, pewen: 0.48, pewenYoung: 0.16, coigue: 0.6, roble: 0.5, canelo: 0.2, peumo: 0.34, boldo: 0.26, quillay: 0.36, litre: 0.2 }[kind]) * s;
    if (solid && r > 0.08) physics.createCollider(RAPIER.ColliderDesc.cylinder(H * 0.3, r).setTranslation(x, y + H * 0.3 - 0.5, z), fixed);
  }

  // ---------- pasto, helechos, juncos y flores: por trozos de mapa, los lejanos no se dibujan ----------
  const CS = 40, cross = (w, h, n = 3) => { const parts = []; for (let i = 0; i < n; i++) { const a = (i / n) * PI; quad(parts, V(0, h / 2, 0), V(Math.cos(a) * w, 0, Math.sin(a) * w), V(0, h, 0), UP); } return mergeGeometries(parts); };
  const fernGeo = (() => { const parts = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2, d = V(Math.cos(a), 0.75, Math.sin(a)).normalize(); quad(parts, d.clone().multiplyScalar(0.55), V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.42), d.clone().multiplyScalar(1.1), UP); } return mergeGeometries(parts); })();
  const SCATTER = {
    grass: { geo: cross(1.0, 0.62), mat: MAT.grass(TEX.grass), range: 75, cells: new Map() },
    reed: { geo: cross(0.9, 1.7), mat: MAT.grass(TEX.reed), range: 110, cells: new Map() },
    fern: { geo: fernGeo, mat: MAT.grass(TEX.fern), range: 95, cells: new Map() },
    flower: { geo: cross(0.7, 0.5, 2), mat: MAT.grass(TEX.flower), range: 60, cells: new Map() },
    quila: { geo: (() => { const p = []; for (let k = 0; k < 11; k++) { const a = (k / 11) * PI * 2 + (k % 3) * 0.3, L = 3 + (k % 4) * 0.5, ca = Math.cos(a), sa = Math.sin(a), pt = (u) => V(ca * u * L * 0.55, Math.sin(u * 1.7) * L * 0.72, sa * u * L * 0.55); for (let j = 0; j < 3; j++) { const a0 = pt(j / 3), a1 = pt((j + 1) / 3); quad(p, a0.clone().add(a1).multiplyScalar(0.5), V(-sa, 0, ca).multiplyScalar(0.9), a1.clone().sub(a0).multiplyScalar(1.08), UP); } } return mergeGeometries(p); })(), mat: MAT.grass(TEX.quila), range: 120, cells: new Map() },
    copihue: { geo: cross(0.55, 1.9, 2), mat: MAT.grass(TEX.copihue), range: 70, cells: new Map() },
    litter: { geo: (() => { const p = []; quad(p, V(0, 0.04, 0), V(1.5, 0, 0), V(0, 0, 1.5), UP); return mergeGeometries(p); })(), mat: new THREE.MeshStandardMaterial({ map: TEX.roble, alphaTest: 0.3, roughness: 1 }), range: 60, cells: new Map() }, // hojarasca
  };
  function scatter(kind, x, y, z, s = 1, color = 0xffffff) {
    const sc = SCATTER[kind], k = Math.floor(x / CS) + ',' + Math.floor(z / CS);
    (sc.cells.get(k) || sc.cells.set(k, []).get(k)).push({ x, y, z, s, color });
  }

  // ---------- rocas y troncos caídos ----------
  const rockGeos = [0, 1, 2].map((i) => { const g = new THREE.IcosahedronGeometry(1, 3), P = g.attributes.position, sd = i * 37.7; for (let k = 0; k < P.count; k++) { const x = P.getX(k), y = P.getY(k), z = P.getZ(k), d = 1 + 0.26 * Math.sin(x * 3.1 + sd) * Math.sin(y * 2.7 + sd * 1.3) + 0.13 * Math.sin(z * 5.3 + sd * 0.7) + 0.05 * Math.sin(x * 11 + y * 9 + sd); P.setXYZ(k, x * d, y * d, z * d); } const m = BufferGeometryUtilsMerge(g); m.computeVertexNormals(); return m; });
  function BufferGeometryUtilsMerge(g) { // suaviza las normales compartiendo vértices
    const P = g.attributes.position, map = new Map(), pos = [], uv = [], idx = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = x.toFixed(4) + y.toFixed(4) + z.toFixed(4); let j = map.get(k); if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(x, y, z); uv.push(Math.atan2(z, x) / PI * 1.5, y * 1.2); } idx.push(j); }
    const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); o.setIndex(idx); return o;
  }
  const rocks = [[], [], []], logs = [];
  function rock(x, y, z, s, { squash = 0.7, color = 0xb4b4b0 } = {}) {
    const v = (rng() * 3) | 0, m = new THREE.Matrix4().compose(V(x, y + s * squash * 0.3, z), new THREE.Quaternion().setFromAxisAngle(UP, R(0, 6.28)), V(s, s * squash, s * R(0.75, 1.15)));
    rocks[v].push({ m, color });
    if (s > 0.5) { const P = rockGeos[v].attributes.position, pts = new Float32Array(P.count * 3), t = V(); for (let i = 0; i < P.count; i++) { t.fromBufferAttribute(P, i).applyMatrix4(m); pts[i * 3] = t.x; pts[i * 3 + 1] = t.y; pts[i * 3 + 2] = t.z; } physics.createCollider(RAPIER.ColliderDesc.convexHull(pts) || RAPIER.ColliderDesc.ball(s), fixed); }
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
      list.forEach((t, i) => { M.compose(V(t.x, t.y, t.z), q.setFromAxisAngle(UP, t.yaw), V(t.s, t.s, t.s)); wood.setMatrixAt(i, M); leaf.setMatrixAt(i, M); leaf.setColorAt(i, c.setScalar(t.tint)); });
      for (const m of [wood, leaf]) { m.castShadow = !far; m.receiveShadow = m === wood && !far; m.frustumCulled = false; scene.add(m); } // la copa no se sombrea a sí misma: se vería negra
      tris += (mdl.wood.index.count + mdl.leaves.index.count) / 3 * list.length;
    });
    for (const k in SCATTER) for (const [key, list] of SCATTER[k].cells) {
      const m = new THREE.InstancedMesh(SCATTER[k].geo, SCATTER[k].mat, list.length), [ci, cj] = key.split(',').map(Number);
      list.forEach((t, i) => { M.compose(V(t.x, t.y - 0.03, t.z), q.setFromAxisAngle(UP, rng() * 6.28), V(t.s, t.s * (0.8 + rng() * 0.5), t.s)); m.setMatrixAt(i, M); m.setColorAt(i, c.set(t.color).multiplyScalar(0.5 + rng() * 0.3)); });
      m.receiveShadow = true; m.frustumCulled = false; scene.add(m); chunks.push({ m, cx: (ci + 0.5) * CS, cz: (cj + 0.5) * CS, range: SCATTER[k].range });
    }
    const rm = MAT.rock();
    rocks.forEach((list, v) => { if (!list.length) return; const m = new THREE.InstancedMesh(rockGeos[v], rm, list.length); list.forEach((t, i) => { m.setMatrixAt(i, t.m); m.setColorAt(i, c.set(t.color).multiplyScalar(0.85 + rng() * 0.3)); }); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
    if (logs.length) { const g = new THREE.CylinderGeometry(1, 0.85, 1, 10), m = new THREE.InstancedMesh(g, MAT.bark(0xa89a78), logs.length); logs.forEach((mm, i) => m.setMatrixAt(i, mm)); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
    return tris;
  }
  function update(p) { for (const c of chunks) c.m.visible = Math.hypot(p.x - c.cx, p.z - c.cz) < c.range + 30; }

  // búsquedas para la exploración: ¿hay una planta de este tipo cerca?
  function nearScatter(kind, x, z, r) {
    const ci = Math.floor(x / CS), cj = Math.floor(z / CS); let best = null;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = SCATTER[kind].cells.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) { const d = Math.hypot(t.x - x, t.z - z); if (d < r && (!best || d < best.d)) best = { x: t.x, y: t.y, z: t.z, d }; } }
    return best;
  }
  function nearBush(x, z, r) { let best = null; for (const l of SPEC.bush.inst) for (const t of l) { const d = Math.hypot(t.x - x, t.z - z); if (d < r && (!best || d < best.d)) best = { x: t.x, y: t.y, z: t.z, d }; } return best; }

  return { tree, scatter, rock, log, build, update, nearScatter, nearBush };
}
