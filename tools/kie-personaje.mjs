// Pide a kie.ai las imágenes de referencia del cuerpo de un personaje, para pasarlas después a un servicio que las convierta
// en un modelo 3D. Cada imagen es la misma figura (de frente, cuerpo entero, brazos algo separados, fondo liso) en una opción.
//
// Uso:  node tools/kie-personaje.mjs millaray        pide todas las opciones de Millaray
//       node tools/kie-personaje.mjs millaray 1      pide solo esa
//       node tools/kie-personaje.mjs curinancu       pide las de Curiñancu (namku: la de Ñamku)
//       node tools/kie-personaje.mjs leftraru c      (sin nombre, se entiende Leftraru)
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
// Lo que no cambia: cómo tiene que venir la figura para que sirva de base a un modelo 3D, y los dos estilos.
const POSE = 'Full-body character reference image for building a 3D model. A single figure seen straight from the front, standing upright in a relaxed A-pose: arms held slightly away from the body, hands open and empty, feet slightly apart. The whole body is visible from the top of the head to the bare feet, centered, with margin around it. Plain neutral light-grey background, soft even studio light, no cast shadows, no ground, no scenery. ';
const SIN = 'No silver, no feathers, no shoes, no weapons, no modern objects. No text, no watermark, no frame, no extra views.';
const FOTO = 'Style: photorealistic, natural human proportions, realistic skin and coarse hand-woven wool texture, like a documentary studio photograph.';
const PINTADO = 'Style: hand-painted stylized 3D adventure-game character, near-realistic proportions with slightly larger eyes, soft visible brush strokes on skin and cloth, clean readable shapes, matte colours. Not photorealistic, not cartoonish.'; // el estilo elegido para Leftraru: los demás personajes van en el mismo

// Cada personaje, tal como está en docs/personajes.md. opciones: lo que cambia de una imagen a otra.
const LEFTRARU = POSE
  + 'The figure is an eleven-year-old Mapuche boy from southern Chile in the year 1545: slim and wiry, about 1.38 m tall, long legs for his age, scabbed knees. Straight black hair down to the shoulders, held by a red hand-woven wool headband. Large attentive dark eyes, straight eyebrows, a serious mouth, a small scar on the left eyebrow. '
  + 'He wears a short dark-grey hand-woven wool poncho with two horizontal red stripes, open at the sides and reaching only to the waist so that both arms are fully visible, over a brown wool wrap tied at the waist with a woven sash and reaching the knees. A small plant-fibre bag hangs across his chest. Barefoot. '
  + 'No metal, no jewellery, no feathers, no shoes, no weapons, no modern objects. No text, no watermark, no frame, no extra views.';
// Millaray: la madre, tejedora. Sin platería (es posterior); cobre, concha y semillas sí. El vestido deja los brazos a la vista
// y llega a media pierna, para que al hacer el modelo se distingan brazos, piernas y pies.
const MILLARAY = POSE
  + 'The figure is a Mapuche woman of about thirty-five from southern Chile in the year 1545, a weaver and mother: medium height, about 1.56 m, strong arms and shoulders from working at the loom, warm brown skin. Lively dark eyes, arched eyebrows, a dry half-smile. Her fingertips are stained with red and ochre plant dye. '
  + 'She wears a black hand-woven wool wrap dress (küpam): one rectangular cloth wrapped around the body and fastened over the left shoulder, leaving both arms bare and fully visible, reaching mid-calf so that the ankles and bare feet show. A wide red hand-woven sash with small geometric white and black figures is wound around her waist. Barefoot. ';
// Curiñancu: el padre, lonko de la aldea. Lo más elaborado de la aldea va en su makuñ, pero corto y abierto a los lados, para
// que al hacer el modelo se distingan los brazos. El bastón de mando no va en la imagen (las manos, vacías): se le pone después.
const CURINANCU = POSE
  + 'The figure is a Mapuche man of about forty from southern Chile in the year 1545, the head of his community (lonko) and a father: tall for his people, about 1.68 m, broad back and shoulders, large strong hands, warm brown skin, calm upright posture. Firm jaw, marked cheekbones, deep wrinkles beside the eyes, a steady serene gaze, closed mouth. No beard, no moustache. Straight thick black hair, long, reaching the middle of the back, with the first grey hairs at the temples. '
  + 'A light cream hand-woven wool headband (trarilonko) across the forehead. He wears a short black hand-woven wool poncho (makuñ), open at the sides and reaching only to the waist so that both arms are bare and fully visible from the shoulders, over a dark brown wool wrap (chamal) tied at the waist with a woven sash and reaching just below the knees, so that the calves and bare feet show. Barefoot. ';
// Ñamku: el anciano que guarda la memoria de la aldea. En la ficha va encorvado; aquí se pide derecho, con los hombros apenas
// caídos, porque el modelo necesita nacer de pie (lo encorvado se le da después, al moverlo). La manta extra va atrás, como capa
// corta, para no tapar los brazos.
const NAMKU = POSE
  + 'The figure is a very old Mapuche man of about eighty from southern Chile in the year 1545, the elder who keeps the memory of his village: thin and bony, about 1.58 m tall, shoulders slightly rounded with age but standing upright, long bony hands. Weathered, deeply wrinkled warm brown skin, an aquiline nose, deep-set bright dark eyes, thin lips with a hint of a wry smile. No beard, no moustache. Long, thin, white hair falling behind the shoulders, held by a plain light cream hand-woven wool headband. An old pale scar on the left forearm. '
  + 'He wears a short faded-brown hand-woven wool poncho (makuñ) with one light cream horizontal stripe, open at the sides and reaching only to the waist so that both thin arms are bare and fully visible from the shoulders, over a darker brown wool wrap (chamal) tied at the waist with a plain woven sash and reaching just below the knees, so that the thin calves and bare feet show. A small folded brown wool blanket rests on the back of his shoulders and hangs down his back like a short cape, not covering the arms. A very old hammered copper pendant, dull and greenish at the edges, hangs from a cord on his chest. Barefoot. ';
const PERSONAJES = {
  leftraru: { a: `${LEFTRARU} ${FOTO}`, c: `${LEFTRARU} ${PINTADO}` },
  millaray: {
    // 1: tal como la ficha. 2: con el cintillo rojo que lleva hoy en el juego y cobre, que las crónicas sí mencionan en las mujeres.
    1: `${MILLARAY}Black hair in two long thick braids hanging in front over the shoulders down to the waist, each tied at the end with red wool yarn; no headband. A short black wool shawl with a red border (ikülla) hangs behind her shoulders down her back like a short cape, not covering the arms. A necklace of dark seeds and small white shells. ${SIN} ${PINTADO}`,
    2: `${MILLARAY}Black hair in two long thick braids hanging down her back, a red hand-woven wool headband across the forehead like her son's. Small hammered copper disc earrings and a thin copper bracelet on one wrist. A short black wool shawl with a red border (ikülla) rests on her shoulders and is knotted at the chest, short enough that the arms are visible from above the elbow. A necklace of small white shells and green stone beads. ${SIN} ${PINTADO}`,
  },
  curinancu: {
    // 1: tal como la ficha: franjas rojas y blancas, pelo suelto, collar de llanka. 2: con figuras escalonadas blancas en el makuñ
    // (el poncho de los lonkos; que sea así de antiguo está por confirmar), el pelo amarrado atrás y un disco de cobre al cuello.
    1: `${CURINANCU}His hair hangs loose behind the shoulders. The black poncho has three horizontal woven bands across the chest and back: red, white and red, each a few centimetres wide, finely woven. A necklace of polished green stone beads (llanka) lies on his chest. ${SIN} ${PINTADO}`,
    2: `${CURINANCU}His hair is gathered behind and tied low at the nape with a cream wool cord, falling down his back. The black poncho carries one wide horizontal band of white stepped-diamond figures between two thin red stripes across the chest and back, the most elaborate weaving of the village; the headband has small red stepped figures. A necklace of green stone beads (llanka) with one small hammered copper disc at the centre. The woven sash at his waist is red and white. ${SIN} ${PINTADO}`,
  },
  namku: { 1: `${NAMKU}${SIN} ${PINTADO}` }, // una sola opción, tal como la ficha
};

const pide = async (ruta, cuerpo) => { const r = await fetch(API + ruta, cuerpo ? { method: 'POST', headers: CAB, body: JSON.stringify(cuerpo) } : { headers: CAB }); const t = await r.text(); try { return JSON.parse(t); } catch { throw new Error(`Respuesta que no se entiende (${r.status}): ${t.slice(0, 200)}`); } };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const saldo = async () => { try { const j = await pide('/chat/credit'); return j.data; } catch { return '?'; } };

const args = process.argv.slice(2).map((s) => s.toLowerCase()), quien = PERSONAJES[args[0]] ? args.shift() : 'leftraru', OPC = PERSONAJES[quien];
const cuales = args.filter((s) => OPC[s]), lista = cuales.length ? cuales : Object.keys(OPC);
const destino = path.join(raiz, 'docs', 'personaje'); fs.mkdirSync(destino, { recursive: true });
console.log('Créditos antes:', await saldo());
const una = async (k) => {
  const j = await pide('/jobs/createTask', { model: 'nano-banana-pro', input: { prompt: OPC[k], aspect_ratio: '2:3', resolution: '2K', output_format: 'png' } });
  const id = j.data && j.data.taskId; if (!id) { console.error(`${quien} ${k}: no se pudo pedir.`, JSON.stringify(j).slice(0, 300)); return; }
  console.log(`${quien} ${k}: pedida. Esperando…`);
  let url = null;
  for (let i = 0; i < 90 && !url; i++) { // hasta unos siete minutos
    await espera(5000); const q = await pide(`/jobs/recordInfo?taskId=${id}`), d = q.data || {};
    if (d.state === 'fail') { console.error(`${quien} ${k}: falló.`, String(d.failMsg || d.failCode || '').slice(0, 200)); return; }
    if (d.state === 'success') { const res = typeof d.resultJson === 'string' ? JSON.parse(d.resultJson) : d.resultJson || {}; url = (res.resultUrls || [])[0] || null; if (!url) { console.error(`${quien} ${k}: terminó sin imagen.`); return; } }
  }
  if (!url) return;
  const img = await fetch(url); fs.writeFileSync(path.join(destino, `${quien}-${k}.png`), Buffer.from(await img.arrayBuffer()));
  console.log(`${quien} ${k}: guardada en docs/personaje/${quien}-${k}.png`);
};
await Promise.all(lista.map(una)); // todas a la vez
console.log('Créditos después:', await saldo());
