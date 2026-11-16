// Gráficos realistas hechos por código: texturas generadas, materiales con luz y sombra reales,
// agua, cielo y partículas. No se usa ninguna imagen ni modelo externo.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export const SUN = new THREE.Vector3(0.62, 0.4, -0.44).normalize(); // sol bajo y dorado de la mañana, desde el nororiente
export const uTime = { value: 0 };
export const FOG = { color: new THREE.Color(0xc9cdc4), density: 0.0038 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- texturas generadas ----------
const rnd = mulberry32(77), R = (a, b) => a + (b - a) * rnd();
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
function tex(c, { repeat, srgb = true, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (!wrap) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; } // las hojas no deben adelgazar a lo lejos
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(...repeat); t.anisotropy = 8; return t;
}
const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

// ruido repetible (sin costuras), en gris, para dar grano y relieve a las superficies
function noiseCanvas(size, { oct = 5, lo = 150, hi = 255, base = 4 } = {}) {
  const [c, x] = canvas(size, size), img = x.createImageData(size, size), d = img.data, grids = [];
  for (let o = 0; o < oct; o++) { const n = base << o, g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = rnd(); grids.push([n, g]); }
  for (let py = 0, k = 0; py < size; py++) for (let px = 0; px < size; px++, k += 4) {
    let v = 0, amp = 0.5, tot = 0;
    for (const [n, g] of grids) {
      const fx = (px / size) * n, fy = (py / size) * n, ix = fx | 0, iy = fy | 0; let u = fx - ix, w = fy - iy; u = u * u * (3 - 2 * u); w = w * w * (3 - 2 * w);
      const a = g[iy * n + ix], b = g[iy * n + ((ix + 1) % n)], e = g[((iy + 1) % n) * n + ix], f = g[((iy + 1) % n) * n + ((ix + 1) % n)];
      v += (a + (b - a) * u + (e - a) * w + (a - b - e + f) * u * w) * amp; tot += amp; amp *= 0.55;
    }
    const s = lo + (hi - lo) * (v / tot); d[k] = d[k + 1] = d[k + 2] = s; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
}

function leafCanvas({ n, len, wid, cols, twig = 5 }) { // ramillete de hojas para una "tarjeta" de follaje
  const [c, x] = canvas(256, 256);
  x.strokeStyle = rgb(52, 40, 30); x.lineCap = 'round';
  for (let i = 0; i < twig; i++) { const a = R(0, 6.28), l = R(50, 105); x.lineWidth = R(1.5, 3.5); x.beginPath(); x.moveTo(128, 128); x.quadraticCurveTo(128 + Math.cos(a + 0.4) * l * 0.5, 128 + Math.sin(a + 0.4) * l * 0.5, 128 + Math.cos(a) * l, 128 + Math.sin(a) * l); x.stroke(); }
  for (let i = 0; i < n; i++) {
    const a = R(0, 6.28), d = Math.sqrt(rnd()) * 108, col = cols[(rnd() * cols.length) | 0], k = R(0.72, 1.12), l = len * R(0.7, 1.25), w = wid * R(0.7, 1.2);
    x.save(); x.translate(128 + Math.cos(a) * d, 128 + Math.sin(a) * d); x.rotate(R(0, 6.28));
    x.fillStyle = rgb(col[0] * k, col[1] * k, col[2] * k); x.beginPath(); x.moveTo(-l, 0); x.quadraticCurveTo(0, -w, l, 0); x.quadraticCurveTo(0, w, -l, 0); x.fill();
    x.strokeStyle = rgb(col[0] * k * 1.35, col[1] * k * 1.3, col[2] * k * 1.2, 0.55); x.lineWidth = 0.8; x.beginPath(); x.moveTo(-l, 0); x.lineTo(l, 0); x.stroke(); x.restore();
  }
  return c;
}
function pewenCanvas() { // rama de araucaria: una cuerda gruesa cubierta de hojas duras y puntiagudas
  const [c, x] = canvas(256, 96);
  x.strokeStyle = rgb(48, 38, 30); x.lineWidth = 7; x.beginPath(); x.moveTo(0, 48); x.lineTo(256, 48); x.stroke();
  for (let i = 0; i < 520; i++) {
    const px = R(-4, 252), s = rnd() < 0.5 ? 1 : -1, l = R(13, 30), k = R(0.6, 1.15), lean = R(5, 15);
    x.fillStyle = rgb(36 * k, 78 * k, 40 * k); x.beginPath(); x.moveTo(px - 5, 48 + s * R(0, 5)); x.lineTo(px + lean, 48 + s * l); x.lineTo(px + 6, 48 + s * R(0, 5)); x.fill();
  }
  for (let i = 0; i < 80; i++) { const k = R(0.9, 1.4); x.fillStyle = rgb(52 * k, 104 * k, 50 * k, 0.8); const px = R(0, 250); x.beginPath(); x.moveTo(px - 3, 46); x.lineTo(px + 7, 46 + R(-12, 12)); x.lineTo(px + 4, 50); x.fill(); }
  return c;
}
function grassCanvas(cols, tall = false) {
  const [c, x] = canvas(128, 128);
  for (let i = 0; i < (tall ? 16 : 26); i++) {
    const bx = R(10, 118), h = tall ? R(80, 124) : R(45, 118), lean = R(-26, 26), w = R(2.2, 4.6), col = cols[(rnd() * cols.length) | 0], k = R(0.7, 1.15), g = x.createLinearGradient(0, 128, 0, 128 - h);
    g.addColorStop(0, rgb(col[0] * k * 0.55, col[1] * k * 0.6, col[2] * k * 0.5)); g.addColorStop(1, rgb(col[0] * k * 1.25, col[1] * k * 1.2, col[2] * k));
    x.fillStyle = g; x.beginPath(); x.moveTo(bx - w, 128); x.quadraticCurveTo(bx + lean * 0.3, 128 - h * 0.6, bx + lean, 128 - h); x.quadraticCurveTo(bx + lean * 0.4 + w, 128 - h * 0.5, bx + w, 128); x.fill();
  }
  return c;
}
function fernCanvas() {
  const [c, x] = canvas(96, 256);
  x.strokeStyle = rgb(60, 90, 40); x.lineWidth = 2.5; x.beginPath(); x.moveTo(48, 256); x.lineTo(48, 8); x.stroke();
  for (let i = 0; i < 34; i++) { const y = 250 - i * 7.2, l = 44 * Math.sin(Math.min(1, i / 30) * 2.6 + 0.35) * (1 - i / 44), k = R(0.75, 1.15); x.fillStyle = rgb(46 * k, 104 * k, 44 * k); for (const s of [-1, 1]) { x.beginPath(); x.moveTo(48, y); x.quadraticCurveTo(48 + s * l * 0.6, y - 9, 48 + s * l, y - 3); x.quadraticCurveTo(48 + s * l * 0.5, y + 4, 48, y + 3); x.fill(); } }
  return c;
}
function flowerCanvas() {
  const [c, x] = canvas(128, 128);
  for (let i = 0; i < 9; i++) { const bx = R(14, 114), h = R(50, 112); x.strokeStyle = rgb(70, 110, 50); x.lineWidth = 2; x.beginPath(); x.moveTo(bx, 128); x.lineTo(bx + R(-8, 8), 128 - h); x.stroke(); x.fillStyle = '#fff'; for (let p = 0; p < 5; p++) { const a = p * 1.257; x.beginPath(); x.ellipse(bx + Math.cos(a) * 5, 128 - h + Math.sin(a) * 5, 5, 3.2, a, 0, 6.3); x.fill(); } x.fillStyle = rgb(240, 200, 60); x.beginPath(); x.arc(bx, 128 - h, 2.6, 0, 6.3); x.fill(); }
  return c;
}
function streakCanvas(w, h, cols, n, { bands = 0, lw = [1, 3] } = {}) { // corteza, paja, madera: vetas verticales
  const [c, x] = canvas(w, h); x.fillStyle = rgb(...cols[0]); x.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const col = cols[(rnd() * cols.length) | 0], k = R(0.6, 1.25), px = R(0, w), py = R(-h * 0.3, h), l = R(h * 0.15, h * 0.7); x.strokeStyle = rgb(col[0] * k, col[1] * k, col[2] * k, R(0.35, 0.9)); x.lineWidth = R(...lw); x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + R(-5, 5), py + l * 0.3, px + R(-5, 5), py + l * 0.7, px + R(-4, 4), py + l); x.stroke(); }
  for (let b = 0; b < bands; b++) { const y = ((b + 0.5) / bands) * h, g = x.createLinearGradient(0, y - 10, 0, y + 14); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(20,14,6,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, y - 10, w, 24); }
  return c;
}
function textileCanvas() {
  const [c, x] = canvas(64, 128), pat = ['#17151b', '#a82a2e', '#e9dfc6', '#a82a2e', '#17151b', '#17151b', '#e9dfc6', '#a82a2e'];
  for (let i = 0; i < 16; i++) { x.fillStyle = pat[i % 8]; x.fillRect(0, i * 8, 64, 8); }
  x.fillStyle = '#17151b'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(22 + j * 5 + (i % 2) * 2, 30 + i * 18, 4, 4);
  return c;
}
function softCanvas() { const [c, x] = canvas(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; }

const grain = noiseCanvas(512, { oct: 7, lo: 95, hi: 255, base: 6 });
export const TEX = {
  grain: tex(grain), grainBump: tex(grain, { srgb: false }),
  coigue: tex(leafCanvas({ n: 420, len: 8, wid: 4.5, cols: [[52, 104, 44], [68, 124, 52], [40, 84, 40], [90, 140, 58]] }), { wrap: false }),
  roble: tex(leafCanvas({ n: 260, len: 10, wid: 6, cols: [[196, 138, 40], [220, 170, 58], [170, 100, 32], [150, 120, 50]] }), { wrap: false }),
  canelo: tex(leafCanvas({ n: 260, len: 13, wid: 5, cols: [[70, 128, 62], [92, 150, 74], [52, 104, 54]] }), { wrap: false }),
  bush: tex(leafCanvas({ n: 330, len: 9, wid: 5, cols: [[62, 112, 46], [84, 136, 56], [48, 92, 42]], twig: 8 }), { wrap: false }),
  pewen: tex(pewenCanvas(), { wrap: false }),
  grass: tex(grassCanvas([[92, 132, 52], [112, 150, 60], [140, 160, 72]]), { wrap: false }),
  reed: tex(grassCanvas([[150, 146, 78], [124, 138, 70], [176, 164, 96]], true), { wrap: false }),
  fern: tex(fernCanvas(), { wrap: false }), flower: tex(flowerCanvas(), { wrap: false }),
  bark: tex(streakCanvas(256, 512, [[150, 140, 130], [110, 100, 92], [190, 180, 168], [70, 62, 56]], 900)),
  thatch: tex(streakCanvas(512, 512, [[176, 150, 92], [208, 184, 118], [140, 116, 66], [108, 88, 50]], 2600, { bands: 5, lw: [1, 2.4] })),
  wood: tex(streakCanvas(128, 256, [[140, 110, 78], [110, 84, 58], [166, 134, 96]], 300)),
  textile: tex(textileCanvas()), soft: tex(softCanvas(), { wrap: false }),
};

// ---------- materiales ----------
// viento: mueve las hojas y la punta del pasto
export function withWind(m, amp, tipOnly = false, roundNormals = false) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec4 wPos = modelMatrix * instanceMatrix * vec4(position, 1.);
      #else
        vec4 wPos = modelMatrix * vec4(position, 1.);
      #endif
      float wMask = ${tipOnly ? 'uv.y' : '1.0'};
      float gust = sin(uTime*0.7 + wPos.x*0.05 + wPos.z*0.04) * 0.5 + 0.5;
      transformed.x += (sin(uTime*1.5 + wPos.x*0.4 + wPos.y*0.3) * 0.5 + gust) * ${amp.toFixed(3)} * wMask;
      transformed.z += cos(uTime*1.2 + wPos.z*0.4) * ${(amp * 0.6).toFixed(3)} * wMask;`);
    // el follaje usa normales "redondas" (hacia afuera de la copa) para que la luz lo modele como un volumen
    if (roundNormals) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
  };
  return m;
}
export const MAT = {
  leaf: (map, color = 0xffffff) => withWind(new THREE.MeshStandardMaterial({ map, color, alphaTest: 0.3, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.75, metalness: 0, emissiveMap: map, emissive: 0x24301a }), 0.07, false, true),
  bark: (color) => new THREE.MeshStandardMaterial({ map: TEX.bark, bumpMap: TEX.bark, bumpScale: 1.6, color, roughness: 1 }),
  grass: (map, color = 0xffffff) => withWind(new THREE.MeshStandardMaterial({ map, color, alphaTest: 0.3, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.9 }), 0.09, true, true),
  rock: () => new THREE.MeshStandardMaterial({ map: TEX.grain, bumpMap: TEX.grainBump, bumpScale: 4, color: 0xffffff, roughness: 0.95 }),
  thatch: () => new THREE.MeshStandardMaterial({ map: TEX.thatch, bumpMap: TEX.thatch, bumpScale: 3, roughness: 1 }),
  solid: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
};

// Junta muchas piezas sólidas (postes, vasijas, estacas) en una sola malla con sombras
export class GeoBag {
  constructor() { this.p = []; this.n = []; this.c = []; }
  add(geo, matrix, color) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(matrix); g.computeVertexNormals();
    const P = g.attributes.position.array, N = g.attributes.normal.array, col = new THREE.Color(color);
    for (let i = 0; i < P.length; i += 3) { this.p.push(P[i], P[i + 1], P[i + 2]); this.n.push(N[i], N[i + 1], N[i + 2]); this.c.push(col.r, col.g, col.b); }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    const m = new THREE.Mesh(g, MAT.solid()); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; return m;
  }
}

const FOG_GLSL = /* glsl */ `uniform vec3 uFogColor; uniform float uFogDensity;
vec3 fogged(vec3 c, float d){ return mix(uFogColor, c, exp(-uFogDensity*uFogDensity*d*d)); }`;
const fogU = () => ({ uFogColor: { value: FOG.color }, uFogDensity: { value: FOG.density } });
const END = '#include <tonemapping_fragment>\n#include <colorspace_fragment>';

// ---------- agua: refleja el cielo según el ángulo, deja ver el fondo en la orilla y brilla con el sol ----------
export function waterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime, uSun: { value: SUN }, ...fogU() },
    vertexShader: /* glsl */ `attribute float depth; varying vec3 vW; varying float vDepth; varying float vDist;
      void main(){ vW = position; vDepth = depth; vec4 mv = viewMatrix*vec4(position,1.); vDist = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uSun; varying vec3 vW; varying float vDepth; varying float vDist;
      ${FOG_GLSL}
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float waves(vec2 p){ float t = uTime; return vn(p*1.6 + vec2(-t*1.3, t*0.2))*0.5 + vn(p*3.7 + vec2(-t*2.1, -t*0.5))*0.3 + vn(p*8.3 + vec2(-t*3., t*0.9))*0.2; }
      void main(){
        if (vDepth < -0.02) discard;
        vec2 p = vW.xz; float e = 0.12;
        float h0 = waves(p), hx = waves(p + vec2(e, 0.)), hz = waves(p + vec2(0., e));
        vec3 n = normalize(vec3((h0 - hx)*0.55, 1., (h0 - hz)*0.55));
        vec3 v = normalize(cameraPosition - vW), r = reflect(-v, n);
        float fres = 0.03 + 0.97*pow(1. - max(dot(n, v), 0.), 4.);
        vec3 sky = mix(vec3(0.62, 0.74, 0.84), vec3(0.2, 0.42, 0.74), clamp(r.y*1.4, 0., 1.));      // cielo reflejado
        vec3 deep = mix(vec3(0.16, 0.2, 0.13), vec3(0.03, 0.1, 0.11), smoothstep(0., 1.1, vDepth));  // fondo y agua profunda
        vec3 col = mix(deep, sky, fres);
        col += vec3(1., 0.93, 0.78) * pow(max(dot(r, uSun), 0.), 180.) * 2.2;                       // destello del sol
        col = mix(col, vec3(0.85, 0.88, 0.86), smoothstep(0.09, 0.0, vDepth - h0*0.06) * 0.55);      // espuma de orilla
        float a = mix(0.35, 0.94, smoothstep(0., 0.5, vDepth)) + fres*0.3;
        gl_FragColor = vec4(fogged(col, vDist), clamp(a, 0., 1.));
        ${END}
      }`,
  });
}

// ---------- cielo con dispersión atmosférica y una capa de nubes que deriva ----------
export function buildSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false, uniforms: { uSun: { value: SUN } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*viewMatrix*vec4(position + cameraPosition, 1.); }`,
    fragmentShader: /* glsl */ `uniform vec3 uSun; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD); float h = max(d.y, 0.);
        float s0 = max(dot(normalize(vec3(d.x, 0., d.z)), normalize(vec3(uSun.x, 0., uSun.z))), 0.);
        vec3 col = mix(mix(vec3(0.62, 0.72, 0.82), vec3(1.0, 0.82, 0.58), pow(s0, 3.) * 0.75), vec3(0.20, 0.40, 0.72), pow(h, 0.5));   // del horizonte dorado al azul del cenit
        col = mix(col, vec3(0.09, 0.24, 0.58), smoothstep(0.45, 1., h));
        float s = max(dot(d, uSun), 0.);
        col += vec3(1.0, 0.82, 0.55) * (pow(s, 5.) * 0.3 + pow(s, 50.) * 0.9) + vec3(1.0, 0.95, 0.85) * smoothstep(0.9992, 0.9997, s) * 6.; // resplandor y disco del sol
        if (d.y < 0.) col = vec3(0.58, 0.61, 0.56);
        gl_FragColor = vec4(col * 1.7, 1.);
        #include <colorspace_fragment>
      }`,
  }));
  sky.frustumCulled = false; sky.renderOrder = -2; scene.add(sky);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, side: THREE.BackSide, uniforms: { uTime, uSun: { value: SUN } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*viewMatrix*vec4(position + cameraPosition, 1.); }`,
    fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uSun; varying vec3 vD;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = 0.5; for (int i = 0; i < 5; i++) { v += vn(p)*a; p = p*2.03 + 11.; a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vD); if (d.y < 0.02) discard;
        vec2 p = d.xz / (d.y + 0.18) * 1.5 + vec2(uTime*0.006, uTime*0.002);
        float n = fbm(p), c = smoothstep(0.62, 0.82, n), thick = smoothstep(0.68, 0.95, n);
        vec3 col = mix(vec3(0.96, 0.95, 0.93), vec3(0.50, 0.55, 0.64), thick*0.75) * (0.9 + 0.25*pow(max(dot(d, uSun), 0.), 3.));
        gl_FragColor = vec4(col * 1.9, c * 0.92 * smoothstep(0.02, 0.2, d.y));
        ${END}
      }`,
  }));
  clouds.frustumCulled = false; clouds.renderOrder = 1; scene.add(clouds);
}

// ---------- partículas suaves (humo, neblina, fuego, hojas, motas): se animan solas en el shader ----------
export class ParticleBatch {
  constructor() { this.pos = []; this.par = []; this.col = []; this.n = 0; }
  add(x, y, z, size, speed, color) { const c = new THREE.Color(color); this.pos.push(x, y, z); this.par.push((this.n * 0.754877 + 0.13) % 1, size, speed, 0); this.col.push(c.r, c.g, c.b); this.n++; }
  build({ dir = [0, 1, 0], wind = [0, 0, 0], span = 8, speed = 1, drift = 0.5, wob = 1, s0 = 1, s1 = 1, opacity = 1, aspect = 1, glow = false, hard = false, boost = 1 } = {}) {
    const g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
    const ia = (arr, n) => new THREE.InstancedBufferAttribute(new Float32Array(arr), n);
    g.setAttribute('iPos', ia(this.pos, 3)); g.setAttribute('iP', ia(this.par, 4)); g.setAttribute('iCol', ia(this.col, 3)); g.instanceCount = this.n;
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uTime, ...fogU(), uDir: { value: new THREE.Vector3(...dir) }, uWind: { value: new THREE.Vector3(...wind) }, uSpan: { value: span }, uSpeed: { value: speed }, uDrift: { value: drift }, uWob: { value: wob }, uS0: { value: s0 }, uS1: { value: s1 }, uOpacity: { value: opacity }, uAspect: { value: aspect }, uHard: { value: hard ? 1 : 0 }, uBoost: { value: boost } },
      vertexShader: /* glsl */ `attribute vec3 iPos; attribute vec4 iP; attribute vec3 iCol;
        uniform float uTime, uSpan, uSpeed, uDrift, uWob, uS0, uS1, uAspect; uniform vec3 uDir, uWind;
        varying vec2 vUv; varying vec3 vColor; varying float vT, vDist;
        void main(){
          float t = fract(uTime*uSpeed*iP.z/uSpan + iP.x), w = iP.x*43.98;
          vec3 c = iPos + uDir*(t*uSpan) + uWind*(t*uSpan) + vec3(sin(uTime*uWob + w), 0.35*sin(uTime*uWob*1.3 + w*2.), cos(uTime*uWob*0.8 + w*1.7)) * uDrift * (0.35 + t);
          vUv = uv; vColor = iCol; vT = t;
          float a = w + uTime*uWob*0.4, cs = cos(a), sn = sin(a);
          vec2 q = position.xy * vec2(1., uAspect) * iP.y * mix(uS0, uS1, t); q = vec2(cs*q.x - sn*q.y, sn*q.x + cs*q.y);
          vec4 mv = viewMatrix * vec4(c, 1.); mv.xy += q; vDist = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `uniform float uOpacity, uHard, uBoost; varying vec2 vUv; varying vec3 vColor; varying float vT, vDist;
        ${FOG_GLSL}
        void main(){
          float r = length(vUv - 0.5)*2.;
          float shape = mix(smoothstep(1., 0.15, r), step(r, 0.9), uHard);
          float a = shape * pow(sin(3.14159*vT), 0.7) * uOpacity * smoothstep(0.6, 3.5, vDist); // no encandila al pasar junto a la cámara
          if (a < 0.01) discard;
          gl_FragColor = vec4(fogged(vColor * uBoost, vDist), a);
          ${END}
        }`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2; return mesh;
  }
}

// ---------- luces ----------
export function buildLights(scene, renderer) {
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density);
  scene.add(new THREE.HemisphereLight(0xb8cff0, 0x7a6c52, 1.9));
  const sun = new THREE.DirectionalLight(0xffdcae, 3.6);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.35;
  const c = sun.shadow.camera; c.left = c.bottom = -75; c.right = c.top = 75; c.near = 20; c.far = 420; c.updateProjectionMatrix();
  scene.add(sun, sun.target);
  // la sombra sigue al jugador, ajustada a la rejilla del mapa de sombras para que no tiemble
  const follow = (p) => { const s = 150 / 4096 * 8; sun.target.position.set(Math.round(p.x / s) * s, Math.round(p.y / s) * s, Math.round(p.z / s) * s); sun.position.copy(sun.target.position).addScaledVector(SUN, 230); };
  return { sun, follow };
}

// ---------- rayos de sol entre los árboles: láminas de luz alineadas con el sol ----------
export function buildShafts(scene, points) {
  const g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1), pos = [], par = [];
  for (const [x, y, z, w, len] of points) { pos.push(x, y, z); par.push(w, len, Math.random(), Math.random()); }
  g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(pos), 3)); g.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(par), 4)); g.instanceCount = points.length;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uTime, uSun: { value: SUN } },
    vertexShader: /* glsl */ `attribute vec3 iPos; attribute vec4 iP; uniform vec3 uSun; varying vec2 vUv; varying float vSeed, vDist;
      void main(){
        vUv = uv; vSeed = iP.z;
        vec3 c = iPos + uSun * (uv.y * iP.y);                                   // la lámina sube hacia el sol
        vec3 side = normalize(cross(uSun, normalize(cameraPosition - c)));      // y siempre da la cara a quien mira
        vec4 mv = viewMatrix * vec4(c + side * (uv.x - 0.5) * iP.x, 1.); vDist = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv; varying float vSeed, vDist;
      void main(){
        float across = pow(sin(3.14159 * vUv.x), 2.), along = smoothstep(0., 0.12, vUv.y) * smoothstep(1., 0.45, vUv.y);
        float flick = 0.7 + 0.3 * sin(uTime * (0.3 + vSeed) + vSeed * 40.);
        float a = across * along * flick * 0.16 * smoothstep(3., 12., vDist) * smoothstep(150., 70., vDist);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a * 2.2, a);
        ${END}
      }`,
  }));
  m.frustumCulled = false; m.renderOrder = 3; scene.add(m);
}

// ---------- acabado: resplandor de lo que brilla y una gradación cálida, como de recuerdo ----------
export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.42, 0.8, 0.92));
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(vec3(l), c, 1.14);                                                        // un poco más de color
        c = mix(c * vec3(0.94, 0.99, 1.08), c * vec3(1.07, 1.01, 0.9), smoothstep(0.15, 0.75, l)); // sombras frías, luces doradas
        c = c * c * (3. - 2. * c) * 0.35 + c * 0.65;                                       // contraste suave
        vec2 q = vUv - 0.5; c *= 1. - dot(q, q) * 0.55;                                    // viñeta
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  return {
    render: () => composer.render(),
    resize() { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(s.x / renderer.getPixelRatio(), s.y / renderer.getPixelRatio()); },
  };
}
