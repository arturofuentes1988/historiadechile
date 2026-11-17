import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
import { TALLADO, OLLA } from './village.js';
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
// ---------- presentación de los botones: sale una sola vez, la primera vez que se entra a jugar ----------
// Una flecha va señalando, de a uno, los cinco botones de abajo a la derecha, y un recuadro dice para qué sirve cada uno.
// Mientras dura, el juego espera. Se avanza con un clic o con Enter, y Esc la salta. Que ya se vio queda anotado en este navegador.
let tour = -1; // qué botón se está presentando (−1: no hay presentación)
const TOUR = [['btn-notas', 'cuaderno', 'Cuaderno', 'Aquí queda todo lo que observas, con su foto. Cada descubrimiento suma puntos de investigación.'],
  ['btn-misiones', 'misiones', 'Misiones', 'Lo que tienes por hacer: la historia y los encargos que te da la gente. Desde aquí puedes pedir la línea de guía hacia cualquiera de ellos.'],
  ['btn-saberes', 'saberes', 'Saberes', 'Lo que la gente de la aldea te puede enseñar. Cada 1.000 puntos de investigación ganas un punto para aprender un saber.'],
  ['btn-bolsa', 'bolsa', 'Bolsa', 'Lo que llevas contigo y lo que sabes preparar.'],
  ['btn-mapa', 'mapa', 'Mapa', 'El territorio completo. Se va dibujando a medida que lo recorres.']];
function tourIr(i) {
  for (const [id] of TOUR) $(id).classList.remove('tour-on');
  if (i < 0 || i >= TOUR.length) { tour = -1; document.body.classList.remove('tour'); localStorage.setItem('leftraru.tour', '1'); return; }
  tour = i; const [id, tecla, nombre, texto] = TOUR[i], b = $(id), caja = $('tour-caja');
  document.body.classList.add('tour'); b.classList.add('tour-on');
  $('tour-n').textContent = `${i + 1} de ${TOUR.length}`; $('tour-t').innerHTML = `${nombre} <kbd>${keyName(opts.keys[tecla])}</kbd>`; $('tour-x').textContent = texto; $('tour-sig').textContent = i === TOUR.length - 1 ? 'Entendido' : 'Siguiente';
  const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, w = caja.offsetWidth; // el recuadro queda sobre el botón, sin salirse de la pantalla, y la flecha justo encima de él
  caja.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, cx - w / 2))}px`; caja.style.bottom = `${innerHeight - r.top + 34}px`;
  $('tour-flecha').style.left = `${cx}px`; $('tour-flecha').style.bottom = `${innerHeight - r.top + 8}px`;
}
$('tour').addEventListener('click', (e) => { e.stopPropagation(); tourIr(e.target.closest('#tour-saltar') ? -1 : tour + 1); });
addEventListener('keydown', (e) => { if (tour < 0) return; e.stopImmediatePropagation(); e.preventDefault(); if (e.code === 'Escape') tourIr(-1); else if (!e.repeat && ['Enter', 'Space', 'ArrowRight', 'KeyE'].includes(e.code)) tourIr(tour + 1); }, true);
addEventListener('resize', () => { if (tour >= 0) tourIr(tour); });
function play() {
  state = 'play'; document.body.classList.add('playing'); $('hud').classList.add('on'); lock();
  if (!ui.has('leftraru')) { const t = pp(); ui.discover('leftraru', photo({ x: t.x, y: t.y + 0.25, z: t.z }, { dist: 2.3, up: 0.2, fov: 40, self: true })); }
  if (!localStorage.getItem('leftraru.tour')) tourIr(0); // la primera vez, se presentan los botones
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
  ['bolsa', 'Bolsa', 'KeyB'], ['mapa', 'Mapa', 'KeyM'], ['arma', 'Sacar o guardar el arco', 'KeyQ'], ['flecha', 'Hacer una flecha', 'KeyG'], ['rodar', 'Rodar', 'ControlLeft'], ['pantalla', 'Pantalla completa', 'KeyF'], ['menu', 'Menú', 'KeyP']];
opts.keys = Object.assign(Object.fromEntries(ACTIONS.map(([a, , k]) => [a, k])), opts.keys || {});
const down = (a) => !!keys[opts.keys[a]], is = (e, a) => e.code === opts.keys[a];
const keyName = (c) => ({ Space: 'Espacio', ShiftLeft: 'Shift izq.', ShiftRight: 'Shift der.', ControlLeft: 'Ctrl izq.', ControlRight: 'Ctrl der.', AltLeft: 'Alt izq.', AltRight: 'Alt der.', Tab: 'Tab', Enter: 'Enter', Backspace: 'Retroceso', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[c] || c.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num '));
let rebinding = null;
const GROUPS = [['Movimiento', ['adelante', 'atras', 'izquierda', 'derecha', 'correr', 'saltar', 'rodar']], ['Acción y cámara', ['observar', 'accion', 'arma', 'flecha', 'camIzq', 'camDer']], ['Paneles', ['cuaderno', 'misiones', 'saberes', 'bolsa', 'mapa']], ['Juego', ['pantalla', 'menu']]];
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
document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; try { if (on) navigator.keyboard?.lock?.(['Escape', 'KeyW', 'KeyT', 'KeyN'])?.catch?.(() => {}); else navigator.keyboard?.unlock?.(); } catch { /* sin soporte */ } if (on && state === 'play' && !menuOpen && !ui.open) lock(); $('o-full').checked = on; $('btn-full').classList.toggle('on', on); $('btn-full').title = on ? 'Salir de pantalla completa' : 'Pantalla completa'; });
if (!document.documentElement.requestFullscreen) { $('btn-full').style.display = 'none'; $('o-full').parentElement.style.display = 'none'; }
// El ratón nunca queda atrapado: el puntero siempre se ve y se puede hacer clic en cualquier botón sin salir del juego.
// La cámara se gira arrastrando con un botón apretado sobre el juego (o con sus teclas); la rueda acerca y aleja.
let dragging = false;
function lock() { /* ya no se captura el ratón */ }
const locked = () => false;
document.body.classList.add('sin-raton'); // deja a la vista la ayuda de cómo girar, hasta que se arrastra por primera vez
renderer.domElement.addEventListener('mousedown', (e) => { if (state !== 'play') return; dragging = true; document.body.classList.add('girando'); e.preventDefault();
  if (e.button === 2) { botonDer = true; if (puedeApuntar() && acc.apuntar(true)) { captura(); if (e.buttons & 1) acc.tensar(true); } else if (acc.tieneArco && !acc.equipado) hint(`Tienes el arco guardado. Sácalo con ${keyName(opts.keys.arma)} o desde la bolsa.`, 4); } // el botón derecho apunta
  else if (e.button === 0 && botonDer && acc.apunta) acc.tensar(true); }); // el izquierdo tensa el arco, pero solo mientras el derecho está apuntando: solo, no hace nada
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mouseup', (e) => { if (e.button === 0) { if (acc.apunta && botonDer) dispara(); acc.tensar(false); } if (e.button === 2) { botonDer = false; acc.tensar(false); dejaDeApuntar(); } /* soltar el derecho con el arco tenso lo baja sin tirar */ if (!e.buttons) { dragging = false; document.body.classList.remove('girando'); } });
// ---------- el arco: apuntar y soltar ----------
// Con el botón derecho apretado Leftraru levanta el arco, la cámara se le pone en los ojos y aparece la mira. Mientras lo
// mantiene, el botón izquierdo tensa la cuerda y al soltarlo sale la flecha; el izquierdo solo, sin apuntar, no hace nada.
// El ratón queda capturado mientras tanto, para poder girar sin que el puntero se salga de la ventana.
const puedeApuntar = () => state === 'play' && !talk && !focus && !ui.open && !auto && !cine.active && !acc.sitting && player.grounded && !rueda;
const capturado = () => document.pointerLockElement === renderer.domElement;
function dejaDeApuntar() { salirAp = 0; if (acc.apunta) acc.apuntar(false); if (capturado()) document.exitPointerLock(); }
function captura() { const pr = renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock(); if (pr && pr.catch) pr.catch(() => { /* sin captura del ratón se apunta igual, arrastrando */ }); }
let botonDer = false, salirAp = 0, retro = 0; // botonDer: el botón derecho sigue apretado; salirAp: cuánto falta para bajar el arco después de un tiro sin apuntar; retro: el golpe del arco al soltar
function dispara() { // suelta la flecha hacia donde marca la mira: lo primero que se ve al centro de la pantalla
  const d = camera.getWorldDirection(V3()), o = camera.position, ini = 1.7; let dist = 70; // ini: lo que haya entre la cámara y Leftraru (un muro pegado a la espalda) no cuenta
  const hit = physics.castRay(new RAPIER.Ray(V3().copy(o).addScaledVector(d, ini), d), 70 - ini, true, undefined, undefined, pCol); if (hit) dist = ini + (hit.timeOfImpact ?? hit.toi);
  for (let k = 2; k < dist; k += 0.5) if (o.y + d.y * k < height(o.x + d.x * k, o.z + d.z * k)) { dist = k; break; } // el suelo, a pasos
  const algo = acc.mira(o, d); if (algo !== null && algo < dist) dist = algo; // un blanco o un pudú que esté antes
  if (acc.soltar(cuerpo ? cuerpo.arco.position.clone() : V3(pp().x, pp().y + 0.35, pp().z), V3().copy(o).addScaledVector(d, dist))) retro = 1; else acc.tensar(false);
}
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
function say() { snd.play('hablar-sigue', 0.4, 0.96 + Math.random() * 0.08); if (talk.who && talk.who.c3) talk.who.c3.habla = Math.min(6, 0.6 + talk.lines[talk.i].length * 0.05); /* quien habla, si tiene cara, mueve los labios */ document.body.classList.add('talking'); const t = talk; $('dlg-name').textContent = t.name; $('dlg-text').textContent = t.lines[t.i]; $('dlg-more').textContent = `${keyName(opts.keys.observar)} · ${t.i < t.lines.length - 1 ? 'seguir' : 'cerrar'}`; $('dialogo').classList.add('on'); }
// Muestra la línea que toca. Antes de una línea puede venir un gesto (entregar, recibir, trabajar con las manos…), y
// después de la última se cierra la conversación. gestos: [[antes de qué línea, tipo, qué cosa], …].
function sigue() {
  const t = talk, g = t.gestos && t.who ? t.gestos.find((q) => q[0] === t.i && !q.hecho) : null;
  if (g) { g.hecho = true; $('dialogo').classList.remove('on'); return hazGesto(g[1], g[2], t.who, sigue); }
  if (t.i < t.lines.length) return say();
  talk = null; $('dialogo').classList.remove('on'); document.body.classList.remove('talking'); snd.play('hablar-fin', 0.3); if (t.who) t.who.habla = null; if (t.done) t.done();
}
// ---------- gestos dentro de una conversación ----------
// Para que se vea lo que pasa y no solo se lea: Leftraru entrega lo que trae ('da'), recibe algo ('recibe'), la otra
// persona trabaja con las manos ('obra') o se lleva algo a la boca ('bebe'), o es Leftraru el que lo prueba ('come').
// Antes de entregar o recibir da un paso hasta quedar al alcance de la mano. Mientras dura, el diálogo espera.
let gesto = null; // { tipo, a, t, dur, cosa, fin }
const cosaM = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 })); cosaM.visible = false; cosaM.castShadow = true; scene.add(cosaM);
const COSA = { pinon: [0x8a4a2a, 0.07, 0.6], lawen: [0x6a4632, 0.07, 0.55], remedio: [0x6a4632, 0.07, 0.55], presa: [0x8a5230, 0.2, 0.6], lana: [0xa83a2a, 0.07, 1], murtilla: [0xb02832, 0.05, 0.8], michay: [0x9a7a48, 0.06, 0.7], quila: [0xa89a58, 0.03, 9], arco: [0x4a3626, 0.035, 9] }; // color, grosor y cuánto se alarga lo que pasa de mano en mano; lo demás es un manojo verde
const manoDe = (q, izq) => (q === boy && cuerpo && cuerpo.H.RightHand ? cuerpo.H[izq ? 'LeftHand' : 'RightHand'].getWorldPosition(V3()) : q.foreR.localToWorld(V3(0, -0.2, 0.03))); // izq: con el cuerpo nuevo, que bebe con la izquierda
function hazGesto(tipo, cosa, a, fin) {
  if (!a || acc.sitting) return fin();
  if (tipo === 'muestra' || tipo === 'echa' || tipo === 'caricia') { // la entrega de los piñones, junto a la olla (más abajo)
    if (a.mode !== 'cook' || (tipo !== 'muestra' && entrega.a !== a)) return tipo === 'echa' ? hazGesto('da', cosa, a, fin) : fin(); // en otro lugar, la entrega de siempre
    const empieza = () => { gesto = { tipo, a, t: 0, dur: tipo === 'muestra' ? 1.7 : tipo === 'echa' ? 2.9 : 2.7, cosa, fin, sono: false }; planoOlla(a); };
    if (tipo !== 'muestra') return empieza();
    const fx = Math.sin(a.face), fz = Math.cos(a.face), sx = a.x - fz * 0.7 + fx * 0.06, sz = a.z + fx * 0.7 + fz * 0.06; // se para a su derecha, los dos de cara a la olla
    talk.gira = false; gesto = { tipo: 'llega' }; auto = { x: sx, z: sz, face: Math.atan2(OLLA.x - sx, OLLA.z - sz), done: () => { if (a.habla) { const B = cabeza(boy); a.habla.x = B.x; a.habla.y = B.y; a.habla.z = B.z; } entrega.a = a; entrega.esc = 0; for (const q of PIN) { q.t = 0; q.de = null; } empieza(); } }; return; }
  const parte = () => { const [col, r, ly] = COSA[cosa] || [0x4f8a3c, 0.075, 0.8]; cosaM.material.color.setHex(col); cosaM.scale.set(r, r * ly, r); gesto = { tipo, a, t: 0, dur: tipo === 'obra' ? 2.8 : tipo === 'bebe' || tipo === 'come' ? 2.1 : 1.9, cosa, fin, sono: false }; };
  const q = pp(), d = Math.hypot(a.x - q.x, a.z - q.z);
  if ((tipo === 'da' || tipo === 'recibe') && d > 1.12) { const k = (d - 1.02) / d; gesto = { tipo: 'llega' }; auto = { x: q.x + (a.x - q.x) * k, z: q.z + (a.z - q.z) * k, face: Math.atan2(a.x - q.x, a.z - q.z), done: () => { if (talk && talk.who === a) { abrePlano(a, a.mode !== 'cook'); if (a.habla) { const B = cabeza(boy); a.habla.x = B.x; a.habla.y = B.y; a.habla.z = B.z; } } parte(); } }; } // un paso, hasta quedar al alcance de la mano
  else parte();
}
function updateGesto(dt) {
  const g = gesto; if (g.tipo === 'llega') return;
  g.t += dt; const u = Math.min(1, g.t / g.dur), a = g.a, k = ease(Math.min(1, u / 0.28)) * (1 - ease(Math.max(0, (u - 0.78) / 0.22))); // k: cuánto están levantados los brazos
  if (g.tipo === 'da' || g.tipo === 'recibe') {
    const olla = a.mode === 'cook' && g.tipo === 'da'; a.mano = olla ? 0 : k; g.yo = k; // a la que está revolviendo la olla, se le echa directo a la olla
    const de = g.tipo === 'da' ? manoDe(boy) : manoDe(a), para = g.tipo === 'da' ? (olla ? V3(OLLA.x, height(OLLA.x, OLLA.z) + 0.62, OLLA.z) : manoDe(a)) : manoDe(boy), w = ease(Math.min(1, Math.max(0, (u - 0.36) / 0.24)));
    cosaM.visible = u > 0.1 && u < 0.84; cosaM.position.lerpVectors(de, para, w); cosaM.position.y += Math.sin(Math.PI * w) * (olla ? 0.3 : 0.05);
    if (!g.sono && u > 0.5) { g.sono = true; snd.play('pinon', 0.45, 0.9); }
  } else if (g.tipo === 'obra') { a.obra = k; if (!g.sono && u > 0.3) { g.sono = true; snd.play('arbusto-2', 0.3, 1.2); } }
  else if (g.tipo === 'bebe') { a.bebe = k; cosaM.visible = k > 0.2; cosaM.position.copy(manoDe(a)); if (!g.sono && u > 0.45) { g.sono = true; snd.play('paso-agua-2', 0.35, 1.3); } }
  else if (g.tipo === 'muestra') { entrega.alza = ease(Math.min(1, u / 0.62)); entrega.esc = ease(Math.min(1, u / 0.3)); if (u >= 1) { gesto = null; return g.fin(); } return; } // levanta el canasto con los piñones y se lo muestra
  else if (g.tipo === 'echa') { const e = entrega; e.vuelca = Math.sin(Math.PI * Math.min(1, u / 0.82)); // los va dejando caer a la olla, de a uno
    for (let i = 0; i < N_PIN; i++) if (PIN[i].t === 0 && u >= 0.07 + 0.6 * i / (N_PIN - 1)) { PIN[i].t = 0.001; if (i % 3 === 0) snd.play('pinon', 0.26, 0.85 + (i % 5) * 0.07); else if (i % 3 === 1) snd.play('paso-agua-2', 0.1, 1.5 + (i % 4) * 0.1); }
    e.alza = 1 - ease(Math.max(0, (u - 0.8) / 0.2)); e.esc = Math.min(1, e.alza * 1.6); if (u >= 1) { e.vuelca = e.esc = 0; gesto = null; return g.fin(); } return; } // al final baja las manos y guarda el canasto
  else if (g.tipo === 'caricia') { entrega.cari = k; if (cuerpo && u > 0.34 && u < 0.68) cuerpo.parp = -0.1; // él cierra los ojos un momento
    if (!g.sono && u > 0.3) { g.sono = true; snd.play('arbusto-2', 0.14, 0.7); } if (u >= 1) { entrega.cari = 0; gesto = null; return g.fin(); } return; }
  else if (g.tipo === 'come') { g.boca = k; cosaM.visible = k > 0.2 && u < 0.6; cosaM.position.copy(manoDe(boy, true)); }
  if (u >= 1) { a.mano = a.obra = a.bebe = 0; cosaM.visible = false; gesto = null; g.fin(); }
}
// ---------- los piñones, del canasto de Leftraru a la olla ----------
// La entrega se ve entera, en tres momentos que van entre las frases de la madre. Leftraru se para a su lado, junto a la
// olla, y le muestra los piñones en un canasto bajo (llepu) que sostiene con las dos manos ('muestra'); cuando ella dice que
// alcanzan, inclina el canasto y van cayendo a la olla ('echa'); y ella suelta el palo, que queda en la olla, y le pasa la
// mano por la cabeza ('caricia'). Son dos mallas: el canasto y todos los piñones juntos (instancias).
const N_PIN = 14, entrega = { a: null, alza: 0, esc: 0, vuelca: 0, cari: 0 }; // alza: cuánto tiene levantadas las manos; esc: tamaño con que asoma el canasto; vuelca: lo está inclinando; cari: la caricia
const cestoM = (() => { const pf = [[0.001, 0], [0.04, 0.001], [0.08, 0.003], [0.115, 0.008], [0.145, 0.024], [0.162, 0.046], [0.172, 0.066], [0.181, 0.07]], g = new THREE.LatheGeometry(pf.map(([x, y]) => new THREE.Vector2(x * 0.66, y * 0.66)), 18), n = g.attributes.position.count, C = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const j = i % pf.length; c.setHex(j === pf.length - 1 ? 0x6e5028 : j % 2 ? 0xa98648 : 0xcbae76); C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(C, 3)); // anillos claros y oscuros: la fibra enrollada
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })); m.castShadow = m.receiveShadow = true; m.visible = false; m.rotation.order = 'YXZ'; scene.add(m); return m; })();
const pinM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4).scale(0.011, 0.011, 0.025), new THREE.MeshStandardMaterial({ roughness: 0.5 }), N_PIN); pinM.castShadow = true; pinM.frustumCulled = false; pinM.visible = false; scene.add(pinM);
const PIN = Array.from({ length: N_PIN }, (_, i) => { const a = i * 2.4, r = 0.012 + (i % 5) * 0.012; pinM.setColorAt(i, new THREE.Color([0x8a4a2a, 0x9c5a32, 0x74401f][i % 3])); return { x: Math.cos(a) * r, y: 0.014 + (i > 8 ? 0.018 : 0) + (i % 3) * 0.005, z: Math.sin(a) * r, ry: a * 1.7, rx: (i % 4) * 0.22 - 0.3, t: -1, de: null }; }); // dónde va cada piñón dentro del canasto; t: −1 no está, 0 en el canasto, entre 0 y 1 cayendo, 1 ya en la olla
const pinO = new THREE.Object3D(); let paloOlla = null;
function updateEntrega(dt) {
  const e = entrega, a = e.a; if (!a) return;
  if (!talk || talk.who !== a) { e.a = null; e.alza = e.vuelca = e.cari = e.esc = 0; a.caricia = 0; if (a.palo) a.palo.visible = a.mode === 'cook'; if (paloOlla) paloOlla.visible = false; pinM.visible = cestoM.visible = false; return; } // se acabó la conversación
  a.caricia = e.cari;
  if (a.palo) { const suelto = e.cari > 0.03; // mientras lo acaricia, el palo se queda parado en la olla
    if (suelto && !paloOlla) { paloOlla = new THREE.Mesh(a.palo.geometry, a.palo.material); paloOlla.castShadow = true; paloOlla.visible = false; scene.add(paloOlla); }
    if (suelto && !paloOlla.visible) { a.palo.updateWorldMatrix(true, false); a.palo.matrixWorld.decompose(paloOlla.position, paloOlla.quaternion, paloOlla.scale); }
    if (paloOlla) paloOlla.visible = suelto; a.palo.visible = !suelto && a.mode === 'cook'; }
  const fx = Math.sin(player.facing), fz = Math.cos(player.facing), M = cuerpo ? cuerpo.H.RightHand.getWorldPosition(V3()).add(cuerpo.H.LeftHand.getWorldPosition(V3())).multiplyScalar(0.5) : manoDe(boy); // entre las dos manos
  cestoM.visible = e.esc > 0.02; cestoM.position.set(M.x + fx * 0.05, M.y - 0.005, M.z + fz * 0.05); cestoM.rotation.set(e.vuelca * 0.95, player.facing, 0); cestoM.scale.setScalar(Math.max(0.001, e.esc)); cestoM.updateMatrixWorld(true);
  const oy = height(OLLA.x, OLLA.z) + 0.5; let quedan = 0;
  for (let i = 0; i < N_PIN; i++) { const q = PIN[i]; if (q.t > 0 && q.t < 1) q.t = Math.min(1, q.t + dt / 0.44);
    if (q.t < 0 || q.t >= 1) pinO.scale.setScalar(0);
    else { quedan++; pinO.scale.setScalar(e.esc); pinO.position.set(q.x, q.y, q.z).applyMatrix4(cestoM.matrixWorld); pinO.rotation.set(q.rx + e.vuelca * 0.9, q.ry + player.facing, 0); // dentro del canasto, se mueve con él
      if (q.t > 0) { if (!q.de) q.de = pinO.position.clone(); const w = q.t; pinO.scale.setScalar(1); pinO.position.set(q.de.x + (OLLA.x + q.x * 2 - q.de.x) * w, q.de.y + (oy - q.de.y) * w * w + Math.sin(Math.PI * w) * 0.05, q.de.z + (OLLA.z + q.z * 2 - q.de.z) * w); pinO.rotation.x += w * 6; pinO.rotation.y += w * 4; } }
    pinO.updateMatrix(); pinM.setMatrixAt(i, pinO.matrix); }
  pinM.visible = quedan > 0; pinM.instanceMatrix.needsUpdate = true; if (pinM.instanceColor) pinM.instanceColor.needsUpdate = true;
}
function interact() {
  if (talk) { if (gesto) return; talk.i++; return sigue(); }
  if (!near || state !== 'play' || ui.open || focus) return;
  const c = near; near = null; $('prompt').classList.remove('on');
  if (c.person) {
    const d = TALK[c.id], a = c.person; // no se giran de golpe: charla() hace que se vuelvan el uno hacia el otro y acerca la cámara
    // La primera vez, la persona se presenta (y queda en el cuaderno). Si la historia sigue con ella, se presenta con eso mismo.
    const q = acc.talk(c.id), first = !c.known, story = q && (c.known || q.main) ? q : null;
    const meet = first ? () => { ui.discover(c.id, photo(c.target, c.shot)); for (const id of d.da) ui.discover(id, VIEWS[id] ? viewPhoto(id) : ''); } : null;
    talk = { name: d.name, lines: story ? story.lines : first ? d.lines : [d.again], i: 0, who: a, gira: true, gestos: story ? story.gestos : null, done: () => { if (meet) meet(); if (story && story.done) story.done(); } }; charla(a, true); sigue(); if (cuerpo) cuerpo.habla = 0.9; // él saluda primero
  } else { snd.play('hablar-sigue', 0.4, 0.96 + Math.random() * 0.08); if (c.shot.view) ui.discover(c.id, viewPhoto(c.shot.view)); else startFocus(c); } // el mismo toque que al pasar una línea de diálogo
}
$('dialogo').addEventListener('click', () => interact());


// Escenas dentro del juego: se quita la interfaz, corre la lista de planos y se vuelve a jugar
function playScene(shots, after) {
  setMenu(false); state = 'cine'; ui.show(null); plano = null; planoK = 0; if (camera.fov !== FOV_JUEGO) { camera.fov = FOV_JUEGO; camera.updateProjectionMatrix(); } // la escena parte con el lente de siempre, no con el de una conversación
  document.body.classList.remove('playing'); $('hud').classList.remove('on');
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
// La figura tallada del bosque viejo: después de observarla, la cámara la rodea mientras se cuenta lo que la familia dice de ella.
function relato() {
  const T = TALLADO, y = height(T.x, T.z), a0 = Math.atan2(-T.x, -T.z), o = (a, d, up) => V3(T.x + Math.sin(a) * d, y + up, T.z + Math.cos(a) * d); // a0: hacia la aldea, que es hacia donde mira
  playScene([
    { dur: 8, fov: 40, from: o(a0 + 0.55, 4.8, 1.4), to: o(a0 + 0.15, 3.5, 1.9), lookFrom: V3(T.x, y + 2.8, T.z), text: 'En la familia se cuenta que esta figura la talló el abuelo del abuelo de Ñamku, cuando su gente llegó a este valle.' },
    { dur: 9, fov: 46, from: o(a0 - 0.9, 5.6, 2.4), to: o(a0 - 1.5, 6.6, 3.2), lookFrom: V3(T.x, y + 2.2, T.z), lookTo: V3(POI.viejo.x, y + 10, POI.viejo.z), text: 'Venían de un invierno malo. Aquí encontraron agua, piñones y un bosque tan viejo que nadie se atrevió a entrar sin pedir.' },
    { dur: 10, fov: 36, from: o(a0 + 0.12, 2.7, 1.1), to: o(a0 - 0.25, 2.4, 2.3), lookFrom: V3(T.x, y + 0.9, T.z), lookTo: V3(T.x, y + 2.7, T.z), text: 'El más anciano habló con el dueño del bosque. Prometió que los suyos tomarían solo lo necesario, y dejó esta figura para que nadie lo olvidara.' },
    { dur: 8, fov: 44, from: o(a0 + Math.PI - 0.25, 3.4, 3.2), to: o(a0 + Math.PI, 4.4, 3.8), lookFrom: V3(T.x + Math.sin(a0) * 30, y + 1.5, T.z + Math.cos(a0) * 30), text: 'Por eso mira hacia la aldea: para ver si cumplimos.' },
  ]);
}
// Lo que alguien dice al pasar, sin detener el juego (el padre mientras suben al cerro): aparece abajo unos segundos.
let subT = 0;
function murmur(name, text, secs = 7) { $('sub-name').textContent = name; $('sub-text').textContent = text; const s = $('sub'); s.classList.remove('relato'); s.classList.add('on'); subT = secs; snd.play('hablar-sigue', 0.35, 0.9); }
// Mensajes. Arriba al centro van los de la historia (misiones y encargos, con letra grande) y las ayudas del momento;
// los puntos de investigación que se van ganando aparecen aparte, chicos, a la izquierda, sobre el minimapa.
// hint lo muestra de inmediato; los avisos que llegan juntos hacen fila para que cada uno alcance a leerse.
let hintT = 0, toastGap = 0, apunteGap = 0; const toasts = [], apuntes = [], vistos = [], GRANDE = ['mision', 'encargo', 'logro'];
function showHint(txt, secs, grande = false) { const h = $('hint'); h.textContent = txt; h.classList.toggle('grande', grande); h.classList.add('on'); hintT = secs; toastGap = Math.min(secs, 2.8); }
function hint(txt, secs) { if (cuerpo && txt[0] === '«') cuerpo.habla = Math.min(5, 0.8 + txt.length * 0.045); if (toasts.length) toasts.push([txt, secs]); else showHint(txt, secs); } // lo que va entre «» lo dice Leftraru: mueve los labios
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
  if (e.ctrlKey && state === 'play' && e.code !== 'KeyW' && e.code.startsWith('Key')) e.preventDefault(); // con Control apretado (rodar), las demás teclas no abren los atajos del navegador (el de cerrar pestaña, Ctrl+W, no se puede evitar)
  if (state === 'play' && !talk && !ui.open && !focus && !e.repeat) { if (is(e, 'arma')) acc.equipar(); else if (is(e, 'flecha')) acc.hacerFlecha(); else if (is(e, 'rodar')) { e.preventDefault(); rodar(); } }
  if (is(e, 'accion') && !e.repeat && !talk && !ui.open && !focus && state === 'play' && doable) { const a = doable; doable = null; $('prompt2').classList.remove('on'); a.run(); }
  if (talk) { if (e.code === 'Enter' || e.code === 'Space') interact(); return; }
  if (state === 'play') for (const pn of ['cuaderno', 'misiones', 'saberes', 'bolsa', 'mapa']) if (is(e, pn)) { snd.play('ui-cuaderno', 0.6); ui.show(pn === 'cuaderno' ? 'notas' : pn); }
  if (e.code === 'Escape') { if (ui.open) ui.show(null); else if (state !== 'cine') setMenu(true); }
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
// Si la ventana pierde el foco con una tecla apretada, el navegador nunca avisa que se soltó y Leftraru seguiría
// caminando solo. Al salir de la ventana se sueltan todas, y también el arrastre de la cámara.
const sueltaTodo = () => { for (const k in keys) keys[k] = false; dragging = false; document.body.classList.remove('girando'); botonDer = false; acc.tensar(false); dejaDeApuntar(); };
addEventListener('blur', sueltaTodo); document.addEventListener('visibilitychange', sueltaTodo);
addEventListener('mousemove', (e) => {
  if (dragging && !e.buttons) { dragging = false; document.body.classList.remove('girando'); } // el botón se soltó fuera de la ventana
  if (focus || (!locked() && !capturado() && !(dragging && state === 'play'))) return;
  document.body.classList.remove('sin-raton');
  const fino = acc.apunta ? 0.7 - 0.25 * acc.tensa : 1; // apuntando, el ratón gira más despacio y deja mirar hacia arriba
  cam.yaw -= e.movementX * 0.0042 * opts.sens * fino; cam.pitch = Math.min(1.2, Math.max(acc.apunta ? -0.75 : Math.min(-0.25, cam.pitch), cam.pitch + e.movementY * 0.0032 * opts.sens * fino * (opts.inv ? -1 : 1)));
});

let doable = null, actT = 0;
const ripples = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xeaf4f4, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.renderOrder = 4; scene.add(m); return m; });
let ripT = 0, ripI = 0;
// Cuando la historia lo pide, Leftraru camina solo hasta un punto: { x, z, face, done }. Al llegar se gira hacia face y se llama done.
let rueda = null, ruedaT = 0; // rodando: { t, dur, dx, dz }; ruedaT: cuánto falta para poder rodar otra vez
function rodar() { // una vuelta por el suelo hacia donde va caminando (o, quieto, hacia donde mira)
  if (state !== 'play' || rueda || ruedaT > 0 || talk || focus || ui.open || auto || acc.sitting || acc.busy || !player.grounded || desmayo > 0) return;
  dejaDeApuntar(); const mov = player.speed > 0.6, dx = mov ? player.dirX : Math.sin(player.facing), dz = mov ? player.dirZ : Math.cos(player.facing);
  rueda = { t: 0, dur: 0.7, dx, dz }; ruedaT = 1.0; player.facing = Math.atan2(dx, dz); snd.play('rodar', 0.6, 0.94 + Math.random() * 0.12);
}
let auto = null, miraOn = false, miraLista = false, miraN = -1; // la mira del arco: si está a la vista, si el arco ya está tenso y cuántas flechas muestra
function updatePlayer(dt) {
  let ix = 0, iz = 0, andar = null;
  if (rueda && state === 'play') { rueda.t += dt; const u = rueda.t / rueda.dur; andar = [rueda.dx, rueda.dz, 6.8 * (1 - 0.45 * u * u)]; if (u >= 1) rueda = null; } // rodando va derecho y rápido, y frena al final
  else if (auto && state === 'play') {
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
  const run = down('correr'), apunta = acc.apunta, target = andar ? andar[2] : (ix || iz ? (apunta ? 2.0 : run ? 6.2 * (ui.skill('ligero') ? 1.18 : 1) : 3.3) : 0) * (1 - wade * 0.5);
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; if (andar) { dx = andar[0]; dz = andar[1]; } const l = Math.hypot(dx, dz);
  if (l > 0) { dx /= l; dz /= l; player.dirX = dx; player.dirZ = dz; let d = Math.atan2(dx, dz) - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); if (!apunta) player.facing += d * Math.min(1, dt * 12); }
  if (apunta) { let d = cam.yaw + Math.PI - DE_LADO - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); player.facing += d * Math.min(1, dt * 16); if (!puedeApuntar()) dejaDeApuntar(); } // con el arco tenso se para de medio lado, con el hombro izquierdo (el del arco) hacia donde apunta, aunque camine
  if (acc.sitting && (ix || iz || down('saltar'))) acc.stand(); // cualquier movimiento lo hace levantarse
  // La mirada y el giro: quieto, Leftraru se vuelve hacia donde mira la cámara, así que al girar con el ratón gira él también.
  // La cabeza llega primero y el cuerpo la sigue de cerca, con pasitos en el lugar. Conversando, mira a la cara a quien le habla.
  { const libre = state === 'play' && !talk && !focus && !acc.sitting && !auto && desmayo <= 0;
    let d = cam.yaw + Math.PI - player.facing, yaw = 0, pit = 0, giro = 0; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (libre && l === 0 && player.grounded && !acc.busy && !apunta) { const paso = Math.sign(d) * Math.min(Math.abs(d), dt * Math.min(6.5, 0.5 + Math.abs(d) * 8)); player.facing += paso; d -= paso; giro = Math.min(1, Math.abs(paso) / dt / 2.5); }
    if (libre) { yaw = Math.max(-1.15, Math.min(1.15, d)) * Math.max(0, 1 - player.speed / 3); pit = Math.max(-0.2, Math.min(0.36, (cam.pitch - 0.2) * 0.45)); }
    else if (talk && talk.who && state === 'play' && !acc.sitting) { const a = talk.who, q = pp(); let c = Math.atan2(a.x - q.x, a.z - q.z) - player.facing; c = Math.atan2(Math.sin(c), Math.cos(c));
      if (talk.gira) { const paso = c * Math.min(1, dt * 9); player.facing += paso; c -= paso; giro = Math.min(1, Math.abs(paso) / dt / 2.5); } // se vuelve hacia quien le habla
      yaw = Math.max(-0.9, Math.min(0.9, c)); pit = Math.max(-0.4, Math.min(0.3, -Math.atan2(a.g.position.y + a.h * 0.94 - (q.y - FEET + boy.h * 0.94), Math.hypot(a.x - q.x, a.z - q.z) || 1))); } // y levanta o baja la vista hasta su cara
    player.giro = (player.giro || 0) + (giro - (player.giro || 0)) * Math.min(1, dt * 10); // cuánto está girando en el lugar: da los pasitos
    player.miraY = (player.miraY || 0) + (yaw - (player.miraY || 0)) * Math.min(1, dt * 6); player.miraX = (player.miraX || 0) + (pit - (player.miraX || 0)) * Math.min(1, dt * 6); }
  if (player.grounded && state === 'play' && !ui.open && !talk && !focus && !acc.sitting && !auto && !apunta && !rueda && down('saltar')) { player.vy = 6.6 * (ui.skill('salto') ? 1.22 : 1); player.grounded = false; snd.play('esfuerzo', 0.32, 0.95 + Math.random() * 0.1); } /* al saltar se le escapa un quejido corto, de esfuerzo */
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
  player.phase += dt * (2.5 + player.speed * 1.9 + (player.giro || 0) * 4);
  player.slope = (player.slope || 0) + ((player.speed > 0.3 ? slopeAhead(t.x, t.z, player.facing) : 0) - (player.slope || 0)) * Math.min(1, dt * 5); // pendiente hacia donde camina, suavizada
  animatePerson(boy, player.phase, Math.max((player.giro || 0) * 0.24, Math.min(1, player.speed / 6.2) * 0.9 + (player.speed > 0.2 ? 0.25 : 0)), !player.grounded, player.slope);
  if (!acc.sitting) { boy.head.rotation.y = player.miraY * 0.8; boy.head.rotation.x = player.miraX; boy.body.rotation.y += player.miraY * 0.2; } // la cabeza lleva casi todo el giro de la mirada; los hombros, un poco
  if (gesto && gesto.yo) { const k = gesto.yo; boy.armR.rotation.x += (-1.2 - boy.armR.rotation.x) * k; boy.foreR.rotation.x += (-0.3 - boy.foreR.rotation.x) * k; } // estira la mano para entregar o recibir
  if (gesto && gesto.boca) { const k = gesto.boca; boy.armR.rotation.x += (-0.85 - boy.armR.rotation.x) * k; boy.foreR.rotation.x += (-2.0 - boy.foreR.rotation.x) * k; } // se lleva algo a la boca
  for (const k in POI) if (state === 'play' && Math.hypot(t.x - POI[k].x, t.z - POI[k].z) < 20) { ui.place(k); if (!ui.has('l-' + k) && !talk && player.grounded) ui.discover('l-' + k, herePhoto()); }
  if ((misT -= dt) <= 0 && state === 'play' && !talk) { // misiones y ayudas de los saberes
    misT = 0.5; const m = ui.missions({ got, total: world.items.length, ...acc.ctx() });
    ui.goals = acc.goals(t); // dónde buscar lo que falta: se marca en el minimapa y en el mapa
    destinoGuia(t);
    // cuando la historia avanza un paso, se avisa qué sigue (después de los avisos de lo recién logrado)
    const av = m ? m.aviso : 'Hasta aquí llega la historia por ahora: pronto llegarán los invitados de la costa. Mientras tanto, la machi tiene algo que enseñarte: búscala junto al rewe. Y quedan encargos por terminar.';
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

// ---------- conversación: la cámara se acerca y deja a los dos en primer plano, vistos en ángulo ----------
// Mientras dura un diálogo la cámara deja de seguir a Leftraru: se pone detrás de él y a un costado, a la altura de su
// cabeza, y cierra el lente. Él queda de espaldas en tres cuartos a un lado del cuadro y quien le habla, de frente, al otro.
// De los dos costados se elige el más despejado, el que deja ver mejor la cara de quien habla y, a igualdad, el que le
// queda más cerca a la cámara. Al terminar, la cámara vuelve sola a su lugar de siempre.
const FOV_JUEGO = camera.fov, FOV_CHARLA = 38;
const FOV_ARCO = 50, DE_LADO = 0.45, CAM_ARCO = [0.1, 0.56, 0.1]; let apK = 0; // CAM_ARCO: la cámara del arco, a la derecha, arriba y atrás de Leftraru; // DE_LADO: cuánto gira el cuerpo al apuntar, como se para un arquero; // apK: cuánto ha entrado la cámara del arco
let plano = null, planoK = 0; // plano: { pos, look } del diálogo en curso; planoK: cuánto ha entrado (0 la cámara de juego, 1 el plano)
const cabeza = (p) => p.head.getWorldPosition(V3());
function abrePlano(a, frente) { // frente: quien habla va a quedar vuelto hacia Leftraru
  plano = null; boy.g.updateMatrixWorld(true); a.g.updateMatrixWorld(true);
  const B = cabeza(boy), A = cabeza(a); let ux = A.x - B.x, uz = A.z - B.z; const D = Math.hypot(ux, uz);
  if (D < 0.35 || D > 4.6) return; ux /= D; uz /= D; // uno encima del otro, o muy lejos: se queda la cámara de siempre
  const look = V3(B.x + ux * D * 0.6, (B.y + A.y) / 2 - 0.24, B.z + uz * D * 0.6), atras = 0.85 + D * 0.12, lado = 1.4, fx = frente ? -ux : Math.sin(a.face), fz = frente ? -uz : Math.cos(a.face);
  let best = null;
  for (const sd of [1, -1]) {
    const pos = V3(B.x - ux * atras + uz * sd * lado, B.y + 0.18, B.z - uz * atras - ux * sd * lado); pos.y = Math.max(pos.y, height(pos.x, pos.z) + 0.5);
    const dir = pos.clone().sub(look), L = dir.length(); dir.divideScalar(L);
    const hit = physics.castRay(new RAPIER.Ray(look, dir), L + 0.35, true, undefined, undefined, pCol), free = hit ? (hit.timeOfImpact ?? hit.toi) : L + 0.35;
    const cara = ((pos.x - A.x) * fx + (pos.z - A.z) * fz) / (Math.hypot(pos.x - A.x, pos.z - A.z) || 1); // 1: la cámara queda justo frente a quien habla
    const score = Math.min(1, free / (L + 0.35)) * 4 + cara - camera.position.distanceTo(pos) * 0.05;
    if (!best || score > best.score) best = { score, pos, dir, L, free };
  }
  if (best.free < best.L + 0.35) { if (best.free - 0.35 < best.L * 0.8) return; best.pos.copy(look).addScaledVector(best.dir, best.free - 0.35); } // un tronco o un muro a la espalda: la cámara se acerca un poco; si no cabe, no hay plano
  plano = { pos: best.pos, look };
}
function planoOlla(a) { // los dos lado a lado junto a la olla: la cámara se pone al frente, al otro lado de la olla, y se les ven las caras y las manos
  const q = pp(), fx = Math.sin(a.face), fz = Math.cos(a.face), mx = (a.x + q.x) / 2, mz = (a.z + q.z) / 2, look = V3(mx + fx * 0.25, q.y - FEET + 0.88, mz + fz * 0.25); // algo bajo, para que la olla quede a la vista sobre el cuadro del diálogo
  const pos = V3(mx + fx * 3.3 + fz * 0.95, look.y + 0.8, mz + fz * 3.3 - fx * 0.95); // un poco hacia el lado del fuego: la olla y su vapor quedan entre los dos, sin taparles la cara
  pos.y = Math.max(pos.y, height(pos.x, pos.z) + 0.6);
  const dir = pos.clone().sub(look), L = dir.length(); dir.divideScalar(L); const desde = look.clone().addScaledVector(dir, 0.95); // pasada la olla
  const hit = physics.castRay(new RAPIER.Ray(desde, dir), L - 0.6, true, undefined, undefined, pCol), free = hit ? (hit.timeOfImpact ?? hit.toi) + 0.95 : L + 0.35;
  if (free < L + 0.35) { if (free - 0.35 < L * 0.65) return; pos.copy(look).addScaledVector(dir, free - 0.35); } // algo estorba: más cerca; si no cabe, se queda el plano que había
  plano = { pos, look };
}
function charla(a, gira) { // empieza una conversación con alguien del mundo: se miran a la cara y la cámara los encuadra
  plano = null; if (!a) return;
  const cuerpo = gira && a.mode !== 'cook'; abrePlano(a, cuerpo); // la que está revolviendo la olla no la suelta: solo vuelve la cabeza
  const B = cabeza(boy); a.habla = { x: B.x, y: B.y, z: B.z, cuerpo }; if (cuerpo && a.mode === 'work' && a.face0 === undefined) a.face0 = a.face; // quien trabajaba vuelve después a lo suyo
}
function chase() { // dónde debe estar la cámara de juego: detrás del personaje, sin atravesar troncos ni rocas
  const t = pp(), cp = Math.cos(cam.pitch), d = { x: Math.sin(cam.yaw) * cp, y: Math.sin(cam.pitch), z: Math.cos(cam.yaw) * cp };
  const hit = physics.castRay(new RAPIER.Ray({ x: t.x, y: t.y + 0.75, z: t.z }, d), cam.dist, true, undefined, undefined, pCol);
  const dist = hit ? Math.max(0.9, (hit.timeOfImpact ?? hit.toi) - 0.3) : cam.dist;
  const x = t.x + d.x * dist, z = t.z + d.z * dist;
  return [V3(x, Math.max(t.y + 0.75 + d.y * dist, height(x, z) + 0.5), z), V3(t.x, t.y + 0.75, t.z)];
}
function updateCamera(dt) {
  const [pos, look] = chase(), on = !!(talk && plano);
  planoK = Math.max(0, Math.min(1, planoK + (on ? dt / 0.8 : -dt / 0.65)));
  const k = ease(planoK), cerrado = Math.min(FOV_JUEGO, Math.max(FOV_CHARLA, 2 * Math.atan(0.55 / camera.aspect) * 180 / Math.PI)), fov = FOV_JUEGO + (cerrado - FOV_JUEGO) * k; // en una pantalla angosta el lente cierra menos, para que quepan los dos
  if (k > 0 && plano) { pos.lerp(plano.pos, k); look.lerp(plano.look, k); } else if (!on) plano = null;
  if (on && planoK === 1 && talk.gira && !talk.detras) { talk.detras = true; const d = player.facing - Math.PI - cam.yaw; cam.yaw += Math.atan2(Math.sin(d), Math.cos(d)); } // al terminar, la cámara vuelve a quedar a su espalda, mirando a quien le hablaba
  // Apuntando con el arco: la cámara se pone sobre el hombro derecho, el que lleva la cuerda atrás, bien cerca (como al
  // levantar un arma en un juego de disparos), y cierra un poco el lente. De tan cerca, el arco se ve adelante, a la izquierda. La mira del centro
  // de la pantalla marca hacia dónde va la flecha.
  apK = Math.max(0, Math.min(1, apK + (acc.apunta ? dt / 0.2 : -dt / 0.24))); let lente = fov;
  if (!acc.apunta && cam.pitch < -0.25) cam.pitch += (-0.25 - cam.pitch) * Math.min(1, dt * 6); // al soltar, la cámara vuelve a su altura de siempre
  if (apK > 0) { const ka = ease(apK), t = pp(), cp = Math.cos(cam.pitch), dx = Math.sin(cam.yaw) * cp, dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * cp, rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const ap = V3(t.x + rx * CAM_ARCO[0] + dx * CAM_ARCO[2], t.y + CAM_ARCO[1] + dy * CAM_ARCO[2], t.z + rz * CAM_ARCO[0] + dz * CAM_ARCO[2]); ap.y = Math.max(ap.y, height(ap.x, ap.z) + 0.3);
    pos.lerp(ap, ka); look.lerp(V3(ap.x - dx * 12, ap.y - dy * 12, ap.z - dz * 12), ka); lente = fov + (FOV_ARCO - 7 * suave(0, 1, acc.tensa) - fov) * ka; look.y += retro * 0.28 * ka; } // al tensar, el lente cierra un poco más; al soltar, el arco da un golpe hacia arriba
  retro = Math.max(0, retro - dt * 5); const cerca = apK > 0.3 ? 0.05 : 0.2; // apuntando, las manos quedan muy cerca de la cámara
  if (camera.fov !== lente || camera.near !== cerca) { camera.fov = lente; camera.near = cerca; camera.updateProjectionMatrix(); }
  camera.position.lerp(pos, apK >= 1 ? 1 : Math.min(1, dt * (9 + apK * 40))); camera.lookAt(look);
}

// ---------- observar: la cámara se acerca sola al objeto, lo encuadra, toma la foto y vuelve ----------
let focus = null;
// luz suave que acompaña a la cámara al observar algo de cerca, para que se vea aunque esté a la sombra
const lamp = new THREE.PointLight(0xfff2dc, 0, 9, 1.4); scene.add(lamp);
const ease = (k) => k * k * (3 - 2 * k);
function startFocus(c) {
  plano = null; planoK = 0;
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
  } else { f.t = Math.min(1, f.t + dt / 0.7); const k = ease(f.t), [pos, look] = chase(); camera.position.lerpVectors(f.pos, pos, k); camera.fov = f.fov + (f.sf - f.fov) * k; camera.lookAt(tv.lerp(look, k)); if (k > 0.5) boy.g.visible = true; if (f.t >= 1) { camera.fov = f.sf; focus = null; document.body.classList.remove('talking'); if (f.c.id === 'tallado') relato(); } }
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
const acc = createActions({ world, ui, snd, scene, hint, murmur, player, tecla: (a) => keyName(opts.keys[a]), guiar: (g) => setGuia(g, 'jugador'), choca: (a, b) => { const d = V3().subVectors(b, a), L = d.length(); if (L < 1e-6) return null; d.divideScalar(L); const hit = physics.castRay(new RAPIER.Ray(a, d), L, true, undefined, undefined, pCol); return hit ? V3().copy(a).addScaledVector(d, hit.timeOfImpact ?? hit.toi) : null; }, /* choca: ¿la flecha da con algo sólido entre a y b? */ story, pinones: () => [got, world.items.length], sanar: (n) => { vida = Math.min(100, vida + n); },
  place: (x, z, facing) => { setPos(x, height(x, z) + FEET + 0.05, z); player.vy = 0; player.speed = 0; player.facing = facing; },
  speak: (name, lines, done, gestos) => { const who = world.life.actors.find((a) => a.name && a.name.toLowerCase() === name.toLowerCase()) || null, gira = !!who && !who.quieto && !acc.sitting; // quien habla, si está en el mundo; el que está mirando el valle no se da vuelta
    talk = { name, lines, i: 0, done: done || null, who, gira, gestos: gestos || null }; charla(who, gira); sigue(); if (cuerpo && who) cuerpo.habla = 0.9; },
  ripple: (x, z) => { const r = ripples[ripI++ % ripples.length]; r.position.set(x, WATER_Y + 0.03, z); r.userData.t = 0; r.visible = true; } });
const explorer = createExplorer({ world, ui }); explorer.urgent = (id) => acc.wants(id);
for (const i of acc.pins) { const it = world.items[i]; if (it && !it.taken) { it.taken = true; it.mesh.visible = false; got++; if (acc.f.m1 === 1) ui.addItem('pinon'); } } // piñones recogidos en una sesión anterior
// ---------- línea de guía: de donde estás hasta un destino, por los senderos cuando conviene ----------
// El destino puede ser un punto marcado en el mapa, una persona o una misión (entonces apunta a donde toque ir ahora).
// La línea parte siempre de Leftraru: a medida que avanza, lo recorrido deja de dibujarse.
let guia = null, guiaT = null, guiaVia = false, guiaNo = null; // guiaNo: la misión de la historia a la que el jugador le quitó la guía (no se le vuelve a poner sola)
// ---------- el casillero del arco, sobre los botones de abajo a la derecha ----------
// Aparece cuando Leftraru ya tiene el arco. Arriba, el arco (en la mano o guardado) con las flechas que quedan: un clic lo saca
// o lo guarda. Abajo, hacer una flecha: dice lo que pide y lo que llevas; si falta algo, queda marcado en el mapa dónde buscarlo.
let armaFirma = null;
$('arma-arco').addEventListener('click', () => { if (state === 'play' && !talk) acc.equipar(); });
$('arma-hacer').addEventListener('click', () => { if (state === 'play' && !talk) acc.hacerFlecha(); });
function updateArma() {
  const a = acc.arma, firma = a.tiene ? `${a.eq}|${a.flechas}|${a.quila}|${a.pluma}` : ''; if (firma === armaFirma) return; armaFirma = firma;
  $('arma').classList.toggle('hay', a.tiene); if (!a.tiene) return;
  const cuantas = (n, una, varias) => `${n} ${n === 1 ? una : varias}`, lleno = a.flechas >= a.tope;
  $('arma-arco').classList.toggle('on', a.eq); $('arma-arco').classList.toggle('sin', !a.flechas); $('arma-estado').textContent = a.eq ? 'en la mano' : 'guardado'; $('arma-n').textContent = a.flechas; $('arma-nt').textContent = a.flechas === 1 ? 'flecha' : 'flechas';
  $('arma-llevas').innerHTML = lleno ? 'Ya llevas todas las que caben' : `Llevas <span class="${a.quila ? '' : 'falta'}">${cuantas(a.quila, 'caña', 'cañas')}</span> y <span class="${a.pluma ? '' : 'falta'}">${cuantas(a.pluma, 'pluma', 'plumas')}</span>`;
  $('arma-hacer').classList.toggle('no', lleno || !a.quila || !a.pluma);
}
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
  const p = pp(), gl = state === 'play' && !focus && !talk ? ui.goals : [];
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
  if (helada) { vida -= 5 * dt; if (!frio) hint('El agua está helada: no te quedes mucho rato adentro.', 6); } else vida = Math.min(100, vida + dt * (acc.sitting ? 5 : acc.abrigado ? 3 : 1.2));
  frio = helada;
  if (vida <= 0) { vida = 0; desmayo = 3; $('velo').classList.add('on'); }
  const v = Math.round(vida); if (v !== vidaVista) { vidaVista = v; $('vida-bar').style.width = `${v}%`; $('vida-n').textContent = v; $('estado').classList.toggle('poca', v < 30); acc.vida = v; }
}
drawKeys(); applySkills();
await assets.whenLoaded(); bar(1, 'Listo'); assets.onProgress = null; $('loading').classList.add('hide'); setTimeout(() => $('loading').remove(), 700);
window.__g = { CAM_ARCO, get VM() { return VM; }, rehaceManos() { const C = cuerpo, v = C.manos; scene.remove(v.g); C.manos = haceManos(CARA_LEFTRARU.piel); scene.add(C.manos.g); }, rodar, get rueda() { return rueda; }, snd, height, ui, explorer, acc, story, toasts, murmur, setGuia, renderer, get vida() { return vida; }, set vida(v) { vida = v; }, camera, abrirPrologo, cerrarPrologo, get prologo() { return prologo; }, get acto() { return acto; }, hojas, cerrarActo, portadaMenu, avanzarPrologo, ayudas, ACTIONS, menuPage, interact, get near() { return near; }, get talk() { return talk; }, get guia() { return guia; }, get guiaT() { return guiaT; }, get tour() { return tour; }, get gesto() { return gesto; }, tourIr, relato, get plano() { return plano; }, get planoK() { return planoK; }, outro, apuntes, sueltaTodo, player, cam, world, pp, get state() { return state; }, get got() { return got; }, cine, enter() { portadaMenu(); coverT = 0; enter(); }, setMenu, opts, get menuOpen() { return menuOpen; }, paused: false, keys,
  tp(x, y, z) { setPos(x, y, z); player.vy = 0; },
  view(x, y, z, lx, ly, lz) { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); world.update(0, time, camera.position, pp()); draw(); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  snap() { draw(); return renderer.domElement.toDataURL('image/jpeg', 0.9); } };

// El cuerpo de Leftraru: un modelo 3D hecho aparte (docs/personaje), con esqueleto y sus movimientos. Es el que se ve.
// El cuerpo armado por código sigue ahí debajo, invisible, llevando el movimiento, los choques y el compás de cada gesto:
// el modelo lo copia. Si el modelo no llega a cargar, o si la dirección del juego lleva ?antiguo, se ve el cuerpo de antes.
// Los movimientos llegan empezando en 0,033 s y, los que se repiten, a veces sin el cuadro que cierra la vuelta: así, en
// cada vuelta el cuerpo se quedaba detenido un instante. Se corren a cero y, si hace falta, se repite el primer cuadro al final.
function lazo(clip, cierra) { let t0 = Infinity, dif = 0; for (const tr of clip.tracks) { t0 = Math.min(t0, tr.times[0]); const n = tr.getValueSize(), L = tr.values.length; if (n === 4) { let d = 0; for (let i = 0; i < 4; i++) d += tr.values[i] * tr.values[L - 4 + i]; dif = Math.max(dif, 1 - Math.abs(d)); } }
  const mas = cierra && dif > 2e-4 ? 1 : 0; // el último cuadro no es igual al primero: falta el que cierra
  for (const tr of clip.tracks) { const n = tr.getValueSize(), T = tr.times, L = tr.values.length, t = new Float32Array(T.length + mas), v = new Float32Array(L + mas * n);
    for (let i = 0; i < T.length; i++) t[i] = T[i] - t0; v.set(tr.values); if (mas) { t[T.length] = t[T.length - 1] + (T.length > 1 ? T[1] - T[0] : 0.033); for (let i = 0; i < n; i++) v[L + i] = tr.values[i]; }
    tr.times = t; tr.values = v; }
  clip.resetDuration(); return clip;
}
// Estar quieto: el movimiento que traen los modelos se balancea mucho (carga el peso a un lado, al otro, se echa atrás).
// De cada hueso se deja la postura media y apenas un resto (k) de ese vaivén, y además va más despacio. Lo que se ve
// moverse es la respiración, un pestañeo y la cabeza cuando mira algo: quieto, pero vivo.
function calma(clip, k) {
  for (const tr of clip.tracks) { const n = tr.getValueSize(), v = tr.values, N = v.length / n, md = new Array(n).fill(0); if (n !== 3 && n !== 4) continue;
    for (let i = 0; i < N; i++) { let sg = 1; if (n === 4) { let d = 0; for (let c = 0; c < 4; c++) d += v[c] * v[i * 4 + c]; if (d < 0) sg = -1; } for (let c = 0; c < n; c++) md[c] += sg * v[i * n + c]; }
    if (n === 4) { const L = Math.hypot(...md) || 1; for (let c = 0; c < 4; c++) md[c] /= L; } else for (let c = 0; c < n; c++) md[c] /= N;
    for (let i = 0; i < N; i++) { if (n === 4) { QA.set(md[0], md[1], md[2], md[3]).slerp(QB.set(v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]), k); v[i * 4] = QA.x; v[i * 4 + 1] = QA.y; v[i * 4 + 2] = QA.z; v[i * 4 + 3] = QA.w; } else for (let c = 0; c < n; c++) v[i * n + c] = md[c] + (v[i * n + c] - md[c]) * k; } }
  return clip;
}
// La cara del modelo es un dibujo, así que el pestañeo y el habla van con piezas chicas puestas encima, pegadas a la cabeza:
// un párpado curvo sobre cada ojo, que baja y sube, y una boca oscura que se abre al hablar. Las medidas (en centímetros,
// en el espacio del hueso de la cabeza) se toman una vez por modelo, apuntando a sus ojos y a su boca: de cada lugar, el centro, las dos puntas, arriba y abajo.
function haceCara(cabeza, OJOS, BOCA, piel) {
  const sitio = (centro, ladoA, ladoB, arr, aba) => { // un lugar de la cara: dónde está, hacia dónde mira, y su ancho y alto
    const sd = V3(...ladoB).sub(V3(...ladoA)), an = sd.length(), up = V3(...arr).sub(V3(...aba)), al = up.length(), n = V3().crossVectors(sd.normalize(), up.normalize()).normalize(); up.crossVectors(n, sd).normalize();
    const g = new THREE.Group(); g.position.set(...centro); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(sd, up, n)); cabeza.add(g);
    return { g, an, al, panza: Math.max(0.6, V3(...centro).sub(V3(...ladoA).add(V3(...ladoB)).multiplyScalar(0.5)).dot(n)) }; }; // panza: cuánto sobresale el centro respecto de las puntas
  const pielM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), PIEL = new THREE.Color(piel), PESTANA = new THREE.Color(0x1c1410);
  const ojos = OJOS.map((q) => {
    const o = sitio(...q), a = o.an / 2, R = (a * a + o.panza * o.panza) / (2 * o.panza), fi = Math.asin(Math.min(0.98, (a + 0.75) / R)), psi = Math.asin(Math.min(0.9, (o.al / 2 + 0.45) / R)), topY = R * Math.sin(psi);
    const geo = new THREE.SphereGeometry(R, 12, 6, Math.PI / 2 - fi, 2 * fi, Math.PI / 2 - psi, 2 * psi).translate(0, -topY, -R + 0.25), P = geo.attributes.position, C = new Float32Array(P.count * 3); // el borde de arriba queda en cero: al achicarlo a lo alto, el párpado sube
    for (let k = 0; k < P.count; k++) { const c = -P.getY(k) / (2 * topY) > 0.8 ? PESTANA : PIEL; C[k * 3] = c.r; C[k * 3 + 1] = c.g; C[k * 3 + 2] = c.b; } geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); // la orilla de abajo, oscura: las pestañas
    const lid = new THREE.Mesh(geo, pielM); lid.position.y = topY; lid.scale.y = 0.001; lid.visible = false; lid.receiveShadow = true; o.g.add(lid); return lid; });
  const bocaS = sitio(...BOCA);
  const boca = new THREE.Mesh(new THREE.CircleGeometry(1, 18), new THREE.MeshStandardMaterial({ color: 0x3a1a16, roughness: 1 })); boca.position.z = 0.3; boca.scale.set(bocaS.an * 0.33, 0.001, 1); boca.visible = false; boca.receiveShadow = true; bocaS.g.add(boca);
  return { ojos, boca, bocaAlto: bocaS.al * 0.5 };
}
const CARA_LEFTRARU = { ojos: [[[-4.78, 11.75, 11.67], [-7.81, 10.81, 9.37], [-2.4, 11.33, 10.9], [-4.75, 13.08, 11.64], [-4.87, 10.08, 11.37]], [[5.65, 12.2, 10.98], [3.2, 11.84, 10.62], [8.29, 11.53, 8.5], [5.63, 13.6, 10.88], [5.68, 10.58, 10.78]]], boca: [[0.94, 4.16, 13.7], [-2.11, 3.41, 12.7], [4.04, 3.59, 12.18], [0.94, 4.85, 13.64], [0.92, 3.18, 13.4]], piel: 0xb97b59 };
let cuerpo = null; // { mixer, acciones, H: huesos, peso }
const QUIETUD = 0.035; // cuánto queda del vaivén del movimiento de estar quieto (0 nada, 1 todo)
const UNA_VEZ = ['salta', 'recoge', 'bebe', 'rueda']; // movimientos que no se repiten: se recorren al compás de lo que pasa en el juego
const TRAMO = { salta: [0.25, 0.75], recoge: [0.1, 0.3], bebe: [0.22, 0.68], rueda: [0.2, 1] }; // qué parte de cada movimiento se usa (los originales traen esperas antes y después): en recoger, bajar la mano y volver; en beber, llevarse el cuenco a la boca y bajarlo
const viejo = boy.g.children.filter((c) => c.isSkinnedMesh), ANTIGUO = new URLSearchParams(location.search).has('antiguo');
if (!ANTIGUO) for (const c of viejo) c.visible = false; // el cuerpo de antes no se ve (si el modelo no carga, vuelve)
if (!ANTIGUO) import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader().load('assets/modelos/leftraru-camina.glb', (gl) => {
  const m = gl.scene; m.updateMatrixWorld(true); { const c0 = new THREE.Box3().setFromObject(m); if (c0.max.z - c0.min.z > c0.max.x - c0.min.x) { m.rotation.y = -Math.PI / 2; m.updateMatrixWorld(true); } } // tiene que mirar de frente (hacia +z), como Leftraru: si viene de costado (más ancho de adelante hacia atrás que de lado a lado), se gira
  const caja = new THREE.Box3().setFromObject(m), s = 1 / (caja.max.y - caja.min.y); // boy.g ya va a escala 1,38: adentro, el modelo mide 1
  m.scale.setScalar(s); m.position.set(-((caja.min.x + caja.max.x) / 2) * s, -caja.min.y * s, -((caja.min.z + caja.max.z) / 2) * s);
  m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
  boy.g.add(m);
  const mixer = new THREE.AnimationMixer(m), acciones = { anda: gl.animations[0] ? mixer.clipAction(lazo(gl.animations[0], true)) : null, quieto: null, corre: null };
  if (acciones.anda) { acciones.anda.play(); acciones.anda.setEffectiveWeight(0); }
  // Quieto y correr vienen aparte, en archivos chicos que solo traen cómo se mueve cada hueso (los saca tools/glb-animacion.mjs):
  // así el modelo, con su textura, se descarga una sola vez.
  for (const k of ['quieto', 'corre', 'salta', 'recoge', 'bebe', 'rueda']) fetch(`assets/modelos/leftraru-${k}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!d) return;
    if (k === 'rueda') for (const q of d.pistas) if (q.que === 'lugar') for (let i = 0; i < q.v.length; i += 3) { q.v[i] = q.v[0]; q.v[i + 2] = q.v[2]; } // al rodar, el avance lo pone el juego: del movimiento queda solo cuánto sube y baja la cadera
    if (k === 'salta') d.pistas = d.pistas.filter((q) => q.que === 'giro'); // en el salto, la altura la pone el juego: del movimiento se usa solo la postura
    const clip = new THREE.AnimationClip(k, d.dura, d.pistas.map((q) => (q.que === 'giro' ? new THREE.QuaternionKeyframeTrack(`${q.hueso}.quaternion`, q.t, q.v) : new THREE.VectorKeyframeTrack(`${q.hueso}.position`, q.t, q.v))));
    if (k === 'quieto') calma(clip, QUIETUD);
    acciones[k] = mixer.clipAction(lazo(clip, !UNA_VEZ.includes(k))); acciones[k].play(); acciones[k].setEffectiveWeight(0); if (UNA_VEZ.includes(k)) acciones[k].paused = true; if (k === 'quieto') acciones[k].timeScale = 0.55; }).catch(() => { /* sin ese movimiento, sigue con los que tenga */ });
  const H = {}; for (const n of ['RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'Spine', 'Spine02', 'neck', 'Head']) H[n] = m.getObjectByName(n); // los huesos que se mueven a mano
  const { ojos, boca, bocaAlto } = haceCara(H.Head, CARA_LEFTRARU.ojos, CARA_LEFTRARU.boca, CARA_LEFTRARU.piel);
  // el arco, cuando lo tensa: va en su mano izquierda, de pie y apuntando hacia donde mira
  const arcoN = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.011, 5, 18, Math.PI * 0.5).rotateZ(-Math.PI * 0.25).rotateY(-Math.PI / 2).translate(0, 0, -0.6), new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 })); arcoN.visible = false; arcoN.castShadow = true; arcoN.rotation.order = 'YXZ'; scene.add(arcoN); boy.sinArco = true;
  const puesta = new THREE.Mesh(flechaGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); puesta.visible = false; scene.add(puesta); // la flecha puesta en el arco, antes de soltarla
  const cuerda = new THREE.Group(), hilo = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 4).rotateX(Math.PI / 2).translate(0, 0, 0.5), hiloM = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 1 }); cuerda.add(new THREE.Mesh(hilo, hiloM), new THREE.Mesh(hilo, hiloM)); cuerda.visible = false; scene.add(cuerda); // la cuerda: de una punta del arco a la otra, pasando por donde la lleva la mano
  const manos = haceManos(CARA_LEFTRARU.piel); scene.add(manos.g); // las manos que se ven de cerca al apuntar
  // Mientras se ven esas, los brazos del modelo no se pintan (uFP), pero siguen ahí para la sombra: en el suelo se ve al arquero entero.
  { const vistos = new Set(); m.traverse((o) => { if (!o.isSkinnedMesh) return; const I = o.geometry.attributes.skinIndex, Wt = o.geometry.attributes.skinWeight, a = new Float32Array(I.count), br = new Set(['LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'].map((k) => o.skeleton.bones.findIndex((b) => b.name === k)));
      for (let i = 0; i < I.count; i++) for (let c = 0; c < 4; c++) if (br.has(I.getComponent(i, c))) a[i] += Wt.getComponent(i, c);
      o.geometry.setAttribute('aBrazo', new THREE.BufferAttribute(a, 1)); const mat = o.material; if (vistos.has(mat)) return; vistos.add(mat); const antes = mat.onBeforeCompile;
      mat.onBeforeCompile = (sh, r) => { if (antes) antes(sh, r); sh.uniforms.uFP = uFP; sh.vertexShader = 'attribute float aBrazo;\nvarying float vBrazo;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBrazo = aBrazo;'); sh.fragmentShader = 'uniform float uFP;\nvarying float vBrazo;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (uFP > 0.5 && vBrazo > 0.5) discard;'); };
      mat.customProgramCacheKey = () => 'sin-brazos'; mat.needsUpdate = true; }); }
  cuerpo = { mixer, acciones, H, m, y0: m.position.y, peso: { anda: 0, quieto: 0, corre: 0 }, aire: 0, sienta: 0, atento: 0, junta: 0, tapa: 0, pend: 0, pie: [0, 0], parp: 2, habla: 0, ojos, boca, bocaAlto, arco: arcoN, puesta, cuerda, manos, vmK: 0, pegada: true, palma: { Left: palmaDe(m, H.LeftHand), Right: palmaDe(m, H.RightHand) } }; window.__g.modelo = m; window.__g.cuerpo = cuerpo;
}, undefined, () => { for (const c of viejo) c.visible = true; }));
// ---------- la gente de la aldea en 3D ----------
// Quien tiene modelo 3D lo lleva encima de su cuerpo de siempre, que queda invisible y sigue decidiendo todo: dónde está, qué
// hace con las manos, hacia dónde mira. El modelo lo copia: las manos van a donde están las manos del cuerpo de siempre (y
// con ellas lo que lleven, como el palo de revolver), la cabeza mira hacia donde mira la otra y el tronco se inclina igual.
// Así todo lo que la persona ya sabía hacer (tejer, revolver la olla, entregar, acariciar) sirve tal cual. De pie queda quieta:
// la postura media de su movimiento de reposo, casi sin vaivén, con los pies juntos y una respiración leve.
// cara: las medidas de sus ojos y su boca, para el pestañeo y los labios (ver haceCara).
// movs: sus otros movimientos (archivos chicos, como los de Leftraru) y cuánto se deja de cada uno: mueve las manos al hablar,
// escucha con atención cuando calla, y camina. paso: a qué velocidad avanza, en metros por segundo, el caminar tal como viene.
const GENTE3D = { Millaray: { archivo: 'millaray', mate: [0.2, 0.3], movs: { habla: 0.6, escucha: 0.35, camina: 1 }, paso: 1.25, cara: { piel: 0x9c6240, boca: [[0.32, 5.6, 9.97], [-3.04, 5.53, 8.32], [3.41, 6.13, 7.86], [0.29, 6.28, 10.1], [0.37, 4.7, 9.94]],
  ojos: [[[-4.43, 11.85, 7.51], [-6.58, 11.64, 6.26], [-2.42, 11.62, 6.95], [-4.49, 12.86, 7.44], [-4.36, 10.77, 7.58]], [[3.62, 12.47, 6.9], [1.75, 11.93, 6.68], [5.7, 12.5, 5.39], [3.55, 13.48, 6.76], [3.69, 11.39, 6.91]]] } } }, gente3d = [];
if (!ANTIGUO) import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => { for (const a of world.life.actors) { const def = GENTE3D[a.name]; if (!def) continue;
  new GLTFLoader().load(`assets/modelos/${def.archivo}.glb`, (gl) => {
    const m = gl.scene; m.updateMatrixWorld(true); const caja = new THREE.Box3().setFromObject(m), e = 1 / (caja.max.y - caja.min.y); // a.g ya va a la escala de su altura: adentro, el modelo mide 1
    m.scale.setScalar(e); m.position.set(-((caja.min.x + caja.max.x) / 2) * e, -caja.min.y * e, -((caja.min.z + caja.max.z) / 2) * e);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
    // mate: el dibujo de este modelo trae luces y brillos pintados (viene de una imagen con luz de estudio). Lo más claro se
    // baja, para que las luces y sombras que se le vean sean las del lugar: [desde qué claridad, cuánto queda de ahí para arriba].
    if (def.mate) m.traverse((o) => { if (o.isMesh) { o.material.roughness = 1; o.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
{ float cl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); if (cl > ${def.mate[0].toFixed(3)}) diffuseColor.rgb *= (${def.mate[0].toFixed(3)} + (cl - ${def.mate[0].toFixed(3)}) * ${def.mate[1].toFixed(3)}) / cl; }`); }; } });
    for (const c of a.g.children) if (c.isSkinnedMesh) c.visible = false; // el cuerpo de siempre deja de verse
    a.g.add(m);
    const mixer = new THREE.AnimationMixer(m), mov = {}; let quieta = null; if (gl.animations[0]) { quieta = mixer.clipAction(lazo(calma(gl.animations[0], QUIETUD), true)); quieta.timeScale = 0.55; quieta.play(); }
    for (const k in def.movs || {}) fetch(`assets/modelos/${def.archivo}-${k}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!d) return;
      const clip = new THREE.AnimationClip(k, d.dura, d.pistas.map((q) => (q.que === 'giro' ? new THREE.QuaternionKeyframeTrack(`${q.hueso}.quaternion`, q.t, q.v) : new THREE.VectorKeyframeTrack(`${q.hueso}.position`, q.t, q.v))));
      if (def.movs[k] < 1) calma(clip, def.movs[k]); mov[k] = mixer.clipAction(lazo(clip, true)); mov[k].play(); mov[k].setEffectiveWeight(0); }).catch(() => { /* sin ese movimiento, sigue con los que tenga */ });
    const H = {}; for (const n of ['RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'Spine02', 'neck', 'Head', 'headfront']) H[n] = m.getObjectByName(n);
    const P = { a, m, mixer, H, quieta, mov, w: { habla: 0, escucha: 0, camina: 0 }, paso: def.paso || 1.2, y0: m.position.y, pie: [0, 0], junta: 0, brazo: [0, 0], frente: H.headfront ? H.headfront.position.clone().normalize() : V3(0, 0, 1), fase: Math.random() * 6, parp: 1 + Math.random() * 3, habla: 0 }; // frente: hacia dónde mira la cara, en el espacio del hueso de la cabeza
    if (def.cara) Object.assign(P, haceCara(H.Head, def.cara.ojos, def.cara.boca, def.cara.piel));
    a.c3 = P; gente3d.push(P); window.__g.gente3d = gente3d;
  }); } });
// El cuerpo nuevo, cuadro a cuadro. Tres capas:
// 1. Según la velocidad se mezclan estar quieto, caminar y correr, y cada paso va al ritmo de lo que avanza.
// 2. Los movimientos de una sola vez (saltar, agacharse a recoger, beber) se recorren al compás del juego y tapan lo anterior.
// 3. Los gestos de brazos y piernas que no tienen movimiento propio se hacen a mano: se apunta cada hueso hacia donde debe ir.
const EJE_Y = V3(0, 1, 0), QA = new THREE.Quaternion(), QB = new THREE.Quaternion(), QC = new THREE.Quaternion(), QD = new THREE.Quaternion(), QF = new THREE.Quaternion(), QR = new THREE.Quaternion(), CARA = V3(0.059, 0.322, 0.945).normalize(), VA = V3(), VC = V3(), VD = V3(), PA = V3(), PB = V3(), PC = V3(), PD = V3(), PE = V3(), PF = V3(), PG = V3();
function tuerce(hueso, R, k) { // le suma al hueso un giro R dado en el mundo (k: cuánto de ese giro), sin cambiarle lo demás
  if (!hueso || k <= 0) return; hueso.parent.updateWorldMatrix(true, false); const qp = hueso.parent.getWorldQuaternion(QA); QB.identity().slerp(R, Math.min(1, k));
  hueso.quaternion.premultiply(QC.copy(qp).invert().multiply(QB).multiply(qp)); hueso.updateMatrixWorld(true);
}
const suave = (a, b, v) => { const q = Math.min(1, Math.max(0, (v - a) / (b - a))); return q * q * (3 - 2 * q); };
function apunta(hueso, x, y, z, k) { // gira el hueso para que apunte hacia (x, y, z) del mundo; k: cuánto (0 nada, 1 del todo)
  if (!hueso || k <= 0) return; hueso.parent.updateWorldMatrix(true, false);
  QB.setFromUnitVectors(EJE_Y, VA.set(x, y, z).applyQuaternion(hueso.parent.getWorldQuaternion(QA).invert()).normalize()); hueso.quaternion.slerp(QB, Math.min(1, k)); hueso.updateMatrixWorld(true);
}
function updateCuerpo(dt) {
  const v = player.speed, A = cuerpo.acciones, W = cuerpo.peso, H = cuerpo.H, h = acc.hace, jugando = state === 'play';
  // 2. qué movimiento de una sola vez toca, y por dónde va (0 a 1; −1 si no toca)
  cuerpo.aire = jugando && !player.grounded ? cuerpo.aire + dt : 0;
  const va = { salta: cuerpo.aire > 0.05 ? Math.min(1, cuerpo.aire / 0.75) : -1, recoge: h && (h.tipo === 'recoger' || h.tipo === 'cargar') ? h.t / h.dur : -1, bebe: h && h.tipo === 'beber' ? h.t / h.dur : gesto && gesto.tipo === 'come' ? gesto.t / gesto.dur : -1, rueda: rueda ? rueda.t / rueda.dur : -1 };
  let tapa = 0;
  for (const k of UNA_VEZ) { const a = A[k]; if (!a) continue; const on = va[k] >= 0; W[k] = (W[k] || 0) + ((on ? 1 : 0) - (W[k] || 0)) * Math.min(1, dt * 10); a.setEffectiveWeight(W[k]);
    if (on) a.time = (TRAMO[k][0] + (TRAMO[k][1] - TRAMO[k][0]) * Math.min(1, va[k])) * a.getClip().duration; tapa = Math.max(tapa, W[k]); }
  // 1. quieto, caminar y correr
  // El movimiento de caminar que trae el modelo avanza a 0,6 m por segundo y el de correr a 5,1. Leftraru se mueve a 3,3 y a
  // 6,2. Para que los pies no patinen, cada uno va a la velocidad que corresponde y se pasa del paso al trote muy temprano:
  // a 3,3 va trotando despacio y a 6,2 corre de verdad.
  cuerpo.tapa = tapa;
  const corre = A.corre ? suave(1.0, 2.6, v) : 0, quieto = A.quieto ? Math.min(1, Math.max(0, 1 - v / 0.6)) : 0;
  const meta = { corre: corre * (1 - quieto), quieto, anda: (1 - corre) * (A.quieto ? 1 - quieto : Math.min(1, v / 0.8)) };
  for (const k in meta) { W[k] += (meta[k] - W[k]) * Math.min(1, dt * 8); if (A[k]) A[k].setEffectiveWeight(W[k] * (1 - tapa)); }
  if (A.anda) A.anda.timeScale = Math.min(2.2, Math.max(0.7, v / 0.62)); if (A.corre) A.corre.timeScale = Math.min(1.45, Math.max(0.6, v / 5.1));
  cuerpo.mixer.update(dt);
  if (H.Spine02 && W.quieto > 0.05) { const b = Math.sin(time * 1.3) * 0.014 * W.quieto; H.Spine02.rotateX(b); if (H.neck) H.neck.rotateX(-b); } // quieto, respira: el pecho se mueve apenas y la cabeza se queda en su lugar
  pisa(cuerpo, dt, { suelo: pp().y - FEET, apoyado: player.grounded && !acc.sitting && !rueda && state !== 'title', f: player.facing, quieto: (W.quieto || 0) * (1 - tapa), slope: player.slope, h: boy.h });
  // 3. a mano. Adelante (fx, fz), a su derecha (rx, rz) y arriba.
  const f = player.facing; let fx = Math.sin(f), fz = Math.cos(f), rx = -fz, rz = fx;
  const brazo = (lado, ad, arr, cos, ad2, arr2, cos2, k) => { const sg = lado === 'Right' ? 1 : -1; apunta(H[lado + 'Arm'], fx * ad + rx * cos * sg, arr, fz * ad + rz * cos * sg, k); apunta(H[lado + 'ForeArm'], fx * ad2 + rx * cos2 * sg, arr2, fz * ad2 + rz * cos2 * sg, k); }; // hacia dónde van el brazo y el antebrazo: cuánto adelante, arriba y al costado
  const env = h ? suave(0, 0.35, h.t / h.dur) * (1 - suave(0.7, 1, h.t / h.dur)) : 0;
  // Parado, los brazos no quedan tiesos: se mecen apenas adelante y atrás, como un péndulo lento, cada uno a su tiempo y el
  // antebrazo un poco después que el brazo. (Con algo entre manos, sentado o apuntando, no.)
  cuerpo.pend += ((h || gesto || acc.sitting || entrega.alza > 0 || apK > 0 || !jugando ? 0 : (W.quieto || 0) * (1 - tapa)) - cuerpo.pend) * Math.min(1, dt * 2.5);
  if (cuerpo.pend > 0.01) for (const [l, fase, k] of [['Right', 0, 1], ['Left', 2.3, acc.equipado ? 0 : 0.85]]) { if (!k) continue; const a = cuerpo.pend * k, w = time * 1.15 + fase; VC.set(rx, 0, rz);
    tuerce(H[l + 'Arm'], QR.setFromAxisAngle(VC, Math.sin(w) * 0.05 * a), 1); tuerce(H[l + 'ForeArm'], QR.setFromAxisAngle(VC, (Math.sin(w - 0.7) * 0.035 - 0.02) * a), 1); }
  if (gesto && gesto.yo) brazo('Right', 0.9, -0.25, 0.15, 1, 0.05, 0, gesto.yo);                       // entregar o recibir: la mano adelante
  if (h && h.tipo === 'alcanzar') brazo('Right', 0.9, 0.1, 0.1, 1, 0.15, 0, env);                         // estirar la mano a la altura del pecho
  if (h && h.tipo === 'saludar') brazo('Right', 0.3, 0.9, 0.25, 0.1, 1, 0, env);                          // la mano en alto
  if (entrega.alza > 0) { const k = entrega.alza, w = entrega.vuelca * (0.16 + Math.sin(time * 9) * 0.05); for (const l of ['Right', 'Left']) brazo(l, 0.8, -0.45, 0.24, 0.9, 0.16 - w, -0.22, k); } // el canasto entre las dos manos, adelante; al echar los piñones, las baja un poco
  if (h && h.tipo === 'verter') { brazo('Right', 0.7, -0.5, 0.2, 0.9, -0.2, 0, env); brazo('Left', 0.7, -0.5, 0.2, 0.9, -0.2, 0, env); } // las dos manos adelante y abajo
  if (h && h.tipo === 'labrar') { const w = Math.sin(time * 11) * 0.07; brazo('Right', 0.55, -0.62, 0.1, 0.75, 0.1 + w, -0.55, env); brazo('Left', 0.55, -0.62, 0.1, 0.75, 0.1 - w, -0.55, env); } // haciendo una flecha: las dos manos juntas adelante, trabajando
  cuerpo.sienta += ((acc.sitting ? 1 : 0) - cuerpo.sienta) * Math.min(1, dt * 5);                          // sentado: los muslos adelante y las canillas hacia abajo
  if (cuerpo.sienta > 0.02) for (const l of ['Right', 'Left']) { apunta(H[l + 'UpLeg'], fx, -0.12, fz, cuerpo.sienta); apunta(H[l + 'Leg'], fx * 0.15, -1, fz * 0.15, cuerpo.sienta); }
  // La mirada: la cabeza y el cuello se vuelven hacia donde mira (la cámara, o la cara de quien le habla).
  const my = player.miraY || 0, mx = player.miraX || 0;
  // Conversando pone atención: la cabeza deja el vaivén de estar parado y queda quieta, de frente a la cara del otro.
  cuerpo.atento += ((talk && talk.who && !acc.sitting && state === 'play' ? 1 : 0) - cuerpo.atento) * Math.min(1, dt * 5);
  const cp = Math.cos(mx), a2 = f + my, at = cuerpo.atento; VD.set(Math.sin(a2) * cp, -Math.sin(mx) - entrega.vuelca * 0.55 - (h && h.tipo === 'labrar' ? env * 0.45 : 0), Math.cos(a2) * cp).normalize(); // hacia dónde mira (echando los piñones, a la olla)
  if (!acc.sitting && at < 0.98 && Math.abs(my) + Math.abs(mx) > 0.01) { QR.setFromUnitVectors(VC.set(fx, 0, fz), VD); tuerce(H.neck, QR, 0.4 * (1 - at)); tuerce(H.Head, QR, 0.6 * (1 - at)); }
  if (at > 0.02) for (const [hueso, k] of [[H.neck, 0.4], [H.Head, 1]]) { QR.setFromUnitVectors(VC.copy(CARA).applyQuaternion(H.Head.getWorldQuaternion(QD)).normalize(), VD); tuerce(hueso, QR, k * at); }
  // El pestañeo: cada tanto los párpados bajan y suben en un quinto de segundo.
  cuerpo.parp -= dt; if (cuerpo.parp < -0.2) cuerpo.parp = 2.2 + Math.random() * 3.8;
  const cierra = cuerpo.parp < 0 ? Math.sin(Math.min(1, -cuerpo.parp / 0.2) * Math.PI) : 0; for (const o of cuerpo.ojos) { o.scale.y = Math.max(0.001, cierra); o.visible = cierra > 0.03; }
  // Los labios: se mueven mientras dice algo (cuerpo.habla: los segundos que le quedan hablando).
  cuerpo.habla = Math.max(0, cuerpo.habla - dt); const abre = cuerpo.habla > 0 ? 0.2 + 0.8 * Math.abs(Math.sin(time * 14)) * (0.45 + 0.55 * Math.abs(Math.sin(time * 5.1 + 1))) : 0;
  cuerpo.boca.visible = abre > 0.03; cuerpo.boca.scale.y = Math.max(0.001, cuerpo.bocaAlto * abre);
  // El arco, en la mano izquierda mientras lo tensa.
  armaArco(dt, f, h);
}
// Los pies siguen el suelo. Bajo cada pie se mira cuánto más arriba o más abajo queda el terreno respecto de donde está parado
// el personaje: la cadera baja lo justo para que el pie de más abajo alcance a pisar, y el otro se recoge doblando la rodilla.
// En una cuesta, además, el cuerpo se echa un poco hacia adelante o hacia atrás.
// Y parado: el movimiento de estar quieto que trae el modelo deja un pie bien adelante y el otro atrás, como a medio paso.
// Se juntan (junta), para que quede parado derecho, y la cadera sube apenas para que las rodillas no queden dobladas.
function pisa(C, dt, o) { // C: el cuerpo 3D; o: la altura del suelo donde está parado, si está apoyado, hacia dónde mira (f), cuánto está quieto, la pendiente y su altura (h)
  const H = C.H, m = C.m, suelo = o.suelo, apoyado = o.apoyado, d = [0, 0], fx = Math.sin(o.f), fz = Math.cos(o.f);
  if (apoyado) ['Left', 'Right'].forEach((l, i) => { const a = H[l + 'Foot'].getWorldPosition(PA); d[i] = Math.max(-0.4, Math.min(0.4, height(a.x, a.z) - suelo)); });
  for (let i = 0; i < 2; i++) C.pie[i] += (d[i] - C.pie[i]) * Math.min(1, dt * 14);
  C.junta += ((apoyado ? o.quieto * 0.72 : 0) - C.junta) * Math.min(1, dt * 8);
  const junta = C.junta, baja = Math.min(C.pie[0], C.pie[1], 0) + junta * 0.045;
  m.position.y = C.y0 + baja / o.h; m.rotation.x += ((apoyado ? Math.max(-0.14, Math.min(0.2, (o.slope || 0) * 0.3)) : 0) - m.rotation.x) * Math.min(1, dt * 6);
  if (junta < 0.02 && Math.abs(C.pie[0]) + Math.abs(C.pie[1]) < 0.012) return; // en lo plano y andando no hay nada que corregir
  m.updateMatrixWorld(true);
  ['Left', 'Right'].forEach((l, i) => { const sube = C.pie[i] - baja; if (junta < 0.02 && Math.abs(sube) < 0.008) return; // este pie queda donde lo dejó el movimiento
    const pie = H[l + 'Foot'], cad = H[l + 'UpLeg'].getWorldPosition(PA), rod = H[l + 'Leg'].getWorldPosition(PB), tob = pie.getWorldPosition(PC), L1 = cad.distanceTo(rod), L2 = rod.distanceTo(tob); pie.getWorldQuaternion(QF);
    const T = PD.copy(tob); T.y += sube; if (junta > 0) { const ad = (tob.x - cad.x) * fx + (tob.z - cad.z) * fz; T.x -= fx * ad * junta; T.z -= fz * ad * junta; } // dónde debe quedar el tobillo
    const eje = PE.copy(T).sub(cad), dist = Math.min(L1 + L2 - 0.004, Math.max(0.05, eje.length())); eje.normalize();
    const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const polo = PF.copy(rod).sub(cad); polo.x += fx * 0.05; polo.z += fz * 0.05; polo.addScaledVector(eje, -polo.dot(eje)).normalize(); // la rodilla dobla hacia donde ya doblaba (y, ante la duda, hacia adelante)
    const nr = PG.copy(cad).addScaledVector(eje, a).addScaledVector(polo, hh); // dónde queda la rodilla
    tuerce(H[l + 'UpLeg'], QR.setFromUnitVectors(VC.copy(rod).sub(cad).normalize(), VD.copy(nr).sub(cad).normalize()), 1);
    const rod2 = H[l + 'Leg'].getWorldPosition(PB), tob2 = pie.getWorldPosition(PC);
    tuerce(H[l + 'Leg'], QR.setFromUnitVectors(VC.copy(tob2).sub(rod2).normalize(), VD.copy(T).sub(rod2).normalize()), 1);
    pie.quaternion.copy(pie.parent.getWorldQuaternion(QA).invert()).multiply(QF); pie.updateMatrixWorld(true); // el pie conserva la postura que traía: no se ladea con la pierna
  });
}
// El arco en las manos. Guardado no se ve. En la mano y sin apuntar, Leftraru lo lleva en la izquierda, con el brazo algo
// doblado, y así camina y corre. Apuntando, la cámara está en sus ojos y las manos se ponen donde la cámara las ve: la
// izquierda sostiene el arco adelante; la derecha lleva la cuerda, con la flecha, hacia atrás mientras se mantiene apretado
// el botón; al soltar, la cuerda vuelve de golpe y la mano baja a buscar otra flecha.
const TIP = 0.424, PANZA = 0.176, PN = V3(), PW = V3(); // el arco: de la empuñadura a cada punta, hacia arriba y hacia atrás
function cuerdaPor(C, p) { // la cuerda pasa por p (o va derecha de punta a punta)
  C.arco.updateMatrixWorld(true); const a = C.arco.localToWorld(PA.set(0, TIP, -PANZA)), b = C.arco.localToWorld(PB.set(0, -TIP, -PANZA)), m = p || PC.copy(a).lerp(b, 0.5);
  [a, b].forEach((q, i) => { const t = C.cuerda.children[i]; t.position.copy(q); t.lookAt(m); t.scale.z = q.distanceTo(m); });
}
// Las manos de los modelos no tienen dedos que se muevan: son planas, abiertas. Para que parezca que agarran, se las gira:
// los dedos hacia un lado y la palma hacia otro. palmaDe averigua, una vez, hacia dónde mira la palma en cada mano.
function palmaDe(m, hueso) { // las manos vienen medio cerradas: la palma mira hacia donde se curvan los dedos (la punta de la mano, respecto de su base)
  let sk = null; m.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; }); const bi = sk && hueso ? sk.skeleton.bones.indexOf(hueso) : -1; if (bi < 0) return V3(0, 0, 1);
  const P = sk.geometry.attributes.position, I = sk.geometry.attributes.skinIndex, W = sk.geometry.attributes.skinWeight, inv = sk.skeleton.boneInverses[bi], v = V3(), pts = []; let largo = 0;
  for (let i = 0; i < P.count; i++) { let w = 0; for (let c = 0; c < 4; c++) if (I.getComponent(i, c) === bi) w += W.getComponent(i, c); if (w < 0.6) continue; v.fromBufferAttribute(P, i).applyMatrix4(sk.bindMatrix).applyMatrix4(inv); pts.push(v.x, v.y, v.z); largo = Math.max(largo, v.y); }
  const punta = [0, 0, 0], base = [0, 0, 0]; for (let i = 0; i < pts.length; i += 3) { const q = pts[i + 1] > largo * 0.7 ? punta : pts[i + 1] < largo * 0.38 ? base : null; if (q) { q[0] += pts[i]; q[1] += pts[i + 2]; q[2]++; } }
  if (!punta[2] || !base[2]) return V3(0, 0, 1); const nl = V3(punta[0] / punta[2] - base[0] / base[2], 0, punta[1] / punta[2] - base[1] / base[2]); return nl.lengthSq() > 1e-6 ? nl.normalize() : V3(0, 0, 1);
}
const MB = new THREE.Matrix4(), MC = new THREE.Matrix4(), VX = V3(), VY = V3(), VZ = V3(), EU = new THREE.Euler(0, 0, 0, 'YXZ'), QG = new THREE.Quaternion(), PBW = V3(), VAD = V3(), VDE = V3(), VAR = V3();
function orientaMano(hueso, nl, dedos, palma, k) { // gira la mano para que los dedos vayan hacia «dedos» y la palma mire hacia «palma» (direcciones del mundo); k: cuánto
  if (!hueso || k <= 0) return; const F = VY.copy(dedos).normalize(), Pm = VZ.copy(palma).addScaledVector(F, -palma.dot(F)).normalize(), X = VX.crossVectors(F, Pm);
  MB.makeBasis(X, F, Pm); MC.makeBasis(PE.set(0, 1, 0).cross(nl).normalize(), PF.set(0, 1, 0), nl).transpose(); MB.multiply(MC); // de la mano al mundo
  QR.setFromRotationMatrix(MB); hueso.parent.updateWorldMatrix(true, false); QB.copy(hueso.parent.getWorldQuaternion(QA)).invert().multiply(QR); hueso.quaternion.slerp(QB, Math.min(1, k)); hueso.updateMatrixWorld(true);
}
function armaArco(dt, f, h) {
  const C = cuerpo, H = C.H, eq = acc.equipado && boy.g.visible && state !== 'title', ka = eq ? suave(0.12, 1, apK) : 0; // ka: cuánto están las manos en la postura de apuntar (entra y sale de a poco)
  C.arco.visible = C.cuerda.visible = eq; C.puesta.visible = false; H.Head.scale.setScalar(apK > 0.05 ? 0.001 : 1); // apuntando, la cámara va donde están sus ojos: la cabeza no se dibuja
  if (!eq) return;
  const fx = Math.sin(f), fz = Math.cos(f);
  if (ka < 1 && !(h && h.tipo === 'labrar') && !acc.sitting && !rueda) { apunta(H.LeftArm, fx * 0.2 + fz * 0.16, -0.95, fz * 0.2 - fx * 0.16, 0.9 * (1 - ka)); apunta(H.LeftForeArm, fx * 0.62 + fz * 0.04, -0.78, fz * 0.62 - fx * 0.04, 0.9 * (1 - ka)); } // en la mano, al costado: el brazo izquierdo no se balancea, lleva el arco
  C.m.updateMatrixWorld(true);
  if (ka <= 0) { H.LeftHand.getWorldPosition(C.arco.position).addScaledVector(VA.set(0, 1, 0).applyQuaternion(H.LeftHand.getWorldQuaternion(QD)), 0.07); C.arco.rotation.set(1.0, f, 0); C.arco.scale.set(1, 1, 1); cuerdaPor(C, null); return; } // el arco va en la palma, no en la muñeca
  // apuntando: todo se mide desde los ojos (donde está la cámara) y hacia donde apunta la mira
  const cp = Math.cos(cam.pitch), ax = -Math.sin(cam.yaw) * cp, ay = -Math.sin(cam.pitch), az = -Math.cos(cam.yaw) * cp, rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), ux = -rz * ay, uy = rz * ax - rx * az, uz = rx * ay; // adelante, a la derecha y arriba
  const t = pp(), ex = t.x + rx * CAM_ARCO[0] - ax * CAM_ARCO[2], ey = t.y + CAM_ARCO[1] - ay * CAM_ARCO[2], ez = t.z + rz * CAM_ARCO[0] - az * CAM_ARCO[2]; // los ojos
  const en = (ad, de, ar, o) => o.set(ex + ax * ad + rx * de + ux * ar, ey + ay * ad + uy * ar, ez + az * ad + rz * de + uz * ar); // un punto a tanto adelante, a la derecha y arriba de los ojos
  const c = suave(0, 1, acc.tensa), rec = acc.recarga, hay = acc.ctx().tengo('flecha') > 0, puestaYa = ka > 0.7 && hay && !acc.vuela && rec < 0.45, sube = retro * 0.03;
  VAD.set(ax, ay, az); VDE.set(rx, 0, rz); VAR.set(ux, uy, uz);
  // la mano izquierda agarra el arco: la muñeca queda a la izquierda de la empuñadura y los dedos la cruzan por delante, así que
  // desde los ojos se ve el dorso de la mano tapando la empuñadura
  en(0.435, -0.165, -0.18 + sube, PW); ikBrazo(H.LeftArm, H.LeftForeArm, H.LeftHand, PW, VA.set(-rx * 0.5, -0.8, -rz * 0.5), ka);
  orientaMano(H.LeftHand, C.palma.Left, VA.copy(VDE).addScaledVector(VAR, 0.3).addScaledVector(VAD, 0.15), VAD, ka);
  en(0.47, -0.09, -0.17 + sube, PBW); EU.set(cam.pitch, cam.yaw + Math.PI, 0.1); QG.setFromEuler(EU);
  if (ka < 1) { H.LeftHand.getWorldPosition(C.arco.position).addScaledVector(VA.set(0, 1, 0).applyQuaternion(H.LeftHand.getWorldQuaternion(QD)), 0.07).lerp(PBW, ka); EU.set(1.0, f, 0); C.arco.quaternion.setFromEuler(EU).slerp(QG, ka); } // mientras sube o baja el arco, va de la postura de llevarlo a la de apuntar
  else { C.arco.position.copy(PBW); C.arco.quaternion.copy(QG); }
  C.arco.scale.set(1, 1 - 0.06 * c, 1 + 0.5 * c); // al tensarlo, las puntas se vienen hacia atrás
  const D = PANZA + (0.42 - PANZA) * c; en(0.47 - D, -0.075, -0.125 + sube, PN); // dónde va la cuerda con la flecha
  const baja = suave(0.35, 1, rec); // después de soltar, la mano derecha baja a buscar otra flecha y vuelve a la cuerda
  // la mano derecha toma la cuerda: la muñeca a la derecha, los dedos hacia la cuerda
  en(0.47 - D - 0.01 - baja * 0.1, 0.0 + baja * 0.3, -0.118 - baja * 0.35, PW); ikBrazo(H.RightArm, H.RightForeArm, H.RightHand, PW, VA.set(rx * 0.55 - ax * 0.3, -0.6, rz * 0.55 - az * 0.3), ka);
  orientaMano(H.RightHand, C.palma.Right, VA.copy(VDE).negate().addScaledVector(VAD, 0.25).addScaledVector(VAR, 0.1), VAD, ka);
  cuerdaPor(C, puestaYa || (acc.tira && ka > 0.7) ? PN : null);
  if (puestaYa) { C.puesta.visible = true; C.puesta.position.set(PN.x + ax * 0.36, PN.y + ay * 0.36, PN.z + az * 0.36); C.puesta.lookAt(PN.x + ax * 2, PN.y + ay * 2, PN.z + az * 2); }
}
// ---------- las manos del arco, de cerca ----------
// Apuntando, la cámara va en los ojos de Leftraru y sus manos quedan a un palmo de ella. Las del modelo no tienen dedos que se
// muevan, así que ahí se usan otras, hechas para verse de cerca: la izquierda cerrada en la empuñadura, con los cuatro dedos
// abrazándola por delante y el pulgar por detrás; la derecha enganchando la cuerda con dos dedos, el índice sobre la flecha y
// el medio debajo, con los otros dos recogidos contra la palma. Cada mano es una sola malla, con su antebrazo.
// Todo se arma en el espacio del arco: +y hacia la punta de arriba, +z hacia donde sale la flecha, +x a la izquierda del arquero.
// VM dice dónde queda eso visto desde los ojos (derecha, arriba, atrás): la empuñadura (G), hasta dónde llega la mano con la
// cuerda al tensar del todo (N), cuánto se inclina el arco (cant), por dónde pasa la flecha junto a la empuñadura (ax, ay) y
// dónde está el hombro izquierdo, hacia donde va ese brazo.
const VM = { G: [-0.02, -0.1, -0.62], N: [0.035, -0.085, -0.27], cant: 0.5, ax: 0.019, ay: 0.042, hombroI: [-0.18, -0.21, 0.06], talla: 0.84 }; // talla: el tamaño de las manos (1 sería la de un adulto)
const VMB = { q: new THREE.Quaternion(), G: V3(), D1: 0.39, ax: 0, ay: 0 }, uFP = { value: 0 }, LARGO_FL = 0.72; // uFP: 1 mientras se ven las manos de cerca (entonces los brazos del modelo no se pintan)
function flechaGeo() { // una flecha: la caña, la punta endurecida al fuego y tres medias plumas atrás. Va a lo largo de z, con la punta hacia +z
  const pinta = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), k = new THREE.Color(c); for (let i = 0; i < n; i++) k.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const p = [pinta(new THREE.CylinderGeometry(0.008, 0.008, 0.66, 6).rotateX(Math.PI / 2).translate(0, 0, -0.03), 0xb49a62), pinta(new THREE.ConeGeometry(0.0095, 0.07, 6).rotateX(Math.PI / 2).translate(0, 0, 0.325), 0x47301f)];
  for (let i = 0; i < 3; i++) p.push(pinta(new THREE.BoxGeometry(0.0016, 0.017, 0.075).translate(0, 0.0145, -0.3).rotateZ(i * Math.PI * 2 / 3), 0xb5a88f));
  return mergeGeometries(p);
}
function haceManos(piel) {
  const PIEL = new THREE.Color(piel).multiplyScalar(0.9), CUERO = new THREE.Color(0x5a3d26), Q = new THREE.Quaternion(), UP = V3(0, 1, 0);
  const pinta = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const tramo = (lista, a, b, r, r2 = r, c = PIEL) => { const d = V3().subVectors(b, a), L = d.length(); // un trozo redondo de a a b: una falange, un antebrazo (r2: el grosor en b, si cambia)
    const g = r2 === r ? new THREE.CapsuleGeometry(r, L, 3, 8) : new THREE.CylinderGeometry(r2, r, L, 10, 1); g.applyQuaternion(Q.setFromUnitVectors(UP, d.divideScalar(L))); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); lista.push(pinta(g, c)); };
  const dedo = (lista, pts, r) => { for (let i = 0; i + 1 < pts.length; i++) tramo(lista, pts[i], pts[i + 1], r * (1 - i * 0.07)); };
  const bola = (lista, p, rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 12, 9); g.scale(rx, ry, rz); g.translate(p.x, p.y, p.z); lista.push(pinta(g, PIEL)); };
  const G2R = Math.PI / 180, cil = (gr, r, y) => V3(Math.cos(gr * G2R) * r, y, Math.sin(gr * G2R) * r); // alrededor de la empuñadura: los grados van desde su izquierda (+x) hacia adelante (+z)
  // cómo queda el espacio del arco visto desde los ojos
  const G = V3(...VM.G), N = V3(...VM.N), X = V3(-1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, -1), arr = V3(Math.sin(VM.cant), Math.cos(VM.cant), 0);
  for (let i = 0; i < 4; i++) { Z.copy(G).addScaledVector(X, VM.ax).addScaledVector(Y, VM.ay).sub(N); VMB.D1 = Z.length(); Z.normalize(); Y.copy(arr).addScaledVector(Z, -arr.dot(Z)).normalize(); X.crossVectors(Y, Z); }
  VMB.q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); VMB.G.copy(G); VMB.ax = VM.ax; VMB.ay = VM.ay;
  const alArco = (p) => { const d = V3(...p).sub(G); return V3(d.dot(X), d.dot(Y), d.dot(Z)); }; // un punto visto desde los ojos, pasado al espacio del arco
  // ---- la izquierda: cerrada en la empuñadura ----
  const I = []; // (la empuñadura, forrada en cuero, se agrega al final: no cambia con la talla de la mano)
  [[0.031, 1, 1], [0.0105, 1.03, 1], [-0.0098, 1, 0.97], [-0.029, 0.9, 0.86]].forEach(([y, k, g]) => dedo(I, [cil(-14, 0.041, y), cil(48, 0.0375 * k, y), cil(112, 0.0295 * k, y - 0.001), cil(170, 0.0238, y - 0.002)], 0.0099 * g));
  dedo(I, [V3(0.013, 0.031, -0.043), cil(248, 0.0285, 0.035), cil(202, 0.0262, 0.031)], 0.0108); // el pulgar, por detrás
  bola(I, V3(0.036, 0.001, -0.046), 0.019, 0.043, 0.043); bola(I, V3(0.011, 0.012, -0.032), 0.018, 0.029, 0.02); // el dorso y la base del pulgar, que es donde empuja el arco
  const mu = V3(0.035, -0.008, -0.09), hom = alArco(VM.hombroI), codo = V3().copy(mu).addScaledVector(V3().subVectors(hom, mu).normalize(), 0.245); codo.y -= 0.02;
  bola(I, mu, 0.0215, 0.027, 0.027); tramo(I, mu, codo, 0.0235, 0.036); bola(I, codo, 0.036, 0.036, 0.036); tramo(I, codo, hom, 0.036, 0.043);
  // ---- la derecha: dos dedos en la cuerda. Su origen es el punto de la cuerda donde va la cola de la flecha ----
  const D = [];
  for (const y of [0.0128, -0.0128]) dedo(D, [V3(-0.031, y * 1.25 + 0.002, -0.052), V3(-0.0215, y, -0.014), V3(-0.0065, y, 0.0098), V3(0.0165, y, 0.0078)], 0.0093); // índice arriba de la flecha, medio debajo: enganchan la cuerda por delante
  dedo(D, [V3(-0.03, -0.034, -0.052), V3(-0.017, -0.035, -0.02), V3(-0.001, -0.036, -0.03), V3(-0.008, -0.035, -0.05)], 0.0088); // el anular, doblado contra la palma
  dedo(D, [V3(-0.028, -0.052, -0.055), V3(-0.016, -0.053, -0.028), V3(-0.002, -0.053, -0.037), V3(-0.009, -0.051, -0.054)], 0.0078); // el meñique
  dedo(D, [V3(-0.012, 0.03, -0.07), V3(0.004, 0.031, -0.046), V3(0.011, 0.024, -0.024)], 0.0108); // el pulgar, recogido sobre la mano
  bola(D, V3(-0.029, -0.014, -0.083), 0.016, 0.045, 0.039); bola(D, V3(-0.011, 0.004, -0.087), 0.02, 0.031, 0.031);
  const mu2 = V3(-0.027, -0.012, -0.124), codo2 = V3().copy(mu2).addScaledVector(V3(-0.1, 0.1, -1).normalize(), 0.3);
  bola(D, mu2, 0.0215, 0.027, 0.027); tramo(D, mu2, codo2, 0.0235, 0.037);
  for (const q of [...I, ...D]) q.scale(VM.talla, VM.talla, VM.talla); I.push(pinta(new THREE.CylinderGeometry(0.0135, 0.0135, 0.1, 10), CUERO));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), g = new THREE.Group();
  const izq = new THREE.Mesh(mergeGeometries(I), mat), der = new THREE.Mesh(mergeGeometries(D), mat);
  for (const o of [izq, der]) { o.receiveShadow = true; o.frustumCulled = false; g.add(o); } g.visible = false;
  return { g, izq, der };
}
// Se llama en cada cuadro, después de poner la cámara: así las manos van pegadas a lo que se ve, sin atraso.
function manosArco(dt) {
  const C = cuerpo, Mn = C.manos, entra = acc.equipado && acc.apunta && apK >= 0.9 && boy.g.visible && state === 'play', recien = C.vmK === 0;
  C.vmK = entra ? Math.min(1, C.vmK + dt / 0.16) : 0; const on = C.vmK > 0; Mn.g.visible = on; uFP.value = on ? 1 : 0; // entran cuando la cámara ya llegó a los ojos, y salen de golpe al bajarlo
  if (!on) { C.puesta.scale.set(1, 1, 1); return; }
  camera.updateMatrixWorld(true);
  const e = ease(C.vmK), anda = Math.min(1, player.speed / 3), c = suave(0, 1, acc.tensa), rec = acc.recarga, hay = acc.ctx().tengo('flecha') > 0;
  // dónde va el arco visto desde los ojos, con un vaivén leve al caminar y al respirar, el temblor de tenerlo tenso y el golpe al soltar
  PA.set(VMB.G.x + Math.cos(time * 5.2) * 0.003 * anda, VMB.G.y + Math.sin(time * 10.4) * 0.004 * anda + Math.sin(time * 1.3) * 0.0015 + Math.sin(time * 43) * 0.0006 * suave(0.85, 1, c) + retro * 0.018, VMB.G.z).applyMatrix4(camera.matrixWorld);
  QF.copy(camera.quaternion).multiply(VMB.q);
  Mn.g.position.copy(C.arco.position).lerp(PA, e); Mn.g.quaternion.copy(C.arco.quaternion).slerp(QF, e); Mn.g.updateMatrixWorld(true); // parte de donde lo tenía la mano del modelo y se acomoda
  C.arco.position.copy(Mn.g.position); C.arco.quaternion.copy(Mn.g.quaternion); C.arco.scale.set(1, 1 - 0.06 * c, 1 + 0.5 * c); // al tensarlo, las puntas se vienen hacia atrás
  // la mano derecha: en la cuerda mientras apunta y tensa; después de soltar baja a buscar otra flecha y vuelve con ella
  const largo = PANZA + 0.012 + (VMB.D1 - PANZA - 0.012) * c, enCuerda = PB.set(VMB.ax, VMB.ay, -largo), lista = hay && !acc.vuela && rec < 0.45, md = Mn.der.position;
  if (recien || acc.tira || (C.pegada && rec <= 0)) { md.copy(enCuerda); C.pegada = true; }
  else { md.lerp(rec > 0.45 ? PC.set(VMB.ax - 0.07, VMB.ay - 0.27, -PANZA - 0.12) : enCuerda, 1 - Math.exp(-dt * (rec > 0.45 ? 14 : 22))); C.pegada = rec <= 0.45 && md.distanceTo(enCuerda) < 0.012; if (C.pegada) md.copy(enCuerda); }
  Mn.der.rotation.x = -Math.min(0.6, md.distanceTo(enCuerda) * 2.4); // al bajar, la mano se vuelca un poco hacia abajo
  // la flecha va con la mano: la cola entre los dos dedos y la punta hacia su apoyo, junto a la empuñadura
  const mano = Mn.g.localToWorld(PD.copy(md)); C.puesta.visible = lista;
  if (lista) { const dir = Mn.g.localToWorld(PE.set(VMB.ax, VMB.ay, 0)).sub(mano).normalize(); C.puesta.scale.set(0.5, 0.5, 1); C.puesta.position.copy(mano).addScaledVector(dir, LARGO_FL / 2); C.puesta.lookAt(PG.copy(mano).addScaledVector(dir, 2)); }
  cuerdaPor(C, C.pegada && (lista || acc.tira) ? PF.copy(mano) : null);
}
// La gente en 3D, cuadro a cuadro: después de que su cuerpo de siempre tomó la postura de este momento, el modelo la copia.
const PT = V3();
function ikBrazo(sup, inf, fin, T, polo, k) { // gira brazo y antebrazo para que la muñeca llegue a T; polo: hacia dónde queda el codo; k: cuánto (0 nada, 1 del todo)
  const a = sup.getWorldPosition(PA), b = inf.getWorldPosition(PB), c = fin.getWorldPosition(PC), L1 = a.distanceTo(b), L2 = b.distanceTo(c);
  const eje = PE.copy(T).sub(a), dist = Math.min(L1 + L2 - 0.002, Math.max(0.04, eje.length())); eje.normalize();
  const x = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), alto = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  const p = PF.copy(polo); p.addScaledVector(eje, -p.dot(eje)); if (p.lengthSq() < 1e-6) p.set(0, -1, 0); p.normalize();
  const codo = PG.copy(a).addScaledVector(eje, x).addScaledVector(p, alto), meta = PD.copy(a).addScaledVector(eje, dist);
  tuerce(sup, QR.setFromUnitVectors(VC.copy(b).sub(a).normalize(), VD.copy(codo).sub(a).normalize()), k);
  const b2 = inf.getWorldPosition(PB), c2 = fin.getWorldPosition(PC);
  tuerce(inf, QR.setFromUnitVectors(VC.copy(c2).sub(b2).normalize(), VD.copy(meta).sub(b2).normalize()), k);
}
function updateGente3D(dt) {
  for (const P of gente3d) { const a = P.a, H = P.H; if (!a.g.visible) continue;
    // qué movimiento toca: caminar si va andando; si conversa con Leftraru, las manos al hablar y la atención al callar
    const conversa = !!(talk && talk.who === a && state === 'play'), anda = (a.speed || 0) > 0.12 && a.mode === 'lead', dice = conversa && P.habla > 0.15;
    const meta = { camina: anda ? 1 : 0, habla: !anda && dice ? 1 : 0, escucha: !anda && conversa && !dice ? 1 : 0 }; let suma = 0;
    for (const k in P.mov) { P.w[k] += (meta[k] - P.w[k]) * Math.min(1, dt * (k === 'camina' ? 6 : 2.5)); P.mov[k].setEffectiveWeight(P.w[k]); suma += P.w[k]; }
    if (P.quieta) P.quieta.setEffectiveWeight(Math.max(0, 1 - suma)); if (P.mov.camina) P.mov.camina.timeScale = Math.max(0.5, (a.speed || 0) / P.paso);
    P.mixer.update(dt);
    if (H.Spine02) { const b = Math.sin(time * 1.25 + P.fase) * 0.012; H.Spine02.rotateX(b); if (H.neck) H.neck.rotateX(-b); } // respira
    a.g.updateMatrixWorld(true); // el cuerpo de siempre, ya con la postura de este cuadro
    const fx = Math.sin(a.face), fz = Math.cos(a.face);
    pisa(P, dt, { suelo: a.g.position.y, apoyado: true, f: a.face, quieto: 1 - P.w.camina, slope: 0, h: a.h });
    const inc = a.body.rotation.x; if (Math.abs(inc) > 0.004 && H.Spine02) tuerce(H.Spine02, QR.setFromAxisAngle(VC.set(fz, 0, -fx), inc), 1); // el tronco se inclina igual
    [['Left', a.armL, a.foreL, 1], ['Right', a.armR, a.foreR, -1]].forEach(([l, br, an, sx], i) => { // las manos van a donde están las del cuerpo de siempre; con los brazos caídos, se queda la postura de reposo
      const uso = suave(0.06, 0.3, Math.abs(br.rotation.x) + Math.abs(an.rotation.x) + Math.abs(br.rotation.z - sx * 0.1)) * (1 - P.w.camina); /* caminando, los brazos los lleva el movimiento */ P.brazo[i] += (uso - P.brazo[i]) * Math.min(1, dt * 8);
      if (P.brazo[i] < 0.99) apunta(H[l + 'Arm'], fz * sx * 0.17 + fx * 0.04, -1, -fx * sx * 0.17 + fz * 0.04, 0.55 * (1 - P.brazo[i]) * (1 - P.w.camina) * (1 - P.w.habla)); // en reposo, los brazos caen junto al cuerpo
      if (P.brazo[i] > 0.01) ikBrazo(H[l + 'Arm'], H[l + 'ForeArm'], H[l + 'Hand'], an.localToWorld(PT.set(0, -0.2, 0.03)), V3(fz * sx * 0.45 - fx * 0.5, -0.75, -fx * sx * 0.45 - fz * 0.5), P.brazo[i]); }); // el codo, hacia abajo, atrás y afuera
    if (H.Head) { VD.set(0, 0, 1).applyQuaternion(a.head.getWorldQuaternion(QD)).normalize(); const mira = PT.copy(VD); // la cabeza mira hacia donde mira la del cuerpo de siempre
      for (const [hueso, k] of [[H.neck, 0.4], [H.Head, 1]]) if (hueso) tuerce(hueso, QR.setFromUnitVectors(VC.copy(P.frente).applyQuaternion(H.Head.getWorldQuaternion(QF)).normalize(), VD.copy(mira)), k); }
    if (P.ojos) { P.parp -= dt; if (P.parp < -0.2) P.parp = 2.5 + Math.random() * 4; const ci = P.parp < 0 ? Math.sin(Math.min(1, -P.parp / 0.2) * Math.PI) : 0; for (const o of P.ojos) { o.scale.y = Math.max(0.001, ci); o.visible = ci > 0.03; } // pestañea
      P.habla = Math.max(0, P.habla - dt); const ab = P.habla > 0 ? 0.2 + 0.8 * Math.abs(Math.sin(time * 13)) * (0.45 + 0.55 * Math.abs(Math.sin(time * 4.7 + 1))) : 0; P.boca.visible = ab > 0.03; P.boca.scale.y = Math.max(0.001, P.bocaAlto * ab); } // y mueve los labios mientras habla
  }
}
const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0;
applyOpts();
function tick(dt) {
  time += dt; uTime.value = time;
  updatePlayer(dt); updateVida(dt); if (gesto) updateGesto(dt); updateEntrega(dt);
  if (acc.apunta !== miraOn) { miraOn = acc.apunta; $('mira').classList.toggle('on', miraOn); } if (salirAp > 0 && (salirAp -= dt) <= 0 && !botonDer && !acc.tira) dejaDeApuntar(); ruedaT = Math.max(0, ruedaT - dt);
  if (miraOn) { const lista = acc.tensa >= 0.97, fl = acc.ctx().tengo('flecha'); $('mira').style.setProperty('--c', acc.tensa.toFixed(3)); if (lista !== miraLista) { miraLista = lista; $('mira').classList.toggle('lista', lista); } if (fl !== miraN) { miraN = fl; $('mira-n').textContent = fl === 1 ? '1 flecha' : `${fl} flechas`; $('mira').classList.toggle('sin', !fl); } }
  if (cuerpo) updateCuerpo(dt);
  if (cine.active) cine.update(dt);
  else if (fuera()) { const a = time * 0.04 + 2.4; camera.position.set(Math.sin(a) * 31, 12, Math.cos(a) * 31); camera.lookAt(0, 4, 0); }
  else if (focus) updateFocus(dt);
  else updateCamera(dt);
  if (cuerpo) manosArco(dt);
  updateArma(); updateItems();
  { const p = pp(); uPlayer.value.set(p.x, p.y - FEET, p.z); // las plantas se apartan al paso
    ui.people.length = 0;
    for (const a of world.life.actors) if (a.mark) { const id = PERSON[a.name], w = acc.wants(id), kind = w === 'main' ? 'main' : ui.has(id) ? w : 'nuevo'; // estrella: con esta persona sigue la historia; rombo: encargo; círculo: aún no la conoces
      a.mark.visible = state === 'play' && !!kind && !talk; if (kind) { a.mark.material = world.life.markMats[kind]; ui.people.push({ x: a.x, z: a.z, kind, id }); } }
    acc.update(dt, time, p); acc.pose(boy);
    if ((actT -= dt) <= 0) { actT = 0.2; doable = state === 'play' && !talk && !ui.open && !focus ? acc.scan(p) : null; $('prompt2').classList.toggle('on', !!doable); if (doable) $('prompt2-text').textContent = doable.label; } // estrella sobre quien aún tiene algo que contarte
    // ondas en el agua al vadear
    ripT -= dt; if (player.wade > 0.05 && player.speed > 0.5 && ripT <= 0) { ripT = 0.22; const r = ripples[ripI++ % ripples.length]; r.position.set(p.x, WATER_Y + 0.03, p.z); r.userData.t = 0; r.visible = true; }
    for (const r of ripples) if (r.visible) { const k = (r.userData.t += dt) / 1.6; r.scale.setScalar(0.4 + k * 2.6); r.material.opacity = 0.5 * (1 - k); if (k >= 1) r.visible = false; } }
  world.update(dt, time, camera.position, pp(), player.speed); updateGente3D(dt); lights.follow(fuera() ? { x: 0, y: 3, z: 0 } : cine.active ? camera.position : pp());
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
  if ((!menuOpen && tour < 0) || state === 'title') { // el juego se detiene con el menú abierto y mientras se presentan los botones
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
