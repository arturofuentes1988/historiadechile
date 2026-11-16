# Leftraru

Videojuego 3D sobre la infancia y el cautiverio de Lautaro (Leftraru), mitad historia real y mitad ficción. Todo el mundo se genera por código (Three.js + shaders GLSL), sin modelos ni imágenes externas, y la física usa Rapier. El estilo actual es realista: luz y sombras reales, texturas generadas, agua y cielo. Los estilos anteriores (óleo y acuarela) siguen publicados y se eligen desde Opciones → Estilo visual.

Estado: mapa del Acto I con la aldea, el bosque, el cerro, el humedal y el río (`docs/acto-1.md`).

## Cómo jugar

```bash
npm install
npm run dev
```

Abre la dirección que aparece en la terminal.

- **WASD / flechas:** moverse · **Shift:** correr · **Espacio:** saltar
- **Clic + ratón** (o **Q / E**): girar la cámara · **Enter:** saltar cinemática
- **N:** notas · **B:** bolsa · **M** (o clic en el minimapa): mapa completo
- **Esc** (o el botón de la esquina): menú de opciones · **F:** pantalla completa
- En equipos lentos, agrega `?q=0.5` a la dirección para pintar menos trazos.
