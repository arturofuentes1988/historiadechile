// Medidor de rendimiento: un recuadro chico que muestra cuánto le cuesta a este equipo dibujar el juego.
// Se enciende en Menú → Opciones («Medidor de rendimiento») o agregando ?medir a la dirección del juego.
// Sirve para probar en distintos computadores y saber qué conviene aligerar: si lo que demora es el
// procesador (preparar cada cuadro) o la tarjeta de video (pintarlo).
const num = (v, d = 1) => v.toFixed(d).replace('.', ',');

export function createMeter(renderer, { calidad = () => '', texturas = () => '' } = {}) {
  const gl = renderer.getContext(), timer = gl.getExtension('EXT_disjoint_timer_query_webgl2'), dbg = gl.getExtension('WEBGL_debug_renderer_info');
  // el nombre de la tarjeta, sin los datos técnicos que le agrega el navegador
  let card = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''; const m = card.match(/^ANGLE \([^,]*,\s*([^,]*)/); if (m) card = m[1];
  card = card.replace(/\s*\(0x[0-9a-f]+\)/i, '').replace(/\s*(Direct3D|OpenGL|Metal|Vulkan).*$/i, '').trim() || 'desconocida';

  const el = document.createElement('div'); el.id = 'medidor'; el.hidden = true;
  el.style.cssText = 'position:fixed;top:62px;right:16px;z-index:3;pointer-events:none;min-width:250px;padding:9px 13px 10px;background:#17130fd9;border-left:3px solid #c98a4b;color:#f1e4c4;font:13px/1.5 system-ui,sans-serif;text-shadow:0 1px 2px #000;';
  document.body.appendChild(el);
  const fila = (a, b) => `<div style="display:flex;justify-content:space-between;gap:16px"><span style="opacity:.75">${a}</span><b style="font-weight:600;font-variant-numeric:tabular-nums">${b}</b></div>`;

  let on = false, last = 0, t0 = 0, shown = 0, q = null, cuenta = false; const pend = []; // cuenta: ¿este cuadro entra en el promedio?
  const acc = { n: 0, frame: 0, worst: 0, cpu: 0, gpu: 0, gpuN: 0, calls: 0, tris: 0 }, zero = () => { for (const k in acc) acc[k] = 0; };

  function paint() {
    const n = acc.n, ms = acc.frame / n, fps = 1000 / ms, cpu = acc.cpu / n, gpu = acc.gpuN ? acc.gpu / acc.gpuN : null, cv = renderer.domElement;
    const uso = Math.min(100, Math.round((Math.max(cpu, gpu || 0) / ms) * 100)), quien = gpu === null ? '' : gpu > cpu ? 'la tarjeta de video' : 'el procesador';
    // Tres casos: va fluido; va lento porque el equipo no alcanza (y se dice qué es lo que más demora); o va a pocos cuadros
    // aunque al equipo le sobra tiempo, y entonces el freno está fuera del juego (el navegador, el ahorro de energía, la pantalla).
    const sobra = fps < 50 && gpu !== null && uso < 70, color = fps >= 50 ? '#9fd08a' : sobra ? '#f1e4c4' : fps >= 30 ? '#e9b03a' : '#e2674f';
    const frase = fps >= 50 ? `Va fluido: ocupa el ${uso} % de cada cuadro.`
      : sobra ? `Al equipo le sobra tiempo (ocupa el ${uso} %): los cuadros los está limitando algo fuera del juego, como el navegador o el ahorro de energía.`
        : `${fps >= 30 ? 'Va algo justo' : 'Va lento'}${quien || cpu / ms > 0.6 ? `: lo que más demora es ${quien || 'el procesador'}` : ': el procesador no es el problema, así que probablemente sea la tarjeta de video'}.`;
    el.innerHTML = `<div style="letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#c98a4b;margin-bottom:3px">Rendimiento</div>` +
      fila('Cuadros por segundo', `<span style="color:${color}">${Math.round(fps)}</span>`) +
      fila('Tiempo por cuadro', `${num(ms)} ms <span style="opacity:.6;font-weight:400">(peor ${num(acc.worst)})</span>`) +
      fila('Trabajo del procesador', `${num(cpu)} ms`) +
      fila('Trabajo de la tarjeta', gpu === null ? 'no se puede medir aquí' : `${num(gpu)} ms`) +
      fila('Triángulos', `${num(acc.tris / n / 1e6, 2)} millones`) +
      fila('Órdenes de dibujo', `${Math.round(acc.calls / n)}`) +
      fila('Imagen', `${cv.width} × ${cv.height}${calidad() === 'auto' ? ' (automática)' : ''}`) +
      (texturas() ? fila('Texturas', texturas()) : '') +
      fila('Tarjeta', card) +
      `<div style="margin-top:5px;padding-top:5px;border-top:1px solid #f1e4c433;color:${color};max-width:290px">${frase}</div>`;
    zero();
  }

  return {
    get on() { return on; },
    show(v) { v = !!v; if (v === on) return; on = v; el.hidden = !v; renderer.info.autoReset = !v; last = 0; zero(); if (v) el.textContent = 'Midiendo…'; },
    // al empezar el cuadro: cuánto pasó desde el anterior, y se echa a andar el reloj de la tarjeta
    begin() {
      if (!on) return; const now = performance.now();
      cuenta = last > 0 && now - last < 1000; // el primer cuadro y las pausas largas (la carga, la pestaña oculta) no cuentan
      if (cuenta) { const d = now - last; acc.frame += d; acc.n++; if (d > acc.worst) acc.worst = d; }
      last = t0 = now; renderer.info.reset();
      if (timer && !q) { q = gl.createQuery(); gl.beginQuery(timer.TIME_ELAPSED_EXT, q); }
    },
    // al terminar de dibujarlo: lo que tardó el procesador y cuánto se mandó a dibujar; lo de la tarjeta llega unos cuadros después
    end() {
      if (!on) return; const now = performance.now();
      if (cuenta) { acc.cpu += now - t0; acc.calls += renderer.info.render.calls; acc.tris += renderer.info.render.triangles; }
      if (q) { gl.endQuery(timer.TIME_ELAPSED_EXT); pend.push([q, cuenta]); q = null; }
      while (pend.length && gl.getQueryParameter(pend[0][0], gl.QUERY_RESULT_AVAILABLE)) { const [p, vale] = pend.shift(); if (vale && !gl.getParameter(timer.GPU_DISJOINT_EXT)) { acc.gpu += gl.getQueryParameter(p, gl.QUERY_RESULT) / 1e6; acc.gpuN++; } gl.deleteQuery(p); }
      while (pend.length > 40) gl.deleteQuery(pend.shift()[0]); // si el navegador nunca responde, no se acumulan
      if (acc.n && now - shown > 500) { shown = now; paint(); }
    },
  };
}
