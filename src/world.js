// Arma el mundo del Acto I: terreno, agua, bosque, aldea, lejanía y vida.
import * as THREE from 'three';
import { TEX, GeoBag, FOG, mulberry32, waterMaterial, buildSky, buildShafts } from './gfx.js';
import { B, WATER_Y, CERRO, POI, height, normalAt, zone, pathDist, vnoise, fbm, smooth } from './terrain.js';
import { makeFlora } from './flora.js';
import { buildVillage, CORRAL } from './village.js';
import { buildLife } from './life.js';

const rng = mulberry32(1545);
const R = (a, b) => a + (b - a) * rng();
// cantidad de vegetación: se elige en Opciones (o con ?q=0.5 en la dirección)
const Q = Math.min(2, Math.max(0.2, parseFloat(new URLSearchParams(location.search).get('q')) || parseFloat(JSON.parse(localStorage.getItem('leftraru.opciones') || '{}').detalle) || 1));

// color del suelo según la zona
const GROUND = { forest: 0x55472f, grassy: 0x526a32, needles: 0x62452e, moss: 0x3a4a2c, meadow: 0x587834, marsh: 0x40593c, earth: 0x7a6248, path: 0x94805f, pebble: 0x908c80, bed: 0x5c6456, rock: 0x74767a, alpine: 0x6c7040 };
const GC = {}; for (const k in GROUND) GC[k] = new THREE.Color(GROUND[k]);

export function buildWorld(scene, RAPIER, physics) {
  const fixed = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const bag = new GeoBag(), flora = makeFlora({ rng, scene, physics, RAPIER, fixed });

  // ---------- terreno: malla fina para ver, malla más gruesa para chocar ----------
  { const NX = B.x1 - B.x0, NZ = B.z1 - B.z0, P = new Float32Array((NX + 1) * (NZ + 1) * 3), C = new Float32Array(P.length), U = new Float32Array((NX + 1) * (NZ + 1) * 2), I = new Uint32Array(NX * NZ * 6), c = new THREE.Color();
    for (let j = 0, k = 0, u = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++, k += 3, u += 2) {
      const x = B.x0 + i, z = B.z0 + j, h = height(x, z), ny = normalAt(x, z)[1];
      // el color se promedia con puntos vecinos para que las zonas se fundan
      c.setRGB(0, 0, 0); for (let s = 0; s < 3; s++) { const jx = x + (vnoise(x * 0.9 + s * 7, z * 0.9) - 0.5) * 3.5, jz = z + (vnoise(x * 0.9, z * 0.9 + s * 5) - 0.5) * 3.5; c.add(GC[zone(jx, jz, height(jx, jz), ny)]); }
      const sh = (0.8 + 0.3 * vnoise(x * 0.35, z * 0.35) + 0.15 * vnoise(x * 0.05, z * 0.05)) * (0.9 + 0.2 * fbm(x * 0.02, z * 0.02));
      P[k] = x; P[k + 1] = h; P[k + 2] = z; C[k] = c.r * sh; C[k + 1] = c.g * sh; C[k + 2] = c.b * sh; U[u] = x / 3.3; U[u + 1] = z / 3.3;
    }
    for (let j = 0, k = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, cc = a + NX + 1, d = cc + 1; I[k++] = a; I[k++] = cc; I[k++] = b; I[k++] = b; I[k++] = cc; I[k++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.grain, bumpMap: TEX.grainBump, bumpScale: 9, roughness: 1 })); m.receiveShadow = true; scene.add(m);
  }
  { const ST = 2, NX = (B.x1 - B.x0) / ST, NZ = (B.z1 - B.z0) / ST, verts = new Float32Array((NX + 1) * (NZ + 1) * 3), idx = new Uint32Array(NX * NZ * 6);
    for (let j = 0, k = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++, k += 3) { const x = B.x0 + i * ST, z = B.z0 + j * ST; verts[k] = x; verts[k + 1] = height(x, z); verts[k + 2] = z; }
    for (let j = 0, k = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
    physics.createCollider(RAPIER.ColliderDesc.trimesh(verts, idx), fixed);
  }

  // terreno exterior, más tosco: cerros boscosos al oriente, bajada hacia el mar al poniente
  const hOut = (x, z) => { const cx = Math.min(B.x1, Math.max(B.x0, x)), cz = Math.min(B.z1, Math.max(B.z0, z)), d = Math.hypot(x - cx, z - cz), far = Math.hypot(x, z);
    return (height(cx, cz) + 2) * (1 - smooth(0, 200, d)) + smooth(0, 200, d) * Math.max(-8, 4 + fbm(x * 0.004, z * 0.004) * 34 + (x > 0 ? x * 0.035 : x * 0.05) + smooth(300, 900, far) * (x > -200 ? 120 * fbm(x * 0.0016 + 9, z * 0.0016) : 0)) - 1.6; };
  { const S = 30, N = 90, half = (N * S) / 2, P = [], C = [], I = [], c = new THREE.Color();
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = -half + i * S, z = -half + j * S, h = hOut(x, z); P.push(x, h, z); c.set(h > 95 ? 0x6f7478 : fbm(x * 0.01, z * 0.01) > 0.55 ? 0x3f5a34 : 0x2f4a30).multiplyScalar(0.8 + 0.3 * vnoise(x * 0.02, z * 0.02)); C.push(c.r, c.g, c.b); }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -half + i * S, z = -half + j * S; if (x > B.x0 + 6 && x + S < B.x1 - 6 && z > B.z0 + 6 && z + S < B.z1 - 6) continue; const a = j * (N + 1) + i; I.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    // bosque que continúa más allá del borde del mapa (solo se ve, no se camina)
    for (let i = 0; i < 900 * Q; i++) { const x = R(B.x0 - 230, B.x1 + 230), z = R(B.z0 - 230, B.z1 + 230); if (x > B.x0 - 3 && x < B.x1 + 3 && z > B.z0 - 3 && z < B.z1 + 3) continue; const h = hOut(x, z), u = rng(); if (h > 1) flora.tree(u < 0.45 ? 'coigue' : u < 0.7 ? 'pewen' : 'roble', x, h - 0.3, z, R(12, 22), undefined, false); }
    const sea = new THREE.Mesh(new THREE.CircleGeometry(7000, 48), new THREE.MeshStandardMaterial({ color: 0x1c4660, roughness: 0.25, metalness: 0.2 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -3; scene.add(sea);
  }
  // volcán nevado al oriente
  const VOL = { x: 1500, z: -520, H: 640, R: 620 };
  { const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector2(VOL.R * Math.pow(1 - u, 1.5) + 14 * (1 - u), u * VOL.H)); }
    const g = new THREE.LatheGeometry(pts, 48), P = g.attributes.position, C = [], c = new THREE.Color();
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.sin(a * 9 + y * 0.01) + 0.04 * Math.sin(a * 23); P.setX(i, x * k); P.setZ(i, z * k); c.set(y / VOL.H > 0.38 + 0.1 * Math.sin(a * 7) + 0.05 * Math.sin(a * 19) ? 0xf2f4f6 : 0x4a5262).lerp(FOG.color, 0.42); C.push(c.r, c.g, c.b); } // la bruma se mezcla a mano: a esta distancia la niebla lo borraría
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, fog: false })); m.position.set(VOL.x, 20, VOL.z); scene.add(m);
  }

  // ---------- agua ----------
  { const ST = 2, NX = (B.x1 - B.x0) / ST, NZ = (B.z1 - B.z0) / ST, P = [], D = [], I = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = B.x0 + i * ST, z = B.z0 + j * ST; P.push(x, WATER_Y, z); D.push(WATER_Y - height(x, z)); }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; if (Math.max(D[a], D[b], D[c], D[d]) < -0.3) continue; I.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('depth', new THREE.Float32BufferAttribute(D, 1)); g.setIndex(I);
    const m = new THREE.Mesh(g, waterMaterial()); m.renderOrder = 1; scene.add(m);
  }

  // ---------- piñones de la primera misión, en el bosque de pewenes ----------
  const pin = [[-8, -78], [11, -92], [-19, -101], [23, -85]].map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.9, z));
  const ledge = [{ x: 2, z: -108, s: 1.2, q: 0.6 }, { x: 4.6, z: -109.4, s: 2.0, q: 0.65 }];
  for (const r of ledge) { r.y = height(r.x, r.z); flora.rock(r.x, r.y - 0.1, r.z, r.s, { squash: r.q }); }
  pin.push(new THREE.Vector3(ledge[1].x, ledge[1].y + 3.1, ledge[1].z));

  // ---------- árboles ----------
  const trees = [], grid = new Map(), gk = (x, z) => Math.floor(x / 8) + ',' + Math.floor(z / 8);
  const near = (x, z, sp) => { const ci = Math.floor(x / 8), cj = Math.floor(z / 8); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const l = grid.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) if (Math.hypot(t.x - x, t.z - z) < sp) return true; } return false; };
  const keepOut = (x, z) => Math.hypot(x, z) < 37 || Math.hypot(x - CORRAL.x, z - CORRAL.z) < 10 || Math.hypot(x - POI.antiguos.x, z - POI.antiguos.z) < 14 || Math.hypot(x - CERRO[0], z - CERRO[1]) < 9 || Math.hypot(x - POI.viejo.x, z - POI.viejo.z) < 9 || pathDist(x, z) < 3.2 || pin.some((p) => Math.hypot(x - p.x, z - p.z) < 3.5);
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
    const young = kind === 'pewen' && rng() < 0.16;
    const H = kind === 'pewen' ? (young ? R(4, 8) : zk === 'alpine' ? R(9, 15) : R(14, 24)) : kind === 'giant' ? R(27, 35) : kind === 'canelo' ? R(7, 11) : kind === 'roble' ? R(11, 17) : R(12, 20);
    const t = { x, z, y: h, H, kind }; trees.push(t); const k = gk(x, z); (grid.get(k) || grid.set(k, []).get(k)).push(t);
    flora.tree(young ? 'pewenYoung' : kind, x, h - 0.1, z, H);
  }

  // ---------- pasto, flores, helechos, arbustos, rocas y troncos ----------
  const FL = [0xfff2a0, 0xffffff, 0xd9a8e6];
  for (let i = 0, n = 150000 * Q; i < n; i++) {
    const x = R(B.x0 + 2, B.x1 - 2), z = R(B.z0 + 2, B.z1 - 2), h = height(x, z);
    if (h < WATER_Y + 0.05 || pathDist(x, z) < 1.3) continue;
    const zk = zone(x, z, h, normalAt(x, z)[1]), u = rng();
    if (zk === 'meadow') { if (u < 0.92) flora.scatter('grass', x, h, z, R(0.9, 1.5), 0xd8e8b0); else flora.scatter('flower', x, h, z, R(0.8, 1.2), FL[(u * 1000 | 0) % 3]); }
    else if (zk === 'grassy') { if (u < 0.7) flora.scatter('grass', x, h, z, R(0.8, 1.3)); }
    else if (zk === 'alpine') { if (u < 0.5) flora.scatter('grass', x, h, z, R(0.6, 1.0), 0xe6dc9a); }
    else if (zk === 'marsh') { if (u < 0.45) flora.scatter('reed', x, h, z, R(0.8, 1.3)); else if (u < 0.75) flora.scatter('grass', x, h, z, R(1, 1.5), 0xb8d8a8); }
    else if (zk === 'pebble') { if (u < 0.1) flora.scatter('reed', x, h, z, R(0.7, 1.1)); }
    else if (zk === 'earth') { if (u < 0.08 && Math.hypot(x, z) > 20) flora.scatter('grass', x, h, z, R(0.5, 0.8), 0xe0d8a0); }
    else if (zk === 'forest') { if (u < 0.2) flora.scatter('grass', x, h, z, R(0.6, 1.0), 0xc8d8a0); else if (u < 0.27) flora.scatter('fern', x, h, z, R(0.8, 1.3)); else if (u < 0.55) flora.scatter('litter', x, h, z, R(0.7, 1.3), near(x, z, 6) && rng() < 0.5 ? 0xf0d890 : 0xb09070); }
    else if (zk === 'moss') { if (u < 0.3) flora.scatter('fern', x, h, z, R(1, 1.9)); else if (u < 0.36) flora.scatter('grass', x, h, z, R(0.6, 1), 0xa8c090); else if (u < 0.55) flora.scatter('litter', x, h, z, R(0.7, 1.3), 0x8a8a5a); }
    else if (zk === 'needles') { if (u < 0.05) flora.scatter('fern', x, h, z, R(0.7, 1.1)); else if (u < 0.09) flora.scatter('grass', x, h, z, R(0.5, 0.8), 0xd8d0a0); else if (u < 0.2) flora.scatter('litter', x, h, z, R(0.7, 1.2), 0x9a7050); }
  }
  for (let i = 0, n = 2600 * Q; i < n; i++) {
    const x = R(B.x0 + 2, B.x1 - 2), z = R(B.z0 + 2, B.z1 - 2), h = height(x, z);
    if (h < WATER_Y - 0.9 || Math.hypot(x, z) < 34 || pathDist(x, z) < 4 || pin.some((p) => Math.hypot(x - p.x, z - p.z) < 4)) continue;
    const zk = zone(x, z, h, normalAt(x, z)[1]), u = rng();
    if (zk === 'forest' || zk === 'grassy') { if (u < 0.45) flora.tree('bush', x, h, z, R(0.9, 1.9)); else if (u < 0.6) flora.rock(x, h - 0.1, z, R(0.4, 1.3)); else if (u < 0.66) flora.log(x, h, z, R(3, 6), R(0.25, 0.45), R(0, 3.14)); }
    else if (zk === 'moss') { if (u < 0.3) flora.tree('bush', x, h, z, R(1.2, 2.2)); else if (u < 0.45) flora.log(x, h, z, R(4, 8), R(0.4, 0.7), R(0, 3.14)); else if (u < 0.65) flora.rock(x, h - 0.1, z, R(0.6, 1.6), { color: 0xa4b094 }); }
    else if (zk === 'needles') { if (u < 0.25) flora.rock(x, h - 0.1, z, R(0.4, 1.1)); }
    else if (zk === 'pebble' || zk === 'bed') { if (u < 0.8) flora.rock(x, h - 0.15, z, R(0.3, 1.0), { squash: 0.6, color: 0xc4c0b4 }); }
    else if (zk === 'meadow') { if (u < 0.5) flora.tree('bush', x, h, z, R(1, 1.8)); }
    else if (zk === 'alpine' || zk === 'rock') { if (u < 0.7) flora.rock(x, h - 0.15, z, R(0.5, 1.9)); }
  }

  for (let i = 0, n = 5000 * Q; i < n; i++) { const x = R(B.x0 + 2, B.x1 - 2), z = R(B.z0 + 2, B.z1 - 2), h = height(x, z); if (h > WATER_Y - 0.5) flora.rock(x, h - 0.02, z, R(0.05, 0.16), { squash: 0.6, color: rng() < 0.5 ? 0xb8b0a0 : 0x9a9284 }); } // piedritas

  // ---------- aldea, cielo y vida ----------
  const emit = buildVillage({ scene, rng, bag, flora, physics, RAPIER, fixed });
  scene.add(bag.build());
  const tris = flora.build();
  buildSky(scene);
  // rayos de sol que se cuelan entre las copas, en las zonas de bosque
  { const pts = []; for (let i = 0; i < 4000 && pts.length < 190 * Q; i++) { const x = R(B.x0 + 10, B.x1 - 10), z = R(B.z0 + 10, B.z1 - 10), h = height(x, z), zk = zone(x, z, h, 1); if ((zk === 'forest' || zk === 'needles' || zk === 'moss') && near(x, z, 9)) pts.push([x, h - 1, z, R(1.2, 3.4), R(22, 38)]); } buildShafts(scene, pts); }
  const life = buildLife({ scene, rng, emit, trees });

  // ---------- piñones (coleccionables) ----------
  const pm = new THREE.MeshStandardMaterial({ color: 0xd99a2c, emissive: 0xb86a10, emissiveIntensity: 1.3, roughness: 0.5 }), gm = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.28, depthWrite: false });
  const items = pin.map((p) => {
    const g = new THREE.Group(); g.position.copy(p);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8), pm); core.rotation.z = Math.PI; core.castShadow = true;
    g.add(core, new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), gm)); scene.add(g);
    return { mesh: g, base: p.clone(), taken: false };
  });

  return {
    items, trees, life, strokes: Math.round(tris),
    nearTree(x, z, r) { const ci = Math.floor(x / 8), cj = Math.floor(z / 8); let best = null; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = grid.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) { const d = Math.hypot(t.x - x, t.z - z); if (d < r && (!best || d < best.d)) best = { ...t, d }; } } return best; },
    nearPlant: flora.nearScatter, nearBush: flora.nearBush, volcano: new THREE.Vector3(VOL.x, 380, VOL.z),
    update(dt, t, camPos, playerPos) { flora.update(camPos); life.update(dt, t, playerPos); if (emit.glow) emit.glow.intensity = 12 + Math.sin(t * 11) * 2.5 + Math.sin(t * 23.7) * 1.5; },
  };
}
