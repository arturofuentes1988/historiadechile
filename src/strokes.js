// Sistema de pinceladas: cada objeto del mundo se pinta con trazos instanciados.
// El orden de los trazos NO depende de la cámara: se usa descarte por alfa + buffer
// de profundidad, así la pintura no "repta" al moverse.
import * as THREE from 'three';

THREE.ColorManagement.enabled = false; // trabajamos directo en sRGB, como una paleta de pintor

export const SUN = new THREE.Vector3(0.55, 0.62, 0.35).normalize();

export const shared = {
  uTime: { value: 0 },
  uFogColor: { value: new THREE.Color(0xb9c7c4) },
  uFogDensity: { value: 0.0062 },
};

export function hex(h) {
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
}

// Paletas de 3 colores (sombra, medio, luz) por material
export const PAL = {
  grass: [0x3d5a2a, 0x6f8f3a, 0xb5b84e],
  floor: [0x4a3a26, 0x7a5f38, 0xb08c4e],
  rock: [0x4b4f5a, 0x7d8088, 0xb9b4a8],
  trunk: [0x2e2622, 0x54463c, 0x80705f],
  pewen: [0x16301f, 0x24502d, 0x4f7f3a],
  fern: [0x2f5d2a, 0x5c9440, 0xa6c85a],
  copihue: [0x8e1f2a, 0xc93040, 0xee6a6a],
  snow: [0x9fb0cc, 0xd9e2ee, 0xfff6e8],
  volcano: [0x3e4a66, 0x5a6a88, 0x8a94aa],
  hills: [0x46607a, 0x5f7f92, 0x86a3a8],
  smoke: [0x3a3a3e, 0x5a5856, 0x8a8580],
};
for (const k in PAL) PAL[k] = PAL[k].map(hex);

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Elige uno de los 3 colores según la luz del sol (fija), con algo de azar de pintor
export function shade(pal, nx, ny, nz, rng, bias = 0) {
  const d = nx * SUN.x + ny * SUN.y + nz * SUN.z + (rng() - 0.5) * 0.5 + bias;
  const c = d > 0.55 ? pal[2] : d > 0.05 ? pal[1] : pal[0];
  const j = (rng() - 0.5) * 0.07;
  return [c[0] + j, c[1] + j * 0.8, c[2] + j * 0.6];
}

const GLSL_NOISE = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}`;

const STROKE_VERT = /* glsl */ `
attribute vec3 iPos; attribute vec3 iNormal;
attribute vec4 iShape; // ancho, alto, rotación, semilla
attribute vec4 iColor; // rgb, modo (0 pegado a la superficie, 1 de cara a la cámara)
uniform float uTime; uniform float uSway;
varying vec2 vUv; varying vec3 vColor; varying float vSeed; varying float vDist;
void main(){
  vUv = uv; vColor = iColor.rgb; vSeed = iShape.w;
  float c = cos(iShape.z), s = sin(iShape.z);
  vec2 q = position.xy * iShape.xy; q = vec2(c*q.x - s*q.y, s*q.x + c*q.y);
  vec3 center = iPos;
  vec4 mv;
  if (iColor.a < 0.5) {
    vec3 n = normalize(iNormal);
    vec3 up = abs(n.y) < 0.95 ? vec3(0.,1.,0.) : vec3(1.,0.,0.);
    vec3 t = normalize(cross(up, n)); vec3 b = cross(n, t);
    mv = viewMatrix * vec4(center + t*q.x + b*q.y + n*0.03, 1.);
  } else {
    center.x += sin(uTime*1.3 + iPos.x*0.3 + iPos.y*0.5) * 0.07 * uSway;
    center.z += cos(uTime*1.1 + iPos.z*0.3) * 0.06 * uSway;
    mv = viewMatrix * vec4(center, 1.); mv.xy += q;
  }
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const STROKE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uFogColor; uniform float uFogDensity; uniform float uFogScale; uniform float uFogMax;
varying vec2 vUv; varying vec3 vColor; varying float vSeed; varying float vDist;
${GLSL_NOISE}
void main(){
  vec2 p = vUv - 0.5;
  float n1 = vnoise(vec2(vUv.x*4. + vSeed*37., vUv.y*26. + vSeed*91.)); // cerdas del pincel
  float n2 = vnoise(vec2(vUv.x*9. + vSeed*13., vSeed*57.));
  float ex = abs(p.x)*2. + (n1-.5)*0.45;
  float ey = abs(p.y)*2. + (n2-.5)*0.35;
  if (ex > 0.92 || ey > 0.9) discard;
  vec3 col = vColor * (0.9 + 0.2*n1) + (1.-ey)*0.035;
  float f = min(1. - exp(-pow(vDist*uFogDensity*uFogScale, 2.)), uFogMax);
  gl_FragColor = vec4(mix(col, uFogColor, f), 1.);
}`;

export class StrokeBatch {
  constructor() { this.pos = []; this.nor = []; this.shape = []; this.col = []; this.n = 0; }
  add(x, y, z, nx, ny, nz, w, h, rot, color, mode = 0) {
    this.pos.push(x, y, z); this.nor.push(nx, ny, nz);
    this.shape.push(w, h, rot, (this.n * 0.6180339) % 1);
    this.col.push(color[0], color[1], color[2], mode);
    this.n++;
  }
  build({ fogScale = 1, fogMax = 0.78, sway = 0 } = {}) {
    const g = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
    const ia = (arr, n) => new THREE.InstancedBufferAttribute(new Float32Array(arr), n);
    g.setAttribute('iPos', ia(this.pos, 3)); g.setAttribute('iNormal', ia(this.nor, 3));
    g.setAttribute('iShape', ia(this.shape, 4)); g.setAttribute('iColor', ia(this.col, 4));
    g.instanceCount = this.n;
    const m = new THREE.ShaderMaterial({
      vertexShader: STROKE_VERT, fragmentShader: STROKE_FRAG, side: THREE.DoubleSide,
      uniforms: { ...shared, uFogScale: { value: fogScale }, uFogMax: { value: fogMax }, uSway: { value: sway } },
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    return mesh;
  }
}

// Material "pintado" para mallas sólidas (base bajo los trazos y personaje):
// 3 bandas de color con bordes irregulares, sin degradados.
export function paintMaterial({ color = 0xffffff, vertexColors = false, fogScale = 1 } = {}) {
  return new THREE.ShaderMaterial({
    vertexColors,
    uniforms: { ...shared, uColor: { value: new THREE.Color(color) }, uSun: { value: SUN }, uFogScale: { value: fogScale } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying float vDist; varying vec3 vC;
      void main(){
        #ifdef USE_COLOR
          vC = color;
        #else
          vC = vec3(1.);
        #endif
        vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uColor; uniform vec3 uSun; uniform vec3 uFogColor; uniform float uFogDensity; uniform float uFogScale;
      varying vec3 vN; varying vec3 vW; varying float vDist; varying vec3 vC;
      ${GLSL_NOISE}
      void main(){
        vec3 base = uColor * vC;
        float n = vnoise(vW.xy*7. + vW.z*5.) - 0.5;
        float d = dot(normalize(vN), uSun) + n*0.35;
        vec3 col = d > 0.4 ? base*1.22 + vec3(0.05,0.04,0.0) : d > -0.05 ? base : base*vec3(0.58,0.6,0.72);
        col *= 0.95 + 0.1*vnoise(vW.xz*18. + vW.y*11.);
        float f = min(1. - exp(-pow(vDist*uFogDensity*uFogScale, 2.)), 0.78);
        gl_FragColor = vec4(mix(col, uFogColor, f), 1.);
      }`,
  });
}

export function skyDome() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*viewMatrix*vec4(position + cameraPosition, 1.); }`,
    fragmentShader: /* glsl */ `
      precision highp float; varying vec3 vD; uniform vec3 uSun;
      ${GLSL_NOISE}
      void main(){
        vec3 d = normalize(vD);
        float a = atan(d.z, d.x);
        float streak = vnoise(vec2(a*6., d.y*40.)) * 0.5 + vnoise(vec2(a*14. + 3., d.y*90.)) * 0.5;
        float h = clamp(d.y + (streak-.5)*0.12, 0., 1.);
        vec3 col = mix(vec3(0.95,0.86,0.66), vec3(0.62,0.76,0.82), smoothstep(0., 0.28, h));
        col = mix(col, vec3(0.36,0.55,0.74), smoothstep(0.25, 0.9, h));
        float cl = smoothstep(0.58, 0.8, vnoise(vec2(a*2.5, d.y*9.)) * 0.6 + streak*0.4) * smoothstep(0.03, 0.2, d.y);
        col = mix(col, vec3(0.98,0.93,0.84), cl*0.75);
        col += vec3(1.,0.85,0.55) * pow(max(dot(d, uSun), 0.), 24.) * 0.5;
        if (d.y < 0.) col = vec3(0.73,0.78,0.77);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), m);
  mesh.frustumCulled = false; mesh.renderOrder = -1;
  return mesh;
}
