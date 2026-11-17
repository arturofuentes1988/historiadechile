// Cinemáticas dentro del motor: una lista de planos (cámara de A a B + lo que se dice).
// Se escriben como datos, así cada escena de la historia es fácil de editar.
import * as THREE from 'three';

const ease = (t) => t * t * (3 - 2 * t);

export class Cinematic {
  constructor(camera) {
    this.camera = camera; this.active = false;
    this.sub = document.getElementById('sub'); this.who = document.getElementById('sub-name'); this.text = document.getElementById('sub-text'); this.body = document.body;
    this._p = new THREE.Vector3(); this._l = new THREE.Vector3();
  }
  // shots: [{ dur, from, to, lookFrom, lookTo, text, who, on, cam, fov }]
  //   who: quién habla (sin nombre, el texto es relato); on: se llama al empezar el plano, para acomodar a los personajes;
  //   cam(camera, k): en vez de ir de A a B, la cámara se coloca cada cuadro (para seguir algo que se mueve); fov: ángulo de este plano.
  play(shots, onEnd) {
    this.shots = shots; this.i = 0; this.t = 0; this.onEnd = onEnd; this.active = true; this.fov0 = this.camera.fov;
    this.body.classList.add('cine'); this._show();
  }
  _fov(f) { if (this.camera.fov !== f) { this.camera.fov = f; this.camera.updateProjectionMatrix(); } }
  _show() {
    const s = this.shots[this.i];
    this.who.textContent = s.who || ''; this.text.textContent = s.text || ''; this.sub.classList.toggle('relato', !s.who); this.sub.classList.toggle('on', !!s.text);
    this._fov(s.fov || this.fov0); if (s.on) s.on();
  }
  skip() { if (this.active) this._finish(); }
  _finish() {
    this.active = false; this.body.classList.remove('cine'); this.sub.classList.remove('on'); this._fov(this.fov0);
    if (this.onEnd) this.onEnd();
  }
  update(dt) {
    if (!this.active) return;
    const s = this.shots[this.i]; this.t += dt;
    const k = ease(Math.min(1, this.t / s.dur));
    if (s.cam) s.cam(this.camera, k);
    else { this._p.lerpVectors(s.from, s.to, k); this._l.lerpVectors(s.lookFrom, s.lookTo || s.lookFrom, k); this.camera.position.copy(this._p); this.camera.lookAt(this._l); }
    if (this.t >= s.dur) { this.i++; this.t = 0; if (this.i >= this.shots.length) this._finish(); else this._show(); }
  }
}
