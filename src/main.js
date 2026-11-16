import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { shared } from './strokes.js';
import { buildWorld } from './world.js';
import { height, inBounds, POI, CERRO } from './terrain.js';
import { buildPerson, animatePerson } from './life.js';
import { Cinematic } from './cinematic.js';
import { createUI } from './ui.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = (id) => document.getElementById(id);

await RAPIER.init();
const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 3000);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const world = buildWorld(scene, RAPIER, physics);

// ---------- Leftraru niño (personaje provisional, hecho de formas pintadas) ----------
const boy = buildPerson(); scene.add(boy.g);
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
  hint('Sigue el sendero hacia el norte, al bosque de pewenes · WASD para moverte', 9);
  ui.unlock('leftraru', 'curinancu', 'nahuelbuta');
}

// ---------- opciones (se guardan en este navegador) ----------
const opts = Object.assign({ calidad: 'auto', detalle: '1', sens: 1, inv: false, mini: true }, JSON.parse(localStorage.getItem('leftraru.opciones') || '{}'));
const detalleInicial = opts.detalle;
let menuOpen = false, pr = Math.min(devicePixelRatio, 1.5);
function applyOpts() {
  pr = opts.calidad === 'auto' ? Math.min(devicePixelRatio, 1.5) : Math.min(parseFloat(opts.calidad), Math.max(1, devicePixelRatio));
  renderer.setPixelRatio(pr); document.body.classList.toggle('nomini', !opts.mini);
  $('o-reload').hidden = opts.detalle === detalleInicial;
  localStorage.setItem('leftraru.opciones', JSON.stringify(opts));
}
function setMenu(on) {
  menuOpen = on; $('menu').classList.toggle('on', on); document.body.classList.toggle('en-portada', state === 'title');
  if (on) { ui.show(null); document.exitPointerLock?.(); for (const k in keys) keys[k] = false; }
}
$('o-calidad').value = opts.calidad; $('o-detalle').value = opts.detalle; $('o-sens').value = opts.sens; $('o-inv').checked = opts.inv; $('o-mini').checked = opts.mini;
$('o-calidad').onchange = (e) => { opts.calidad = e.target.value; applyOpts(); };
$('o-detalle').onchange = (e) => { opts.detalle = e.target.value; applyOpts(); };
$('o-sens').oninput = (e) => { opts.sens = parseFloat(e.target.value); applyOpts(); };
$('o-inv').onchange = (e) => { opts.inv = e.target.checked; applyOpts(); };
$('o-mini').onchange = (e) => { opts.mini = e.target.checked; applyOpts(); };
$('o-recargar').onclick = $('m-portada').onclick = () => location.reload();
$('m-continuar').onclick = () => { setMenu(false); if (state === 'play') renderer.domElement.requestPointerLock?.(); };
$('btn-menu').onclick = () => setMenu(!menuOpen);
$('c-entrar').onclick = enter; $('c-opciones').onclick = () => setMenu(true);
// pantalla completa
const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => hint('Este navegador no permitió la pantalla completa', 4)); };
$('btn-full').onclick = toggleFull; $('o-full').onchange = toggleFull;
document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; $('o-full').checked = on; $('btn-full').textContent = on ? '⛶ Salir de pantalla completa' : '⛶ Pantalla completa'; });
if (!document.documentElement.requestFullscreen) { $('btn-full').style.display = 'none'; $('o-full').parentElement.style.display = 'none'; }
// al soltar el ratón con Escape durante el juego, se abre el menú
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state === 'play' && !ui.open && !menuOpen) setMenu(true); });

function outro() {
  setMenu(false); state = 'cine'; ui.show(null); document.body.classList.remove('playing'); $('hud').classList.remove('on');
  const p = V3(pp().x, pp().y + 0.6, pp().z), dir = world.volcano.clone().sub(p).setY(0).normalize();
  cine.play([
    { dur: 6, from: p.clone().addScaledVector(dir, 3.5).add(V3(0, 0.6, 0)), to: p.clone().addScaledVector(dir, 2.6).add(V3(0, 0.3, 0)), lookFrom: p, text: 'El último piñón. Suficientes para todos.' },
    { dur: 10, from: p.clone().addScaledVector(dir, -4).add(V3(0, 2, 0)), to: p.clone().addScaledVector(dir, -8).add(V3(0, 36, 0)), lookFrom: p.clone().add(V3(0, 6, 0)), lookTo: world.volcano, text: 'Desde el cerro, su padre lo llama. Hay algo que quiere mostrarle.' },
  ], () => { state = 'play'; document.body.classList.add('playing'); $('end').classList.add('on'); });
}
let hintT = 0;
function hint(txt, secs) { $('hint').textContent = txt; $('hint').classList.add('on'); hintT = secs; }

addEventListener('keydown', (e) => {
  if (e.code === 'Enter') { if (state === 'title') enter(); else cine.skip(); }
  if (e.code === 'KeyF' && !e.repeat) toggleFull();
  if (menuOpen) { if (e.code === 'Escape') setMenu(false); return; }
  keys[e.code] = true;
  if (state === 'play' && e.code === 'KeyN') { ui.show('notas'); ui.seen(); }
  if (state === 'play' && e.code === 'KeyB') ui.show('bolsa');
  if (state === 'play' && e.code === 'KeyM') ui.show('mapa');
  if (e.code === 'Escape') { if (ui.open) ui.show(null); else if (state !== 'cine') setMenu(true); }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', () => { if (state === 'play' && !ui.open && !menuOpen) renderer.domElement.requestPointerLock?.(); });
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  cam.yaw -= e.movementX * 0.0028 * opts.sens; cam.pitch = Math.min(1.2, Math.max(-0.25, cam.pitch + e.movementY * 0.0022 * opts.sens * (opts.inv ? -1 : 1)));
});

function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (state === 'play' && !ui.open) {
    ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    cam.yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * dt * 1.8;
  }
  const run = keys.ShiftLeft || keys.ShiftRight, target = ix || iz ? (run ? 6.2 : 3.3) : 0;
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; const l = Math.hypot(dx, dz);
  if (l > 0) { dx /= l; dz /= l; player.dirX = dx; player.dirZ = dz; let d = Math.atan2(dx, dz) - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); player.facing += d * Math.min(1, dt * 12); }
  if (player.grounded && state === 'play' && !ui.open && keys.Space) { player.vy = 6.6; player.grounded = false; }
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
  const amp = Math.min(1, player.speed / 3.3) * (player.speed > 4.5 ? 1.0 : 0.6);
  animatePerson(boy, player.phase, amp, !player.grounded);
  if (player.grounded) boy.g.position.y += Math.abs(Math.cos(player.phase)) * 0.04 * amp;
  for (const k in POI) if (state === 'play' && Math.hypot(t.x - POI[k].x, t.z - POI[k].z) < 20) ui.discover(k);
}

function updateCamera(dt) {
  const t = pp(), cp = Math.cos(cam.pitch), d = { x: Math.sin(cam.yaw) * cp, y: Math.sin(cam.pitch), z: Math.cos(cam.yaw) * cp };
  // si un tronco o roca tapa al personaje, la cámara se acerca
  const hit = physics.castRay(new RAPIER.Ray({ x: t.x, y: t.y + 0.75, z: t.z }, d), cam.dist, true, undefined, undefined, pCol);
  const dist = hit ? Math.max(0.9, (hit.timeOfImpact ?? hit.toi) - 0.3) : cam.dist;
  let x = t.x + d.x * dist, y = t.y + 0.75 + d.y * dist, z = t.z + d.z * dist;
  y = Math.max(y, height(x, z) + 0.5);
  camera.position.lerp(V3(x, y, z), Math.min(1, dt * 9)); camera.lookAt(t.x, t.y + 0.75, t.z);
}

function updateItems() {
  const t = pp();
  for (const it of world.items) {
    if (it.taken) continue;
    it.mesh.position.y = it.base.y + Math.sin(time * 2 + it.base.x) * 0.15; it.mesh.rotation.y = time * 1.5;
    if (state === 'play' && Math.hypot(t.x - it.base.x, t.y - it.base.y + 0.3, t.z - it.base.z) < 1.25) {
      it.taken = true; it.mesh.visible = false; got++; ui.addItem('pinon');
      if (got === 1) ui.unlock('pinon', 'pewen', 'ngen'); if (got === 2) ui.unlock('copihue'); if (got === 3) ui.unlock('pewen-sagrado'); if (got === 4) ui.unlock('traro');
      $('count').textContent = got;
      if (got === world.items.length) outro();
      else if (got === world.items.length - 1) hint('Falta uno. Está sobre las rocas, al fondo del bosque: sube saltando.', 8);
    }
  }
}

const ui = createUI({ world, onToast: (t) => hint(t, 5) });
$('total').textContent = world.items.length;
$('loading').remove();
window.__g = { ui, player, cam, world, pp, get state() { return state; }, get got() { return got; }, cine, enter, setMenu, opts, get menuOpen() { return menuOpen; }, paused: false, keys,
  tp(x, y, z) { pBody.setTranslation({ x, y, z }, true); player.vy = 0; },
  view(x, y, z, lx, ly, lz) { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); world.update(0, time, camera.position, pp()); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  snap() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.9); } };

const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0;
applyOpts();
function tick(dt) {
  time += dt; shared.uTime.value = time;
  updatePlayer(dt);
  if (cine.active) cine.update(dt);
  else if (state === 'title') { const a = time * 0.04 + 2.4; camera.position.set(Math.sin(a) * 48, 15, Math.cos(a) * 48); camera.lookAt(0, 5, 0); }
  else updateCamera(dt);
  updateItems();
  world.update(dt, time, camera.position, pp());
  if (state === 'play') ui.drawMap(pp(), player.facing);
  if (hintT > 0 && (hintT -= dt) <= 0) $('hint').classList.remove('on');
}
window.__g.advance = (secs) => { for (let t = 0; t < secs; t += 1 / 60) tick(1 / 60); }; // para pruebas automáticas
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (window.__g.paused) return;
  if (!menuOpen || state === 'title') tick(dt); // el juego se detiene con el menú abierto
  renderer.render(scene, camera);
  // si el equipo va lento, baja la resolución de a poco
  fpsT += dt; fpsN++; if (fpsT > 3) { if (opts.calidad === 'auto' && !menuOpen && fpsN / fpsT < 27 && pr > 0.6) { pr = Math.max(0.6, pr - 0.25); renderer.setPixelRatio(pr); } fpsT = fpsN = 0; }
}
frame();
