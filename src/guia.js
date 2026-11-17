// La línea de guía: el camino sugerido desde donde estás hasta un destino.
// Sigue los senderos cuando conviene (todos parten de la plaza) y, si no, va derecho.
import { PATHS } from './terrain.js';

// La red de senderos: cada punto es un nodo y los senderos se juntan en la plaza (nodo 0).
const nodes = [[0, 0]], edges = [];
for (const path of PATHS) { let prev = 0; for (const [x, z] of path) { nodes.push([x, z]); edges.push([prev, nodes.length - 1]); prev = nodes.length - 1; } }
const N = nodes.length, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// distancia más corta entre todos los pares de nodos, y por dónde seguir para llegar (la red es chica: se calcula una vez)
const D = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (i === j ? 0 : Infinity))), NEXT = Array.from({ length: N }, () => new Array(N).fill(-1));
for (const [a, b] of edges) { const l = dist(nodes[a], nodes[b]); D[a][b] = D[b][a] = l; NEXT[a][b] = b; NEXT[b][a] = a; }
for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (D[i][k] + D[k][j] < D[i][j]) { D[i][j] = D[i][k] + D[k][j]; NEXT[i][j] = NEXT[i][k]; }

// el punto de la red más cercano a (x, z): en qué tramo cae y a qué distancia queda
function onto(x, z) {
  let best = null;
  for (const [a, b] of edges) {
    const A = nodes[a], B = nodes[b], dx = B[0] - A[0], dz = B[1] - A[1], t = Math.min(1, Math.max(0, ((x - A[0]) * dx + (z - A[1]) * dz) / (dx * dx + dz * dz || 1)));
    const q = [A[0] + dx * t, A[1] + dz * t], d = Math.hypot(x - q[0], z - q[1]);
    if (!best || d < best.d) best = { a, b, q, d };
  }
  return best;
}
const length = (pts) => { let l = 0; for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]); return l; };
// La plaza es terreno abierto: ahí no hace falta pasar por el centro. De cada tramo que cruza la plaza
// se dejan solo el punto por donde se entra y el punto por donde se sale.
const inPlaza = (q) => Math.hypot(q[0], q[1]) < 12;
function tidy(pts) {
  const n = pts.length, out = [pts[0]];
  for (let i = 1; i < n - 1;) {
    if (!inPlaza(pts[i])) { out.push(pts[i++]); continue; }
    let j = i; while (j + 1 < n - 1 && inPlaza(pts[j + 1])) j++;
    const entra = !inPlaza(pts[0]) || i > 1, sale = !inPlaza(pts[n - 1]) || j < n - 2;
    if (entra) out.push(pts[i]); if (sale && !(entra && j === i)) out.push(pts[j]);
    i = j + 1;
  }
  out.push(pts[n - 1]); return out;
}

// Camino de S a G como lista de puntos [x, z]. viaAntes: si la vez anterior iba por los senderos (para no saltar de una opción a otra).
export function route(sx, sz, gx, gz, viaAntes = false) {
  const S = [sx, sz], G = [gx, gz], direct = dist(S, G);
  if (direct < 22) return { pts: [S, G], via: false, len: direct };
  const s = onto(sx, sz), g = onto(gx, gz); let mid = [];
  if (!(s.a === g.a && s.b === g.b)) { // por los nodos de la red: se prueba salir y llegar por cada extremo de su tramo
    let best = Infinity, pick = null;
    for (const i of [s.a, s.b]) for (const j of [g.a, g.b]) { const l = dist(s.q, nodes[i]) + D[i][j] + dist(nodes[j], g.q); if (l < best) { best = l; pick = [i, j]; } }
    for (let i = pick[0]; i !== pick[1]; i = NEXT[i][pick[1]]) mid.push(nodes[i]); mid.push(nodes[pick[1]]);
  }
  const net = tidy([S, s.q, ...mid, g.q, G].filter((p, i, l) => !i || dist(p, l[i - 1]) > 0.6)), nl = length(net);
  const via = nl <= direct * (viaAntes ? 1.9 : 1.6) + 15; // el sendero vale la pena si no alarga demasiado
  return via ? { pts: net, via, len: nl } : { pts: [S, G], via, len: direct };
}
