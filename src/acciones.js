// Cosas que Leftraru puede hacer en el mundo además de observar: recoger plantas, llevar encargos,
// ayudar en la aldea, sentarse al fogón, saludar al bosque, seguir huellas, jugar palin y tirar piedras al río.
// También lleva el hilo de la historia: qué misión principal está abierta y quién la da.
import * as THREE from 'three';
import { height, POI, CERRO, riverZ, WATER_Y } from './terrain.js';
import { animatePerson } from './life.js';
import { FOGON, CORRAL } from './village.js';

const KEY = 'leftraru.tareas';
// qué se recoge, cómo se llama en la mano y de dónde sale
const ITEMS = {
  canelo: { uno: 'hojas de canelo', tree: 'canelo' }, quillay: { uno: 'corteza de quillay', tree: 'quillay' }, maqui: { uno: 'hojas de maqui', bush: true },
  murtilla: { uno: 'murtilla', plant: 'murtilla' }, michay: { uno: 'raíz de michay', plant: 'michay' }, nalca: { uno: 'tallo de nalca', plant: 'nalca' },
};
const FUEGO = [
  ['La abuela', 'El fuego no se deja solo, niño. Mientras arde, la casa está viva.'],
  ['La abuela', 'Dicen que el primer fuego lo trajo un pájaro en el pico. Por eso a los pájaros no se les tira piedras.'],
  ['La abuela', 'Mira el humo: si sube derecho, mañana no llueve. Si se acuesta, guarda la leña bajo techo.'],
  ['La abuela', 'Antes de comer, el primer bocado es para la tierra. Ella comió primero que nosotros y comerá después.'],
  ['La abuela', 'Cuando yo era chica, mi abuela me contaba estas mismas cosas en este mismo lugar. Algún día las contarás tú.'],
];
const LUGARES = { viejo: 'el bosque viejo', menoko: 'el menoko', antiguos: 'el lugar de los antiguos' };
const HUELLAS = [[-70, -70], [40, -52], [-60, 66]];
const NOMBRE = { curinancu: 'Curiñancu', millaray: 'Millaray', abuela: 'la abuela', ayelen: 'Ayelén', rayen: 'Rayen', machi: 'la machi', namku: 'Ñamku' }; // cómo se llama en el mundo cada persona del cuaderno

export function createActions({ world, ui, snd, scene, hint, speak, murmur, ripple, player, place, pinones, story }) {
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
  // el camino: el sendero del nororiente y, arriba, un rodeo por el borde para no pasar por encima de las rocas del mirador
  const RUTA = [[6, -5], [40, -30], [70, -55], [90, -74], [97, -81], [97.5, -90], [101, -93.5], [106.5, -93.6], CIMA];
  const DICHOS = { 2: '¿Oyes a los choroyes? Donde gritan, hay piñones. El bosque avisa todo, si uno sabe escuchar.', 3: 'Por aquí subía yo con mi padre, cuando tenía tu edad. Y él, con el suyo.', 4: 'Este cerro salvó a nuestra gente cuando subió el mar. Por eso se llama Treng Treng.' }; // lo que va diciendo al pasar cada tramo
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

  // ---------- lo que hace falta ahora, según los encargos abiertos ----------
  function needs() {
    const n = {};
    if (f.m3 === 1) { n.canelo = 2; n.quillay = 1; n.maqui = 2; }
    if (f.ab === 1) n.murtilla = 3;
    if (f.mi === 1) n.michay = 2;
    if (f.na === 1) n.nalca = 2;
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
      if (f.m1 === 1 && got >= total) return { main: true, lines: ['¿Los trajiste todos? A ver… Sí. Con estos alcanza para la noche más larga.', 'Cuando yo era niña, mi madre me mandaba por los mismos piñones al mismo bosque. El pewen no se ha olvidado de nosotros ni un solo invierno.', 'Ahora anda con tu padre. Te está esperando para subir al Treng Treng: dice que hay algo que solo se ve desde arriba.'], done: () => { set('m1', 2); ui.takeItem('pinon', total); } };
      if (!f.mi) return { lines: ['Hijo, me quedé sin amarillo para la manta. Se saca de la raíz del michay, ese arbusto de espinas y flores anaranjadas.', 'Tráeme dos raíces. Escarba con cuidado y deja la mata en pie: tiene que seguir dando.'], done: () => set('mi', 1) };
      if (f.mi === 1 && listo(['michay'])) return { lines: ['Estas sirven. Mira: se hierven con la lana y sale un amarillo como de sol de invierno.', 'Cada color viene de un lugar. Cuando te pongas esta manta vas a llevar encima el monte entero, aunque estés lejos.'], done: () => { take('michay', 2); set('mi', 2); } };
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
        if (f.na === 1) return { lines: ['Buenas hojas. Con estas no entra ni una piedra a la comida.', 'El tallo pélalo y cómetelo: es ácido y quita la sed. Te lo ganaste.'], done: () => { take('nalca', 2); set('na', 2); } };
      }
    }
    if (id === 'machi' && f.m2 === 2) {
      if (!f.m3) return { main: true, lines: ['Leftraru, qué bueno que viniste. El viejo Ñamku amaneció con fiebre y la tos no lo deja dormir.', 'Voy a prepararle un lawen, pero mis piernas ya no están para andar por el monte. Tú serás mis pies.', 'Tráeme hojas de canelo, de dos árboles distintos: crece cerca del agua y en el lugar de los antiguos. Un trozo de corteza de quillay, del monte donde pega el sol. Y hojas de maqui, del claro del surponiente.', 'Antes de cortar, pide. Di para quién es. La planta que se saca sin permiso no sana a nadie.'], done: () => set('m3', 1) };
      if (f.m3 === 1 && !listo(['canelo', 'quillay', 'maqui'])) return { lines: [`Todavía falta: ${falta()}.`, 'No te apures. Mira bien cada planta antes de cortarla: hay que conocerla para pedirle.'] };
      if (f.m3 === 1) return { main: true, lines: ['Déjame ver… Sí. Las cortaste con cuidado, se nota.', 'El canelo abre el camino, el quillay suelta el pecho y el maqui baja la fiebre. Pero lo que sana es que alguien fue a buscarlas pensando en el enfermo.', 'Ya está. Llévaselo a Ñamku mientras está tibio. Y dile que se lo tome todo, que yo sé que es porfiado.'], done: () => { take('canelo', 2); take('quillay', 1); take('maqui', 2); inv.lawen = 1; set('m3', 2); } };
      if (f.m3 === 2) return { lines: ['El lawen se enfría, niño. Ñamku está en su ruka, al oriente.'] };
    }
    if (id === 'namku' && f.m3 === 2) return { main: true, lines: ['¿Eso es para mí? Huele al monte entero… La machi te mandó a ti, ¿no? Así se aprende.', 'Amargo. Bien amargo. Así tiene que ser.', 'Cuando yo tenía tu edad, mi abuelo se enfermó y fui yo a buscar las plantas. Me perdí dos días. Volví con las hojas equivocadas, y él se mejoró igual, de puro reírse.', 'Gracias, Leftraru. Uno no se sana solo: lo sana su gente.', 'Y prepárate, que ya vienen los de la costa para el We Tripantu. Alguien tendrá que salir a recibirlos.'], done: () => { inv.lawen = 0; set('m3', 3); } };
    if (id === 'abuela') {
      if (!f.ab) return { lines: ['Leftraru, ¿me harías un favor? Tengo antojo de murtilla y ya no llego hasta donde crece.', 'Es una mata bajita de frutos rojos. Se da en los claros y en las laderas con sol. Tráeme tres puñados.'], done: () => set('ab', 1) };
      if (f.ab === 1 && !listo(['murtilla'])) return { lines: [`Todavía me falta: ${falta()}. Busca donde llega el sol.`] };
      if (f.ab === 1) return { lines: ['¡Qué perfume! Así olía la ruka de mi madre al final del verano.', 'Ella las secaba al sol y las guardaba para el invierno. En las noches largas nos daba un puñado a cada uno, y había que hacerlo durar hasta que terminara el cuento.', 'Toma, come tú también. Y cuando seas viejo, acuérdate de a qué sabía.'], done: () => { take('murtilla', 3); set('ab', 2); } };
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
      || (id === 'machi' && f.m2 === 2 && (!f.m3 || (f.m3 === 1 && listo(['canelo', 'quillay', 'maqui'])))) || (id === 'namku' && f.m3 === 2)) return 'main';
    const sec = { abuela: !f.ab || (f.ab === 1 && listo(['murtilla'])), millaray: !!f.m1 && (!f.mi || (f.mi === 1 && listo(['michay']))), curinancu: ui.has('nalca') && (!f.na || (f.na === 1 && listo(['nalca']))), rayen: !f.palin }[id];
    return sec ? 'sec' : null;
  };

  // ---------- recoger ----------
  function source(id, p) {
    const it = ITEMS[id]; let s = null;
    if (it.plant) s = world.nearPlant(it.plant, p.x, p.z, 1.6);
    else if (it.bush) s = d2(p, POI.maqui.x, POI.maqui.z) < 30 ? world.nearBush(p.x, p.z, 2.4) : null;
    else { const t = world.nearTree(p.x, p.z, 3.2); if (t && t.kind === it.tree) s = { d: t.d, rec: t.rec }; }
    return s && !s.rec.picked ? s : null;
  }
  function pick(id, rec) { rec.picked = true; give(id); snd.play('arbusto-1', 0.35); const n = needs()[id] || 0; hint(n ? `Recogiste ${ITEMS[id].uno}. Faltan ${n}.` : `Recogiste ${ITEMS[id].uno}. Ya tienes lo necesario.`, 4); }

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

  // ---------- qué se puede hacer aquí ----------
  // Sentarse en un tronco: camina hasta quedar delante (si venía por detrás, pasa por encima), se gira hacia el fuego
  // y baja de a poco doblando las rodillas. Sentado respira, mira el fuego y a ratos acerca las manos. Al levantarse, lo contrario.
  let sit = null, fuegoI = 0, here = { x: 0, z: 0 };
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
    const out = [], add = (d, label, run) => out.push({ d, label, run }), n = needs();
    for (const id in n) if (n[id] > 0) { const s = source(id, p); if (s) add(s.d - 5, `Recoger ${ITEMS[id].uno}`, () => pick(id, s.rec)); }
    const df = d2(p, FOGON.x, FOGON.z);
    const tr = TRONCOS.map((l) => ({ l, d: d2(p, l.x, l.z) })).sort((a, b) => a.d - b.d)[0];
    if (tr.d < 1.5) add(tr.d, 'Sentarse en el tronco', () => sentarse(tr.l, here));
    // tareas de la aldea
    if (ui.has('millaray') && !f.lana && (f.m1 || f.tu === 2) && d2(p, -10.6, -4.2) < 3) add(1, 'Alcanzarle la lana a Millaray', () => { set('lana', 1); const gracias = 'Gracias, hijo. La roja primero… esa. Así no tengo que soltar el hilo.'; if (f.m1) speak('Millaray', [gracias]); else speak('Millaray', [gracias, ...ENCARGO], () => set('m1', 1)); }); // la primera vez, con esto te da la misión
    const rz = riverZ(p.x), dr = Math.abs(p.z - rz);
    if (!f.agua && !have('agua') && dr < 5 && p.y < WATER_Y + 1.6) add(2, 'Llenar la vasija con agua', () => { inv.agua = 1; save(); snd.play('paso-agua-1', 0.5); hint('Llenaste la vasija. Llévala a la olla del fogón.', 5); });
    if (!f.agua && have('agua') && df < 4.2) add(0.5, 'Echar el agua a la olla', () => { inv.agua = 0; set('agua', 1); snd.play('paso-agua-2', 0.5); speak('La abuela', ['¡Agua fresca! Con esto alcanza para el caldo. Así da gusto.']); });
    const dc = d2(p, CORRAL.x, CORRAL.z);
    if (!f.weke && !have('pasto') && dc > 9 && world.nearPlant('grass', p.x, p.z, 1.2)) add(6, 'Cortar pasto para los weke', () => { inv.pasto = 1; save(); snd.play('arbusto-2', 0.35); hint('Cortaste un atado de pasto. Llévalo al corral.', 5); });
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

  function update(dt, t, p) {
    here = p; if (palin) updatePalin(dt, p);
    if (sit) updateSit(dt);
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

  return { scan, talk, wants, update, pose, stand, f, pins: S.pin, pin(i) { if (!S.pin.includes(i)) { S.pin.push(i); save(); } },
    get sitting() { return !!sit; }, get busy() { return !!sit && sit.st !== 'on'; }, // busy: está sentándose o levantándose
    ctx: () => ({ f, hierbas: Math.min(2, have('canelo')) + Math.min(1, have('quillay')) + Math.min(2, have('maqui')), llevo: { canelo: Math.min(2, have('canelo')), quillay: Math.min(1, have('quillay')), maqui: Math.min(2, have('maqui')) } }),
    // Dónde ir a buscar lo que falta para las misiones abiertas: los árboles más cercanos de cada especie y el claro del maqui.
    goals(p) {
      const n = needs(), out = [];
      for (const id in n) { if (n[id] <= 0) continue; const it = ITEMS[id];
        if (it.tree) world.trees.filter((t) => t.kind === it.tree && !t.rec.picked).map((t) => [d2(p, t.x, t.z), t]).sort((a, b) => a[0] - b[0]).slice(0, Math.max(2, n[id])).forEach(([, t]) => out.push({ x: t.x, z: t.z, id, label: it.uno }));
        else if (it.bush) out.push({ x: POI.maqui.x, z: POI.maqui.z, id, label: it.uno }); }
      return out;
    },
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
      const pudu = () => { const q = cerca(world.life.quads.filter((a) => a.kind === 'pudu')); return q && { x: q.x, z: q.z, label: 'un pudú' }; };
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
        default: return null;
      }
    },
    get vida() { return S.vida ?? 100; }, set vida(v) { S.vida = v; save(); },
    reset() { localStorage.removeItem(KEY); } };
}
