// Geografía del Acto I: alturas, río, senderos y zonas. La aldea está en el centro (0,0).
// El norte es -z, el oriente +x. Las medidas están en metros.
export const B = { x0: -200, x1: 200, z0: -150, z1: 140 };
export const WATER_Y = -1.5;

function h2(ix, iz) { const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453; return s - Math.floor(s); }
export function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z); let fx = x - ix, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), d = h2(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
export function fbm(x, z) { return vnoise(x, z) * 0.5 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.2; }
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export const riverZ = (x) => 100 + 9 * Math.sin(x * 0.018 + 0.5) - 0.16 * Math.max(0, x - 20);

export const CERRO = [104, -88];
export const POI = {
  aldea: { x: 0, z: 0, name: 'La aldea' },
  pewen: { x: 0, z: -90, name: 'Bosque de pewenes' },
  cerro: { x: CERRO[0], z: CERRO[1], name: 'Cerro Treng Treng' },
  menoko: { x: -104, z: 66, name: 'Menoko' },
  costa: { x: -150, z: -12, name: 'Camino de la costa' },
  poza: { x: 4, z: riverZ(4), name: 'La poza del río' },
  viejo: { x: -128, z: -96, name: 'Bosque viejo' },
  antiguos: { x: 108, z: 16, name: 'Lugar de los antiguos' },
  maqui: { x: -78, z: 30, name: 'Claro del maqui' },
  cancha: { x: -48, z: -24, name: 'La cancha de palin' },
};

export const PATHS = [
  [[0, -4], [0, -40], [3, -68], [0, -90]],
  [[5, -4], [40, -30], [70, -55], [90, -74], [CERRO[0], CERRO[1]]],
  [[0, 5], [-4, 50], [2, 80], [4, riverZ(4) - 5]],
  [[-5, 4], [-40, 20], [-78, 30], [-96, 52], [-104, 60]],
  [[-6, -4], [-30, -16], [-66, -30], [-98, -66], [-128, -96]],
  [[6, 2], [50, 8], [90, 14], [106, 16]],
  [[-8, 0], [-60, -8], [-150, -12], [-200, -10]],
];
const SEGS = [];
for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) SEGS.push([p[i][0], p[i][1], p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]]);
export function pathDist(x, z) {
  let m = 1e9;
  for (const s of SEGS) {
    const t = Math.min(1, Math.max(0, ((x - s[0]) * s[2] + (z - s[1]) * s[3]) / (s[2] * s[2] + s[3] * s[3])));
    const d = Math.hypot(x - s[0] - s[2] * t, z - s[1] - s[3] * t); if (d < m) m = d;
  }
  return m;
}

const menokoM = (x, z) => 1 - smooth(22, 48, Math.hypot(x + 104, (z - 66) * 1.2));
const canchaM = (x, z) => { const c = 0.94, s = 0.34, dx = x + 48, dz = z + 24; return 1 - smooth(0.8, 1.25, Math.hypot((dx * c + dz * s) / 22, (-dx * s + dz * c) / 7)); };

function hRaw(x, z) {
  let h = fbm(x * 0.01 + 5, z * 0.01 + 9) * 9 - 3 + fbm(x * 0.05, z * 0.05) * 1.4;
  h = lerp(2 + (fbm(x * 0.08, z * 0.08) - 0.5) * 0.3, h, smooth(30, 62, Math.hypot(x, z)));     // explanada de la aldea
  h = lerp(h, 2, canchaM(x, z));                                                               // cancha de palin
  const dc = Math.hypot(x - CERRO[0], z - CERRO[1]);
  h += 42 * Math.exp(-((dc / 42) ** 2)) + 7 * Math.exp(-((dc / 75) ** 2)) - 3 * Math.exp(-((dc / 7) ** 2)); // cerro, con cima aplanada
  h = lerp(h, -1.25 + (fbm(x * 0.12, z * 0.12) - 0.5) * 1.2, menokoM(x, z));                    // humedal
  const dr = z - riverZ(x), rv = Math.exp(-((dr / 11) ** 2));
  h = lerp(h, -2.5 - 0.6 * Math.exp(-(((x - 4) / 14) ** 2)), rv);                              // cauce del río y la poza
  h += smooth(16, 50, dr) * 18;                                                                // ribera sur
  h += smooth(-116, -150, z) * 22 + smooth(166, 200, Math.abs(x)) * 20 * (1 - Math.exp(-((dr / 24) ** 2))); // bordes
  return h;
}

// rejilla de alturas a 1 m, para consultar rápido
const GW = B.x1 - B.x0 + 1, GH = B.z1 - B.z0 + 1, GRID = new Float32Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) GRID[j * GW + i] = hRaw(B.x0 + i, B.z0 + j);
export function height(x, z) {
  const fx = Math.min(GW - 1.001, Math.max(0, x - B.x0)), fz = Math.min(GH - 1.001, Math.max(0, z - B.z0));
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * GW + i;
  return (GRID[k] * (1 - u) + GRID[k + 1] * u) * (1 - v) + (GRID[k + GW] * (1 - u) + GRID[k + GW + 1] * u) * v;
}
export function normalAt(x, z) {
  const e = 0.8, dx = height(x + e, z) - height(x - e, z), dz = height(x, z + e) - height(x, z - e);
  const l = Math.hypot(dx, 2 * e, dz); return [-dx / l, (2 * e) / l, -dz / l];
}

// Qué tipo de suelo hay en cada punto
export function zone(x, z, h, ny) {
  const dr = z - riverZ(x), nz = vnoise(x * 0.11 + 3, z * 0.11 + 8);
  if (h < WATER_Y + 0.15) return 'bed';
  if (Math.abs(dr) < 22 && h < 0.3) return 'pebble';
  if (ny < 0.74) return 'rock';
  const dc = Math.hypot(x - CERRO[0], z - CERRO[1]);
  if (dc < 34 && h > 28 + nz * 9) return nz > 0.5 ? 'rock' : 'alpine';
  if (pathDist(x, z) < 1.0 + nz * 0.9) return 'path';
  if (Math.hypot(x, z) < 31 + nz * 6) return nz > 0.74 ? 'meadow' : 'earth';
  if (canchaM(x, z) > 0.5) return 'earth';
  if (menokoM(x, z) > 0.35) return 'marsh';
  if (Math.hypot(x + 78, z - 30) < 22 + nz * 6) return 'meadow';
  if (Math.hypot(x - 108, z - 16) < 17 + nz * 4) return 'meadow';
  if (Math.hypot(x + 128, z + 96) < 62 + nz * 10) return 'moss';
  if (Math.hypot(x / 1.9, z + 94) < 42 + nz * 8) return 'needles';
  if (dc < 72) return nz > 0.58 ? 'alpine' : 'forest';
  if (dr > 20) return 'forest';
  return nz > 0.66 ? 'grassy' : 'forest';
}

export function inBounds(x, z) { return [Math.min(188, Math.max(-188, x)), Math.min(riverZ(x) + 15, Math.max(-138, z))]; }
