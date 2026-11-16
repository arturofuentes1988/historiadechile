// Arma el mundo del Acto I: terreno, agua, bosque, aldea, lejanía y vida.
import * as THREE from 'three';
import { StrokeBatch, GeoBag, PAL, SUN, shade, mulberry32, paintMaterial, waterMaterial, skyDome, hex } from './strokes.js';
import { B, WATER_Y, CERRO, POI, height, normalAt, zone, pathDist, riverZ, vnoise, fbm, smooth } from './terrain.js';
import { makeFlora } from './flora.js';
import { buildVillage, CORRAL } from './village.js';
import { buildLife } from './life.js';

const rng = mulberry32(1545);
const R = (a, b) => a + (b - a) * rng();
// cantidad de trazos: se elige en Opciones (o con ?q=0.5 en la dirección)
const Q = Math.min(2, Math.max(0.2, parseFloat(new URLSearchParams(location.search).get('q')) || parseFloat(JSON.parse(localStorage.getItem('leftraru.opciones') || '{}').detalle) || 1));

const CS = 40; // tamaño de cada trozo de mapa; los lejanos no se dibujan
class Chunks {
  constructor() { this.map = new Map(); }
  at(x, z) {
    const i = Math.floor(x / CS), j = Math.floor(z / CS), k = i + ',' + j;
    let c = this.map.get(k);
    if (!c) { c = { cx: (i + 0.5) * CS, cz: (j + 0.5) * CS, ground: new StrokeBatch(), solid: new StrokeBatch(), leaf: new StrokeBatch() }; this.map.set(k, c); }
    return c;
  }
  build(scene) {
    this.list = []; let n = 0;
    for (const c of this.map.values()) {
      const sphere = new THREE.Sphere(new THREE.Vector3(c.cx, height(c.cx, c.cz) + 12, c.cz), 72), o = { cx: c.cx, cz: c.cz };
      n += c.ground.n + c.solid.n + c.leaf.n;
      if (c.ground.n) scene.add(o.ground = c.ground.build({ sphere }));
      if (c.solid.n) scene.add(o.solid = c.solid.build({ sphere }));
      if (c.leaf.n) scene.add(o.leaf = c.leaf.build({ sphere, sway: 1 }));
      this.list.push(o);
    }
    this.map = null; return n;
  }
  update(p) {
    for (const o of this.list) {
      const d = Math.hypot(p.x - o.cx, p.z - o.cz);
      if (o.ground) o.ground.visible = d < 125; if (o.solid) o.solid.visible = d < 310; if (o.leaf) o.leaf.visible = d < 310;
    }
  }
}

export function buildWorld(scene, RAPIER, physics) {
  const fixed = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const chunks = new Chunks(), bag = new GeoBag();
  const flora = makeFlora({ rng, bag, physics, RAPIER, fixed });

  // ---------- terreno (malla base + colisión) ----------
  const ST = 2, NX = (B.x1 - B.x0) / ST, NZ = (B.z1 - B.z0) / ST;
  const verts = new Float32Array((NX + 1) * (NZ + 1) * 3), cols = new Float32Array(verts.length), idx = new Uint32Array(NX * NZ * 6);
  for (let j = 0, k = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++, k += 3) {
    const x = B.x0 + i * ST, z = B.z0 + j * ST, h = height(x, z), c = PAL[zone(x, z, h, normalAt(x, z)[1])][1];
    verts[k] = x; verts[k + 1] = h; verts[k + 2] = z; cols[k] = c[0]; cols[k + 1] = c[1]; cols[k + 2] = c[2];
  }
  for (let j = 0, k = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(verts, 3)); tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  tg.setIndex(new THREE.BufferAttribute(idx, 1)); tg.computeVertexNormals();
  scene.add(new THREE.Mesh(tg, paintMaterial({ vertexColors: true })));
  physics.createCollider(RAPIER.ColliderDesc.trimesh(verts, idx), fixed);

  // terreno exterior, más tosco: cerros al oriente, bajada hacia el mar al poniente
  const hOut = (x, z) => { const cx = Math.min(B.x1, Math.max(B.x0, x)), cz = Math.min(B.z1, Math.max(B.z0, z)), d = Math.hypot(x - cx, z - cz);
      return (height(cx, cz) + 2) * (1 - smooth(0, 200, d)) + smooth(0, 200, d) * Math.max(-8, 4 + fbm(x * 0.004, z * 0.004) * 30 + (x > 0 ? x * 0.03 : x * 0.05)) - 1.6; };
  { const S = 24, N = 64, half = (N * S) / 2, P = [], I = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = -half + i * S, z = -half + j * S; P.push(x, hOut(x, z), z); }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -half + i * S, z = -half + j * S; if (x > B.x0 + 6 && x + S < B.x1 - 6 && z > B.z0 + 6 && z + S < B.z1 - 6) continue; const a = j * (N + 1) + i; I.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, paintMaterial({ color: 0x3f5a40, fogScale: 0.4 })));
    const sea = new THREE.Mesh(new THREE.CircleGeometry(2600, 40), paintMaterial({ color: 0x7fa8bc, fogScale: 0.1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -3; scene.add(sea);
  }

  // ---------- agua ----------
  { const P = [], D = [], I = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = B.x0 + i * ST, z = B.z0 + j * ST; P.push(x, WATER_Y, z); D.push(WATER_Y - height(x, z)); }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; if (Math.max(D[a], D[b], D[c], D[d]) < -0.3) continue; I.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('depth', new THREE.Float32BufferAttribute(D, 1)); g.setIndex(I);
    scene.add(new THREE.Mesh(g, waterMaterial()));
  }

  // ---------- piñones de la primera misión, en el bosque de pewenes ----------
  const pin = [[-8, -78], [11, -92], [-19, -101], [23, -85]].map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.9, z));
  const ledge = [{ x: 2, z: -108, s: 1.2, q: 0.6 }, { x: 4.6, z: -109.4, s: 2.0, q: 0.65 }];
  for (const r of ledge) { r.y = height(r.x, r.z); flora.rock(chunks.at(r.x, r.z), r.x, r.y - 0.1, r.z, r.s, { squash: r.q, moss: 0.4 }); }
  pin.push(new THREE.Vector3(ledge[1].x, ledge[1].y + 3.1, ledge[1].z));

  // ---------- dónde crece cada árbol ----------
  const trees = [], grid = new Map(), gk = (x, z) => Math.floor(x / 8) + ',' + Math.floor(z / 8);
  const near = (x, z, sp) => { const ci = Math.floor(x / 8), cj = Math.floor(z / 8); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const l = grid.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) if (Math.hypot(t.x - x, t.z - z) < sp) return true; } return false; };
  const keepOut = (x, z) => Math.hypot(x, z) < 37 || Math.hypot(x - CORRAL.x, z - CORRAL.z) < 10 || Math.hypot(x - POI.antiguos.x, z - POI.antiguos.z) < 14 || Math.hypot(x - CERRO[0], z - CERRO[1]) < 9 || Math.hypot(x - POI.viejo.x, z - POI.viejo.z) < 8 || pathDist(x, z) < 3.2 || pin.some((p) => Math.hypot(x - p.x, z - p.z) < 3.5);
  for (let tries = 0, max = 1000 * Q; trees.length < max && tries < 16000; tries++) {
    const x = R(B.x0 + 4, B.x1 - 4), z = R(B.z0 + 4, B.z1 - 4), h = height(x, z);
    if (h < WATER_Y + 0.5 || keepOut(x, z)) continue;
    const zk = zone(x, z, h, normalAt(x, z)[1]), u = rng(); let kind, sp;
    if (zk === 'needles') { kind = u < 0.85 ? 'pewen' : 'coigue'; sp = 8.5; }
    else if (zk === 'moss') { kind = u < 0.28 ? 'giant' : u < 0.72 ? 'coigue' : 'canelo'; sp = 10; }
    else if (zk === 'forest' || zk === 'grassy') { kind = u < 0.4 ? 'coigue' : u < 0.68 ? 'roble' : u < 0.84 ? 'pewen' : 'canelo'; sp = zk === 'grassy' ? 10.5 : 7.5; }
    else if (zk === 'alpine' && h < 40 && u < 0.6) { kind = 'pewen'; sp = 14; }
    else if (zk === 'marsh' && u < 0.5) { kind = 'canelo'; sp = 12; }
    else continue;
    if (near(x, z, sp)) continue;
    const H = kind === 'pewen' ? (rng() < 0.16 ? R(4, 8) : zk === 'alpine' ? R(9, 15) : R(14, 24)) : kind === 'giant' ? R(27, 35) : kind === 'canelo' ? R(7, 11) : kind === 'roble' ? R(11, 17) : R(12, 20);
    const t = { x, z, y: h, H, kind }; trees.push(t); const k = gk(x, z); (grid.get(k) || grid.set(k, []).get(k)).push(t);
  }

  // ---------- trazos del suelo ----------
  const inShadow = (x, z) => { // sombra proyectada, al lado contrario del sol
    const ci = Math.floor(x / 8), cj = Math.floor(z / 8);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = grid.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) { const k = t.H * 0.19; if (Math.hypot(x - (t.x - SUN.x * k), z - (t.z - SUN.z * k)) < 1.6 + t.H * 0.13) return true; } }
    return false;
  };
  const underRoble = (x, z) => { const ci = Math.floor(x / 8), cj = Math.floor(z / 8); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = grid.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) if (t.kind === 'roble' && Math.hypot(x - t.x, z - t.z) < 5) return true; } return false; };
  const FLOWERS = [PAL.flowerY, PAL.flowerW, PAL.flowerP];
  for (let i = 0, n = (B.x1 - B.x0) * (B.z1 - B.z0) * 3.4 * Q; i < n; i++) {
    const x = R(B.x0, B.x1), z = R(B.z0, B.z1), h = height(x, z);
    if (h < WATER_Y - 0.3) continue;
    const nr = normalAt(x, z), zk = zone(x, z, h, nr[1]), c = chunks.at(x, z), gold = zk !== 'path' && zk !== 'earth' && rng() < 0.5 && underRoble(x, z), fine = zk === 'path' || zk === 'earth' ? 0.75 : 1;
    c.ground.add(x, h, z, nr[0] + R(-0.3, 0.3), nr[1], nr[2] + R(-0.3, 0.3), R(0.8, 1.6) * fine, R(0.3, 0.55) * fine, R(-0.5, 0.5) + vnoise(x * 0.05, z * 0.05) * 2,
      shade(gold ? PAL.leafFall : PAL[zk], nr[0] + R(-0.2, 0.2), nr[1], nr[2] + R(-0.2, 0.2), rng, inShadow(x, z) ? -0.34 : 0.05));
    const u = rng();
    if (zk === 'meadow') { if (u < 0.3) flora.tuft(c, x, h, z); else if (u < 0.38) flora.flower(c, x, h, z, FLOWERS[(u * 1000 | 0) % 3]); }
    else if (zk === 'grassy' || zk === 'alpine') { if (u < 0.2) flora.tuft(c, x, h, z, zk === 'alpine' ? PAL.reed : PAL.grass); }
    else if (zk === 'marsh') { if (u < 0.1) flora.reed(c, x, h, z); else if (u < 0.22) flora.tuft(c, x, h, z, PAL.nalca, 0.7); }
    else if (zk === 'earth') { if (u < 0.025) flora.tuft(c, x, h, z, PAL.reed, 0.35); }
    else if (zk === 'pebble') { if (u < 0.03) flora.reed(c, x, h, z); }
  }

  // ---------- árboles ----------
  for (const t of trees) {
    const c = chunks.at(t.x, t.z);
    if (t.kind === 'pewen') flora.pewen(c, t.x, t.y, t.z, t.H);
    else if (t.kind === 'giant') flora.broadleaf(c, t.x, t.y, t.z, t.H, { r0: R(1.0, 1.6), limbs: 6, spread: 0.3, moss: 0.6, dense: 1.15 });
    else if (t.kind === 'canelo') flora.broadleaf(c, t.x, t.y, t.z, t.H, { leaf: PAL.canelo, bark: PAL.barkPale, cone: true, spread: 0.2 });
    else if (t.kind === 'roble') flora.broadleaf(c, t.x, t.y, t.z, t.H, { leaf: PAL.roble, bark: PAL.trunk, limbs: 4, dense: 0.7, spread: 0.28 });
    else flora.broadleaf(c, t.x, t.y, t.z, t.H, { moss: 0.3, vine: rng() < 0.22 });
  }

  // ---------- sotobosque, rocas y troncos caídos ----------
  for (let i = 0, n = 9000 * Q; i < n; i++) {
    const x = R(B.x0 + 2, B.x1 - 2), z = R(B.z0 + 2, B.z1 - 2), h = height(x, z);
    if (h < WATER_Y - 0.9 || Math.hypot(x, z) < 33 || pathDist(x, z) < 1.8) continue;
    const zk = zone(x, z, h, normalAt(x, z)[1]), c = chunks.at(x, z), u = rng(), big = !pin.some((p) => Math.hypot(x - p.x, z - p.z) < 4) && pathDist(x, z) > 4;
    if (zk === 'forest' || zk === 'grassy') { if (u < 0.55) flora.fern(c, x, h, z); else if (u < 0.63) flora.quila(c, x, h, z); else if (u < 0.67 && big) flora.rock(c, x, h - 0.1, z, R(0.4, 1.3), { moss: 0.4 }); else if (u < 0.685 && big) flora.log(c, x, h, z, R(3, 6), R(0.25, 0.45), R(0, 3.14)); else if (u < 0.72) flora.shrub(c, x, h, z, PAL.coigue); }
    else if (zk === 'moss') { if (u < 0.7) flora.fern(c, x, h, z, R(1, 1.7)); else if (u < 0.76) flora.nalca(c, x, h, z); else if (u < 0.8 && big) flora.log(c, x, h, z, R(4, 8), R(0.4, 0.7), R(0, 3.14)); else if (u < 0.85 && big) flora.rock(c, x, h - 0.1, z, R(0.6, 1.6), { moss: 0.8 }); }
    else if (zk === 'needles') { if (u < 0.22) flora.fern(c, x, h, z); else if (u < 0.26 && big) flora.rock(c, x, h - 0.1, z, R(0.4, 1.1), { moss: 0.2 }); }
    else if (zk === 'marsh') { if (u < 0.3) flora.nalca(c, x, h, z); else if (u < 0.7) flora.reed(c, x, h, z); }
    else if (zk === 'pebble' || zk === 'bed') { if (u < 0.22) flora.rock(c, x, h - 0.15, z, R(0.3, 1.0), { squash: 0.6, pal: PAL.pebble }); else if (u < 0.34) flora.reed(c, x, h, z); else if (u < 0.42 && zk === 'pebble') flora.shrub(c, x, h, z, PAL.coigue, PAL.copihue); }
    else if (zk === 'meadow') { if (u < 0.22) flora.shrub(c, x, h, z, PAL.coigue, Math.hypot(x - POI.maqui.x, z - POI.maqui.z) < 30 ? PAL.berry : null); }
    else if (zk === 'alpine' || zk === 'rock') { if (u < 0.2 && big) flora.rock(c, x, h - 0.15, z, R(0.5, 1.8)); else if (u < 0.4) flora.tuft(c, x, h, z, PAL.reed); }
  }

  // ---------- aldea y lugares ----------
  const emit = buildVillage({ chunks, rng, bag, flora, physics, RAPIER, fixed });

  // ---------- lejanía: cordones de cerros, volcán al oriente y mar al poniente ----------
  const distant = new StrokeBatch();
  for (let i = 0; i < 11000; i++) {
    const a = R(0, 6.28), ring = Math.floor(R(0, 3)), rad = 330 + ring * 130 + R(-25, 25), west = Math.max(0, -Math.cos(a) - 0.45) * 1.6;
    const ridge = (30 + ring * 26 + fbm(a * 3 + ring * 7, ring) * (46 + ring * 34)) * (1 - Math.min(0.8, west)), y = Math.sqrt(rng()) * ridge;
    distant.add(Math.cos(a) * rad, y - 2, Math.sin(a) * rad, -Math.cos(a), 0.7, -Math.sin(a), R(26, 46), R(10, 17), R(-0.3, 0.3), shade(ring === 0 ? PAL.hillsNear : PAL.hills, -Math.cos(a) * 0.4, 0.6, -Math.sin(a) * 0.4, rng));
  }
  const V = { x: 820, z: -280, H: 360, R: 300 };
  for (let i = 0; i < 4600; i++) {
    const u = Math.pow(rng(), 1.5), a = R(0, 6.28), rad = V.R * Math.pow(1 - u, 1.35) + 7, nx = Math.cos(a), nz = Math.sin(a);
    distant.add(V.x + nx * rad, 10 + u * V.H, V.z + nz * rad, nx, 0.75, nz, R(22, 40), R(8, 14), R(0.9, 1.4) * (rng() < 0.5 ? 1 : -1), shade(u > 0.4 + (vnoise(a * 4, u * 6) - 0.5) * 0.3 ? PAL.snow : PAL.volcano, nx, 0.45, nz, rng));
  }
  for (let i = 0; i < 1500; i++) distant.add(R(-1500, -560), -2.5, R(-900, 900), 0, 1, 0, R(40, 90), R(6, 12), R(1.4, 1.75), shade(PAL.sea, 0, 1, 0, rng, R(-0.3, 0.3)));

  const outer = new StrokeBatch();
  for (let i = 0; i < 60000 * Q; i++) {
    const x = R(B.x0 - 170, B.x1 + 170), z = R(B.z0 - 170, B.z1 + 170);
    if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) continue;
    const h = hOut(x, z) + 0.3, e = 4, dx = hOut(x + e, z) - hOut(x - e, z), dz = hOut(x, z + e) - hOut(x, z - e), l = Math.hypot(dx, 2 * e, dz), nx = -dx / l, ny = (2 * e) / l, nz = -dz / l;
    outer.add(x, h, z, nx + R(-0.2, 0.2), ny, nz + R(-0.2, 0.2), R(3, 5.5), R(1.1, 1.9), R(-0.6, 0.6), shade(vnoise(x * 0.03, z * 0.03) > 0.55 ? PAL.grassy : PAL.forest, nx, ny, nz, rng));
    if (i % 9 === 0) { // árbol lejano simplificado: unos pocos trazos
      const H = R(11, 20), pal = rng() < 0.25 ? PAL.roble : rng() < 0.5 ? PAL.pewen : PAL.coigue;
      outer.add(x, h + H * 0.4, z, 0, 0, 0, 0.5, H * 0.8, 0, shade(PAL.trunk, 0, 0.2, 0, rng), 1);
      for (let j = 0; j < 5; j++) outer.add(x + R(-2.6, 2.6), h + H * R(0.7, 1.05), z + R(-2.6, 2.6), 0, 0, 0, R(2.6, 4.4), R(1.5, 2.4), R(-0.5, 0.5), shade(pal, R(-0.6, 0.6), R(-0.5, 1), R(-0.6, 0.6), rng), 1);
    }
  }
  scene.add(outer.build());
  scene.add(skyDome());
  scene.add(distant.build({ fogScale: 0.1, fogMax: 0.55 }));
  scene.add(bag.build());
  const strokes = chunks.build(scene) + distant.n;

  // ---------- vida ----------
  const life = buildLife({ scene, rng, emit, trees });

  // ---------- piñones (coleccionables) ----------
  const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(...hex(0xf2b441)) }), gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(...hex(0xfff0b0)), transparent: true, opacity: 0.35, depthWrite: false });
  const items = pin.map((p) => {
    const g = new THREE.Group(); g.position.copy(p);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), pm); core.rotation.z = Math.PI;
    g.add(core, new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), gm)); scene.add(g);
    return { mesh: g, base: p.clone(), taken: false };
  });

  return {
    items, trees, life, strokes, volcano: new THREE.Vector3(V.x, 230, V.z),
    update(dt, t, camPos, playerPos) { chunks.update(camPos); life.update(dt, t, playerPos); },
  };
}
