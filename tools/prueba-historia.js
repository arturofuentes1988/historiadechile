/*
  PRUEBA DE LA HISTORIA — ACTO I
  ==============================
  Recorre sola la historia completa (portada → tutorial con Millaray → piñones → cerro con Curiñancu →
  plantas de la machi → lawen para Ñamku) y dice en qué paso falla. Sirve para repetir la prueba
  después de cada cambio al juego.

  CÓMO USARLO
  1. Abre el juego en el navegador (npm run dev) y espera a que termine de cargar. Da lo mismo si
     estás en la portada o ya jugando.
  2. Abre la consola del navegador (F12 → pestaña «Consola»).
  3. Pega TODO este archivo y pulsa Enter. La prueba parte sola y tarda menos de un minuto.
  4. Lee el resultado en la consola: una línea por paso, con ✔ si pasó y ✘ si falló, y al final un
     resumen. Si un paso falla, la prueba se detiene ahí y dice qué esperaba y qué encontró.

  PARA PROBAR DESDE EL PRINCIPIO
  La prueba sigue desde donde esté la partida guardada y se salta lo que ya está hecho. Para probar la
  historia entera hay que partir sin avance. Escribe en la consola:
      __prueba.borrarAvance()
  (borra el cuaderno y las misiones de ESTE navegador y recarga la página; pide confirmación).
  Después vuelve a pegar este archivo. Al terminar, el mismo comando deja todo limpio otra vez.

  OTROS COMANDOS (después de haber pegado el archivo una vez)
      __prueba.historia()        repite la prueba de la historia
      __prueba.resistencia(20)   hace caminar a Leftraru por todo el mapa durante 20 minutos de juego
                                 y mide cuánto tarda cada cuadro y si aparece algún error
                                 (OJO: esta parte está escrita pero todavía no se ha corrido ni una vez;
                                 la prueba de la historia sí está comprobada)
      __prueba.resultado         lo que arrojó la última prueba

  QUÉ NO REVISA
  No mira la imagen ni escucha el sonido: comprueba el estado del juego (banderas de la historia,
  misiones, avisos, conversaciones). Leftraru se mueve por teletransporte, así que tampoco prueba
  que el camino se pueda recorrer a pie; eso lo hace, en parte, la prueba de resistencia.
*/
(() => {
  const g = window.__g;
  if (!g) { console.error('Prueba: el juego todavía no carga (no existe window.__g). Espera a que desaparezca la barra de carga y pega el archivo de nuevo.'); return; }
  const $ = (id) => document.getElementById(id);
  const pausa = () => new Promise((r) => setTimeout(r, 0));
  const R2 = (v) => Math.round(v * 100) / 100;

  // ---------- errores del juego: se anotan todos, pasen cuando pasen ----------
  if (!window.__pruebaErrores) {
    window.__pruebaErrores = [];
    addEventListener('error', (e) => window.__pruebaErrores.push(`${e.message} (${String(e.filename || '').split('/').pop()}:${e.lineno})`));
    addEventListener('unhandledrejection', (e) => window.__pruebaErrores.push(`promesa rechazada: ${(e.reason && e.reason.message) || e.reason}`));
    const original = console.error;
    console.error = (...a) => { window.__pruebaErrores.push(a.map((x) => (x && x.message) || String(x)).join(' ')); original.apply(console, a); };
  }
  const errores = window.__pruebaErrores;

  // ---------- avanzar el tiempo del juego, midiendo cada cuadro ----------
  const med = { cuadros: 0, ms: 0, max: 0, lentos: 0, avisos: [], dichos: [], ultimoAviso: '', ultimoDicho: '' };
  function cuadro() {
    const t0 = performance.now(); g.tick(1 / 60); const d = performance.now() - t0;
    med.cuadros++; med.ms += d; if (d > med.max) med.max = d; if (d > 16.7) med.lentos++;
    const h = $('hint').classList.contains('on') ? $('hint').textContent : ''; if (h && h !== med.ultimoAviso) med.avisos.push(h); med.ultimoAviso = h;
    const s = $('sub').classList.contains('on') ? `${$('sub-name').textContent}: ${$('sub-text').textContent}` : ''; if (s && s !== med.ultimoDicho) med.dichos.push(s); med.ultimoDicho = s;
  }
  const avanzar = (seg) => { for (let i = 0, n = Math.round(seg * 60); i < n; i++) cuadro(); };
  // avanza hasta que se cumpla la condición; devuelve false si pasan «max» segundos de juego sin que ocurra
  const esperar = (cond, max = 5) => { for (let t = 0; t < max; t += 0.1) { if (cond()) return true; avanzar(0.1); } return !!cond(); };

  // ---------- manos y pies ----------
  const alto = (x, z) => g.height(x, z);
  const pos = () => g.pp();
  const ir = (x, z) => { g.tp(x, alto(x, z) + 0.8, z); g.player.speed = 0; avanzar(0.5); };
  const actor = (nombre) => g.world.life.actors.find((a) => a.name === nombre);
  const tecla = (code) => { dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); };
  const E = () => tecla(g.opts.keys.observar), R = () => tecla(g.opts.keys.accion);
  const cerca = () => (g.near ? `${g.near.verb} ${g.near.label}` : 'nada');
  const paso = () => { const el = document.querySelector('#mis-lista .paso'); return el ? el.textContent : ''; };
  const falla = (msg) => { throw new Error(msg); };
  const exigir = (ok, msg) => { if (!ok) falla(msg); };
  // Los avisos de arriba hacen fila (cada uno dura unos 3 segundos): se espera hasta un minuto de juego a que salga el buscado.
  const avisoVisto = (desde, re) => esperar(() => med.avisos.slice(desde).some((a) => re.test(a)), 60);

  // Se para junto a alguien (probando varios lados), le habla con la tecla de observar y pasa todas las líneas.
  function hablar(nombre, id) {
    const a = actor(nombre); exigir(a, `No existe el personaje «${nombre}».`);
    let listo = false;
    for (let k = 0; k < 8 && !listo; k++) {
      const ang = a.face + k * (Math.PI / 4);
      ir(a.x + Math.sin(ang) * 1.4, a.z + Math.cos(ang) * 1.4);
      listo = esperar(() => g.near && g.near.id === id, 1.2);
    }
    exigir(listo, `Junto a ${nombre} no aparece «Hablar con…». Lo que se ofrece es: ${cerca()}.`);
    E(); exigir(g.talk, `Se pulsó la tecla de hablar junto a ${nombre} y no se abrió la conversación.`);
    return pasarLineas();
  }
  function pasarLineas() { const l = []; let n = 0; while (g.talk && n++ < 40) { l.push(g.talk.lines[g.talk.i]); E(); } exigir(!g.talk, 'La conversación no se cierra.'); return l; }
  // Espera a que el juego ofrezca la acción (el cartel de la tecla de acción) y la ejecuta.
  function accion(re, donde) {
    const ok = esperar(() => $('prompt2').classList.contains('on') && re.test($('prompt2-text').textContent), 2);
    exigir(ok, `${donde}: no aparece la acción esperada (${re}). Se ofrece: ${$('prompt2').classList.contains('on') ? $('prompt2-text').textContent : 'nada'}.`);
    R(); avanzar(0.3);
  }
  // Una escena tiene que empezar sola y terminar sola.
  function escena(nombre, espera, dura) {
    exigir(esperar(() => g.state === 'cine', espera), `No empezó la escena «${nombre}».`);
    exigir(esperar(() => g.state === 'play', dura), `La escena «${nombre}» no termina (pasaron ${dura} segundos de juego).`);
  }

  // ---------- los pasos de la historia ----------
  // Cada paso: [nombre, ¿ya está hecho?, qué hacer y qué comprobar]. Si algo no calza, el paso lanza un error con la explicación.
  function pasosHistoria() {
    const f = g.acc.f, ui = g.ui, total = g.world.items.length, quiere = (id) => g.acc.wants(id);
    const hierbas = () => g.acc.ctx().hierbas, padre = actor('Curiñancu');
    return [
      ['Entrar desde la portada y pasar el prólogo', () => g.state === 'play', () => {
        if (g.menuOpen) g.setMenu(false);
        if (g.state === 'title') { g.portadaMenu(); g.enter(); }
        if (g.acto) g.cerrarActo();
        if (g.prologo) g.cerrarPrologo();
        exigir(esperar(() => g.state === 'play', 30), `No se llegó al juego: el estado quedó en «${g.state}».`);
        exigir(ui.has('leftraru'), 'Al empezar no quedó Leftraru anotado en el cuaderno.');
      }],
      ['Tutorial: Millaray llama a Leftraru', () => !!f.tu || !!f.m1, () => {
        exigir(quiere('millaray') === 'main', 'Millaray no tiene la estrella dorada al empezar.');
        exigir(quiere('curinancu') !== 'main' && quiere('machi') !== 'main', 'Otra persona tiene la estrella de la historia antes de tiempo.');
        hablar('Millaray', 'millaray');
        exigir(f.tu === 1 || f.tu === 2, `Después de hablar con Millaray el tutorial no avanzó (tu = ${f.tu}).`);
        avanzar(0.7); exigir(/telar|lana/i.test(paso()), `La línea bajo la misión dice «${paso()}»; debería mandar al telar o a la lana.`);
      }],
      ['Tutorial: observar el telar', () => ui.has('witral') || !!f.m1, () => {
        const t = g.acc.objetivo('m1', pos()); exigir(t && /telar/.test(t.label), 'La misión no apunta al telar.');
        const l = Math.hypot(t.x, t.z) || 1; ir(t.x - (t.x / l) * 1.5, t.z - (t.z / l) * 1.5);
        exigir(esperar(() => g.near && g.near.id === 'witral', 2), `Junto al telar no aparece «Observar el telar». Se ofrece: ${cerca()}.`);
        E(); exigir(esperar(() => ui.has('witral'), 4), 'Se observó el telar y no quedó en el cuaderno.');
        avanzar(3);
      }],
      ['Tutorial: volver con Millaray', () => f.tu === 2 || !!f.m1, () => {
        exigir(quiere('millaray') === 'main', 'Después de observar el telar, la estrella no volvió a Millaray.');
        hablar('Millaray', 'millaray'); exigir(f.tu === 2, `Millaray no pidió la lana (tu = ${f.tu}).`);
      }],
      ['Tutorial: alcanzar la lana y recibir el encargo', () => !!f.m1, () => {
        const t = g.acc.objetivo('m1', pos()); const l = Math.hypot(t.x, t.z) || 1; ir(t.x - (t.x / l) * 1.5, t.z - (t.z / l) * 1.5);
        accion(/lana/i, 'Junto al telar');
        exigir(g.talk, 'Al alcanzar la lana, Millaray no dijo nada.'); pasarLineas();
        exigir(f.lana === 1 && f.m1 === 1, `Millaray no dio el encargo de los piñones (lana = ${f.lana}, m1 = ${f.m1}).`);
        exigir(avisoVisto(0, /Nueva misión: Los piñones/), 'No salió el aviso «Nueva misión: Los piñones del pewen».');
        exigir(g.world.items.every((it) => it.taken || it.mesh.visible), 'Los piñones no aparecieron en el bosque.');
      }],
      ['Recoger los cinco piñones', () => f.m1 !== 1 || g.got >= total, () => {
        g.world.items.forEach((it, i) => {
          if (it.taken) return;
          g.tp(it.base.x, it.base.y + 0.2, it.base.z); avanzar(0.1);
          exigir(it.taken, `El piñón ${i + 1} no se recogió al tocarlo.`);
        });
        exigir(g.got === total, `Se recogieron ${g.got} piñones de ${total}.`);
        escena('el último piñón', 6, 40);
        avanzar(1); exigir(quiere('millaray') === 'main', 'Con todos los piñones, la estrella no volvió a Millaray.');
        exigir(/madre/i.test(paso()), `La línea bajo la misión dice «${paso()}»; debería mandar donde la madre.`);
      }],
      ['Entregar los piñones a Millaray', () => f.m1 === 2, () => {
        exigir(quiere('curinancu') !== 'main', 'Curiñancu tiene la estrella antes de entregar los piñones.');
        hablar('Millaray', 'millaray'); exigir(f.m1 === 2, `Millaray no recibió los piñones (m1 = ${f.m1}).`);
        avanzar(1);
        exigir(ui.done('m1'), 'La misión 1 no quedó marcada como hecha.');
        exigir(!ui.state.bag.pinon, 'Los piñones siguen en la bolsa después de entregarlos.');
        exigir(avisoVisto(0, /Nueva misión: El traro/), 'No salió el aviso «Nueva misión: El traro».');
      }],
      ['Curiñancu invita a subir al cerro', () => !!f.m2, () => {
        exigir(quiere('curinancu') === 'main', 'Curiñancu no tiene la estrella dorada.');
        exigir(quiere('machi') !== 'main', 'La machi tiene la estrella antes de subir al cerro.');
        hablar('Curiñancu', 'curinancu'); exigir(f.m2 === 1, `Curiñancu no empezó la subida (m2 = ${f.m2}).`);
        exigir(padre.yendo, 'Curiñancu no se puso en camino.');
      }],
      ['Subir el cerro siguiendo a Curiñancu', () => f.m2 === 2 || !padre.yendo, () => {
        const y0 = alto(padre.x, padre.z); let t = 0;
        for (; t < 180 && padre.yendo; t += 0.5) { ir(padre.x - Math.sin(padre.face) * 2.5, padre.z - Math.cos(padre.face) * 2.5); }
        exigir(!padre.yendo, `Curiñancu no llegó a la cima en 180 segundos de juego. Quedó en (${Math.round(padre.x)}, ${Math.round(padre.z)}).`);
        exigir(alto(padre.x, padre.z) > y0 + 30, 'Curiñancu se detuvo, pero no está arriba del cerro.');
      }],
      ['Escena de la cima y despedida', () => f.m2 === 2, () => {
        hablar('Curiñancu', 'curinancu');
        escena('la cima del Treng Treng', 12, 70);
        exigir(esperar(() => g.talk, 3), 'Al terminar la escena, Curiñancu no se despidió.'); pasarLineas();
        exigir(f.m2 === 2, `La misión del traro no se cerró (m2 = ${f.m2}).`);
        avanzar(1);
        exigir(ui.done('m2'), 'La misión 2 no quedó marcada como hecha.');
        exigir(avisoVisto(0, /Nueva misión: Las plantas de la machi/), 'No salió el aviso «Nueva misión: Las plantas de la machi».');
      }],
      ['La machi pide las plantas', () => !!f.m3, () => {
        exigir(quiere('machi') === 'main', 'La machi no tiene la estrella dorada.');
        exigir(quiere('namku') !== 'main', 'Ñamku tiene la estrella antes de tiempo.');
        hablar('la machi', 'machi'); exigir(f.m3 === 1, `La machi no dio el encargo (m3 = ${f.m3}).`);
        avanzar(1); const ids = new Set(ui.goals.map((q) => q.id));
        exigir(['canelo', 'quillay', 'maqui'].every((k) => ids.has(k)), `Las hojas verdes del mapa no marcan las tres plantas (marcan: ${[...ids].join(', ') || 'ninguna'}).`);
      }],
      ['Recoger canelo, quillay y maqui', () => f.m3 !== 1 || hierbas() === 5, () => {
        for (let n = 0; n < 12 && hierbas() < 5; n++) {
          const antes = hierbas(), q = g.acc.goals(pos())[0]; exigir(q, 'Faltan plantas y el mapa ya no marca dónde buscarlas.');
          if (q.id === 'maqui') { // la hoja marca el centro del claro: se buscan los arbustos alrededor
            const vistos = new Map();
            for (let x = q.x - 30; x <= q.x + 30; x += 2) for (let z = q.z - 30; z <= q.z + 30; z += 2) { const b = g.world.nearBush(x, z, 3); if (b && !b.rec.picked && Math.hypot(b.x - q.x, b.z - q.z) < 27) vistos.set(`${Math.round(b.x * 10)},${Math.round(b.z * 10)}`, b); }
            const b = [...vistos.values()].sort((u, v) => Math.hypot(u.x - q.x, u.z - q.z) - Math.hypot(v.x - q.x, v.z - q.z))[0];
            exigir(b, 'No queda ningún arbusto de maqui sin cortar en el claro.');
            ir(b.x + 1.3, b.z);
          } else ir(q.x + 1.6, q.z);
          accion(/Recoger/, `Junto a ${q.label}`);
          exigir(hierbas() === antes + 1, `Se pulsó la acción junto a ${q.label} y la cuenta de plantas no subió.`);
        }
        exigir(hierbas() === 5, `Se juntaron ${hierbas()} de 5 plantas.`);
        avanzar(1); exigir(quiere('machi') === 'main', 'Con todas las plantas, la estrella no volvió a la machi.');
      }],
      ['Volver con la machi y recibir el lawen', () => f.m3 >= 2, () => {
        hablar('la machi', 'machi'); exigir(f.m3 === 2, `La machi no entregó el lawen (m3 = ${f.m3}).`);
        exigir(!ui.state.bag.canelo && !ui.state.bag.quillay && !ui.state.bag.maqui, 'Las plantas siguen en la bolsa después de entregarlas.');
        exigir(quiere('namku') === 'main', 'Ñamku no tiene la estrella dorada.');
      }],
      ['Llevar el lawen a Ñamku', () => f.m3 === 3, () => {
        hablar('Ñamku', 'namku'); exigir(f.m3 === 3, `Ñamku no recibió el lawen (m3 = ${f.m3}).`);
        avanzar(1);
        exigir(ui.done('m3'), 'La misión 3 no quedó marcada como hecha.');
        exigir(avisoVisto(0, /Hasta aquí llega la historia/), 'No salió el aviso de que la historia llega hasta aquí.');
      }],
      ['Cierre: la historia queda en «Continuará»', () => false, () => {
        avanzar(2);
        exigir(['m1', 'm2', 'm3'].every((m) => ui.done(m)), 'Alguna de las tres misiones no figura como hecha.');
        exigir(/Continuará/.test($('mis-lista').textContent), 'La lista de arriba no dice «Continuará…».');
        exigir(['millaray', 'curinancu', 'machi', 'namku'].every((k) => quiere(k) !== 'main'), 'Alguien sigue con la estrella dorada después del final.');
        exigir(!$('aviso-error').classList.contains('on'), 'Apareció el aviso de error del juego.');
      }],
    ];
  }

  let corriendo = false;
  async function historia() {
    if (corriendo) { console.warn('Prueba: ya hay una prueba en marcha.'); return; }
    corriendo = true; const pausado = g.paused; g.paused = true;
    if (g.ui.open) g.ui.show(null);
    const e0 = errores.length, c0 = med.cuadros, m0 = med.ms; med.max = 0; med.lentos = 0;
    const filas = []; let fallo = null;
    console.log('%cPRUEBA DE LA HISTORIA — ACTO I', 'font-weight:bold;font-size:14px');
    const pasos = pasosHistoria();
    for (let i = 0; i < pasos.length && !fallo; i++) {
      const [nombre, hecho, hacer] = pasos[i]; let estado = 'pasó', detalle = '';
      try { if (hecho()) estado = 'ya estaba hecho'; else hacer(); }
      catch (err) { estado = 'FALLÓ'; detalle = err && err.message ? err.message : String(err); fallo = { paso: i + 1, nombre, detalle }; }
      filas.push({ paso: i + 1, nombre, estado, detalle });
      console.log(`${estado === 'FALLÓ' ? '✘' : estado === 'pasó' ? '✔' : '–'} ${i + 1}. ${nombre}${estado === 'ya estaba hecho' ? ' (ya estaba hecho, se salta)' : ''}${detalle ? ' — ' + detalle : ''}`);
      await pausa();
    }
    const cuadros = med.cuadros - c0, nuevos = errores.slice(e0);
    const res = { ok: !fallo && !nuevos.length, fallo, pasos: filas, erroresDelJuego: nuevos, segundosDeJuego: Math.round(cuadros / 60), msPorCuadro: cuadros ? R2((med.ms - m0) / cuadros) : 0, cuadroMasLento: R2(med.max), avisos: med.avisos.slice(), dichos: med.dichos.slice(), banderas: { ...g.acc.f } };
    api.resultado = res; g.paused = pausado; corriendo = false;
    if (fallo) console.log(`%cFALLÓ en el paso ${fallo.paso} («${fallo.nombre}»): ${fallo.detalle}`, 'color:#c0392b;font-weight:bold');
    else if (filas.slice(1, -1).every((r) => r.estado === 'ya estaba hecho')) console.log('%cLa partida guardada ya tenía la historia terminada: no había nada que recorrer. Para probarla entera, usa __prueba.borrarAvance() y pega el archivo de nuevo.', 'color:#b9770e;font-weight:bold');
    else console.log('%cLa historia se recorrió completa, sin fallas.', 'color:#1e8449;font-weight:bold');
    if (nuevos.length) console.log(`%cErrores del juego durante la prueba (${nuevos.length}):`, 'color:#c0392b;font-weight:bold', nuevos);
    console.log(`Se simularon ${res.segundosDeJuego} segundos de juego. Cada cuadro tardó en promedio ${res.msPorCuadro} ms (el más lento, ${res.cuadroMasLento} ms).`);
    console.log('Detalle completo en __prueba.resultado (avisos mostrados, frases, banderas).');
    return res;
  }

  // ---------- resistencia: caminar por todo el mapa un buen rato ----------
  // Leftraru camina y corre de verdad (con el mismo control del jugador) entre lugares de todo el mapa. Si se queda
  // trabado más de 4 segundos, se anota y se lo lleva al destino. De paso observa lo que encuentra y usa la tecla de acción.
  const VUELTA = [[0, -8], [0, -90], [20, -110], [104, -88], [150, -60], [108, 16], [60, 60], [4, 96], [-60, 98], [-104, 66], [-78, 30], [-150, -12], [-180, -60], [-128, -96], [-60, -120], [-48, -24], [-25, 14], [18, 17], [170, 40], [170, -120], [-170, -125], [-175, 70]];
  async function resistencia(minutos = 20) {
    if (corriendo) { console.warn('Prueba: ya hay una prueba en marcha.'); return; }
    if (g.state !== 'play') { console.warn('Prueba de resistencia: entra primero al juego (o corre __prueba.historia()).'); return; }
    corriendo = true; const pausado = g.paused; g.paused = true; if (g.ui.open) g.ui.show(null);
    const K = g.opts.keys, e0 = errores.length, total = Math.round(minutos * 3600);
    const r = { minutos, cuadros: 0, ms: 0, max: 0, sobre16ms: 0, sobre50ms: 0, excepciones: 0, primeras: [], trabado: [], destinos: 0, desmayos: 0, metros: 0, porMinuto: [] };
    let wp = 0, quieto = 0, ult = { ...pos() }, tMin = 0, nMin = 0, vidaAntes = g.vida;
    console.log(`%cPRUEBA DE RESISTENCIA: ${minutos} minutos de juego`, 'font-weight:bold;font-size:14px');
    for (let n = 0; n < total; n++) {
      const [tx, tz] = VUELTA[wp % VUELTA.length], p = pos(), dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 3) { wp++; r.destinos++; quieto = 0; }
      if (g.talk) { if (n % 20 === 0) E(); }
      else {
        g.cam.yaw = Math.atan2(-dx, -dz); g.keys[K.adelante] = true; g.keys[K.correr] = Math.floor(n / 900) % 3 !== 2; g.keys[K.saltar] = quieto > 0.7; // corre dos tramos de cada tres; salta si algo le estorba
        if (n % 240 === 120) { g.keys[K.adelante] = false; } // cada tanto se detiene un instante
        if (n % 300 === 0 && g.near && !g.near.person) E();
        if (n % 420 === 210 && $('prompt2').classList.contains('on') && !/Sentarse|palin/i.test($('prompt2-text').textContent)) R();
      }
      const t0 = performance.now();
      try { g.tick(1 / 60); } catch (err) { r.excepciones++; if (r.primeras.length < 5) r.primeras.push(`${err && err.message} · en (${Math.round(p.x)}, ${Math.round(p.z)}) · minuto ${R2(n / 3600)}`); }
      const ms = performance.now() - t0; r.cuadros++; r.ms += ms; tMin += ms; nMin++; if (ms > r.max) r.max = ms; if (ms > 16.7) r.sobre16ms++; if (ms > 50) r.sobre50ms++;
      const q = pos(), mv = Math.hypot(q.x - ult.x, q.z - ult.z); r.metros += mv < 5 ? mv : 0; quieto = mv < 0.004 && !g.talk && g.state === 'play' ? quieto + 1 / 60 : 0; ult = { x: q.x, z: q.z };
      if (!Number.isFinite(q.x + q.y + q.z)) { r.excepciones++; r.primeras.push(`La posición de Leftraru dejó de ser un número, minuto ${R2(n / 3600)}`); break; }
      if (quieto > 4) { r.trabado.push(`(${Math.round(q.x)}, ${Math.round(q.z)}) yendo a (${tx}, ${tz})`); g.tp(tx, alto(tx, tz) + 0.8, tz); quieto = 0; }
      if (g.vida > vidaAntes + 30 && vidaAntes < 5) r.desmayos++; vidaAntes = g.vida;
      if (n % 300 === 299) g.snap(); // de vez en cuando se pinta la imagen, como en el juego normal
      if (n % 3600 === 3599) { r.porMinuto.push(R2(tMin / nMin)); console.log(`  minuto ${Math.round((n + 1) / 3600)} de ${minutos} · ${R2(tMin / nMin)} ms por cuadro · ${Math.round(r.metros)} m recorridos · errores: ${r.excepciones}`); tMin = nMin = 0; }
      if (n % 600 === 599) await pausa();
    }
    for (const k of [K.adelante, K.correr, K.saltar]) g.keys[k] = false;
    r.msPorCuadro = R2(r.ms / Math.max(1, r.cuadros)); r.max = R2(r.max); r.metros = Math.round(r.metros); r.erroresDelJuego = errores.slice(e0); r.avisoDeError = $('aviso-error').classList.contains('on');
    r.ok = !r.excepciones && !r.erroresDelJuego.length && !r.avisoDeError;
    api.resultado = r; g.paused = pausado; corriendo = false;
    console.log(r.ok ? '%cResistencia: sin errores.' : '%cResistencia: HUBO ERRORES.', `color:${r.ok ? '#1e8449' : '#c0392b'};font-weight:bold`);
    console.log(`Promedio ${r.msPorCuadro} ms por cuadro, el más lento ${r.max} ms. Cuadros sobre 16,7 ms: ${r.sobre16ms}; sobre 50 ms: ${r.sobre50ms}. Recorrió ${r.metros} m, pasó por ${r.destinos} lugares, se trabó ${r.trabado.length} veces y se desmayó ${r.desmayos}.`);
    if (r.primeras.length) console.log('Primeros errores:', r.primeras);
    if (r.trabado.length) console.log('Lugares donde se trabó:', r.trabado);
    return r;
  }

  function borrarAvance() {
    if (!confirm('Esto borra el cuaderno, las misiones y todo el avance guardado en ESTE navegador y recarga la página. ¿Seguir?')) return;
    localStorage.removeItem('leftraru.tareas'); localStorage.removeItem('leftraru.cuaderno'); location.reload();
  }

  const api = { historia, resistencia, borrarAvance, resultado: null, errores, med, util: { avanzar, esperar, ir, hablar, accion, actor, E, R, cerca, paso } };
  window.__prueba = api;
  if (!window.__pruebaSinPartir) historia();
})();
