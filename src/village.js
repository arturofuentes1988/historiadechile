// La aldea y los lugares construidos: rukas, fogón, rewe, corral, telar y otros detalles.
import * as THREE from 'three';
import { PAL, shade, hex } from './strokes.js';
import { height, POI, CERRO } from './terrain.js';

export const RUKAS = [
  { x: -16, z: -8, s: 1.15, name: 'familia', smoke: true }, { x: -10, z: -21, s: 1.0 }, { x: 12, z: -16, s: 1.0, smoke: true },
  { x: 21, z: -2, s: 0.95, name: 'ñamku' }, { x: 15, z: 14, s: 1.05, name: 'machi', smoke: true }, { x: -4, z: 19, s: 1.0 },
];
export const CORRAL = { x: -25, z: 14, r: 6.5 };
export const FOGON = { x: 0, z: 0 };

export function buildVillage({ chunks, rng, bag, flora, physics, RAPIER, fixed }) {
  const R = (a, b) => a + (b - a) * rng(), PI = Math.PI, UP = new THREE.Vector3(0, 1, 0);
  const M = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(1, 1, 1, 8), sph = new THREE.SphereGeometry(1, 10, 8);
  const WOOD = hex(0x5e4630), WOOD2 = hex(0x4a3826), emit = { smoke: [], fire: [] };

  // ---------- ruka: casa de paja con la puerta hacia el oriente ----------
  const prof = [[1, 0], [1.03, 0.9], [0.86, 1.8], [0.5, 2.8], [0.1, 3.55]];
  function ruka({ x, z, s, smoke }) {
    const y = height(x, z) - 0.05, r = 3.3 * s, ez = 0.82, c = chunks.at(x, z);
    bag.add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a * r * 0.97, b * s)), 14), M(x, y, z, 0, 1, 1, ez), hex(0x4f4126));
    for (let i = 0, n = Math.round(520 * s * s); i < n; i++) {
      const a = R(-PI, PI), t = 1 - Math.sqrt(rng()), f = t * 4, k = Math.min(3, Math.floor(f)), u = f - k;
      const pr = (prof[k][0] + (prof[k + 1][0] - prof[k][0]) * u) * r, py = (prof[k][1] + (prof[k + 1][1] - prof[k][1]) * u) * s;
      if (Math.abs(a) < 0.3 && py < 2.0 * s) continue; // hueco de la puerta
      const sl = (prof[k + 1][0] - prof[k][0]) * r / ((prof[k + 1][1] - prof[k][1]) * s), ny = Math.min(0.95, -sl * 0.75), nh = Math.sqrt(1 - ny * ny), nx = Math.cos(a) * nh, nz = Math.sin(a) * nh;
      c.solid.add(x + Math.cos(a) * pr, y + py, z + Math.sin(a) * pr * ez, nx, ny, nz, R(0.9, 1.4), R(0.28, 0.42), PI / 2 + R(-0.12, 0.12), shade(PAL.thatch, nx, ny, nz, rng, Math.floor(py * 2.2) % 2 ? -0.14 : 0.06));
    }
    for (let i = 0; i < 26; i++) c.solid.add(x + r * 0.93, y + R(0.1, 1.9) * s, z + R(-0.8, 0.8) * s, 1, 0, 0, R(0.6, 0.9), R(0.4, 0.6), PI / 2, shade(PAL.dark, 1, 0, 0, rng));
    for (const dz of [-0.95, 0.95]) bag.add(cyl, M(x + r * 0.99, y + 1.05 * s, z + dz * s, 0, 0.1, 2.1 * s, 0.1), WOOD);
    bag.add(cyl, M(x + r * 0.99, y + 2.1 * s, z, PI / 2, 0.1, 2.2 * s, 0.1, PI / 2), WOOD);
    for (const rz of [0.5, -0.5]) bag.add(cyl, M(x, y + 3.6 * s, z, R(0, 3), 0.05, 1.6, 0.05, rz), WOOD2); // palos cruzados en la cumbre
    physics.createCollider(RAPIER.ColliderDesc.cylinder(1.6, r * 0.88).setTranslation(x, y + 1.6, z), fixed);
    if (smoke) emit.smoke.push([x, y + 3.5 * s, z, 0.7]);
  }
  RUKAS.forEach(ruka);

  // ---------- fogón central ----------
  { const { x, z } = FOGON, y = height(x, z), c = chunks.at(x, z);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; flora.rock(c, x + Math.cos(a) * 0.95, y - 0.05, z + Math.sin(a) * 0.95, R(0.24, 0.34), { squash: 0.8 }); }
    for (let i = 0; i < 4; i++) bag.add(cyl, M(x, y + 0.14, z, i * 0.8, 0.07, 1.3, 0.07, PI / 2 - 0.25), hex(0x2a1c12));
    for (let i = 0; i < 5; i++) { const a = 0.6 + i * 1.2; bag.add(cyl, M(x + Math.cos(a) * 2.9, y + 0.2, z + Math.sin(a) * 2.9, PI / 2 - a, 0.22, 1.7, 0.22, PI / 2), WOOD); } // troncos para sentarse
    for (let i = 0; i < 60; i++) { const a = R(0, 6.28), d = R(0.2, 2.2); c.solid.add(x + Math.cos(a) * d, y + 0.02, z + Math.sin(a) * d, 0, 1, 0, R(0.5, 0.9), R(0.3, 0.5), R(0, 3), shade(PAL.dark, 0, 1, 0, rng, 0.3)); } // ceniza
    emit.fire.push([x, y + 0.2, z]); emit.smoke.push([x, y + 0.9, z, 1]);
  }

  // ---------- rewe de la machi, con ramas de canelo ----------
  { const x = 20, z = 19, y = height(x, z), c = chunks.at(x, z);
    for (let i = 0; i < 7; i++) bag.add(cyl, M(x - i * 0.03, y + 0.2 + i * 0.36, z, 0, i % 2 ? 0.17 : 0.24, 0.36, i % 2 ? 0.17 : 0.24), i % 2 ? WOOD2 : WOOD);
    bag.add(sph, M(x - 0.22, y + 2.85, z, 0, 0.22, 0.26, 0.22), WOOD);
    for (let i = 0; i < 70; i++) { const sd = i % 2 ? 1 : -1; c.leaf.add(x + R(-0.2, 0.2), y + R(0.8, 3.9), z + sd * R(0.35, 0.8), 0, 0, 0, R(0.4, 0.6), R(0.2, 0.3), R(-1, 1), shade(PAL.canelo, 0, R(-0.3, 0.9), sd * 0.5, rng), 1); }
    physics.createCollider(RAPIER.ColliderDesc.cylinder(1.4, 0.3).setTranslation(x, y + 1.4, z), fixed);
  }

  // ---------- corral de los weke ----------
  { const { x, z, r } = CORRAL, n = 26;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 6.28, a1 = ((i + 1) / n) * 6.28, x0 = x + Math.cos(a0) * r, z0 = z + Math.sin(a0) * r, x1 = x + Math.cos(a1) * r, z1 = z + Math.sin(a1) * r, y0 = height(x0, z0);
      bag.add(cyl, M(x0, y0 + 0.6, z0, 0, 0.07, 1.3 + R(-0.1, 0.15), 0.07, R(-0.06, 0.06)), WOOD);
      if (i === 0) continue; // la entrada, mirando a la aldea
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ry = -Math.atan2(z1 - z0, x1 - x0), L = Math.hypot(x1 - x0, z1 - z0);
      for (const hh of [0.45, 0.95]) bag.add(cyl, M(mx, y0 + hh, mz, ry, 0.045, L * 1.05, 0.045, PI / 2 + R(-0.04, 0.04)), WOOD2);
      physics.createCollider(RAPIER.ColliderDesc.cuboid(L / 2, 0.6, 0.08).setTranslation(mx, y0 + 0.6, mz).setRotation(new THREE.Quaternion().setFromAxisAngle(UP, ry)), fixed);
    }
  }

  // ---------- telar (witral) junto a la ruka familiar ----------
  { const x = -10.6, z = -4.2, y = height(x, z), c = chunks.at(x, z), yaw = 0.5, dx = Math.cos(yaw), dz = Math.sin(yaw);
    for (const s of [-1, 1]) bag.add(cyl, M(x + dx * s * 0.8, y + 1.1, z + dz * s * 0.8, 0, 0.06, 2.3, 0.06, 0.12), WOOD);
    for (const hh of [0.35, 1.95]) bag.add(cyl, M(x, y + hh, z, -yaw, 0.045, 1.9, 0.045, PI / 2), WOOD2);
    const pat = [PAL.textileK, PAL.textileR, PAL.textileW, PAL.textileR, PAL.textileK, PAL.textileK, PAL.textileW, PAL.textileR];
    for (let row = 0; row < 12; row++) for (let col = 0; col < 7; col++) { const u = (col / 6 - 0.5) * 1.4, v = 0.5 + row * 0.11; c.solid.add(x + dx * u + dz * 0.05, y + v, z + dz * u - dx * 0.05, -dz, 0.12, dx, 0.3, 0.13, R(-0.05, 0.05), shade(pat[(row + (col === 3 ? 2 : 0)) % 8], -dz, 0.1, dx, rng, 0.15)); }
  }

  // ---------- leña, vasijas y canastos ----------
  for (const [x, z, ry] of [[-19, -3, 0.3], [9, -12, 1.2], [-7, 15, 2.2], [17, 8, 0.6]]) { const y = height(x, z); for (let i = 0; i < 9; i++) bag.add(cyl, M(x + Math.sin(ry) * (i % 3) * 0.22, y + 0.11 + Math.floor(i / 3) * 0.2, z + Math.cos(ry) * (i % 3) * 0.22, ry, 0.1, 1.1, 0.1, PI / 2), i % 2 ? WOOD : WOOD2); }
  for (const [x, z] of [[-12.6, -11.5], [-12.2, -12.3], [3, 2.4], [13.6, 10.6], [14.2, 11.2], [-1.6, 16.2], [19.2, -4.6]]) { const y = height(x, z), s = R(0.22, 0.32); bag.add(sph, M(x, y + s * 0.85, z, 0, s, s * 0.95, s), hex(0x9a5a38)); bag.add(cyl, M(x, y + s * 1.8, z, 0, s * 0.5, s * 0.4, s * 0.5), hex(0x86492c)); }

  // ---------- cancha de palin: estacas en el borde ----------
  { const c0 = 0.94, s0 = 0.34; for (let i = -5; i <= 5; i++) for (const sd of [-1, 1]) { const u = i * 4, v = sd * 5.6, x = POI.cancha.x + u * c0 - v * s0, z = POI.cancha.z + u * s0 + v * c0; bag.add(cyl, M(x, height(x, z) + 0.3, z, 0, 0.035, 0.6, 0.035, R(-0.1, 0.1)), WOOD); } }

  // ---------- lugar de los antiguos: chemamüll (figuras de madera) entre canelos ----------
  { const { x, z } = POI.antiguos;
    for (const [dx, dz, hh] of [[0, 0, 2.9], [2.2, 1.1, 2.4], [-1.8, 1.6, 2.6]]) { const px = x + dx, pz = z + dz, y = height(px, pz); bag.add(cyl, M(px, y + hh / 2, pz, 0, 0.26, hh, 0.22), WOOD2); bag.add(cyl, M(px, y + hh + 0.25, pz, 0, 0.3, 0.5, 0.27), WOOD); bag.add(cyl, M(px, y + hh + 0.56, pz, 0, 0.36, 0.1, 0.33), WOOD2); physics.createCollider(RAPIER.ColliderDesc.cylinder(hh / 2, 0.3).setTranslation(px, y + hh / 2, pz), fixed); }
    for (let i = 0; i < 7; i++) { const a = 0.4 + i * 0.9, px = x + Math.cos(a) * 11, pz = z + Math.sin(a) * 11; flora.broadleaf(chunks.at(px, pz), px, height(px, pz), pz, R(7, 10), { leaf: PAL.canelo, bark: PAL.barkPale, cone: true, spread: 0.2 }); }
  }

  // ---------- mirador del cerro: rocas planas en la cima ----------
  for (const [dx, dz, s] of [[0, 0, 2.6], [3.4, 1.2, 1.9], [-2.6, 2.4, 1.6], [1.2, -3.2, 1.7], [-3.6, -1.6, 1.3]]) { const x = CERRO[0] + dx, z = CERRO[1] + dz; flora.rock(chunks.at(x, z), x, height(x, z) - 0.2, z, s, { squash: 0.42 }); }

  // ---------- el árbol hueco del bosque viejo ----------
  { const { x, z } = POI.viejo; flora.broadleaf(chunks.at(x, z), x, height(x, z), z, 36, { r0: 2.3, limbs: 7, spread: 0.3, moss: 0.7, hollow: true, dense: 1.2 }); }

  return emit;
}
