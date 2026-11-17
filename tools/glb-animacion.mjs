// Saca de un modelo .glb solo el movimiento (la animación) y lo guarda en un archivo chico de texto.
// Cada animación que se pide a Higgsfield llega dentro de una copia entera del modelo (unos 2 MB). El juego necesita el
// modelo una sola vez; de las demás copias solo sirve cómo se mueve cada hueso. Este guion deja eso en unos pocos KB.
//
// Uso:  node tools/glb-animacion.mjs entrada.glb salida.json nombre [cada]
import fs from 'node:fs';

const [entrada, salida, nombre = 'animacion', cada = '1'] = process.argv.slice(2); // cada: de cada cuántos cuadros se guarda uno (los largos no necesitan todos)
if (!entrada || !salida) { console.error('Uso: node tools/glb-animacion.mjs entrada.glb salida.json nombre'); process.exit(2); }
const buf = fs.readFileSync(entrada), largoJson = buf.readUInt32LE(12), j = JSON.parse(buf.subarray(20, 20 + largoJson).toString('utf8'));
const bin = buf.subarray(20 + largoJson + 8); // lo que sigue al encabezado del segundo trozo: los números
const NUM = { SCALAR: 1, VEC3: 3, VEC4: 4 };
const lee = (i) => { const a = j.accessors[i], v = j.bufferViews[a.bufferView], n = NUM[a.type], paso = v.byteStride || n * 4, base = (v.byteOffset || 0) + (a.byteOffset || 0), out = new Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = bin.readFloatLE(base + k * paso + c * 4); return out; };
const r = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const an = j.animations && j.animations[0]; if (!an) { console.error('El archivo no trae ninguna animación.'); process.exit(1); }
const pistas = []; let dur = 0;
for (const c of an.channels) {
  const hueso = j.nodes[c.target.node].name, s = an.samplers[c.sampler], t = lee(s.input), v = lee(s.output); dur = Math.max(dur, t[t.length - 1]);
  if (c.target.path === 'scale') continue;                                  // nadie cambia de tamaño
  if (c.target.path === 'translation' && hueso !== 'Hips') continue;        // el largo de cada hueso no cambia: solo la cadera se desplaza
  const n = c.target.path === 'rotation' ? 4 : 3, paso = Math.max(1, +cada | 0), deja = t.map((_, i) => i).filter((i) => i % paso === 0 || i === t.length - 1); // de cada «cada» cuadros se deja uno, y siempre el último
  pistas.push({ hueso, que: n === 4 ? 'giro' : 'lugar', t: deja.map((i) => r(t[i], 4)), v: deja.flatMap((i) => v.slice(i * n, i * n + n).map((x) => r(x, n === 4 ? 5 : 3))) });
}
fs.writeFileSync(salida, JSON.stringify({ nombre, dura: r(dur, 4), pistas }));
console.log(`${nombre}: ${pistas.length} pistas, ${r(dur, 2)} s, ${(fs.statSync(salida).size / 1024).toFixed(0)} KB`);
