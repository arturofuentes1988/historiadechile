// Arma el mundo del Acto I: terreno, agua, bosque, aldea, lejanía y vida.
import * as THREE from 'three';
import { GeoBag, FOG, TEX, mulberry32, waterMaterial, buildSky, buildShafts, groundMaterial } from './gfx.js';
import { B, WATER_Y, CERRO, POI, height, normalAt, zone, pathDist, vnoise, fbm, smooth } from './terrain.js';
import { makeFlora } from './flora.js';
import { buildVillage, CORRAL } from './village.js';
import { buildLife } from './life.js';

const rng = mulberry32(1545);
const R = (a, b) => a + (b - a) * rng();
// cantidad de vegetación: se elige en Opciones (o con ?q=0.5 en la dirección)
const Q = Math.min(2, Math.max(0.2, parseFloat(new URLSearchParams(location.search).get('q')) || parseFloat(JSON.parse(localStorage.getItem('leftraru.opciones') || '{}').detalle) || 1));

// color del suelo según la zona
const GROUND = { forest: 0x55472f, grassy: 0x526a32, needles: 0x62452e, moss: 0x4c5a38, meadow: 0x587834, marsh: 0x40593c, earth: 0x7a6248, path: 0x94805f, pebble: 0x908c80, bed: 0x5c6456, rock: 0x74767a, alpine: 0x6c7040 };
const GC = {}; for (const k in GROUND) GC[k] = new THREE.Color(GROUND[k]);

export function buildWorld(scene, RAPIER, physics) {
  const fixed = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const bag = new GeoBag(), flora = makeFlora({ rng, scene, physics, RAPIER, fixed });

  // ---------- terreno: malla fina para ver, malla más gruesa para chocar ----------
  { const NX = B.x1 - B.x0, NZ = B.z1 - B.z0, P = new Float32Array((NX + 1) * (NZ + 1) * 3), C = new Float32Array(P.length), U = new Float32Array((NX + 1) * (NZ + 1) * 2), F = new Float32Array((NX + 1) * (NZ + 1) * 4), RK = new Float32Array((NX + 1) * (NZ + 1)), I = new Uint32Array(NX * NZ * 6), c = new THREE.Color(),
      // cuánto de cada foto lleva cada zona: [bosque, tierra, pasto, piedras, roca]
      MIXT = { forest: [1, 0, 0, 0, 0], moss: [0.85, 0, 0.15, 0, 0], needles: [0.75, 0.2, 0, 0, 0], grassy: [0.3, 0, 0.7, 0, 0], meadow: [0, 0, 1, 0, 0], alpine: [0, 0.1, 0.6, 0, 0.3], marsh: [0.3, 0, 0.6, 0, 0], earth: [0, 1, 0, 0, 0], path: [0, 1, 0, 0, 0], pebble: [0, 0, 0, 1, 0], bed: [0, 0, 0, 0.9, 0], rock: [0, 0, 0, 0, 1] };
    for (let j = 0, k = 0, u = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++, k += 3, u += 2) {
      const x = B.x0 + i, z = B.z0 + j, h = height(x, z), ny = normalAt(x, z)[1];
      // el color se promedia con puntos vecinos para que las zonas se fundan
      c.setRGB(0, 0, 0); const mx = [0, 0, 0, 0, 0]; for (let s = 0; s < 3; s++) { const jx = x + (vnoise(x * 0.9 + s * 7, z * 0.9) - 0.5) * 3.5, jz = z + (vnoise(x * 0.9, z * 0.9 + s * 5) - 0.5) * 3.5, zk = zone(jx, jz, height(jx, jz), ny); c.add(GC[zk]); for (let q = 0; q < 5; q++) mx[q] += MIXT[zk][q] / 3; } F.set(mx.slice(0, 4), (u / 2) * 4); RK[u / 2] = mx[4];
      const sh = (0.8 + 0.3 * vnoise(x * 0.35, z * 0.35) + 0.15 * vnoise(x * 0.05, z * 0.05)) * (0.9 + 0.2 * fbm(x * 0.02, z * 0.02));
      P[k] = x; P[k + 1] = h; P[k + 2] = z; C[k] = c.r * sh; C[k + 1] = c.g * sh; C[k + 2] = c.b * sh; U[u] = x / 3.3; U[u + 1] = z / 3.3;
    }
    for (let j = 0, k = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, cc = a + NX + 1, d = cc + 1; I[k++] = a; I[k++] = cc; I[k++] = b; I[k++] = b; I[k++] = cc; I[k++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setAttribute('aTex', new THREE.BufferAttribute(F, 4)); g.setAttribute('aRock', new THREE.BufferAttribute(RK, 1)); g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, groundMaterial()); m.receiveShadow = true; scene.add(m);
  }
  { const ST = 2, NX = (B.x1 - B.x0) / ST, NZ = (B.z1 - B.z0) / ST, verts = new Float32Array((NX + 1) * (NZ + 1) * 3), idx = new Uint32Array(NX * NZ * 6);
    for (let j = 0, k = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++, k += 3) { const x = B.x0 + i * ST, z = B.z0 + j * ST; verts[k] = x; verts[k + 1] = height(x, z); verts[k + 2] = z; }
    for (let j = 0, k = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
    physics.createCollider(RAPIER.ColliderDesc.trimesh(verts, idx).setCollisionGroups(0x0002ffff), fixed); // el suelo va en su propio grupo: así la gente, al tantear por dónde pasar, puede no contarlo
  }

  // terreno exterior, más tosco: cerros boscosos al oriente, bajada hacia el mar al poniente
  const hOut = (x, z) => { const cx = Math.min(B.x1, Math.max(B.x0, x)), cz = Math.min(B.z1, Math.max(B.z0, z)), d = Math.hypot(x - cx, z - cz), far = Math.hypot(x, z);
    return (height(cx, cz) + 2) * (1 - smooth(0, 200, d)) + smooth(0, 200, d) * Math.max(-8, 4 + fbm(x * 0.004, z * 0.004) * 34 + (x > 0 ? x * 0.035 : x * 0.05) + smooth(300, 900, far) * (x > -200 ? 120 * fbm(x * 0.0016 + 9, z * 0.0016) : 0)) - 1.6; };
  { const S = 30, N = 90, half = (N * S) / 2, P = [], C = [], I = [], c = new THREE.Color();
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      let x = -half + i * S, z = -half + j * S;
      // los vértices que caerían dentro del mapa se llevan a su borde, para que este terreno tosco nunca tape al fino
      if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) { const dx = Math.min(x - B.x0, B.x1 - x), dz = Math.min(z - B.z0, B.z1 - z); if (dx < dz) x = x - B.x0 < B.x1 - x ? B.x0 : B.x1; else z = z - B.z0 < B.z1 - z ? B.z0 : B.z1; }
      const inside = x >= B.x0 && x <= B.x1 && z >= B.z0 && z <= B.z1, h = inside ? height(x, z) - 0.25 : hOut(x, z); P.push(x, h, z); c.set(h > 95 ? 0x6f7478 : fbm(x * 0.01, z * 0.01) > 0.55 ? 0x3f5a34 : 0x2f4a30).multiplyScalar(0.8 + 0.3 * vnoise(x * 0.02, z * 0.02)); C.push(c.r, c.g, c.b); }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -half + i * S, z = -half + j * S; if (x >= B.x0 && x + S <= B.x1 && z >= B.z0 && z + S <= B.z1) continue; const a = j * (N + 1) + i; I.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    // bosque que continúa más allá del borde del mapa (solo se ve, no se camina)
    for (let i = 0; i < 900 * Q; i++) { const x = R(B.x0 - 230, B.x1 + 230), z = R(B.z0 - 230, B.z1 + 230); if (x > B.x0 - 3 && x < B.x1 + 3 && z > B.z0 - 3 && z < B.z1 + 3) continue; const h = hOut(x, z), u = rng(); if (h > 1) flora.tree(u < 0.45 ? 'coigue' : u < 0.7 ? 'pewen' : 'roble', x, h - 0.3, z, R(12, 22), undefined, false); }
    const sea = new THREE.Mesh(new THREE.CircleGeometry(7000, 48), new THREE.MeshStandardMaterial({ color: 0x1c4660, roughness: 0.25, metalness: 0.2 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -3; scene.add(sea);
  }
  // volcán nevado al oriente
  const VOL = { x: 1500, z: -520, H: 640, R: 620 };
  // Un cono de faldas cóncavas con quebradas y costillas que bajan desde la cumbre, un cráter arriba y su fumarola.
  // La roca, la nieve y la bruma de la distancia van pintadas en la textura (a esta distancia la niebla lo borraría).
  const plume = [];
  { const pts = [], N = 40; for (let i = 0; i <= N; i++) { const u = i / N; pts.push(new THREE.Vector2(VOL.R * Math.pow(1 - u, 1.55) + 26 * (1 - u) + 20, u * VOL.H)); }
    pts.push(new THREE.Vector2(13, VOL.H - 9), new THREE.Vector2(0, VOL.H - 16)); // el cráter: el borde y el hueco
    const g = new THREE.LatheGeometry(pts, 96), P = g.attributes.position, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x), u = y / VOL.H, k = 1 + (0.075 * Math.sin(a * 9 + u * 2) + 0.045 * Math.sin(a * 23 + 1.3) + 0.022 * Math.sin(a * 46 + u * 5)) * (0.35 + 0.65 * (1 - u)); P.setX(i, x * k); P.setZ(i, z * k); U.setY(i, Math.min(1, u)); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: TEX.volcan, roughness: 0.95, fog: false, emissiveMap: TEX.volcan, emissive: 0xffffff, emissiveIntensity: 0.3 })); m.position.set(VOL.x, 20, VOL.z); scene.add(m);
    // la fumarola: el pillán respira. Unas nubes suaves que suben del cráter y se las lleva el viento
    for (let i = 0; i < 7; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soft, color: 0xf2f0ea, transparent: true, opacity: 0.5 - i * 0.06, depthWrite: false, fog: false })); sp.position.set(VOL.x + i * i * 10, 20 + VOL.H + 6 + i * 38, VOL.z - i * 12); sp.scale.setScalar(80 + i * 52); sp.userData = { i, x: sp.position.x, y: sp.position.y }; scene.add(sp); plume.push(sp); }
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
    else if (zk === 'forest') { kind = u < 0.4 ? 'coigue' : u < 0.68 ? 'roble' : u < 0.84 ? 'pewen' : 'canelo'; sp = 8.5; }
    else if (zk === 'grassy') { kind = u < 0.3 ? 'peumo' : u < 0.55 ? 'boldo' : u < 0.8 ? 'quillay' : 'litre'; sp = 8; } // manchones de bosque esclerófilo en lo más soleado
    else if (zk === 'alpine' && h < 40 && u < 0.6) { kind = 'pewen'; sp = 14; }
    else if (zk === 'marsh' && u < 0.5) { kind = 'canelo'; sp = 12; }
    else continue;
    if (near(x, z, sp)) continue;
    const young = kind === 'pewen' && rng() < 0.16;
    const H = kind === 'pewen' ? (young ? R(4, 8) : zk === 'alpine' ? R(12, 18) : R(20, 32)) : { giant: R(30, 40), canelo: R(7, 12), roble: R(16, 25), coigue: R(18, 30), peumo: R(9, 14), boldo: R(6, 10), quillay: R(9, 15), litre: R(4, 7) }[kind]; // alturas reales de cada especie
    const t = { x, z, y: h, H, kind }; trees.push(t); const k = gk(x, z); (grid.get(k) || grid.set(k, []).get(k)).push(t);
    t.rec = flora.tree(young ? 'pewenYoung' : kind, x, h - 0.1, z, H);
    if (kind === 'coigue' && rng() < 0.3) { const a = R(0, 6.28), rr = H * 0.0273 * 1.15 + 0.1; flora.scatter('copihue', x + Math.cos(a) * rr, h + R(0.3, 1.2), z + Math.sin(a) * rr, R(0.9, 1.3)); } // copihue trepando por el tronco
  }

  // ---------- pasto, flores, helechos, arbustos, rocas y troncos ----------
  const FL = [0xfff2a0, 0xffffff, 0xd9a8e6];
  for (let i = 0, n = 150000 * Q; i < n; i++) {
    const x = R(B.x0 + 2, B.x1 - 2), z = R(B.z0 + 2, B.z1 - 2), h = height(x, z);
    if (h < WATER_Y + 0.05 || pathDist(x, z) < 1.3 || Math.hypot(x, z) < 15) continue; // el patio del fogón es tierra pisada: nada crece ahí
    const zk = zone(x, z, h, normalAt(x, z)[1]), u = rng();
    if (zk === 'meadow') { if (u < 0.5) flora.scatter('grass', x, h, z, R(0.9, 1.5), 0xd8e8b0); else if (u < 0.72) flora.scatter('grass2', x, h, z, R(0.8, 1.3), 0xe8e4b8); else if (u < 0.8) flora.scatter('murtilla', x, h, z, R(0.9, 1.5)); else if (u < 0.9) continue; else flora.scatter('flower', x, h, z, R(0.8, 1.2), FL[(u * 1000 | 0) % 3]); }
    else if (zk === 'grassy') { if (u < 0.3) flora.scatter('grass', x, h, z, R(0.8, 1.3)); else if (u < 0.5) flora.scatter('grass2', x, h, z, R(0.7, 1.2), 0xe6dca8); else if (u < 0.56) flora.scatter('michay', x, h, z, R(0.8, 1.3)); else if (u < 0.64) flora.scatter('murtilla', x, h, z, R(0.9, 1.6)); else if (u < 0.68) flora.scatter('flower', x, h, z, R(0.7, 1), FL[(u * 1000 | 0) % 3]); }
    else if (zk === 'alpine') { if (u < 0.35) flora.scatter('grass', x, h, z, R(0.6, 1.0), 0xe6dc9a); else if (u < 0.6) flora.scatter('grass2', x, h, z, R(0.6, 1.0), 0xe8d898); }
    else if (zk === 'marsh') { if (u < 0.45) flora.scatter('reed', x, h, z, R(0.8, 1.3)); else if (u < 0.65) flora.scatter('grass', x, h, z, R(1, 1.5), 0xb8d8a8); else if (u < 0.71) flora.scatter('nalca', x, h, z, R(0.9, 1.6)); else if (u < 0.74) flora.scatter('chilco', x, h, z, R(0.8, 1.2)); }
    else if (zk === 'pebble') { if (u < 0.1) flora.scatter('reed', x, h, z, R(0.7, 1.1)); else if (u < 0.125) flora.scatter('nalca', x, h, z, R(0.8, 1.4)); }
    else if (zk === 'earth') { if (u < 0.06) flora.scatter(u < 0.04 ? 'grass' : 'grass2', x, h, z, R(0.4, 0.8), 0xe0d8a0); } // matas ralas donde la tierra no está tan pisada
    else if (zk === 'forest') { if (u < 0.1) flora.scatter('grass', x, h, z, R(0.6, 1.0), 0xc8d8a0); else if (u < 0.2) flora.scatter('fern', x, h, z, R(0.8, 1.3)); else if (u < 0.225) flora.scatter('chilco', x, h, z, R(0.8, 1.3)); else if (u < 0.25) flora.scatter('murtilla', x, h, z, R(0.9, 1.5)); else if (u < 0.27) flora.scatter('michay', x, h, z, R(0.8, 1.2)); else if (u < 0.55) flora.scatter('litter', x, h, z, R(0.7, 1.3), near(x, z, 6) && rng() < 0.5 ? 0xf0d890 : 0xb09070); }
    else if (zk === 'moss') { if (u < 0.3) flora.scatter('fern', x, h, z, R(1, 1.9)); else if (u < 0.33) flora.scatter('chilco', x, h, z, R(0.9, 1.4)); else if (u < 0.345) flora.scatter('nalca', x, h, z, R(0.9, 1.5)); else if (u < 0.36) flora.scatter('grass', x, h, z, R(0.6, 1), 0xa8c090); else if (u < 0.55) flora.scatter('litter', x, h, z, R(0.7, 1.3), 0x8a8a5a); }
    else if (zk === 'needles') { if (u < 0.05) flora.scatter('fern', x, h, z, R(0.7, 1.1)); else if (u < 0.09) flora.scatter('grass', x, h, z, R(0.5, 0.8), 0xd8d0a0); else if (u < 0.2) flora.scatter('litter', x, h, z, R(0.7, 1.2), 0x9a7050); }
  }
  for (let i = 0, n = 2600 * Q; i < n; i++) {
    const x = R(B.x0 + 2, B.x1 - 2), z = R(B.z0 + 2, B.z1 - 2), h = height(x, z);
    if (h < WATER_Y - 0.9 || Math.hypot(x, z) < 34 || pathDist(x, z) < 4 || pin.some((p) => Math.hypot(x - p.x, z - p.z) < 4)) continue;
    const zk = zone(x, z, h, normalAt(x, z)[1]), u = rng();
    if (zk === 'forest' || zk === 'grassy') { if (u < 0.2) flora.tree('bush', x, h, z, R(0.9, 1.9)); else if (u < 0.45) flora.scatter('quila', x, h, z, R(0.8, 1.3)); else if (u < 0.6) flora.rock(x, h - 0.1, z, R(0.4, 1.3)); else if (u < 0.66) flora.log(x, h, z, R(3, 6), R(0.25, 0.45), R(0, 3.14)); }
    else if (zk === 'moss') { if (u < 0.18) flora.tree('bush', x, h, z, R(1.2, 2.2)); else if (u < 0.3) flora.scatter('quila', x, h, z, R(1, 1.5)); else if (u < 0.45) flora.log(x, h, z, R(4, 8), R(0.4, 0.7), R(0, 3.14)); else if (u < 0.65) flora.rock(x, h - 0.1, z, R(0.6, 1.6), { color: 0xa4b094 }); }
    else if (zk === 'needles') { if (u < 0.25) flora.rock(x, h - 0.1, z, R(0.4, 1.1)); }
    else if (zk === 'pebble' || zk === 'bed') { if (u < 0.8) flora.rock(x, h - 0.15, z, R(0.3, 1.0), { squash: 0.6, color: 0xc4c0b4 }); }
    else if (zk === 'meadow') { if (u < 0.25) flora.tree('bush', x, h, z, R(1, 1.8)); }
    else if (zk === 'alpine' || zk === 'rock') { if (u < 0.7) flora.rock(x, h - 0.15, z, R(0.5, 1.9)); }
  }

  for (let i = 0, n = 5000 * Q; i < n; i++) { const x = R(B.x0 + 2, B.x1 - 2), z = R(B.z0 + 2, B.z1 - 2), h = height(x, z); if (h > WATER_Y - 0.5) flora.rock(x, h - 0.02, z, R(0.05, 0.16), { squash: 0.6, color: rng() < 0.5 ? 0xb8b0a0 : 0x9a9284 }); } // piedritas

  // El claro del maqui tiene de verdad maqui: un grupo de matas alrededor del centro, que es donde apunta el mapa.
  // (El reparto al azar no pone nada a menos de 4 pasos de un sendero, y el sendero termina justo ahí: quedaba vacío.)
  // Van en media luna, dejando libre el lado por donde llega el sendero.
  [[70, 4.2, 1.3], [110, 5.8, 1.15], [150, 4.2, 1.45], [190, 5.8, 1.2], [230, 4.2, 1.35], [270, 5.8, 1.1], [300, 4.4, 1.25]].forEach(([deg, r, sz], i) => {
    const a = deg * Math.PI / 180, x = POI.maqui.x + Math.cos(a) * r, z = POI.maqui.z + Math.sin(a) * r; flora.bushAt(x, height(x, z), z, sz, i * 1.7, i); });

  // ---------- aldea, cielo y vida ----------
  const emit = buildVillage({ scene, rng, bag, flora, physics, RAPIER, fixed });
  scene.add(bag.build());
  const tris = flora.build();
  buildSky(scene);
  // rayos de sol que se cuelan entre las copas, en las zonas de bosque
  { const pts = []; for (let i = 0; i < 4000 && pts.length < 190 * Q; i++) { const x = R(B.x0 + 10, B.x1 - 10), z = R(B.z0 + 10, B.z1 - 10), h = height(x, z), zk = zone(x, z, h, 1); if ((zk === 'forest' || zk === 'needles' || zk === 'moss') && near(x, z, 9)) pts.push([x, h - 1, z, R(1.2, 3.4), R(22, 38)]); } buildShafts(scene, pts); }
  const life = buildLife({ scene, rng, emit, trees, physics, RAPIER });

  // ---------- piñones (coleccionables) ----------
  // La cáscara lleva su textura (clara en la base, castaño rojizo y lustrosa hacia la punta) y brilla apenas por sí sola
  // para que se distinga a la sombra del bosque; un resplandor suave avisa de lejos que hay algo que recoger.
  const pm = new THREE.MeshStandardMaterial({ map: TEX.pinon, bumpMap: TEX.pinon, bumpScale: 0.6, roughness: 0.36, emissiveMap: TEX.pinon, emissive: 0xffffff, emissiveIntensity: 0.3 });
  const gm = new THREE.SpriteMaterial({ map: TEX.soft, color: 0xffd58a, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  // la semilla del pewen: una cuña alargada, angosta en la base y gruesa arriba, que remata en una puntita
  const seed = new THREE.LatheGeometry([[0, 0], [0.018, 0.015], [0.038, 0.1], [0.056, 0.21], [0.066, 0.3], [0.062, 0.36], [0.046, 0.4], [0.02, 0.418], [0.012, 0.435], [0, 0.442]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const items = pin.map((p) => {
    const g = new THREE.Group(); g.position.copy(p);
    const core = new THREE.Group(); for (let i = 0; i < 3; i++) { const sd = new THREE.Mesh(seed, pm); sd.scale.z = 0.62; sd.rotation.set(0.5, i * 2.1, 0.35 * (i - 1)); sd.position.set(Math.cos(i * 2.1) * 0.07, -0.2, Math.sin(i * 2.1) * 0.07); sd.castShadow = true; core.add(sd); }
    const halo = new THREE.Sprite(gm); halo.scale.setScalar(1.25);
    g.add(core, halo); scene.add(g);
    return { mesh: g, base: p.clone(), taken: false };
  });

  return {
    items, trees, life, strokes: Math.round(tris), refugio: emit.refugio, // refugio: dónde arde el fuego del refugio del bosque
    nearTree(x, z, r) { const ci = Math.floor(x / 8), cj = Math.floor(z / 8); let best = null; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = grid.get(ci + i + ',' + (cj + j)); if (l) for (const t of l) { const d = Math.hypot(t.x - x, t.z - z); if (d < r && (!best || d < best.d)) best = { ...t, d }; } } return best; },
    nearPlant: flora.nearScatter, findPlant: flora.findScatter, nearBush: flora.nearBush, bushesIn: flora.bushesIn, blockers: flora.blockers, clearView: flora.clearView, restoreView: flora.restoreView, volcano: new THREE.Vector3(VOL.x, 380, VOL.z),
    update(dt, t, camPos, playerPos, speed) { flora.update(camPos); life.update(dt, t, playerPos, speed); for (const sp of plume) { sp.position.x = sp.userData.x + Math.sin(t * 0.13 + sp.userData.i * 2) * 9; sp.position.y = sp.userData.y + Math.sin(t * 0.21 + sp.userData.i) * 5; } if (emit.glow) { emit.glow.intensity = 12 + Math.sin(t * 11) * 2.5 + Math.sin(t * 23.7) * 1.5; emit.ember.emissiveIntensity = 1.8 + Math.sin(t * 3.1) * 0.5 + Math.sin(t * 7.3) * 0.25; } },
  };
}
