# Leftraru

Videojuego 3D sobre la infancia y el cautiverio de Lautaro (Leftraru), mitad historia real y mitad ficción. Todo el mundo se genera por código (Three.js + shaders GLSL), sin modelos ni imágenes externas, y la física usa Rapier. El estilo actual es realista: luz y sombras reales, texturas generadas, agua y cielo.

Estado: mapa del Acto I con la aldea, el bosque, el cerro, el humedal y el río (`docs/acto-1.md`).

## Cómo jugar

```bash
npm install
npm run dev
```

Abre la dirección que aparece en la terminal.

- **WASD:** caminar · **Shift:** correr · **Espacio:** saltar · **Ratón:** girar la cámara
- **E:** observar lo que tienes cerca o hablar con alguien
- **N:** cuaderno · **J:** misiones · **K:** saberes · **B:** bolsa · **M:** mapa
- **F:** pantalla completa · **P** o **Esc:** menú
- Todas las teclas se pueden cambiar en Menú → Controles.
- En equipos lentos, agrega `?q=0.5` a la dirección para pintar menos trazos.
