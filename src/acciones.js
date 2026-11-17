// Cosas que Leftraru puede hacer en el mundo además de observar: recoger plantas, llevar encargos,
// ayudar en la aldea, sentarse al fogón, saludar al bosque, seguir huellas, jugar palin y tirar piedras al río.
// También lleva el hilo de la historia: qué misión principal está abierta y quién la da.
import * as THREE from 'three';
import { height, POI, CERRO, SUBIDA, riverZ, WATER_Y } from './terrain.js';
import { animatePerson } from './life.js';
import { FOGON, CORRAL, OLLA } from './village.js';

const KEY = 'leftraru.tareas';
// qué se recoge, cómo se llama en la mano y de dónde sale
const ITEMS = {
  canelo: { uno: 'hojas de canelo', tree: 'canelo' }, quillay: { uno: 'corteza de quillay', tree: 'quillay' }, maqui: { uno: 'hojas de maqui', bush: true },
  murtilla: { uno: 'murtilla', plant: 'murtilla' }, michay: { uno: 'raíz de michay', plant: 'michay' }, nalca: { uno: 'tallo de nalca', plant: 'nalca' },
  // para preparar: lo que se junta en el monte y lo que sale de las manos
  boldo: { uno: 'hojas de boldo', tree: 'boldo' }, quila: { uno: 'caña de quila', plant: 'quila' }, pluma: { uno: 'pluma', pluma: true },
  remedio: { uno: 'agua de hierbas' }, flecha: { uno: 'flecha' }, arco: { uno: 'arco' }, presa: { uno: 'pudú' },
};
const FUEGO = [
  ['La abuela', 'El fuego no se deja solo, niño. Mientras arde, la casa está viva.'],
  ['La abuela', 'Dicen que el primer fuego lo trajo un pájaro en el pico. Por eso a los pájaros no se les tira piedras.'],
  ['La abuela', 'Mira el humo: si sube derecho, mañana no llueve. Si se acuesta, guarda la leña bajo techo.'],
  ['La abuela', 'Antes de comer, el primer bocado es para la tierra. Ella comió primero que nosotros y comerá después.'],
  ['La abuela', 'Cuando yo era chica, mi abuela me contaba estas mismas cosas en este mismo lugar. Algún día las contarás tú.'],
];
// Cómo se ven en la bolsa las cosas que no tienen ficha en el cuaderno. usar: si se puede usar desde la bolsa, qué dice el botón.
const DIB = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
const COSAS = {
  pluma: { title: 'Pluma', ico: DIB('<path d="M19 4C11 5 6 10 5 19M5 19c4-1 9-3 12-8M9 13l5-1M8 16l6-2"/>') },
  flecha: { title: 'Flecha', ico: DIB('<path d="M4 20 19 5M19 5h-5M19 5v5M5.500 15.500l3 3M8 13l3 3"/>') },
  arco: { title: 'Arco de Ñamku', ico: DIB('<path d="M7 3c9 3 9 15 0 18M7 3v18"/>') },
  remedio: { title: 'Agua de hierbas', usar: 'Tomar', ico: DIB('<path d="M4 11h16c0 5-3.5 8-8 8s-8-3-8-8zM9 7c0-1.5 1.5-1.5 1.5-3M13.5 7c0-1.5 1.5-1.5 1.5-3"/>') },
  presa: { title: 'Pudú para la olla', ico: DIB('<path d="M4 16c0-4 3-6 7-6h4l2-3 1 3c1.5.5 2 2 2 4M6 16v4M15 16v4M9 16h6"/>') },
};
const LUGARES = { viejo: 'el bosque viejo', menoko: 'el menoko', antiguos: 'el lugar de los antiguos' };
const HUELLAS = [[-70, -70], [40, -52], [-60, 66]];
const NOMBRE = { curinancu: 'Curiñancu', millaray: 'Millaray', abuela: 'la abuela', ayelen: 'Ayelén', rayen: 'Rayen', machi: 'la machi', namku: 'Ñamku' }; // cómo se llama en el mundo cada persona del cuaderno

export function createActions({ world, ui, snd, scene, hint, speak, murmur, ripple, player, place, pinones, story, sanar, choca, guiar, tecla = (a) => a }) {
  const TRONCOS = [0, 1, 2, 3, 4].map((i) => { const a = 0.6 + i * 1.2; return { x: FOGON.x + Math.cos(a) * 2.9, z: FOGON.z + Math.sin(a) * 2.9, a }; }); // los troncos alrededor del fogón
  const S = Object.assign({ f: {}, inv: {} }, JSON.parse(localStorage.getItem(KEY) || '{}')), save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const f = S.f, inv = S.inv, have = (id) => inv[id] || 0, d2 = (p, x, z) => Math.hypot(p.x - x, p.z - z), actor = (name) => world.life.actors.find((a) => a.name === name);
  for (const id in inv) if (ITEMS[id]) for (let i = 0; i < inv[id]; i++) ui.addItem(id);
  const give = (id, n = 1) => { inv[id] = have(id) + n; if (ITEMS[id]) for (let i = 0; i < n; i++) ui.addItem(id); save(); };
  const take = (id, n) => { inv[id] = Math.max(0, have(id) - n); if (ITEMS[id]) ui.takeItem(id, n); save(); };
  const set = (k, v = 1) => { f[k] = v; save(); };
  // la historia: m1 = piñones para Millaray (1 encargada, 2 entregados), m2 = el padre en el cerro (2 hecha), m3 = las plantas de la machi
  { const d = ui.state.done; if (f.m3 || d.m2) { f.m1 = 2; f.m2 = 2; } else if (d.m1 && f.m1 !== 2) f.m1 = 2; } // partidas guardadas antes de que la historia fuera lineal
  S.pin = S.pin || []; // piñones ya recogidos

  // ---------- Curiñancu te lleva al cerro: va adelante por el sendero, a tu paso, y si te quedas atrás te espera ----------
  // f.m2: 1 mientras suben (o te espera arriba), 2 cuando ya te mostró lo que quería.
  const padre = actor('Curiñancu'), CIMA = [CERRO[0] + 4.6, CERRO[1] - 2.6], CASA = [2, -9];
  // el camino: el sendero del nororiente y la subida larga que rodea el cerro; arriba, del borde derecho a su lugar en el mirador
  const SUBE = SUBIDA.filter((q, i) => i % 6 === 0 || i === SUBIDA.length - 1), RUTA = [[6, -5], [40, -30], ...SUBE, CIMA];
  // lo que va diciendo al pasar ciertos puntos de la ruta: al entrar al bosque, a media subida y poco antes de llegar
  const tramo = (u) => 2 + Math.round(u * (SUBE.length - 1)), DICHOS = { [tramo(0.12)]: '¿Oyes a los choroyes? Donde gritan, hay piñones. El bosque avisa todo, si uno sabe escuchar.', [tramo(0.5)]: 'Por aquí subía yo con mi padre, cuando tenía tu edad. Y él, con el suyo.', [tramo(0.85)]: 'Este cerro salvó a nuestra gente cuando subió el mar. Por eso se llama Treng Treng.' };
  const volcan = () => Math.atan2(world.volcano.x - CIMA[0], world.volcano.z - CIMA[1]); // arriba queda mirando hacia el volcán
  const enCima = () => !!padre && !padre.yendo && d2(padre, CIMA[0], CIMA[1]) < 3;
  function ponPadre(arriba) { padre.mode = 'idle'; padre.yendo = false; padre.quieto = arriba; [padre.x, padre.z] = arriba ? CIMA : CASA; padre.face = arriba ? volcan() : Math.PI; padre.speed = 0; }
  function padreSube() { if (!padre) return; padre.mode = 'lead'; padre.yendo = true; padre.ri = 0; padre.speed = 0; padre.aviso = 0; }
  function guia(dt, p) {
    const a = padre, [tx, tz] = RUTA[a.ri], d = d2(a, tx, tz), lejos = d2(p, a.x, a.z), vaAdelante = d2(p, CIMA[0], CIMA[1]) < d2(a, CIMA[0], CIMA[1]) - 1;
    const espera = lejos > 13 && !vaAdelante; a.aviso -= dt;
    // cada tanto vuelve la cabeza para ver si lo sigues
    a.reloj = (a.reloj || 0) + dt; const atras = Math.atan2(p.x - a.x, p.z - a.z) - a.face, giro = Math.atan2(Math.sin(atras), Math.cos(atras));
    a.mira = !espera && !vaAdelante && a.reloj % 6 > 4.5 ? Math.max(-1.3, Math.min(1.3, giro)) : 0;
    // a tu paso: más lento si vienes rezagado, más vivo si te adelantaste; detenido y mirándote si te quedaste lejos
    const want = espera ? 0 : vaAdelante ? 3.9 : lejos < 5 ? 3.2 : 2.5, to = espera ? Math.atan2(p.x - a.x, p.z - a.z) : Math.atan2(tx - a.x, tz - a.z);
    let df = to - a.face; df = Math.atan2(Math.sin(df), Math.cos(df)); a.face += df * Math.min(1, dt * (espera ? 2.5 : 5));
    a.speed += (want - a.speed) * Math.min(1, dt * 3);
    if (!espera) { const k = Math.max(0, Math.cos(df)); a.x += Math.sin(a.face) * a.speed * k * dt; a.z += Math.cos(a.face) * a.speed * k * dt; }
    else if (a.aviso <= 0 && lejos < 60) { a.aviso = 14; murmur('Curiñancu', 'Por aquí, hijo. Te espero.'); }
    if (d < 0.8) {
      if (a.ri === RUTA.length - 1) { ponPadre(true); if (lejos < 30) murmur('Curiñancu', 'Llegamos. Ven, párate aquí, a mi lado.'); return; }
      a.ri++; if (DICHOS[a.ri] && lejos < 22) murmur('Curiñancu', DICHOS[a.ri]);
    }
  }
  if (padre && f.m2 === 1) ponPadre(true); // si se cierra el juego a medio camino, al volver te espera arriba

  // ---------- Millaray: teje en el telar; cuando ya juntaste todos los piñones te espera junto al fogón, revolviendo la olla ----------
  const mama = actor('Millaray'), TELAR_M = mama && [mama.x, mama.z, mama.face];
  function madreCocina(si) {
    if (!mama || (mama.mode === 'cook') === si) return;
    if (si) { const fc = 2.6, sn = Math.sin(fc), cs = Math.cos(fc), lado = 0.122 * mama.h, ade = 0.332 * mama.h; // se para de modo que su mano derecha, estirada, quede justo sobre la olla
      mama.mode = 'cook'; mama.face = fc; mama.x = OLLA.x + lado * cs - ade * sn; mama.z = OLLA.z - lado * sn - ade * cs; }
    else { [mama.x, mama.z, mama.face] = TELAR_M; mama.mode = 'work'; mama.head.rotation.y = 0; }
    if (mama.palo) mama.palo.visible = si;
  }
  if (f.m1 === 1 && S.pin.length >= world.items.length) madreCocina(true); // si se cerró el juego con los piñones ya juntos
  // Entregados los piñones, al rato deja la olla y vuelve caminando al telar, rodeando el fogón por entre los troncos.
  // (Si Leftraru se aleja mucho antes de que parta, aparece allá, como siempre.)
  const RUTA_TELAR = [[0.0, 2.05], [-2.15, 1.95], [-8.6, -4.9]]; let vuelve = null; // vuelve: { t: cuánto espera antes de partir, i: en qué tramo va }
  function updateVuelve(dt) {
    const v = vuelve; if (!mama) { vuelve = null; return; }
    if (mama.mode === 'cook') { if (!mama.habla && (v.t -= dt) <= 0) { mama.mode = 'lead'; mama.speed = 0; mama.mira = 0; if (mama.palo) mama.palo.visible = false; } return; }
    if (mama.mode !== 'lead') { vuelve = null; return; }
    if (mama.habla) { mama.speed += (0 - mama.speed) * Math.min(1, dt * 6); return; } // si le hablan en el camino, se detiene
    const dest = v.i < RUTA_TELAR.length ? RUTA_TELAR[v.i] : TELAR_M, dx = dest[0] - mama.x, dz = dest[1] - mama.z, d = Math.hypot(dx, dz);
    mama.speed += (1.15 - mama.speed) * Math.min(1, dt * 3); const paso = mama.speed * dt; let g = Math.atan2(dx, dz) - mama.face; g = Math.atan2(Math.sin(g), Math.cos(g)); mama.face += g * Math.min(1, dt * 5);
    if (d > Math.max(paso, 0.12)) { mama.x += dx / d * paso; mama.z += dz / d * paso; return; }
    if (v.i < RUTA_TELAR.length) { v.i++; return; }
    mama.x = TELAR_M[0]; mama.z = TELAR_M[1]; mama.speed = 0; mama.mode = 'work'; mama.face0 = TELAR_M[2]; vuelve = null; // llegó: se vuelve hacia la tela y sigue tejiendo
  }

  // ---------- lo que hace falta ahora, según los encargos abiertos ----------
  let busca = false, yo = null; // busca: anda buscando con qué hacer una flecha; yo: dónde está Leftraru
  function needs() {
    const n = {};
    if (f.m3 === 1) { n.canelo = 2; n.quillay = 1; n.maqui = 2; }
    if (f.ab === 1) n.murtilla = 3;
    if (f.mi === 1) n.michay = 2;
    if (f.na === 1) n.nalca = 2;
    if (f.rm === 1) { n.maqui = 2; n.boldo = 2; }
    if (f.cz === 1) { n.quila = 3; n.pluma = 3; }
    if (busca) { if (have('quila') && have('pluma')) busca = false; else { n.quila = Math.max(n.quila || 0, 1); n.pluma = Math.max(n.pluma || 0, 1); } } // quiso hacer una flecha y le faltaba algo: se marca dónde hay
    for (const k in n) n[k] = Math.max(0, n[k] - have(k));
    return n;
  }
  const falta = () => { const n = needs(), l = Object.keys(n).filter((k) => n[k] > 0).map((k) => `${n[k]} de ${ITEMS[k].uno}`); return l.length ? l.join(', ') : ''; };
  const listo = (ids) => { const n = needs(); return ids.every((k) => !n[k]); };

  // ---------- conversaciones de la historia y de los encargos ----------
  // Devuelve lo que esta persona tiene que decirte ahora, o nada si no hay nada pendiente.
  // main: es parte de la historia principal (si aún no la conocías, se presenta con estas mismas palabras).
  const LLAMA = 'Leftraru, ven. Deja de mirar pájaros un momento, que te necesito.', LANA = 'Ahora ayúdame con las manos: alcánzame la lana roja, que no quiero soltar el hilo.';
  const ENCARGO = ['Faltan pocos días para el We Tripantu, la noche más larga, y vienen los parientes de la costa. Los piñones no van a alcanzar para tanta gente.', 'Anda al bosque de pewenes, por el sendero del norte, y tráeme los que queden. Recoge los que cayeron solos: no sacudas el árbol, que él decide cuánto da.', 'Uno quedó arriba de unas rocas: vas a tener que correr y saltar. Y no te quedes mirando las nubes, que la olla no espera.'];
  function talk(id) {
    const [got, total] = pinones();
    if (id === 'millaray') {
      if (!f.m1) { // la primera misión también enseña a jugar: acercarse y hablar, observar, ayudar con las manos y recibir un encargo
        if (!f.tu) return ui.has('witral')
          ? { main: true, lines: [LLAMA, 'Ya vi que estuviste mirando mi telar. Así me gusta: lo que se mira con calma no se olvida.', LANA], done: () => set('tu', 2) }
          : { main: true, lines: [LLAMA, 'Aunque mirar es lo que mejor haces… A ver: acércate al telar y míralo bien. Después me cuentas qué viste.'], done: () => set('tu', 1) };
        if (f.tu === 1) return ui.has('witral')
          ? { main: true, lines: ['¿Viste? Cada dibujo dice de dónde viene quien lleva la manta. Lo que se mira con calma no se olvida: se queda contigo.', LANA], done: () => set('tu', 2) }
          : { lines: ['Primero el telar, hijo. Acércate y obsérvalo con calma.'] };
        return f.lana ? { main: true, lines: ENCARGO, done: () => set('m1', 1) } : { lines: ['La lana roja, hijo. Está ahí mismo, junto al telar.'] };
      }
      if (f.m1 === 1 && got >= total) return { main: true, lines: ['¿Los trajiste todos? A ver… Sí. Con estos alcanza para la noche más larga.', 'Cuando yo era niña, mi madre me mandaba por los mismos piñones al mismo bosque. El pewen no se ha olvidado de nosotros ni un solo invierno.', 'Ahora anda con tu padre. Te está esperando para subir al Treng Treng: dice que hay algo que solo se ve desde arriba.'], gestos: [[0, 'muestra', 'pinon'], [1, 'echa', 'pinon'], [2, 'caricia']], done: () => { set('m1', 2); ui.takeItem('pinon', total); vuelve = { t: 5, i: 0 }; } };
      if (!f.mi) return { lines: ['Hijo, me quedé sin amarillo para la manta. Se saca de la raíz del michay, ese arbusto de espinas y flores anaranjadas.', 'Tráeme dos raíces. Escarba con cuidado y deja la mata en pie: tiene que seguir dando.'], done: () => set('mi', 1) };
      if (f.mi === 1 && listo(['michay'])) return { lines: ['Estas sirven. Mira: se hierven con la lana y sale un amarillo como de sol de invierno.', 'Cada color viene de un lugar. Cuando te pongas esta manta vas a llevar encima el monte entero, aunque estés lejos.'], gestos: [[0, 'da', 'michay']], done: () => { take('michay', 2); set('mi', 2); } };
      if (f.m1 === 1) return { lines: [`Todavía faltan piñones: llevas ${got} de ${total}. Están en el bosque del norte, siguiendo el sendero.`] };
      if (f.mi === 1) return { lines: [`Aún falta: ${falta()}. Crece en las laderas donde pega el sol.`] };
    }
    if (id === 'curinancu') {
      if (f.m1 === 2 && !f.m2) return { main: true, lines: ['Ahí estás. Tu madre dice que cumpliste con los piñones. Bien.', 'Ven conmigo, hijo. Vamos a subir al Treng Treng: hay algo que solo se ve desde arriba, y ya tienes edad de verlo.', 'Camina a mi lado. No hay apuro: el cerro no se va a ninguna parte.'], done: () => { set('m2', 1); padreSube(); } };
      if (f.m2 === 1) {
        if (!enCima()) return { lines: ['Vamos, hijo. Sigue subiendo conmigo.'] };
        // arriba: una frase, la escena de lo que le muestra, y al terminar la despedida
        return { main: true, lines: ['Ven, párate aquí, a mi lado, donde no tapa ningún árbol.'], done: () => story('cima', () => speak('Curiñancu', ['El que va a cuidar a su gente tiene que aprender a mirar así: primero todo, después lo suyo.', 'Ahora baja. Ñamku amaneció con fiebre y la machi anda preguntando por ti. Yo me quedo un rato más: desde aquí se ve venir a los invitados de la costa.'], () => { set('m2', 2); padre.quieto = false; })) };
      }
      if (ui.has('nalca')) {
        if (!f.na) return { lines: ['Para el We Tripantu vamos a cocer la comida bajo tierra, y hay que taparla con hojas grandes.', 'Tráeme dos tallos de nalca con su hoja. Crece junto al agua, en el menoko y a la orilla del río.'], done: () => set('na', 1) };
        if (f.na === 1 && !listo(['nalca'])) return { lines: [`Falta: ${falta()}. Busca cerca del agua.`] };
        if (f.na === 1) return { lines: ['Buenas hojas. Con estas no entra ni una piedra a la comida.', 'El tallo pélalo y cómetelo: es ácido y quita la sed. Te lo ganaste.'], gestos: [[0, 'da', 'nalca']], done: () => { take('nalca', 2); set('na', 2); } };
      }
    }
    if (id === 'machi' && f.m2 === 2) {
      if (!f.m3) return { main: true, lines: ['Leftraru, qué bueno que viniste. El viejo Ñamku amaneció con fiebre y la tos no lo deja dormir.', 'Voy a prepararle un lawen, pero mis piernas ya no están para andar por el monte. Tú serás mis pies.', 'Tráeme hojas de canelo, de dos árboles distintos: crece cerca del agua y en el lugar de los antiguos. Un trozo de corteza de quillay, del monte donde pega el sol. Y hojas de maqui, del claro del surponiente.', 'Antes de cortar, pide. Di para quién es. La planta que se saca sin permiso no sana a nadie.'], done: () => set('m3', 1) };
      if (f.m3 === 1 && !listo(['canelo', 'quillay', 'maqui'])) return { lines: [`Todavía falta: ${falta()}.`, 'No te apures. Mira bien cada planta antes de cortarla: hay que conocerla para pedirle.'] };
      if (f.m3 === 1) return { main: true, lines: ['Déjame ver… Sí. Las cortaste con cuidado, se nota.', 'El canelo abre el camino, el quillay suelta el pecho y el maqui baja la fiebre. Pero lo que sana es que alguien fue a buscarlas pensando en el enfermo.', 'Ya está. Llévaselo a Ñamku mientras está tibio. Y dile que se lo tome todo, que yo sé que es porfiado.'], gestos: [[0, 'da', 'canelo'], [2, 'obra'], [3, 'recibe', 'lawen']], done: () => { take('canelo', 2); take('quillay', 1); take('maqui', 2); inv.lawen = 1; set('m3', 2); } };
      if (f.m3 === 2) return { lines: ['El lawen se enfría, niño. Ñamku está en su ruka, al oriente.'] };
      // Después de la historia: le enseña el agua de hierbas (f.rm: 1 juntando las hojas, 2 aprendida). No es su lawen: es lo de casa.
      if (f.m3 === 3) {
        if (!f.rm) return { lines: ['Ñamku ya anda de pie, y fue por tus pies. Ahora te toca aprender algo con las manos.', 'Lo que yo le di era lawen, y eso es cosa mía: se pide, se canta, y no se enseña de un día para otro. Pero hay un agua de hierbas que en toda casa se sabe preparar, para el cansancio, el frío y los golpes.', 'Tráeme dos manojos de hojas de maqui y dos de boldo, el árbol de hoja dura y olorosa que crece donde pega el sol. Pide antes de cortar, como ya sabes.'], done: () => set('rm', 1) };
        if (f.rm === 1 && !listo(['maqui', 'boldo'])) return { lines: [`Todavía falta: ${falta()}.`, 'El boldo se conoce por el olor: restriega una hoja entre los dedos.'] };
        if (f.rm === 1) return { lines: ['Bien cortadas. Ahora mira, que esto se aprende mirando.', 'El agua tiene que hervir primero. Las hojas se echan cuando ya la sacaste del fuego, y se tapa. Si las hierves, amarga y no sirve.', 'Una hoja de maqui por una de boldo. Ni más, que cae pesado; ni menos, que es agua sola.', 'Toma: esta la hicimos juntos. Las que vengan las preparas tú, junto al fogón. Y no cortes más de lo que vayas a usar.'], gestos: [[0, 'da', 'maqui'], [3, 'obra'], [4, 'recibe', 'remedio']], done: () => { take('maqui', 2); take('boldo', 2); give('remedio', 1); set('rm', 2); hint('Aprendiste a preparar agua de hierbas. Se hace junto al fogón, desde la bolsa.', 8); } };
      }
    }
    if (id === 'namku' && f.m3 === 2) return { main: true, lines: ['¿Eso es para mí? Huele al monte entero… La machi te mandó a ti, ¿no? Así se aprende.', 'Amargo. Bien amargo. Así tiene que ser.', 'Cuando yo tenía tu edad, mi abuelo se enfermó y fui yo a buscar las plantas. Me perdí dos días. Volví con las hojas equivocadas, y él se mejoró igual, de puro reírse.', 'Gracias, Leftraru. Uno no se sana solo: lo sana su gente.', 'Ya vienen los de la costa para el We Tripantu, y yo aquí echado… Vuelve a verme apenas me levante: te debo una, y ya sé cómo pagarla.'], gestos: [[0, 'da', 'lawen'], [1, 'bebe', 'lawen']], done: () => { inv.lawen = 0; set('m3', 3); } };
    // Misión 4, «El arco de Ñamku»: le enseña a hacer flechas y a tirar con el arco, y lo manda a su primera caza.
    // f.cz: 1 juntando cañas y plumas, 2 con el arco, probando la puntería (f.blanco: aciertos), 3 de caza, 4 trae el pudú, 5 hecha.
    if (id === 'namku' && f.m3 === 3) {
      if (!f.cz) return { main: true, lines: ['Leftraru. Mira estas manos: ya no tiemblan. Te debo una, y yo pago enseñando.', 'Vienen los de la costa y en la olla no hay más que piñones. Hace falta carne, y mis piernas todavía no están para el monte. Vas a ir tú.', 'Pero primero se hacen las flechas. Tráeme tres cañas de quila, derechas, y tres plumas: las encuentras al pie de los árboles donde se posan los pájaros.'], done: () => set('cz', 1) };
      if (f.cz === 1 && !listo(['quila', 'pluma'])) return { lines: [`Falta: ${falta()}.`, 'La caña, derecha. Las plumas, enteras.'] };
      if (f.cz === 1) return { main: true, lines: ['A ver… Sirven. Siéntate y mira.', 'La caña se endereza al calor del fuego y la punta se endurece en la brasa: queda dura como hueso. La pluma se parte por el medio y se amarra atrás, para que la flecha vuele derecho y no dé tumbos.', 'Este arco fue de mi padre. Ahora lo llevas tú, y también estas tres flechas. Las que falten las haces tú mismo, donde estés: una caña y una pluma por cada una.', 'Antes de salir al monte, pruébalo. Dejé un atado de paja amarrado a un poste, aquí al oriente. Dale tres veces, desde unos pasos, y vuelve. El arco se tensa con calma y se suelta de una vez.'], gestos: [[0, 'da', 'quila'], [1, 'obra'], [4, 'recibe', 'arco']], done: () => { take('quila', 3); take('pluma', 3); give('arco', 1); give('flecha', 3); set('blanco', 0); set('cz', 2); S.eq = true; save(); COSAS.arco.usar = 'Guardar'; hint(`Aprendiste a hacer flechas: con una caña de quila y una pluma, pulsa ${tecla('flecha')}. El arco se guarda y se saca con ${tecla('arma')}.`, 9); } };
      if (f.cz === 2 && (f.blanco || 0) < 3) return { lines: [`Llevas ${f.blanco || 0} de 3 en el blanco. Párate a unos pasos, quédate quieto y suelta.`] };
      if (f.cz === 2) return { main: true, lines: ['Tres de tres. Tienes el ojo de tu nombre.', 'Ahora escucha, que esto es lo que importa. Al pudú no se le corre: se le sigue. Busca sus huellas y camina despacio. Si corres, no lo ves más.', 'Antes de soltar la flecha, pide. Al dueño del monte se le dice para quién es la carne. Y se toma uno solo: el monte da, pero lleva la cuenta.', 'Anda. Y si vuelves con las manos vacías, también se aprende.'], done: () => set('cz', 3) };
      if (f.cz === 3) return { lines: ['Las huellas, despacio, y de cerca. Uno solo.'] };
      if (f.cz === 4) return { main: true, lines: ['Lo trajiste… Déjame verlo. Un tiro limpio: no sufrió.', 'Hoy comen los de la costa por tu mano. La primera caza no se la come el cazador: se reparte. Así nadie olvida que se caza para todos.', 'El arco es tuyo. Pero óyeme bien: mientras haya carne en la casa, se queda colgado. Se caza cuando hace falta, no cuando dan ganas.', 'Y los de la costa ya deben venir por el camino. Alguien tendrá que salir a recibirlos.'], gestos: [[0, 'da', 'presa']], done: () => { take('presa', 1); set('cz', 5); } };
    }
    if (id === 'abuela') {
      if (!f.ab) return { lines: ['Leftraru, ¿me harías un favor? Tengo antojo de murtilla y ya no llego hasta donde crece.', 'Es una mata bajita de frutos rojos. Se da en los claros y en las laderas con sol. Tráeme tres puñados.'], done: () => set('ab', 1) };
      if (f.ab === 1 && !listo(['murtilla'])) return { lines: [`Todavía me falta: ${falta()}. Busca donde llega el sol.`] };
      if (f.ab === 1) return { lines: ['¡Qué perfume! Así olía la ruka de mi madre al final del verano.', 'Ella las secaba al sol y las guardaba para el invierno. En las noches largas nos daba un puñado a cada uno, y había que hacerlo durar hasta que terminara el cuento.', 'Toma, come tú también. Y cuando seas viejo, acuérdate de a qué sabía.'], gestos: [[0, 'da', 'murtilla'], [2, 'recibe', 'murtilla'], [3, 'come', 'murtilla']], done: () => { take('murtilla', 3); set('ab', 2); } };
    }
    if (id === 'rayen') {
      if (palin) return { lines: ['¡Menos conversa y más juego!'] };
      if (f.palin === 2) return { lines: ['¿Otra vez? Cuando quieras, mirón. Usa la tecla de acción en la cancha.'] };
      return { lines: ['¿Te atreves a un palin, mirón? A dos rayas.', 'Empuja el pali corriendo contra él y llévalo más allá de mi raya, al fondo de la cancha. Yo voy a hacer lo mismo para el otro lado.'], done: () => { if (!f.palin) set('palin', 1); startPalin(); } };
    }
    return null;
  }
  // ¿esta persona tiene algo pendiente contigo? 'main' = la historia sigue con ella, 'sec' = tiene un encargo secundario
  const wants = (id) => {
    const [got, total] = pinones();
    const madre = !f.m1 ? !f.tu || (f.tu === 1 && ui.has('witral')) || (f.tu === 2 && !!f.lana) : f.m1 === 1 && got >= total; // en el tutorial, la estrella vuelve a ella cuando ya hiciste lo que pidió
    if ((id === 'millaray' && madre) || (id === 'curinancu' && f.m1 === 2 && f.m2 !== 2)
      || (id === 'machi' && f.m2 === 2 && (!f.m3 || (f.m3 === 1 && listo(['canelo', 'quillay', 'maqui'])))) || (id === 'namku' && (f.m3 === 2 || (f.m3 === 3 && (!f.cz || (f.cz === 1 && listo(['quila', 'pluma'])) || (f.cz === 2 && (f.blanco || 0) >= 3) || f.cz === 4))))) return 'main';
    const sec = { abuela: !f.ab || (f.ab === 1 && listo(['murtilla'])), millaray: !!f.m1 && (!f.mi || (f.mi === 1 && listo(['michay']))), curinancu: ui.has('nalca') && (!f.na || (f.na === 1 && listo(['nalca']))), rayen: !f.palin, machi: f.m3 === 3 && (!f.rm || (f.rm === 1 && listo(['maqui', 'boldo']))) }[id];
    return sec ? 'sec' : null;
  };

  // ---------- recoger ----------
  function source(id, p) {
    const it = ITEMS[id]; let s = null;
    if (it.plant) s = world.nearPlant(it.plant, p.x, p.z, 1.6);
    else if (it.pluma) { for (const q of plumas) { const d = d2(p, q.x, q.z); if (!q.picked && d < 1.8 && (!s || d < s.d)) s = { d, rec: q }; } }
    // De lo que sirve, lo más cercano que aún no se ha cortado: una mata ya cortada o un árbol de otra especie que
    // quede más a mano no deben tapar al que sí se puede recoger.
    else if (it.bush) { if (d2(p, POI.maqui.x, POI.maqui.z) < 32) for (const t of world.bushesIn(p.x, p.z, 2.8)) { const d = d2(p, t.x, t.z); if (!t.picked && (!s || d < s.d)) s = { d, rec: t }; } }
    else for (const t of world.trees) { if (t.kind !== it.tree || t.rec.picked) continue; const d = d2(p, t.x, t.z); if (d < 3.2 && (!s || d < s.d)) s = { d, rec: t.rec }; }
    return s && !s.rec.picked ? s : null;
  }
  function pick(id, rec) { rec.picked = true; if (rec.mesh) rec.mesh.visible = false; give(id); snd.play('arbusto-1', 0.35); const n = needs()[id] || 0, pedido = id in needs(); if (busca) guiaAlMaterial(); // si aún falta lo otro, la guía sigue hacia allá
    hint(n ? `Recogiste ${ITEMS[id].uno}. Faltan ${n}.` : pedido ? `Recogiste ${ITEMS[id].uno}. Ya tienes lo necesario.` : `Recogiste ${ITEMS[id].uno}. Llevas ${have(id)}.`, 4); }
  // Lo que ya sabe preparar se puede juntar siempre, pero de a poco: de cada cosa lleva hasta TOPE y no corta más.
  const TOPE = 3;
  function libres() { const n = {}; if (f.rm === 2) n.maqui = n.boldo = TOPE; if (f.cz >= 2) n.quila = n.pluma = TOPE; for (const k in n) n[k] = Math.max(0, n[k] - have(k)); return n; }

  // ---------- luces que responden al saludo ----------
  const luzTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(200,240,255,0.5)'); g.addColorStop(1, 'rgba(200,240,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const luces = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: luzTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false })); s.scale.setScalar(0.22 + (i % 3) * 0.08); s.visible = false; scene.add(s); return s; });
  let luzT = 0;

  // ---------- huellas de pudú ----------
  const huellas = [];
  { const g = new THREE.CircleGeometry(0.028, 8).rotateX(-Math.PI / 2), m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x1c140e, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), HUELLAS.length * 44), M = new THREE.Matrix4(); let n = 0;
    for (const [hx, hz] of HUELLAS) { const a = Math.atan2(-hz, -hx) + 0.5; for (let i = 0; i < 22; i++) { const u = 30 - i * 1.3, wob = Math.sin(i * 0.9) * 1.6, x = hx + Math.cos(a) * u - Math.sin(a) * wob, z = hz + Math.sin(a) * u + Math.cos(a) * wob;
      for (const sd of [-1, 1]) { const px = x - Math.sin(a) * sd * 0.05, pz = z + Math.cos(a) * sd * 0.05 + sd * 0.08; M.makeTranslation(px, height(px, pz) + 0.03, pz); m.setMatrixAt(n++, M); } huellas.push({ x, z, hx, hz }); } }
    m.frustumCulled = false; scene.add(m); }

  // ---------- palin ----------
  const PC = 0.94, PS = 0.34, toUV = (x, z) => { const dx = x - POI.cancha.x, dz = z - POI.cancha.z; return [dx * PC + dz * PS, -dx * PS + dz * PC]; }, toXZ = (u, v) => [POI.cancha.x + u * PC - v * PS, POI.cancha.z + u * PS + v * PC];
  const pali = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.8 })); pali.castShadow = true; pali.visible = false; scene.add(pali);
  let palin = null;
  function startPalin() { const r = actor('Rayen'); palin = { u: 0, v: 0, vu: 0, vv: 0, yo: 0, ella: 0, cd: 0, r, pts: r.pts, pace: r.pace }; r.pts = [[POI.cancha.x, POI.cancha.z]]; r.i = 0; r.wait = 0; r.pace = 3.0; pali.visible = true; hint('Palin: lleva el pali más allá de la raya del fondo (hacia el poniente). A dos rayas.', 7); }
  function endPalin(win) { const g = palin; g.r.pts = g.pts; g.r.pace = g.pace; g.r.i = 0; palin = null; pali.visible = false; set('palin', 2); if (win) set('gano', 1); speak('Rayen', win ? ['¡Dos rayas! Está bien, mirón, hoy ganaste. No te acostumbres.', 'En el palin de verdad no gana el más rápido, sino el que ve dónde va a estar el pali. Tú ves.'] : ['¡Dos rayas para mí! No pongas esa cara.', 'Miras mucho y corres poco. Vuelve cuando quieras la revancha.']); }
  function updatePalin(dt, p) {
    const g = palin, [pu, pv] = toUV(p.x, p.z), r = g.r, [ru, rv] = toUV(r.x, r.z);
    if (Math.hypot(pu, pv) > 45) { hint('Dejaste la cancha: el juego queda para otro día.', 5); const w = g; w.r.pts = w.pts; w.r.pace = w.pace; palin = null; pali.visible = false; return; }
    if (Math.hypot(pu - g.u, pv - g.v) < 0.75 && player.speed > 0.5) { const [du, dv] = [player.dirX * PC + player.dirZ * PS, -player.dirX * PS + player.dirZ * PC], k = Math.max(4.5, player.speed * 1.7); g.vu = du * k; g.vv = dv * k; if (g.cd <= 0) snd.play('ui-clic', 0.5, 0.8); g.cd = 0.25; }
    g.cd -= dt; g.hit = (g.hit || 0) - dt;
    if (Math.hypot(ru - g.u, rv - g.v) < 0.95 && g.hit <= 0) { g.vu = 7.5; g.vv = (Math.random() - 0.5) * 4; g.hit = 1.4; snd.play('ui-clic', 0.5, 0.7); } // Rayen lo manda hacia tu lado
    g.u += g.vu * dt; g.v += g.vv * dt; const fr = Math.exp(-dt * 1.3); g.vu *= fr; g.vv *= fr; if (Math.abs(g.v) > 5.2) { g.v = Math.sign(g.v) * 5.2; g.vv *= -0.6; }
    const [bx, bz] = toXZ(g.u, g.v); pali.position.set(bx, height(bx, bz) + 0.1, bz); r.pts[0] = [bx + PC * -0.5, bz + PS * -0.5]; r.i = 0; if (r.wait > 0.3) r.wait = 0.3;
    if (Math.abs(g.u) > 15) { if (g.u < 0) g.yo++; else g.ella++; snd.play('ui-hallazgo', 0.4); if (g.yo >= 2 || g.ella >= 2) return endPalin(g.yo >= 2); hint(`Raya para ${g.u < 0 ? 'ti' : 'Rayen'}. Vas ${g.yo} a ${g.ella}.`, 4); g.u = g.v = g.vu = g.vv = 0; }
  }

  // ---------- piedras al río ----------
  const piedra = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 1 })); piedra.visible = false; scene.add(piedra); let tiro = null;

  // ---------- preparar: agua de hierbas y flechas ----------
  // Cada receta la enseña alguien (sabe) y se prepara junto al fogón, desde la bolsa. tope: cuántas se llevan a la vez.
  const RECETAS = [
    { id: 'remedio', sabe: () => f.rm === 2, title: 'Agua de hierbas', pide: { maqui: 1, boldo: 1 }, tope: 3, text: 'Devuelve las fuerzas después del frío, del cansancio o de un golpe. Te la enseñó la machi: no es un lawen, es lo que se sabe en toda casa.' },
    { id: 'flecha', sabe: () => f.cz >= 2, title: 'Flecha', pide: { quila: 1, pluma: 1 }, tope: 12, sinFuego: true, text: 'Una caña de quila enderezada al calor, con la punta endurecida en la brasa y media pluma amarrada atrás. Te la enseñó Ñamku.' },
  ];
  const alFuego = () => d2(here, FOGON.x, FOGON.z) < 6.5 || (!!world.refugio && d2(here, world.refugio.x, world.refugio.z) < 5.5); // el fogón de la aldea o el fuego del refugio del bosque
  function recetas() {
    return RECETAS.filter((r) => r.sabe()).map((r) => { const sin = Object.keys(r.pide).filter((k) => have(k) < r.pide[k]), lleno = have(r.id) >= r.tope;
      return { id: r.id, title: r.title, text: r.text, lleva: Object.keys(r.pide).map((k) => `${ITEMS[k].uno}: ${have(k)} de ${r.pide[k]}`).join(' · '), puede: !sin.length && !lleno && (r.sinFuego || alFuego()), porque: lleno ? 'Ya llevas suficiente' : sin.length ? `Falta ${sin.map((k) => ITEMS[k].uno).join(' y ')}` : 'Acércate a un fuego' }; });
  }
  function preparar(id) {
    const r = RECETAS.find((q) => q.id === id); if (!r || !r.sabe() || have(id) >= r.tope || !(r.sinFuego || alFuego()) || Object.keys(r.pide).some((k) => have(k) < r.pide[k])) return false;
    for (const k in r.pide) take(k, r.pide[k]); give(id, 1); snd.play('ui-logro', 0.4); return true;
  }
  function usar(id) {
    if (id === 'arco') return equipar();
    if (id !== 'remedio' || !have('remedio')) return false;
    if ((S.vida ?? 100) >= 100) { hint('Ahora no te hace falta: guárdala para cuando la necesites.', 4); return false; }
    take('remedio', 1); sanar(60); snd.play('paso-agua-2', 0.4); hint('Tibia y amarga. El cuerpo se te afirma de a poco.', 5); return true;
  }
  ui.cosas = COSAS; ui.recetas = recetas; ui.preparar = preparar; ui.usar = usar; if (S.eq === undefined && f.cz >= 2 && have('arco') > 0) S.eq = true; // una partida guardada antes de que el arco se pudiera guardar: lo trae en la mano
  COSAS.arco.usar = S.eq ? 'Guardar' : 'Equipar';

  // ---------- plumas: al pie de los árboles donde se posan las aves ----------
  const plumas = [];
  { const g = new THREE.PlaneGeometry(0.08, 0.28), m = new THREE.MeshBasicMaterial({ color: 0xe6ecd6, side: THREE.DoubleSide });
    const sitios = world.life.birds.filter((b) => b.perch).map((b) => [b.perch.x, b.perch.z]).concat([[-6, -84], [9, -96], [-12, -102], [30, -44], [-40, 24], [44, 12]]);
    for (const [x, z] of sitios) { if (plumas.length >= 14 || plumas.some((q) => d2(q, x, z) < 4)) continue; const px = x + 0.9, pz = z + 0.6, mesh = new THREE.Mesh(g, m);
      mesh.position.set(px, height(px, pz) + 0.06, pz); mesh.rotation.set(-1.4, 0, plumas.length * 1.3); scene.add(mesh); plumas.push({ x: px, z: pz, mesh, picked: false }); } }

  // ---------- el arco ----------
  // Ñamku se lo entrega en la misión 4. Se apunta manteniendo apretado el botón derecho del ratón: Leftraru tensa el arco y la
  // cámara se le pone al hombro, con una mira al centro. Con el botón izquierdo suelta la flecha. La flecha vuela de verdad:
  // sale con más fuerza mientras más tenso está el arco, cae con su peso y se clava donde pega. Cada tiro gasta una flecha de
  // la bolsa (las que se hacen con caña y pluma); las que quedan clavadas en el blanco o en el suelo se recuperan pasando a su
  // lado. Al blanco de paja se le puede tirar siempre; un pudú cae solo durante la caza de la misión, y a las crías nunca.
  const BLANCO = { x: 32, z: -4 }; BLANCO.y = height(BLANCO.x, BLANCO.z);
  const blanco = new THREE.Group();
  { const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5, 7), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 })); palo.position.y = 0.75;
    const paja = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.62, 14), new THREE.MeshStandardMaterial({ color: 0xcfa85a, roughness: 1 })); paja.position.y = 1.02;
    const amarra = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0x8a3a2c, roughness: 1 })); amarra.position.y = 1.02;
    blanco.add(palo, paja, amarra); blanco.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); blanco.position.set(BLANCO.x, BLANCO.y, BLANCO.z); blanco.visible = false; scene.add(blanco); }
  const flechaG = new THREE.CylinderGeometry(0.009, 0.009, 0.72, 5), flechaMat = new THREE.MeshStandardMaterial({ color: 0x9a8458, roughness: 1 });
  const flechaM = new THREE.Mesh(flechaG, flechaMat); flechaM.visible = false; flechaM.castShadow = true; scene.add(flechaM); // la que va volando
  const N_CLAV = 8, clavM = new THREE.InstancedMesh(flechaG, flechaMat, N_CLAV), clav = [], clavO = new THREE.Object3D(); clavM.count = 0; clavM.castShadow = true; clavM.frustumCulled = false; scene.add(clavM); // las que quedaron clavadas: una sola malla
  const UP = new THREE.Vector3(0, 1, 0), VF = new THREE.Vector3(), P0 = new THREE.Vector3(), TENSA = 0.75, GRAV = 9.8, V_MIN = 15, V_MAX = 58, CARGA = 1.0, RECARGA = 0.4, TOPE_FL = 12, giro = (d) => Math.atan2(Math.sin(d), Math.cos(d));
  const TACTIL = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches; // sin ratón, la flecha se tira con la tecla de acción y apunta sola
  const punt = { on: false, t: 0, carga: 0, tira: false, quiere: false, pausa: 0 }; let vuelo = null; // quiere: el botón de tensar sigue apretado; tira: está tensando // punt: está apuntando, y cuánto lleva tensando; vuelo: la flecha en el aire { p, v, de, t }
  const puduCerca = (p, r) => { let b = null; for (const q of world.life.quads) { if (q.kind !== 'pudu' || q.caido || q.fuera || (q.g.scale.x || 1) < 0.8) continue; const d = d2(p, q.x, q.z); if (d < r && (!b || d < b.d)) b = { d, q }; } return b; }; // los grandes: a las crías no se les tira
  const hayCaido = () => world.life.quads.some((q) => q.caido && !q.fuera);
  const pintaClav = () => { clavM.count = clav.length; clav.forEach((c, i) => { clavO.position.copy(c.p); clavO.quaternion.copy(c.q); clavO.updateMatrix(); clavM.setMatrixAt(i, clavO.matrix); }); clavM.instanceMatrix.needsUpdate = true; };
  const clava = (p, v) => { const dir = VF.copy(v).normalize(); clav.push({ p: p.clone().addScaledVector(dir, -0.27), q: new THREE.Quaternion().setFromUnitVectors(UP, dir) }); if (clav.length > N_CLAV) clav.shift(); pintaClav(); }; // queda con la punta hundida
  const puedeApuntar = () => !!S.eq && f.cz >= 2 && have('arco') > 0 && !sit && !hace && !palin;
  function apuntar(si) {
    if (si && !puedeApuntar()) return false;
    if (si && !punt.on) { punt.t = 0; if (f.cz === 3 && !hayCaido() && puduCerca(here, 22)) hint('«Dueño de este monte: es para mi gente.»', 3); }
    punt.on = !!si; if (!punt.on) { punt.carga = 0; punt.tira = false; punt.quiere = false; } return punt.on;
  }
  // El arco se saca y se guarda (desde la bolsa o con su tecla). Solo con el arco en la mano se puede apuntar.
  function equipar(si) {
    if (!(f.cz >= 2 && have('arco') > 0)) return false;
    S.eq = si === undefined ? !S.eq : !!si; save(); COSAS.arco.usar = S.eq ? 'Guardar' : 'Equipar'; if (!S.eq) apuntar(false);
    snd.play('ui-clic', 0.4, S.eq ? 1.1 : 0.8); hint(S.eq ? `Arco en la mano. Mantén el botón derecho para apuntar y, sin soltarlo, el izquierdo para tensar; suéltalo para tirar. ${tecla('flecha')} hace una flecha.` : 'Guardaste el arco.', S.eq ? 7 : 3); return true;
  }
  // Tensar: mientras se mantiene apretado el botón, el arco se va cargando; al soltarlo, sale la flecha con esa fuerza.
  const empiezaATensar = () => { if (!punt.on || !punt.quiere || punt.tira || vuelo || punt.pausa > 0 || !have('flecha')) return false; punt.tira = true; return true; };
  function tensar(si) { // si: el botón sigue apretado. Si justo entonces no se puede (va una flecha en el aire, la mano busca otra), tensa apenas pueda
    punt.quiere = !!si; if (!si) { punt.tira = false; return false; }
    if (punt.on && !have('flecha')) hint(clav.length ? 'No te quedan flechas en la bolsa. Recoge las que quedaron clavadas.' : `No te quedan flechas. Con una caña de quila y una pluma haces otra: pulsa ${tecla('flecha')}.`, 6);
    return empiezaATensar();
  }
  // Hacer una flecha, donde sea: una caña de quila y una pluma. Ñamku lo enseña en la misión 4.
  // Lo que falte para una flecha queda marcado en el mapa (y con una hoja flotando en el lugar), y la guía lleva a lo más cercano.
  function guiaAlMaterial() {
    if (!yo || !guiar) return null; const q = metas(yo).filter((m) => (m.id === 'quila' || m.id === 'pluma') && !have(m.id)).sort((a, b) => d2(yo, a.x, a.z) - d2(yo, b.x, b.z))[0];
    if (q) guiar({ kind: 'punto', x: q.x, z: q.z, label: q.label }); return q;
  }
  function hacerFlecha() {
    if (!(f.cz >= 2) || sit || hace || punt.on) return false;
    if (have('flecha') >= TOPE_FL) { hint('Ya llevas todas las flechas que caben.', 3); return false; }
    if (!have('quila') || !have('pluma')) { busca = true; const falta = [!have('quila') && 'una caña de quila', !have('pluma') && 'una pluma'].filter(Boolean).join(' y ');
      const fn = !have('quila') && !have('pluma') ? 'faltan' : 'falta'; hint(guiaAlMaterial() ? `Para una flecha te ${fn} ${falta}. Quedó marcado en el mapa dónde buscar.` : `Para una flecha te ${fn} ${falta}.`, 7); return false; }
    haz('labrar', () => { take('quila', 1); take('pluma', 1); give('flecha', 1); snd.play('ui-logro', 0.35, 1.2); hint(`Hiciste una flecha. Llevas ${have('flecha')}.`, 3); }); return true;
  }
  function soltar(desde, hacia) { // desde: de dónde sale la flecha (el arco); hacia: el punto del mundo que marca la mira
    if (!punt.on || vuelo || !punt.tira) return false; const k = punt.carga; punt.tira = false;
    if (k < 0.04) { punt.carga = 0; return false; } // ni alcanzó a tomar la cuerda: no sale (un toque corto sí la suelta, floja)
    if (!have('flecha')) { punt.carga = 0; return false; }
    const d = new THREE.Vector3().subVectors(hacia, desde), dh = Math.hypot(d.x, d.z), v0 = V_MIN + (V_MAX - V_MIN) * k; // mientras más tenso, más rápido sale
    if (dh > 0.01) for (const a of world.life.actors) { const ax = a.x - desde.x, az = a.z - desde.z, al = (ax * d.x + az * d.z) / dh; if (al > 0.5 && al < 35 && Math.abs(ax * d.z - az * d.x) / dh < 0.9) { hint('Hay gente adelante. El arco no se apunta hacia las personas.', 4); return false; } }
    take('flecha', 1);
    let ang = Math.atan2(d.y, dh); const disc = v0 ** 4 - GRAV * (GRAV * dh * dh + 2 * d.y * v0 * v0); if (disc > 0 && dh > 0.5) ang = Math.atan2(v0 * v0 - Math.sqrt(disc), GRAV * dh); // el ángulo con que, cayendo, pasa justo por donde marca la mira
    const ch = Math.cos(ang) * v0, ux = dh > 0.01 ? d.x / dh : 0, uz = dh > 0.01 ? d.z / dh : 0;
    vuelo = { p: desde.clone(), v: new THREE.Vector3(ux * ch, Math.sin(ang) * v0, uz * ch), de: { x: here.x, z: here.z }, t: 0 };
    punt.carga = 0; punt.pausa = RECARGA; flechaM.visible = true; snd.play('ui-clic', 0.4 + 0.3 * k, 1.7 - 0.5 * k); return true;
  }
  const tiroSolo = (x, y, z) => { punt.on = true; punt.tira = true; punt.carga = 0.8; player.facing = Math.atan2(x - here.x, z - here.z); soltar(new THREE.Vector3(here.x, here.y + 0.35, here.z), new THREE.Vector3(x, y, z)); punt.on = false; }; // el tiro de las pantallas táctiles
  function mira(o, d) { // a qué distancia, siguiendo la línea de la mira, hay un blanco o un pudú (o nada)
    let best = null; const prueba = (cx, cy, cz, r) => { const tx = cx - o.x, ty = cy - o.y, tz = cz - o.z, al = tx * d.x + ty * d.y + tz * d.z; if (al < 1) return; if (tx * tx + ty * ty + tz * tz - al * al < r * r && (best === null || al < best)) best = al; };
    if (blanco.visible) prueba(BLANCO.x, BLANCO.y + 1.02, BLANCO.z, 0.4);
    for (const q of world.life.quads) if (q.kind === 'pudu' && !q.caido && !q.fuera) { const e = q.g.scale.x || 1; prueba(q.x, height(q.x, q.z) + 0.34 * e, q.z, 0.45 * e); }
    return best;
  }
  const toca = (a, b, cx, cy, cz, r) => { const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z, u = Math.max(0, Math.min(1, ((cx - a.x) * ex + (cy - a.y) * ey + (cz - a.z) * ez) / (ex * ex + ey * ey + ez * ez || 1e-9))); return Math.hypot(a.x + ex * u - cx, a.y + ey * u - cy, a.z + ez * u - cz) < r; }; // ¿el tramo de a hasta b pasa a menos de r del punto?
  function llega(que, q) { // la flecha pegó en algo (o se perdió)
    const a = vuelo; vuelo = null; flechaM.visible = false;
    if (que === 'pudu' && f.cz === 3 && !hayCaido()) { q.caido = true; q.speed = 0; snd.play('ui-hallazgo', 0.4, 0.8); return hint('Le diste. Acércate despacio.', 5); }
    if (que !== 'lejos') clava(a.p, a.v);
    if (que === 'blanco') { snd.play('ui-hallazgo', 0.4, 1.2);
      if (d2(a.de, BLANCO.x, BLANCO.z) < 6) return hint('Le diste, pero de tan cerca no vale. Aléjate unos pasos.', 4);
      if (f.cz === 2 && (f.blanco || 0) < 3) { set('blanco', (f.blanco || 0) + 1); return hint(f.blanco >= 3 ? 'Tres de tres. Recoge tus flechas y vuelve con Ñamku.' : `¡En el blanco! Llevas ${f.blanco} de 3.`, 4); }
      return hint('¡En el blanco!', 3); }
    snd.play('arbusto-2', 0.3, 1.3);
    if (que === 'pudu' || que === 'cria') { q.susto = 4; return hint(que === 'cria' ? 'A las crías no se les tira. Déjala ir.' : 'Hoy no hace falta carne: el pudú se va.', 4); }
    const c = f.cz === 3 ? puduCerca(a.p, 10) : null;
    if (c) { c.q.susto = 4; return hint(have('flecha') || clav.length ? 'La flecha pasó de largo y el pudú se perdió entre la quila. Búscalo otra vez, más de cerca y sin correr.' : 'Fallaste, y era tu última flecha. Con una caña de quila y una pluma haces otra.', 7); }
    if (f.cz === 2 && d2(a.p, BLANCO.x, BLANCO.z) < 6) hint('Casi. Si el blanco está lejos, apunta un poco más arriba.', 4);
  }
  function updateArco(dt, p) {
    punt.pausa = Math.max(0, punt.pausa - dt);
    if (punt.on) { if (!puedeApuntar()) apuntar(false); else { punt.t += dt; empiezaATensar(); punt.carga = punt.tira ? Math.min(1, punt.carga + dt / CARGA) : Math.max(0, punt.carga - dt * 3); } }
    if (vuelo) { const a = vuelo; a.t += dt; let rest = dt;
      while (rest > 1e-5 && vuelo === a) { const h = Math.min(rest, 0.01); rest -= h; P0.copy(a.p); a.v.y -= GRAV * h; a.p.addScaledVector(a.v, h); // a pasos cortos, para que no atraviese nada
        if (blanco.visible && toca(P0, a.p, BLANCO.x, BLANCO.y + 1.02, BLANCO.z, 0.37)) { llega('blanco'); break; }
        let dio = null; for (const q of world.life.quads) { if (q.kind !== 'pudu' || q.caido || q.fuera) continue; const e = q.g.scale.x || 1; if (toca(P0, a.p, q.x, height(q.x, q.z) + 0.34 * e, q.z, 0.42 * e)) { dio = q; break; } }
        if (dio) { llega((dio.g.scale.x || 1) < 0.8 ? 'cria' : 'pudu', dio); break; }
        const gy = height(a.p.x, a.p.z) + 0.03; if (a.p.y <= gy) { a.p.y = gy; llega('suelo'); break; }
        const hit = choca ? choca(P0, a.p) : null; if (hit) { a.p.copy(hit); llega('tronco'); break; } // un tronco, una roca, una ruka
        if (a.t > 7) { llega('lejos'); break; } }
      if (vuelo === a) { flechaM.position.copy(a.p); flechaM.quaternion.setFromUnitVectors(UP, VF.copy(a.v).normalize()); } }
    let n = 0; for (let i = clav.length - 1; i >= 0; i--) { const c = clav[i]; if (d2(p, c.p.x, c.p.z) < 1.3 && Math.abs(c.p.y - p.y) < 2.4) { clav.splice(i, 1); n++; } } // las clavadas se recuperan al pasar a su lado
    if (n) { pintaClav(); give('flecha', n); snd.play('pinon', 0.4, 1.3); hint(n === 1 ? 'Recuperaste una flecha.' : `Recuperaste ${n} flechas.`, 2.5); }
  }

  // ---------- qué se puede hacer aquí ----------
  // Sentarse en un tronco: camina hasta quedar delante (si venía por detrás, pasa por encima), se gira hacia el fuego
  // y baja de a poco doblando las rodillas. Sentado respira, mira el fuego y a ratos acerca las manos. Al levantarse, lo contrario.
  let sit = null, fuegoI = 0, here = { x: 0, z: 0 };
  // Lo que se hace con la tecla de acción se ve: agacharse a recoger, estirar la mano, verter, beber, saludar. Lo que la
  // acción hace de verdad (sumar la planta a la bolsa, llenar la vasija) pasa a mitad del gesto. hacia: hacia dónde se vuelve.
  const DUR = { recoger: 1.5, alcanzar: 1.1, verter: 1.5, beber: 1.6, saludar: 1.9, cargar: 2.3, labrar: 2.0 };
  const GESTOS = [['Alcanzarle', 'alcanzar', { x: -10.6, z: -4.2 }], ['Llenar', 'recoger'], ['Echar', 'verter', OLLA], ['Cortar', 'recoger'], ['Dar pasto', 'verter', CORRAL], ['Saludar', 'saludar'], ['Mirar las huellas', 'recoger'], ['Tirar una piedra', 'alcanzar'], ['Beber', 'beber'], ['Agradecer', 'cargar'], ['Tomar', 'beber']]; // según cómo empieza el nombre de la acción
  let hace = null; // el gesto en curso: { tipo, t, dur, run, hecho, hacia }
  const haz = (tipo, run, hacia) => { hace = { tipo, t: 0, dur: DUR[tipo], run, hecho: false, hacia: hacia || null }; };
  const SIT_IN = 1.3, SIT_OUT = 0.8, mix = (a, b, k) => a + (b - a) * k, sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function sentarse(l, p) {
    const dx = -Math.cos(l.a), dz = -Math.sin(l.a); // del tronco hacia el fuego
    sit = { l, dx, dz, st: 'in', t: 0, x0: p.x, z0: p.z, f0: player.facing, f1: Math.atan2(dx, dz), sx: l.x + dx * 0.62, sz: l.z + dz * 0.62, over: (p.x - l.x) * dx + (p.z - l.z) * dz < 0.3 };
  }
  function stand() { if (sit && sit.st === 'on' && sit.t > 0.3) { sit.st = 'out'; sit.t = 0; } }
  function updateSit(dt) {
    const s = sit; s.t += dt;
    if (s.st === 'in') {
      const u = Math.min(1, s.t / SIT_IN), a = sm(0, 0.5, u); let d = s.f1 - s.f0; d = Math.atan2(Math.sin(d), Math.cos(d));
      place(mix(s.x0, s.sx, a), mix(s.z0, s.sz, a), s.f0 + d * sm(0, 0.55, u));
      if (u >= 1) { s.st = 'on'; s.t = 0; const [who, line] = FUEGO[fuegoI++ % FUEGO.length], ab = actor('la abuela'); if (ab && d2(ab, FOGON.x, FOGON.z) < 6) speak(who, [line]); else hint('El fuego crepita. Se está bien aquí.', 5); if (!f.fogon) set('fogon', 1); }
    } else if (s.st === 'out') { place(s.sx, s.sz, s.f1); if (s.t >= SIT_OUT) sit = null; }
  }
  function scan(p) {
    if (sit) return sit.st === 'on' ? { label: 'Levantarse', run: stand } : null;
    if (punt.on || hace) return null; // apuntando o a medio gesto no se hace otra cosa
    const out = [], n = needs();
    const add = (d, label, run, g, hacia) => { if (g === undefined) { const q = GESTOS.find(([k]) => label.startsWith(k)); if (q) { g = q[1]; hacia = q[2]; } } out.push({ d, label, run: g ? () => haz(g, run, hacia) : run }); };
    for (const id in n) if (n[id] > 0) { const s = source(id, p); if (s) add(s.d - 5, `Recoger ${ITEMS[id].uno}`, () => pick(id, s.rec), ITEMS[id].tree || ITEMS[id].bush ? 'alcanzar' : 'recoger', s.rec); }
    const lb = libres(); for (const id in lb) if (!(n[id] > 0) && lb[id] > 0) { const s = source(id, p); if (s) add(s.d - 4, `Recoger ${ITEMS[id].uno}`, () => pick(id, s.rec), ITEMS[id].tree || ITEMS[id].bush ? 'alcanzar' : 'recoger', s.rec); }
    if (TACTIL && f.cz >= 2 && !vuelo && have('flecha')) { // sin ratón: la tecla de acción tira sola, al blanco o al pudú que esté cerca
      const db = d2(p, BLANCO.x, BLANCO.z); if (db > 6 && db < 24) add(6, 'Tirar al blanco', () => tiroSolo(BLANCO.x, BLANCO.y + 1.02, BLANCO.z));
      const c = f.cz === 3 && !hayCaido() ? puduCerca(p, 13) : null;
      if (c) add(0.5, 'Tirar la flecha', () => { hint('«Dueño de este monte: es para mi gente.»', 3); tiroSolo(c.q.x, height(c.q.x, c.q.z) + 0.34, c.q.z); });
    }
    for (const q of world.life.quads) if (q.caido && !q.fuera && d2(p, q.x, q.z) < 2.2) { add(0.2, 'Agradecer y cargar el pudú', () => { q.fuera = true; q.g.visible = false; q.x = q.z = 1e4; give('presa', 1); set('cz', 4); snd.play('ui-mision', 0.4); hint('«Gracias. No tomaré más.» Te echas el pudú al hombro: llévaselo a Ñamku.', 8); }); break; }
    if (have('remedio') && (S.vida ?? 100) < 60) add(9, 'Tomar agua de hierbas', () => usar('remedio'));
    const df = d2(p, FOGON.x, FOGON.z);
    const tr = TRONCOS.map((l) => ({ l, d: d2(p, l.x, l.z) })).sort((a, b) => a.d - b.d)[0];
    if (tr.d < 1.5) add(tr.d, 'Sentarse en el tronco', () => sentarse(tr.l, here));
    // tareas de la aldea
    if (ui.has('millaray') && !f.lana && (f.m1 || f.tu === 2) && d2(p, -10.6, -4.2) < 3) add(1, 'Alcanzarle la lana a Millaray', () => { set('lana', 1); const gracias = 'Gracias, hijo. La roja primero… esa. Así no tengo que soltar el hilo.'; if (f.m1) speak('Millaray', [gracias], null, [[0, 'da', 'lana']]); else speak('Millaray', [gracias, ...ENCARGO], () => set('m1', 1), [[0, 'da', 'lana']]); }); // la primera vez, con esto te da la misión
    const rz = riverZ(p.x), dr = Math.abs(p.z - rz);
    if (!f.agua && !have('agua') && dr < 5 && p.y < WATER_Y + 1.6) add(2, 'Llenar la vasija con agua', () => { inv.agua = 1; save(); snd.play('paso-agua-1', 0.5); hint('Llenaste la vasija. Llévala a la olla del fogón.', 5); });
    if (!f.agua && have('agua') && df < 4.2) add(0.5, 'Echar el agua a la olla', () => { inv.agua = 0; set('agua', 1); snd.play('paso-agua-2', 0.5); speak('La abuela', ['¡Agua fresca! Con esto alcanza para el caldo. Así da gusto.']); });
    const dc = d2(p, CORRAL.x, CORRAL.z);
    if (!f.weke && !have('pasto') && ui.has('millaray') && dc > 9 && dc < 75 && world.nearPlant('grass', p.x, p.z, 1.2)) add(6, 'Cortar pasto para los weke', () => { inv.pasto = 1; save(); snd.play('arbusto-2', 0.35); hint('Cortaste un atado de pasto. Llévalo al corral.', 5); });
    if (!f.weke && have('pasto') && dc < CORRAL.r + 2.5) add(1, 'Dar pasto a los weke', () => { inv.pasto = 0; set('weke', 1); for (const q of world.life.quads) if (q.kind === 'weke') { q.tx = p.x; q.tz = p.z; q.wait = 0; } hint('Los weke se acercan a comer de tu mano.', 5); });
    // saludar al entrar a los lugares con dueño
    for (const k in LUGARES) if (!f['s-' + k] && d2(p, POI[k].x, POI[k].z) < 30) add(4, `Saludar a ${LUGARES[k]}`, () => { set('s-' + k, 1); luzT = 8; snd.play('hablar', 0.4, 0.8); hint('«Mari mari. Soy Leftraru, hijo de Curiñancu. Vengo de paso y no tomaré más de lo que necesito.»', 7); });
    // huellas
    for (const h of huellas) if (d2(p, h.x, h.z) < 1.3) { add(3, 'Mirar las huellas', () => { set('huella', 1); const dx = h.hx - p.x, dz = h.hz - p.z, dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'oriente' : 'poniente') : (dz > 0 ? 'sur' : 'norte'); hint(`Huellas de pudú, chicas y frescas. Siguen hacia el ${dir}. Si caminas despacio, quizás lo veas.`, 7); }); break; }
    // palin
    if (!palin && f.palin && d2(p, POI.cancha.x, POI.cancha.z) < 14 && actor('Rayen') && d2(actor('Rayen'), POI.cancha.x, POI.cancha.z) < 30) add(5, 'Jugar palin con Rayen', startPalin);
    // el río
    if (dr < 7 && dr > 1.5 && !tiro) add(8, 'Tirar una piedra al río', () => { tiro = { t: 0, x0: p.x, y0: p.y + 0.4, z0: p.z, x1: p.x + (Math.random() - 0.5) * 3, z1: rz + (Math.random() - 0.5) * 2 }; piedra.visible = true; });
    if (d2(p, POI.poza.x, POI.poza.z) < 9 && dr < 3) add(7, 'Beber agua de la poza', () => { snd.play('paso-agua-2', 0.4); hint('El agua está helada y sabe a piedra y a lluvia.', 5); });
    return out.sort((a, b) => a.d - b.d)[0] || null;
  }

  function update(dt, t, p) { yo = p;
    here = p; if (palin) updatePalin(dt, p);
    if (sit) updateSit(dt);
    updateArco(dt, p);
    if (hace) { const h = hace; h.t += dt; if (h.hacia) player.facing += giro(Math.atan2(h.hacia.x - p.x, h.hacia.z - p.z) - player.facing) * Math.min(1, dt * 9);
      if (!h.hecho && h.t >= h.dur * 0.55) { h.hecho = true; h.run(); } if (h.t >= h.dur && hace === h) hace = null; }
    blanco.visible = f.cz >= 2;
    if (vuelve) updateVuelve(dt);
    if (mama && mama.mode === 'cook' && f.m1 !== 1 && d2(p, mama.x, mama.z) > 45) madreCocina(false); // entregados los piñones, cuando ya no la ves vuelve al telar
    if (padre) {
      if (padre.yendo) guia(dt, p);
      else if (f.m2 === 2 && d2(padre, CIMA[0], CIMA[1]) < 3 && d2(p, padre.x, padre.z) > 70) ponPadre(false); // hecha la misión, cuando ya no lo ves vuelve a la aldea
    }
    if (luzT > 0) { luzT -= dt; const k = Math.min(1, luzT, (8 - luzT) * 2); luces.forEach((s, i) => { const a = t * (0.5 + (i % 4) * 0.12) + i * 0.9, r = 1.1 + (i % 5) * 0.35; s.visible = luzT > 0; s.position.set(p.x + Math.cos(a) * r, p.y + 0.2 + Math.sin(t * 0.8 + i) * 0.5 + (i % 3) * 0.3, p.z + Math.sin(a) * r); s.material.opacity = Math.max(0, k) * 0.9; }); }
    if (tiro) { tiro.t += dt / 0.9; const u = tiro.t, x = tiro.x0 + (tiro.x1 - tiro.x0) * u, z = tiro.z0 + (tiro.z1 - tiro.z0) * u, y = tiro.y0 + (WATER_Y - tiro.y0) * u + Math.sin(Math.PI * u) * 2.2; piedra.position.set(x, y, z); if (u >= 1) { piedra.visible = false; ripple(tiro.x1, tiro.z1); snd.play('paso-agua-1', 0.6, 0.8); tiro = null; } }
  }
  // La postura al sentarse se mezcla con la de pie según w (0 de pie, 1 sentado). La cadera sigue un camino
  // desde donde está parado hasta el asiento, y el cuerpo se inclina hacia adelante mientras baja o sube.
  function pose(boy) {
    if (boy.arcoM) boy.arcoM.visible = punt.on && !sit && !boy.sinArco; // con el cuerpo nuevo, el arco lo lleva main.js en su mano
    if (hace && !sit) { // el gesto de lo que está haciendo con las manos
      const u = Math.min(1, hace.t / hace.dur), k = sm(0, 0.35, u) * (1 - sm(0.7, 1, u)), T = hace.tipo, G = (o, v) => { o.rotation.x = mix(o.rotation.x, v, k); };
      if (T === 'recoger' || T === 'cargar') { G(boy.legL, -1.0); G(boy.legR, -0.75); G(boy.shinL, 1.75); G(boy.shinR, 1.6); boy.body.position.y = mix(boy.body.position.y, -0.19, k); boy.body.rotation.x = mix(boy.body.rotation.x, 0.55, k); G(boy.armR, -1.15); G(boy.foreR, -0.25); if (T === 'cargar') { G(boy.armL, -1.15); G(boy.foreL, -0.25); } } // se agacha y estira la mano hacia el suelo
      else if (T === 'alcanzar') { boy.body.rotation.x = mix(boy.body.rotation.x, 0.1, k); G(boy.armR, -1.5); G(boy.foreR, -0.12); } // estira la mano a la altura del pecho
      else if (T === 'labrar') { boy.body.rotation.x = mix(boy.body.rotation.x, 0.16, k); G(boy.armL, -0.7); G(boy.armR, -0.7); G(boy.foreL, -1.2); G(boy.foreR, -1.2); boy.head.rotation.x = mix(boy.head.rotation.x, 0.35, k); }
      else if (T === 'verter') { boy.body.rotation.x = mix(boy.body.rotation.x, 0.22, k); G(boy.armL, -1.05); G(boy.armR, -1.05); G(boy.foreL, -0.55); G(boy.foreR, -0.55); } // las dos manos adelante
      else if (T === 'beber') { G(boy.armR, -0.85); G(boy.foreR, -2.0); boy.head.rotation.x = mix(boy.head.rotation.x, -0.2, k); } // la mano a la boca
      else if (T === 'saludar') { G(boy.armR, -2.5); G(boy.foreR, -0.35); boy.head.rotation.x = mix(boy.head.rotation.x, 0.22, k); } // la mano en alto y la cabeza inclinada
      return;
    }
    if (punt.on && !sit) { // con el arco: el brazo izquierdo estirado hacia donde apunta, el derecho llevando la cuerda atrás, el cuerpo de medio lado
      if (!boy.arcoM) { const g = new THREE.TorusGeometry(0.3, 0.008, 5, 16, Math.PI * 0.8).rotateZ(-Math.PI * 0.9).rotateY(Math.PI / 2); boy.arcoM = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 })); boy.arcoM.position.set(0, 0.125, 0); boy.foreL.add(boy.arcoM); }
      const u = Math.min(1, punt.t / TENSA), k = sm(0, 0.45, u);
      boy.armL.rotation.x = mix(boy.armL.rotation.x, -1.5, k); boy.foreL.rotation.x = mix(boy.foreL.rotation.x, -0.05, k);
      boy.armR.rotation.x = mix(boy.armR.rotation.x, -1.3, k); boy.foreR.rotation.x = mix(boy.foreR.rotation.x, -0.6 - 1.4 * sm(0.3, 1, u), k); boy.body.rotation.y = 0.45 * k;
      return;
    }
    if (!sit) return;
    const s = sit, l = s.l, HIP = 0.52 * (boy.h || 1.38); let w = 1, a = 1;
    if (s.st === 'in') { const u = Math.min(1, s.t / SIT_IN); a = sm(0, 0.5, u); w = sm(0.36, 1, u); } else if (s.st === 'out') w = 1 - sm(0, 0.85, s.t / SIT_OUT);
    const on = s.st === 'on' ? s.t : 0, face = s.st === 'in' ? player.facing : s.f1, fx = Math.sin(face), fz = Math.cos(face);
    animatePerson(boy, s.t * 9, s.st === 'in' ? (1 - a) * 0.5 : 0); // da los pasos que le faltan para llegar
    const lean = 0.1 * w + Math.sin(Math.PI * w) * 0.42 + Math.sin(on * 1.2) * 0.012 * w;
    const px = s.st === 'in' ? mix(s.x0, s.sx, a) : s.sx, pz = s.st === 'in' ? mix(s.z0, s.sz, a) : s.sz, hop = s.st === 'in' && s.over ? Math.sin(Math.PI * a) * 0.32 : 0;
    const hx = mix(px, l.x + s.dx * 0.06, w), hz = mix(pz, l.z + s.dz * 0.06, w), hy = mix(height(px, pz) + HIP + hop, height(l.x, l.z) + 0.49, w) + Math.sin(Math.PI * w) * 0.06;
    boy.g.position.set(hx - fx * Math.sin(lean) * HIP, hy - Math.cos(lean) * HIP, hz - fz * Math.sin(lean) * HIP); boy.g.rotation.y = face; // el cuerpo se inclina desde los pies: se corrige para que la cadera quede donde debe
    const warm = sm(0.55, 0.95, Math.sin(on * 0.42 - 1.4)) * (s.st === 'on' ? 1 : 0), B = (o, v) => { o.rotation.x = mix(o.rotation.x, v, w); };
    boy.body.rotation.x = lean; boy.body.rotation.y *= 1 - w; boy.body.position.y *= 1 - w;
    B(boy.legL, -1.3 - lean); B(boy.legR, -1.3 - lean + Math.sin(on * 0.6) * 0.025); boy.legL.rotation.z = 0.13 * w; boy.legR.rotation.z = -0.13 * w; // muslos hacia adelante, rodillas algo abiertas
    B(boy.shinL, 1.42); B(boy.shinR, 1.42 + Math.max(0, Math.sin(on * 0.6)) * 0.12);
    B(boy.armL, mix(-0.5, -1.2, warm)); B(boy.armR, mix(-0.5, -1.15, warm)); B(boy.foreL, mix(-0.3, -0.45, warm)); B(boy.foreR, mix(-0.3, -0.5, warm)); // las manos descansan en las rodillas; a ratos se acercan al fuego
    boy.head.rotation.x = w * (0.16 - (lean - 0.1) * 0.7); boy.head.rotation.y = Math.sin(on * 0.31) * 0.2 * w;
  }

  function metas(p) {
    const n = needs(), out = [];
      for (const id in n) { if (n[id] <= 0) continue; const it = ITEMS[id];
        if (it.tree) world.trees.filter((t) => t.kind === it.tree && !t.rec.picked && Math.abs(t.x) < 186 && t.z > -136).map((t) => [d2(p, t.x, t.z), t]).sort((a, b) => a[0] - b[0]).slice(0, Math.max(2, n[id])).forEach(([, t]) => out.push({ x: t.x, z: t.z, id, label: it.uno, alto: 3 }));
        else if (it.bush) world.bushesIn(POI.maqui.x, POI.maqui.z, 30).filter((t) => !t.picked).map((t) => [d2(p, t.x, t.z), t]).sort((a, b) => a[0] - b[0]).slice(0, Math.max(2, n[id])).forEach(([, t]) => out.push({ x: t.x, z: t.z, id, label: it.uno, alto: 2.1 * t.s + 0.45 }));
        else if (it.pluma) plumas.filter((q) => !q.picked).map((q) => [d2(p, q.x, q.z), q]).sort((a, b) => a[0] - b[0]).slice(0, 3).forEach(([, q]) => out.push({ x: q.x, z: q.z, id, label: it.uno, alto: 1.2 }));
        else if (it.plant === 'quila') { const t = world.findPlant('quila', p.x, p.z); if (t) out.push({ x: t.x, z: t.z, id, label: it.uno, alto: 2.2 }); } } // alto: a qué altura flota la hoja que lo marca en el mundo
    return out;
  }
  return { scan, talk, wants, update, pose, stand, madreCocina, f, pins: S.pin, pin(i) { if (!S.pin.includes(i)) { S.pin.push(i); save(); } },
    get sitting() { return !!sit; }, get busy() { return (!!sit && sit.st !== 'on') || !!hace; }, get abrigado() { return alFuego(); }, get hace() { return hace; }, get tensa() { return punt.on ? punt.carga : 0; }, get equipado() { return !!S.eq && f.cz >= 2 && have('arco') > 0; }, get tieneArco() { return f.cz >= 2 && have('arco') > 0; }, get recarga() { return punt.pausa / RECARGA; }, get tira() { return punt.tira; }, equipar, tensar, hacerFlecha, get arma() { const tiene = f.cz >= 2 && have('arco') > 0; return { tiene, eq: tiene && !!S.eq, flechas: have('flecha'), quila: have('quila'), pluma: have('pluma'), tope: TOPE_FL }; }, get apunta() { return punt.on; }, get vuela() { return !!vuelo; }, get clavadas() { return clav.length; }, apuntar, soltar, mira, // hace: el gesto en curso; tensa: cuánto lleva tensado el arco // abrigado: junto a un fuego // busy: está sentándose o levantándose
    ctx: () => ({ f, tengo: (id) => have(id), hierbas: Math.min(2, have('canelo')) + Math.min(1, have('quillay')) + Math.min(2, have('maqui')), llevo: { canelo: Math.min(2, have('canelo')), quillay: Math.min(1, have('quillay')), maqui: Math.min(2, have('maqui')) } }),
    // Dónde ir a buscar lo que falta para las misiones abiertas: los árboles más cercanos de cada especie y las matas de maqui del claro.
    goals: (p) => metas(p),
    // A dónde hay que ir ahora para avanzar en una misión (para la línea de guía). Devuelve { x, z, label } o nada si no hay un lugar que marcar.
    objetivo(id, p) {
      const [got, total] = pinones(), has = ui.has, TELAR = { x: -10.6, z: -4.2, label: 'el telar' };
      const quien = (k) => { const a = actor(NOMBRE[k]); return a ? { x: a.x, z: a.z, label: NOMBRE[k] } : null; };
      const cerca = (list) => list.filter(Boolean).sort((a, b) => d2(p, a.x, a.z) - d2(p, b.x, b.z))[0] || null; // de varios, el más cercano
      const arbol = (kind, label) => { const t = cerca(world.trees.filter((q) => q.kind === kind)); return t && { x: t.x, z: t.z, label }; };
      const planta = (kind, label) => { const t = world.findPlant(kind, p.x, p.z); return t && { ...t, label }; };
      const lugar = (k, label) => ({ x: POI[k].x, z: POI[k].z, label: label || POI[k].name });
      const falta = (pairs) => cerca(pairs.filter(([nota]) => !has(nota)).map(([, fn]) => fn())); // de lo que aún no descubres, lo que quede más a mano
      const ave = (type, label) => { const b = cerca(world.life.birds.filter((q) => q.type === type && q.perch).map((q) => q.perch)); return b && { x: b.x, z: b.z, label }; };
      const pudu = () => { const q = cerca(world.life.quads.filter((a) => a.kind === 'pudu' && !a.caido && !a.fuera)); return q && { x: q.x, z: q.z, label: 'un pudú' }; };
      switch (id) {
        case 'm1': if (!f.m1) return (f.tu === 1 && !has('witral')) || (f.tu === 2 && !f.lana) ? TELAR : quien('millaray');
          return f.m1 === 1 && got < total ? cerca(world.items.filter((it) => !it.taken).map((it) => ({ x: it.base.x, z: it.base.z, label: 'un piñón' }))) : quien('millaray');
        case 'm2': return quien('curinancu');
        case 'm3': return !f.m3 ? quien('machi') : f.m3 === 1 ? (listo(['canelo', 'quillay', 'maqui']) ? quien('machi') : cerca(this.goals(p))) : quien('namku');
        case 's1': return cerca(Object.keys(NOMBRE).filter((k) => !has(k)).map(quien));
        case 's2': return falta([['pewen', () => arbol('pewen', 'un pewen')], ['coigue', () => arbol('coigue', 'un coigüe')], ['roble', () => arbol('roble', 'un roble')], ['canelo', () => arbol('canelo', 'un canelo')], ['gigante', () => lugar('viejo', 'el árbol abuelo')]]);
        case 's8': return falta([['peumo', () => arbol('peumo', 'un peumo')], ['boldo', () => arbol('boldo', 'un boldo')], ['quillay', () => arbol('quillay', 'un quillay')], ['litre', () => arbol('litre', 'un litre')]]);
        case 's3': return falta([['weke', () => ({ x: CORRAL.x, z: CORRAL.z, label: 'el corral de los weke' })], ['pudu', pudu], ['traro', () => ave('traro', 'donde se posa el traro')], ['choroy', () => ave('choroy', 'donde se posan los choroyes')], ['rayadito', () => ave('small', 'donde se posa un rayadito')]]);
        case 's4': return cerca(Object.keys(POI).filter((k) => !has('l-' + k)).map((k) => lugar(k, 'un lugar que aún no conoces')));
        case 's5': return falta([['ruka', () => ({ x: -12, z: -6, label: 'la ruka' })], ['kutral', () => ({ x: FOGON.x + 2.5, z: FOGON.z + 2.5, label: 'el fogón' })], ['rewe', () => ({ x: 20, z: 19, label: 'el rewe' })], ['witral', () => TELAR], ['chemamull', () => lugar('antiguos', 'las figuras de madera')]]);
        case 's6': return falta([['ngen', () => quien('machi')], ['pewma', () => quien('machi')], ['pewen-sagrado', () => quien('curinancu')], ['trengtreng', () => quien('abuela')], ['wetripantu', () => quien('millaray')], ['pillan', () => lugar('cerro', 'la cima del cerro')], ['lafken', () => lugar('cerro', 'la cima del cerro')]]);
        case 's7': return falta([['helecho', () => planta('fern', 'un helecho')], ['junco', () => planta('reed', 'unos juncos')], ['flores', () => planta('flower', 'unas flores')], ['maqui', () => lugar('maqui', 'el maqui')], ['quila', () => planta('quila', 'una quila')], ['copihue', () => planta('copihue', 'un copihue')]]);
        case 's9': return f.ab === 1 && !listo(['murtilla']) ? planta('murtilla', 'una mata de murtilla') : quien('abuela');
        case 's10': return f.mi === 1 && !listo(['michay']) ? planta('michay', 'un michay') : quien('millaray');
        case 's11': return f.na === 1 && !listo(['nalca']) ? planta('nalca', 'una nalca') : quien('curinancu');
        case 's12': return !f.lana ? TELAR : !f.agua ? (have('agua') ? { x: FOGON.x + 1.5, z: FOGON.z + 0.9, label: 'la olla del fogón' } : lugar('poza', 'el río')) : !f.weke ? (have('pasto') ? { x: CORRAL.x, z: CORRAL.z, label: 'el corral' } : planta('grass', 'pasto para cortar')) : null;
        case 's13': return cerca(Object.keys(LUGARES).filter((k) => !f['s-' + k]).map((k) => lugar(k, LUGARES[k])));
        case 's14': return !f.huella ? cerca(HUELLAS.map(([x, z]) => ({ x, z, label: 'unas huellas' }))) : pudu();
        case 's15': return quien('rayen');
        case 's16': return { x: FOGON.x - 2.9, z: FOGON.z + 0.4, label: 'los troncos del fogón' };
        case 's17': return !f.rm ? quien('machi') : f.rm === 1 ? (listo(['maqui', 'boldo']) ? quien('machi') : cerca(this.goals(p))) : null;
        case 'm4': {
          if (!f.cz || f.cz === 4) return quien('namku');
          if (f.cz === 1) return listo(['quila', 'pluma']) ? quien('namku') : cerca(this.goals(p));
          if (f.cz === 2) return (f.blanco || 0) >= 3 ? quien('namku') : { x: BLANCO.x, z: BLANCO.z, label: 'el blanco de paja' };
          if (f.cz === 3) { const c = world.life.quads.find((a) => a.caido && !a.fuera); if (c) return { x: c.x, z: c.z, label: 'el pudú' }; const q = pudu(); return q && d2(p, q.x, q.z) < 45 ? q : cerca(HUELLAS.map(([x, z]) => ({ x, z, label: 'unas huellas de pudú' }))); }
          return null; }
        default: return null;
      }
    },
    get vida() { return S.vida ?? 100; }, set vida(v) { S.vida = v; save(); },
    reset() { localStorage.removeItem(KEY); } };
}
