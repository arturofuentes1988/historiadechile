# Guion de las misiones 4, 5 y 6 — cierre del Acto I

> **Cambio de numeración (17 de noviembre de 2026):** se agregó a la historia una misión 4 nueva, «El arco de Ñamku» (era el encargo de la primera caza). Las tres misiones de este guion pasan a ser la **5, la 6 y la 7**; al programarlas, sus etapas se guardarían como `f.m5`, `f.m6` y `f.m7`. La frase con que Ñamku abre «Los invitados» ahora la dice al recibir el pudú, no al tomar el lawen. El resto del guion vale tal como está.

Borrador 1. Continúa `docs/acto-1.md` y respeta lo que ya está en el juego: las misiones 1 a 3 no cambian.
Este documento es solo guion: dice qué pasa, quién habla y qué se ve, para que después se pueda programar sin inventar nada.

## Cómo leer este guion

- **Etapas.** Cada misión avanza por etapas numeradas, igual que las misiones 1 a 3 (el número es el que guardaría el juego: `f.m4`, `f.m5`, `f.m6`).
- **Aviso, paso y guía.** Para cada etapa se indica el *aviso* (el mensaje de arriba), el *paso* (la línea corta de la lista de misiones) y la *guía* (a dónde apunta la línea de trazos del mapa).
- **Diálogos.** Se leen en el cuadro de conversación, una línea por vez. Cuando cambia el nombre, cambia quien habla. Ninguna línea pasa de unas 25 palabras.
- **Escenas.** Son listas de planos, como la de la cima del cerro: qué se ve, quién habla y qué dice. Si no habla nadie, el texto es relato (en cursiva, al centro). Todas se pueden saltar con Enter.
- **«(por confirmar)»** marca una costumbre, un relato o una palabra en mapudungun que conviene revisar con alguien que conozca la cultura mapuche. Al final hay una lista con todas.
- **Lugares.** Las posiciones van como (x, z) y son sugerencias: el norte es −z y el oriente es +x, como en el mapa del juego.
- **Teclas.** `{observar}` y `{accion}` son las teclas de siempre (E y R, si no se cambiaron).

---

## El hilo de las tres misiones

| | Misión 4 · Los invitados | Misión 5 · La noche de las historias | Misión 6 · We Tripantu |
|---|---|---|---|
| **Momento del día** | La tarde de la víspera, hasta que se pone el sol | La noche más larga | Antes del alba y el amanecer |
| **Cómo camina Leftraru** | Va **adelante**: guía a los invitados | Se **queda**: escucha junto al fuego | Va **en medio de todos**: baja al río con su gente |
| **Qué ve antes que nadie** | A los que vienen por el camino | Las estrellas que anuncian el año | El primer sol sobre el volcán |
| **Qué cambia en él** | Habla en nombre de los suyos | Recibe la memoria de su pueblo y cuenta por primera vez | Su gente cuenta con sus ojos |

Dos ideas sostienen el cierre:

1. **De seguir a guiar.** En la misión 2 Leftraru siguió a su padre. En la 4 es él quien va adelante y los demás lo siguen. En la 6 ya no va adelante ni atrás: camina con todos.
2. **Mirar deja de ser un defecto.** El acto parte con «deja de mirar pájaros». En cada una de estas misiones hay un momento en que Leftraru ve algo antes que los demás, y en la última toda la aldea espera su aviso. Es la respuesta a la pregunta del acto: *¿qué tiene que aprender un niño para que su gente pueda contar con él?*

**Los encargos secundarios** siguen disponibles durante la misión 4. Durante la noche y el alba (misiones 5 y 6) quedan en pausa, porque nadie se aleja del fuego; vuelven al terminar el acto.

---

## Personajes nuevos

Los invitados de la costa resultan ser familia: la hermana de Curiñancu, que vive en la costa desde que se casó, su marido y su hijo. Con ellos viene el werkén de su comunidad. Todos son ficticios.

Para reconocerlos de lejos, la gente de la costa viste **lana sin teñir (gris arena y café claro) con una franja verde mar**, y lleva collares de conchas. Nadie en la aldea usa esos colores.

| Personaje | Quién es | Cómo se ve | Cómo habla |
|---|---|---|---|
| **Antü** | Werkén (mensajero) de la gente de la costa. Unos 28 años. Su nombre significa «sol». | Hombre delgado, de piernas largas, 1,64 m. Makuñ gris arena con franja verde mar, trarilonko claro. Bastón de caminante y una rama de canelo en la mano, señal de que viene en paz (por confirmar). Collar de conchas. | Formal y exacto. Frases medidas. Repite las cosas «tal como se las dieron». |
| **Küyen** | Hermana menor de Curiñancu, hija de la abuela, tía de Leftraru. Unos 38 años. Su nombre significa «luna». | Mujer mediana, 1,55 m, con la misma mandíbula firme de su hermano. Küpam café oscuro, faja y borde verde mar. Collar de conchas blancas. Lleva un canasto a la espalda. | Cálida y burlona, como su madre. Trata a Leftraru de «sobrino». |
| **Mañke** | Marido de Küyen, hombre de mar. Unos 42 años. Su nombre significa «cóndor». | El más ancho de todos, 1,72 m. Makuñ café claro con franja crema. Carga a la espalda el atado más grande de cochayuyo. | Bromista. Habla de su espalda, de su carga y de la comida. |
| **Likan** | Hijo de Küyen y Mañke, primo de Leftraru. 9 años. Nunca había salido de la costa. | Niño de 1,26 m. Makuñ gris arena con franja verde mar. Una concha colgada al cuello y una bolsa de red con más conchas. | No se calla. Pregunta de a tres. Todo lo compara con «mi casa». |
| *Sin nombre (si alcanza)* | Una segunda familia de la costa: una mujer mayor y una pareja joven, con un weke cargado. | Mismos colores de la costa. | No conversan: saludan con un «mari mari». |

**Dónde están y cómo se mueven**

| Momento | Antü | Küyen, Mañke y Likan |
|---|---|---|
| Antes de la misión 4 | No están en el mapa. | No están en el mapa. |
| Misión 4, cuando Leftraru mira el camino | Aparece lejos, al poniente (−170, −11), caminando solo hacia la aldea. Se detiene en (−140, −12) y espera. | Aparecen detrás, cerca del borde del mapa (−192, −10), caminando lento. Se detienen unos veinte pasos detrás de Antü. |
| Misión 4, camino a la aldea | Sigue a Leftraru por el sendero, primero de la fila. | Detrás de Antü, en fila: Küyen, Likan (con Rayen al lado) y Mañke al final. Van a paso de gente cargada; si Leftraru se adelanta mucho, todos se detienen y lo esperan. |
| Misión 4, descanso | De pie, apoyado en su bastón. | Dejan la carga en el suelo. Likan se sienta en el suelo; ahí se conversa con él. |
| Misión 5, la noche | Sentado junto al fogón, lado norponiente. | Küyen junto a la abuela; Mañke cerca de Antü; Likan en el suelo, con Rayen. |
| Misión 6, el alba | Bajan al río con todos. | Bajan al río con todos. |
| Después del acto | Se quedan en la aldea ese día. | Se quedan en la aldea ese día. |

**Lo que traen** (por confirmar): atados de cochayuyo (*kollof*), tortas de luche seco, sartas de pescado y mariscos secos, sal y conchas. La aldea responde con piñones, lana y madera.

---

# Misión 4 — Los invitados

## Para qué sirve

Hasta ahora todos los encargos de Leftraru fueron dentro de su casa: traer, subir, recoger. Aquí por primera vez **habla en nombre de los suyos ante gente de afuera**. Ñamku le enseña cómo se recibe a una visita; Leftraru lo hace bien, y su padre se entera por boca de los invitados.

De paso, el jugador descubre que el mundo es más grande que el valle: hay un mar que Leftraru nunca ha visto, gente que vive de él, y un camino por donde van y vienen las cosas y las palabras.

**Qué cambia en Leftraru:** deja de ser el que recibe mandados y pasa a ser el que recibe personas. Y por primera vez **se le oye hablar** en el cuadro de conversación.

## Cómo se abre

La anuncian tres frases que ya están en el juego:

- Millaray, en la misión 1: «vienen los parientes de la costa».
- Curiñancu, en la cima: «desde aquí se ve venir a los invitados de la costa».
- Ñamku, al terminar la misión 3: «ya vienen los de la costa para el We Tripantu. Alguien tendrá que salir a recibirlos».

Al cerrarse esa última conversación (la misión 3 queda igual), pasa el tiempo con una escena corta y la estrella dorada vuelve a Ñamku, ya sano.

### Escena «La víspera»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | La aldea desde arriba, con el humo de las rukas. | Relato | «Pasaron tres días. La fiebre de Ñamku cedió y la aldea terminó de prepararse.» |
| 2 | El fogón: gente que pasa con leña y canastos; la abuela revuelve la olla. | Relato | «Hoy es la víspera. Esta noche será la más larga del año.» |
| 3 | El camino de la costa, vacío, perdiéndose hacia el poniente. | Relato | «Y por el camino del mar todavía no aparece nadie.» |

Al volver al juego, Curiñancu ya está en su lugar de la aldea (bajó del cerro) y Ñamku está de pie frente a su ruka, apoyado en un bastón.

## Los pasos

| Etapa | Qué hace el jugador | Dónde | Con quién | Qué queda marcado |
|---|---|---|---|---|
| 0 | Habla con Ñamku, que le enseña a recibir una visita. | Frente a la ruka de Ñamku, al oriente de la aldea | Ñamku | Etapa 1 |
| 1 | Busca a Rayen y le habla. Ella parte corriendo por el camino de la costa. | La cancha de palin | Rayen | Etapa 2 |
| 2 | Sigue a Rayen hasta la loma del camino. Ella no ve a nadie. Leftraru **observa** el camino y descubre al que viene adelante. Sale a su encuentro y lo saluda. | Camino de la costa: la loma (−122, −11) y el punto «Camino de la costa» (−150, −12) | Rayen, Antü | Ficha *Werkén* al observar. Tras el saludo: fichas *Antü* y *Pentukun*, escena «El encuentro», etapa 3 |
| 3 | **Guía** a los invitados por el sendero hacia la aldea. Ellos lo siguen a su paso. | Camino de la costa, hacia el oriente | Antü, Küyen, Mañke, Likan, Rayen | Al llegar al descanso (−60, −8): etapa 4 |
| 4 | Los invitados descansan. Conversa con Likan, que cuenta la historia del Shumpall y le regala una concha. | Junto al sendero, a la vista de la cancha | Likan, Rayen | Ficha *Shumpall*, la concha en la bolsa, etapa 5 |
| 5 | Lleva a los invitados hasta el fogón. Al llegar corre la escena «La llegada». | De (−60, −8) al fogón | Todos | Fichas *Küyen*, *Mañke*, *Likan* y *Trafkintu*. Misión cumplida (etapa 6) |

Nada se puede fallar: si Leftraru corre y deja atrás a los invitados, ellos se detienen y lo esperan.

## Avisos, pasos y guía

| Etapa | Aviso (arriba) | Paso (en la lista) | La guía apunta a |
|---|---|---|---|
| 0 | Nueva misión: Los invitados. Ñamku ya está en pie y quiere hablarte: búscalo frente a su ruka, al oriente de la aldea. | Habla con Ñamku, frente a su ruka | Ñamku |
| 1 | Busca a Rayen en la cancha de palin, al norponiente de la aldea: irá contigo. | Busca a Rayen en la cancha | Rayen |
| 2, en camino | Sigue a Rayen por el sendero del poniente: es el camino de la costa. | Sigue el camino de la costa | La loma del camino (−122, −11) |
| 2, en la loma | Rayen no ve a nadie. Quédate quieto, mira hacia el poniente y pulsa {observar}. | Observa el camino desde la loma | La loma del camino |
| 2, ya los vio | Uno viene adelante, solo: es el werkén. Sal a su encuentro y salúdalo como te enseñó Ñamku. | Saluda al werkén | Antü |
| 3 | Guía a los invitados hasta la aldea. Vienen cargados: camina a su paso, sin correr. | Guía a los invitados hacia la aldea | El lugar del descanso (−60, −8), con el nombre «el camino a la aldea» |
| 4 | Los invitados descansan un momento. Conversa con tu primo Likan. | Conversa con Likan | Likan |
| 5 | Ya descansaron. Llévalos hasta el fogón, donde tu padre los espera. | Llévalos hasta el fogón | El fogón |

**Texto largo de la misión** (panel de misiones), según la etapa:

- 0: «Ñamku ya está en pie y dice que hoy llegan los de la costa. Alguien tiene que salir a recibirlos. Búscalo frente a su ruka, al oriente de la aldea.»
- 1: «Ñamku te enseñó a recibir: saludar, decir quién eres, preguntar por el camino y por su gente, y recién entonces invitar a pasar. Busca a Rayen en la cancha: irá contigo.»
- 2: «Sal con Rayen por el camino de la costa, hacia el poniente, hasta la loma desde donde se ve venir a los que llegan. Al que venga adelante, salúdalo como te enseñó Ñamku.»
- 3 a 5: «Los de la costa resultaron ser familia: tu tía Küyen, su marido Mañke y tu primo Likan, con el werkén Antü. Llévalos a la aldea por el sendero. Vienen cargados: camina a su paso.»

**Quién da la misión** (campo «quién»): Ñamku y Rayen. **Puntos sugeridos:** 50.

## Diálogos

### Etapa 0 — Ñamku enseña a recibir

> **ÑAMKU:** «¿Ves? De pie otra vez. Amargo tu lawen, pero cumplió.»
> **ÑAMKU:** «Hoy llegan los de la costa. Tu padre los recibe aquí, junto al fuego, como lonko.»
> **ÑAMKU:** «Pero a la visita no se la deja llegar sola a la puerta. Alguien sale al camino a encontrarla. Hoy vas tú.»
> **ÑAMKU:** «Escucha, que esto no se improvisa. Primero saludas: mari mari. Dices quién eres y de quién eres hijo.»
> **ÑAMKU:** «Después preguntas: por el camino, por su gente, por los viejos y los niños. Y escuchas la respuesta entera, sin apurar.»
> **ÑAMKU:** «Recién entonces invitas a pasar. El que recibe bien a su visita tiene casa en la costa para siempre.»
> **ÑAMKU:** «Y lleva a Rayen, que dos reciben mejor que uno. Anda a buscarla a la cancha.»

*(Ñamku levanta un dedo en la cuarta línea: es su gesto cuando dice algo importante.)*

### Etapa 1 — Rayen

> **RAYEN:** «¿Tú, a recibir a los de la costa? ¿Y qué les vas a decir, mirón? ¿Que viste un pájaro?»
> **RAYEN:** «Ya, no pongas esa cara. Voy contigo: alguien tiene que hablar si te quedas mudo.»
> **RAYEN:** «Es por el sendero del poniente. Te espero en la loma… si es que llegas.»

Rayen corre adelante por el sendero y se detiene a esperar cuando Leftraru queda lejos (igual que el padre en el cerro, pero más rápida y burlándose).

**Lo que dice al pasar**, sin detener el juego:

- Al partir: «¡Apúrate! A este paso, los de la costa nos van a recibir a nosotros.»
- A medio camino: «Mi madre dice que la gente del mar come pasto que sale del agua. Eso lo quiero ver.»
- Si lo espera: «¿Otra vez mirando el cielo? ¡Por aquí, mirón!»
- Al llegar a la loma: «Nada. Puro camino y puro barro. Si no llegan hoy, los piñones me los como yo.»

### Etapa 2 — Leftraru mira el camino

En la loma aparece la opción **«Observar el camino»**. La cámara se acerca, como cuando se mira un ave: muy lejos, entre los árboles, camina una figura sola; más atrás, apenas unos bultos que se mueven. Queda la ficha *Werkén* en el cuaderno.

> **RAYEN:** «¿Dónde? Yo no veo nada… Ah. Ahora sí. ¿Cómo lo haces?»
> **RAYEN:** «Uno viene adelante, solo. Ese tiene que ser el werkén, el que trae la palabra. Anda tú: yo te miro.»

Antü se acerca caminando y se detiene. La estrella dorada pasa a él.

### Etapa 2 — El saludo

> **ANTÜ:** «Mari mari. Soy Antü, werkén de la gente del lafken. ¿Quién sale a encontrarnos?»
> **LEFTRARU:** «Mari mari. Soy Leftraru, hijo de Curiñancu, lonko de este lof. Ella es Rayen.»
> **LEFTRARU:** «¿Cómo estuvo el camino? ¿Cómo está tu gente? ¿Cómo están los viejos y los niños?»
> **ANTÜ:** «El camino, largo y con barro. Mi gente, bien. Los viejos, quejándose; los niños, creciendo. Todo como debe ser.»
> **ANTÜ:** «¿Y tu padre? ¿Y tu casa? Supimos que había un anciano enfermo.»
> **LEFTRARU:** «Mi padre está bien y los espera junto al fuego. El anciano es Ñamku. Ya está en pie.»
> **ANTÜ:** «Buena noticia. Esa la llevo de vuelta tal como me la diste, palabra por palabra.»
> **ANTÜ:** «Preguntaste bien, hijo de Curiñancu. Alguien te enseñó.»
> **RAYEN:** «Yo no fui.»
> **LEFTRARU:** «Pasen. Los estamos esperando.»

Al cerrar: fichas *Antü* y *Pentukun*, y corre la escena.

### Escena «El encuentro»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | Desde atrás de Leftraru y Rayen, mirando al poniente: por el sendero llega la fila. Un hombre ancho con un atado enorme a la espalda, una mujer, un niño. | Relato | «Detrás del werkén venía la gente del mar: dos días de camino con la carga a cuestas.» |
| 2 | La mujer se adelanta y deja su canasto en el suelo. De cerca se parece a Curiñancu. | Küyen | «¿Leftraru? La última vez me llegabas a la cintura. Soy Küyen, la hermana de tu padre.» |
| 3 | El hombre ancho, doblado bajo el cochayuyo, sonríe. | Mañke | «Y yo soy Mañke, el que carga. Tu tía trae los saludos; yo traigo el cochayuyo.» |
| 4 | El niño, medio escondido detrás de su madre, mira hacia arriba, a las copas de los árboles. | Küyen | «Y este es Likan, tu primo. Nunca había salido de la playa. Tampoco se calla nunca: ya vas a ver.» |
| 5 | De frente: Leftraru y Rayen, y detrás de ellos el sendero que vuelve a la aldea. | Relato | «Leftraru había salido a recibir invitados. Resultó que eran familia.» |

### Etapa 3 — El camino a la aldea

Leftraru va adelante y los demás lo siguen. **Lo que dicen al pasar:**

- Al partir. **KÜYEN:** «Yo conozco este camino desde antes que nacieras. Pero hoy nos llevas tú: así se hace.»
- Un poco más allá. **MAÑKE:** «Dos días de camino. La primera noche dormimos oyendo el mar. La segunda, ya no se oía.»
- Después. **LIKAN:** «¿Todos estos árboles son de ustedes? En mi casa hay arena, y después más arena.» / **RAYEN:** «No son de nadie. Tienen dueño, que es distinto.»
- Después. **RAYEN:** «Se llama Antü, como el sol. O sea que el sol ya llegó y esta noche se puede dormir.» / **ANTÜ:** «Buen intento, niña.»
- Cuando el cerro se ve entre los árboles. **KÜYEN:** «Ese cerro… De niña lo subía con tu padre. Él miraba todo, callado. Igual que tú, me dicen.»
- Si Leftraru se adelanta. **MAÑKE:** «¡Más despacio, sobrino! Tú vienes liviano; nosotros no.»
- Si se adelanta mucho (se detienen). **KÜYEN:** «Aquí te esperamos. El que guía no deja atrás a su visita.»
- Al llegar al descanso. **MAÑKE:** «Aquí descansamos un rato. Esta espalda ya no es la de antes.»

### Etapa 4 — Likan y el Shumpall

Los invitados dejan la carga en el suelo. Likan se sienta y saca una concha de su bolsa. Rayen se queda de pie, con los brazos cruzados.

> **LIKAN:** «¿Tú te bañas en el río? ¿Y le pides permiso al Shumpall?»
> **RAYEN:** «¿Al qué?»
> **LIKAN:** «Al Shumpall. El dueño del agua. Vive abajo, donde no se ve el fondo. Tiene cuerpo de gente y pelo largo, como algas.»
> **LIKAN:** «Mi abuela de allá cuenta que una muchacha bajó sola al agua. Y el agua se la llevó.»
> **LIKAN:** «Su familia la lloró muchos días. Hasta que una mañana ella salió del agua, entera, y les dijo: no lloren. Me casé con el Shumpall.»
> **LIKAN:** «Él no se la llevó sin pagar. Al otro día, la orilla amaneció llena de peces y mariscos. Era el pago por la novia.»
> **LIKAN:** «Por eso mi gente nunca saca nada del mar sin pedir. Y nunca, nunca, se mete al agua sin saludar.»
> **RAYEN:** «Eso será en el mar. Aquí el río es chico.»
> **LIKAN:** «Mi abuela dice que toda el agua es la misma agua.»
> **LIKAN:** «Toma. Es de mi playa. Póntela en la oreja… ¿Oyes? Así suena mi casa.»

Al cerrar, un mensaje breve arriba: *«Leftraru no dijo nada. Pero pensó en la poza del río, y en lo oscura que es en el fondo.»* Queda la ficha *Shumpall* y **una concha de la costa** en la bolsa.

*(La historia vuelve en la misión 6, cuando todos entran al río.)*

### Etapa 5 — Los últimos pasos

- Al partir de nuevo. **LIKAN:** «¿Falta mucho? ¿Y ese pájaro cómo se llama? ¿Y ese otro?»
- Cuando se ve el humo de la aldea. **KÜYEN:** «Ese humo… Es el fogón de mi madre. Huele igual.»

### Escena «La llegada»

Corre cuando Leftraru entra a la explanada de la aldea con los invitados cerca. Toda la aldea está reunida al lado poniente del fogón: Curiñancu adelante, con la abuela a su lado; Millaray con un canasto; Ñamku y la machi un paso atrás.

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | La aldea desde el sendero del poniente, con la luz baja de la tarde. La gente deja lo que hacía y se junta. | Relato | «Toda la aldea dejó lo que estaba haciendo. Llegaba la gente del mar.» |
| 2 | Curiñancu, de frente, con Antü delante de él. | Curiñancu | «Mari mari, werkén. Mari mari, hermana. Esta es su casa. Aquí hay fuego y hay comida.» |
| 3 | Antü, con su rama de canelo. Detrás, Leftraru. | Antü | «Mari mari, lonko. Tu hijo salió al camino y preguntó por cada uno de nosotros. Nos recibieron bien antes de llegar.» |
| 4 | La abuela toma la cara de Küyen con las dos manos. | La abuela | «Küyen. Hija. Estás más flaca. ¿Qué te dan de comer en ese mar?» |
| 5 | Mañke descarga el cochayuyo y las sartas de pescado sobre una estera. Millaray pone al lado su canasto. | Millaray | «Y esto es de aquí: piñones del pewen. Los recogió mi hijo, uno por uno. Sin sacudir el árbol.» |
| 6 | Las dos cosas juntas sobre la estera: lo oscuro del mar y lo dorado del pewen. | Mañke | «Mar para el cerro y cerro para el mar. Así ha sido siempre, y así nadie pasa hambre.» |
| 7 | Curiñancu mira a su hijo. Antes de hablar mira hacia el cerro, como hace siempre, y vuelve a mirarlo. | Curiñancu | «Bien, hijo.» |
| 8 | El sol bajando por el poniente, sobre el camino por donde llegaron. | Relato | «El sol se fue por donde habían venido los invitados. Empezaba la noche más larga.» |

Al terminar: misión cumplida. Los regalos quedan junto al fogón y se pueden observar (fichas *Cochayuyo* y *Trafkintu*). La estrella dorada pasa a la abuela.

## Lo que dicen los demás durante esta misión

Si el jugador conversa con alguien fuera de orden:

- **Ñamku** (etapas 1 a 5): «¿Todavía aquí? La visita no espera. Y acuérdate: primero se pregunta, después se invita.»
- **Rayen** (etapa 2): «¡Menos conversa! Por el poniente, mirón.»
- **Curiñancu** (etapas 0 a 5): «Los vi desde el cerro: vienen cargados y despacio. Sal a encontrarlos; yo los recibo aquí.»
- **Millaray**: «Los piñones ya están en el canasto. Tú tráeme a los invitados enteros.»
- **La abuela**: «¿Ya vienen? Hace muchos inviernos que no veo a mi hija. Anda, anda, no los hagas esperar.»
- **Antü** (etapas 3 a 5): «Tú adelante, hijo de Curiñancu. Nosotros te seguimos.»
- **Mañke** (etapas 3 y 5): «Camina no más, sobrino. Si me paro otra vez, no me vuelvo a levantar.»
- **Likan** (etapa 5): «¿Ya la oíste? La concha. Suena igual de día y de noche.»
- **Ayelén** (después de la llegada): «¡Tengo un primo nuevo! Dice que el mar no se acaba nunca. ¿Es verdad?»

---

# Misión 5 — La noche de las historias

## Para qué sirve

Es el clímax del acto y casi no hay nada que «hacer»: la aldea entera espera despierta junto al fuego y **el jugador elige a quién escuchar**. Aquí se muestra cómo un pueblo sin escritura guarda lo que sabe: hablando, de mayores a niños, con las mismas palabras cada vez.

La última historia es la de Ñamku, **la memoria de los incas**. Es el único presagio del acto: ya una vez vinieron extraños a mandar. Nadie nombra a los españoles; el jugador, que leyó el prólogo, entiende solo.

**Qué cambia en Leftraru:** pasa de mirar a guardar. Recibe la memoria de su gente y, si el jugador quiere, cuenta por primera vez lo que él mismo vio. Además descubre para qué sirve mirar antes de actuar: cuando vinieron los hombres del inca, lo primero fue mandar a alguien a mirarlos.

## Cómo se abre

La escena «La llegada» termina con el relato «Empezaba la noche más larga» y la estrella queda en la abuela, junto al fogón. Ya lo había anunciado ella misma de día («la noche del We Tripantu») y Millaray («la noche más larga se pasa mejor abrigado»).

## Los pasos

| Etapa | Qué hace el jugador | Dónde | Con quién | Qué queda marcado |
|---|---|---|---|---|
| 0 | Habla con la abuela, que le explica la noche y le pide leña. | El fogón | La abuela | Etapa 1 |
| 1 | Trae tres brazadas de leña desde la leñera y las deja junto al fuego. Con la tercera corre la escena «Anochece». | Leñera detrás de la ruka de la familia (−19, −12) y fogón | Millaray, Likan y la abuela comentan | Etapa 2. Ya es de noche |
| 2 | **Escucha a quien quiera.** Se acerca a una persona junto al fogón y le habla: cada una tiene su historia. Cuando ha escuchado dos, Ñamku pide la palabra. Al escuchar a Ñamku termina la etapa. | Alrededor del fogón | Ver «Las historias» | Una marca por cada historia. Con la de Ñamku: etapa 3 |
| 3 | Va donde su padre, que está apartado del fuego, y **observa** el cielo sobre el cerro: asomaron las estrellas que anuncian el año. | Lugar de Curiñancu (2, −9) | Curiñancu | Ficha *Ngaw*. Misión cumplida (etapa 4) |

**Reglas de la noche**

- No hay orden ni apuro. **La noche avanza solo cuando el jugador escucha a alguien.**
- Ninguna historia se pierde: las que no escuchó antes de Ñamku siguen disponibles hasta que vaya donde su padre.
- Ñamku habla al final. Antes de las dos primeras historias, responde: «Todavía no, niño. Los viejos hablamos al final, cuando el fuego baja y los chicos se duermen. Escucha a los demás primero.»
- Esta noche nadie se aleja del fuego. Si Leftraru sale de la aldea, se detiene solo y aparece: «Esta noche nadie se aleja del fuego.»

## Avisos, pasos y guía

| Etapa | Aviso (arriba) | Paso (en la lista) | La guía apunta a |
|---|---|---|---|
| 0 | Nueva misión: La noche de las historias. La abuela te llama junto al fogón. | Habla con la abuela, en el fogón | La abuela |
| 1 | El fuego tiene que durar hasta el alba. Trae leña de la leñera, detrás de la ruka de tu familia: pulsa {accion} para tomarla y para dejarla junto al fogón. | Trae leña al fogón (0/3) | La leñera; si lleva leña, el fogón |
| 2, al empezar | (dos avisos seguidos) Empezó la noche. Acércate a quien quieras escuchar junto al fogón y pulsa {observar}. — No hay apuro ni orden: la noche avanza solo cuando escuchas a alguien. | Escucha a quien quieras junto al fogón (0 de 2) | Los troncos del fogón |
| 2, con dos historias | El fuego bajó y los más chicos cabecean. Ñamku levantó un dedo: quiere hablar. | Escucha a Ñamku | Ñamku |
| 3 | Tu padre te llama, apartado del fuego. Si aún quieres escuchar a alguien, hazlo antes de ir. | Anda donde tu padre y mira hacia el cerro | Curiñancu |
| 3, junto a él | Mira hacia el cerro Treng Treng, al nororiente, y pulsa {observar}. | Mira hacia el cerro | Curiñancu |

**Texto largo de la misión:**

- 0: «Los invitados ya están en la aldea y empieza la noche más larga del año. La abuela te llama junto al fogón.»
- 1: «Esta noche el fuego no puede apagarse. Trae tres brazadas de leña desde la leñera, detrás de la ruka de tu familia, y déjalas junto al fogón.»
- 2: «Nadie duerme: se come y se cuentan historias hasta el alba. Acércate a quien quieras escuchar. Ñamku hablará al final.»
- 3: «Ñamku contó cómo fueron detenidos los hombres del inca. Tu padre te llama: está de pie, apartado del fuego, mirando el cielo.»

**Quién da la misión:** la abuela. **Puntos sugeridos:** 60.

## Diálogos de apertura

### Etapa 0 — La abuela

> **LA ABUELA:** «Ven acá, Leftraru. Tu tía dice que preguntaste por todos, uno por uno. Así se hace.»
> **LA ABUELA:** «Esta noche no se duerme. El sol anda lejos y cansado, y hay que esperarlo despiertos para que encuentre el camino de vuelta.»
> **LA ABUELA:** «Se espera comiendo y contando. Cada uno trae algo que contar: los de la costa, los de aquí, los viejos.»
> **LA ABUELA:** «Pero un fuego que dura hasta el alba come mucha leña. Tráeme tres brazadas de la leñera, detrás de la ruka.»

*(La idea de esperar despiertos «para que el sol encuentre el camino» es una imagen nuestra: por confirmar.)*

### Etapa 1 — La leña

Cada vez que deja una brazada, alguien comenta y la luz baja un poco:

- Primera. **MILLARAY:** «Esa ponla abajo, que está seca. La verde va arriba, para que dure.»
- Segunda. **LIKAN:** «¿Tanta? En mi casa quemamos lo que bota el mar.»
- Tercera. **LA ABUELA:** «Con eso alcanza. Ahora siéntate, que ya oscureció y esto va a empezar.»

### Escena «Anochece»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | El cielo del poniente con la última luz; las rukas en silueta. | Relato | «Se fue la última luz. De aquí al alba, el único sol es el del fogón.» |
| 2 | El fogón con las llamas altas. Las caras alumbradas, todos en ronda. Pasan piñones tostados y cochayuyo. | Relato | «Nadie se acuesta. Se come lo que trajo el mar y lo que dio el pewen, y se cuenta.» |
| 3 | Las chispas suben. Arriba, las primeras estrellas sobre los techos de paja. | La abuela | «Elige a quién escuchar, niño. La noche es larga y alcanza para todos.» |

Al volver al juego es de noche y Leftraru está sentado en su tronco, al poniente del fuego.

## Dónde está cada uno esta noche

El fogón está en (0, 0) y tiene cinco troncos alrededor. Leftraru usa el del poniente.

| Quién | Dónde | Qué hace |
|---|---|---|
| La abuela | Tronco del suroriente (2,4; 1,6), su lugar de siempre | Sentada, con el bastón entre las manos |
| Ayelén | En el suelo, pegada a la abuela (3,3; 2,6) | Despierta al comienzo; dormida cuando habla Ñamku |
| Küyen | Tronco del sur (−0,7; 2,8), al lado de su madre | Sentada |
| Antü | Tronco del norponiente (−1,4; −2,5) | Sentado, con la rama de canelo a su lado |
| Ñamku | Tronco del nororiente (1,8; −2,2) | Sentado, con su manta extra sobre los hombros |
| Leftraru | Tronco del poniente (−2,9; 0,4) | El jugador se levanta y se sienta cuando quiere |
| Millaray | De pie al surponiente (−3,9; 2,2) | Termina las últimas vueltas de la manta a la luz del fuego |
| Mañke | En el suelo, cerca de Antü (−3,6; −2,6) | Come |
| La machi | Al oriente (4,4; −0,6) | Sentada, muy quieta, con su kultrún al lado |
| Rayen y Likan | En el suelo, al sur (−1,5; 4,4) y (0,2; 4,6) | Rayen despierta hasta el final; Likan se duerme después de Ñamku |
| Curiñancu | De pie, apartado, al norte (2, −9) | Mira el cielo. De vez en cuando se acerca a acomodar el fuego |
| La gente sin nombre | Un segundo anillo, más atrás | De pie o sentada, de fondo |

## Las historias

Cada persona con una historia lleva la estrella dorada hasta que se la escucha. Las cuatro primeras de la tabla son el **núcleo**: con ellas la misión funciona completa. Las demás enriquecen la noche y se pueden agregar después.

| | Quién | Historia | Forma | Tono |
|---|---|---|---|---|
| A | La abuela | El regalo del pewen | Escena | De origen, cálida |
| B | Küyen (y la abuela la corrige) | El zorro y la perdiz, un epew | Escena | Para reírse |
| C | Antü | La isla del poniente | Escena | De asombro |
| **G** | **Ñamku** | **La memoria de los incas** | **Escena. Siempre la última** | **Grave: el presagio** |
| D | La machi | La noche en que el sol da la vuelta | Diálogo | Lo que pasa esta noche |
| E | Curiñancu | El río del cielo | Diálogo y observar el cielo | Enseña haciendo |
| F | Leftraru (lo provoca Rayen) | Lo que vio Leftraru | Diálogo que cambia según lo descubierto | El niño cuenta por primera vez |
| H | La abuela, si se le habla otra vez | Treng Treng y Kai Kai, completa | Escena | Cumple lo que prometió de día |

Cuentan para las «dos historias» que pide Ñamku todas menos la suya.

### A — La abuela: «El regalo del pewen»

Antes de la escena:

> **LA ABUELA:** «Toma, come primero. Estos los recogiste tú.»
> **LA ABUELA:** «Ahora escucha de dónde viene lo que tienes en la boca.»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | La cara de la abuela, alumbrada desde abajo. Toca el suelo con la mano antes de empezar. | La abuela | «Hubo un invierno tan largo que se acabó todo. La caza se fue. Las papas se pudrieron bajo la nieve.» |
| 2 | Las caras de los que escuchan, una por una. Ayelén con la boca abierta. | La abuela | «La gente pasaba hambre sentada bajo los pewenes. Nadie tocaba sus frutos: el árbol era sagrado, y lo sagrado no se come.» |
| 3 | El fuego; las chispas suben. | La abuela | «Un muchacho salió a buscar comida para los suyos. Caminó días. Volvía con las manos vacías cuando encontró a un anciano en el camino.» |
| 4 | Unas manos dan vuelta piñones sobre la ceniza caliente. | La abuela | «El anciano le dijo: esos frutos son un regalo. Cuécelos en agua o tuéstalos en la ceniza. Guarda los demás bajo tierra.» |
| 5 | La abuela mira a Leftraru. | La abuela | «El muchacho volvió y contó. Esa noche la gente comió. Y nunca más un invierno pudo con nosotros.» |
| 6 | Desde el fuego hacia el norte oscuro, donde está el bosque de pewenes, bajo las estrellas. | La abuela | «Por eso al pewen no se le pega ni se le sacude. A nadie se le quita de las manos lo que está regalando.» |

Después:

> **AYELÉN:** «¿Y quién era el anciano?»
> **LA ABUELA:** «Eso no se pregunta, niña. Eso se agradece.»

Deja la ficha *El regalo del pewen* si no la tenía.

### B — Küyen: «El zorro y la perdiz»

Antes de la escena:

> **KÜYEN:** «¿Una de miedo? No. Esta noche, una para reírse. Me la contaba mi madre, aquí mismo.»
> **LA ABUELA:** «A ver cómo la cuentas. Yo escucho.»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | Küyen, con los niños alrededor. | Küyen | «El zorro oyó silbar a la perdiz y se murió de envidia. Él, que se creía el más listo del monte, no sabía silbar.» |
| 2 | Küyen hace con los dedos el gesto de coser. | Küyen | «Enséñame, le dijo. Y la perdiz: con ese hocico tan grande, imposible. Hay que coserlo. Y se lo cosió, dejando un hoyito.» |
| 3 | Likan intenta silbar; Rayen se ríe de él. | Küyen | «El zorro sopló… ¡y silbó! Se fue por el monte silbando, feliz, sin saludar a nadie, de puro orgulloso.» |
| 4 | La abuela levanta el bastón. | La abuela | «Sin saludar a nadie, no. "Sin mirar por dónde pisaba." Así es. Si la cambias, se pierde.» |
| 5 | Küyen sonríe y baja la cabeza. | Küyen | «Sin mirar por dónde pisaba. Y la perdiz, escondida en el pasto, salió volando de golpe entre sus patas: ¡prrrr!» |
| 6 | Todos se ríen; el fuego. | Küyen | «El zorro gritó del susto… y se le rajó la costura de oreja a oreja. Por eso tiene esa boca tan grande.» |

Después:

> **LIKAN:** «¡Y por eso no silba!»
> **RAYEN:** «Igual que tú, mirón: sin mirar por dónde pisas.»
> **LEFTRARU:** «Yo siempre miro por dónde piso.»
> **RAYEN:** «Por eso llegas último.»

Deja la ficha *Epew*. *(Es una versión resumida nuestra de un epew conocido; el detalle que corrige la abuela lo inventamos para mostrar que las historias se cuentan siempre igual: por confirmar.)*

### C — Antü: «La isla del poniente»

Antes de la escena:

> **ANTÜ:** «Un werkén no inventa: repite lo que le confiaron, sin quitar ni poner. Esto me lo confiaron los viejos de mi playa.»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | Antü; detrás de él, el poniente oscuro. | Antü | «Desde mi casa, cuando el día está limpio, se ve una isla en el mar, hacia donde se pone el sol.» |
| 2 | Por encima de las rukas, hacia el poniente: estrellas bajas sobre los árboles. | Antü | «Los viejos dicen que allá van los que mueren. No se pierden: cruzan el agua y siguen viviendo al otro lado.» |
| 3 | Las brasas. | Antü | «Al caer la tarde, cuatro ancianas bajan a la orilla y se vuelven ballenas. Sobre su lomo cruza el que tiene que cruzar.» |
| 4 | El collar de muchas vueltas de la abuela, de cerca, con sus cuentas de piedra. | Antü | «Por eso al que se va se le dejan sus cuentas de piedra: para pagar el viaje. Nadie cruza de balde.» |
| 5 | Likan, con sueño, apoyado en su madre. | Antü | «Yo he mirado esa isla muchas tardes. Nunca he visto a las ballenas. Pero tampoco he visto al viento, y me bota la ruka.» |
| 6 | Leftraru mirando el fuego. | Antü | «El sol se va por allá cada tarde y vuelve por el otro lado. Esta noche es cuando más lejos anda. Por eso lo esperamos.» |

Después:

> **LEFTRARU:** «¿Y vuelven? Los que cruzan.»
> **ANTÜ:** «Eso no me lo confiaron. Pregúntale a tu machi.»

Deja la ficha *La isla del poniente*. *(Todo este relato es por confirmar, y con especial cuidado: habla de los muertos.)*

### D — La machi: «La noche en que el sol da la vuelta»

No es una escena: la machi habla poco y sin adornos.

> **LA MACHI:** «¿Quieres un cuento? Yo no cuento. Yo te digo lo que está pasando esta noche, mientras ustedes hablan.»
> **LA MACHI:** «El sol viene achicando sus pasos desde el verano. Esta noche se detiene, lejos. Mañana empieza a volver.»
> **LA MACHI:** «Todo lo sabe antes que nosotros. La savia vuelve a subir por los árboles. El agua del río cambia. Los animales lo sienten.»
> **LA MACHI:** «Por eso bajamos al río antes del alba: para que el agua nueva nos encuentre primero y se lleve lo viejo.»
> **LA MACHI:** «El año no empieza porque alguien lo diga. Empieza porque todo vuelve a brotar. Nosotros solo salimos a recibirlo, como tú saliste hoy al camino.»

Solo si el jugador ya saludó al bosque viejo, al menoko y al lugar de los antiguos:

> **LA MACHI:** «Saludaste al bosque, al menoko y a los antiguos. Yo lo supe. A las luces no se las persigue, niño: se las saluda.»

Y para cerrar:

> **LA MACHI:** «Si esta noche cabeceas y sueñas algo, mañana me lo cuentas. Los sueños de esta noche pesan más.»

Deja la ficha *We Tripantu* si no la tenía. *(La savia, el agua que cambia y los sueños de esa noche: por confirmar.)*

### E — Curiñancu: «El río del cielo»

Curiñancu no cuenta: muestra. Está de pie, apartado del fuego.

> **CURIÑANCU:** «Ven. Aquí, donde no encandila el fuego. Ahora mira arriba. No me digas nada todavía: mira.»

Aparece la opción **«Mirar el cielo»**. La cámara sube: una franja blanca cruza la noche de lado a lado. Queda la ficha *Wenu Lewfü*.

> **CURIÑANCU:** «Ese camino blanco es el Wenu Lewfü, el río del cielo. Corre arriba igual que el nuestro corre abajo.»
> **CURIÑANCU:** «Hay un puñado de estrellas juntas, chicas, que en estos días no se ve. Se esconde antes del invierno.»
> **CURIÑANCU:** «Cuando vuelve a asomar por el oriente, justo antes del alba, sabemos que el sol también vuelve.»
> **CURIÑANCU:** «Esta noche te toca a ti estar atento. Mira hacia el cerro de vez en cuando. Tú ves primero.»

### F — «Lo que vio Leftraru»

La provoca Rayen. Es la forma en que entran a la noche «las historias que el jugador fue encontrando»: Leftraru cuenta lo que descubrió en sus encargos.

> **RAYEN:** «¿Y tú, mirón? Te pasas el día mirando y nunca cuentas nada. A ver: ¿qué viste?»
> **LA ABUELA:** «Cuenta, niño. Lo que se mira y no se cuenta se pierde, igual que un cuento.»
> **LEFTRARU:** «Desde la cima del Treng Treng se ve todo junto: el mar a un lado, el volcán al otro y nuestro humo al medio.»

Después Leftraru agrega **hasta tres** de estas, en este orden, según lo que el jugador tenga en el cuaderno:

| Si el jugador… | Leftraru dice | Y le responden |
|---|---|---|
| siguió las huellas y vio al pudú | «Seguí unas huellas chicas hasta ver al pudú. Si uno camina despacio no huye: te mira primero.» | **AYELÉN:** «¡Eran de pudú! ¡Yo las vi primero!» |
| observó al traro | «Vi al traro posado, cerca de la cima. Antes de bajar mira mucho rato. Después no falla.» | *(Curiñancu asiente, sin decir nada.)* |
| observó el árbol abuelo | «En el bosque viejo hay un coigüe que no alcanzan a rodear cinco personas. Nadie lo ha visto chico.» | **ÑAMKU:** «Yo tampoco. Y mira que soy viejo.» |
| observó al chuncho | «Vi al chuncho, quieto en su rama. Es del porte de un puño y no le tiene miedo a nadie.» | **LA ABUELA:** «A ese se le escucha con respeto. No lo andes molestando.» |
| observó al monito del monte | «Vi un animal que cabe en una mano, dormido en una rama, con la cola enrollada.» | **LIKAN:** «¡Mentira!» / **RAYEN:** «Si lo dice él, es verdad. No sabe inventar.» |
| saludó a los tres lugares con dueño | «Saludé al entrar al bosque viejo, y unas luces chicas me dieron vueltas. Después se fueron.» | *(La machi sonríe y no dice nada.)* |
| le ganó a Rayen al palin | «Y le gané a Rayen al palin. A dos rayas.» | **RAYEN:** «¡Eso no es un cuento! …Y fue una sola vez.» |

Y cierra siempre igual:

> **LA ABUELA:** «¿Ven? Miraba pájaros, decían. Estaba aprendiendo el valle.»
> **ANTÜ:** «Si quieres, lo llevo a la costa tal como lo dijiste. Así empieza a viajar la palabra de uno.»

### H — La abuela, por segunda vez: «Treng Treng y Kai Kai, completa»

De día, la abuela promete: «Te la cuento otra vez la noche del We Tripantu, completa». Si el jugador vuelve a hablarle después de su primera historia, cumple.

> **LA ABUELA:** «¿Otra? Bueno: te debo una. Te prometí Treng Treng y Kai Kai entera, y yo cumplo.»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | La abuela; detrás, hacia el nororiente, la sombra del cerro contra las estrellas. | La abuela | «La gente se olvidó de agradecer. Tomaba del mar y de la tierra sin pedir. Y Kai Kai, la serpiente del agua, se enojó.» |
| 2 | Las llamas, de cerca, moviéndose como agua. | La abuela | «Golpeó el mar con la cola y el agua empezó a subir. Tapó las playas, tapó los valles. Kai, kai, kai, gritaba.» |
| 3 | Los niños, muy quietos. | La abuela | «Entonces Treng Treng, la serpiente de la tierra, llamó desde su cerro: suban, suban. Y la gente subió con sus hijos y sus animales.» |
| 4 | Las brasas. | La abuela | «El agua subía y Treng Treng levantaba el cerro. Los que el agua alcanzó no murieron: se volvieron peces y rocas.» |
| 5 | La abuela se pone una mano sobre la cabeza, como un plato. | La abuela | «Tanto subió el cerro que casi tocaba el sol. La gente se tapaba la cabeza con sus platos de madera para no quemarse.» |
| 6 | La ronda completa: los de la aldea y los de la costa, mezclados. | La abuela | «Hasta que Kai Kai se cansó y el agua bajó. De los de la cima venimos todos: los del cerro y los del mar.» |

Después:

> **LIKAN:** «¿Entonces los peces son parientes?»
> **LA ABUELA:** «Por eso se les pide permiso antes de sacarlos, niño.»

*(El motivo del enojo, la gente convertida en peces y los platos sobre la cabeza: por confirmar.)*

### G — Ñamku: «La memoria de los incas»

Siempre la última. Cuando el jugador ha escuchado dos historias, el fuego baja, Ayelén se duerme contra la abuela y Ñamku levanta un dedo.

Antes de la escena:

> **ÑAMKU:** «Ya se rieron bastante. Ahora una que no es cuento. Esto pasó. Me lo contó mi padre, que fue y lo vio.»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | La cara de Ñamku con el fuego bajo, el dedo en alto. Al fondo, Ayelén dormida. | Ñamku | «Yo era un niño chico cuando llegó el aviso, de werkén en werkén: por el norte viene bajando gente que nadie invitó.» |
| 2 | Hacia el norte: el sendero que se pierde en el bosque oscuro, bajo las estrellas. | Ñamku | «Eran los hombres del inca. Un solo jefe para todos, lejos, en una ciudad de piedra. Lo llamaban hijo del sol.» |
| 3 | Las manos de Ñamku sacan de debajo del makuñ su colgante de cobre. Brilla con el fuego. | Ñamku | «Traían caminos, y animales cargados, y metal que brillaba así. Y unos cordeles con nudos, para contar a la gente como se cuentan los weke.» |
| 4 | Curiñancu, serio. Antü, que escucha sin moverse. | Ñamku | «No venían a pelear, decían. Venían a ordenar. Cada pueblo les daba su trabajo, su comida, sus hijos. Así habían bajado medio mundo.» |
| 5 | El fuego, las brasas. | Ñamku | «Mi padre fue de los que caminaron al norte, muchos días, a mirar quiénes eran. No a pelear: a mirar.» |
| 6 | Leftraru escucha con la cabeza inclinada hacia un lado, como un ave. | Ñamku | «Vio cómo caminaban, cuándo comían, dónde iba el que mandaba. Y vio a la gente de allá juntarse para hacerles frente.» |
| 7 | Las caras de los hombres junto al fuego: Curiñancu, Mañke, Antü. | Ñamku | «Allá nadie mandaba sobre todos, igual que aquí. Pero esa vez los lof eligieron a uno, un toki, para mandar mientras durara la pelea.» |
| 8 | Desde arriba: la ronda del fogón, muy chica, bajo una noche enorme. | Ñamku | «Pelearon junto a un río grande, muchos días. Los del inca no pasaron de ese río. Más al sur no mandaron nunca.» |
| 9 | Ñamku pone el colgante en la mano de Leftraru. | Ñamku | «Esto lo trajo mi padre de allá. Pesa poco. Por cosas así, y por mandar, hay gente que camina hasta el fin del mundo.» |
| 10 | Ñamku, de cerca, otra vez con el dedo en alto. | Ñamku | «Te lo cuento para que no se pierda: ya una vez vinieron extraños a mandar. El que vino una vez, conoce el camino.» |

Después, de vuelta en el juego:

> **LEFTRARU:** «¿Y si vuelven?»
> **ÑAMKU:** «Si viene gente así otra vez, alguien tendrá que mirarla bien. Antes de salirle al camino.»
> **LA ABUELA:** «Ya, viejo. Guarda eso, que esta noche es para recibir, no para temer.»
> **ÑAMKU:** «Recibir, sí. Pero con los ojos abiertos. …Quédatelo, niño. Yo ya me acuerdo sin él.»

Entre la segunda y la tercera línea conviene un silencio: nadie habla y el fuego truena una vez.

Deja la ficha *Toki*, la ficha *La memoria del norte* si no la tenía, y **el colgante de cobre** en la bolsa.

**Por qué funciona como presagio.** Ñamku repite la frase con que abrió la misión 4 («alguien tendrá que salir a recibirlos»), pero dada vuelta: a esa otra gente habrá que *mirarla* antes de salirle al camino. Y cuenta que su propio padre fue enviado a mirar a los hombres del inca antes de que nadie peleara. El jugador sabe quién será ese «alguien». Nadie más lo dice, ni aquí ni en el resto del acto.

**Cuidado con la historia.** Esta versión sigue lo que encontró la revisión cultural (`docs/revision-cultural.md`): a los incas les hizo frente la gente de más al norte, junto a un río grande, y al sur no mandaron nunca. Por eso aquí el padre de Ñamku no pelea: va a mirar y vuelve a contar. De día, en el juego, Ñamku todavía dice «los detuvimos»; si esa frase se corrige, queda igual que esta. *(Por confirmar: que gente de Nahuelbuta haya ido a mirar es memoria de familia, ficticia; la fecha y el lugar de esa batalla se discuten.)*

## El cierre de la noche

Terminada la historia de Ñamku se oye a Curiñancu, sin detener el juego: **«Leftraru. Ven a mirar.»** La estrella pasa a él.

> **CURIÑANCU:** «Mira hacia el cerro. Encima, donde el cielo está más negro. Dime qué ves.»

Solo si el jugador no escuchó «El río del cielo», Curiñancu agrega antes:

> **CURIÑANCU:** «Hay un puñado de estrellas que se esconde antes del invierno. Cuando vuelve a asomar antes del alba, el sol también vuelve.»

Aparece la opción **«Mirar hacia el cerro»**. La cámara se acerca a la silueta del Treng Treng: justo encima, muy chicas y apretadas, brillan unas estrellas que antes no estaban. Queda la ficha *Ngaw*.

> **LEFTRARU:** «Un montón de estrellas chicas, juntas. Recién asomaron.»
> **CURIÑANCU:** «Eso es. Volvieron. Detrás de ellas viene el sol.»
> **CURIÑANCU:** «¡Ya asomaron! ¡Al río!»

Misión cumplida.

## Lo que dicen los demás esta noche

- **La abuela**, ya escuchadas sus dos historias: «Esas ya te las conté, y te las conté bien. Anda a escuchar a otro.»
- **Küyen**, ya escuchada: «¿Otra? Pídesela a tu abuela. Yo ya gasté la mía… y me la corrigieron.»
- **Antü**, ya escuchado: «Lo que me confiaron ya te lo di. Ahora es tuyo.»
- **La machi**, ya escuchada: «Ya te dije lo que pasa esta noche. Ahora siéntelo.»
- **Curiñancu**, después de mostrar el cielo: «Mira hacia el cerro de vez en cuando.»
- **Ñamku**, después de su historia: «Ya está dicho. Ahora no lo sueltes.»
- **Millaray**: «No me hables, que estoy contando hilos. …Come algo. Hay cochayuyo cocido y está bueno, aunque no lo parezca.»
- **Mañke**: «Yo no sé contar. Sé cargar y sé comer. Tus piñones están buenos, sobrino.»
- **Likan**, despierto: «¿Cuál te gustó más? A mí la del zorro. No: la de las ballenas. No: la del zorro.»
- **Rayen**: «No me voy a dormir. Tú te duermes primero.»
- **Ayelén**, despierta: «¿Cuánto falta para que vuelva el sol? ¿Y ahora? ¿Y ahora?»
- **Ayelén**, dormida (mensaje de arriba): «Ayelén se durmió sentada. Nadie la despierta todavía.»

---

# Misión 6 — We Tripantu

## Para qué sirve

Es el cierre. Toda la aldea baja al río antes del alba y recibe el año nuevo en el agua. No hay nada que resolver: la misión es corta, casi una ceremonia, y termina con la frase que le da su peso a todo el acto.

**Qué cambia en Leftraru:** nada nuevo, y por eso funciona. Todo lo que aprendió aparece junto: despierta y lleva de la mano a su hermana (cuidar), saluda al agua (pedir antes de entrar), y es él quien avisa cuando asoma el sol (mirar). Al niño que «se quedaba mirando pájaros», su padre le pide que mire por todos.

## Cómo se abre

Con el grito de Curiñancu que cierra la misión 5: «¡Ya asomaron! ¡Al río!». Lo había anunciado Millaray el primer día: «Cuando vuelva el sol, bajaremos todos al río antes del alba. Tú también, aunque el agua esté helada».

### Escena «Antes del alba»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | El fogón, ya en brasas. La gente se pone de pie; algunos encienden ramas en el fuego para alumbrar el camino. | Relato | «Falta poco para el alba. Es la hora más fría y más oscura. Toda la aldea se pone de pie.» |
| 2 | Ayelén dormida en el suelo, tapada con la manta de la abuela. Millaray, de pie a su lado, mira a Leftraru. | Millaray | «Leftraru, despierta a tu hermana. Nadie se queda sin recibir el año.» |

## Los pasos

| Etapa | Qué hace el jugador | Dónde | Con quién | Qué queda marcado |
|---|---|---|---|---|
| 0 | Despierta a Ayelén. Ella lo toma de la mano y lo sigue. | Junto al fogón | Ayelén | Etapa 1 |
| 1 | Baja con todos por el sendero del sur hasta la poza. La aldea camina en fila, con ramas encendidas; Leftraru va en medio. | Sendero del sur, del fogón a la poza del río | Todos | Al llegar a la orilla: etapa 2 |
| 2 | **Saluda al río** antes de entrar. (Opcional: observa el agua oscura de la poza.) | Orilla norte de la poza | La machi, Likan | Etapa 3 |
| 3 | **Entra al agua** con los demás. Cuando el agua le llega a las rodillas corre la escena «El baño». | La poza | Todos | Etapa 4 |
| 4 | **Observa** hacia el volcán y avisa cuando la primera luz toca la cima. Corre la escena final. | Dentro del agua, mirando al oriente | Curiñancu | Misión y acto cumplidos (etapa 5) |

Nadie queda atrás: si Leftraru se demora, la fila lo espera en el sendero.

## Avisos, pasos y guía

| Etapa | Aviso (arriba) | Paso (en la lista) | La guía apunta a |
|---|---|---|---|
| 0 | Nueva misión: We Tripantu. Despierta a Ayelén, junto al fogón: nadie se queda sin recibir el año. | Despierta a Ayelén | Ayelén |
| 1 | Baja con tu gente por el sendero del sur hasta la poza del río. No hay apuro: nadie se queda atrás. | Baja con todos a la poza del río | La poza del río |
| 2 | El río tiene dueño. En la orilla, pulsa {accion} para saludarlo antes de entrar. | Saluda al río | La orilla de la poza |
| 3 | Entra al agua con los demás. | Entra al agua | El centro de la poza |
| 4 | Mira hacia el volcán, al oriente, y pulsa {observar}. Avisa cuando asome el sol. | Mira hacia el volcán y avisa | Sin guía: ya está ahí |

**Texto largo de la misión:**

- 0: «Asomaron las estrellas que anuncian el año. Toda la aldea baja al río antes del alba. Despierta a tu hermana, que se durmió junto al fogón.»
- 1: «Baja con todos por el sendero del sur hasta la poza del río. Ayelén va de tu mano.»
- 2 y 3: «El río tiene dueño: salúdalo antes de entrar, y después entra al agua con tu gente.»
- 4: «Tu padre te pidió que avises cuando asome el sol. Mira hacia el volcán.»

**Quién da la misión:** toda la aldea. **Puntos sugeridos:** 60.

## Diálogos

### Etapa 0 — Despertar a Ayelén

> **AYELÉN:** «…¿Ya volvió el sol?»
> **LEFTRARU:** «Todavía no. Vamos a buscarlo al río.»
> **AYELÉN:** «¿Está en el río?»
> **LEFTRARU:** «Ahí lo vamos a ver llegar. Dame la mano.»
> **AYELÉN:** «El agua va a estar helada.»
> **LEFTRARU:** «Sí.»
> **AYELÉN:** «…Bueno.»

### Etapa 1 — La bajada

Todo se ve azul oscuro; las ramas encendidas hacen una fila de luces por el sendero. **Lo que se dice al pasar:**

- Al salir de la aldea. **LA ABUELA:** «Por este sendero me bajaba mi abuela de la mano. Estaba igual de oscuro, y yo igual de dormida.»
- A medio camino. **RAYEN:** «El último en meterse al agua carga la leña todo el invierno.» / **LIKAN:** «En mi casa nos metemos al mar. El mar es más frío.» / **RAYEN:** «Mentira.»
- Más abajo. **ÑAMKU:** «Ochenta inviernos bajando a este río. Dicen que esta noche el agua se entibia. No les crean.»
- Cuando ya se oye el agua. **LA MACHI:** «Despacio ahora, y sin gritar. Llegamos a casa ajena.»

Si el jugador conversa con alguien en el camino:

- **Millaray:** «Camina, hijo. Lo que traigo bajo el brazo te lo paso después del agua, no antes.»
- **Curiñancu:** «Sin correr. Hoy bajamos todos juntos.»
- **Antü:** «A esta hora mi gente está entrando al mar. Mañana les llevo cómo fue aquí.»
- **Küyen:** «Hacía muchos inviernos que no bajaba a esta poza. Del frío sí me acordaba.»
- **Mañke:** «Dos días caminando para meterme a un río helado. Tu tía me debe una.»

### Etapa 2 — El saludo al río

La gente se ordena en la orilla. La machi se adelanta con su kultrún y toca despacio. Al pulsar {accion}, Leftraru dice (arriba, como cuando saluda al bosque):

*«Mari mari. Soy Leftraru, hijo de Curiñancu. Venimos todos a recibir el año. Pedimos permiso para entrar.»*

> **LIKAN:** «¿Ves? Aquí también se saluda.»

**Opcional — lo que solo ve Leftraru.** Mientras los demás se preparan, en la orilla aparece **«Observar el agua»**. La cámara se acerca a la poza, negra y quieta. En el centro se abre un círculo de ondas, sin que nadie haya tirado una piedra, y por un momento algo largo y oscuro se mece bajo la superficie, como pelo o como algas. Después, nada. Arriba: *«Algo se movió en lo hondo. O fue el reflejo del fuego. Leftraru no se lo contó a nadie.»* La foto de la ficha *Shumpall* se cambia por esta.

### Etapa 3 — Escena «El baño»

Corre cuando Leftraru entra al agua.

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | Desde el río: la fila de gente entrando al agua oscura. Las ramas encendidas quedaron clavadas en la orilla. Neblina baja sobre la poza. | Relato | «El agua corta como piedra. Nadie se queda afuera: ni los viejos, ni los invitados, ni los niños.» |
| 2 | Rayen se hunde entera y sale gritando. Likan, con el agua a los tobillos, duda. Ayelén chilla. | Rayen | «¡Primera! ¡Likan carga la leña!» |
| 3 | La abuela se echa agua en la cabeza con las dos manos. Küyen, a su lado, hace lo mismo. | La abuela | «Que se vaya lo viejo con el agua. Lo enfermo, lo triste, lo que pesó este año. Que se vaya.» |
| 4 | Curiñancu y Leftraru, con el agua a la cintura, mirando al oriente. El cielo es azul oscuro, con un borde más claro. | Curiñancu | «Hijo. Tú ves antes que todos. Mira hacia el volcán y avisa cuando asome.» |

### Etapa 4 — El aviso

De vuelta en el juego, Leftraru está en el agua mirando al oriente. Al pulsar {observar}, la cámara se acerca al volcán: la nieve de la cima pasa de gris a rosada, y de rosada a oro. La luz toca la punta antes de que se vea el sol.

> **LEFTRARU:** «¡Ya viene! ¡Tocó la punta del volcán!»

### Escena final «El regreso del sol»

| Plano | Qué se ve | Quién habla | Qué dice |
|---|---|---|---|
| 1 | El volcán: la luz baja por la nieve; el humo de la cima se pone rosado. | Todos | «¡Wiñoy tripantu! ¡Akuy we tripantu!» |
| 2 | El sol aparece sobre el cordón de cerros. Los rayos llegan al agua. La gente levanta la cara; sale vapor de los cuerpos mojados. En la orilla suena el kultrún. | La machi | «Volvió. Y otra vez nos encontró despiertos.» |
| 3 | En la orilla, Millaray envuelve a Leftraru, que tirita, en una manta nueva. | Millaray | «Ven acá, que estás morado. Toma: la terminé anoche, mientras ustedes hablaban.» |
| 4 | La manta de cerca, con sus franjas. Millaray le acomoda el borde. | Millaray | Si le llevó el michay: «El amarillo es el de tu michay. Llevas el monte entero encima.» — Si no: «Le falta el amarillo. Tú me traes la raíz y yo se lo pongo.» |
| 5 | Curiñancu le pone una mano en el hombro. Mira hacia el cerro; después a su hijo. | Curiñancu | «Tú lo viste y todos lo supimos. Así se cuida a la gente.» |
| 6 | La cámara vuela con el traro, que cruza sobre el río con las alas abiertas. | Relato | «El traro cruzó el cielo sobre el río, sin apuro, mirándolo todo.» |
| 7 | La cámara se levanta desde la poza: la gente queda chica en la orilla; más allá, el humo de las rukas, el bosque, el cerro. | Relato | «Abajo quedaron el humo de las rukas, el bosque de pewenes, el cerro que salva. El mundo estaba entero.» |
| 8 | Más arriba todavía: el valle completo, con el mar como una línea al poniente y el volcán al oriente. La imagen se queda quieta. | Texto al centro de la pantalla | **«Fue el último We Tripantu que Leftraru pasó en su casa.»** |
| 9 | Negro. | Texto al centro | «Fin del Acto I» |

Las frases del plano 5 y del plano 3 cierran lo que quedó abierto antes: Curiñancu responde a lo que dijo en la cima («el que va a cuidar a su gente tiene que aprender a mirar así»), y la manta es la que Millaray tejía desde la primera conversación («la noche más larga se pasa mejor abrigado»).

### Después del final

El juego vuelve a la mañana, con Leftraru en la orilla y la manta puesta. Un último aviso: «Terminaste el Acto I. Puedes seguir recorriendo el valle y completar tus encargos». Los invitados siguen en la aldea ese día, y cada persona tiene una frase de despedida:

- **Curiñancu:** «Hoy descansa. Mañana el bosque sigue ahí.»
- **Millaray:** «No la arrastres por el barro, que me costó tres lunas.»
- **La abuela:** «Otro año más. Y tú más alto. Ven, siéntate un rato conmigo.»
- **Ñamku:** «¿Todavía lo tienes? Bien. No lo sueltes.»
- **La machi:** «¿Soñaste algo? …Cuando sueñes, vienes.»
- **Rayen:** «Hoy hay palin con los de la costa. Tú miras. Yo gano.»
- **Likan:** «Cuando vayas a mi casa te muestro el mar. Es como el río, pero no se acaba.»
- **Antü:** «Lo que vi aquí lo llevo de vuelta tal como fue.»
- **Küyen:** «La próxima vez vienes tú a la costa, sobrino. Ya sabes el camino.»
- **Mañke:** «Me llevo piñones. Mi espalda los va a odiar, y yo no.»
- **Ayelén:** «¿Cuándo es el otro We Tripantu? ¿Falta mucho? ¿Y ahora?»

---

# Fichas nuevas para el cuaderno

Son catorce. Como las demás, cada una guarda la foto del momento en que se descubre.

## Personas

| Título | Subtítulo | Pista | Texto | Se obtiene |
|---|---|---|---|---|
| **Antü** | Werkén de la costa | Viene adelante, por el camino de la costa. | Mensajero de la gente del lafken. Su nombre significa «sol». Camina días enteros llevando la palabra de su comunidad, y la repite tal como se la confiaron, sin quitar ni poner. Habla poco y nunca dice más de lo que sabe. | Al saludarlo (misión 4) |
| **Küyen** | Tu tía de la costa | Viene con los invitados. | Hermana menor de Curiñancu e hija de la abuela. Su nombre significa «luna». Se fue a vivir a la costa cuando se casó, y vuelve al valle para recibir el año con los suyos. Tiene el humor de su madre y la mirada de su hermano. | Al llegar a la aldea (misión 4) |
| **Mañke** | Tu tío, hombre de mar | Es el que trae la carga más grande. | Marido de Küyen. Su nombre significa «cóndor». Vive de lo que el mar entrega y lo sube al cerro a la espalda, dos días de camino, para cambiarlo por piñones. Dice que no sabe contar historias; sabe hacer reír. | Al llegar a la aldea (misión 4) |
| **Likan** | Tu primo | Viene con los invitados. No para de hablar. | Tiene nueve años y nunca había salido de la playa. Todo lo que ve lo compara con su casa. Conoce las historias del mar y regala conchas a quien lo escucha. | Al llegar a la aldea (misión 4) |

## Vida y cultura

| Título | Subtítulo | Pista | Texto | Se obtiene |
|---|---|---|---|---|
| **Werkén** | El mensajero | Mira el camino de la costa desde la loma. | El werkén lleva la palabra de su comunidad a otras: invitaciones, avisos, acuerdos. Como no hay escritura, aprende el mensaje de memoria y lo entrega tal como se lo confiaron. Camina días enteros y se le recibe bien en todas partes: tratar mal a un mensajero es tratar mal a quien lo envía. | Al observar el camino (misión 4) |
| **Pentukun** | El saludo largo | Ñamku sabe cómo se recibe a una visita. | Saludar no es solo decir mari mari. Al encontrarse, cada uno dice quién es y de dónde viene, y pregunta por la familia del otro, por su salud y por el camino. Se escucha la respuesta entera, sin apurar. Recién después se habla de lo demás. Quien saluda bien muestra que fue bien criado. | Al saludar a Antü (misión 4) |
| **Trafkintu** | Lo que va y lo que viene | Mira lo que los invitados dejaron junto al fogón. | La gente del mar y la gente del cerro no tienen lo mismo, y por eso se visitan. De la costa suben cochayuyo, pescado y mariscos secos, sal y conchas; del cerro bajan piñones, lana y madera. No es una venta: cada uno da de lo que tiene y el otro responde. Así nadie pasa hambre y los parientes no se pierden de vista. | Al llegar a la aldea, o al observar los regalos |
| **Toki** | El que manda mientras dura la pelea | Ñamku lo cuenta la noche más larga. | En tiempos de paz, cada lof sigue a su lonko y nadie manda sobre todos. Cuando llega una amenaza grande, las comunidades se reúnen y eligen a un toki: alguien que dirige a todos mientras dure la pelea. Cuando termina, el toki vuelve a su casa y cada comunidad a la suya. | Al escuchar a Ñamku (misión 5) |

## Árboles y plantas

| Título | Subtítulo | Pista | Texto | Se obtiene |
|---|---|---|---|---|
| **Cochayuyo** | Kollof · Durvillaea antarctica | Lo traen los de la costa, en atados. | Alga grande y carnosa que crece pegada a las rocas, donde revienta el mar. La gente de la costa la corta, la seca al sol y la amarra en atados que duran meses y aguantan cualquier viaje. Remojada y cocida se come en guisos. Para quien vive lejos del mar, es probar un lugar que nunca ha visto. | Al observar los atados junto al fogón |

## Mitología y memoria

| Título | Subtítulo | Pista | Texto | Se obtiene |
|---|---|---|---|---|
| **Shumpall** | El dueño del agua | Tu primo de la costa sabe de él. | Espíritu que vive en el agua y es su dueño: en el mar, en los lagos y en lo hondo de los ríos. Se cuenta que una vez se llevó a una muchacha para casarse con ella, y que pagó a su familia dejando la orilla llena de peces y mariscos. Por eso la gente de la costa pide permiso antes de sacar algo del mar, y nadie entra al agua sin saludar. | Al escuchar a Likan (misión 4) |
| **Epew** | Los cuentos que se narran junto al fuego | Pídele uno a tu tía, la noche más larga. | Cuentos que se narran junto al fuego. En muchos, los animales hablan y se portan como personas: el zorro casi siempre se pasa de listo y termina mal; los chicos, como la perdiz, ganan con paciencia. Hacen reír y de paso enseñan cómo portarse. Se cuentan siempre con las mismas palabras: los mayores corrigen al que cambia una. | Al escuchar a Küyen (misión 5) |
| **La isla del poniente** | Adonde van los que mueren | El werkén la ha visto desde su playa. | Frente a la costa hay una isla que se ve en los días claros. Se cuenta que hacia allá viajan las almas de los muertos, y que al atardecer cuatro ancianas se convierten en ballenas para llevarlas sobre el lomo. Por eso a quien muere se le dejan cuentas de piedra: para pagar el viaje. | Al escuchar a Antü (misión 5) |
| **Wenu Lewfü** | El río del cielo | De noche, lejos del fuego, mira hacia arriba. | La franja blanca que cruza el cielo en las noches despejadas es el río del cielo. Los mayores saben leer lo que hay arriba: por las estrellas se sabe cuándo sembrar, cuándo cosechar y cuándo cambia el año. | Al mirar el cielo con Curiñancu (misión 5) |
| **Ngaw** | Las estrellas que anuncian el año | Asoman sobre el cerro, justo antes del alba. | Un puñado de estrellas pequeñas y apretadas. Desaparece del cielo antes del invierno y vuelve a asomar por el oriente, poco antes del amanecer, en los días de la noche más larga. Cuando se las ve de nuevo, el sol empieza a volver: es la señal de que el año cambió. | Al mirar hacia el cerro (cierre de la misión 5) |

**Dos objetos nuevos para la bolsa:** *una concha de la costa* (regalo de Likan) y *el colgante de cobre* (regalo de Ñamku). No se usan para nada: se guardan.

**Fichas que ya existen y se completan aquí:** *El regalo del pewen*, *Treng Treng y Kai Kai*, *We Tripantu* y *La memoria del norte* se entregan en la noche si el jugador no las tenía. Con esto quedan cinco de las siete «historias» que pide `acto-1.md`; el chucao y las luces siguen reservadas para encargos futuros.

---

# Lo que hay que construir

Dicho en simple, de lo imprescindible a lo deseable.

## Base común (sin esto no parte ninguna de las tres)

1. **Sacar el «próximamente»** de las misiones 4, 5 y 6 y darles etapas, avisos y pasos como a las tres primeras.
2. **Gente que aparece y cambia de lugar según la etapa.** Hoy cada persona tiene un solo lugar. Hace falta poder decir «desde esta etapa, tal persona está aquí».
3. **Los cuatro invitados con nombre**, hechos con las mismas figuras que ya existen (cambian la altura y los colores), con quienes se pueda conversar y que queden en el cuaderno.
4. **Conversaciones a varias voces**, incluida la de Leftraru. Hoy cada conversación la dice una sola persona.
5. **Los momentos del día**: tarde, noche, antes del alba y amanecer. Hoy el juego tiene una sola luz, la de la mañana.
6. **Retirar dos textos viejos**: el aviso «Hasta aquí llega la historia por ahora» y el cartel «Fin del prototipo».

## Misión 4

**Imprescindible**

1. Que **Rayen vaya adelante** por el camino y espere, como hace el padre en el cerro.
2. Un **punto para observar el camino** desde la loma, con acercamiento de cámara, como cuando se mira un ave.
3. Que **el grupo siga a Leftraru** en fila, a paso lento, y lo espere si se adelanta. Es lo contrario de lo que hace el padre.
4. El **descanso** a medio camino y la conversación con Likan.
5. Las **tres escenas**: «La víspera», «El encuentro» y «La llegada».
6. Las fichas nuevas de esta misión.

**Deseable**

7. La **carga**: atados de cochayuyo a la espalda, el canasto de Küyen, la bolsa de Likan.
8. Los **regalos junto al fogón** (cochayuyo, sartas de pescado seco, canasto de piñones), que se puedan observar.
9. La **luz de la tarde** que va bajando hasta la puesta de sol.
10. La **concha** en la bolsa.
11. La segunda familia de la costa, sin nombre, con un weke cargado.

## Misión 5

**Imprescindible**

1. **La noche**: cielo oscuro con estrellas, casi sin luz, y el fogón alumbrando las caras.
2. **Todos reunidos alrededor del fogón**, cada uno en su lugar.
3. **La leñera** y la acción de tomar y dejar una brazada de leña.
4. Las **cuatro historias del núcleo** como escenas: la abuela, Küyen, Antü y Ñamku.
5. **Llevar la cuenta** de las historias escuchadas, y que Ñamku hable solo después de dos.
6. El **cierre**: mirar las estrellas sobre el cerro.

**Deseable**

7. **Gente sentada** y Ayelén acostada. Hoy solo Leftraru sabe sentarse.
8. Las **historias restantes**: la machi, el cielo con Curiñancu, «Lo que vio Leftraru» y Treng Treng completa.
9. Que **la noche avance** con cada historia: el fuego baja, las estrellas se corren, los niños se duermen.
10. La **franja blanca del cielo** para la escena con Curiñancu.
11. **Sonidos de noche**: el fuego, el río a lo lejos, el silbido del chuncho.
12. El **límite suave** que impide alejarse de la aldea.
13. El **colgante de cobre** en la bolsa.

## Misión 6

**Imprescindible**

1. **La luz de antes del alba y el amanecer** sobre el volcán. Bastan tres momentos: azul oscuro, primera luz en la cima y sol afuera.
2. **Toda la aldea caminando al río** por el sendero del sur, y Ayelén siguiendo a Leftraru.
3. El **saludo al río** (igual que el saludo a los lugares con dueño, que ya existe).
4. **Gente dentro del agua**, hasta la cintura.
5. El **punto para observar el volcán** desde el agua.
6. La **escena final**, con la frase de cierre al centro de la pantalla y «Fin del Acto I».
7. La **vuelta al juego de día** después del final.

**Deseable**

8. **Ramas encendidas** en la bajada y clavadas en la orilla.
9. **La manta nueva** puesta sobre Leftraru (un cambio de colores en su poncho).
10. El **kultrún** de la machi y el grito de todos.
11. **Lo que se mueve en la poza**: las ondas y la sombra bajo el agua.
12. **Vapor** del aliento y de los cuerpos, y neblina sobre el agua (la neblina del río ya existe).
13. Las **frases de despedida** y el palin con los de la costa para el día después.

## Orden sugerido

Primero los momentos del día y la gente que cambia de lugar, porque los necesitan las tres. Después la misión 4 completa; luego la 6, que es corta y deja el acto cerrado; y al final la 5, empezando por el núcleo y agregando historias de a una.

---

# Por confirmar

Todo esto conviene revisarlo con alguien que conozca la cultura mapuche antes de darlo por bueno.

1. **Nombres nuevos:** Küyen, Mañke y Likan, y sus significados.
2. **La familia:** que la hermana del lonko viva en la costa porque al casarse se fue a la comunidad de su marido. No usé palabras de parentesco en mapudungun.
3. **El saludo:** el nombre *pentukun*, el orden de las preguntas y que lo pueda hacer un niño en nombre de su padre.
4. **El werkén:** que camine adelante del grupo y lleve una rama de canelo como señal de paz.
5. **Lo que traen:** cochayuyo, luche, pescado y mariscos secos, sal y conchas; el nombre *trafkintu* para el intercambio; el weke como animal de carga.
6. **El Shumpall:** cómo se ve, la historia de la muchacha y del pago por la novia, y cómo se escribe.
7. **La isla del poniente:** la isla, las ancianas que se vuelven ballenas y el pago con cuentas de piedra. Es lo más delicado del guion.
8. **El regalo del pewen** y **Treng Treng completa:** las versiones, el motivo del enojo de Kai Kai, la gente convertida en peces y los platos sobre la cabeza.
9. **El epew del zorro y la perdiz:** la versión, y la corrección de la abuela, que es invento nuestro.
10. **Lo que dice la machi:** la savia que sube, el agua que cambia, los sueños de esa noche.
11. **El cielo:** el nombre *Wenu Lewfü* para la franja blanca y *Ngaw* para el puñado de estrellas que anuncia el año.
12. **La memoria de los incas:** la batalla junto a un río grande, que gente de Nahuelbuta haya ido a mirar, la elección de un toki, los cordeles con nudos y el colgante de cobre.
13. **El río:** esperar al sol despiertos «para que encuentre el camino», el saludo al agua, las palabras de la abuela, el dicho de que esa noche el agua se entibia, el grito «¡Wiñoy tripantu! ¡Akuy we tripantu!», el kultrún en la orilla y las ramas encendidas.
14. **La época:** evité todo lo que llegó después: gallos, cuernos de vacuno, trigo. La comida de la noche es piñones, papas, maíz, cochayuyo y pescado seco.

**Cruce con la revisión cultural.** Mientras escribía, otra sesión avanzaba `docs/revision-cultural.md` (todavía incompleta). Lo que ya dice y toca este guion:

- **Respalda** dos apoyos de la noche: que la víspera se cuentan epew junto al fuego, y que la fecha se fijaba mirando un grupo de estrellas antes del alba.
- **Advierte** que nadie dejó escrito cómo se celebraba en 1545: las misiones 5 y 6 son una reconstrucción a partir de cómo se celebra hoy. Recomienda conversarlo con personas mapuche antes de construirlas.
- **Corrige** la memoria de los incas; la historia de Ñamku ya sigue esa corrección.
- **Propone** escribir *werken*, *longko* y *kultrung* en vez de *werkén*, *lonko* y *kultrún*. Aquí usé la escritura que el juego tiene hoy; si cambia la regla, cambia también en este guion.

---

# Decisiones que tomé por mi cuenta

Para que el dueño las apruebe o las cambie:

1. **Pasan tres días entre la misión 3 y la 4**, con una escena corta. Así Ñamku aparece «ya sano» y la misión 4 ocurre la víspera.
2. **Los invitados son familia.** Küyen es hermana de Curiñancu e hija de la abuela. Le da peso a la llegada y explica por qué Millaray los llama «parientes».
3. **Leftraru habla.** Hasta ahora nunca decía nada en las conversaciones. Aquí dice pocas líneas, cortas, desde el saludo al werkén.
4. **En la misión 4 es él quien guía** y los invitados lo siguen: lo contrario de la subida al cerro.
5. **El Shumpall se cuenta en un descanso del camino** y vuelve en el río, donde Leftraru puede ver algo en el agua que nadie más ve.
6. **Un mandado antes de la noche:** traer tres brazadas de leña. Se puede bajar a una o quitar.
7. **Ñamku habla siempre al final**, después de dos historias a elección. Así el presagio queda como clímax y el jugador no se lo puede saltar.
8. **Ocho historias en la noche, cuatro imprescindibles.** Agregué las de Küyen, Antü, la machi y Curiñancu, y una en que Leftraru cuenta lo que descubrió el jugador.
9. **La abuela cuenta dos:** *El regalo del pewen*, como dice el guion del acto, y *Treng Treng completa*, porque en el juego ya lo promete.
10. **Tres regalos que Leftraru se lleva:** la concha de Likan, el colgante de cobre de Ñamku y la manta de su madre. Pueden servir en el Acto II.
11. **Si no se hizo el encargo del michay, a la manta «le falta el amarillo».** Es un detalle triste a propósito; se puede suavizar.
12. **En el río, es Leftraru quien avisa que viene el sol.** Es el pago de todo el acto: mirar sirve a los demás.
13. **Esa noche no se puede salir de la aldea**, y los encargos quedan en pausa hasta el final.
14. **Después del final se sigue jugando**, de día, con los invitados todavía en la aldea.
15. **No usé a Nahuel**, el primo mayor que aparece en la lista de personajes pero todavía no está en el juego.
16. **Mantuve la frase de cierre tal como se pidió.** La revisión cultural sugiere otra, más prudente con las fechas: «Fue uno de los últimos inviernos que Leftraru pasó en su casa».
17. **No agregué un segundo presagio.** La revisión cultural propone que los de la costa cuenten que vieron pasar dos «casas que flotan» (barcos reales de 1544). Es buena idea, pero rompe la condición de que el único presagio sea el de Ñamku.
18. **El padre de Ñamku no peleó contra los incas: fue a mirarlos.** Sigue la corrección histórica y calza con lo propio de Leftraru.
