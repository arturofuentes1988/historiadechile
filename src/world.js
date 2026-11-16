// Mundo del Acto I: un claro en el bosque de pewenes (araucarias) de Nahuelbuta.
import * as THREE from 'three';
import { StrokeBatch, PAL, shade, mulberry32, paintMaterial, skyDome, hex } from './strokes.js';

const rng = mulberry32(1546);
const R = (a, b) => a + (b - a) * rng();
// ?q=0.5 reduce la cantidad de trazos en equipos lentos
const Q = Math.min(2, Math.max(0.2, parseFloat(new URLSearchParams(location.search).get('q')) || 1));

// --- ruido determinista para el terreno ---
function h2(ix, iz) { const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z); let fx = x - ix, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), d = h2(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function fbm(x, z) { return vnoise(x, z) * 0.5 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.2; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function height(x, z) {
  const r = Math.hypot(x, z);
  const base = fbm(x * 0.012 + 5, z * 0.012 + 9) * 14 - 7 + fbm(x * 0.06 + 10, z * 0.06) * 1.6;
  return base * smooth(8, 30, r) * 0.8 + smooth(70, 104, r) * 20;
}
function normalAt(x, z) {
  const e = 0.6, dx = height(x + e, z) - height(x - e, z), dz = height(x, z + e) - height(x, z - e);
  const l = Math.hypot(dx, 2 * e, dz); return [-dx / l, (2 * e) / l, -dz / l];
}

export const PLAY_RADIUS = 86;
export const STAIRS = { x: 20, z: -14, steps: 4, gap: 2.7, rise: 0.8 };

export function buildWorld(scene, RAPIER, physics) {
  const fixed = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());

  // ---------- terreno (malla base + colisión) ----------
  const N = 150, SIZE = 224, verts = new Float32Array((N + 1) * (N + 1) * 3), cols = new Float32Array((N + 1) * (N + 1) * 3);
  const idx = new Uint32Array(N * N * 6);
  const groundPal = (x, z, ny) => {
    if (ny < 0.8) return PAL.rock;
    const r = Math.hypot(x, z) + (vnoise(x * 0.15, z * 0.15) - 0.5) * 16;
    if (r < 30) return PAL.grass;
    return vnoise(x * 0.07 + 40, z * 0.07) > 0.62 ? PAL.grass : PAL.floor;
  };
  for (let j = 0, k = 0; j <= N; j++) for (let i = 0; i <= N; i++, k += 3) {
    const x = (i / N - 0.5) * SIZE, z = (j / N - 0.5) * SIZE, n = normalAt(x, z);
    verts[k] = x; verts[k + 1] = height(x, z); verts[k + 2] = z;
    const c = groundPal(x, z, n[1])[1]; cols[k] = c[0]; cols[k + 1] = c[1]; cols[k + 2] = c[2];
  }
  for (let j = 0, k = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  tg.setIndex(new THREE.BufferAttribute(idx, 1)); tg.computeVertexNormals();
  scene.add(new THREE.Mesh(tg, paintMaterial({ vertexColors: true })));
  physics.createCollider(RAPIER.ColliderDesc.trimesh(verts, idx), fixed);
  const far = new THREE.Mesh(new THREE.RingGeometry(104, 1400, 64), paintMaterial({ color: 0x4f6b4c, fogScale: 0.2 }));
  far.rotation.x = -Math.PI / 2; far.position.y = 15; scene.add(far);

  // ---------- piñones y escalera de rocas ----------
  const stairTop = [];
  const baseH = height(STAIRS.x, STAIRS.z);
  for (let i = 0; i < STAIRS.steps; i++) stairTop.push({ x: STAIRS.x + i * STAIRS.gap, z: STAIRS.z + (i % 2) * 0.5, top: baseH + STAIRS.rise * (i + 1), half: i === STAIRS.steps - 1 ? 1.6 : 1.15 });
  const last = stairTop[stairTop.length - 1];
  const pinones = [[6, -5], [-18, 9], [10, 25], [-31, -22]].map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.9, z));
  pinones.push(new THREE.Vector3(last.x, last.top + 1.0, last.z));

  // ---------- árboles ----------
  const trees = [];
  const keepOut = (x, z) => {
    if (Math.hypot(x, z) < 9) return true;
    for (const p of pinones) if (Math.hypot(x - p.x, z - p.z) < 3.5) return true;
    return x > STAIRS.x - 5 && x < last.x + 5 && Math.abs(z - STAIRS.z) < 5;
  };
  for (let tries = 0; trees.length < 135 && tries < 6000; tries++) {
    const a = R(0, Math.PI * 2), r = Math.sqrt(R(0.008, 1)) * 100, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z) || trees.some((t) => Math.hypot(t.x - x, t.z - z) < 5.5)) continue;
    trees.push({ x, z, y: height(x, z), H: R(13, 23), rad: R(0.35, 0.55) });
  }

  const near = new StrokeBatch(), leaves = new StrokeBatch(), distant = new StrokeBatch();

  // ---------- trazos del suelo ----------
  const sx = 0.55 * 3.2, sz = 0.35 * 3.2; // sombra proyectada (dirección contraria al sol)
  const cell = new Map();
  for (const t of trees) { const k = Math.floor(t.x / 8) + ',' + Math.floor(t.z / 8); (cell.get(k) || cell.set(k, []).get(k)).push(t); }
  const inShadow = (x, z) => {
    const cx = Math.floor((x + sx) / 8), cz = Math.floor((z + sz) / 8);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const l = cell.get(cx + i + ',' + (cz + j)); if (!l) continue;
      for (const t of l) if (Math.hypot(x - (t.x - sx), z - (t.z - sz)) < 3.4) return true;
    }
    return false;
  };
  for (let i = 0; i < 230000 * Q; i++) {
    const a = R(0, Math.PI * 2), r = Math.sqrt(rng()) * 110, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const n = normalAt(x, z), pal = groundPal(x, z, n[1]);
    const c = shade(pal, n[0] + R(-0.2, 0.2), n[1], n[2] + R(-0.2, 0.2), rng, inShadow(x, z) ? -0.6 : 0.1);
    const big = 1 + smooth(40, 100, r) * 0.9;
    near.add(x, height(x, z), z, n[0] + R(-0.3, 0.3), n[1], n[2] + R(-0.3, 0.3), R(0.8, 1.6) * big, R(0.3, 0.55) * big, R(-0.5, 0.5) + vnoise(x * 0.05, z * 0.05) * 2, c);
  }

  // ---------- pewenes (araucarias) ----------
  for (const t of trees) {
    for (let i = 0, n = Math.round(t.H * 11); i < n; i++) { // tronco
      const a = R(0, Math.PI * 2), y = R(-0.3, t.H * 0.97), rr = t.rad * (1 - 0.45 * (y / t.H));
      const nx = Math.cos(a), nz = Math.sin(a);
      near.add(t.x + nx * rr, t.y + y, t.z + nz * rr, nx, 0.05, nz, R(0.9, 1.6), R(0.3, 0.5), Math.PI / 2 + R(-0.15, 0.15), shade(PAL.trunk, nx, 0.1, nz, rng));
    }
    const W = 5, y0 = t.H * 0.74, sc = t.H / 18;
    for (let w = 0; w < W; w++) { // copa en forma de paraguas
      const tt = w / (W - 1), yw = t.y + y0 + (t.H - y0) * tt, L = (5.6 - 3.9 * tt * tt) * sc, k = 8, off = R(0, 6.28);
      for (let b = 0; b < k; b++) {
        const a = off + (b / k) * Math.PI * 2 + R(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a), m = Math.ceil(L / 0.55);
        for (let j = 1; j <= m; j++) {
          const u = j / m, r = L * u, y = yw + (-0.5 * Math.sin(u * Math.PI) + 1.5 * u * u * u) * sc * (1 - tt * 0.5);
          if (u < 0.3 || (u < 0.6 && rng() < 0.45)) continue;
          const px = t.x + ca * r, pz = t.z + sa * r;
          leaves.add(px, y - 0.25, pz, 0, 0, 0, R(0.9, 1.4), R(0.45, 0.7), R(-0.6, 0.6), shade(PAL.pewen, ca * 0.3, -0.7, sa * 0.3, rng), 1);
          leaves.add(px + R(-0.2, 0.2), y + 0.1, pz + R(-0.2, 0.2), 0, 0, 0, R(0.8, 1.3), R(0.4, 0.6), R(-0.6, 0.6), shade(PAL.pewen, ca * 0.5, 0.6, sa * 0.5, rng, 0.1), 1);
        }
      }
    }
    if (Math.hypot(t.x, t.z) < PLAY_RADIUS) physics.createCollider(RAPIER.ColliderDesc.cylinder(t.H / 2, t.rad * 0.9).setTranslation(t.x, t.y + t.H / 2 - 0.5, t.z), fixed);
  }

  // ---------- rocas (cajas pintadas) ----------
  const rockMat = paintMaterial({ color: 0x74777f });
  const addRock = (x, yTop, z, hx, hz, depth, yaw) => {
    const hy = depth / 2, cy = yTop - hy;
    const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, depth, hz * 2), rockMat);
    m.position.set(x, cy, z); m.rotation.y = yaw; scene.add(m);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    physics.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, cy, z).setRotation(q), fixed);
    const c = Math.cos(yaw), s = Math.sin(yaw), put = (lx, ly, lz, nx, ny, nz) => {
      const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c, wnx = nx * c + nz * s, wnz = -nx * s + nz * c;
      near.add(wx, cy + ly, wz, wnx + R(-0.25, 0.25), ny + R(-0.1, 0.1), wnz + R(-0.25, 0.25), R(0.6, 1.2), R(0.3, 0.5), R(-1, 1), shade(PAL.rock, wnx, ny, wnz, rng));
    };
    const area = hx * hz * 4, side = depth * (hx + hz) * 4;
    for (let i = 0; i < area * 9; i++) put(R(-hx, hx), hy, R(-hz, hz), 0, 1, 0);
    for (let i = 0; i < side * 5; i++) {
      const f = Math.floor(R(0, 4)), y = R(-hy, hy);
      if (f === 0) put(hx, y, R(-hz, hz), 1, 0, 0); else if (f === 1) put(-hx, y, R(-hz, hz), -1, 0, 0);
      else if (f === 2) put(R(-hx, hx), y, hz, 0, 0, 1); else put(R(-hx, hx), y, -hz, 0, 0, -1);
    }
  };
  for (const s of stairTop) addRock(s.x, s.top, s.z, s.half, s.half, 3.2 + s.top - baseH, R(-0.25, 0.25));
  for (let i = 0; i < 26; i++) {
    const a = R(0, 6.28), r = R(12, 80), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z) || trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    const s = R(0.5, 1.5); addRock(x, height(x, z) + s * R(0.6, 1.1), z, s, s * R(0.7, 1.2), s * 2.4, R(0, 3.14));
  }

  // ---------- sotobosque: helechos y copihues ----------
  for (let i = 0; i < 2600 * Q; i++) {
    const a = R(0, 6.28), r = R(7, 100), x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z);
    const red = rng() < 0.07, pal = red ? PAL.copihue : PAL.fern;
    for (let j = 0, n = red ? 3 : 6; j < n; j++)
      leaves.add(x + R(-0.5, 0.5), y + R(0.15, red ? 0.9 : 0.7), z + R(-0.5, 0.5), 0, 0, 0, red ? R(0.18, 0.3) : R(0.5, 0.9), red ? R(0.25, 0.4) : R(0.18, 0.3), R(-1.3, 1.3), shade(pal, 0, R(-0.4, 0.9), 0, rng), 1);
  }

  // ---------- lejanía: cordones de cerros y el volcán ----------
  for (let i = 0; i < 9000; i++) {
    const a = R(0, 6.28), ring = Math.floor(R(0, 3)), rad = 190 + ring * 110 + R(-20, 20);
    const ridge = 26 + ring * 22 + fbm(a * 3 + ring * 7, ring) * (40 + ring * 30), y = Math.sqrt(rng()) * ridge;
    const p = PAL.hills, c = shade(ring === 0 ? PAL.pewen.map((v, q) => v.map((e, w) => (e + p[q][w]) / 2)) : p, -Math.cos(a) * 0.4, 0.6, -Math.sin(a) * 0.4, rng);
    distant.add(Math.cos(a) * rad, y + 2, Math.sin(a) * rad, -Math.cos(a), 0.7, -Math.sin(a), R(22, 40), R(9, 15), R(-0.3, 0.3), c);
  }
  const V = { x: -260, z: -620, H: 300, R: 250 };
  for (let i = 0; i < 4200; i++) {
    const u = Math.pow(rng(), 1.5), a = R(0, 6.28), rad = V.R * Math.pow(1 - u, 1.35) + 6, nx = Math.cos(a), nz = Math.sin(a);
    const snowy = u > 0.42 + (vnoise(a * 4, u * 6) - 0.5) * 0.3;
    distant.add(V.x + nx * rad, 10 + u * V.H, V.z + nz * rad, nx, 0.75, nz, R(18, 34), R(7, 12), R(0.9, 1.4) * (rng() < 0.5 ? 1 : -1), shade(snowy ? PAL.snow : PAL.volcano, nx, 0.45, nz, rng));
  }

  scene.add(skyDome());
  scene.add(distant.build({ fogScale: 0.1, fogMax: 0.6 }));
  scene.add(near.build());
  scene.add(leaves.build({ sway: 1 }));

  // humo lejano (aparece al final del acto)
  const sm = new StrokeBatch(), S = { x: 120, z: 150 };
  for (let i = 0; i < 260; i++) { const u = rng(), y = 30 + u * 110; sm.add(S.x + u * 45 + R(-1, 1) * (4 + u * 14), y, S.z + R(-1, 1) * (4 + u * 14), 0, 0, 0, R(9, 18), R(5, 9), R(-1, 1), shade(PAL.smoke, 0, R(-0.5, 0.9), 0, rng), 1); }
  const smoke = sm.build({ fogScale: 0.1, fogMax: 0.5, sway: 14 }); smoke.visible = false; scene.add(smoke);

  // ---------- piñones (coleccionables) ----------
  const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(...hex(0xf2b441)) }), gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(...hex(0xfff0b0)), transparent: true, opacity: 0.35, depthWrite: false });
  const items = pinones.map((p) => {
    const g = new THREE.Group(); g.position.copy(p);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), pm); core.rotation.z = Math.PI;
    g.add(core, new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), gm)); scene.add(g);
    return { mesh: g, base: p.clone(), taken: false };
  });

  return { items, smoke, smokePos: new THREE.Vector3(S.x + 20, 80, S.z), volcano: new THREE.Vector3(V.x, 200, V.z), strokes: near.n + leaves.n + distant.n };
}
