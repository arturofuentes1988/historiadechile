import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { uTime, uPlayer, buildLights, createPost, assets, TEX_LIVIANAS, texLivianasPorDefecto } from './gfx.js';
import { buildWorld } from './world.js';
import { height, inBounds, POI, CERRO } from './terrain.js';
import { buildPerson, animatePerson, slopeAhead } from './life.js';
import { Cinematic } from './cinematic.js';
import { createUI } from './ui.js';
import { createExplorer, PERSON } from './explore.js';
import { TALK } from './notes.js';
import { riverZ, WATER_Y, zone, normalAt } from './terrain.js';
import { createSound } from './sonido.js';
import { createActions } from './acciones.js';
import { route } from './guia.js';
import { createMeter } from './medidor.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = (id) => document.getElementById(id);

await RAPIER.init();
const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const lights = buildLights(scene, renderer);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.2, 12000);
const post = createPost(renderer, scene, camera);
const draw = () => post.render();
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); post.resize(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// pantalla de carga: primero se arma el mundo, después llegan las texturas
const bar = (f, txt) => { if (!$('load-bar')) return; $('load-bar').style.width = `${Math.round(f * 100)}%`; $('load-text').textContent = txt; };
bar(0.12, 'Levantando el bosque…'); await new Promise((r) => setTimeout(r, 60));
const world = buildWorld(scene, RAPIER, physics);
physics.step(); // una sola vez: deja indexados todos los obstáculos fijos para las consultas (chocar, apoyar los pies, la cámara)
assets.onProgress = (l, t) => bar(0.3 + 0.7 * (l / t), `Cargando texturas… ${l} de ${t}`);
bar(0.3 + 0.7 * (assets.total ? assets.loaded / assets.total : 0), 'Cargando texturas…');

// ---------- Leftraru niño (personaje provisional, hecho de formas pintadas) ----------
const boy = buildPerson({ kind: 'boy', h: 1.38 }); scene.add(boy.g);
const START = [-6, -1];

const RAD = 0.3, HALF = 0.36, FEET = HALF + RAD;
// Leftraru es el único que se mueve entre los obstáculos fijos del mundo (terreno, árboles, rocas, rukas). Por eso
// no hace falta simular la física en cada cuadro: su colisionador se mueve a mano y el controlador de personaje
// calcula contra el mundo, que se indexa una sola vez (más abajo). Antes se reordenaban los miles de objetos fijos
// en cada cuadro: costaba varios milisegundos y, tras un buen rato de juego, ese paso podía fallar y congelar todo.
const pCol = physics.createCollider(RAPIER.ColliderDesc.capsule(HALF, RAD).setTranslation(START[0], height(...START) + FEET + 0.05, START[1]));
const setPos = (x, y, z) => { if (Number.isFinite(x + y + z)) pCol.setTranslation({ x, y, z }); }; // nunca se le pasa una posición inválida a la física
const ctrl = physics.createCharacterController(0.02);
ctrl.enableAutostep(0.3, 0.2, true); ctrl.setMaxSlopeClimbAngle(0.95); ctrl.setMinSlopeSlideAngle(1.0);

const player = { vy: 0, grounded: false, facing: 0.6, phase: 0, speed: 0 };
const cam = { yaw: 0.2, pitch: 0.2, dist: 5.4 };
const keys = {};
let state = 'title', got = 0, time = 0;

const cine = new Cinematic(camera);
const pp = () => pCol.translation();

// De la portada al juego. Primero solo el título y «haz clic»; después el menú (Aventura y Opciones). Al elegir
// Aventura aparece la pantalla del acto y, si la historia recién empieza, el prólogo —un aviso antiguo cuya tinta va
// apareciendo— y dos planos que llevan del relato al juego. Si ya habías empezado, del acto se pasa directo al juego.
let coverT = 0, prologo = false, acto = false, actoT = 0, prologoT = [];
const TACTIL = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; // celular o tableta, sin ratón
const fuera = () => state === 'title' || prologo || acto; // todavía no se está en el mundo
$('c-toca').textContent = TACTIL ? 'Toca la pantalla para comenzar' : 'Haz clic para comenzar';
function portadaMenu() { if (!$('cover-1').hidden) return; coverT = performance.now(); $('c-toca').hidden = true; $('cover-1').hidden = false; $('title').classList.add('menu'); }
function enter() {
  if (state !== 'title' || $('cover-1').hidden || performance.now() - coverT < 250) return;
  setMenu(false); $('title').classList.add('hide');
  if (!document.fullscreenElement) { try { document.documentElement.requestFullscreen?.()?.catch?.(() => {}); } catch { /* el navegador no lo permitió */ } }
  lock();
  state = 'cine'; acto = true; coverT = performance.now(); $('acto').classList.add('on'); actoT = setTimeout(cerrarActo, 4600); // la pantalla del acto se va sola; un clic o Enter la adelantan
}
function cerrarActo() {
  if (!acto) return; acto = false; clearTimeout(actoT); $('acto').classList.remove('on');
  if (acc.f.m1 || acc.f.tu) play(); else abrirPrologo();
}
$('acto').addEventListener('click', () => { if (performance.now() - coverT > 500) cerrarActo(); });
function play() {
  state = 'play'; document.body.classList.add('playing'); $('hud').classList.add('on'); lock();
  if (!ui.has('leftraru')) { const t = pp(); ui.discover('leftraru', photo({ x: t.x, y: t.y + 0.25, z: t.z }, { dist: 2.3, up: 0.2, fov: 40, self: true })); }
}
// Prólogo: un aviso antiguo, con la aldea a oscuras detrás. La tinta va apareciendo párrafo a párrafo, al ritmo en que
// se lee. Un clic (o Enter) muestra todo de una vez; con todo a la vista, otro clic sigue con la historia.
function abrirPrologo() {
  state = 'cine'; prologo = true; const el = $('prologo'), ps = [...el.querySelectorAll('.papel p')];
  ps.forEach((q) => q.classList.remove('ya')); el.classList.remove('listo'); $('prologo-sigue').textContent = TACTIL ? 'Toca para ver todo' : 'Clic o Enter · ver todo'; el.classList.add('on');
  let t = 1300; prologoT = ps.map((q) => { const id = setTimeout(() => { q.classList.add('ya'); snd.play('tinta', 0.32, 0.92 + Math.random() * 0.16); }, t); t += 800 + q.textContent.split(/\s+/).length * 175; return id; });
  prologoT.push(setTimeout(prologoListo, t));
}
function prologoListo() { const el = $('prologo'); prologoT.forEach(clearTimeout); el.querySelectorAll('.papel p').forEach((q) => q.classList.add('ya')); el.classList.add('listo'); $('prologo-sigue').textContent = TACTIL ? 'Toca para continuar' : 'Haz clic para continuar'; }
function avanzarPrologo() { if (!prologo) return; if ($('prologo').classList.contains('listo')) cerrarPrologo(); else prologoListo(); }
function cerrarPrologo() { if (!prologo) return; prologo = false; prologoT.forEach(clearTimeout); $('prologo').classList.remove('on'); intro(); }
$('prologo').addEventListener('click', avanzarPrologo);
// Del relato al juego: Leftraru, y su madre que lo llama.
function intro() {
  state = 'cine';
  const G = (x, y, z) => V3(x, height(x, z) + y, z), b = pp(), fx = Math.sin(player.facing), fz = Math.cos(player.facing), eye = V3(b.x, b.y - FEET + 1.02, b.z);
  const front = (d, side, up) => V3(b.x + fx * d + fz * side, b.y - FEET + up, b.z + fz * d - fx * side);
  cine.play([
    { dur: 5.5, from: front(3.6, 0.9, 1.35), to: front(2.2, 0.4, 1.1), lookFrom: eye, text: 'Leftraru.' },
    { dur: 6.5, from: G(-6.7, 1.75, -1.9), to: G(-7.9, 1.45, -3.5), lookFrom: G(-9.9, 1.15, -5.1), who: 'Millaray', text: '¡Leftraru! Ven acá, que te necesito.' },
  ], play);
}

// ---------- opciones (se guardan en este navegador) ----------
const snd = createSound();
const opts = Object.assign({ calidad: 'auto', detalle: '1', sens: 1, inv: false, mini: true, medidor: false, texLivianas: texLivianasPorDefecto, musica: 0.6, efectos: 0.7 }, JSON.parse(localStorage.getItem('leftraru.opciones') || '{}')); snd.volume = opts.efectos;
// medidor de rendimiento: se enciende en Opciones, o con ?medir en la dirección (para probar en otro equipo sin entrar al menú)
const medidor = createMeter(renderer, { calidad: () => opts.calidad, texturas: () => (TEX_LIVIANAS ? 'livianas' : 'nítidas') }), MEDIR = new URLSearchParams(location.search).has('medir');
// teclas: cada acción tiene una tecla que se puede cambiar en Menú → Controles
const ACTIONS = [['adelante', 'Adelante', 'KeyW'], ['atras', 'Atrás', 'KeyS'], ['izquierda', 'Izquierda', 'KeyA'], ['derecha', 'Derecha', 'KeyD'], ['correr', 'Correr', 'ShiftLeft'], ['saltar', 'Saltar', 'Space'],
  ['observar', 'Observar o hablar', 'KeyE'], ['accion', 'Recoger, usar, hacer', 'KeyR'], ['camIzq', 'Girar a la izquierda', 'KeyZ'], ['camDer', 'Girar a la derecha', 'KeyC'], ['cuaderno', 'Cuaderno', 'KeyN'], ['misiones', 'Misiones', 'KeyJ'], ['saberes', 'Saberes', 'KeyK'],
  ['bolsa', 'Bolsa', 'KeyB'], ['mapa', 'Mapa', 'KeyM'], ['pantalla', 'Pantalla completa', 'KeyF'], ['menu', 'Menú', 'KeyP']];
opts.keys = Object.assign(Object.fromEntries(ACTIONS.map(([a, , k]) => [a, k])), opts.keys || {});
const down = (a) => !!keys[opts.keys[a]], is = (e, a) => e.code === opts.keys[a];
const keyName = (c) => ({ Space: 'Espacio', ShiftLeft: 'Shift izq.', ShiftRight: 'Shift der.', ControlLeft: 'Ctrl izq.', ControlRight: 'Ctrl der.', AltLeft: 'Alt izq.', AltRight: 'Alt der.', Tab: 'Tab', Enter: 'Enter', Backspace: 'Retroceso', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[c] || c.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num '));
let rebinding = null;
const GROUPS = [['Movimiento', ['adelante', 'atras', 'izquierda', 'derecha', 'correr', 'saltar']], ['Acción y cámara', ['observar', 'accion', 'camIzq', 'camDer']], ['Paneles', ['cuaderno', 'misiones', 'saberes', 'bolsa', 'mapa']], ['Juego', ['pantalla', 'menu']]];
function drawKeys() {
  const label = Object.fromEntries(ACTIONS.map(([a, l]) => [a, l]));
  $('ctl-list').innerHTML = GROUPS.map(([g, list]) => `<section><h4>${g}</h4>${list.map((a) => `<div class="krow"><span>${label[a]}</span><button class="kcap${rebinding === a ? ' wait' : ''}" data-act="${a}">${rebinding === a ? '…' : keyName(opts.keys[a])}</button></div>`).join('')}</section>`).join('');
  $('ctl-hint').textContent = rebinding ? `Pulsa la tecla nueva para «${label[rebinding]}». Escape cancela.` : 'Haz clic en una tecla para cambiarla.';
  document.querySelectorAll('[data-key]').forEach((el) => { el.textContent = keyName(opts.keys[el.dataset.key]); });
}
let page = 'opciones';
function menuPage(pg) { rebinding = null; page = pg; $('pg-opciones').hidden = pg !== 'opciones'; $('pg-controles').hidden = pg !== 'controles'; if (pg === 'controles') drawKeys(); }
const detalleInicial = opts.detalle;
let menuOpen = false, pr = Math.min(devicePixelRatio, 1.5);
function applyOpts() {
  pr = opts.calidad === 'auto' ? Math.min(devicePixelRatio, 1.5) : Math.min(parseFloat(opts.calidad), Math.max(1, devicePixelRatio));
  renderer.setPixelRatio(pr); post.resize(); document.body.classList.toggle('nomini', !opts.mini); medidor.show(opts.medidor || MEDIR);
  $('o-reload').hidden = opts.detalle === detalleInicial; $('o-reload-tex').hidden = opts.texLivianas === TEX_LIVIANAS; // las texturas se eligen al cargar: si la opción ya no calza con lo cargado, falta recargar
  localStorage.setItem('leftraru.opciones', JSON.stringify(opts));
}
function setMenu(on) {
  if (on !== menuOpen) snd.play(on ? 'ui-menu' : 'ui-volver', 0.45);
  menuOpen = on; menuPage('opciones'); $('menu').classList.toggle('on', on); document.body.classList.toggle('en-portada', state === 'title');
  if (on) { ui.show(null); document.exitPointerLock?.(); for (const k in keys) keys[k] = false; } else if (state === 'play') lock();
}
$('o-calidad').value = opts.calidad; $('o-detalle').value = opts.detalle; $('o-sens').value = opts.sens; $('o-inv').checked = opts.inv; $('o-mini').checked = opts.mini;
$('o-calidad').onchange = (e) => { opts.calidad = e.target.value; applyOpts(); };
$('o-efectos').value = opts.efectos; $('o-efectos').oninput = (e) => { opts.efectos = +e.target.value; snd.volume = opts.efectos; applyOpts(); };
$('o-musica').value = opts.musica; $('o-musica').oninput = (e) => { opts.musica = +e.target.value; applyOpts(); };
$('o-detalle').onchange = (e) => { opts.detalle = e.target.value; applyOpts(); };
$('o-sens').oninput = (e) => { opts.sens = parseFloat(e.target.value); applyOpts(); };
$('o-inv').onchange = (e) => { opts.inv = e.target.checked; applyOpts(); };
$('o-mini').onchange = (e) => { opts.mini = e.target.checked; applyOpts(); };
$('o-medidor').checked = opts.medidor; $('o-medidor').onchange = (e) => { opts.medidor = e.target.checked; applyOpts(); };
$('o-tex').checked = opts.texLivianas; $('o-tex').onchange = (e) => { opts.texLivianas = e.target.checked; applyOpts(); }; $('o-recargar-tex').onclick = () => location.reload();
$('o-recargar').onclick = () => location.reload();
$('m-portada').onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* nada */ } location.reload(); }; // salir del juego: vuelve a la portada
$('m-continuar').onclick = () => setMenu(false);
$('o-borrar').onclick = () => { if (confirm('¿Borrar todo lo descubierto en el cuaderno?')) { ui.reset(); acc.reset(); location.reload(); } };
$('btn-menu').onclick = () => setMenu(!menuOpen);
$('o-controles').onclick = () => menuPage('controles'); $('ctl-volver').onclick = () => menuPage('opciones');
$('ctl-reset').onclick = () => { for (const [a, , k] of ACTIONS) opts.keys[a] = k; applyOpts(); drawKeys(); };
$('ctl-list').onclick = (e) => { const b = e.target.closest('[data-act]'); if (b) { rebinding = b.dataset.act; drawKeys(); } };
$('title').addEventListener('click', portadaMenu); $('c-aventura').onclick = enter; $('c-opciones').onclick = () => setMenu(true);
// pantalla completa
const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => hint('Este navegador no permitió la pantalla completa', 4)); };
$('btn-full').onclick = toggleFull; $('o-full').onchange = toggleFull;
// En pantalla completa se le pide al navegador que Escape llegue al juego en vez de sacarte de ella
// (funciona en Chrome y Edge; en otros navegadores Escape sigue saliendo de la pantalla completa).
document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; try { if (on) navigator.keyboard?.lock?.(['Escape'])?.catch?.(() => {}); else navigator.keyboard?.unlock?.(); } catch { /* sin soporte */ } if (on && state === 'play' && !menuOpen && !ui.open) lock(); $('o-full').checked = on; $('btn-full').classList.toggle('on', on); $('btn-full').title = on ? 'Salir de pantalla completa' : 'Pantalla completa'; });
if (!document.documentElement.requestFullscreen) { $('btn-full').style.display = 'none'; $('o-full').parentElement.style.display = 'none'; }
// El ratón nunca queda atrapado: el puntero siempre se ve y se puede hacer clic en cualquier botón sin salir del juego.
// La cámara se gira arrastrando con un botón apretado sobre el juego (o con sus teclas); la rueda acerca y aleja.
let dragging = false;
function lock() { /* ya no se captura el ratón */ }
const locked = () => false;
document.body.classList.add('sin-raton'); // deja a la vista la ayuda de cómo girar, hasta que se arrastra por primera vez
renderer.domElement.addEventListener('mousedown', (e) => { if (state !== 'play') return; dragging = true; document.body.classList.add('girando'); e.preventDefault(); });
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mouseup', () => { dragging = false; document.body.classList.remove('girando'); });
renderer.domElement.addEventListener('wheel', (e) => { if (state === 'play' && !focus) cam.dist = Math.min(9, Math.max(2.6, cam.dist + Math.sign(e.deltaY) * 0.6)); }, { passive: true });

// ---------- fotos para el cuaderno: se toman del elemento real, en el momento de descubrirlo ----------
const shot = document.createElement('canvas'); shot.width = 480; shot.height = 300;
function grab() { const c = shot.getContext('2d'), el = renderer.domElement, sw = Math.min(el.width, el.height * 1.6), sh = sw / 1.6; c.drawImage(el, (el.width - sw) / 2, (el.height - sh) / 2, sw, sh, 0, 0, 480, 300); return shot.toDataURL('image/jpeg', 0.72); }
function withCamera(place) { // dibuja una vista aparte, la copia y deja todo como estaba, sin que se note en pantalla
  const sp = camera.position.clone(), sq = camera.quaternion.clone(), sf = camera.fov; place();
  camera.updateProjectionMatrix(); world.update(0, time, camera.position, pp()); draw(); const img = grab();
  boy.g.visible = true; camera.position.copy(sp); camera.quaternion.copy(sq); camera.fov = sf; camera.updateProjectionMatrix(); world.update(0, time, camera.position, pp()); draw(); return img;
}
function photo(target, { dist = 4, up = 1, fov = 45, fromPlayer = false, self = false } = {}) {
  return withCamera(() => {
    const t = pp(); camera.fov = fov; boy.g.visible = self;
    if (fromPlayer) camera.position.set(t.x, t.y + 1, t.z);
    else { let dx = t.x - target.x, dz = t.z - target.z; if (self) { dx = Math.sin(player.facing); dz = Math.cos(player.facing); } const l = Math.hypot(dx, dz) || 1; camera.position.set(target.x + dx / l * dist, target.y + up, target.z + dz / l * dist); camera.position.y = Math.max(camera.position.y, height(camera.position.x, camera.position.z) + 0.5); }
    camera.lookAt(target.x, target.y, target.z);
  });
}
const top = () => V3(CERRO[0], height(...CERRO) + 4, CERRO[1]);
const VIEWS = { // vistas fijas para lo que no es un objeto al alcance de la mano
  pillan: () => [top(), world.volcano, 22], lafken: () => [top(), V3(-3000, -40, CERRO[1] + 300), 40],
  trengtreng: () => [V3(24, 12, 14), top(), 30], ngen: () => [V3(POI.viejo.x + 16, height(POI.viejo.x + 16, POI.viejo.z + 12) + 2.2, POI.viejo.z + 12), V3(POI.viejo.x, height(POI.viejo.x, POI.viejo.z) + 9, POI.viejo.z), 60],
  pewma: () => [V3(4.5, 3.4, 4.5), V3(0, 2.7, 0), 38], wetripantu: () => [V3(4, 1.2, riverZ(4) - 15), V3(160, 26, riverZ(160) - 40), 50],
  'pewen-sagrado': () => [V3(2, height(2, -72) + 1.8, -72), V3(0, height(0, -92) + 15, -92), 60], incas: () => [V3(-2, 7, -24), V3(0, 6, -140), 50],
  palin: () => [V3(POI.cancha.x + 15, 6, POI.cancha.z + 11), V3(POI.cancha.x, 2.5, POI.cancha.z), 50],
};
const viewPhoto = (id) => withCamera(() => { const [from, look, fov] = VIEWS[id](); boy.g.visible = false; camera.position.copy(from); camera.fov = fov; camera.lookAt(look); });
const herePhoto = () => { draw(); return grab(); };

// ---------- observar y conversar (tecla E) ----------
let near = null, scanT = 0, talk = null, misT = 0, lastAviso = null, still = 0;
function applySkills() { explorer.reach = ui.skill('vista') ? 1.7 : 1; world.life.shyR = ui.skill('pudu') ? 3.5 : 9; }
function say() { snd.play('hablar-sigue', 0.4, 0.96 + Math.random() * 0.08); document.body.classList.add('talking'); const t = talk; $('dlg-name').textContent = t.name; $('dlg-text').textContent = t.lines[t.i]; $('dlg-more').textContent = `${keyName(opts.keys.observar)} · ${t.i < t.lines.length - 1 ? 'seguir' : 'cerrar'}`; $('dialogo').classList.add('on'); }
function interact() {
  if (talk) { if (++talk.i < talk.lines.length) return say(); const t = talk; talk = null; $('dialogo').classList.remove('on'); document.body.classList.remove('talking'); snd.play('hablar-fin', 0.3); if (t.done) t.done(); return; }
  if (!near || state !== 'play' || ui.open || focus) return;
  const c = near; near = null; $('prompt').classList.remove('on');
  if (c.person) {
    const d = TALK[c.id], a = c.person; if (a.mode !== 'cook') a.face = Math.atan2(pp().x - a.x, pp().z - a.z); player.facing = Math.atan2(a.x - pp().x, a.z - pp().z);
    // La primera vez, la persona se presenta (y queda en el cuaderno). Si la historia sigue con ella, se presenta con eso mismo.
    const q = acc.talk(c.id), first = !c.known, story = q && (c.known || q.main) ? q : null;
    const meet = first ? () => { ui.discover(c.id, photo(c.target, c.shot)); for (const id of d.da) ui.discover(id, VIEWS[id] ? viewPhoto(id) : ''); } : null;
    talk = { name: d.name, lines: story ? story.lines : first ? d.lines : [d.again], i: 0, done: () => { if (meet) meet(); if (story && story.done) story.done(); } }; say();
  } else { snd.play('hablar-sigue', 0.4, 0.96 + Math.random() * 0.08); if (c.shot.view) ui.discover(c.id, viewPhoto(c.shot.view)); else startFocus(c); } // el mismo toque que al pasar una línea de diálogo
}
$('dialogo').addEventListener('click', () => interact());


// Escenas dentro del juego: se quita la interfaz, corre la lista de planos y se vuelve a jugar
function playScene(shots, after) {
  setMenu(false); state = 'cine'; ui.show(null); document.body.classList.remove('playing'); $('hud').classList.remove('on');
  near = doable = null; for (const id of ['prompt', 'prompt2', 'hint', 'ayuda']) $(id).classList.remove('on'); // nada de la interfaz queda encima de la escena
  cine.play(shots, () => { state = 'play'; document.body.classList.add('playing'); $('hud').classList.add('on'); lock(); if (after) after(); });
}
// Al recoger el último piñón: Leftraru agradece al pewen y, en la aldea, su madre lo espera. (Se muestra cuando ya pisa el suelo.)
let outroPend = false;
function outro() {
  const b = pp(), fx = Math.sin(player.facing), fz = Math.cos(player.facing), eye = V3(b.x, b.y - FEET + 1.0, b.z);
  const front = (d, side, up) => V3(b.x + fx * d + fz * side, b.y - FEET + up, b.z + fz * d - fx * side);
  // En la aldea, Millaray ya está junto al fogón revolviendo la olla, que humea. La cámara la mira de frente y se le acerca.
  acc.madreCocina(true); const ma = world.life.actors.find((a) => a.name === 'Millaray'), ax = Math.sin(ma.face), az = Math.cos(ma.face), ox = ma.x + ax * 0.55, oz = ma.z + az * 0.55, oy = height(ox, oz);
  const K = (ade, lado, up) => V3(ox + ax * ade + az * lado, oy + up, oz + az * ade - ax * lado); // medido desde la olla: hacia donde mira ella, hacia el lado del fuego y hacia arriba
  playScene([
    { dur: 7, from: front(2.7, -1.3, 0.95), to: front(2.1, 1.1, 1.2), lookFrom: eye, text: 'El último piñón. Leftraru le da las gracias al pewen: se llevó lo que el árbol dejó caer, y nada más.' },
    { dur: 8, fov: 40, from: K(4.1, -1.4, 1.8), to: K(3.4, -0.9, 1.5), lookFrom: K(-0.1, 0.15, 0.7), text: 'En la aldea, su madre ya puso el agua al fuego. Es hora de volver.' },
  ]);
}
// Momentos de la historia que piden una escena. 'cima': lo que el padre le muestra desde el cerro Treng Treng.
// Los dos se paran juntos en el borde de la cima y se los ve de espaldas, con lo que miran al frente:
// primero el valle y el mar, después el volcán; al final, de frente, cuando le explica su nombre.
function story(kind, after) {
  if (kind !== 'cima') return;
  const pa = world.life.actors.find((a) => a.name === 'Curiñancu'), sx = pa.x, sz = pa.z, sy = height(sx, sz), vol = world.volcano;
  const unit = (x, z) => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; }, dV = unit(vol.x - sx, vol.z - sz), dA = unit(-sx, -sz); // hacia el volcán y hacia la aldea
  const lx = sx - dV[1] * 0.95, lz = sz + dV[0] * 0.95, mx = (sx + lx) / 2, mz = (sz + lz) / 2; // el lugar de Leftraru, hombro con hombro con su padre, y el punto medio entre los dos
  const mira = ([dx, dz]) => () => { const f = Math.atan2(dx, dz); setPos(lx, height(lx, lz) + FEET + 0.05, lz); player.vy = 0; player.speed = 0; player.facing = f; pa.face = f; pa.quieto = true; }; // los dos miran hacia (dx, dz)
  const back = ([dx, dz], d, up) => V3(mx - dx * d, sy + up, mz - dz * d); // detrás de ellos, entre los dos
  // el traro: que esté volando desde el comienzo, para que al mostrarlo ya vaya planeando sobre el cerro
  const tr = world.life.birds.find((b) => b.type === 'traro'), vuela = () => { const g = tr.grp; if (g.st !== 'fly') { g.st = 'fly'; g.tm = 0; } g.dur = 90; };
  // la cámara lo acompaña por fuera de su vuelta y desde arriba: se lo ve de cerca, con la cima y los dos allá abajo
  const conTraro = (camera) => { const o = tr.g.position, fx = Math.sin(tr.yaw), fz = Math.cos(tr.yaw); camera.position.set(o.x + fx * 1.3 + fz * 2.4, o.y + 1.8, o.z + fz * 1.3 - fx * 2.4); camera.lookAt(o.x + fx * 0.35, o.y - 0.05, o.z + fz * 0.35); };
  const aldea = V3(0, 3, 0);
  const escena = () => playScene([
    // la aldea: la cámara parte detrás de los dos y se eleva por sobre el bosque, hasta que el claro, las rukas y su humo quedan a la vista
    { dur: 11, fov: 38, on: () => { mira(dA)(); vuela(); }, from: V3(mx - dA[0] * 8, sy + 3.2, mz - dA[1] * 8), to: V3(mx + dA[0] * 46, sy + 58, mz + dA[1] * 46), lookFrom: aldea, who: 'Curiñancu', text: 'Mira. Hacia donde se esconde el sol está el lafken, el mar. Y allá abajo, el humo de nuestras rukas.' },
    { dur: 9, on: mira(dV), from: back(dV, 7.2, 2.75), to: back(dV, 5.6, 2.4), lookFrom: V3(vol.x, 140, vol.z), lookTo: V3(vol.x, 185, vol.z), who: 'Curiñancu', text: 'Hacia donde nace, el volcán, la casa del pillán. Todo lo que hay entre uno y otro es tu mundo.' },
    { dur: 9, cam: conTraro, fov: 34, who: 'Curiñancu', text: '¿Ves al traro, dando vueltas sobre el cerro? Mira mucho antes de bajar, y cuando baja, no falla.' },
    { dur: 7, from: back(dV, -3.0, 1.25), to: back(dV, -2.3, 1.2), lookFrom: V3(mx, sy + 1.25, mz), who: 'Curiñancu', text: 'Por él te llamas Leftraru: traro veloz.' },
  ], after);
  // Primero Leftraru camina solo hasta ponerse al lado de su padre, mirando hacia donde mira él; recién entonces empieza la escena.
  pa.quieto = true; pa.face = Math.atan2(dV[0], dV[1]);
  auto = { x: lx, z: lz, face: Math.atan2(dV[0], dV[1]), done: escena };
}
// Lo que alguien dice al pasar, sin detener el juego (el padre mientras suben al cerro): aparece abajo unos segundos.
let subT = 0;
function murmur(name, text, secs = 7) { $('sub-name').textContent = name; $('sub-text').textContent = text; const s = $('sub'); s.classList.remove('relato'); s.classList.add('on'); subT = secs; snd.play('hablar-sigue', 0.35, 0.9); }
// Mensajes. Arriba al centro van los de la historia (misiones y encargos, con letra grande) y las ayudas del momento;
// los puntos de investigación que se van ganando aparecen aparte, chicos, a la izquierda, sobre el minimapa.
// hint lo muestra de inmediato; los avisos que llegan juntos hacen fila para que cada uno alcance a leerse.
let hintT = 0, toastGap = 0, apunteGap = 0; const toasts = [], apuntes = [], vistos = [], GRANDE = ['mision', 'encargo', 'logro'];
function showHint(txt, secs, grande = false) { const h = $('hint'); h.textContent = txt; h.classList.toggle('grande', grande); h.classList.add('on'); hintT = secs; toastGap = Math.min(secs, 2.8); }
function hint(txt, secs) { if (toasts.length) toasts.push([txt, secs]); else showHint(txt, secs); }
function toast(txt, secs = 5, sound = null, grande = GRANDE.includes(sound)) { if (sound === 'hallazgo' || sound === 'foto') apuntes.push([txt, sound]); else toasts.push([txt, secs, sound, grande]); } // sound: qué toque lo acompaña
// Las instrucciones de cómo jugar (qué tecla hace qué, y los pasos del tutorial) van aparte: al centro de la pantalla,
// en letra blanca y sin recuadro, para que no se confundan con los avisos de misión ni con los puntos.
let ayudaT = 0, ayudaGap = 0; const ayudas = [];
const teclasHTML = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\{(\w+)\}/g, (_, a) => `<kbd>${keyName(opts.keys[a] || a)}</kbd>`); // {observar} → la tecla, dibujada como tecla
function showAyuda(txt, secs) { // va en una sola línea si cabe en el espacio libre del centro (sin meterse sobre el panel de estado); si no, se reparte en dos o tres
  const el = $('ayuda'); el.innerHTML = teclasHTML(txt.replace(/^\?/, '')); el.classList.remove('larga'); if (el.offsetWidth > Math.max(300, innerWidth - 2 * (Math.min(390, innerWidth * 0.4) + 32))) el.classList.add('larga');
  el.classList.add('on'); ayudaT = secs; ayudaGap = 5;
}
function apunte(txt, sound) { // un renglón sobre el minimapa, que se va solo a los pocos segundos
  const el = document.createElement('div'); el.className = 'ap'; el.textContent = txt; $('apuntes').appendChild(el); vistos.push({ el, t: 5.5 });
  while (vistos.length > 4) vistos.shift().el.remove();
  if (TOQUE[sound]) snd.play(...TOQUE[sound]);
}
// cada tipo de aviso suena distinto: algo nuevo en el cuaderno, un encargo o una misión por hacer, algo logrado
const TOQUE = { hallazgo: ['ui-hallazgo', 0.45], encargo: ['ui-mision', 0.5], mision: ['ui-mision', 0.5], logro: ['ui-logro', 0.5], foto: ['ui-cuaderno', 0.5] };
const teclas = (s) => s.replace(/\{(\w+)\}/g, (_, a) => keyName(opts.keys[a] || a)); // {observar} → la tecla que tenga esa acción

addEventListener('keydown', (e) => {
  if (rebinding) { // se está eligiendo una tecla nueva para una acción
    e.preventDefault();
    if (e.code !== 'Escape') { const old = opts.keys[rebinding]; for (const a in opts.keys) if (opts.keys[a] === e.code) opts.keys[a] = old; opts.keys[rebinding] = e.code; applyOpts(); } // si ya estaba en uso, se intercambian
    rebinding = null; drawKeys(); return;
  }
  if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat && state === 'title' && !menuOpen && $('cover-1').hidden) { portadaMenu(); e.preventDefault(); return; } // en la portada, cualquiera de las dos sirve de «clic»
  if (e.code === 'Enter' && !e.repeat) { if (state === 'title') { if (!menuOpen) enter(); } else if (acto) { if (performance.now() - coverT > 500) cerrarActo(); } else if (prologo) avanzarPrologo(); else if (!talk) cine.skip(); }
  if (is(e, 'pantalla') && !e.repeat) toggleFull();
  if (is(e, 'menu') && !e.repeat && state !== 'cine') { if (ui.open) ui.show(null); setMenu(!menuOpen); return; }
  if (menuOpen) { if (e.code === 'Escape') { if (page === 'controles') menuPage('opciones'); else setMenu(false); } return; }
  keys[e.code] = true;
  if (is(e, 'observar') && !e.repeat) interact();
  if (is(e, 'accion') && !e.repeat && !talk && !ui.open && !focus && state === 'play' && doable) { const a = doable; doable = null; $('prompt2').classList.remove('on'); a.run(); }
  if (talk) { if (e.code === 'Enter' || e.code === 'Space') interact(); return; }
  if (state === 'play') for (const pn of ['cuaderno', 'misiones', 'saberes', 'bolsa', 'mapa']) if (is(e, pn)) { snd.play('ui-cuaderno', 0.6); ui.show(pn === 'cuaderno' ? 'notas' : pn); }
  if (e.code === 'Escape') { if (ui.open) ui.show(null); else if (state !== 'cine') setMenu(true); }
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
// Si la ventana pierde el foco con una tecla apretada, el navegador nunca avisa que se soltó y Leftraru seguiría
// caminando solo. Al salir de la ventana se sueltan todas, y también el arrastre de la cámara.
const sueltaTodo = () => { for (const k in keys) keys[k] = false; dragging = false; document.body.classList.remove('girando'); };
addEventListener('blur', sueltaTodo); document.addEventListener('visibilitychange', sueltaTodo);
addEventListener('mousemove', (e) => {
  if (dragging && !e.buttons) { dragging = false; document.body.classList.remove('girando'); } // el botón se soltó fuera de la ventana
  if (focus || (!locked() && !(dragging && state === 'play'))) return;
  document.body.classList.remove('sin-raton');
  cam.yaw -= e.movementX * 0.0042 * opts.sens; cam.pitch = Math.min(1.2, Math.max(-0.25, cam.pitch + e.movementY * 0.0032 * opts.sens * (opts.inv ? -1 : 1)));
});

let doable = null, actT = 0;
const ripples = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xeaf4f4, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.renderOrder = 4; scene.add(m); return m; });
let ripT = 0, ripI = 0;
// Cuando la historia lo pide, Leftraru camina solo hasta un punto: { x, z, face, done }. Al llegar se gira hacia face y se llama done.
let auto = null;
function updatePlayer(dt) {
  let ix = 0, iz = 0, andar = null;
  if (auto && state === 'play') {
    const q = pp(), ax = auto.x - q.x, az = auto.z - q.z, ad = Math.hypot(ax, az); auto.t = (auto.t || 0) + dt;
    if (ad > 0.14 && auto.t < 6) andar = [ax / ad, az / ad, Math.min(2.3, 0.6 + ad * 2.5)]; // hacia allá, frenando al acercarse
    else { if (ad > 0.14) setPos(auto.x, height(auto.x, auto.z) + FEET + 0.05, auto.z); // si algo le estorbó, igual queda en su lugar
      let d = auto.face - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); player.facing += d * Math.min(1, dt * 7);
      if (Math.abs(d) < 0.06 || auto.t > 8) { const fin = auto.done; auto = null; fin(); } }
  } else if (state === 'play' && !ui.open && !talk && !focus && !acc.busy && desmayo <= 0) {
    ix = (down('derecha') || keys.ArrowRight ? 1 : 0) - (down('izquierda') || keys.ArrowLeft ? 1 : 0);
    iz = (down('adelante') || keys.ArrowUp ? 1 : 0) - (down('atras') || keys.ArrowDown ? 1 : 0);
    cam.yaw += ((down('camIzq') ? 1 : 0) - (down('camDer') ? 1 : 0)) * dt * 1.8;
  }
  const wade = Math.min(1, Math.max(0, (WATER_Y - (pp().y - FEET)) / 0.8)); player.wade = wade; // con el agua a las rodillas se avanza más lento
  const run = down('correr'), target = andar ? andar[2] : (ix || iz ? (run ? 6.2 * (ui.skill('ligero') ? 1.18 : 1) : 3.3) : 0) * (1 - wade * 0.5);
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; if (andar) { dx = andar[0]; dz = andar[1]; } const l = Math.hypot(dx, dz);
  if (l > 0) { dx /= l; dz /= l; player.dirX = dx; player.dirZ = dz; let d = Math.atan2(dx, dz) - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); player.facing += d * Math.min(1, dt * 12); }
  if (acc.sitting && (ix || iz || down('saltar'))) acc.stand(); // cualquier movimiento lo hace levantarse
  // La mirada: Leftraru mira hacia donde mira la cámara. Primero vuelve la cabeza (y un poco los hombros); si la vista
  // pasa más allá de su costado, se da vuelta entero con pasitos en el lugar, hasta quedar otra vez de frente a lo que miras.
  { const libre = state === 'play' && !talk && !focus && !acc.sitting && !auto && desmayo <= 0;
    let d = cam.yaw + Math.PI - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (libre && l === 0 && player.grounded) {
      if (Math.abs(d) > 1.15) player.girando = true; else if (Math.abs(d) < 0.22) player.girando = false; // una vez que empieza a girar, sigue hasta quedar casi de frente
      if (player.girando) { const paso = Math.sign(d) * Math.min(Math.abs(d), dt * 3.4); player.facing += paso; d -= paso; }
    } else player.girando = false;
    const yaw = libre ? Math.max(-1.15, Math.min(1.15, d)) * Math.max(0, 1 - player.speed / 3) : 0, pit = libre ? Math.max(-0.2, Math.min(0.36, (cam.pitch - 0.2) * 0.45)) : 0;
    player.miraY = (player.miraY || 0) + (yaw - (player.miraY || 0)) * Math.min(1, dt * 6); player.miraX = (player.miraX || 0) + (pit - (player.miraX || 0)) * Math.min(1, dt * 6); }
  if (player.grounded && state === 'play' && !ui.open && !talk && !focus && !acc.sitting && !auto && down('saltar')) { player.vy = 6.6 * (ui.skill('salto') ? 1.22 : 1); player.grounded = false; }
  player.vy = Math.max(-25, player.vy - 18 * dt);
  if (player.vy > 0) ctrl.disableSnapToGround(); else ctrl.enableSnapToGround(0.3);
  const mvx = (player.dirX || 0) * player.speed * dt, mvz = (player.dirZ || 0) * player.speed * dt;
  ctrl.computeColliderMovement(pCol, { x: mvx, y: player.vy * dt, z: mvz });
  const m = ctrl.computedMovement(), p = pp();
  player.grounded = ctrl.computedGrounded();
  if (player.grounded && player.vy < 0) player.vy = -1;
  let nx = p.x + m.x, ny = p.y + m.y, nz = p.z + m.z; [nx, nz] = inBounds(nx, nz);
  if (ny < height(nx, nz) - 2) ny = height(nx, nz) + FEET + 0.2; // red de seguridad
  // La gente y los animales tienen cuerpo. Si Leftraru camina contra alguno, no pasa. Si él está quieto y es el otro
  // el que viene caminando, es el otro el que lo rodea: nadie lo mueve de donde está parado.
  for (const o of world.life.solids) { const ox = nx - o.x, oz = nz - o.z, r = RAD + o.rad, d2 = ox * ox + oz * oz; if (d2 < r * r && d2 > 1e-6 && Math.abs(ny - FEET - height(o.x, o.z)) < 1.3) { const d = Math.sqrt(d2), ux = ox / d, uz = oz / d;
    if (player.speed < 0.5 && (o.speed || 0) > 0.05) { o.x = nx - ux * r; o.z = nz - uz * r; if (o.tx !== undefined && Math.hypot(o.tx - nx, o.tz - nz) < r + 0.3) { o.tx = o.x; o.tz = o.z; } } // un animal que venía justo hacia él se queda a su lado
    else { nx = o.x + ux * r; nz = o.z + uz * r; } } }
  setPos(nx, ny, nz);

  // animación procedural
  const t = pp(); boy.g.position.set(t.x, t.y - FEET, t.z); boy.g.rotation.y = player.facing;
  player.phase += dt * (2.5 + player.speed * 1.9);
  player.slope = (player.slope || 0) + ((player.speed > 0.3 ? slopeAhead(t.x, t.z, player.facing) : 0) - (player.slope || 0)) * Math.min(1, dt * 5); // pendiente hacia donde camina, suavizada
  animatePerson(boy, player.phase, Math.max(player.girando ? 0.24 : 0, Math.min(1, player.speed / 6.2) * 0.9 + (player.speed > 0.2 ? 0.25 : 0)), !player.grounded, player.slope);
  if (!acc.sitting) { boy.head.rotation.y = player.miraY * 0.8; boy.head.rotation.x = player.miraX; boy.body.rotation.y += player.miraY * 0.2; } // la cabeza lleva casi todo el giro de la mirada; los hombros, un poco
  for (const k in POI) if (state === 'play' && Math.hypot(t.x - POI[k].x, t.z - POI[k].z) < 20) { ui.place(k); if (!ui.has('l-' + k) && !talk && player.grounded) ui.discover('l-' + k, herePhoto()); }
  if ((misT -= dt) <= 0 && state === 'play' && !talk) { // misiones y ayudas de los saberes
    misT = 0.5; const m = ui.missions({ got, total: world.items.length, ...acc.ctx() });
    ui.goals = acc.goals(t); // dónde buscar lo que falta: se marca en el minimapa y en el mapa
    destinoGuia(t);
    // cuando la historia avanza un paso, se avisa qué sigue (después de los avisos de lo recién logrado)
    const av = m ? m.aviso : 'Hasta aquí llega la historia por ahora: pronto llegarán los invitados de la costa. Mientras tanto, explora el valle y termina tus encargos.';
    const crudo = Array.isArray(av) ? av : [av], key = crudo.map(teclas).join('|'), esAyuda = (t) => !!(m && m.fijo) || t[0] === '?' || /\{\w+\}/.test(t); // los pasos del tutorial y lo que nombra teclas son instrucciones de cómo jugar
    if (key !== lastAviso) { lastAviso = key; ayudas.length = 0; ayudaT = 0; ayudaGap = 0; $('ayuda').classList.remove('on'); let primero = true;
      for (const t of crudo) { if (esAyuda(t)) ayudas.push([t, 12]); else { toast(teclas(t), 10, primero ? 'mision' : null, true); primero = false; } } }
    else if (m && m.fijo && ayudaT < 0.6 && !ayudas.length) for (const t of crudo) ayudas.push([t, 12]); // el paso del tutorial sigue a la vista hasta que lo haces: sus instrucciones vuelven a pasar
    // La guía de la historia se pone sola: apunta a la misión principal abierta, salvo que el jugador haya marcado otra cosa o se la haya quitado.
    if (m && !guia && guiaNo !== m.id) setGuia({ kind: 'mision', id: m.id, auto: true }, 'sola');
    else if (guia && guia.auto && (!m || guia.id !== m.id)) setGuia(m && guiaNo !== m.id ? { kind: 'mision', id: m.id, auto: true } : null, 'sola');
    ui.marks = ui.skill('rastro') ? explorer.hints(t) : [];
  }
  // ¿hay algo cerca que observar o alguien con quien hablar?
  if ((scanT -= dt) <= 0 && state === 'play') { scanT = 0.2; still = player.speed < 0.3 ? still + 0.2 : 0; near = talk || ui.open || focus ? null : explorer.scan(t, still > 0.8); $('prompt').classList.toggle('on', !!near); if (near) $('prompt-text').textContent = `${near.verb} ${near.label}`; }
}

function chase() { // dónde debe estar la cámara de juego: detrás del personaje, sin atravesar troncos ni rocas
  const t = pp(), cp = Math.cos(cam.pitch), d = { x: Math.sin(cam.yaw) * cp, y: Math.sin(cam.pitch), z: Math.cos(cam.yaw) * cp };
  const hit = physics.castRay(new RAPIER.Ray({ x: t.x, y: t.y + 0.75, z: t.z }, d), cam.dist, true, undefined, undefined, pCol);
  const dist = hit ? Math.max(0.9, (hit.timeOfImpact ?? hit.toi) - 0.3) : cam.dist;
  const x = t.x + d.x * dist, z = t.z + d.z * dist;
  return [V3(x, Math.max(t.y + 0.75 + d.y * dist, height(x, z) + 0.5), z), V3(t.x, t.y + 0.75, t.z)];
}
function updateCamera(dt) { const [pos, look] = chase(); camera.position.lerp(pos, Math.min(1, dt * 9)); camera.lookAt(look); }

// ---------- observar: la cámara se acerca sola al objeto, lo encuadra, toma la foto y vuelve ----------
let focus = null;
// luz suave que acompaña a la cámara al observar algo de cerca, para que se vea aunque esté a la sombra
const lamp = new THREE.PointLight(0xfff2dc, 0, 9, 1.4); scene.add(lamp);
const ease = (k) => k * k * (3 - 2 * k);
function startFocus(c) {
  const t = pp(), T = c.live ? c.live() : c.target, sh = c.shot, pos = V3(), tv = V3(T.x, T.y, T.z);
  let dx = t.x - T.x, dz = t.z - T.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const place = (ax, az) => { pos.set(T.x + ax * sh.dist, T.y + sh.up, T.z + az * sh.dist); pos.y = Math.max(pos.y, height(pos.x, pos.z) + (sh.tree ? 1.6 : 0.3)); return pos; };
  if (sh.fromPlayer) pos.set(t.x, t.y + 0.95, t.z);             // las aves se miran desde donde estás, con mucho acercamiento
  else if (sh.tree) {                                            // árbol: se busca alrededor el lado desde donde menos lo tapan otros
    let best = null; const a0 = Math.atan2(dz, dx);
    for (let k = 0; k < 12; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 6), p2 = place(Math.cos(a), Math.sin(a)).clone();
      let score = world.blockers(p2, tv, c.rec).length + Math.ceil(k / 2) * 0.15;
      for (let u = 0.15; u < 0.9; u += 0.15) if (height(p2.x + (T.x - p2.x) * u, p2.z + (T.z - p2.z) * u) > p2.y + (T.y - p2.y) * u - 1) score += 4; // un cerro tapa la vista
      if (!best || score < best.score) best = { score, p2 }; }
    pos.copy(best.p2);
  } else if (sh.face && c.rec) { const nx = Math.sin(c.rec.yaw), nz = Math.cos(c.rec.yaw), sg = nx * dx + nz * dz >= 0 ? 1 : -1; place(nx * sg, nz * sg); } // planta plana: de frente
  else if (sh.side) place(sh.side[0], sh.side[1]);               // ave posada: desde el lado de afuera de su rama
  else place(dx, dz);
  if (!sh.fromPlayer) world.clearView(pos, tv, c.rec, !sh.tree);  // lo que queda entre la cámara y el objeto se oculta mientras dura la observación
  lamp.userData.on = !sh.fromPlayer && sh.dist < 6;
  if (c.bird) c.bird.hold = 6; // el ave no se va mientras la miras
  focus = { c, pos: pos.clone(), fov: sh.fov, t: 0, stage: 0, hold: 0, sp: camera.position.clone(), sf: camera.fov, look: V3(t.x, t.y + 0.75, t.z), done: false };
  $('prompt').classList.remove('on'); $('focus').textContent = `Observando ${c.label}…`; $('focus').classList.add('on'); document.body.classList.add('talking');
}
function updateFocus(dt) {
  const f = focus, T = f.c.live ? f.c.live() : f.c.target, tv = V3(T.x, T.y, T.z);
  if (f.stage === 0) { f.t = Math.min(1, f.t + dt / 0.9); const k = ease(f.t); camera.position.lerpVectors(f.sp, f.pos, k); camera.fov = f.sf + (f.fov - f.sf) * k; camera.lookAt(f.look.clone().lerp(tv, k)); if (k > 0.4) boy.g.visible = false; if (f.t >= 1) f.stage = 1; }
  else if (f.stage === 1) {
    camera.position.copy(f.pos); camera.lookAt(tv); f.hold += dt;
    if (f.hold > 0.45 && !f.done) { f.done = true; camera.updateProjectionMatrix(); world.update(0, time, camera.position, pp(), 0); draw(); const img = grab(); if (f.c.known) ui.retake(f.c.id, img); else ui.discover(f.c.id, img, T); }
    if (f.hold > 1.7) { f.stage = 2; f.t = 0; $('focus').classList.remove('on'); world.restoreView(); }
  } else { f.t = Math.min(1, f.t + dt / 0.7); const k = ease(f.t), [pos, look] = chase(); camera.position.lerpVectors(f.pos, pos, k); camera.fov = f.fov + (f.sf - f.fov) * k; camera.lookAt(tv.lerp(look, k)); if (k > 0.5) boy.g.visible = true; if (f.t >= 1) { camera.fov = f.sf; focus = null; document.body.classList.remove('talking'); } }
  lamp.position.copy(camera.position); lamp.intensity = lamp.userData.on && focus ? (f.stage === 1 ? 7 : f.stage === 0 ? 7 * f.t : 7 * (1 - f.t)) : 0;
  camera.updateProjectionMatrix();
}

function updateItems() {
  const t = pp(), on = acc.f.m1 === 1; // los piñones se recogen mientras dura el encargo de Millaray
  if (outroPend && player.grounded && state === 'play' && !talk) { outroPend = false; outro(); }
  for (const [i, it] of world.items.entries()) {
    it.off = !on; it.mesh.visible = on && !it.taken; if (it.taken || !on) continue;
    it.mesh.position.y = it.base.y + Math.sin(time * 2 + it.base.x) * 0.15; it.mesh.rotation.y = time * 1.5;
    if (state === 'play' && Math.hypot(t.x - it.base.x, t.y - it.base.y + 0.3, t.z - it.base.z) < 1.25) {
      if (!ui.has('pinon')) ui.discover('pinon', photo({ x: it.base.x, y: it.mesh.position.y, z: it.base.z }, { dist: 1.5, up: 0.25, fov: 34 }), it.base);
      it.taken = true; it.mesh.visible = false; got++; ui.addItem('pinon'); acc.pin(i); snd.play('pinon', 0.6, 1 + (got - 1) * 0.06);
      if (got === world.items.length) outroPend = true;
      else if (got === world.items.length - 1) hint('Falta uno. Está sobre las rocas, al fondo del bosque: sube saltando.', 8);
    }
  }
}

const ui = createUI({ world, onToast: (t, kind) => toast(t, 5, kind || 'hallazgo'), onClose: () => { if (state === 'play' && !menuOpen) lock(); }, onSkill: () => applySkills(), onGuide: (g) => setGuia(g, 'jugador') });
renderer.domElement.addEventListener('webglcontextrestored', () => ui.repaint()); // si el navegador pierde y recupera el contexto gráfico, el fondo del minimapa se vuelve a pintar
const acc = createActions({ world, ui, snd, scene, hint, murmur, player, story, pinones: () => [got, world.items.length],
  place: (x, z, facing) => { setPos(x, height(x, z) + FEET + 0.05, z); player.vy = 0; player.speed = 0; player.facing = facing; },
  speak: (name, lines, done) => { talk = { name, lines, i: 0, done: done || null }; say(); },
  ripple: (x, z) => { const r = ripples[ripI++ % ripples.length]; r.position.set(x, WATER_Y + 0.03, z); r.userData.t = 0; r.visible = true; } });
const explorer = createExplorer({ world, ui }); explorer.urgent = (id) => acc.wants(id);
for (const i of acc.pins) { const it = world.items[i]; if (it && !it.taken) { it.taken = true; it.mesh.visible = false; got++; if (acc.f.m1 === 1) ui.addItem('pinon'); } } // piñones recogidos en una sesión anterior
// ---------- línea de guía: de donde estás hasta un destino, por los senderos cuando conviene ----------
// El destino puede ser un punto marcado en el mapa, una persona o una misión (entonces apunta a donde toque ir ahora).
// La línea parte siempre de Leftraru: a medida que avanza, lo recorrido deja de dibujarse.
let guia = null, guiaT = null, guiaVia = false, guiaNo = null; // guiaNo: la misión de la historia a la que el jugador le quitó la guía (no se le vuelve a poner sola)
function setGuia(g, quien) { // quien: 'jugador' si la puso o la quitó él en el mapa o en la lista; 'sola' si la pone la historia
  if (quien === 'jugador') guiaNo = !g && guia && guia.kind === 'mision' ? guia.id : null;
  guia = g; guiaT = null; ui.guide = null; ui.guideKey = g ? (g.kind === 'mision' ? 'm:' + g.id : 'p') : ''; misT = 0;
  if (!g) return; if (quien !== 'sola') snd.play('ui-mapa', 0.5); destinoGuia(pp());
  if (!guiaT && quien !== 'sola') { hint('Para esto no hay un solo lugar que marcar: explora y pregunta.', 6); guia = null; ui.guideKey = ''; }
}
function destinoGuia(p) { // a dónde apunta ahora (se revisa un par de veces por segundo)
  if (!guia) return;
  if (guia.kind === 'punto') guiaT = guia;
  else if (guia.kind === 'persona') { const a = world.life.actors.find((q) => PERSON[q.name] === guia.id); guiaT = a ? { x: a.x, z: a.z, label: TALK[guia.id].name } : null; }
  else if (ui.done(guia.id)) { setGuia(null); return; } // misión cumplida: la guía se retira sola
  else guiaT = acc.objetivo(guia.id, p);
  if (guiaT && guia.kind === 'punto' && Math.hypot(guiaT.x - p.x, guiaT.z - p.z) < 4) { hint(`Llegaste a ${guiaT.label}.`, 5); snd.play('ui-hallazgo', 0.4); setGuia(null); }
}
function updateGuia() { // el trazo, cada cuadro, desde donde está ahora
  if (!guia || !guiaT) { ui.guide = null; return; }
  const p = pp(), r = route(p.x, p.z, guiaT.x, guiaT.z, guiaVia); guiaVia = r.via;
  ui.guide = { pts: r.pts, x: guiaT.x, z: guiaT.z, label: guiaT.label, len: r.len };
}
// ---------- hojas verdes que marcan en el mundo lo que hay que ir a recoger (las mismas del mapa) ----------
// Flotan sobre cada planta pedida y se ven a través de los árboles, para encontrarla de lejos; al acercarse se achican.
const hojaMat = (() => { // una hoja verde sobre un disco claro con borde oscuro: se distingue contra el follaje, el suelo y el cielo
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.translate(48, 48);
  g.fillStyle = '#fff1d0'; g.strokeStyle = '#14110f'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 41, 0, 7); g.fill(); g.stroke();
  g.rotate(-0.6); g.fillStyle = '#5aa832'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -27); g.quadraticCurveTo(23, -4, 0, 27); g.quadraticCurveTo(-23, -4, 0, -27); g.fill(); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -17); g.lineTo(0, 19); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.SpriteMaterial({ map: t, fog: false, toneMapped: false, depthWrite: false, depthTest: false, transparent: true }); })();
const hojas = Array.from({ length: 6 }, () => { const sp = new THREE.Sprite(hojaMat); sp.visible = false; sp.renderOrder = 6; scene.add(sp); return sp; });
function updateHojas() {
  const p = pp(), gl = state === 'play' && !focus ? ui.goals : [];
  hojas.forEach((sp, i) => { const q = gl[i], d = q ? Math.hypot(q.x - p.x, q.z - p.z) : 0; sp.visible = !!q && d < 80; if (!sp.visible) return;
    sp.scale.setScalar(0.5 + Math.min(1, d / 40) * 0.75); sp.position.set(q.x, height(q.x, q.z) + (q.alto || 2.6) + Math.sin(time * 2.2 + i * 1.3) * 0.07, q.z); });
}
// ---------- vida: baja con las caídas grandes y con el agua helada del río; vuelve sola, y más rápido sentado junto al fuego ----------
let vida = acc.vida, fallV = 0, enSuelo = true, frio = false, desmayo = 0, vidaVista = -1;
function updateVida(dt) {
  if (state !== 'play') return;
  if (desmayo > 0) { // se desmayó: la pantalla se oscurece y despierta junto al fogón
    const antes = desmayo; desmayo -= dt;
    if (antes > 1.6 && desmayo <= 1.6) { setPos(-2.3, height(-2.3, 1.5) + FEET + 0.05, 1.5); player.vy = 0; player.speed = 0; vida = 60; $('velo').classList.remove('on'); hint('Te desmayaste. Despiertas junto al fogón: alguien te trajo y te abrigó.', 9); }
    return;
  }
  if (!player.grounded) fallV = Math.min(fallV, player.vy);
  else { if (!enSuelo && fallV < -13) { vida -= (-fallV - 13) * 5; hint('Caíste desde muy alto y te golpeaste.', 5); snd.play('paso-tierra-1', 1, 0.55); } fallV = 0; }
  enSuelo = player.grounded;
  const helada = player.wade > 0.85; // con el agua al pecho, en pleno invierno
  if (helada) { vida -= 5 * dt; if (!frio) hint('El agua está helada: no te quedes mucho rato adentro.', 6); } else vida = Math.min(100, vida + dt * (acc.sitting ? 5 : 1.2));
  frio = helada;
  if (vida <= 0) { vida = 0; desmayo = 3; $('velo').classList.add('on'); }
  const v = Math.round(vida); if (v !== vidaVista) { vidaVista = v; $('vida-bar').style.width = `${v}%`; $('vida-n').textContent = v; $('estado').classList.toggle('poca', v < 30); acc.vida = v; }
}
drawKeys(); applySkills();
await assets.whenLoaded(); bar(1, 'Listo'); assets.onProgress = null; $('loading').classList.add('hide'); setTimeout(() => $('loading').remove(), 700);
window.__g = { snd, height, ui, explorer, acc, story, toasts, murmur, setGuia, renderer, get vida() { return vida; }, set vida(v) { vida = v; }, camera, abrirPrologo, cerrarPrologo, get prologo() { return prologo; }, get acto() { return acto; }, hojas, cerrarActo, portadaMenu, avanzarPrologo, ayudas, ACTIONS, menuPage, interact, get near() { return near; }, get talk() { return talk; }, get guia() { return guia; }, get guiaT() { return guiaT; }, outro, apuntes, sueltaTodo, player, cam, world, pp, get state() { return state; }, get got() { return got; }, cine, enter() { portadaMenu(); coverT = 0; enter(); }, setMenu, opts, get menuOpen() { return menuOpen; }, paused: false, keys,
  tp(x, y, z) { setPos(x, y, z); player.vy = 0; },
  view(x, y, z, lx, ly, lz) { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); world.update(0, time, camera.position, pp()); draw(); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  snap() { draw(); return renderer.domElement.toDataURL('image/jpeg', 0.9); } };

const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0;
applyOpts();
function tick(dt) {
  time += dt; uTime.value = time;
  updatePlayer(dt); updateVida(dt);
  if (cine.active) cine.update(dt);
  else if (fuera()) { const a = time * 0.04 + 2.4; camera.position.set(Math.sin(a) * 31, 12, Math.cos(a) * 31); camera.lookAt(0, 4, 0); }
  else if (focus) updateFocus(dt);
  else updateCamera(dt);
  updateItems();
  { const p = pp(); uPlayer.value.set(p.x, p.y - FEET, p.z); // las plantas se apartan al paso
    ui.people.length = 0;
    for (const a of world.life.actors) if (a.mark) { const id = PERSON[a.name], w = acc.wants(id), kind = w === 'main' ? 'main' : ui.has(id) ? w : 'nuevo'; // estrella: con esta persona sigue la historia; rombo: encargo; círculo: aún no la conoces
      a.mark.visible = state === 'play' && !!kind; if (kind) { a.mark.material = world.life.markMats[kind]; ui.people.push({ x: a.x, z: a.z, kind, id }); } }
    acc.update(dt, time, p); acc.pose(boy);
    if ((actT -= dt) <= 0) { actT = 0.2; doable = state === 'play' && !talk && !ui.open && !focus ? acc.scan(p) : null; $('prompt2').classList.toggle('on', !!doable); if (doable) $('prompt2-text').textContent = doable.label; } // estrella sobre quien aún tiene algo que contarte
    // ondas en el agua al vadear
    ripT -= dt; if (player.wade > 0.05 && player.speed > 0.5 && ripT <= 0) { ripT = 0.22; const r = ripples[ripI++ % ripples.length]; r.position.set(p.x, WATER_Y + 0.03, p.z); r.userData.t = 0; r.visible = true; }
    for (const r of ripples) if (r.visible) { const k = (r.userData.t += dt) / 1.6; r.scale.setScalar(0.4 + k * 2.6); r.material.opacity = 0.5 * (1 - k); if (k >= 1) r.visible = false; } }
  world.update(dt, time, camera.position, pp(), player.speed); lights.follow(fuera() ? { x: 0, y: 3, z: 0 } : cine.active ? camera.position : pp());
  if (state === 'play') { updateGuia(); ui.drawMap(pp(), player.facing, cam.yaw + Math.PI); }
  updateHojas();
  if (hintT > 0 && (hintT -= dt) <= 0) $('hint').classList.remove('on');
  if (ayudaT > 0 && (ayudaT -= dt) <= 0) $('ayuda').classList.remove('on');
  ayudaGap -= dt; if (ayudas.length && ayudaGap <= 0 && state === 'play' && !talk) showAyuda(...ayudas.shift());
  toastGap -= dt; if (toasts.length && toastGap <= 0 && state === 'play' && !talk) { const [txt, secs, sound, grande] = toasts.shift(); showHint(txt, secs, grande); if (TOQUE[sound]) { snd.play(...TOQUE[sound]); apunteGap = Math.max(apunteGap, 0.9); } }
  apunteGap -= dt; if (apuntes.length && apunteGap <= 0 && state === 'play' && !talk) { apunte(...apuntes.shift()); apunteGap = 0.7; toastGap = Math.max(toastGap, 0.9); } // de a uno, para que sus toques no se pisen
  for (let i = vistos.length - 1; i >= 0; i--) { const a = vistos[i]; a.t -= dt; if (a.t < 0.6) a.el.classList.add('fuera'); if (a.t <= 0) { a.el.remove(); vistos.splice(i, 1); } }
  if (subT > 0 && (subT -= dt) <= 0 && !cine.active) $('sub').classList.remove('on');
}
window.__g.advance = (secs) => { for (let t = 0; t < secs; t += 1 / 60) tick(1 / 60); }; // para pruebas automáticas 
window.__g.tick = tick; window.__g.physics = physics;
// ---------- música: una melodía en la portada y otra al estar en la aldea; se cruzan suavemente ----------
const tracks = {}; for (const k of ['portada', 'aldea', 'bosque']) { const a = new Audio(`assets/musica/${k}.mp3`); a.loop = true; a.volume = 0; a.preload = k === 'portada' ? 'auto' : 'none'; tracks[k] = a; }
let audioOK = false; { const ok = (e) => { if (!e.isTrusted) return; audioOK = true; for (const ev of ['pointerdown', 'keydown']) removeEventListener(ev, ok); }; for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, ok); } // el navegador solo deja sonar después del primer gesto del jugador
function updateMusic(dt) {
  const p = pp(), want = fuera() ? 'portada' : Math.hypot(p.x, p.z) < 50 ? 'aldea' : 'bosque';
  for (const k in tracks) { const a = tracks[k], goal = k === want && document.hasFocus() ? opts.musica : 0, v = a.volume + Math.sign(goal - a.volume) * Math.min(Math.abs(goal - a.volume), dt * 0.25);
    a.volume = Math.min(1, Math.max(0, v)); if (goal > 0 && a.paused && audioOK) a.play().catch(() => {}); if (goal === 0 && a.volume === 0 && !a.paused) a.pause(); }
}
// con la pestaña oculta el navegador deja de avisar cada cuadro: la música se corta de inmediato en vez de quedar sonando
document.addEventListener('visibilitychange', () => { if (document.hidden) for (const k in tracks) { tracks[k].volume = 0; tracks[k].pause(); } });
// ---------- sonidos del mundo ----------
const SUELO = { earth: 'tierra', path: 'tierra', pebble: 'tierra', rock: 'tierra', bed: 'tierra', alpine: 'tierra', forest: 'hojas', moss: 'hojas', needles: 'hojas', meadow: 'pasto', grassy: 'pasto', marsh: 'pasto' };
const ROCE = ['fern', 'murtilla', 'michay', 'chilco', 'nalca', 'quila', 'reed'];
let stepD = 0, roceT = 0, lastP = null;
function updateSound(dt) {
  const p = pp(), play = state === 'play', d0 = Math.hypot(p.x, p.z), moved = lastP ? Math.hypot(p.x - lastP.x, p.z - lastP.z) : 0; lastP = { x: p.x, z: p.z };
  if (play && player.grounded && moved > 0.001 && moved < 1) {
    stepD += moved; const stride = player.speed > 4.5 ? 1.25 : 0.8;
    if (stepD > stride) { stepD = 0; const s = player.wade > 0.05 ? 'agua' : SUELO[zone(p.x, p.z, height(p.x, p.z), normalAt(p.x, p.z)[1])] || 'tierra'; snd.play(`paso-${s}-${Math.random() < 0.5 ? 1 : 2}`, (s === 'agua' ? 0.16 : 0.1) * (player.speed > 4.5 ? 1.2 : 1), 0.9 + Math.random() * 0.2); }
    roceT -= dt; if (roceT <= 0 && (world.nearBush(p.x, p.z, 1.0) || ROCE.some((k) => world.nearPlant(k, p.x, p.z, 0.6)))) { roceT = 0.55; snd.play(`arbusto-${Math.random() < 0.5 ? 1 : 2}`, 0.16, 0.85 + Math.random() * 0.3); } // roce al pasar entre las plantas
  }
  const k = (play || state === 'cine') && !prologo && !acto ? 1 : 0, bosque = Math.min(1, Math.max(0, (d0 - 30) / 40));
  snd.loop('rio', k * 0.75 * Math.max(0, 1 - Math.abs(p.z - riverZ(p.x)) / 32) ** 2);
  snd.loop('viento', k * (0.1 + bosque * 0.22));
  snd.loop('pajaros', k * (0.12 + bosque * 0.3));
  snd.loop('fuego', k * 0.6 * Math.max(0, 1 - d0 / 13) ** 2);
}
// toque al abrir el cuaderno, la bolsa, el mapa y al pulsar cualquier botón
addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const id = b.id || ''; if (!b.closest('#menu, #panel, #title')) b.blur(); // que Espacio o Enter no vuelvan a apretar el último botón tocado
  snd.play(['btn-notas', 'btn-misiones', 'btn-saberes', 'btn-bolsa', 'btn-mapa'].includes(id) ? 'ui-cuaderno' : 'ui-clic', 0.6); }, true);
let fallos = 0; // cuadros seguidos con error
function frame() {
  requestAnimationFrame(frame); medidor.begin(); updateMusic(1 / 60); updateSound(1 / 60);
  const dt = Math.min(0.05, clock.getDelta());
  if (window.__g.paused) return;
  if (!menuOpen || state === 'title') { // el juego se detiene con el menú abierto
    try { tick(dt); fallos = 0; }
    catch (e) { // un error en un cuadro no debe congelar el juego: se anota, se sigue, y si insiste se avisa
      if (!fallos++) console.error('Leftraru: error en un cuadro', e);
      if (fallos === 90) { $('aviso-error').classList.add('on'); console.error('Leftraru: el error se repite', e); }
    }
  }
  draw(); medidor.end();
  // si el equipo va lento, baja la resolución de a poco
  fpsT += dt; fpsN++; if (fpsT > 3) { if (opts.calidad === 'auto' && !menuOpen && fpsN / fpsT < 27 && pr > 0.6) { pr = Math.max(0.6, pr - 0.25); renderer.setPixelRatio(pr); post.resize(); } fpsT = fpsN = 0; }
}
frame();
