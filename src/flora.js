// Vegetación, rocas y troncos caídos, todo hecho de pinceladas.
import * as THREE from 'three';
import { PAL, shade } from './strokes.js';

export function makeFlora({ rng, bag, physics, RAPIER, fixed }) {
  const R = (a, b) => a + (b - a) * rng(), PI = Math.PI;

  function trunk(c, x, y, z, H, r0, pal, { taper = 0.5, moss = 0, vine = false } = {}) {
    const n = Math.round(H * (5 + r0 * 9));
    for (let i = 0; i < n; i++) {
      const a = R(0, PI * 2), t = R(-0.02, 1), rr = r0 * (1 - taper * t) * (1 + 0.55 * Math.exp(-t * 16)), nx = Math.cos(a), nz = Math.sin(a);
      const mossy = moss && nz > 0.1 && rng() < moss * (1 - t * 0.7); // musgo en la cara sur, la más húmeda
      c.solid.add(x + nx * rr, y + t * H, z + nz * rr, nx, 0.05, nz, R(0.8, 1.5) * (0.55 + r0), R(0.24, 0.42) * (0.6 + r0 * 0.8), PI / 2 + R(-0.15, 0.15), shade(mossy ? PAL.mossy : pal, nx, 0.1, nz, rng));
    }
    if (vine) for (let i = 0, a0 = R(0, 6.28); i < 16; i++) { // copihue trepando por el tronco
      const t = i / 16, a = a0 + t * 5, rr = r0 * (1 - taper * t * 0.5) + 0.12;
      c.leaf.add(x + Math.cos(a) * rr, y + 0.6 + t * H * 0.45, z + Math.sin(a) * rr, 0, 0, 0, R(0.18, 0.3), R(0.26, 0.4), R(-0.4, 0.4), shade(i % 3 ? PAL.fern : PAL.copihue, 0, R(-0.3, 0.9), 0, rng), 1);
    }
  }

  function collide(x, y, z, H, r) { physics.createCollider(RAPIER.ColliderDesc.cylinder(H / 2, r).setTranslation(x, y + H / 2 - 0.5, z), fixed); }

  // Pewen (araucaria): tronco largo y desnudo, copa en paraguas con penachos en las puntas
  function pewen(c, x, y, z, H) {
    const r0 = H * 0.024 + 0.12, sc = H / 18;
    trunk(c, x, y, z, H, r0, PAL.trunk, { taper: 0.35 });
    const W = 4, y0 = H * 0.8;
    for (let w = 0; w < W; w++) {
      const tt = w / (W - 1), yw = y + y0 + (H - y0) * tt, L = (6.4 - 4.6 * tt) * sc, k = 8 - w, off = R(0, 6.28);
      for (let b = 0; b < k; b++) {
        const a = off + (b / k) * PI * 2 + R(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a), m = Math.ceil(L / 0.5);
        for (let j = 1; j <= m; j++) {
          const u = j / m, r = L * u, yy = yw + (-0.4 * Math.sin(u * PI) + 1.5 * u * u * u) * sc * (1 - tt * 0.5), px = x + ca * r, pz = z + sa * r;
          if (u < 0.7) { if (u > 0.2 && j % 2) c.leaf.add(px, yy, pz, 0, 0, 0, R(0.6, 0.9), 0.13, R(-0.3, 0.3), shade(PAL.trunk, 0, 0.3, 0, rng), 1); if (u < 0.45 || rng() < 0.55) continue; }
          for (let q = 0, nq = u > 0.85 ? 3 : 1; q < nq; q++) {
            c.leaf.add(px + R(-0.3, 0.3), yy - 0.22, pz + R(-0.3, 0.3), 0, 0, 0, R(0.8, 1.3), R(0.42, 0.64), R(-0.6, 0.6), shade(PAL.pewen, ca * 0.4, -0.7, sa * 0.4, rng), 1);
            c.leaf.add(px + R(-0.3, 0.3), yy + 0.12, pz + R(-0.3, 0.3), 0, 0, 0, R(0.7, 1.2), R(0.38, 0.58), R(-0.6, 0.6), shade(PAL.pewen, ca * 0.6, 0.6, sa * 0.6, rng, 0.08), 1);
          }
        }
      }
    }
    for (let i = 0; i < 6; i++) c.leaf.add(x + R(-0.5, 0.5), y + H + R(-0.2, 0.5), z + R(-0.5, 0.5), 0, 0, 0, R(0.7, 1.1), R(0.4, 0.6), R(-0.8, 0.8), shade(PAL.pewen, R(-0.5, 0.5), 0.7, R(-0.5, 0.5), rng, 0.1), 1);
    collide(x, y, z, H, r0 * 0.9);
  }

  // Árbol de hoja ancha (coigüe, roble, canelo): la copa son racimos redondos iluminados por un lado
  function broadleaf(c, x, y, z, H, { leaf = PAL.coigue, bark = PAL.barkGrey, clusters = 7, spread = 0.26, r0 = H * 0.022 + 0.1, moss = 0, vine = false, cone = false, sparse = 1, hollow = false } = {}) {
    trunk(c, x, y, z, H * (cone ? 0.85 : 0.62), r0, bark, { moss, vine });
    for (let i = 0; i < clusters; i++) {
      const a = R(0, 6.28), f = cone ? i / clusters : R(0.55, 1), rad = (cone ? (1 - f) * 0.9 + 0.1 : Math.sqrt(rng())) * H * spread;
      const cx = x + Math.cos(a) * rad, cz = z + Math.sin(a) * rad, cy = y + H * (cone ? 0.35 + f * 0.65 : f) - (cone ? 0 : rad * 0.3), rr = R(1.5, 2.9) * (H / 16) * (cone ? 0.75 : 1);
      for (let j = 0; j < 4; j++) { const u = (j + 1) / 5; c.leaf.add(x + (cx - x) * u, y + H * 0.5 + (cy - y - H * 0.5) * u, z + (cz - z) * u, 0, 0, 0, R(0.7, 1.1), 0.14 + r0 * 0.3 * (1 - u), R(0.5, 1.2), shade(bark, 0, 0.2, 0, rng), 1); }
      for (let j = 0, n = Math.round(rr * rr * 8 * sparse); j < n; j++) {
        let ux = R(-1, 1), uy = R(-0.65, 1), uz = R(-1, 1); const l = Math.hypot(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l;
        const d = rr * R(0.72, 1), s = 0.75 + rr * 0.14;
        c.leaf.add(cx + ux * d, cy + uy * d * 0.8, cz + uz * d, 0, 0, 0, R(0.7, 1.15) * s, R(0.4, 0.62) * s, R(-0.8, 0.8), shade(leaf, ux, uy, uz, rng), 1);
      }
    }
    if (hollow) for (let i = 0; i < 40; i++) c.solid.add(x + r0 * 1.42, y + R(0.1, 2.4), z + R(-0.7, 0.7), 1, 0, 0, R(0.6, 1), R(0.4, 0.6), PI / 2, shade(PAL.dark, 1, 0, 0, rng));
    collide(x, y, z, H * 0.6, r0 * 0.9);
  }

  const fern = (c, x, y, z, s = 1) => { for (let j = 0; j < 6; j++) c.leaf.add(x + R(-0.5, 0.5) * s, y + R(0.15, 0.7) * s, z + R(-0.5, 0.5) * s, 0, 0, 0, R(0.5, 0.9) * s, R(0.18, 0.3) * s, R(-1.3, 1.3), shade(PAL.fern, 0, R(-0.4, 0.9), 0, rng), 1); };
  const tuft = (c, x, y, z, pal = PAL.grass, h = 0.5) => { for (let j = 0; j < 3; j++) c.leaf.add(x + R(-0.15, 0.15), y + h * 0.45, z + R(-0.15, 0.15), 0, 0, 0, R(0.06, 0.1), h * R(0.7, 1.2), R(-0.35, 0.35), shade(pal, 0, R(0, 0.9), 0, rng), 1); };
  const reed = (c, x, y, z) => { for (let j = 0; j < 6; j++) c.leaf.add(x + R(-0.4, 0.4), y + 0.75, z + R(-0.4, 0.4), 0, 0, 0, R(0.07, 0.12), R(1.2, 1.9), R(-0.12, 0.12), shade(PAL.reed, 0, R(-0.2, 0.9), 0, rng), 1); };
  const flower = (c, x, y, z, pal) => { c.leaf.add(x, y + R(0.2, 0.4), z, 0, 0, 0, 0.16, 0.16, R(0, 3), shade(pal, 0, 0.8, 0, rng), 1); };
  function nalca(c, x, y, z) {
    for (let j = 0; j < 4; j++) {
      const px = x + R(-0.8, 0.8), pz = z + R(-0.8, 0.8), h = R(0.6, 1.2), nx = R(-0.5, 0.5), nz = R(-0.5, 0.5);
      c.solid.add(px, y + h, pz, nx, 1, nz, R(1.1, 1.6), R(0.9, 1.3), R(0, 3), shade(PAL.nalca, nx, 1, nz, rng));
      c.leaf.add(px, y + h * 0.5, pz, 0, 0, 0, 0.09, h, 0, shade(PAL.copihue, 0, 0, 0, rng), 1);
    }
  }
  function quila(c, x, y, z) {
    for (let k = 0; k < 9; k++) {
      const a = R(0, 6.28), L = R(2.6, 4.4), ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 1; j <= 7; j++) { const u = j / 7; c.leaf.add(x + ca * u * L * 0.55, y + Math.sin(u * 1.7) * L * 0.72, z + sa * u * L * 0.55, 0, 0, 0, R(0.5, 0.8), R(0.1, 0.16), R(0.5, 1.4) * (ca > 0 ? 1 : -1), shade(PAL.quila, ca * 0.4, 0.3 + u * 0.5, sa * 0.4, rng), 1); }
    }
  }
  function shrub(c, x, y, z, leaf, dots) {
    const rr = R(0.7, 1.2);
    for (let j = 0; j < 30; j++) { let ux = R(-1, 1), uy = R(-0.3, 1), uz = R(-1, 1); const l = Math.hypot(ux, uy, uz) || 1; c.leaf.add(x + (ux / l) * rr, y + 0.9 + (uy / l) * rr * 0.8, z + (uz / l) * rr, 0, 0, 0, R(0.35, 0.55), R(0.22, 0.34), R(-0.8, 0.8), shade(leaf, ux / l, uy / l, uz / l, rng), 1); }
    if (dots) for (let j = 0; j < 9; j++) c.leaf.add(x + R(-1, 1) * rr, y + 0.9 + R(-0.4, 0.7) * rr, z + R(-1, 1) * rr, 0, 0, 0, 0.13, 0.13, 0, shade(dots, 0, 0.6, 0, rng), 1);
  }

  // Roca: malla facetada + trazos por cara + colisión
  const ico = new THREE.IcosahedronGeometry(1, 1);
  function rock(c, x, y, z, s, { squash = 0.7, pal = PAL.rock, moss = 0 } = {}) {
    const g = ico.clone(), P = g.attributes.position, sd = R(0, 100), yaw = R(0, 6.28);
    for (let i = 0; i < P.count; i++) { const vx = P.getX(i), vy = P.getY(i), vz = P.getZ(i), d = 1 + 0.28 * Math.sin(vx * 3.1 + sd) * Math.sin(vy * 2.7 + sd * 1.3) + 0.14 * Math.sin(vz * 5.3 + sd * 0.7); P.setXYZ(i, vx * d, vy * d, vz * d); }
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + s * squash * 0.35, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s * squash, s * R(0.75, 1.15)));
    const out = bag.add(g, m, pal[1]), A = out.attributes.position.array, N = out.attributes.normal.array;
    for (let i = 0; i < A.length; i += 9) {
      const cx = (A[i] + A[i + 3] + A[i + 6]) / 3, cy = (A[i + 1] + A[i + 4] + A[i + 7]) / 3, cz = (A[i + 2] + A[i + 5] + A[i + 8]) / 3, nx = N[i], ny = N[i + 1], nz = N[i + 2];
      for (let q = 0, nq = s > 1.2 ? 2 : 1; q < nq; q++) c.solid.add(cx + R(-0.2, 0.2) * s, cy + R(-0.1, 0.1) * s, cz + R(-0.2, 0.2) * s, nx + R(-0.2, 0.2), ny + R(-0.1, 0.1), nz + R(-0.2, 0.2), R(0.5, 0.85) * s, R(0.26, 0.4) * s, R(-1, 1), shade(moss && ny > 0.3 && rng() < moss ? PAL.mossy : pal, nx, ny, nz, rng));
    }
    if (s > 0.5) physics.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(A)) || RAPIER.ColliderDesc.ball(s), fixed);
  }

  function log(c, x, y, z, len, r, yaw) {
    const dx = Math.cos(yaw), dz = Math.sin(yaw);
    for (let i = 0, n = Math.round(len * 22); i < n; i++) {
      const t = R(-0.5, 0.5) * len, a = R(-0.4, PI + 0.4), ny = Math.sin(a), nh = Math.cos(a), nx = -dz * nh, nz = dx * nh;
      c.solid.add(x + dx * t + nx * r, y + r * 0.7 + ny * r, z + dz * t + nz * r, nx, ny, nz, R(0.25, 0.4), R(0.7, 1.2), yaw + R(-0.2, 0.2), shade(ny > 0.5 && rng() < 0.6 ? PAL.mossy : PAL.trunk, nx, ny, nz, rng));
    }
    physics.createCollider(RAPIER.ColliderDesc.cuboid(len / 2, r * 0.8, r * 0.8).setTranslation(x, y + r * 0.6, z).setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw)), fixed);
  }

  return { trunk, pewen, broadleaf, fern, tuft, reed, flower, nalca, quila, shrub, rock, log };
}
