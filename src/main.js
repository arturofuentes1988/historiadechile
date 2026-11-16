import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { uTime, buildLights, createPost, assets } from './gfx.js';
import { buildWorld } from './world.js';
import { height, inBounds, POI, CERRO } from './terrain.js';
import { buildPerson, animatePerson } from './life.js';
import { Cinematic } from './cinematic.js';
import { createUI } from './ui.js';
import { createExplorer } from './explore.js';
import { TALK } from './notes.js';
import { riverZ } from './terrain.js';

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
assets.onProgress = (l, t) => bar(0.3 + 0.7 * (l / t), `Cargando texturas… ${l} de ${t}`);
bar(0.3 + 0.7 * (assets.total ? assets.loaded / assets.total : 0), 'Cargando texturas…');

// ---------- Leftraru niño (personaje provisional, hecho de formas pintadas) ----------
const boy = buildPerson({ kind: 'boy', h: 1.38 }); scene.add(boy.g);
const START = [-6, -1];

const RAD = 0.3, HALF = 0.36, FEET = HALF + RAD;
const pBody = physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(START[0], height(...START) + FEET + 0.05, START[1]));
const pCol = physics.createCollider(RAPIER.ColliderDesc.capsule(HALF, RAD), pBody);
const ctrl = physics.createCharacterController(0.02);
ctrl.enableAutostep(0.3, 0.2, true); ctrl.setMaxSlopeClimbAngle(0.95); ctrl.setMinSlopeSlideAngle(1.0);

const player = { vy: 0, grounded: false, facing: 0.6, phase: 0, speed: 0 };
const cam = { yaw: 0.2, pitch: 0.2, dist: 5.4 };
const keys = {};
let state = 'title', got = 0, time = 0;

const cine = new Cinematic(camera);
const pp = () => pBody.translation();

// Entrar al mundo directamente desde la portada (sin cinemática de inicio)
function enter() {
  if (state !== 'title') return;
  setMenu(false); state = 'play'; $('title').classList.add('hide'); document.body.classList.add('playing'); $('hud').classList.add('on');
  if (!document.fullscreenElement) { try { document.documentElement.requestFullscreen?.()?.catch?.(() => {}); } catch { /* el navegador no lo permitió */ } }
  lock(); hint(`Sigue el sendero hacia el norte · Acércate a algo y pulsa ${keyName(opts.keys.observar)} para observarlo`, 10);
  if (!ui.has('leftraru')) { const t = pp(); ui.discover('leftraru', photo({ x: t.x, y: t.y + 0.25, z: t.z }, { dist: 2.3, up: 0.2, fov: 40, self: true })); }
}

// ---------- opciones (se guardan en este navegador) ----------
const opts = Object.assign({ calidad: 'auto', detalle: '1', sens: 1, inv: false, mini: true }, JSON.parse(localStorage.getItem('leftraru.opciones') || '{}'));
// teclas: cada acción tiene una tecla que se puede cambiar en Menú → Controles
const ACTIONS = [['adelante', 'Adelante', 'KeyW'], ['atras', 'Atrás', 'KeyS'], ['izquierda', 'Izquierda', 'KeyA'], ['derecha', 'Derecha', 'KeyD'], ['correr', 'Correr', 'ShiftLeft'], ['saltar', 'Saltar', 'Space'],
  ['observar', 'Observar o hablar', 'KeyE'], ['camIzq', 'Girar a la izquierda', 'KeyZ'], ['camDer', 'Girar a la derecha', 'KeyC'], ['cuaderno', 'Cuaderno', 'KeyN'], ['misiones', 'Misiones', 'KeyJ'], ['saberes', 'Saberes', 'KeyK'],
  ['bolsa', 'Bolsa', 'KeyB'], ['mapa', 'Mapa', 'KeyM'], ['pantalla', 'Pantalla completa', 'KeyF'], ['menu', 'Menú', 'KeyP']];
opts.keys = Object.assign(Object.fromEntries(ACTIONS.map(([a, , k]) => [a, k])), opts.keys || {});
const down = (a) => !!keys[opts.keys[a]], is = (e, a) => e.code === opts.keys[a];
const keyName = (c) => ({ Space: 'Espacio', ShiftLeft: 'Shift izq.', ShiftRight: 'Shift der.', ControlLeft: 'Ctrl izq.', ControlRight: 'Ctrl der.', AltLeft: 'Alt izq.', AltRight: 'Alt der.', Tab: 'Tab', Enter: 'Enter', Backspace: 'Retroceso', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[c] || c.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num '));
let rebinding = null;
const GROUPS = [['Movimiento', ['adelante', 'atras', 'izquierda', 'derecha', 'correr', 'saltar']], ['Acción y cámara', ['observar', 'camIzq', 'camDer']], ['Paneles', ['cuaderno', 'misiones', 'saberes', 'bolsa', 'mapa']], ['Juego', ['pantalla', 'menu']]];
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
  renderer.setPixelRatio(pr); post.resize(); document.body.classList.toggle('nomini', !opts.mini);
  $('o-reload').hidden = opts.detalle === detalleInicial;
  localStorage.setItem('leftraru.opciones', JSON.stringify(opts));
}
function setMenu(on) {
  menuOpen = on; menuPage('opciones'); $('menu').classList.toggle('on', on); document.body.classList.toggle('en-portada', state === 'title');
  if (on) { ui.show(null); document.exitPointerLock?.(); for (const k in keys) keys[k] = false; } else if (state === 'play') lock();
}
$('o-calidad').value = opts.calidad; $('o-detalle').value = opts.detalle; $('o-sens').value = opts.sens; $('o-inv').checked = opts.inv; $('o-mini').checked = opts.mini;
$('o-calidad').onchange = (e) => { opts.calidad = e.target.value; applyOpts(); };
$('o-detalle').onchange = (e) => { opts.detalle = e.target.value; applyOpts(); };
$('o-sens').oninput = (e) => { opts.sens = parseFloat(e.target.value); applyOpts(); };
$('o-inv').onchange = (e) => { opts.inv = e.target.checked; applyOpts(); };
$('o-mini').onchange = (e) => { opts.mini = e.target.checked; applyOpts(); };
$('o-recargar').onclick = () => location.reload();
$('m-portada').onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* nada */ } location.reload(); }; // salir del juego: vuelve a la portada
$('m-continuar').onclick = () => setMenu(false);
$('o-borrar').onclick = () => { if (confirm('¿Borrar todo lo descubierto en el cuaderno?')) { ui.reset(); location.reload(); } };
$('btn-menu').onclick = () => setMenu(!menuOpen);
$('o-controles').onclick = () => menuPage('controles'); $('ctl-volver').onclick = () => menuPage('opciones');
$('ctl-reset').onclick = () => { for (const [a, , k] of ACTIONS) opts.keys[a] = k; applyOpts(); drawKeys(); };
$('ctl-list').onclick = (e) => { const b = e.target.closest('[data-act]'); if (b) { rebinding = b.dataset.act; drawKeys(); } };
$('c-entrar').onclick = enter; $('c-opciones').onclick = () => setMenu(true);
// pantalla completa
const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => hint('Este navegador no permitió la pantalla completa', 4)); };
$('btn-full').onclick = toggleFull; $('o-full').onchange = toggleFull;
// En pantalla completa se le pide al navegador que Escape llegue al juego en vez de sacarte de ella
// (funciona en Chrome y Edge; en otros navegadores Escape sigue saliendo de la pantalla completa).
document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; try { if (on) navigator.keyboard?.lock?.(['Escape'])?.catch?.(() => {}); else navigator.keyboard?.unlock?.(); } catch { /* sin soporte */ } if (on && state === 'play' && !menuOpen && !ui.open) lock(); $('o-full').checked = on; $('full-label').textContent = on ? 'Salir de pantalla completa' : 'Pantalla completa'; });
if (!document.documentElement.requestFullscreen) { $('btn-full').style.display = 'none'; $('o-full').parentElement.style.display = 'none'; }
// al soltar el ratón con Escape durante el juego, se abre el menú
// El ratón: al entrar al mundo queda tomado para girar la cámara. Escape lo suelta y abre el menú.
// Si el navegador no deja tomarlo, también se puede girar arrastrando con el botón apretado.
let dragging = false, lockWanted = 0;
function lock() { lockWanted = performance.now(); try { const r = renderer.domElement.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* el navegador no lo permitió */ } }
const locked = () => document.pointerLockElement === renderer.domElement;
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('sin-raton', !locked());
  if (!locked() && state === 'play' && !ui.open && !menuOpen && performance.now() - lockWanted > 400) setMenu(true);
});
document.body.classList.add('sin-raton');
renderer.domElement.addEventListener('mousedown', () => { dragging = true; if (state === 'play' && !ui.open && !menuOpen && !locked()) lock(); });
addEventListener('mouseup', () => { dragging = false; });

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
let near = null, scanT = 0, talk = null, misT = 0, summit = false, still = 0;
function applySkills() { explorer.reach = ui.skill('vista') ? 1.7 : 1; world.life.shyR = ui.skill('pudu') ? 3.5 : 9; }
function say() { document.body.classList.add('talking'); const t = talk; $('dlg-name').textContent = t.name; $('dlg-text').textContent = t.lines[t.i]; $('dlg-more').textContent = `${keyName(opts.keys.observar)} · ${t.i < t.lines.length - 1 ? 'seguir' : 'cerrar'}`; $('dialogo').classList.add('on'); }
function interact() {
  if (talk) { if (++talk.i < talk.lines.length) return say(); const t = talk; talk = null; $('dialogo').classList.remove('on'); document.body.classList.remove('talking'); if (t.done) t.done(); return; }
  if (!near || state !== 'play' || ui.open || focus) return;
  const c = near; near = null; $('prompt').classList.remove('on');
  if (c.person) {
    const d = TALK[c.id], a = c.person; a.face = Math.atan2(pp().x - a.x, pp().z - a.z); player.facing = Math.atan2(a.x - pp().x, a.z - pp().z);
    talk = { name: d.name, lines: c.known ? [d.again] : d.lines, i: 0, done: c.known ? null : () => { ui.discover(c.id, photo(c.target, c.shot)); for (const id of d.da) ui.discover(id, VIEWS[id] ? viewPhoto(id) : ''); } }; say();
  } else if (c.shot.view) ui.discover(c.id, viewPhoto(c.shot.view)); else startFocus(c);
}
$('dialogo').addEventListener('click', () => interact());


function outro() {
  setMenu(false); state = 'cine'; ui.show(null); document.body.classList.remove('playing'); $('hud').classList.remove('on');
  const p = V3(pp().x, pp().y + 0.6, pp().z), dir = world.volcano.clone().sub(p).setY(0).normalize();
  cine.play([
    { dur: 6, from: p.clone().addScaledVector(dir, 3.5).add(V3(0, 0.6, 0)), to: p.clone().addScaledVector(dir, 2.6).add(V3(0, 0.3, 0)), lookFrom: p, text: 'El último piñón. Suficientes para todos.' },
    { dur: 10, from: p.clone().addScaledVector(dir, -4).add(V3(0, 2, 0)), to: p.clone().addScaledVector(dir, -8).add(V3(0, 36, 0)), lookFrom: p.clone().add(V3(0, 6, 0)), lookTo: world.volcano, text: 'Desde el cerro, su padre lo llama. Hay algo que quiere mostrarle.' },
  ], () => { state = 'play'; document.body.classList.add('playing'); $('hud').classList.add('on'); lock(); });
}
let hintT = 0;
function hint(txt, secs) { $('hint').textContent = txt; $('hint').classList.add('on'); hintT = secs; }

addEventListener('keydown', (e) => {
  if (rebinding) { // se está eligiendo una tecla nueva para una acción
    e.preventDefault();
    if (e.code !== 'Escape') { const old = opts.keys[rebinding]; for (const a in opts.keys) if (opts.keys[a] === e.code) opts.keys[a] = old; opts.keys[rebinding] = e.code; applyOpts(); } // si ya estaba en uso, se intercambian
    rebinding = null; drawKeys(); return;
  }
  if (e.code === 'Enter') { if (state === 'title') enter(); else if (!talk) cine.skip(); }
  if (is(e, 'pantalla') && !e.repeat) toggleFull();
  if (is(e, 'menu') && !e.repeat && state !== 'cine') { if (ui.open) ui.show(null); setMenu(!menuOpen); return; }
  if (menuOpen) { if (e.code === 'Escape') { if (page === 'controles') menuPage('opciones'); else setMenu(false); } return; }
  keys[e.code] = true;
  if (is(e, 'observar') && !e.repeat) interact();
  if (talk) { if (e.code === 'Enter' || e.code === 'Space') interact(); return; }
  if (state === 'play') for (const pn of ['cuaderno', 'misiones', 'saberes', 'bolsa', 'mapa']) if (is(e, pn)) ui.show(pn === 'cuaderno' ? 'notas' : pn);
  if (e.code === 'Escape') { if (ui.open) ui.show(null); else if (state !== 'cine') setMenu(true); }
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousemove', (e) => {
  if (focus || (!locked() && !(dragging && state === 'play'))) return;
  cam.yaw -= e.movementX * 0.0028 * opts.sens; cam.pitch = Math.min(1.2, Math.max(-0.25, cam.pitch + e.movementY * 0.0022 * opts.sens * (opts.inv ? -1 : 1)));
});

function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (state === 'play' && !ui.open && !talk && !focus) {
    ix = (down('derecha') || keys.ArrowRight ? 1 : 0) - (down('izquierda') || keys.ArrowLeft ? 1 : 0);
    iz = (down('adelante') || keys.ArrowUp ? 1 : 0) - (down('atras') || keys.ArrowDown ? 1 : 0);
    cam.yaw += ((down('camIzq') ? 1 : 0) - (down('camDer') ? 1 : 0)) * dt * 1.8;
  }
  const run = down('correr'), target = ix || iz ? (run ? 6.2 * (ui.skill('ligero') ? 1.18 : 1) : 3.3) : 0;
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; const l = Math.hypot(dx, dz);
  if (l > 0) { dx /= l; dz /= l; player.dirX = dx; player.dirZ = dz; let d = Math.atan2(dx, dz) - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); player.facing += d * Math.min(1, dt * 12); }
  if (player.grounded && state === 'play' && !ui.open && !talk && !focus && down('saltar')) { player.vy = 6.6 * (ui.skill('salto') ? 1.22 : 1); player.grounded = false; }
  player.vy = Math.max(-25, player.vy - 18 * dt);
  if (player.vy > 0) ctrl.disableSnapToGround(); else ctrl.enableSnapToGround(0.3);
  const mvx = (player.dirX || 0) * player.speed * dt, mvz = (player.dirZ || 0) * player.speed * dt;
  ctrl.computeColliderMovement(pCol, { x: mvx, y: player.vy * dt, z: mvz });
  const m = ctrl.computedMovement(), p = pp();
  player.grounded = ctrl.computedGrounded();
  if (player.grounded && player.vy < 0) player.vy = -1;
  let nx = p.x + m.x, ny = p.y + m.y, nz = p.z + m.z; [nx, nz] = inBounds(nx, nz);
  if (ny < height(nx, nz) - 2) ny = height(nx, nz) + FEET + 0.2; // red de seguridad
  pBody.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
  physics.timestep = dt; physics.step();

  // animación procedural
  const t = pp(); boy.g.position.set(t.x, t.y - FEET, t.z); boy.g.rotation.y = player.facing;
  player.phase += dt * (2.5 + player.speed * 1.9);
  animatePerson(boy, player.phase, Math.min(1, player.speed / 6.2) * 0.9 + (player.speed > 0.2 ? 0.25 : 0), !player.grounded);
  for (const k in POI) if (state === 'play' && Math.hypot(t.x - POI[k].x, t.z - POI[k].z) < 20) { ui.place(k); if (!ui.has('l-' + k) && !talk && player.grounded) ui.discover('l-' + k, herePhoto()); }
  if (Math.hypot(t.x - CERRO[0], t.z - CERRO[1]) < 10) summit = true;
  if ((misT -= dt) <= 0 && state === 'play') { // misiones y ayudas de los saberes
    misT = 0.5; const m = ui.missions({ got, total: world.items.length, summit });
    $('mis-title').textContent = m ? m.title : 'Explora libremente'; $('mis-prog').textContent = m && m.prog[2] > 1 ? `${m.prog[1]} / ${m.prog[2]}` : '';
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
  else place(dx, dz);
  if (!sh.fromPlayer) world.clearView(pos, tv, c.rec, !sh.tree);  // lo que queda entre la cámara y el objeto se oculta mientras dura la observación
  lamp.userData.on = !sh.fromPlayer && sh.dist < 6;
  focus = { c, pos: pos.clone(), fov: sh.fov, t: 0, stage: 0, hold: 0, sp: camera.position.clone(), sf: camera.fov, look: V3(t.x, t.y + 0.75, t.z), done: false };
  $('prompt').classList.remove('on'); $('focus').textContent = `Observando ${c.label}…`; $('focus').classList.add('on'); document.body.classList.add('talking');
}
function updateFocus(dt) {
  const f = focus, T = f.c.live ? f.c.live() : f.c.target, tv = V3(T.x, T.y, T.z);
  if (f.stage === 0) { f.t = Math.min(1, f.t + dt / 0.9); const k = ease(f.t); camera.position.lerpVectors(f.sp, f.pos, k); camera.fov = f.sf + (f.fov - f.sf) * k; camera.lookAt(f.look.clone().lerp(tv, k)); if (k > 0.4) boy.g.visible = false; if (f.t >= 1) f.stage = 1; }
  else if (f.stage === 1) {
    camera.position.copy(f.pos); camera.lookAt(tv); f.hold += dt;
    if (f.hold > 0.45 && !f.done) { f.done = true; camera.updateProjectionMatrix(); world.update(0, time, camera.position, pp(), 0); draw(); const img = grab(); if (f.c.known) ui.retake(f.c.id, img); else ui.discover(f.c.id, img); }
    if (f.hold > 1.7) { f.stage = 2; f.t = 0; $('focus').classList.remove('on'); world.restoreView(); }
  } else { f.t = Math.min(1, f.t + dt / 0.7); const k = ease(f.t), [pos, look] = chase(); camera.position.lerpVectors(f.pos, pos, k); camera.fov = f.fov + (f.sf - f.fov) * k; camera.lookAt(tv.lerp(look, k)); if (k > 0.5) boy.g.visible = true; if (f.t >= 1) { camera.fov = f.sf; focus = null; document.body.classList.remove('talking'); } }
  lamp.position.copy(camera.position); lamp.intensity = lamp.userData.on && focus ? (f.stage === 1 ? 7 : f.stage === 0 ? 7 * f.t : 7 * (1 - f.t)) : 0;
  camera.updateProjectionMatrix();
}

function updateItems() {
  const t = pp();
  for (const it of world.items) {
    if (it.taken) continue;
    it.mesh.position.y = it.base.y + Math.sin(time * 2 + it.base.x) * 0.15; it.mesh.rotation.y = time * 1.5;
    if (state === 'play' && Math.hypot(t.x - it.base.x, t.y - it.base.y + 0.3, t.z - it.base.z) < 1.25) {
      if (!ui.has('pinon')) ui.discover('pinon', photo({ x: it.base.x, y: it.mesh.position.y, z: it.base.z }, { dist: 1.5, up: 0.25, fov: 34 }));
      it.taken = true; it.mesh.visible = false; got++; ui.addItem('pinon');
      if (got === world.items.length) outro();
      else if (got === world.items.length - 1) hint('Falta uno. Está sobre las rocas, al fondo del bosque: sube saltando.', 8);
    }
  }
}

const ui = createUI({ world, onToast: (t) => hint(t, 5), onClose: () => { if (state === 'play' && !menuOpen) lock(); }, onSkill: () => applySkills() });
const explorer = createExplorer({ world, ui });
drawKeys(); applySkills();
await assets.whenLoaded(); bar(1, 'Listo'); assets.onProgress = null; $('loading').classList.add('hide'); setTimeout(() => $('loading').remove(), 700);
window.__g = { ui, explorer, ACTIONS, menuPage, interact, get near() { return near; }, get talk() { return talk; }, player, cam, world, pp, get state() { return state; }, get got() { return got; }, cine, enter, setMenu, opts, get menuOpen() { return menuOpen; }, paused: false, keys,
  tp(x, y, z) { pBody.setTranslation({ x, y, z }, true); player.vy = 0; },
  view(x, y, z, lx, ly, lz) { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); world.update(0, time, camera.position, pp()); draw(); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  snap() { draw(); return renderer.domElement.toDataURL('image/jpeg', 0.9); } };

const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0;
applyOpts();
function tick(dt) {
  time += dt; uTime.value = time;
  updatePlayer(dt);
  if (cine.active) cine.update(dt);
  else if (state === 'title') { const a = time * 0.04 + 2.4; camera.position.set(Math.sin(a) * 31, 12, Math.cos(a) * 31); camera.lookAt(0, 4, 0); }
  else if (focus) updateFocus(dt);
  else updateCamera(dt);
  updateItems();
  world.update(dt, time, camera.position, pp(), player.speed); lights.follow(state === 'title' ? { x: 0, y: 3, z: 0 } : pp());
  if (state === 'play') ui.drawMap(pp(), player.facing);
  if (hintT > 0 && (hintT -= dt) <= 0) $('hint').classList.remove('on');
}
window.__g.advance = (secs) => { for (let t = 0; t < secs; t += 1 / 60) tick(1 / 60); }; // para pruebas automáticas
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (window.__g.paused) return;
  if (!menuOpen || state === 'title') tick(dt); // el juego se detiene con el menú abierto
  draw();
  // si el equipo va lento, baja la resolución de a poco
  fpsT += dt; fpsN++; if (fpsT > 3) { if (opts.calidad === 'auto' && !menuOpen && fpsN / fpsT < 27 && pr > 0.6) { pr = Math.max(0.6, pr - 0.25); renderer.setPixelRatio(pr); post.resize(); } fpsT = fpsN = 0; }
}
frame();
