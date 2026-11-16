// La aldea y los lugares construidos: rukas, fogón, rewe, corral, telar y otros detalles.
import * as THREE from 'three';
import { TEX, MAT } from './gfx.js';
import { height, POI, CERRO } from './terrain.js';

export const RUKAS = [
  { x: -16, z: -8, s: 1.15, name: 'familia', smoke: true }, { x: -10, z: -21, s: 1.0 }, { x: 12, z: -16, s: 1.0, smoke: true },
  { x: 21, z: -2, s: 0.95, name: 'ñamku' }, { x: 15, z: 14, s: 1.05, name: 'machi', smoke: true }, { x: -4, z: 19, s: 1.0 },
];
export const CORRAL = { x: -25, z: 14, r: 6.5 };
export const FOGON = { x: 0, z: 0 };

export function buildVillage({ scene, rng, bag, flora, physics, RAPIER, fixed }) {
  const R = (a, b) => a + (b - a) * rng(), PI = Math.PI, UP = new THREE.Vector3(0, 1, 0);
  const M = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8), sph = new THREE.SphereGeometry(1, 12, 9);
  const WOOD = 0x6a5038, WOOD2 = 0x54402c, emit = { smoke: [], fire: [] };
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };

  // ---------- ruka: casa de paja con la puerta hacia el oriente ----------
  const thatch = MAT.thatch(), prof = [[1, 0], [1.03, 0.9], [0.86, 1.8], [0.5, 2.8], [0.1, 3.55]];
  thatch.map = TEX.thatch.clone(); thatch.map.repeat.set(5, 1.6); thatch.bumpMap = thatch.map;
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 1 });
  function ruka({ x, z, s, smoke }) {
    const y = height(x, z) - 0.05, r = 3.3 * s;
    // perfil ondulado para que la paja no se vea lisa
    const pts = []; for (let i = 0; i <= 28; i++) { const f = (i / 28) * 4, k = Math.min(3, Math.floor(f)), u = f - k, rr = prof[k][0] + (prof[k + 1][0] - prof[k][0]) * u, yy = prof[k][1] + (prof[k + 1][1] - prof[k][1]) * u; pts.push(new THREE.Vector2(rr * r * (1 + (i % 4 === 0 ? 0.03 : 0)), yy * s)); }
    const g = new THREE.LatheGeometry(pts, 28), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const k = 1 + Math.sin(P.getX(i) * 9 + P.getZ(i) * 7) * 0.012; P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k * 0.82); }
    g.computeVertexNormals(); add(g, thatch, x, y, z);
    add(new THREE.BoxGeometry(0.3, 1.9 * s, 1.5 * s), darkMat, x + r * 0.95, y + 0.95 * s, z).castShadow = false; // vano oscuro de la puerta
    for (const dz of [-0.85, 0.85]) bag.add(cyl, M(x + r * 1.02, y + 1.05 * s, z + dz * s, 0, 0.09, 2.1 * s, 0.09), WOOD);
    bag.add(cyl, M(x + r * 1.02, y + 2.1 * s, z, PI / 2, 0.09, 2.0 * s, 0.09, PI / 2), WOOD);
    for (const rz of [0.5, -0.5]) bag.add(cyl, M(x, y + 3.6 * s, z, R(0, 3), 0.045, 1.6, 0.045, rz), WOOD2); // palos cruzados en la cumbre
    physics.createCollider(RAPIER.ColliderDesc.cylinder(1.6, r * 0.88).setTranslation(x, y + 1.6, z), fixed);
    if (smoke) emit.smoke.push([x, y + 3.5 * s, z, 0.7]);
  }
  RUKAS.forEach(ruka);

  // ---------- fogón central ----------
  { const { x, z } = FOGON, y = height(x, z);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; flora.rock(x + Math.cos(a) * 0.95, y - 0.05, z + Math.sin(a) * 0.95, R(0.24, 0.34), { squash: 0.8, color: 0xa8a298 }); }
    for (let i = 0; i < 4; i++) bag.add(cyl, M(x, y + 0.14, z, i * 0.8, 0.07, 1.3, 0.07, PI / 2 - 0.25), 0x241a12);
    for (let i = 0; i < 5; i++) { const a = 0.6 + i * 1.2; bag.add(cyl, M(x + Math.cos(a) * 2.9, y + 0.2, z + Math.sin(a) * 2.9, PI / 2 - a, 0.22, 1.7, 0.22, PI / 2), WOOD); } // troncos para sentarse
    const ash = add(new THREE.CircleGeometry(1.5, 20), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1 }), x, y + 0.03, z); ash.rotation.x = -PI / 2; ash.castShadow = false;
    emit.fire.push([x, y + 0.2, z]); emit.smoke.push([x, y + 0.9, z, 1]);
    const glow = new THREE.PointLight(0xff8a3a, 14, 14, 1.6); glow.position.set(x, y + 0.9, z); scene.add(glow); emit.glow = glow;
  }

  // ---------- rewe de la machi, con ramas de canelo ----------
  { const x = 20, z = 19, y = height(x, z);
    for (let i = 0; i < 7; i++) bag.add(cyl, M(x - i * 0.03, y + 0.2 + i * 0.36, z, 0, i % 2 ? 0.17 : 0.24, 0.36, i % 2 ? 0.17 : 0.24), i % 2 ? WOOD2 : WOOD);
    bag.add(sph, M(x - 0.22, y + 2.85, z, 0, 0.22, 0.26, 0.22), WOOD);
    flora.tree('canelo', x + 0.5, y, z + 0.9, 4.2); flora.tree('canelo', x - 0.3, y, z - 0.9, 3.8);
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
  { const x = -10.6, z = -4.2, y = height(x, z), yaw = 0.5, dx = Math.cos(yaw), dz = Math.sin(yaw);
    for (const s of [-1, 1]) bag.add(cyl, M(x + dx * s * 0.8, y + 1.1, z + dz * s * 0.8, 0, 0.06, 2.3, 0.06, 0.12), WOOD);
    for (const hh of [0.35, 1.95]) bag.add(cyl, M(x, y + hh, z, -yaw, 0.045, 1.9, 0.045, PI / 2), WOOD2);
    const cloth = add(new THREE.PlaneGeometry(1.4, 1.35), new THREE.MeshStandardMaterial({ map: TEX.textile, side: THREE.DoubleSide, roughness: 1 }), x, y + 1.15, z); cloth.rotation.y = -yaw;
  }

  // ---------- leña y vasijas ----------
  for (const [x, z, ry] of [[-19, -3, 0.3], [9, -12, 1.2], [-7, 15, 2.2], [17, 8, 0.6]]) { const y = height(x, z); for (let i = 0; i < 9; i++) bag.add(cyl, M(x + Math.sin(ry) * (i % 3) * 0.22, y + 0.11 + Math.floor(i / 3) * 0.2, z + Math.cos(ry) * (i % 3) * 0.22, ry, 0.1, 1.1, 0.1, PI / 2), i % 2 ? WOOD : WOOD2); }
  for (const [x, z] of [[-12.6, -11.5], [-12.2, -12.3], [3, 2.4], [13.6, 10.6], [14.2, 11.2], [-1.6, 16.2], [19.2, -4.6]]) { const y = height(x, z), s = R(0.22, 0.32); bag.add(sph, M(x, y + s * 0.85, z, 0, s, s * 0.95, s), 0x9a5a38); bag.add(cyl, M(x, y + s * 1.8, z, 0, s * 0.5, s * 0.4, s * 0.5), 0x86492c); }

  // ---------- cancha de palin: estacas en el borde ----------
  { const c0 = 0.94, s0 = 0.34; for (let i = -5; i <= 5; i++) for (const sd of [-1, 1]) { const u = i * 4, v = sd * 5.6, x = POI.cancha.x + u * c0 - v * s0, z = POI.cancha.z + u * s0 + v * c0; bag.add(cyl, M(x, height(x, z) + 0.3, z, 0, 0.035, 0.6, 0.035, R(-0.1, 0.1)), WOOD); } }

  // ---------- lugar de los antiguos: chemamüll (figuras de madera) entre canelos ----------
  { const { x, z } = POI.antiguos;
    for (const [dx, dz, hh] of [[0, 0, 2.9], [2.2, 1.1, 2.4], [-1.8, 1.6, 2.6]]) { const px = x + dx, pz = z + dz, y = height(px, pz); bag.add(cyl, M(px, y + hh / 2, pz, 0, 0.26, hh, 0.22), WOOD2); bag.add(cyl, M(px, y + hh + 0.25, pz, 0, 0.3, 0.5, 0.27), WOOD); bag.add(cyl, M(px, y + hh + 0.56, pz, 0, 0.36, 0.1, 0.33), WOOD2); physics.createCollider(RAPIER.ColliderDesc.cylinder(hh / 2, 0.3).setTranslation(px, y + hh / 2, pz), fixed); }
    for (let i = 0; i < 7; i++) { const a = 0.4 + i * 0.9, px = x + Math.cos(a) * 11, pz = z + Math.sin(a) * 11; flora.tree('canelo', px, height(px, pz), pz, R(7, 10)); }
  }

  // ---------- mirador del cerro: rocas planas en la cima ----------
  for (const [dx, dz, s] of [[0, 0, 2.6], [3.4, 1.2, 1.9], [-2.6, 2.4, 1.6], [1.2, -3.2, 1.7], [-3.6, -1.6, 1.3]]) { const x = CERRO[0] + dx, z = CERRO[1] + dz; flora.rock(x, height(x, z) - 0.2, z, s, { squash: 0.42 }); }

  // ---------- el árbol gigante del bosque viejo ----------
  { const { x, z } = POI.viejo; flora.tree('giant', x, height(x, z), z, 40); }

  return emit;
}
