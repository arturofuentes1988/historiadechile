import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { shared, paintMaterial } from './strokes.js';
import { buildWorld, height, PLAY_RADIUS } from './world.js';
import { Cinematic } from './cinematic.js';

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
function buildBoy() {
  const g = new THREE.Group(), skin = paintMaterial({ color: 0xa9714b }), dark = paintMaterial({ color: 0x1d1a1c });
  const poncho = paintMaterial({ color: 0x3a3440 }), band = paintMaterial({ color: 0xb3262e }), wool = paintMaterial({ color: 0x8a7a66 });
  const limb = (mat, len, r) => { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 7), mat); m.position.y = -len / 2; p.add(m); return p; };
  const legL = limb(skin, 0.5, 0.07), legR = limb(skin, 0.5, 0.07); legL.position.set(0.1, 0.5, 0); legR.position.set(-0.1, 0.5, 0);
  const armL = limb(skin, 0.42, 0.055), armR = limb(skin, 0.42, 0.055); armL.position.set(0.27, 0.98, 0); armR.position.set(-0.27, 0.98, 0);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.33, 0.6, 9), poncho); body.position.y = 0.76;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.335, 0.07, 9), band); stripe.position.y = 0.52;
  const under = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 8), wool); under.position.y = 0.42;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 10), skin); head.position.y = 1.2;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), dark); hair.position.set(0, 1.23, -0.035); hair.scale.set(1, 1, 1.05);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.045, 12), band); tr.position.y = 1.26; // trarilonko
  g.add(legL, legR, armL, armR, body, stripe, under, head, hair, tr);
  return { g, legL, legR, armL, armR };
}
const boy = buildBoy(); scene.add(boy.g);

const RAD = 0.3, HALF = 0.36, FEET = HALF + RAD;
const pBody = physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, height(0, 0) + FEET + 0.05, 0));
const pCol = physics.createCollider(RAPIER.ColliderDesc.capsule(HALF, RAD), pBody);
const ctrl = physics.createCharacterController(0.02);
ctrl.enableAutostep(0.3, 0.2, true); ctrl.setMaxSlopeClimbAngle(0.95); ctrl.setMinSlopeSlideAngle(1.0);

const player = { vy: 0, grounded: false, facing: Math.PI, phase: 0, speed: 0 };
const cam = { yaw: 0.5, pitch: 0.22, dist: 5.2 };
const keys = {};
let state = 'title', got = 0, time = 0;

const cine = new Cinematic(camera);
const pp = () => pBody.translation();

function intro() {
  state = 'cine'; $('title').classList.add('hide');
  const p = V3(0, height(0, 0) + 1, 0);
  cine.play([
    { dur: 8, from: V3(70, 46, 120), to: V3(40, 34, 70), lookFrom: world.volcano, lookTo: world.volcano.clone().add(V3(0, -40, 0)), text: 'Tierras de Nahuelbuta. Verano de 1546.' },
    { dur: 8, from: V3(34, 24, 44), to: V3(12, 6, 15), lookFrom: V3(0, 14, 0), lookTo: p, text: 'Antes de ser toqui, antes de la guerra, Leftraru era un niño del bosque.' },
    { dur: 7, from: V3(5, p.y + 1.2, 6), to: V3(2.4, p.y + 0.5, 3.2), lookFrom: p, text: 'Su padre le encargó algo simple: reunir piñones del pewen antes de que caiga el sol.' },
  ], () => { state = 'play'; $('hud').classList.add('on'); hint('Muévete con WASD · Espacio: saltar · Shift: correr', 7); });
}
function outro() {
  state = 'cine'; $('hud').classList.remove('on'); world.smoke.visible = true;
  const p = V3(pp().x, pp().y + 0.6, pp().z), dir = world.smokePos.clone().sub(p).setY(0).normalize();
  cine.play([
    { dur: 6, from: p.clone().addScaledVector(dir, 3.5).add(V3(0, 0.6, 0)), to: p.clone().addScaledVector(dir, 2.6).add(V3(0, 0.3, 0)), lookFrom: p, text: 'El último piñón. Leftraru sonríe… y entonces lo escucha.' },
    { dur: 10, from: p.clone().addScaledVector(dir, -4).add(V3(0, 2, 0)), to: p.clone().addScaledVector(dir, -6).add(V3(0, 34, 0)), lookFrom: p.clone().add(V3(0, 6, 0)), lookTo: world.smokePos, text: 'Un trueno que no viene del cielo. Humo sobre el valle. Y un sonido que el bosque no conoce: cascos.' },
  ], () => { state = 'play'; $('end').classList.add('on'); });
}
let hintT = 0;
function hint(txt, secs) { $('hint').textContent = txt; $('hint').classList.add('on'); hintT = secs; }

addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Enter') { if (state === 'title') intro(); else cine.skip(); }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
$('title').addEventListener('click', () => { if (state === 'title') intro(); });
renderer.domElement.addEventListener('click', () => { if (state === 'play') renderer.domElement.requestPointerLock?.(); });
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  cam.yaw -= e.movementX * 0.0028; cam.pitch = Math.min(1.2, Math.max(-0.25, cam.pitch + e.movementY * 0.0022));
});

function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (state === 'play') {
    ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    cam.yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * dt * 1.8;
  }
  const run = keys.ShiftLeft || keys.ShiftRight, target = ix || iz ? (run ? 6.2 : 3.3) : 0;
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; const l = Math.hypot(dx, dz);
  if (l > 0) { dx /= l; dz /= l; player.dirX = dx; player.dirZ = dz; let d = Math.atan2(dx, dz) - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); player.facing += d * Math.min(1, dt * 12); }
  if (player.grounded && state === 'play' && keys.Space) { player.vy = 6.6; player.grounded = false; }
  player.vy = Math.max(-25, player.vy - 18 * dt);
  if (player.vy > 0) ctrl.disableSnapToGround(); else ctrl.enableSnapToGround(0.3);
  const mvx = (player.dirX || 0) * player.speed * dt, mvz = (player.dirZ || 0) * player.speed * dt;
  ctrl.computeColliderMovement(pCol, { x: mvx, y: player.vy * dt, z: mvz });
  const m = ctrl.computedMovement(), p = pp();
  player.grounded = ctrl.computedGrounded();
  if (player.grounded && player.vy < 0) player.vy = -1;
  let nx = p.x + m.x, ny = p.y + m.y, nz = p.z + m.z; const r = Math.hypot(nx, nz);
  if (r > PLAY_RADIUS) { nx *= PLAY_RADIUS / r; nz *= PLAY_RADIUS / r; }
  if (ny < height(nx, nz) - 2) ny = height(nx, nz) + FEET + 0.2; // red de seguridad
  pBody.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
  physics.timestep = dt; physics.step();

  // animación procedural
  const t = pp(); boy.g.position.set(t.x, t.y - FEET, t.z); boy.g.rotation.y = player.facing;
  player.phase += dt * (2.5 + player.speed * 1.9);
  const amp = Math.min(1, player.speed / 3.3) * (player.speed > 4.5 ? 1.0 : 0.6), sw = Math.sin(player.phase) * amp;
  if (player.grounded) { boy.legL.rotation.x = sw; boy.legR.rotation.x = -sw; boy.armL.rotation.x = -sw * 0.8; boy.armR.rotation.x = sw * 0.8; boy.armL.rotation.z = 0.12; boy.armR.rotation.z = -0.12; boy.g.position.y += Math.abs(Math.cos(player.phase)) * 0.04 * amp; }
  else { boy.legL.rotation.x = 0.5; boy.legR.rotation.x = -0.35; boy.armL.rotation.x = boy.armR.rotation.x = -0.4; boy.armL.rotation.z = 0.9; boy.armR.rotation.z = -0.9; }
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
      it.taken = true; it.mesh.visible = false; got++;
      $('count').textContent = got;
      if (got === world.items.length) outro();
      else if (got === world.items.length - 1) hint('Falta uno. Busca las rocas escalonadas y sube saltando.', 8);
    }
  }
}

$('total').textContent = world.items.length;
$('loading').remove();
window.__g = { player, cam, world, pp, get state() { return state; }, get got() { return got; }, cine, intro, paused: false, keys,
  tp(x, y, z) { pBody.setTranslation({ x, y, z }, true); player.vy = 0; },
  snap() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.9); } };

const clock = new THREE.Clock();
function tick(dt) {
  time += dt; shared.uTime.value = time;
  updatePlayer(dt);
  if (cine.active) cine.update(dt);
  else if (state === 'title') { const a = time * 0.05; camera.position.set(Math.sin(a) * 30, height(0, 0) + 9, Math.cos(a) * 30); camera.lookAt(0, height(0, 0) + 6, 0); }
  else updateCamera(dt);
  updateItems();
  if (hintT > 0 && (hintT -= dt) <= 0) $('hint').classList.remove('on');
}
window.__g.advance = (secs) => { for (let t = 0; t < secs; t += 1 / 60) tick(1 / 60); }; // para pruebas automáticas
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (window.__g.paused) return;
  tick(dt);
  renderer.render(scene, camera);
}
frame();
