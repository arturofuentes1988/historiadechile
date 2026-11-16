// Vegetación, rocas y troncos caídos. Los árboles tienen esqueleto (tronco y ramas) y el
// follaje se pinta como en acuarela: primero manchas grandes, encima toques de luz y sombra.
import * as THREE from 'three';
import { PAL, shade } from './strokes.js';

export function makeFlora({ rng, bag, physics, RAPIER, fixed }) {
  const R = (a, b) => a + (b - a) * rng(), PI = Math.PI;

  // Tubo pintado entre dos puntos (tronco o rama), con trazos alargados en su dirección
  function tube(c, x0, y0, z0, x1, y1, z1, r0, r1, pal, { moss = 0, flare = 0 } = {}) {
    let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    let ax = dy * 0 - dz * 1, ay = dz * 0 - dx * 0, az = dx * 1 - dy * 0; // eje perpendicular (d × Y)
    let al = Math.hypot(ax, ay, az); if (al < 0.05) { ax = 1; ay = 0; az = 0; al = 1; } ax /= al; ay /= al; az /= al;
    const bx = dy * az - dz * ay, by = dz * ax - dx * az, bz = dx * ay - dy * ax;
    const rings = Math.max(2, Math.ceil(L / 0.6));
    for (let i = 0; i < rings; i++) {
      const t = (i + rng()) / rings, r = (r0 + (r1 - r0) * t) * (1 + flare * Math.exp(-t * L * 1.6)), n = Math.max(2, Math.ceil((2 * PI * r) / 0.42));
      for (let k = 0; k < n; k++) {
        const a = ((k + rng()) / n) * PI * 2, ca = Math.cos(a), sa = Math.sin(a), nx = ax * ca + bx * sa, ny = ay * ca + by * sa, nz = az * ca + bz * sa;
        const mossy = moss && nz > 0.05 && rng() < moss * (1 - t * 0.6); // musgo en la cara sur, la más húmeda
        c.solid.along(x0 + dx * L * t + nx * r, y0 + dy * L * t + ny * r, z0 + dz * L * t + nz * r, dx, dy, dz, nx, ny, nz, R(0.7, 1.15) * (0.6 + r), Math.max(0.1, R(0.5, 0.8) * (0.28 + r * 0.9)), shade(mossy ? PAL.mossy : pal, nx, ny * 0.4 + 0.1, nz, rng));
      }
    }
  }

  // Masa de follaje: lavados grandes de tono medio y, encima, toques chicos de luz (arriba) y sombra (abajo)
  function foliage(c, cx, cy, cz, rr, pal, dense = 1) {
    for (let i = 0; i < 3; i++) c.leaf.add(cx + R(-0.35, 0.35) * rr, cy + R(-0.3, 0.25) * rr, cz + R(-0.35, 0.35) * rr, 0, 0, 0, rr * R(1.2, 1.7), rr * R(0.9, 1.25), R(-0.6, 0.6), shade(pal, 0, R(-0.25, 0.3), 0, rng, -0.04), 1);
    for (let j = 0, n = Math.round(rr * rr * 7.5 * dense); j < n; j++) {
      let ux = R(-1, 1), uy = R(-0.7, 1), uz = R(-1, 1); const l = Math.hypot(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l;
      const d = rr * R(0.6, 1.06), s = R(0.34, 0.66) * (0.8 + rr * 0.12);
      c.leaf.add(cx + ux * d, cy + uy * d * 0.82, cz + uz * d, 0, 0, 0, s * 1.5, s, R(-1, 1), shade(pal, ux, uy, uz, rng), 1);
    }
  }

  function collide(x, y, z, H, r) { physics.createCollider(RAPIER.ColliderDesc.cylinder(H / 2, r).setTranslation(x, y + H / 2 - 0.5, z), fixed); }

  // Pewen (araucaria): tronco recto de corteza en placas; ramas en pisos que se curvan hacia arriba,
  // cubiertas de hojas duras como cuerdas verdes. Los jóvenes son piramidales.
  function pewen(c, x, y, z, H) {
    const young = H < 9, r0 = H * 0.022 + 0.1, sc = H / 18;
    tube(c, x, y - 0.3, z, x, y + H * 0.97, z, r0, r0 * 0.45, PAL.trunk, { flare: 0.5 });
    const W = young ? 7 : 5, y0 = H * (young ? 0.22 : 0.76);
    for (let w = 0; w < W; w++) {
      const tt = w / (W - 1), yw = y + y0 + (H * 0.97 - y0) * tt, L = (young ? 3.4 * (1 - tt * 0.85) : 6.6 - 4.9 * tt * tt) * sc * (young ? 1.9 : 1), k = young ? 6 : 9 - w, off = R(0, 6.28);
      for (let b = 0; b < k; b++) {
        const a = off + (b / k) * PI * 2 + R(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a), m = Math.max(3, Math.ceil(L / 0.55));
        for (let j = 1; j <= m; j++) {
          const u = j / m, r = L * u, yy = yw + (-0.45 * Math.sin(u * PI) + 1.5 * u * u * u) * sc * (young ? 0.5 : 1 - tt * 0.5), qx = x + ca * r, qz = z + sa * r;
          if (u < 0.75) c.leaf.add(qx, yy, qz, 0, 0, 0, R(0.6, 0.85), 0.1 + 0.06 * sc * (1 - u), R(-0.25, 0.25), shade(PAL.trunk, 0, 0.3, 0, rng), 1); // la rama
          if (u < 0.38) continue;
          const s = (0.5 + 0.3 * sc) * (1 - u * 0.25), tip = j === m ? 3 : 1;
          for (let q = 0; q < tip; q++) {
            c.leaf.add(qx + R(-0.25, 0.25), yy - 0.16, qz + R(-0.25, 0.25), 0, 0, 0, s * R(1.2, 1.6), s * R(0.7, 0.95), R(-0.5, 0.5), shade(PAL.pewen, ca * 0.4, -0.75, sa * 0.4, rng), 1);
            c.leaf.add(qx + R(-0.25, 0.25), yy + 0.14, qz + R(-0.25, 0.25), 0, 0, 0, s * R(1.0, 1.4), s * R(0.55, 0.8), R(-0.5, 0.5), shade(PAL.pewen, ca * 0.55, 0.7, sa * 0.55, rng, 0.06), 1);
          }
        }
      }
    }
    foliage(c, x, y + H, z, (young ? 0.6 : 1.1) * sc + 0.3, PAL.pewen, 0.8);
    collide(x, y, z, H, r0 * 0.9);
  }

  // Árbol de hoja ancha (coigüe, roble, canelo, gigantes del bosque viejo)
  function broadleaf(c, x, y, z, H, { leaf = PAL.coigue, bark = PAL.barkGrey, limbs = 4, spread = 0.27, r0 = H * 0.02 + 0.1, moss = 0, vine = false, cone = false, dense = 1, hollow = false } = {}) {
    const top = H * (cone ? 0.8 : R(0.4, 0.52)), bx = R(-1, 1) * H * 0.03, bz = R(-1, 1) * H * 0.03, tx = x + bx, tz = z + bz, ty = y + top;
    tube(c, x, y - 0.3, z, x + bx * 0.6, y + top * 0.5, z + bz * 0.6, r0, r0 * 0.82, bark, { moss, flare: 0.6 });
    tube(c, x + bx * 0.6, y + top * 0.5, z + bz * 0.6, tx, ty, tz, r0 * 0.82, r0 * (cone ? 0.25 : 0.62), bark, { moss: moss * 0.6 });
    if (cone) { // canelo: ramas cortas en pisos, copa cónica
      for (let i = 0; i < 7; i++) { const f = i / 6, a = R(0, 6.28), rad = (1 - f) * H * spread + 0.3, cy = y + H * (0.3 + f * 0.68), ex = x + bx * f + Math.cos(a) * rad, ez = z + bz * f + Math.sin(a) * rad; tube(c, x + bx * f, cy - 0.3, z + bz * f, ex, cy, ez, r0 * 0.3, 0.04, bark); foliage(c, ex, cy + 0.2, ez, R(1.0, 1.6) * (H / 9) * (1 - f * 0.4), leaf, dense); }
    } else {
      const off = R(0, 6.28);
      for (let i = 0; i < limbs; i++) {
        const a = off + (i / limbs) * PI * 2 + R(-0.4, 0.4), low = i % 2 === 1, out = H * spread * R(0.6, 1), ey = y + H * (low ? R(0.58, 0.74) : R(0.8, 0.96));
        const ex = tx + Math.cos(a) * out, ez = tz + Math.sin(a) * out, mx = tx + Math.cos(a) * out * 0.55, mz = tz + Math.sin(a) * out * 0.55, my = ty + (ey - ty) * 0.45, lr = r0 * R(0.36, 0.5);
        tube(c, tx, ty - 0.2, tz, mx, my, mz, lr, lr * 0.62, bark, { moss: moss * 0.4 }); tube(c, mx, my, mz, ex, ey, ez, lr * 0.62, lr * 0.22, bark);
        const rr = R(1.7, 2.7) * (H / 16);
        foliage(c, ex, ey + rr * 0.25, ez, rr, leaf, dense);
        const a2 = a + R(0.7, 1.3) * (rng() < 0.5 ? 1 : -1), sx = mx + Math.cos(a2) * out * 0.5, sz = mz + Math.sin(a2) * out * 0.5, sy = my + H * R(0.04, 0.14);
        tube(c, mx, my, mz, sx, sy, sz, lr * 0.4, lr * 0.15, bark); foliage(c, sx, sy + 0.3, sz, rr * R(0.6, 0.8), leaf, dense);
      }
      foliage(c, tx, y + H, tz, R(1.6, 2.4) * (H / 16), leaf, dense);
    }
    if (vine) for (let i = 0, a0 = R(0, 6.28); i < 18; i++) { // copihue trepando por el tronco
      const t = i / 18, a = a0 + t * 5, rr = r0 + 0.14;
      c.leaf.add(x + Math.cos(a) * rr, y + 0.6 + t * top * 0.8, z + Math.sin(a) * rr, 0, 0, 0, R(0.18, 0.3), R(0.26, 0.4), R(-0.4, 0.4), shade(i % 3 ? PAL.fern : PAL.copihue, 0, R(-0.3, 0.9), 0, rng), 1);
    }
    if (hollow) for (let i = 0; i < 40; i++) c.solid.add(x + r0 * 1.3, y + R(0.1, 2.4), z + R(-0.7, 0.7), 1, 0, 0, R(0.6, 1), R(0.4, 0.6), PI / 2, shade(PAL.dark, 1, 0, 0, rng));
    collide(x, y, z, H * 0.6, r0 * 0.9);
  }

  const fern = (c, x, y, z, s = 1) => { for (let j = 0, a0 = R(0, 6.28); j < 7; j++) { const a = a0 + j * 0.9, d = R(0.25, 0.6) * s; c.leaf.add(x + Math.cos(a) * d, y + R(0.2, 0.55) * s, z + Math.sin(a) * d, 0, 0, 0, R(0.6, 0.95) * s, R(0.16, 0.26) * s, (Math.cos(a) > 0 ? 1 : -1) * R(0.2, 0.9), shade(PAL.fern, Math.cos(a) * 0.4, R(0, 0.9), Math.sin(a) * 0.4, rng), 1); } };
  const tuft = (c, x, y, z, pal = PAL.grass, h = 0.5) => { for (let j = 0; j < 4; j++) c.leaf.add(x + R(-0.18, 0.18), y + h * 0.45, z + R(-0.18, 0.18), 0, 0, 0, R(0.05, 0.09), h * R(0.7, 1.25), R(-0.4, 0.4), shade(pal, 0, R(0, 0.9), 0, rng), 1); };
  const reed = (c, x, y, z) => { for (let j = 0; j < 6; j++) c.leaf.add(x + R(-0.4, 0.4), y + 0.75, z + R(-0.4, 0.4), 0, 0, 0, R(0.07, 0.12), R(1.2, 1.9), R(-0.12, 0.12), shade(PAL.reed, 0, R(-0.2, 0.9), 0, rng), 1); };
  const flower = (c, x, y, z, pal) => { const h = R(0.2, 0.42); c.leaf.add(x, y + h * 0.5, z, 0, 0, 0, 0.03, h, 0, shade(PAL.grass, 0, 0.4, 0, rng), 1); for (let j = 0; j < 2; j++) c.leaf.add(x + R(-0.05, 0.05), y + h, z + R(-0.05, 0.05), 0, 0, 0, 0.15, 0.13, R(0, 3), shade(pal, 0, R(0.3, 1), 0, rng), 1); };
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
    for (let i = 0; i < 3; i++) tube(c, x, y, z, x + R(-0.5, 0.5), y + R(0.6, 1.1), z + R(-0.5, 0.5), 0.04, 0.02, PAL.trunk);
    foliage(c, x, y + 0.9, z, rr, leaf, 1.6);
    if (dots) for (let j = 0; j < 10; j++) c.leaf.add(x + R(-1, 1) * rr, y + 0.9 + R(-0.4, 0.7) * rr, z + R(-1, 1) * rr, 0, 0, 0, 0.13, 0.13, 0, shade(dots, 0, 0.6, 0, rng), 1);
  }

  // Roca: malla facetada + manchas por cara + colisión
  const ico = new THREE.IcosahedronGeometry(1, 1);
  function rock(c, x, y, z, s, { squash = 0.7, pal = PAL.rock, moss = 0 } = {}) {
    const g = ico.clone(), P = g.attributes.position, sd = R(0, 100), yaw = R(0, 6.28);
    for (let i = 0; i < P.count; i++) { const vx = P.getX(i), vy = P.getY(i), vz = P.getZ(i), d = 1 + 0.28 * Math.sin(vx * 3.1 + sd) * Math.sin(vy * 2.7 + sd * 1.3) + 0.14 * Math.sin(vz * 5.3 + sd * 0.7); P.setXYZ(i, vx * d, vy * d, vz * d); }
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + s * squash * 0.35, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s * squash, s * R(0.75, 1.15)));
    const out = bag.add(g, m, pal[1]), A = out.attributes.position.array, N = out.attributes.normal.array;
    for (let i = 0; i < A.length; i += 9) {
      const cx = (A[i] + A[i + 3] + A[i + 6]) / 3, cy = (A[i + 1] + A[i + 4] + A[i + 7]) / 3, cz = (A[i + 2] + A[i + 5] + A[i + 8]) / 3, nx = N[i], ny = N[i + 1], nz = N[i + 2];
      for (let q = 0, nq = s > 1.2 ? 2 : 1; q < nq; q++) c.solid.add(cx + R(-0.2, 0.2) * s, cy + R(-0.1, 0.1) * s, cz + R(-0.2, 0.2) * s, nx + R(-0.2, 0.2), ny + R(-0.1, 0.1), nz + R(-0.2, 0.2), R(0.5, 0.85) * s, R(0.3, 0.46) * s, R(-1, 1), shade(moss && ny > 0.3 && rng() < moss ? PAL.mossy : pal, nx, ny, nz, rng));
    }
    if (s > 0.5) physics.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(A)) || RAPIER.ColliderDesc.ball(s), fixed);
  }

  function log(c, x, y, z, len, r, yaw) {
    const dx = Math.cos(yaw) * len / 2, dz = Math.sin(yaw) * len / 2;
    tube(c, x - dx, y + r * 0.7, z - dz, x + dx, y + r * 0.7, z + dz, r, r * 0.85, PAL.trunk, { moss: 0.9 });
    for (let i = 0; i < 4; i++) fern(c, x + R(-1, 1) * dx, y + r, z + R(-1, 1) * dz, 0.7);
    physics.createCollider(RAPIER.ColliderDesc.cuboid(len / 2, r * 0.8, r * 0.8).setTranslation(x, y + r * 0.6, z).setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw)), fixed);
  }

  return { tube, foliage, pewen, broadleaf, fern, tuft, reed, flower, nalca, quila, shrub, rock, log };
}
