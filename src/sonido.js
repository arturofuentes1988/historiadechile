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
  // ---- instrumentos para los toques de la interfaz: suenan a madera, caña, cuero y cascabel ----
  // pifilka: flauta de caña. Fundamental con algo de armónicos, soplo al atacar, entrada blanda y un vibrato leve
  const flute = (d, sr, t0, dur, f, amp, vib = 0.004) => { let ph = 0; const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr); for (let i = 0; i < n && i0 + i < d.length; i++) { const t = i / sr, fr = f * (1 + vib * Math.sin(t * 31)) * (1 - 0.014 * Math.exp(-t * 30)); ph += 6.283 * fr / sr; const e = Math.min(1, t / 0.03) * Math.min(1, (dur - t) / 0.1) ** 1.5; d[i0 + i] += (Math.sin(ph) + 0.26 * Math.sin(ph * 2) + 0.1 * Math.sin(ph * 3) + 0.22 * (rnd() * 2 - 1) * (0.35 + 0.65 * Math.exp(-t * 20))) * amp * e; } };
  // kultrún: el parche grave que cae de tono, con el golpe seco de la baqueta
  const drum = (d, sr, t0, f, amp) => { let ph = 0; const i0 = Math.floor(t0 * sr), n = Math.floor(0.55 * sr); for (let i = 0; i < n && i0 + i < d.length; i++) { const t = i / sr; ph += 6.283 * f * (1 + 0.9 * Math.exp(-t * 45)) / sr; d[i0 + i] += (Math.sin(ph) * Math.exp(-t * 9) + 0.35 * Math.sin(ph * 1.59) * Math.exp(-t * 17) + (rnd() * 2 - 1) * 0.45 * Math.exp(-t * 170)) * amp; } };
  // kaskawilla: cascabeles. Muchos golpecitos agudos, cada uno con su propia afinación
  const bells = (d, sr, t0, dur, count, amp) => { for (let k = 0; k < count; k++) { const f = R(3000, 6200), i0 = Math.floor((t0 + R(0, dur)) * sr), n = Math.floor(0.14 * sr), a = R(0.3, 1) * amp; let ph = 0; for (let i = 0; i < n && i0 + i < d.length; i++) { const t = i / sr; ph += 6.283 * f / sr; d[i0 + i] += (Math.sin(ph) + 0.5 * Math.sin(ph * 1.47)) * a * Math.min(1, t / 0.002) * Math.exp(-t * 50); } } };
  // un "toc" corto y afinado: madera contra madera, o una semilla que cae en la bolsa
  const tock = (d, sr, t0, f, amp, dec = 60, len = 0.18) => { let ph = 0; const i0 = Math.floor(t0 * sr), n = Math.floor(len * sr); for (let i = 0; i < n && i0 + i < d.length; i++) { const t = i / sr; ph += 6.283 * f / sr; d[i0 + i] += ((Math.sin(ph) + 0.4 * Math.sin(ph * 2.76)) * Math.exp(-t * dec) + (rnd() * 2 - 1) * 0.55 * Math.exp(-t * 420)) * amp; } };
  // la voz de Leftraru cuando hace fuerza: un zumbido de garganta que baja de tono, pasado por las resonancias de una vocal
  // abierta (forma: dónde resuena, con qué ancho y cuánto), con un poco de aire al empezar
  const voz = (d, sr, t0, dur, f0, f1, amp, forma) => { const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr), ph = new Float64Array(16); let tiembla = 0;
    for (let i = 0; i < n && i0 + i < d.length; i++) { const t = i / sr, u = i / n; tiembla += (rnd() - 0.5) * 0.02 - tiembla * 0.01; const f = (f0 + (f1 - f0) * u ** 0.7) * (1 + tiembla * 0.3), e = Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.08) ** 1.4; let v = 0;
      for (let h = 1; h < 16 && f * h < sr * 0.45; h++) { ph[h] += 6.283 * f * h / sr; let g = 0; for (const [F, B, A] of forma) g += A / (1 + ((f * h - F) / B) ** 2); v += Math.sin(ph[h]) * g / h; }
      d[i0 + i] += (v + (rnd() * 2 - 1) * 0.1 * Math.exp(-t * 28)) * amp * e; } };
  // el aire del bosque: tres ecos cortos que se van apagando, para que nada suene pegado al oído
  const air = (d, sr, mix = 0.25) => { for (const [ms, g] of [[83, 0.5], [137, 0.36], [211, 0.26]]) { const k = Math.floor(ms / 1000 * sr); for (let i = k; i < d.length; i++) d[i] += d[i - k] * g * mix; } };
  const grains = (d, sr, count, len, amp) => { for (let k = 0; k < count; k++) { const i0 = Math.floor(rnd() * (d.length - len * sr)), n = Math.floor(R(0.3, 1) * len * sr), a = R(0.3, 1) * amp; for (let i = 0; i < n; i++) d[i0 + i] += (rnd() * 2 - 1) * a * Math.exp(-i / (n * 0.3)); } };
  function build() {
    // pasos: en tierra, un golpe sordo; en hojas, crujidos; en pasto, un roce; en agua, un chapoteo
    for (const v of [1, 2]) {
      buf[`paso-tierra-${v}`] = make(0.16, (d, sr) => { noise(d); lp(d, sr, 260 + v * 60); env(d, sr, 0.012, 0.04); tone(d, sr, 0, 0.09, 85, 50, 0.2); }); // apagado y redondo, sin golpe seco
      buf[`paso-hojas-${v}`] = make(0.26, (d, sr) => { grains(d, sr, 14 + v * 4, 0.03, 1); hp(d, sr, 900); lp(d, sr, 3200); env(d, sr, 0.015, 0.08); });
      buf[`paso-pasto-${v}`] = make(0.2, (d, sr) => { noise(d); hp(d, sr, 1500); lp(d, sr, 3500); env(d, sr, 0.03, 0.05); });
      buf[`paso-agua-${v}`] = make(0.5, (d, sr) => { noise(d); lp(d, sr, 1200); hp(d, sr, 300); env(d, sr, 0.03, 0.12); for (let k = 0; k < 7; k++) tone(d, sr, R(0.03, 0.3), R(0.02, 0.05), R(500, 1400), R(900, 2200), 0.12); });
      buf[`arbusto-${v}`] = make(0.6, (d, sr) => { grains(d, sr, 40, 0.04, 1); hp(d, sr, 1200); lp(d, sr, 3800); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] *= Math.sin(Math.PI * t / 0.6) ** 1.5 * (0.6 + 0.4 * Math.sin(t * 40 + v)); } });
    }
    // el esfuerzo de un salto: un «¡hop!» corto, de niño, que no llega a grito
    buf.esfuerzo = make(0.24, (d, sr) => { voz(d, sr, 0.005, 0.17, 350, 250, 1, [[760, 110, 1], [1400, 140, 0.55], [3100, 240, 0.2]]); lp(d, sr, 4600); air(d, sr, 0.1); });
    // rodar por el suelo: el golpe sordo del hombro en la tierra, el roce del cuerpo y las hojas, y los pies que vuelven a caer
    buf.rodar = make(0.66, (d, sr) => { noise(d);
      for (let i = 0; i < d.length; i++) { const t = i / sr, golpe = (t < 0.04 ? t / 0.04 : Math.exp(-(t - 0.04) * 36)) + (t > 0.4 ? 0.8 * Math.exp(-(t - 0.4) * 32) : 0), roce = 0.3 * Math.sin(Math.PI * Math.min(1, t / 0.6)) * (0.6 + 0.4 * Math.sin(t * 46)); d[i] *= golpe + roce; }
      lp(d, sr, 640); hp(d, sr, 110); tone(d, sr, 0.03, 0.11, 115, 58, 0.22); tone(d, sr, 0.39, 0.12, 100, 52, 0.17);
      const hojas = new Float32Array(d.length); grains(hojas, sr, 26, 0.035, 1); hp(hojas, sr, 1400); lp(hojas, sr, 3600); for (let i = 0; i < d.length; i++) d[i] += hojas[i] * 0.05 * Math.sin(Math.PI * Math.min(1, i / d.length / 0.9)); });
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
    buf['ui-menu'] = make(0.32, (d, sr) => { tock(d, sr, 0, 392, 0.7, 42); tock(d, sr, 0.075, 294, 0.5, 36, 0.22); lp(d, sr, 3200); });   // abrir el menú: dos golpes de madera que bajan
    buf['ui-volver'] = make(0.32, (d, sr) => { tock(d, sr, 0, 294, 0.6, 42); tock(d, sr, 0.075, 392, 0.6, 36, 0.22); lp(d, sr, 3200); }); // volver al juego: los mismos, subiendo
    buf['ui-cuaderno'] = make(0.4, (d, sr) => { noise(d); hp(d, sr, 1500); lp(d, sr, 5000); for (let i = 0; i < d.length; i++) { const t = i / sr / 0.4; d[i] *= Math.sin(Math.PI * t) ** 2 * (0.5 + 0.5 * Math.sin(t * 50)); } }); // una hoja que se da vuelta
    buf['ui-bolsa'] = make(0.35, (d, sr) => { grains(d, sr, 30, 0.03, 1); lp(d, sr, 1800); hp(d, sr, 300); env(d, sr, 0.03, 0.12); });                    // cuero
    buf['ui-mapa'] = make(0.5, (d, sr) => { grains(d, sr, 50, 0.02, 1); hp(d, sr, 1200); for (let i = 0; i < d.length; i++) d[i] *= Math.sin(Math.PI * i / d.length) ** 1.5; });
    // Cada cosa que pasa tiene su propio toque, para reconocerla sin mirar:
    // hallazgo (ganar puntos por descubrir algo): tres golpecitos de madera que suben, cortos y secos
    buf['ui-hallazgo'] = make(0.6, (d, sr) => { tock(d, sr, 0, 660, 0.6, 60); tock(d, sr, 0.075, 880, 0.6, 55); tock(d, sr, 0.15, 1175, 0.7, 26, 0.4); lp(d, sr, 5200); air(d, sr, 0.16); });
    // misión o encargo nuevo: dos golpes de madera más graves y pausados, como quien toca a la puerta
    buf['ui-mision'] = make(0.75, (d, sr) => { tock(d, sr, 0, 392, 0.8, 28, 0.3); tock(d, sr, 0.18, 523, 0.7, 22, 0.45); lp(d, sr, 3600); air(d, sr, 0.18); });
    // misión cumplida: cinco golpes de madera que suben seguidos, y el último queda sonando
    buf['ui-logro'] = make(1.05, (d, sr) => { [392, 523, 659, 784, 1047].forEach((f, i) => tock(d, sr, i * 0.085, f, 0.6 + i * 0.05, i === 4 ? 14 : 45, i === 4 ? 0.6 : 0.18)); lp(d, sr, 5200); air(d, sr, 0.22); });
    // un piñón a la bolsa: dos "toc" de semilla y una nota clara y corta (cada piñón suena un poco más agudo que el anterior)
    buf.pinon = make(0.75, (d, sr) => { tock(d, sr, 0, 520, 0.8, 45); tock(d, sr, 0.07, 780, 0.5, 60); flute(d, sr, 0.09, 0.3, 1047, 0.32, 0); bells(d, sr, 0.1, 0.18, 5, 0.1); lp(d, sr, 6000); air(d, sr, 0.25); });
    // conversación: al empezar, un toque suave de kultrún y dos notas de pifilka, como quien llama; al seguir, dos palitos
    buf.hablar = make(0.95, (d, sr) => { drum(d, sr, 0, 150, 0.45); flute(d, sr, 0.03, 0.2, 523, 0.5); flute(d, sr, 0.22, 0.38, 659, 0.55); lp(d, sr, 4200); air(d, sr, 0.25); });
    buf['hablar-sigue'] = make(0.24, (d, sr) => { tock(d, sr, 0, 880, 0.6, 70); tock(d, sr, 0.055, 1175, 0.35, 90); lp(d, sr, 5000); });
    buf['hablar-fin'] = make(0.5, (d, sr) => { flute(d, sr, 0, 0.3, 587, 0.4); lp(d, sr, 3800); air(d, sr, 0.3); });                                       // una nota que baja el telón
    // la tinta del aviso del comienzo: una pluma que rasga el papel, en dos o tres trazos cortos
    buf.tinta = make(0.6, (d, sr) => { noise(d); hp(d, sr, 1700); lp(d, sr, 4800); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] *= Math.sin(Math.PI * Math.min(1, t / 0.56)) ** 1.3 * (0.3 + 0.7 * Math.abs(Math.sin(t * 17))) ** 1.5; } tock(d, sr, 0, 230, 0.1, 34, 0.2); });
    for (const n of ['rio', 'viento', 'pajaros', 'fuego']) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf[n]; s.loop = true; g.gain.value = 0; s.connect(g).connect(master); s.start(); loops[n] = g; }
  }
  // Solo suena mientras la ventana del juego es la que se está usando. Una copia abierta en segundo plano (otra pestaña,
  // o las pruebas automáticas) no debe meter sus sonidos encima de la partida.
  const oye = () => document.hasFocus();
  const ajusta = () => { if (master) master.gain.setTargetAtTime(oye() ? vol : 0, ctx.currentTime, 0.12); };
  function start() { if (ctx) return; ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = oye() ? vol : 0; master.connect(ctx.destination); build(); }
  // arranca con el primer gesto de verdad del jugador: un clic o una tecla (no con los que fabrica un programa)
  const gesto = (e) => { if (!e.isTrusted) return; for (const ev of ['pointerdown', 'keydown']) removeEventListener(ev, gesto); start(); };
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, gesto);
  addEventListener('focus', ajusta); addEventListener('blur', ajusta);
  return {
    start, get ready() { return !!ctx; }, get names() { return Object.keys(buf); }, buffer: (name) => buf[name] || null, // buffer: para revisar un sonido en las pruebas
    set volume(v) { vol = v; ajusta(); },
    // un sonido suelto; "rate" cambia un poco el tono para que no suene siempre igual
    play(name, v = 1, rate = 1) { if (!ctx || !buf[name] || !oye()) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf[name]; s.playbackRate.value = rate; g.gain.value = v; s.connect(g).connect(master); s.start(); },
    // volumen de un sonido continuo; se acerca de a poco al valor pedido
    loop(name, v) { const g = loops[name]; if (g) g.gain.setTargetAtTime(v, ctx.currentTime, 0.4); },
  };
}
