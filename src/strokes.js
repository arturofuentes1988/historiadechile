// Sistema de pintura: cada objeto del mundo se pinta con manchas de acuarela instanciadas.
// El orden de las manchas NO depende de la cámara: se usa descarte por alfa + buffer
// de profundidad, así la pintura no "repta" al moverse.
import * as THREE from 'three';

THREE.ColorManagement.enabled = false; // trabajamos directo en sRGB, como una paleta de pintor

export const SUN = new THREE.Vector3(0.52, 0.62, -0.38).normalize(); // sol de la mañana, desde el nororiente

export const shared = {
  uTime: { value: 0 },
  uSun: { value: SUN },
  uFogColor: { value: new THREE.Color(0xdde6e4) }, // la lejanía se disuelve en el papel
  uFogDensity: { value: 0.0044 },
};

export function hex(h) {
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
}

// Paletas de 3 tonos (sombra, medio, luz) por material
export const PAL = {
  // suelos
  forest: [0x3f3323, 0x6b5636, 0x9c8450], grassy: [0x35542a, 0x5f8438, 0xa3b150],
  needles: [0x4a2f22, 0x7c4f33, 0xb07c48], moss: [0x24391f, 0x3f5f2c, 0x7a9440],
  meadow: [0x426a2c, 0x76a03c, 0xc4c95a], marsh: [0x2c4a35, 0x4e7a4c, 0x8fae62],
  earth: [0x5e4a30, 0x957647, 0xc9a96a], path: [0x6a5236, 0xa5855a, 0xd4b683],
  pebble: [0x66675f, 0x97968a, 0xc9c5b2], bed: [0x3a4a48, 0x566b64, 0x7d8f80],
  rock: [0x474b55, 0x7a7d84, 0xb7b2a5], alpine: [0x4f5a34, 0x84893f, 0xbdb364],
  // vegetación
  trunk: [0x2e2622, 0x54463c, 0x80705f], barkGrey: [0x3a3a36, 0x6a6a60, 0x9d9a88], barkPale: [0x5a554a, 0x8f8a78, 0xbfb9a2],
  pewen: [0x13291b, 0x22492b, 0x4a7838], coigue: [0x1c3a22, 0x346330, 0x6b9440],
  roble: [0x7a4a18, 0xc0862a, 0xe9c456], canelo: [0x2b5a38, 0x4c8a4a, 0x93bf66],
  fern: [0x2a5527, 0x548a3b, 0x9cc056], quila: [0x4a6427, 0x86a03d, 0xc4cf68],
  reed: [0x5a5a2c, 0x97934a, 0xcfc67a], nalca: [0x285a2c, 0x479040, 0x86c257],
  grass: [0x3d5f28, 0x79a23c, 0xc0cc5c], mossy: [0x2f5a24, 0x58862f, 0x9bb948],
  copihue: [0x8e1f2a, 0xc93040, 0xee6a6a], berry: [0x2a1438, 0x4a2468, 0x7a48a0],
  flowerY: [0xc9981c, 0xf0c832, 0xfff08a], flowerW: [0xb9b4a4, 0xe9e4d4, 0xffffff], flowerP: [0x7a3f8c, 0xa862b4, 0xd69adc],
  // construcciones
  thatch: [0x62512e, 0xa08848, 0xd6c07c], wood: [0x33261a, 0x5e4630, 0x8c6f4c], dark: [0x0e0c0a, 0x191512, 0x26201a],
  textileR: [0x6e1a1e, 0xa82a2e, 0xcf4a44], textileK: [0x121014, 0x242028, 0x3a3440], textileW: [0xa89f88, 0xd9d0b6, 0xf4eeda],
  // lejanía y efectos
  snow: [0x9fb0cc, 0xd9e2ee, 0xfff6e8], volcano: [0x3e4a66, 0x5a6a88, 0x8a94aa],
  hills: [0x46607a, 0x5f7f92, 0x86a3a8], hillsNear: [0x2c4a48, 0x41685a, 0x6a8c68], sea: [0x5a86a4, 0x8ab4c8, 0xd4e6ea],
  smoke: [0x5a5856, 0x8a8782, 0xc4c0b8], fire: [0xd9441c, 0xf28a1e, 0xffd95a], mist: [0xc9d6d6, 0xdfe8e6, 0xf4f8f4],
  mote: [0xf4e8b0, 0xfff6d0, 0xffffff], leafFall: [0xa86a1c, 0xd99a2c, 0xf0cc5a], fly: [0xe07a1c, 0xf4f0e0, 0xf2c84a],
};
// Ajuste de acuarela: pigmento algo más diluido, y sombras que tiran al violeta azulado
const KEEP = new Set(['fire', 'mote', 'fly', 'snow', 'mist', 'flowerW', 'flowerY', 'dark']);
for (const k in PAL) PAL[k] = PAL[k].map(hex).map((c, i) => {
  if (KEEP.has(k)) return c;
  const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11, s = 0.9, lift = i === 0 ? 0.07 : 0.05;
  let r = l + (c[0] - l) * s, g = l + (c[1] - l) * s, b = l + (c[2] - l) * s;
  if (i === 0) { r += (0.3 - r) * 0.16; g += (0.32 - g) * 0.14; b += (0.5 - b) * 0.2; }
  return [r + (0.96 - r) * lift, g + (0.94 - g) * lift, b + (0.89 - b) * lift];
});

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tono según la luz del sol (fija): un degradado continuo entre sombra, medio y luz,
// con una pizca de azar para que ninguna mancha sea igual a la vecina.
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function shade(pal, nx, ny, nz, rng, bias = 0) {
  const t = (nx * SUN.x + ny * SUN.y + nz * SUN.z) * 0.5 + 0.5 + (rng() - 0.5) * 0.26 + bias;
  const a = t < 0.52 ? pal[0] : pal[1], b = t < 0.52 ? pal[1] : pal[2], m = t < 0.52 ? sm(0.14, 0.52, t) : sm(0.52, 0.9, t), j = (rng() - 0.5) * 0.045;
  return [a[0] + (b[0] - a[0]) * m + j, a[1] + (b[1] - a[1]) * m + j * 0.8, a[2] + (b[2] - a[2]) * m + j * 0.6];
}

export const GLSL_NOISE = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}`;

// Niebla: más densa abajo y teñida de luz cálida al mirar hacia el sol
const GLSL_FOG = /* glsl */ `
uniform vec3 uFogColor; uniform float uFogDensity; uniform float uFogScale; uniform float uFogMax;
vec3 applyFog(vec3 col, float dist, float sunAmt, float y){
  float f = min(1. - exp(-pow(dist*uFogDensity*uFogScale*mix(1.18, 0.82, clamp(y/45., 0., 1.)), 2.)), uFogMax);
  return mix(col, mix(uFogColor, vec3(1.0, 0.95, 0.82), pow(sunAmt, 5.)*0.55), f);
}`;

const STROKE_VERT = /* glsl */ `
attribute vec3 iPos; attribute vec3 iNormal;
attribute vec4 iShape; // ancho, alto, rotación, semilla
attribute vec4 iColor; // rgb, modo (0 pegado a la superficie, 1 de cara a la cámara)
uniform float uTime; uniform float uSway; uniform vec3 uSun;
varying vec2 vUv; varying vec3 vColor; varying float vSeed; varying float vDist; varying float vSunAmt; varying float vY;
${GLSL_NOISE}
void main(){
  vUv = uv; vSeed = iShape.w;
  // lavado: el color deriva suavemente por el mundo, entre cálido y frío
  float w1 = vnoise(iPos.xz*0.055 + iPos.y*0.03), w2 = vnoise(iPos.xz*0.021 + 17.);
  vColor = iColor.rgb * (0.9 + 0.2*w1) + (w2 - 0.5) * vec3(0.05, 0.01, -0.05);
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
    float g = sin(uTime*0.7 + iPos.x*0.05 + iPos.z*0.04) * 0.5 + 0.5; // ráfagas de viento
    center.x += (sin(uTime*1.3 + iPos.x*0.3 + iPos.y*0.5) * 0.06 + g*0.07) * uSway;
    center.z += cos(uTime*1.1 + iPos.z*0.3) * 0.05 * uSway;
    mv = viewMatrix * vec4(center, 1.); mv.xy += q;
  }
  vDist = -mv.z; vY = center.y;
  vSunAmt = max(dot(normalize(center - cameraPosition), uSun), 0.);
  gl_Position = projectionMatrix * mv;
}`;

// Cada trazo es una mancha de borde irregular: el pigmento se junta un poco en la orilla
// y queda más aguado y granulado al centro.
const STROKE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv; varying vec3 vColor; varying float vSeed; varying float vDist; varying float vSunAmt; varying float vY;
${GLSL_NOISE}
${GLSL_FOG}
void main(){
  vec2 p = vUv - 0.5;
  float ang = atan(p.y, p.x);
  float edge = length(p)*2. + (vnoise(vec2(ang*1.7 + vSeed*40., vSeed*17.)) - 0.5)*0.42 + (vnoise(p*7. + vSeed*91.) - 0.5)*0.22;
  if (edge > 0.86) discard;
  float rim = smoothstep(0.52, 0.86, edge);
  float wash = vnoise(vUv*2.6 + vSeed*23.);
  float gran = vnoise(vUv*vec2(30., 30.) + vSeed*53.);
  vec3 col = vColor * (1.05 - 0.13*rim) * (0.93 + 0.12*wash) - gran*0.03;
  gl_FragColor = vec4(applyFog(col, vDist, vSunAmt, vY), 1.);
}`;

export class StrokeBatch {
  constructor() { this.pos = []; this.nor = []; this.shape = []; this.col = []; this.n = 0; }
  add(x, y, z, nx, ny, nz, w, h, rot, color, mode = 0) {
    this.pos.push(x, y, z); this.nor.push(nx, ny, nz);
    this.shape.push(w, h, rot, (this.n * 0.6180339) % 1);
    this.col.push(color[0], color[1], color[2], mode);
    this.n++;
  }
  // Trazo pegado a una superficie de normal n, alargado en la dirección d (ramas, troncos)
  along(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, color) {
    let ux = 0, uy = 1, uz = 0; if (Math.abs(ny) >= 0.95) { ux = 1; uy = 0; }
    let tx = uy * nz - uz * ny, ty = uz * nx - ux * nz, tz = ux * ny - uy * nx; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
    this.add(x, y, z, nx, ny, nz, len, wid, Math.atan2(dx * bx + dy * by + dz * bz, dx * tx + dy * ty + dz * tz), color);
  }
  build({ fogScale = 1, fogMax = 0.92, sway = 0, sphere = null } = {}) {
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
    const mesh = new THREE.Mesh(g, m);
    if (sphere) g.boundingSphere = sphere; else mesh.frustumCulled = false;
    this.pos = this.nor = this.shape = this.col = null; // libera memoria
    return mesh;
  }
}

// Partículas pintadas (humo, fuego, hojas, motas, neblina): manchas que se mueven solas en el shader
export class ParticleBatch {
  constructor() { this.pos = []; this.par = []; this.col = []; this.n = 0; }
  add(x, y, z, size, speed, color) { this.pos.push(x, y, z); this.par.push((this.n * 0.754877 + 0.13) % 1, size, speed, 0); this.col.push(color[0], color[1], color[2]); this.n++; }
  build({ dir = [0, 1, 0], wind = [0, 0, 0], span = 8, speed = 1, drift = 0.5, wob = 1, s0 = 1, s1 = 1, opacity = 1, aspect = 0.6, fogScale = 1, blend = false } = {}) {
    const g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
    const ia = (arr, n) => new THREE.InstancedBufferAttribute(new Float32Array(arr), n);
    g.setAttribute('iPos', ia(this.pos, 3)); g.setAttribute('iP', ia(this.par, 4)); g.setAttribute('iCol', ia(this.col, 3));
    g.instanceCount = this.n;
    const m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: blend, depthWrite: !blend, defines: blend ? { BLEND: 1 } : {},
      uniforms: { ...shared, uFogScale: { value: fogScale }, uFogMax: { value: 0.92 }, uDir: { value: new THREE.Vector3(...dir) }, uWind: { value: new THREE.Vector3(...wind) },
        uSpan: { value: span }, uSpeed: { value: speed }, uDrift: { value: drift }, uWob: { value: wob }, uS0: { value: s0 }, uS1: { value: s1 }, uOpacity: { value: opacity }, uAspect: { value: aspect } },
      vertexShader: /* glsl */ `
        attribute vec3 iPos; attribute vec4 iP; attribute vec3 iCol;
        uniform float uTime, uSpan, uSpeed, uDrift, uWob, uS0, uS1, uAspect; uniform vec3 uDir, uWind, uSun;
        varying vec2 vUv; varying vec3 vColor; varying float vSeed, vT, vDist, vSunAmt, vY;
        void main(){
          float t = fract(uTime*uSpeed*iP.z/uSpan + iP.x); float w = iP.x*43.98;
          vec3 c = iPos + uDir*(t*uSpan) + uWind*(t*uSpan)
            + vec3(sin(uTime*uWob + w), 0.35*sin(uTime*uWob*1.3 + w*2.), cos(uTime*uWob*0.8 + w*1.7)) * uDrift * (0.35 + t);
          vUv = uv; vColor = iCol; vSeed = iP.x; vT = t; vY = c.y;
          float a = w + uTime*uWob*0.4, cs = cos(a), sn = sin(a);
          vec2 q = position.xy * vec2(1., uAspect) * iP.y * mix(uS0, uS1, t); q = vec2(cs*q.x - sn*q.y, sn*q.x + cs*q.y);
          vec4 mv = viewMatrix * vec4(c, 1.); mv.xy += q; vDist = -mv.z;
          vSunAmt = max(dot(normalize(c - cameraPosition), uSun), 0.);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        precision highp float; uniform float uOpacity;
        varying vec2 vUv; varying vec3 vColor; varying float vSeed, vT, vDist, vSunAmt, vY;
        ${GLSL_NOISE}
        ${GLSL_FOG}
        void main(){
          vec2 p = vUv - 0.5;
          float n1 = vnoise(vec2(vUv.x*4. + vSeed*37., vUv.y*22. + vSeed*91.));
          float n2 = vnoise(vec2(vUv.x*7. + vSeed*13., vUv.y*5. + vSeed*57.));
          if (length(p)*2. + (n2-.5)*0.5 > 0.95) discard;
          float alpha = pow(sin(3.14159*vT), 0.7) * uOpacity;
          vec3 col = applyFog(vColor*(0.9 + 0.2*n1), vDist, vSunAmt, vY);
          #ifdef BLEND
            gl_FragColor = vec4(col, alpha * smoothstep(0.95, 0.2, length(p)*2.) * (0.55 + 0.45*n1)); // velo suave
          #else
            if (n1*0.7 + n2*0.3 > alpha) discard; // pincel seco: se deshace en hebras
            gl_FragColor = vec4(col, 1.);
          #endif
        }`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; return mesh;
  }
}

// Material de acuarela para mallas sólidas (terreno base, rocas, construcciones, personajes):
// luz cálida y sombra fría que se funden suavemente, con el borde de la sombra algo irregular.
export function paintMaterial({ color = 0xffffff, vertexColors = false, fogScale = 1, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    vertexColors, side,
    uniforms: { ...shared, uColor: { value: new THREE.Color(color) }, uFogScale: { value: fogScale }, uFogMax: { value: 0.92 } },
    vertexShader: /* glsl */ `
      uniform vec3 uSun;
      varying vec3 vN; varying vec3 vW; varying float vDist; varying vec3 vC; varying float vSunAmt;
      void main(){
        #ifdef USE_COLOR
          vC = color;
        #else
          vC = vec3(1.);
        #endif
        vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv;
        vSunAmt = max(dot(normalize(w.xyz - cameraPosition), uSun), 0.);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uColor; uniform vec3 uSun;
      varying vec3 vN; varying vec3 vW; varying float vDist; varying vec3 vC; varying float vSunAmt;
      ${GLSL_NOISE}
      ${GLSL_FOG}
      void main(){
        vec3 base = uColor * vC, N = normalize(vN);
        if (!gl_FrontFacing) N = -N;
        float n = vnoise(vW.xz*1.4 + vW.y*1.1) - 0.5;
        float lit = smoothstep(0.36, 0.64, dot(N, uSun)*0.5 + 0.5 + n*0.16);
        vec3 col = mix(base*vec3(0.6, 0.62, 0.8) + vec3(0.02, 0.02, 0.05), base*1.1 + vec3(0.05, 0.04, 0.0), lit);
        col *= 0.93 + 0.12*vnoise(vW.xz*0.6 + vW.y*0.8);                                // lavado desparejo
        float fres = pow(1. - abs(dot(N, normalize(cameraPosition - vW))), 2.5);
        col = mix(col, col*1.12 + 0.05, fres*0.35);                                     // el contorno se aclara
        gl_FragColor = vec4(applyFog(col, vDist, vSunAmt, vW.y), 1.);
      }`,
  });
}

// Agua: lavados que corren con la corriente, orilla clara y brillos de papel en blanco
export function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uFogScale: { value: 1 }, uFogMax: { value: 0.92 } },
    vertexShader: /* glsl */ `
      attribute float depth; uniform vec3 uSun;
      varying vec3 vW; varying float vDepth; varying float vDist; varying float vSunAmt;
      void main(){ vW = position; vDepth = depth; vec4 mv = viewMatrix*vec4(position,1.); vDist = -mv.z;
        vSunAmt = max(dot(normalize(position - cameraPosition), uSun), 0.); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      precision highp float; uniform float uTime; uniform vec3 uSun;
      varying vec3 vW; varying float vDepth; varying float vDist; varying float vSunAmt;
      ${GLSL_NOISE}
      ${GLSL_FOG}
      void main(){
        if (vDepth < -0.04) discard;
        vec2 p = vW.xz; float fl = uTime*0.55;
        float n = vnoise(vec2((p.x - fl*2.2)*0.3, p.y*1.5));
        float n2 = vnoise(vec2((p.x - fl*3.4)*0.85, p.y*3.6) + 7.);
        float n3 = vnoise(vec2((p.x - fl*1.3)*2.4, p.y*9.) + 3.);
        float v = n*0.6 + n2*0.4;
        vec3 col = mix(vec3(0.27,0.44,0.52), vec3(0.42,0.61,0.67), smoothstep(0.3, 0.52, v));
        col = mix(col, vec3(0.66,0.8,0.82), smoothstep(0.6, 0.78, v));
        col = mix(col, vec3(0.55,0.66,0.5), smoothstep(0.75, 0.0, vDepth)*0.5);        // fondo que se trasluce
        vec3 vd = normalize(cameraPosition - vW);
        col = mix(col, vec3(0.84,0.9,0.92), pow(1. - max(vd.y, 0.), 3.)*0.65);          // reflejo del cielo
        col = mix(col, vec3(0.95,0.96,0.93), smoothstep(0.16 + 0.1*n2, 0.03, vDepth));  // orilla
        col = mix(col, vec3(0.99,0.98,0.95), smoothstep(0.78, 0.86, n3) * step(0.45, n) * 0.8); // brillos
        gl_FragColor = vec4(applyFog(col, vDist, vSunAmt, vW.y), 1.);
      }`,
  });
}

// Cielo: un lavado húmedo de azul sobre el papel, con nubes que son papel sin pintar
export function skyDome() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN }, uTime: shared.uTime },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*viewMatrix*vec4(position + cameraPosition, 1.); }`,
    fragmentShader: /* glsl */ `
      precision highp float; varying vec3 vD; uniform vec3 uSun; uniform float uTime;
      ${GLSL_NOISE}
      float fbm(vec2 p){ return vnoise(p)*0.5 + vnoise(p*2.03 + 7.)*0.3 + vnoise(p*4.1 + 3.)*0.2; }
      void main(){
        vec3 d = normalize(vD);
        float a = atan(d.z, d.x) + uTime*0.004; // las nubes derivan lentamente
        float h = clamp(d.y + (fbm(vec2(a*2.2, d.y*5.)) - 0.5)*0.14, 0., 1.);
        vec3 col = mix(vec3(0.98,0.94,0.84), vec3(0.72,0.84,0.91), smoothstep(0., 0.3, h));
        col = mix(col, vec3(0.43,0.63,0.83), smoothstep(0.25, 0.95, h));
        col *= 0.95 + 0.1*fbm(vec2(a*1.1 + 5., d.y*2.5));                               // floraciones del lavado
        float n = fbm(vec2(a*1.9, d.y*6.5 - 1.));
        float cl = smoothstep(0.52, 0.7, n) * smoothstep(0.02, 0.22, d.y);
        col = mix(col, vec3(0.74,0.76,0.85), smoothstep(0.44, 0.56, n) * (1. - cl) * 0.35 * smoothstep(0.02, 0.2, d.y)); // sombra de la nube
        col = mix(col, vec3(0.985,0.975,0.95), cl*0.9);
        col += vec3(1.,0.9,0.7) * pow(max(dot(d, uSun), 0.), 14.) * 0.4;
        if (d.y < 0.) col = vec3(0.86,0.9,0.89);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), m);
  mesh.frustumCulled = false; mesh.renderOrder = -1;
  return mesh;
}

// Junta muchas piezas sólidas (postes, piedras, vasijas) en una sola malla pintada
export class GeoBag {
  constructor() { this.p = []; this.n = []; this.c = []; }
  add(geo, matrix, color) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(matrix); g.computeVertexNormals();
    const P = g.attributes.position.array, N = g.attributes.normal.array, col = typeof color === 'number' ? hex(color) : color;
    for (let i = 0; i < P.length; i += 3) { this.p.push(P[i], P[i + 1], P[i + 2]); this.n.push(N[i], N[i + 1], N[i + 2]); this.c.push(col[0], col[1], col[2]); }
    return g;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    const m = new THREE.Mesh(g, paintMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.frustumCulled = false; return m;
  }
}

// Acabado de acuarela sobre toda la imagen: los colores sangran un poco entre sí, el pigmento
// se acumula donde cambia el color, se nota el grano del papel y las luces son papel en blanco.
export function createWatercolor(renderer) {
  const rt = new THREE.WebGLRenderTarget(2, 2, { samples: 2 });
  const mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: /* glsl */ `
      precision highp float; uniform sampler2D tColor; uniform vec2 uRes; varying vec2 vUv;
      ${GLSL_NOISE}
      void main(){
        vec2 px = 1./uRes, pp = vUv*uRes; float sc = uRes.y/720.;
        // pulso de la mano: los bordes tiemblan apenas
        vec2 uv = vUv + (vec2(vnoise(pp/(34.*sc)), vnoise(pp/(34.*sc) + 31.7)) - 0.5) * px * 3.4 * sc;
        // sangrado: el color se corre un poco hacia los lados
        vec3 c = texture2D(tColor, uv).rgb * 0.3; float r = 2.1*sc;
        c += (texture2D(tColor, uv + vec2(r, 0.)*px).rgb + texture2D(tColor, uv - vec2(r, 0.)*px).rgb + texture2D(tColor, uv + vec2(0., r)*px).rgb + texture2D(tColor, uv - vec2(0., r)*px).rgb) * 0.11;
        c += (texture2D(tColor, uv + vec2(r, r)*0.7*px).rgb + texture2D(tColor, uv - vec2(r, r)*0.7*px).rgb + texture2D(tColor, uv + vec2(r, -r)*0.7*px).rgb + texture2D(tColor, uv - vec2(r, -r)*0.7*px).rgb) * 0.065;
        // pigmento acumulado en los límites entre colores
        float e = 2.6*sc;
        vec3 gx = texture2D(tColor, uv + vec2(e, 0.)*px).rgb - texture2D(tColor, uv - vec2(e, 0.)*px).rgb;
        vec3 gy = texture2D(tColor, uv + vec2(0., e)*px).rgb - texture2D(tColor, uv - vec2(0., e)*px).rgb;
        float pool = smoothstep(0.07, 0.5, length(gx) + length(gy));
        c = mix(c, c*c*1.05, pool*0.42);
        // grano del papel: el pigmento oscuro granula más
        float lum = dot(c, vec3(0.299, 0.587, 0.114));
        float g = vnoise(pp/(1.7*sc))*0.6 + vnoise(pp/(4.3*sc) + 9.)*0.4;
        c -= (g - 0.5) * 0.13 * (1. - lum*0.65);
        c *= 0.965 + 0.07*vnoise(pp/(110.*sc) + 3.);
        // el pigmento es transparente: debajo siempre está el papel
        vec3 paper = vec3(0.968, 0.948, 0.9);
        c = paper * mix(vec3(1.), c*1.09, 0.95);
        c = mix(c, paper, smoothstep(0.8, 1.0, lum)*0.4);
        // el borde de la hoja queda sin pintar
        vec2 q = abs(vUv - 0.5)*2.;
        float b = max(q.x, q.y) + (vnoise(pp/(46.*sc) + 5.) - 0.5)*0.045;
        c = mix(c, paper*(0.985 + 0.03*g), smoothstep(0.945, 0.995, b)*0.9);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.Camera(), size = new THREE.Vector2();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  return {
    render(worldScene, camera) {
      renderer.getDrawingBufferSize(size);
      if (rt.width !== size.x || rt.height !== size.y) { rt.setSize(size.x, size.y); mat.uniforms.uRes.value.copy(size); }
      renderer.setRenderTarget(rt); renderer.render(worldScene, camera);
      renderer.setRenderTarget(null); renderer.render(scene, cam);
    },
  };
}
