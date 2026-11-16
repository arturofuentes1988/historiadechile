# Leftraru

Videojuego 3D sobre la infancia y el cautiverio de Lautaro (Leftraru), mitad historia real y mitad ficción. El mundo está pintado con pinceladas al óleo generadas por código (Three.js + shaders GLSL) y la física usa Rapier.

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
- En equipos lentos, agrega `?q=0.5` a la dirección para pintar menos trazos.
