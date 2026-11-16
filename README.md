# Leftraru

Videojuego 3D sobre la infancia y el cautiverio de Lautaro (Leftraru), mitad historia real y mitad ficción. El mundo se arma por código (Three.js + shaders GLSL) y la física usa Rapier. No hay modelos 3D externos; las texturas de suelos, cortezas, hojas y plantas son imágenes generadas con IA (ver `tools/kie-texturas.md`).

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
