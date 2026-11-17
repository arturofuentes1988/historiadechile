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
// El cerro Treng Treng: ancho y de laderas tendidas; arriba queda casi plano, con un reborde. r: distancia a su centro.
const cerroH = (r) => 36 * Math.exp(-((r / 48) ** 2)) + 7 * Math.exp(-((r / 75) ** 2)) - 3 * Math.exp(-((r / 7) ** 2));
const menokoM = (x, z) => 1 - smooth(22, 48, Math.hypot(x + 104, (z - 66) * 1.2));
const canchaM = (x, z) => { const c = 0.94, s = 0.34, dx = x + 48, dz = z + 24; return 1 - smooth(0.8, 1.25, Math.hypot((dx * c + dz * s) / 22, (-dx * s + dz * c) / 7)); };
// La subida. En vez de ir derecho hacia la cima, el sendero rodea el cerro por el poniente y el norte ganando siempre la
// misma altura por cada paso (PEND: unos 13 grados) y sale arriba por el oriente, donde se para Curiñancu a mirar el volcán.
// Se traza sobre el terreno de verdad: a cada metro se busca hacia dónde hay que caminar para subir justo eso. Mientras
// la ladera es más suave va derecho hacia la cima, y se va acostando a medida que el cerro se empina.
// SUBIDA son sus puntos, uno por cada metro de camino; el último queda en el borde de la cima.
const PEND = 0.235, BORDE = 10.5;
export const SUBIDA = (() => {
  let x = 49, z = -37.5; const pts = [[x, z]];
  while (pts.length < 400) {
    const r = Math.hypot(CERRO[0] - x, CERRO[1] - z); if (r <= BORDE) break;
    const a0 = Math.atan2(CERRO[1] - z, CERRO[0] - x), h0 = hRaw(x, z), sube = (b) => hRaw(x + Math.cos(a0 - b), z + Math.sin(a0 - b)) - h0; // b: cuánto se desvía de ir derecho a la cima (0) hacia ir de costado (un cuarto de vuelta)
    let lo = 0, hi = Math.PI / 2; if (sube(0) > PEND) for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (sube(m) > PEND) lo = m; else hi = m; }
    const b = Math.min(lo, r < 26 ? 1.42 : 1.5); x += Math.cos(a0 - b); z += Math.sin(a0 - b); pts.push([x, z]); // nunca del todo de costado: siempre se acerca un poco a la cima
  }
  return pts;
})();
export const POI = {
  aldea: { x: 0, z: 0, name: 'Pewenko' }, // «agua de los pewenes»: el nombre de la aldea
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
  [[5, -4], [40, -30], ...SUBIDA.filter((q, i) => i % 5 === 0 || i === SUBIDA.length - 1), [CERRO[0] + 4.6, CERRO[1] - 2.6]], // al Treng Treng: la subida larga y, arriba, hasta el mirador
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

function hRaw(x, z) {
  let h = fbm(x * 0.01 + 5, z * 0.01 + 9) * 9 - 3 + fbm(x * 0.05, z * 0.05) * 1.4;
  h = lerp(2 + (fbm(x * 0.08, z * 0.08) - 0.5) * 0.3, h, smooth(30, 62, Math.hypot(x, z)));     // explanada de la aldea
  h = lerp(h, 2, canchaM(x, z));                                                               // cancha de palin
  const dc = Math.hypot(x - CERRO[0], z - CERRO[1]);
  h += cerroH(dc); // cerro, con cima aplanada
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
// El sendero de la subida va tallado en la ladera: a lo ancho queda plano (se camina derecho y no de costado) y a los
// lados la tierra vuelve de a poco a su forma. Su altura es la que tenía el cerro justo por donde pasa, emparejada a lo
// largo para que no tenga lomos.
{ const n = SUBIDA.length, nat = SUBIDA.map(([x, z]) => hRaw(x, z)), alto = nat.map((_, i) => { const w = Math.min(14, i, n - 1 - i); let a = 0; for (let k = i - w; k <= i + w; k++) a += nat[k]; return a / (2 * w + 1); });
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = B.x0 + i, z = B.z0 + j; if (Math.hypot(x - CERRO[0], z - CERRO[1]) > 86) continue;
    let best = 1e9, hb = 0;
    for (let k = 0; k < n - 1; k++) { const A = SUBIDA[k], dx = SUBIDA[k + 1][0] - A[0], dz = SUBIDA[k + 1][1] - A[1], t = Math.min(1, Math.max(0, ((x - A[0]) * dx + (z - A[1]) * dz) / (dx * dx + dz * dz || 1))), d = Math.hypot(x - A[0] - dx * t, z - A[1] - dz * t); if (d < best) { best = d; hb = lerp(alto[k], alto[k + 1], t); } }
    if (best < 12) GRID[j * GW + i] = lerp(GRID[j * GW + i], hb, 1 - smooth(2.2, 12, best));
  } }
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
  if (pathDist(x, z) < 1.0 + nz * 0.9) return 'path'; // antes que la roca de la cumbre: el sendero se ve hasta arriba
  if (dc < 34 && h > 26 + nz * 8) return nz > 0.5 ? 'rock' : 'alpine';
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
