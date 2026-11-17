// Pide a kie.ai las imágenes de referencia del cuerpo de Leftraru, para pasarlas después a un servicio que las convierta
// en un modelo 3D. Cada imagen es la misma figura (de frente, cuerpo entero, brazos algo separados, fondo liso) en un estilo.
//
// Uso:  node tools/kie-personaje.mjs        pide las dos (a y c)
//       node tools/kie-personaje.mjs c      pide solo esa
//
// La clave se lee de la variable de entorno KIE_API_KEY o del archivo .env.local de la carpeta del juego (git lo ignora).
// Nunca se imprime. Las imágenes quedan en docs/personaje/. Cómo se pide una imagen está explicado en tools/kie-texturas.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let clave = process.env.KIE_API_KEY || '';
if (!clave) { try { const m = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8').match(/^\s*KIE_API_KEY\s*=\s*"?([^"\r\n]+?)"?\s*$/m); if (m) clave = m[1].trim(); } catch { /* no hay archivo */ } }
if (!clave) { console.error('Falta la clave de kie.ai: crea el archivo .env.local en la carpeta del juego con la línea KIE_API_KEY=tu_clave'); process.exit(2); }

const API = 'https://api.kie.ai/api/v1', CAB = { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' };
// Lo que no cambia: la figura, tal como está en docs/personajes.md, y cómo tiene que venir para que sirva de base a un modelo 3D.
const FIGURA = 'Full-body character reference image for building a 3D model. A single figure seen straight from the front, standing upright in a relaxed A-pose: arms held slightly away from the body, hands open and empty, feet slightly apart. The whole body is visible from the top of the head to the bare feet, centered, with margin around it. Plain neutral light-grey background, soft even studio light, no cast shadows, no ground, no scenery. '
  + 'The figure is an eleven-year-old Mapuche boy from southern Chile in the year 1545: slim and wiry, about 1.38 m tall, long legs for his age, scabbed knees. Straight black hair down to the shoulders, held by a red hand-woven wool headband. Large attentive dark eyes, straight eyebrows, a serious mouth, a small scar on the left eyebrow. '
  + 'He wears a short dark-grey hand-woven wool poncho with two horizontal red stripes, open at the sides and reaching only to the waist so that both arms are fully visible, over a brown wool wrap tied at the waist with a woven sash and reaching the knees. A small plant-fibre bag hangs across his chest. Barefoot. '
  + 'No metal, no jewellery, no feathers, no shoes, no weapons, no modern objects. No text, no watermark, no frame, no extra views.';
const ESTILOS = {
  a: 'Style: photorealistic, natural human proportions, realistic skin and coarse hand-woven wool texture, like a documentary studio photograph.',
  c: 'Style: hand-painted stylized 3D adventure-game character, near-realistic proportions with slightly larger eyes, soft visible brush strokes on skin and cloth, clean readable shapes, matte colours. Not photorealistic, not cartoonish.',
};

const pide = async (ruta, cuerpo) => { const r = await fetch(API + ruta, cuerpo ? { method: 'POST', headers: CAB, body: JSON.stringify(cuerpo) } : { headers: CAB }); const t = await r.text(); try { return JSON.parse(t); } catch { throw new Error(`Respuesta que no se entiende (${r.status}): ${t.slice(0, 200)}`); } };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const saldo = async () => { try { const j = await pide('/chat/credit'); return j.data; } catch { return '?'; } };

const cuales = process.argv.slice(2).map((s) => s.toLowerCase()).filter((s) => ESTILOS[s]);
const lista = cuales.length ? cuales : Object.keys(ESTILOS);
const destino = path.join(raiz, 'docs', 'personaje'); fs.mkdirSync(destino, { recursive: true });
console.log('Créditos antes:', await saldo());
for (const k of lista) {
  const j = await pide('/jobs/createTask', { model: 'nano-banana-pro', input: { prompt: `${FIGURA} ${ESTILOS[k]}`, aspect_ratio: '2:3', resolution: '2K', output_format: 'png' } });
  const id = j.data && j.data.taskId; if (!id) { console.error(`Opción ${k}: no se pudo pedir.`, JSON.stringify(j).slice(0, 300)); continue; }
  console.log(`Opción ${k}: pedida. Esperando…`);
  let url = null;
  for (let i = 0; i < 90 && !url; i++) { // hasta unos siete minutos
    await espera(5000); const q = await pide(`/jobs/recordInfo?taskId=${id}`), d = q.data || {};
    if (d.state === 'fail') { console.error(`Opción ${k}: falló.`, String(d.failMsg || d.failCode || '').slice(0, 200)); break; }
    if (d.state === 'success') { const res = typeof d.resultJson === 'string' ? JSON.parse(d.resultJson) : d.resultJson || {}; url = (res.resultUrls || [])[0] || null; if (!url) { console.error(`Opción ${k}: terminó sin imagen.`); break; } }
  }
  if (!url) continue;
  const img = await fetch(url); const archivo = path.join(destino, `leftraru-${k}.png`); fs.writeFileSync(archivo, Buffer.from(await img.arrayBuffer()));
  console.log(`Opción ${k}: guardada en docs/personaje/leftraru-${k}.png`);
}
console.log('Créditos después:', await saldo());
