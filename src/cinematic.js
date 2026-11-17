// Cinemáticas dentro del motor: una lista de planos (cámara de A a B + subtítulo).
// Se escriben como datos, así cada escena de la historia es fácil de editar.
import * as THREE from 'three';

const ease = (t) => t * t * (3 - 2 * t);

export class Cinematic {
  constructor(camera) {
    this.camera = camera; this.active = false;
    this.sub = document.getElementById('sub'); this.body = document.body;
    this._p = new THREE.Vector3(); this._l = new THREE.Vector3();
  }
  // shots: [{ dur, from, to, lookFrom, lookTo, text, on }]; "on" se llama al empezar el plano (para acomodar a los personajes)
  play(shots, onEnd) {
    this.shots = shots; this.i = 0; this.t = 0; this.onEnd = onEnd; this.active = true;
    this.body.classList.add('cine'); this._show();
  }
  _show() { const s = this.shots[this.i]; this.sub.textContent = s.text || ''; this.sub.classList.toggle('on', !!s.text); if (s.on) s.on(); }
  skip() { if (this.active) this._finish(); }
  _finish() {
    this.active = false; this.body.classList.remove('cine'); this.sub.classList.remove('on');
    if (this.onEnd) this.onEnd();
  }
  update(dt) {
    if (!this.active) return;
    const s = this.shots[this.i]; this.t += dt;
    const k = ease(Math.min(1, this.t / s.dur));
    this._p.lerpVectors(s.from, s.to, k); this._l.lerpVectors(s.lookFrom, s.lookTo || s.lookFrom, k);
    this.camera.position.copy(this._p); this.camera.lookAt(this._l);
    if (this.t >= s.dur) { this.i++; this.t = 0; if (this.i >= this.shots.length) this._finish(); else this._show(); }
  }
}
