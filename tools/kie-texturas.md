# Texturas generadas con Kie.ai

Las imágenes de `public/assets/tex/` se generaron con la API de Kie.ai y luego se comprimieron.
La clave no está en el repositorio: se guarda como secreto del entorno.

| Archivo | Modelo | Tamaño | Créditos | Pedido (resumen) |
|---|---|---|---|---|
| `suelo-bosque.jpg` | nano-banana-pro | 2K | 18 | Suelo de bosque templado visto desde arriba: hojarasca de Nothofagus, ramitas, musgo. Repetible, luz pareja. |
| `corteza-pewen.jpg` | nano-banana-pro | 2K | 18 | Corteza de araucaria vieja, en placas poligonales, con líquenes. Repetible, luz pareja. |
| `paja.jpg` | google/nano-banana | 1K | 4 | Techo de paja y juncos en hileras superpuestas. Repetible, luz pareja. |

Cómo se pide una imagen:

1. `POST https://api.kie.ai/api/v1/jobs/createTask` con `{"model": "...", "input": {"prompt": "...", "aspect_ratio": "1:1", "resolution": "2K", "output_format": "jpg"}}`. Devuelve un `taskId`.
2. `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...` hasta que `state` sea `success`; la dirección del archivo viene en `resultJson.resultUrls`.
3. Saldo: `GET https://api.kie.ai/api/v1/chat/credit`.
