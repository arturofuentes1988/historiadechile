// La aldea y los lugares construidos: rukas, fogón, rewe, corral, telar y otros detalles.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TEX, MAT, flameMaterial, photo } from './gfx.js';
import { height, POI, CERRO } from './terrain.js';

export const RUKAS = [
  { x: -16, z: -8, s: 1.15, name: 'familia', smoke: true }, { x: -10, z: -21, s: 1.0 }, { x: 12, z: -16, s: 1.0, smoke: true },
  { x: 21, z: -2, s: 0.95, name: 'ñamku' }, { x: 15, z: 14, s: 1.05, name: 'machi', smoke: true }, { x: -4, z: 19, s: 1.0 },
];
export const CORRAL = { x: -25, z: 14, r: 6.5 };
export const FOGON = { x: 0, z: 0 };
export const OLLA = { x: FOGON.x + 1.5, z: FOGON.z + 0.9 }; // la olla del caldo, junto al fogón
// Dónde va cada oficio de la aldea (life.js pone ahí a la gente que lo hace)
export const OFICIOS = { cueros: [-20.49, 5.19], armas: [-4, -14], musica: [12.5, 23.5], moler: [8.5, -18.5], greda: [-9.5, 21] };
export const TALLADO = { x: POI.viejo.x + 5.5, z: POI.viejo.z + 3.5 }; // la figura tallada del bosque viejo, a pocos pasos del árbol abuelo
export const REFUGIO = { x: POI.pewen.x, z: POI.pewen.z };             // la ruka chica del bosque de pewenes, donde termina el sendero del norte

export function buildVillage({ scene, rng, bag, flora, physics, RAPIER, fixed }) {
  const R = (a, b) => a + (b - a) * rng(), PI = Math.PI, UP = new THREE.Vector3(0, 1, 0);
  const M = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8), sph = new THREE.SphereGeometry(1, 12, 9);
  const WOOD = 0x6a5038, WOOD2 = 0x54402c, emit = { smoke: [], fire: [] };
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };

  // ---------- ruka: casa de paja con la puerta hacia el oriente ----------
  const thatch = MAT.thatch(), prof = [[1, 0], [1.03, 0.9], [0.86, 1.8], [0.5, 2.8], [0.1, 3.55]];
  thatch.map = photo('paja', { repeat: [4, 1.25] }); thatch.bumpMap = thatch.map; thatch.bumpScale = 4; // paja fotográfica, en hileras alrededor de la ruka
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x0a0806, side: THREE.DoubleSide });
  const porch = thatch.clone(); porch.side = THREE.DoubleSide; porch.map = photo('paja', { repeat: [1, 1] }); porch.bumpMap = porch.map;
  function ruka({ x, z, s, smoke }) {
    const y = height(x, z) - 0.05, r = 3.3 * s;
    // la ruka se arma mirando al oriente y luego se gira entera para que la entrada dé al fogón
    const th = Math.atan2(z - FOGON.z, FOGON.x - x), ct = Math.cos(th), st = Math.sin(th), ROT = new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(th)).multiply(new THREE.Matrix4().makeTranslation(-x, 0, -z));
    const rp = (px, pz) => [x + (px - x) * ct + (pz - z) * st, z - (px - x) * st + (pz - z) * ct], spin = (m) => { m.applyMatrix4(ROT); return m; }, qy = new THREE.Quaternion().setFromAxisAngle(UP, th);
    const rb = { add: (geo, m, color, kind) => bag.add(geo, ROT.clone().multiply(m), color, kind) };
    const fl = { scatter: (k, px, py, pz, ...rest) => { const [qx, qz] = rp(px, pz); flora.scatter(k, qx, py, qz, ...rest); }, rock: (px, py, pz, ...rest) => { const [qx, qz] = rp(px, pz); flora.rock(qx, py, qz, ...rest); } };
    const wall = (px, pz, hx, hy, hz) => { const [qx, qz] = rp(px, pz); physics.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(qx, y + hy, qz).setRotation(qy), fixed); };
    // perfil ondulado para que la paja no se vea lisa
    const pts = []; for (let i = 0; i <= 28; i++) { const f = (i / 28) * 4, k = Math.min(3, Math.floor(f)), u = f - k, rr = prof[k][0] + (prof[k + 1][0] - prof[k][0]) * u, yy = prof[k][1] + (prof[k + 1][1] - prof[k][1]) * u; pts.push(new THREE.Vector2(rr * r * (1 + (i % 4 === 0 ? 0.03 : 0)), yy * s)); }
    const g = new THREE.LatheGeometry(pts, 28), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const k = 1 + Math.sin(P.getX(i) * 9 + P.getZ(i) * 7) * 0.012; P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k * 0.82); }
    g.computeVertexNormals(); spin(add(g, thatch, x, y, z));
    // entrada: un zaguán de paja en arco que sale hacia el oriente, con marco de varas curvadas
    // y el fondo en penumbra (sin nada colgado ni apoyado delante: la entrada queda limpia)
    { const w = 0.82 * s, h = 1.9 * s, x0 = x + r * 0.7, x1 = x + r * 1.03 + 0.75 * s, N = 14, P = [], U = [], I = [];
      for (let k = 0; k <= 1; k++) for (let n = 0; n <= N; n++) { const a = PI * n / N, sag = 1 + Math.sin(a * 5 + k) * 0.015; P.push(k ? x1 : x0, y + Math.sin(a) * h * sag * (k ? 0.96 : 1), z + Math.cos(a) * w * (k ? 0.96 : 1)); U.push(k * 0.45, Math.abs(n / N - 0.5) * 1.6); }
      for (let n = 0; n < N; n++) I.push(n, n + N + 1, n + 1, n + 1, n + N + 1, n + N + 2);
      const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); ag.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); ag.setIndex(I); ag.computeVertexNormals();
      const zm = new THREE.Mesh(ag, porch); zm.castShadow = zm.receiveShadow = true; scene.add(spin(zm));
      const fondo = new THREE.Mesh(new THREE.CircleGeometry(1, 16, 0, PI), darkMat); fondo.scale.set(w * 0.98, h * 0.98, 1); fondo.rotation.y = PI / 2; fondo.position.set(x + r * 1.07, y, z); scene.add(spin(fondo));
      // paredes del zaguán y fondo: no se atraviesan
      for (const dz of [-1, 1]) wall((x + r * 0.9 + x1) / 2, z + dz * (w + 0.06), (x1 - x - r * 0.9) / 2, 0.85 * s, 0.1); wall(x + r * 1.07 - 0.1, z, 0.1, 0.95 * s, w);
      for (const [xx, tube, col] of [[x1 - 0.02, 0.06, WOOD], [x1 - 0.4 * s, 0.035, WOOD2]]) { const arc = new THREE.TorusGeometry(1, tube / w, 6, 18, PI); arc.rotateY(PI / 2); rb.add(arc, M(xx, y, z, 0, 1, h * 0.985, w * 0.985), col); } // varas curvadas del marco
    }
    for (const rz of [0.5, -0.5]) rb.add(cyl, M(x, y + 3.6 * s, z, R(0, 3), 0.045, 1.6, 0.045, rz), WOOD2); // palos cruzados en la cumbre
    // amarras de fibra que sujetan la paja, a tres alturas
    for (const [f, hh] of [[1.035, 0.85], [0.9, 1.75], [0.56, 2.7]]) { const tor = new THREE.TorusGeometry(r * f, 0.035, 5, 28); tor.rotateX(PI / 2); rb.add(tor, M(x, y + hh * s, z, 0, 1, 1, 0.82), 0x6e5a34, 'otros'); }
    // la estera de la entrada
    rb.add(new THREE.BoxGeometry(1.3, 0.03, 1.5), M(x + r * 1.03 + 1.5 * s, y + 0.03, z, R(-0.1, 0.1)), 0xb89c5e, 'estera');
    // cosas de todos los días junto a la pared: varas apoyadas, un canasto y la piedra de moler
    const a0 = R(1.2, 2.2) * (rng() < 0.5 ? 1 : -1), wx = x + Math.cos(a0) * r * 1.08, wz = z + Math.sin(a0) * r * 0.9;
    for (let i = 0; i < 3; i++) rb.add(cyl, M(wx + i * 0.16, y + 1.05, wz + i * 0.05, 0, 0.025, 2.3 + i * 0.2, 0.025, 0.2 * (Math.cos(a0) > 0 ? -1 : 1)), i % 2 ? WOOD : 0x8a7a50);
    rb.add(new THREE.CylinderGeometry(0.3, 0.22, 0.34, 10, 1, true), M(wx - 0.6, y + 0.17, wz + 0.5), 0xb09a5a, 'estera'); rb.add(new THREE.TorusGeometry(0.3, 0.03, 5, 12).rotateX(PI / 2), M(wx - 0.6, y + 0.34, wz + 0.5), 0x8a743e, 'otros');
    { const [qx, qz] = rp(wx - 0.6, wz + 0.5); physics.createCollider(RAPIER.ColliderDesc.cylinder(0.2, 0.3).setTranslation(qx, y + 0.2, qz), fixed); }
    fl.rock(wx + 0.9, y - 0.06, wz - 0.4, 0.42, { squash: 0.3, color: 0xa8a49a }); fl.rock(wx + 0.9, y + 0.1, wz - 0.4, 0.13, { squash: 0.7, color: 0x8e8a80 });
    physics.createCollider(RAPIER.ColliderDesc.cylinder(1.6, r * 0.88).setTranslation(x, y + 1.6, z), fixed);
    if (smoke) emit.smoke.push([x, y + 3.5 * s, z, 0.7]);
    for (let i = 0; i < 30; i++) { const a = (i / 30) * 6.28 + R(-0.05, 0.05); if (Math.abs(a) < 0.4 || a > 5.9) continue; fl.scatter('reed', x + Math.cos(a) * r * 1.02, y, z + Math.sin(a) * r * 0.84, R(0.35, 0.55), 0xf0dca0); } // flecos de paja en el borde del techo
  }
  RUKAS.forEach(ruka);

  // ---------- vasijas de greda: cada una con su perfil, su boca oscura y su textura de greda cocida ----------
  // olla: panzona y de boca ancha, para el fuego; cántaro: de cuello angosto y con asa, para el agua; tinaja: grande, para guardar
  const greda = { lisa: MAT.clay(TEX.greda), pintada: MAT.clay(TEX.gredaPintada), hollin: MAT.clay(TEX.gredaHollin) }, hueco = new THREE.MeshBasicMaterial({ color: 0x120c08 }), boca = new THREE.CircleGeometry(1, 18).rotateX(-PI / 2);
  const PERFIL = {
    olla: [[0, 0], [0.42, 0], [0.74, 0.16], [0.96, 0.5], [1.0, 0.82], [0.9, 1.16], [0.7, 1.42], [0.58, 1.56], [0.6, 1.7], [0.7, 1.82], [0.66, 1.85], [0.55, 1.72]],
    cantaro: [[0, 0], [0.38, 0], [0.66, 0.2], [0.84, 0.6], [0.82, 1.0], [0.64, 1.38], [0.42, 1.68], [0.34, 1.95], [0.35, 2.2], [0.45, 2.38], [0.41, 2.41], [0.31, 2.24]],
    tinaja: [[0, 0], [0.5, 0], [0.86, 0.22], [1.04, 0.7], [1.0, 1.2], [0.84, 1.6], [0.72, 1.78], [0.74, 1.9], [0.82, 1.98], [0.78, 2.01], [0.66, 1.88]],
  }, formas = {};
  function vasija(kind, x, y, z, s, yaw, mat) {
    const pf = PERFIL[kind], H = Math.max(...pf.map((q) => q[1])), [mr, my] = pf[pf.length - 1];
    if (!formas[kind]) { // la textura da tres vueltas a la pieza y sube de la base a la boca
      let g = new THREE.LatheGeometry(pf.map(([r, yy]) => new THREE.Vector2(r, yy)), 24); const P = g.attributes.position, U = g.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, U.getX(i) * 3, P.getY(i) / H);
      if (kind === 'cantaro') { const asa = new THREE.TorusGeometry(0.3, 0.05, 6, 12, PI).rotateZ(-PI / 2).scale(0.75, 1, 1.3).translate(0.42, 1.82, 0), AU = asa.attributes.uv; for (let i = 0; i < AU.count; i++) AU.setXY(i, AU.getX(i) * 0.3, 0.85 + AU.getY(i) * 0.1); g = mergeGeometries([g, asa]); }
      formas[kind] = g;
    }
    const m = add(formas[kind], mat, x, y, z); m.scale.setScalar(s); m.rotation.y = yaw;
    const d = new THREE.Mesh(boca, hueco); d.scale.setScalar(mr * s * 1.03); d.position.set(x, y + (my + 0.03) * s, z); scene.add(d); // adentro está oscuro
  }

  // ---------- fogón central ----------
  { const { x, z } = FOGON, y = height(x, z);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; flora.rock(x + Math.cos(a) * 0.95, y - 0.05, z + Math.sin(a) * 0.95, R(0.24, 0.34), { squash: 0.8, color: 0xa8a298 }); }
    // leños del fuego, carbonizados, y troncos con corteza para sentarse alrededor
    const corte = new THREE.MeshStandardMaterial({ map: photo('madera'), color: 0xd8c0a0, roughness: 1 }), lg = new THREE.CylinderGeometry(1, 1, 1, 14);
    const tronco = [MAT.bark(0xb0a898, photo('corteza-roble')), corte, corte], quemado = [MAT.bark(0x4a4038, photo('corteza-roble')), new THREE.MeshStandardMaterial({ map: photo('madera'), color: 0x3a3028, roughness: 1 })]; quemado.push(quemado[1]);
    for (let i = 0; i < 5; i++) { const l = add(lg, quemado, x + Math.cos(i * 1.26) * 0.28, y + 0.13 + (i % 2) * 0.1, z + Math.sin(i * 1.26) * 0.28); l.scale.set(0.085, 1.25, 0.085); l.rotation.set(PI / 2 - 0.22, 0, 0); l.rotation.order = 'YXZ'; l.rotation.y = -i * 1.26 + PI / 2; }
    for (let i = 0; i < 5; i++) { const a = 0.6 + i * 1.2, l = add(lg, tronco, x + Math.cos(a) * 2.9, y + 0.2, z + Math.sin(a) * 2.9); l.scale.set(0.22 + (i % 2) * 0.03, 1.7, 0.22); l.rotation.order = 'YXZ'; l.rotation.set(PI / 2, -a, 0); }
    const ash = add(new THREE.CircleGeometry(1.5, 20), new THREE.MeshStandardMaterial({ map: photo('suelo-tierra'), color: 0x5a5856, roughness: 1 }), x, y + 0.03, z); ash.rotation.x = -PI / 2; ash.castShadow = false;
    emit.fire.push([x, y + 0.2, z]); emit.smoke.push([x, y + 0.9, z, 1]);
    physics.createCollider(RAPIER.ColliderDesc.cylinder(0.35, 1.05).setTranslation(x, y + 0.35, z), fixed); // el fuego no se cruza
    for (let i = 0; i < 5; i++) { const a = 0.6 + i * 1.2; physics.createCollider(RAPIER.ColliderDesc.capsule(0.62, 0.21).setTranslation(x + Math.cos(a) * 2.9, y + 0.2, z + Math.sin(a) * 2.9).setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2, 0, a - PI / 2, 'ZYX'))), fixed); }
    physics.createCollider(RAPIER.ColliderDesc.cylinder(0.35, 0.3).setTranslation(x + 1.5, y + 0.35, z + 0.9), fixed);
    // llamas, brasas que brillan y una olla de greda sobre tres piedras
    const fm = emit.flama = flameMaterial(); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.45), fm); f.position.set(x, y + 0.8, z); f.rotation.y = (i / 3) * PI; f.renderOrder = 3; scene.add(f); }
    const ember = new THREE.MeshStandardMaterial({ color: 0x1a0e08, emissive: 0xff4a12, emissiveIntensity: 2.2, roughness: 1 }); emit.ember = ember;
    for (let i = 0; i < 5; i++) { const e = add(new THREE.CylinderGeometry(0.06, 0.06, R(0.5, 0.9), 6), ember, x + R(-0.25, 0.25), y + 0.1, z + R(-0.25, 0.25)); e.rotation.set(PI / 2, 0, R(0, 3)); e.castShadow = false; }
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; flora.rock(x + 1.5 + Math.cos(a) * 0.22, y - 0.02, z + 0.9 + Math.sin(a) * 0.22, 0.16, { squash: 0.9, color: 0x6e6a62 }); }
    vasija('olla', x + 1.5, y + 0.17, z + 0.9, 0.27, 0.7, greda.hollin); // la olla del caldo, tiznada por el fuego
    // la olla está al fuego: brasas y unas llamas chicas entre sus piedras, y el vapor del agua que hierve
    for (let i = 0; i < 2; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), fm); f.position.set(x + 1.5, y + 0.28, z + 0.9); f.rotation.y = 0.5 + i * PI / 2; f.renderOrder = 3; scene.add(f); }
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 1.45, e = add(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 6), ember, x + 1.5 + Math.cos(a) * 0.05, y + 0.07, z + 0.9 + Math.sin(a) * 0.05); e.rotation.set(PI / 2, 0, a); e.castShadow = false; }
    emit.steam = [[x + 1.5, y + 0.17 + 1.7 * 0.27, z + 0.9]];
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
    const cloth = add(new THREE.PlaneGeometry(1.4, 1.35), new THREE.MeshStandardMaterial({ map: photo('manta'), bumpMap: photo('manta'), bumpScale: 3, side: THREE.DoubleSide, roughness: 1 }), x, y + 1.15, z); cloth.rotation.y = -yaw;
    for (let i = 0; i < 4; i++) bag.add(sph, M(x + dx * (1.25 + i * 0.05) + dz * 0.3 * (i % 2), y + 0.13, z + dz * (1.25 + i * 0.05) - dx * 0.3 * (i % 2), 0, 0.13, 0.12, 0.13), [0xa83a2a, 0xe8dcc0, 0x2a2420, 0xa83a2a][i], 'otros'); // ovillos de lana teñida
    physics.createCollider(RAPIER.ColliderDesc.cuboid(0.95, 1.1, 0.12).setTranslation(x, y + 1.1, z).setRotation(new THREE.Quaternion().setFromAxisAngle(UP, -yaw)), fixed);
  }

  // ---------- leña y vasijas ----------
  for (const [x, z, ry] of [[-19, -3, 0.3], [9, -12, 1.2], [-7, 15, 2.2], [17, 8, 0.6]]) { const y = height(x, z); for (let i = 0; i < 9; i++) bag.add(cyl, M(x + Math.sin(ry) * (i % 3) * 0.22, y + 0.11 + Math.floor(i / 3) * 0.2, z + Math.cos(ry) * (i % 3) * 0.22, ry, 0.1, 1.1, 0.1, PI / 2), i % 2 ? WOOD : WOOD2); physics.createCollider(RAPIER.ColliderDesc.cuboid(0.55, 0.33, 0.35).setTranslation(x + Math.sin(ry) * 0.22, y + 0.33, z + Math.cos(ry) * 0.22).setRotation(new THREE.Quaternion().setFromAxisAngle(UP, ry + PI / 2)), fixed); }
  [[-12.6, -11.5, 'tinaja', 'lisa'], [-12.2, -12.3, 'cantaro', 'pintada'], [3, 2.4, 'olla', 'hollin'], [13.6, 10.6, 'cantaro', 'pintada'], [14.2, 11.2, 'olla', 'lisa'], [-1.6, 16.2, 'tinaja', 'pintada'], [19.2, -4.6, 'cantaro', 'lisa']].forEach(([x, z, kind, look], i) => {
    const y = height(x, z), s = R(0.22, 0.32); vasija(kind, x, y - 0.015, z, s, i * 2.4, greda[look]); physics.createCollider(RAPIER.ColliderDesc.cylinder(s, s).setTranslation(x, y + s, z), fixed); });

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

  // ====================================================================================================
  // Lo que sigue va al final a propósito, y con su propio azar fijo (D): así no cambia de lugar nada de lo anterior.
  // Casi todo entra en las mallas comunes de la aldea (bag), que se dibujan de una sola vez: los oficios no suman
  // órdenes de dibujo, salvo una para todos los cueros.
  // ====================================================================================================
  const D = (i) => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const palo = (a, b, r, color = WOOD, kind) => { const d = V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(); bag.add(cyl, new THREE.Matrix4().compose(V3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), V3(r, L, r)), color, kind); };
  const caja = (x, y, z, hx, hy, hz, yaw = 0) => physics.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y + hy, z).setRotation(new THREE.Quaternion().setFromAxisAngle(UP, yaw)), fixed);
  const estera = (x, z, w, d, yaw) => bag.add(new THREE.BoxGeometry(w, 0.03, d), M(x, height(x, z) + 0.025, z, yaw), 0xb89c5e, 'estera');

  // ---------- cueros: estirados en bastidores de varas para rasparlos y secarlos ----------
  const cueroGeo = (() => { const N = 16, pos = [0, 0, 0], idx = []; for (let i = 0; i < N; i++) { const a = (i / N) * 6.283, r = 0.36 + 0.14 * Math.abs(Math.sin(a * 2)) ** 3 + 0.03 * Math.sin(a * 5); pos.push(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.3, 0); idx.push(0, 1 + i, 1 + (i + 1) % N); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g; })(); // la silueta del cuero, con sus cuatro patas
  function bastidor(x, z, yaw, sc, color) {
    const y = height(x, z), c = Math.cos(yaw), sn = Math.sin(yaw), lean = 0.2, W = 0.7 * sc, H = 0.95 * sc, cl = Math.cos(lean), sl = Math.sin(lean);
    const F = (u, v, w = 0) => { const zz = w - v * sl; return [x + u * c + zz * sn, y + 0.12 + v * cl, z - u * sn + zz * c]; }; // u: a lo ancho; v: hacia arriba por el bastidor; w: hacia el frente
    palo(F(-W, -0.12), F(-W, 2 * H + 0.2), 0.03); palo(F(W, -0.12), F(W, 2 * H + 0.2), 0.03); palo(F(-W - 0.12, 2 * H), F(W + 0.12, 2 * H), 0.026, WOOD2); palo(F(-W - 0.12, 0.12), F(W + 0.12, 0.12), 0.026, WOOD2);
    for (const sd of [-1, 1]) { const g0 = F(sd * W, 0, -0.95); g0[1] = y; palo(F(sd * W, 1.7 * H), g0, 0.026, WOOD2); } // los puntales de atrás
    const ctr = F(0, H + 0.06);
    bag.add(cueroGeo, new THREE.Matrix4().compose(V3(ctr[0], ctr[1], ctr[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(-lean, yaw, 0, 'YXZ')), V3(sc * 1.3, sc * 1.3, 1)), color, 'cuero');
    for (const [du, dv] of [[-1, 0.15], [1, 0.15], [-1, 1.85], [1, 1.85]]) palo(F(du * W, dv * H), F(du * W * 0.6, H + (dv - 1) * H * 0.6), 0.006, 0xd8c8a0, 'otros'); // las amarras
    caja(x, y, z, W + 0.1, H, 0.25, yaw);
  }
  { const [x, z] = OFICIOS.cueros; bastidor(x, z, 0.541, 1, 0xb08a5c); bastidor(x - 2.9, z - 1.5, 0.95, 0.85, 0xc9ab7c);
    const gx = x + 1.6, gz = z - 2.1; bag.add(cueroGeo, new THREE.Matrix4().compose(V3(gx, height(gx, gz) + 0.04, gz), new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI / 2, 0.7, 0, 'YXZ')), V3(1.25, 1.25, 1)), 0x8f6a44, 'cuero'); } // uno tendido en el suelo, ya sobado

  // ---------- las armas: lanzas de coligüe apoyadas en una vara, mazas de madera dura, hondas y un arco ----------
  { const [x, z] = OFICIOS.armas, y = height(x, z);
    for (const sd of [-1, 1]) { palo([x + sd * 1.2, y - 0.1, z], [x + sd * 1.2, y + 1.55, z], 0.045); palo([x + sd * 1.2, y + 1.5, z], [x + sd * 1.32, y + 1.78, z + 0.1], 0.03); palo([x + sd * 1.2, y + 1.5, z], [x + sd * 1.08, y + 1.78, z - 0.1], 0.03); } // dos horcones
    palo([x - 1.4, y + 1.57, z], [x + 1.4, y + 1.57, z], 0.035, WOOD2);
    for (let i = 0; i < 6; i++) { const u = -1 + i * 0.4 + D(i) * 0.1, L = 3.3 + D(i + 9) * 0.9, off = 0.75 + D(i + 3) * 0.2, b = [x + u, y, z - off], dir = V3(D(i + 5) * 0.06 - 0.03, 1.57, off).normalize(), en = (l) => [b[0] + dir.x * l, b[1] + dir.y * l, b[2] + dir.z * l];
      palo(b, en(L - 0.45), 0.017, 0xa89a58); palo(en(L - 0.45), en(L), 0.012, 0x3a2e24); } // la caña, y su punta endurecida al fuego
    for (let i = 0; i < 3; i++) { const u = -0.95 + i * 0.36, t = [x + u + 0.03, y + 1.12, z + 0.07]; palo([x + u, y, z + 0.5], t, 0.024, WOOD2); bag.add(sph, M(t[0], t[1], t[2], 0, 0.07, 0.1, 0.07), WOOD2); } // mazas
    for (let i = 0; i < 2; i++) { const u = 0.35 + i * 0.3; palo([x + u, y + 1.57, z], [x + u - 0.03, y + 0.95, z + 0.03], 0.006, 0xc8b88a, 'otros'); palo([x + u + 0.05, y + 1.57, z], [x + u + 0.03, y + 0.95, z + 0.03], 0.006, 0xc8b88a, 'otros'); bag.add(sph, M(x + u, y + 0.93, z + 0.03, 0, 0.05, 0.025, 0.035), 0x8a6a48, 'cuero'); } // hondas
    bag.add(new THREE.TorusGeometry(0.5, 0.013, 5, 14, PI * 0.8).rotateZ(PI * 0.1), M(x + 1.2, y + 0.75, z + 0.16, PI / 2), 0x4a3626); // un arco colgado del horcón
    caja(x, y, z, 1.45, 0.9, 0.16);
  }

  // ---------- los instrumentos de las fiestas, sobre una estera: trutruka, pifilkas y wadas ----------
  { const [x, z] = OFICIOS.musica, y = height(x, z);
    estera(x, z, 2.0, 1.3, 0.4);
    palo([x - 1.3, y - 0.1, z - 0.2], [x - 1.3, y + 0.95, z - 0.2], 0.04); palo([x + 0.9, y + 0.12, z + 0.5], [x - 1.45, y + 1.02, z - 0.28], 0.022, 0x9a8a50); palo([x - 1.45, y + 1.02, z - 0.28], [x - 1.62, y + 1.1, z - 0.33], 0.04, 0x8a7a48); // la trutruka, una caña larga apoyada en una horqueta
    for (let i = 0; i < 3; i++) palo([x - 0.3 + i * 0.22, y + 0.08, z - 0.25], [x - 0.24 + i * 0.22, y + 0.08, z + 0.08], 0.028 - i * 0.003, i % 2 ? WOOD : WOOD2); // pifilkas
    for (let i = 0; i < 2; i++) { const wx = x + 0.45 + i * 0.3, wz = z + 0.2 - i * 0.25; bag.add(sph, M(wx, y + 0.13, wz, 0, 0.1, 0.11, 0.1), 0xc8a45a, 'otros'); palo([wx, y + 0.2, wz], [wx + 0.16, y + 0.3, wz + 0.1], 0.014); } // wadas: calabazas con semillas
  }

  // ---------- la piedra de moler y el lugar de la greda ----------
  { const [x, z] = OFICIOS.moler, y = height(x, z); estera(x - 0.45, z, 1.5, 1.2, 0.1);
    flora.rock(x, y - 0.05, z, 0.42, { squash: 0.32, color: 0xa8a49a }); flora.rock(x - 0.06, y + 0.12, z, 0.14, { squash: 0.6, color: 0x8e8a80 });
    bag.add(new THREE.CylinderGeometry(0.26, 0.2, 0.3, 10, 1, true), M(x + 0.45, y + 0.15, z + 0.6), 0xb09a5a, 'estera'); }
  { const [x, z] = OFICIOS.greda, y = height(x, z); estera(x, z + 0.3, 1.6, 1.3, 0.2);
    vasija('olla', x, y - 0.01, z, 0.2, 0.4, greda.lisa); vasija('cantaro', x + 0.78, y - 0.01, z - 0.35, 0.22, 1.2, greda.lisa);
    for (let i = 0; i < 4; i++) bag.add(sph, M(x - 0.75 + D(i + 20) * 0.5, y + 0.08, z - 0.25 + D(i + 30) * 0.5, 0, 0.11, 0.07, 0.1), 0x9a6a48, 'otros'); } // pellas de greda

  // ---------- algunos árboles y matas entre las casas ----------
  for (const [kind, x, z, H] of [['roble', -24, -20, 14], ['coigue', -14, -29, 16], ['pewenYoung', 4, -24, 6], ['boldo', 22, -12, 7], ['canelo', 27, 9, 8], ['canelo', 7.5, 27.5, 9], ['peumo', -14, 26, 10], ['quillay', -31, 5, 11], ['boldo', 9.5, -3.5, 5.5]]) flora.tree(kind, x, height(x, z) - 0.1, z, H);
  [[-27, -9, 1.2], [18, -24, 1.1], [3, 28, 1.3]].forEach(([x, z, sc], i) => flora.bushAt(x, height(x, z), z, sc, i * 2.1, i + 3));

  // ---------- la figura tallada del bosque viejo ----------
  // Un poste más alto que un hombre, con cabeza, brazos recogidos sobre el vientre y tres franjas pintadas. Mira hacia la aldea.
  { const { x, z } = TALLADO, y = height(x, z) - 0.1, yaw = Math.atan2(-x, -z), fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    bag.add(cyl, M(x, y + 1.3, z, yaw, 0.3, 2.6, 0.26), 0x8a6a48); bag.add(cyl, M(x, y + 2.25, z, yaw, 0.37, 0.3, 0.3), 0x9a7a54); // el cuerpo y los hombros
    bag.add(cyl, M(x, y + 2.85, z, yaw, 0.26, 0.6, 0.24), 0x9a7a54); bag.add(cyl, M(x, y + 3.2, z, yaw, 0.35, 0.12, 0.32), 0x6a5038);  // la cabeza y lo que lleva encima
    for (const sd of [-1, 1]) { palo([x + rx * sd * 0.36, y + 2.2, z + rz * sd * 0.36], [x + rx * sd * 0.3 + fx * 0.2, y + 1.55, z + rz * sd * 0.3 + fz * 0.2], 0.07, 0x9a7a54); palo([x + rx * sd * 0.3 + fx * 0.2, y + 1.55, z + rz * sd * 0.3 + fz * 0.2], [x + rx * sd * 0.06 + fx * 0.3, y + 1.45, z + rz * sd * 0.06 + fz * 0.3], 0.06, 0x9a7a54); // los brazos, con las manos sobre el vientre
      bag.add(sph, M(x + rx * sd * 0.1 + fx * 0.235, y + 2.95, z + rz * sd * 0.1 + fz * 0.235, yaw, 0.045, 0.03, 0.03), 0x1c1612); } // los ojos
    bag.add(sph, M(x + fx * 0.24, y + 2.72, z + fz * 0.24, yaw, 0.09, 0.02, 0.03), 0x1c1612); // la boca
    [[0.55, 0x8a3a2c], [0.85, 0xd8ccb0], [1.15, 0x2a2420]].forEach(([hh, col]) => bag.add(new THREE.TorusGeometry(0.3, 0.035, 5, 18).rotateX(PI / 2), M(x, y + hh, z, yaw, 1, 1, 0.87), col, 'otros')); // franjas de color
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28 + 0.3; flora.rock(x + Math.cos(a) * 0.95, y + 0.04, z + Math.sin(a) * 0.95, 0.2 + D(i + 60) * 0.1, { squash: 0.7, color: 0x9a968c }); }
    physics.createCollider(RAPIER.ColliderDesc.cylinder(1.6, 0.34).setTranslation(x, y + 1.6, z), fixed);
  }

  // ---------- el refugio del bosque de pewenes: una ruka chica al final del sendero, con un fuego afuera ----------
  { const { x, z } = REFUGIO; ruka({ x, z, s: 0.6 });
    const fx = x + 1.6, fz = z + 4.1, y = height(fx, fz); // el fuego, a un costado de la entrada (que mira hacia la aldea)
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; flora.rock(fx + Math.cos(a) * 0.55, y - 0.04, fz + Math.sin(a) * 0.55, 0.17, { squash: 0.8, color: 0x9a968c }); }
    const brasas = mergeGeometries([0, 1, 2, 3].map((i) => new THREE.CylinderGeometry(0.045, 0.045, 0.5, 6).rotateZ(PI / 2).rotateY(i * 0.9).translate((D(i + 40) - 0.5) * 0.25, 0.08, (D(i + 50) - 0.5) * 0.25)));
    add(brasas, emit.ember, fx, y, fz).castShadow = false;
    const llama = new THREE.Mesh(mergeGeometries([new THREE.PlaneGeometry(0.62, 0.85), new THREE.PlaneGeometry(0.62, 0.85).rotateY(PI / 2)]), emit.flama); llama.position.set(fx, y + 0.45, fz); llama.renderOrder = 3; scene.add(llama);
    emit.smoke.push([fx, y + 0.6, fz, 0.55]);
    for (let i = 0; i < 6; i++) palo([x - 2.9 + (i % 3) * 0.2, y + 0.1 + Math.floor(i / 3) * 0.17, z + 1.2], [x - 2.9 + (i % 3) * 0.2, y + 0.1 + Math.floor(i / 3) * 0.17, z + 2.3], 0.085, i % 2 ? WOOD : WOOD2); // leña seca para el que venga después
    physics.createCollider(RAPIER.ColliderDesc.cylinder(0.25, 0.6).setTranslation(fx, y + 0.25, fz), fixed);
    emit.refugio = { x: fx, z: fz };
  }

  return emit;
}
