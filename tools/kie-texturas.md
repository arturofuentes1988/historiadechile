# Texturas generadas con Kie.ai

Las imágenes de `public/assets/tex/` se generaron con la API de Kie.ai (modelo `nano-banana-pro`, 2K, 18 créditos cada una) y luego se procesaron.
La clave no está en el repositorio: se guarda como secreto del entorno.

- **Lista de pedidos:** `tools/kie-pedidos.json` (nombre, proporción, tipo y descripción de cada imagen).
- **Texturas continuas** (suelos, cortezas, roca, paja, tejido): se piden repetibles y con luz pareja; se guardan en WebP a 2048 px.
- **Recortes** (hojas de cada especie, rama de pewen, helecho, pasto, juncos, flores, quila, copihue): se piden sobre fondo azul puro, el azul se vuelve transparente y se guardan en WebP con transparencia a 1024 px.
- **Sin usar:** la textura de pelaje se generó pero no se usa; sobre el cuerpo de los animales se veía a franjas.

Cómo se pide una imagen:

1. `POST https://api.kie.ai/api/v1/jobs/createTask` con `{"model": "nano-banana-pro", "input": {"prompt": "...", "aspect_ratio": "1:1", "resolution": "2K", "output_format": "png"}}`. Devuelve un `taskId`. Admite unos 20 pedidos seguidos; después hay que esperar.
2. `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...` hasta que `state` sea `success`; la dirección del archivo viene en `resultJson.resultUrls`.
3. Saldo: `GET https://api.kie.ai/api/v1/chat/credit`.
