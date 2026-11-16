// Sonidos del juego: pasos, roces, agua, viento, pájaros, fuego y los toques de la interfaz.
// Se fabrican por código al empezar (ruido filtrado, golpes y silbidos), así no hay que descargar nada.
// El audio arranca con el primer gesto del jugador: el navegador no deja sonar antes.
export function createSound() {
  let ctx = null, master = null, vol = 0.7; const buf = {}, loops = {};
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), R = (a, b) => a + (b - a) * rnd();
  // ---- piezas básicas ----
  const make = (secs, fn) => { const sr = ctx.sampleRate, n = Math.floor(secs * sr), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0); fn(d, sr, n); let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(d[i])); if (m > 0) for (let i = 0; i < n; i++) d[i] *= 0.9 / m; return b; };
  const lp = (d, sr, hz) => { const a = 1 - Math.exp(-6.283 * hz / sr); let y = 0; for (let i = 0; i < d.length; i++) { y += a * (d[i] - y); d[i] = y; } };   // deja pasar los graves
  const hp = (d, sr, hz) => { const a = 1 - Math.exp(-6.283 * hz / sr); let y = 0; for (let i = 0; i < d.length; i++) { y += a * (d[i] - y); d[i] -= y; } };  // deja pasar los agudos
  const noise = (d) => { for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; };
  const env = (d, sr, at, dec) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] *= Math.min(1, t / at) * Math.exp(-t / dec); } };
  const seamless = (d, sr, fade = 0.5) => { const f = Math.floor(fade * sr), n = d.length; for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k); } return f; }; // el final se funde con el principio
  const tone = (d, sr, t0, dur, f0, f1, amp, breath = 0) => { let ph = 0; const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr); for (let i = 0; i < n && i0 + i < d.length; i++) { const u = i / n, f = f0 + (f1 - f0) * u; ph += 6.283 * f / sr; d[i0 + i] += (Math.sin(ph) + breath * (rnd() * 2 - 1)) * amp * Math.sin(Math.PI * Math.min(1, u * 1.02)) ** 0.7; } };
  const grains = (d, sr, count, len, amp) => { for (let k = 0; k < count; k++) { const i0 = Math.floor(rnd() * (d.length - len * sr)), n = Math.floor(R(0.3, 1) * len * sr), a = R(0.3, 1) * amp; for (let i = 0; i < n; i++) d[i0 + i] += (rnd() * 2 - 1) * a * Math.exp(-i / (n * 0.3)); } };
  function build() {
    // pasos: en tierra, un golpe sordo; en hojas, crujidos; en pasto, un roce; en agua, un chapoteo
    for (const v of [1, 2]) {
      buf[`paso-tierra-${v}`] = make(0.16, (d, sr) => { noise(d); lp(d, sr, 500 + v * 150); env(d, sr, 0.004, 0.035); tone(d, sr, 0, 0.09, 110, 55, 0.5); });
      buf[`paso-hojas-${v}`] = make(0.26, (d, sr) => { grains(d, sr, 26 + v * 6, 0.02, 1); hp(d, sr, 1400); env(d, sr, 0.005, 0.09); tone(d, sr, 0, 0.07, 90, 50, 0.15); });
      buf[`paso-pasto-${v}`] = make(0.2, (d, sr) => { noise(d); hp(d, sr, 2200); lp(d, sr, 6000); env(d, sr, 0.02, 0.05); tone(d, sr, 0, 0.07, 80, 50, 0.1); });
      buf[`paso-agua-${v}`] = make(0.5, (d, sr) => { noise(d); lp(d, sr, 1800); hp(d, sr, 300); env(d, sr, 0.01, 0.12); for (let k = 0; k < 7; k++) tone(d, sr, R(0.03, 0.3), R(0.02, 0.05), R(500, 1400), R(900, 2200), 0.12); });
      buf[`arbusto-${v}`] = make(0.6, (d, sr) => { grains(d, sr, 60, 0.03, 1); hp(d, sr, 1800); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] *= Math.sin(Math.PI * t / 0.6) ** 1.5 * (0.6 + 0.4 * Math.sin(t * 40 + v)); } });
    }
    // sonidos continuos
    buf.rio = make(6, (d, sr) => { noise(d); lp(d, sr, 2600); hp(d, sr, 350); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] *= 0.7 + 0.2 * Math.sin(t * 1.9) + 0.1 * Math.sin(t * 5.3 + 1); } for (let k = 0; k < 140; k++) tone(d, sr, R(0, 5.9), R(0.02, 0.06), R(400, 1500), R(700, 2400), 0.02); seamless(d, sr); });
    buf.viento = make(9, (d, sr) => { noise(d); lp(d, sr, 900); hp(d, sr, 120); const g = new Float32Array(d.length); noise(g); hp(g, sr, 2500); lp(g, sr, 7000); for (let i = 0; i < d.length; i++) { const t = i / sr, gust = 0.45 + 0.3 * Math.sin(t * 0.7) + 0.2 * Math.sin(t * 1.63 + 2); d[i] = d[i] * gust + g[i] * 0.5 * Math.max(0, gust - 0.35) ** 2; } seamless(d, sr, 1); }); // rachas graves y, cuando arrecia, el siseo de las hojas
    buf.fuego = make(5, (d, sr) => { noise(d); lp(d, sr, 500); for (let i = 0; i < d.length; i++) d[i] *= 0.25; for (let k = 0; k < 90; k++) { const i0 = Math.floor(rnd() * (d.length - 800)), a = R(0.2, 1), n = Math.floor(R(40, 500)); for (let i = 0; i < n; i++) d[i0 + i] += (rnd() * 2 - 1) * a * Math.exp(-i / (n * 0.2)); } seamless(d, sr); });
    buf.pajaros = make(24, (d, sr) => {
      const trino = (t0, f, n, gap, bend) => { for (let k = 0; k < n; k++) tone(d, sr, t0 + k * gap, gap * 0.7, f * R(0.97, 1.03), f * bend * R(0.97, 1.03), 0.5); };
      for (let k = 0; k < 9; k++) trino(R(0.5, 22), R(3200, 4200), 3 + (k % 4), 0.09, 1.25);          // rayadito: trinos cortos y agudos
      for (let k = 0; k < 5; k++) { const t0 = R(0.5, 21); tone(d, sr, t0, 0.35, 2100, 1700, 0.45); tone(d, sr, t0 + 0.45, 0.5, 1700, 1500, 0.4); } // un silbido de dos notas que baja
      for (let k = 0; k < 4; k++) trino(R(0.5, 21), R(2400, 2800), 8, 0.06, 0.92);                    // un repique rápido
      for (let k = 0; k < 3; k++) { const t0 = R(1, 21); for (let j = 0; j < 4; j++) tone(d, sr, t0 + j * 0.28, 0.2, 1250 - j * 60, 1150 - j * 60, 0.3); } // el chucao, a lo lejos
      const eco = Math.floor(0.19 * sr); for (let i = eco; i < d.length; i++) d[i] += d[i - eco] * 0.28;  // el bosque devuelve un poco el canto
      seamless(d, sr, 0.3); });
    // interfaz y conversación
    buf['ui-clic'] = make(0.09, (d, sr) => { tone(d, sr, 0, 0.06, 1100, 800, 1); grains(d, sr, 3, 0.004, 0.5); env(d, sr, 0.001, 0.02); });                 // dos palitos
    buf['ui-menu'] = make(0.45, (d, sr) => { tone(d, sr, 0, 0.4, 150, 95, 1); grains(d, sr, 2, 0.01, 0.4); env(d, sr, 0.002, 0.12); });                    // un toque de tambor
    buf['ui-cuaderno'] = make(0.4, (d, sr) => { noise(d); hp(d, sr, 1500); lp(d, sr, 5000); for (let i = 0; i < d.length; i++) { const t = i / sr / 0.4; d[i] *= Math.sin(Math.PI * t) ** 2 * (0.5 + 0.5 * Math.sin(t * 50)); } }); // una hoja que se da vuelta
    buf['ui-bolsa'] = make(0.35, (d, sr) => { grains(d, sr, 30, 0.03, 1); lp(d, sr, 1800); hp(d, sr, 300); env(d, sr, 0.03, 0.12); });                    // cuero
    buf['ui-mapa'] = make(0.5, (d, sr) => { grains(d, sr, 50, 0.02, 1); hp(d, sr, 1200); for (let i = 0; i < d.length; i++) d[i] *= Math.sin(Math.PI * i / d.length) ** 1.5; });
    buf['ui-hallazgo'] = make(1.3, (d, sr) => { [[0, 587], [0.2, 698], [0.4, 880]].forEach(([t, f]) => { tone(d, sr, t, 0.5, f, f, 0.5, 0.18); tone(d, sr, t, 0.5, f * 2, f * 2, 0.12); }); lp(d, sr, 3500); }); // tres notas de flauta que suben
    buf.hablar = make(0.6, (d, sr) => { tone(d, sr, 0, 0.22, 660, 660, 0.5, 0.2); tone(d, sr, 0.2, 0.32, 784, 770, 0.5, 0.2); lp(d, sr, 3000); });        // llamado de dos notas
    buf['hablar-sigue'] = make(0.16, (d, sr) => { grains(d, sr, 14, 0.012, 1); hp(d, sr, 3000); env(d, sr, 0.004, 0.05); });                              // un sacudón de sonajero
    for (const n of ['rio', 'viento', 'pajaros', 'fuego']) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf[n]; s.loop = true; g.gain.value = 0; s.connect(g).connect(master); s.start(); loops[n] = g; }
  }
  function start() { if (ctx) return; ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination); build(); }
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, start, { once: true });
  return {
    start, get ready() { return !!ctx; }, get names() { return Object.keys(buf); },
    set volume(v) { vol = v; if (master) master.gain.value = v; },
    // un sonido suelto; "rate" cambia un poco el tono para que no suene siempre igual
    play(name, v = 1, rate = 1) { if (!ctx || !buf[name]) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf[name]; s.playbackRate.value = rate; g.gain.value = v; s.connect(g).connect(master); s.start(); },
    // volumen de un sonido continuo; se acerca de a poco al valor pedido
    loop(name, v) { const g = loops[name]; if (g) g.gain.setTargetAtTime(v, ctx.currentTime, 0.4); },
  };
}
