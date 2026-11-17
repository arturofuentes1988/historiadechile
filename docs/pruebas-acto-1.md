# Pruebas del Acto I

Prueba hecha el 16 y 17 de noviembre de 2026 sobre lo que hoy se puede jugar: las misiones 1 a 3 y los encargos. Las misiones 4 a 6 no existen todavía y no entran aquí.

**En una línea:** la historia se puede jugar de principio a fin sin trabarse y sin errores. Lo que falla son detalles, ninguno grave. Quedó sin hacer la prueba de resistencia de 20 minutos.

## Cómo se probó

- En un navegador, con una copia del juego abierta en otro puerto (5174), para no tocar la partida de Arturo en el 5173. Cada puerto guarda su avance por separado; el avance de prueba ya se borró.
- Se partió sin nada guardado. La portada, «Entrar al mundo», «Historia» y el prólogo se probaron con clics y con Enter, en tiempo real.
- La historia se jugó dos veces: una a mano (caminando, corriendo y saltando con las teclas del jugador, leyendo cada conversación) y otra con el guion automático.
- El tiempo del juego se adelantó a mano, porque con el panel del navegador oculto el juego corre a 3 cuadros por segundo. Por eso no se pudo jugar a velocidad normal.
- No se arregló nada ni se tocó ningún archivo del juego.

**Sobre la misión del traro:** la prueba a mano se hizo con la versión anterior. Los cambios nuevos se revisaron solo con el guion: después de hablarle a Curiñancu la escena empieza sola, termina sola y la misión se cierra; y en la cima ya no aparece «Cortar pasto para los weke». No se miró con los ojos ni la caminata de Leftraru hasta su padre ni la toma nueva de la aldea desde arriba.

## El guion para repetir la prueba

`tools/prueba-historia.js` recorre la historia entera en unos 4 segundos y dice en qué paso falla. Se pega completo en la consola del navegador (F12 → Consola) con el juego cargado. Arriba del archivo está explicado.

- Probado: corrió la historia desde cero con los 15 pasos buenos, y también retomó bien una partida ya terminada.
- **Sin estrenar:** el segundo comando, `__prueba.resistencia(20)`, está escrito pero no se alcanzó a correr.
- Límite: mueve a Leftraru por teletransporte y revisa el estado del juego. No mira la imagen ni escucha el sonido.

## Lo que funcionó

### La historia, de corrido

| Paso | Resultado |
|---|---|
| Portada → «Entrar al mundo» → «Historia» | Bien, con clic y con Enter. |
| Prólogo | La hoja pasa sola en 54 segundos y entra la escena del llamado de Millaray. |
| Tutorial con Millaray | Estrella dorada sobre ella; hablar, observar el telar, alcanzar la lana con R. Cada paso cambia el aviso de arriba. |
| Los cinco piñones | Se recogen los cinco; el de las rocas se alcanza saltando desde la roca chica. Al cuarto sale «Falta uno…». |
| Escena del último piñón | Dos tomas y vuelve al juego. |
| Entrega a Millaray | Los piñones salen de la bolsa, «Misión completada · +40» y se abre «El traro». |
| Subida con Curiñancu | Va adelante, dice sus frases, espera si quedas a más de 13 metros. |
| Escena de la cima | Cuatro tomas, la despedida y «Misión completada · +40». |
| La machi | Da el encargo; aparecen las hojas verdes en el mapa y la cuenta de plantas. |
| Canelo, quillay y maqui | Se recogen con R. El canelo exige dos árboles distintos. |
| Lawen y Ñamku | La machi entrega el lawen, Ñamku lo recibe, «Misión completada · +50» y la lista queda en «Continuará…». |

**Orden de las misiones:** cada una se abrió solo al terminar la anterior. Nadie tuvo la estrella dorada antes de tiempo.

**Avisos de arriba:** en la historia completa salieron 43, cada uno en el paso que le corresponde. Los que anuncian una misión nueva y el del final se comprueban en el guion.

### Recargar a mitad de misión

Ocho recargas, y siempre se conservó el avance sin nada trabado: en el tutorial, con dos piñones, con los cinco sin entregar, a mitad de la subida (Curiñancu espera arriba), con la misión de la machi sin empezar, con las plantas a medias, con todas las plantas y con el lawen. Al volver se entra directo, sin prólogo. Leftraru aparece siempre en la aldea: el lugar donde estaba no se guarda.

### Lo demás

| Qué | Resultado |
|---|---|
| Guía desde la lista de arriba | Marca el camino, se acorta al caminar y pasa sola al siguiente objetivo. |
| Guía desde el panel de misiones | «Guiarme en el mapa» funciona y la guía se quita sola al cumplir. |
| Guía con clic en el mapa | Funciona sobre un punto cualquiera, una persona y un lugar. Otro clic en el destino la quita; también el botón «Quitar la guía». Al llegar avisa. |
| Mapa grande | Los lugares visitados muestran su nombre y los demás un «?». Aparecen los nombres de personas y cosas descubiertas. |
| Minimapa | Gira con Leftraru (lo que tiene delante queda arriba) y la flecha queda fija. |
| Panel de misiones | Seis de la historia en orden; solo los encargos ya recibidos. |
| Sentarse en el tronco | Se sienta, la abuela habla, se cumple «Junto al fuego». Sentado la vida sube 5 por segundo; de pie, 1,2. |
| Vida: caída | 4 metros no duelen; 11 metros quitan 28. Bajando el cerro a saltos se llega a perder 70. |
| Vida: agua | Con el agua al pecho baja 5 por segundo y sale el aviso. Bajo 30 la barra cambia. |
| Vida: desmayo | A cero se oscurece y despierta junto al fogón con 60. |
| Palin con Rayen | Presentación, desafío, partido y final. Se ganó 2 a 0 en 14 segundos. Queda la revancha. |
| Encargos | Murtilla, michay y nalca completos. Agua a la olla y pasto a los weke (los weke se acercan a comer). |
| Aves posadas | Las siete se dejaron observar: traro, choroy, rayadito, chucao, carpintero, picaflor y chuncho. |
| Monito del monte y weke | Se observan bien. |
| Errores | Ninguno en la consola en toda la prueba. El aviso de error del juego nunca apareció. |
| Velocidad | Cada cuadro tarda 0,3 milisegundos en calcularse (sin contar el dibujo), medido en 212 segundos de juego. |

## Fallas y cosas raras, de más a menos grave

Ninguna impide terminar la historia.

### 1. El guardado del cuaderno pesa mucho y puede llenarse sin avisar

- **Pasos:** descubrir fichas y mirar cuánto ocupa el guardado.
- **Pasó:** cada ficha guarda una foto de unos 54 KB. Con 33 fichas de 64 el guardado pesaba 1,8 MB; completo llegará a unos 3,5 MB. El navegador da cerca de 5 MB por sitio (menos en algunos).
- **Riesgo:** si se llena, el juego deja de guardar el cuaderno y no avisa. No ocurrió en la prueba.
- **Dato:** casi ninguna de esas fotos se usa. Las fichas muestran una imagen fija; solo los lugares y los seis animales nuevos muestran la foto tomada.

### 2. Las presentaciones de Curiñancu, la machi y Ñamku nunca se oyen

- **Pasos:** jugar la historia en orden, sin conversar con ellos antes de que la historia te lleve.
- **Esperaba:** oír alguna vez lo que cada uno cuenta al presentarse (el invierno de hambre, los sueños, los incas).
- **Pasó:** la primera conversación es la de la misión y la presentación se salta. Igual aparecen en el cuaderno «El regalo del pewen», «Ngen», «Pewma» y «La memoria del norte», y llegan sus encargos, sin que nadie los haya contado.

### 3. El pudú casi no se deja observar

- **Pasos:** acercarse caminando a un pudú, sin haber aprendido saberes. Ocho intentos.
- **Esperaba:** que caminando se pudiera observar, como dice la pista.
- **Pasó:** huye a 3,6 metros y solo se puede observar desde 3,85. El cartel «Observar el pudú» aparece 0,1 o 0,2 segundos, o no aparece. Afecta a dos encargos de Ayelén.
- **Zorro:** parecido pero menos. En 4 de 8 intentos el cartel alcanzó a salir, casi siempre menos de 1 segundo.

### 4. En el claro del maqui, la hoja verde marca un punto sin maqui

- **Pasos:** con el encargo de la machi, ir a la hoja verde del claro.
- **Pasó:** no aparece nada que recoger. El arbusto más cercano está a 13 metros.

### 5. El aviso «Ya tienes todos los piñones» a veces no se alcanza a ver

- **Pasos:** tomar el último piñón en el aire, saltando.
- **Pasó:** aparece un instante, la escena lo tapa y no vuelve. Ocurrió jugando a mano; con el guion no.

### 6. La abuela está parada sobre un tronco del fogón

- **Pasos:** sentarse en el tronco más cercano a ella.
- **Pasó:** Leftraru queda pegado a su vestido.

### 7. Para llenar la vasija en la poza hay que meterse hasta el pecho

- **Pasos:** ir a la poza con «Manos que ayudan» y buscar «Llenar la vasija con agua».
- **Pasó:** la acción aparece recién con el agua al pecho, donde salta «El agua está helada» y baja la vida.

### 8. En la subida al cerro

- Si quedas entre 13 y 22 metros detrás, una frase de Curiñancu se reemplaza a los 0,3 segundos por «Por aquí, hijo. Te espero».
- Caminando sin correr no se puede ir a su lado en lo empinado: Leftraru sube a 2,3 metros por segundo y el padre a 2,5 o más.
- Dice «Yo me quedo un rato más», pero al alejarte 70 metros ya está en la aldea.

### 9. Un encargo se cumple en el momento en que te lo dan

- **Pasos:** hacer la historia, mirar el volcán y el mar en la cima, y recién entonces conocer a la abuela.
- **Pasó:** «Lo que se cuenta junto al fuego» llega y se completa al instante.

### 10. El lawen no aparece en la bolsa

Tampoco el agua de la vasija ni el atado de pasto.

### 11. Detalles de texto

- «Recogiste hojas de canelo. Faltan 1.» Debería ser «Falta 1».
- «Llegaste a el punto que marcaste.» Debería ser «al punto».
- En el panel, una misión terminada sigue mostrando la instrucción pendiente («Llévaselos a tu madre», con «Completada» debajo).
- Al recargar vuelve a salir «Nueva misión: …», aunque no es nueva.
- Al recargar a mitad de la subida dice «Sigue a tu padre», pero él ya está arriba.
- La guía dice «Guía hacia Rayen» antes de conocerla, mientras el mapa la muestra como desconocida.

### 12. Observaciones menores

- En el mapa grande, el nombre «La aldea» queda tapado por los símbolos.
- Al empezar, el aviso de cómo moverse tarda unos 5 segundos: sale después de dos avisos de puntos.
- La tecla E ofrece primero lo que no conoces. Junto a la machi salió «Observar los juncos» antes que «Hablar con la machi».
- Al descubrir algo, ese cuadro tarda entre 25 y 85 milisegundos, porque se toma la foto y se guarda todo el cuaderno.
- Al despertar del desmayo, la barra de vida sigue en 0 por un segundo y medio.

## Lo que no se probó

- **La prueba de resistencia de 20 minutos.** No se hizo. No hay nada nuevo que decir sobre el congelamiento.
- Abrir el cuaderno y los saberes, y aprender un saber. La bolsa se revisó solo por su contenido.
- Huellas de pudú, saludar a los lugares con dueño, tirar piedras, beber de la poza.
- La toma nueva de la aldea en la escena de la cima, a la vista.
- No se puede probar desde aquí: sonido y música, pantalla completa, girar la cámara con el ratón, y el juego a velocidad normal.

**Sobre el entorno de prueba:** el panel del navegador se cerró solo tres veces durante la prueba. Fue la herramienta, no el juego. Los avisos de WebGL que salen al cargar con el panel oculto tampoco son del juego.
