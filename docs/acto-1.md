# Acto I — El mundo de Leftraru

Guion de trabajo (borrador 3). Un acto de **inmersión**: Leftraru es un niño querido y curioso que recorre su aldea y su bosque. No hay españoles ni drama de "no encajar". El jugador conoce el mundo mapuche conversando, explorando y escuchando historias.

**Lugar y fecha:** tierras de Nahuelbuta, días previos al We Tripantu (año nuevo), invierno de 1545.
**Protagonista:** Leftraru ("traro veloz"), 11 años.

![Mapa del Acto I](mapa-acto-1.png)

---

## 1. Cómo funciona

- **Un mapa pequeño y abierto.** La aldea al centro; alrededor, el bosque, el cerro, el humedal y el río. Todo se alcanza caminando en pocos minutos.
- **La historia es lineal.** Las misiones principales (1 a 6) siguen la preparación del We Tripantu y van en orden: cada una se abre al terminar la anterior, y la persona con quien sigue la historia lleva una estrella dorada sobre la cabeza.
- **Los encargos son libres.** Las misiones secundarias son opcionales y no tienen orden. No están a la vista desde el comienzo: se consiguen conversando con la gente de la aldea, y cada persona encarga las suyas.
- **Cómo empieza:** la portada muestra solo el título y «Haz clic para comenzar» («Toca la pantalla» en un celular). Después aparece el menú, con «Aventura» y «Opciones». Al elegir Aventura sale la pantalla del acto («Acto 1 · El mundo de Leftraru») y, si la historia recién empieza, el prólogo: un aviso antiguo, en papel viejo, cuya tinta va apareciendo párrafo a párrafo y que cuenta dónde estamos, quién es Leftraru y qué se está preparando. Termina con su madre llamándolo.
- **Línea de guía:** se puede marcar un destino haciendo clic en el mapa, o elegir una misión (en el panel de misiones o en la lista de la izquierda) para que el mapa muestre el camino con una línea roja de trazos y un banderín en el destino. La línea sigue los senderos cuando conviene y se acorta a medida que se avanza. La guía de la misión principal se pone sola; si el jugador marca otra cosa o la quita, se respeta su decisión hasta la misión siguiente.
- **Puntos de investigación y saberes:** todo lo que se descubre y cada misión cumplida suman puntos de investigación, que no se gastan: se van juntando. Cada 1000 puntos dan un punto de saber, y cada saber cuesta uno. (Hoy el Acto I completo reparte 1485 puntos; la cifra de 1000 se cambia en `src/notes.js`, `POR_SABER`.)
- **Avisos:** las instrucciones de cómo jugar (qué tecla hace qué, y los pasos del tutorial) salen al centro de la pantalla, en letra blanca y sin recuadro; los de misiones y encargos salen arriba al centro, con letra grande; los puntos de investigación ganados salen chicos, a la izquierda, sobre el minimapa. La barra de arriba a la izquierda muestra la vida y la suma de puntos de investigación.
- **Se aprende jugando:** la primera conversación con Millaray enseña a moverse, hablar, observar (el telar), ayudar con las manos (la lana) y leer una misión. Cada paso queda escrito arriba hasta que se cumple.
- **Lo que hay que recoger se ve:** cada planta pedida lleva una hoja verde sobre un disco claro, en el mapa y flotando sobre ella en el mundo; la guía apunta a la más cercana que falte. El claro del maqui tiene sus matas al centro, donde termina el sendero.
- **La mirada:** Leftraru mira hacia donde mira la cámara: quieto, se vuelve hacia allá (la cabeza llega primero y el cuerpo la sigue de cerca, con pasitos en el lugar), así que al girar con el ratón gira él también. El minimapa gira con la cámara.
- **Conversar de cerca:** al hablar con alguien, la cámara se acerca y deja a los dos en primer plano, vistos en ángulo por sobre el hombro de Leftraru. Se vuelven el uno hacia el otro, se miran a la cara, y quien estaba trabajando deja lo suyo mientras habla. Al terminar, la cámara vuelve a su lugar, a la espalda de Leftraru.
- **La subida al Treng Treng:** el cerro es más ancho y tendido, y el sendero ya no va derecho a la cima: lo rodea por el poniente y el norte, tallado en la ladera, con una pendiente pareja de unos 13 grados (antes llegaba a 40) y unos 150 pasos de largo. Llega arriba por el oriente, donde se para Curiñancu.
- **Recolectar y preparar:** lo que alguien le enseñó a preparar se puede juntar siempre, pero de a poco (hasta tres de cada cosa). Se prepara junto al fogón, desde la bolsa. Hoy son dos cosas: el **agua de hierbas** (maqui y boldo; devuelve vida) y las **flechas** (una caña de quila y una pluma). El agua de hierbas no es un lawen: los remedios siguen siendo de la machi.
- **El arco:** se saca y se guarda desde la bolsa (botón «Equipar») o con su tecla (Q); guardado no se ve ni se puede usar, y en la mano Leftraru lo lleva en la izquierda mientras camina y corre. Manteniendo apretado el botón derecho del ratón se apunta: la cámara se pone donde van sus ojos y adelante se ven sus dos manos de cerca: la izquierda cerrada en la empuñadura, con el arco algo inclinado, y la derecha en la cuerda, que engancha con dos dedos (el índice sobre la flecha y el medio debajo), con una mira al centro. Sin soltar el derecho, manteniendo apretado el botón izquierdo el arco se tensa: la cuerda y la flecha se van hacia atrás, las puntas del arco se doblan, el lente cierra un poco y la mira se achica; en un segundo llega al máximo. Al soltar el botón sale la flecha, más rápida mientras más tenso estaba (de 15 a 58 metros por segundo), el arco da un pequeño golpe y la mano baja a buscar otra flecha y vuelve con ella a la cuerda. El botón izquierdo solo, sin estar apuntando con el derecho, no hace nada; y si se suelta el derecho con el arco tenso, Leftraru lo baja sin tirar. Un toque corto suelta una flecha floja. Si el botón se aprieta mientras la mano todavía busca otra flecha, el arco empieza a tensarse apenas puede. En una partida guardada desde antes de que el arco se pudiera guardar, el arco viene ya en la mano. La flecha vuela de verdad, cae con su peso y se clava donde pega. Cada tiro gasta una flecha de la bolsa; las clavadas se recuperan pasando a su lado. Las flechas las hace Leftraru mismo, donde esté, con una caña de quila y una pluma: con la tecla G, desde el casillero del arco o desde la bolsa (hasta doce). Al blanco de paja se le tira siempre; un pudú cae solo durante la caza de la misión 4; a las crías nunca, y la flecha no sale si hay una persona adelante. En pantallas táctiles, sin ratón, se tira con la tecla de acción y la flecha apunta sola.
- **El casillero del arco:** cuando Leftraru ya tiene el arco, abajo a la derecha, justo sobre los botones, aparecen dos casillas chicas, iguales a esos botones. La del arco lleva en la esquina las flechas que quedan y una raya de cobre cuando va en la mano (guardado, el dibujo se apaga); con un clic (o Q) se saca o se guarda. La otra hace una flecha (G); un punto rojo avisa que falta algo. Al señalarlas con el ratón sale escrito el detalle: «Arco en la mano · 5 flechas», o lo que pide la flecha (una caña de quila y una pluma) y cuántas llevas. Si se usa sin tener lo necesario, lo que falta queda marcado en el mapa y en el minimapa (las quilas y las plumas más cercanas, con una hoja flotando en el lugar) y la guía lleva a lo que esté más cerca; al recogerlo, sigue hacia lo otro.
- **Rodar:** con la tecla Control, Leftraru da una vuelta rápida por el suelo hacia donde va (o, quieto, hacia donde mira): dura siete décimas de segundo y avanza unos tres metros y medio, con su propio sonido (el golpe del cuerpo en la tierra y el roce). Al saltar suelta un grito corto, de valiente: un «¡já!» que sube y se queda arriba (los dos sonidos se fabrican por código, como los demás). Ojo: en el navegador, Control junto con W cierra la pestaña y eso no se puede evitar desde el juego, salvo en pantalla completa; la tecla se puede cambiar en Opciones.
- **La gente y los animales chocan:** quienes caminan por la aldea, los weke del corral, los pudúes y los zorros ya no atraviesan las cosas. Antes de cada paso tantean hacia adelante con una bola del ancho de su cuerpo (una consulta a la física, sin agregarles cuerpos al motor) y, si hay una ruka, un tronco, el fogón, una cerca, una roca, un arbusto, otra persona, un animal o Leftraru, buscan por qué lado pasar y lo rodean; si no hay por dónde, van a otro lugar. A más de 90 metros de Leftraru caminan como antes, sin tantear.
- **La aldea se llama Pewenko** («agua de los pewenes»; nombre puesto por nosotros, por confirmar). Tiene a la vista los oficios de todos los días: cueros estirados en bastidores, las armas (lanzas de coligüe, mazas, hondas y un arco), los instrumentos de las fiestas (trutruka, pifilkas y wadas), la piedra de moler y el lugar de la greda, con gente trabajando en cada uno, y algunos árboles entre las casas. Cueros, armas e instrumentos se observan y tienen ficha.
- **La figura tallada del bosque viejo:** a pocos pasos del árbol abuelo. Al observarla, la cámara la rodea y se cuenta lo que la familia dice de ella: la promesa de tomar solo lo necesario. No es un «tótem» (eso no existe en la cultura mapuche) ni un chemamüll, que acompaña a los muertos: es invento nuestro, contado como memoria de esta familia. Por confirmar con quien revise la cultura.
- **El refugio del bosque:** una ruka chica al final del sendero del norte, en el bosque de pewenes, con un fuego afuera. Junto a ese fuego la vida vuelve más rápido y se puede preparar lo que se sabe, igual que en el fogón.
- **Presentación de los botones:** la primera vez que se entra a jugar, una flecha señala de a uno los cinco botones de abajo a la derecha y dice para qué sirve cada uno. Sale una sola vez por navegador.
- **Lo que se hace, se ve:** en las conversaciones Leftraru da un paso y entrega lo que trae, la otra persona estira la mano, trabaja con las manos (la machi preparando, Ñamku armando las flechas), bebe o le pasa algo de vuelta; el diálogo espera mientras tanto. Los piñones se echan directo a la olla. Con la tecla de acción también hay gesto: agacharse a recoger, estirar la mano a un árbol, verter, beber, saludar con la mano en alto; lo recogido entra a la bolsa a mitad del gesto.
- **Resumen de encargos (bajo la barra de vida):** arriba van los encargos que alguien pidió y están en curso (el más reciente primero) y el que lleva la línea de guía, cada uno con una línea de lo que toca hacer ahora y cuánto se lleva. Los dos encargos de después de la misión 3 aparecen en la lista apenas termina esa misión.
- **Observar una sola vez:** las plantas y los animales ya anotados en el cuaderno no se vuelven a ofrecer para observar. Lo demás (construcciones, la figura tallada) sí se puede volver a mirar estando quieto.
- **Las aves** tienen la forma y los colores de su especie (cabeza aparte, pico, cola, patas y postura al posarse): traro, choroy, rayadito, chucao, carpintero negro, picaflor y chuncho.
- **Sin presión:** nada tiene tiempo límite ni se puede fallar. Lo que mueve al jugador es la curiosidad.
- **El mapa se va pintando:** al inicio es un pergamino casi vacío. Cada lugar visitado aparece dibujado, y los puntos de interés se marcan cuando alguien los menciona en una conversación.

**Mirar:** la acción propia de Leftraru. Al mantener un botón se queda quieto y observa. Así aprende de los animales, descubre detalles y, a veces, ve cosas que los demás no ven.

**Lo místico:** se muestra de verdad, pero solo lo ven Leftraru y el jugador, y nunca queda del todo claro si fue real. Los adultos hablan de los espíritus con naturalidad, como parte del mundo.

---

## 2. Personajes

| Personaje | Quién es | Dónde está |
|---|---|---|
| **Curiñancu** | Su padre, lonko (jefe). Tranquilo; enseña haciendo, no hablando. | Bosque de pewenes, aldea |
| **Millaray** | Su madre, tejedora. Práctica y de humor seco. | Telar, en la aldea |
| **La abuela (kuku)** | Sabe todas las historias. | Fogón; lugar de los antiguos |
| **Ayelén** | Su hermana de 6 años. Lo sigue y pregunta todo. | Lo acompaña por la aldea |
| **Rayen** | 12 años, su mejor amiga. Rápida y burlona. | Cancha, río, bosque viejo |
| **Nahuel** | Su primo mayor, 14 años. Le enseña la honda. | Cancha |
| **La machi** | Sanadora y autoridad espiritual. | Su ruka; el menoko |
| **Ñamku** | El más anciano; guarda la memoria del pueblo. | Su ruka |
| **Antü** | Werkén (mensajero) que llega con los invitados. | Camino de la costa |
| **Kürüf** | La weke (llama) joven y arisca de la familia. | Corral |

Todos son ficticios salvo Leftraru y el nombre de su padre, que viene de la tradición.

---

## 3. La historia: misiones principales

### El arco

La pregunta que mueve el capítulo es sencilla: **¿qué tiene que aprender un niño para que su gente pueda contar con él?** Leftraru parte como el que "se queda mirando pájaros" y termina siendo alguien en quien la aldea confía. Cada misión lo saca un poco más lejos de la ruka y le pide un poco más.

| Momento | Misión | Quién la da | Qué se abre con ella | Qué cambia en Leftraru |
|---|---|---|---|---|
| **Planteamiento** | 1 · Los piñones del pewen | Millaray, su madre | El bosque de pewenes | Le dan un encargo de niño y lo cumple. Aprende a pedir antes de tomar. |
| **Planteamiento** | 2 · El traro | Curiñancu, su padre | El cerro Treng Treng | Ve su mundo entero por primera vez y entiende su nombre: mirar es su fuerza. |
| **Nudo** | 3 · Las plantas de la machi | La machi | El monte soleado, el claro del maqui, el lugar de los antiguos | Por primera vez alguien depende de él: Ñamku está enfermo. Ya no es un mandado, es un cuidado. |
| **Nudo** | 4 · El arco de Ñamku | Ñamku (ya sano) | El blanco de paja y el monte de los pudúes | Aprende a hacer sus flechas y a tirar con el arco, y caza por primera vez: no para él, para la olla de todos. |
| **Nudo** | 5 · Los invitados | Ñamku (ya sano) y Rayen | El camino de la costa | El mundo es más grande que la aldea: recibe a gente de afuera en nombre de los suyos. |
| **Clímax** | 6 · La noche de las historias | La abuela | El fogón, de noche | Escucha la memoria de su pueblo, incluida la de los incas: ya una vez vinieron extraños a mandar. |
| **Cierre** | 7 · We Tripantu | Toda la aldea | La poza del río, al alba | Recibe el año nuevo con todos. El mundo está entero… por última vez. |

**Cómo se encadenan:** al entregar los piñones, Millaray lo manda con su padre; en la cima, Curiñancu le avisa que Ñamku enfermó y que la machi lo busca; al sanar, Ñamku le dice que le debe una y, ya de pie, le enseña el arco para que traiga carne a la fiesta; al recibir el pudú le anuncia que los de la costa ya vienen por el camino; los invitados traen la noche larga, y la noche termina en el río. Ninguna misión aparece antes de tiempo.

**Lo que el jugador sabe y Leftraru no:** el relato de entrada dice que al norte llegaron hombres extraños y que la historia lo llamará Lautaro. Nadie en la aldea habla de eso. Esa distancia es la que le da peso al cierre.

### 1 — Los piñones del pewen *(jugable)*
**Lugar:** la aldea y el bosque de pewenes. **Con:** Millaray.
Su madre lo llama desde el telar. Antes de mandarlo al bosque le pide dos cosas que sirven de tutorial: mirar bien el telar y alcanzarle la lana. Después viene el encargo: vienen los parientes de la costa y los piñones no alcanzan. Hay que ir al bosque del norte, recoger los que quedan (uno está sobre unas rocas) y **volver a entregárselos**. Al tomar el último, una escena breve lo muestra agradeciendo al pewen y a su madre junto al fogón, revolviendo la olla que humea. Ahí lo espera hasta que le entrega los piñones; después vuelve al telar.
**La entrega se ve entera**, en tres momentos que van entre las frases de la madre: Leftraru se para a su lado, junto a la olla, y le muestra los piñones en un canasto bajo (llepu) que sostiene con las dos manos; cuando ella dice que alcanzan, inclina el canasto y los piñones caen a la olla; y ella deja el palo en la olla y le pasa la mano por la cabeza (él cierra los ojos un momento). La cámara se pone al frente, al otro lado de la olla.
- **Enseña:** moverse, saltar, conversar, recoger.
- **Muestra:** el pewen como árbol que alimenta; la costumbre de no sacudirlo.
- **Enlace:** Millaray le dice que su padre subió al Treng Treng y preguntó por él.
> MILLARAY: Recoge los que cayeron solos: no sacudas el árbol, que él decide cuánto da.

### 2 — El traro *(jugable)*
**Lugar:** cerro Treng Treng. **Con:** Curiñancu.
Curiñancu lo lleva al cerro: va adelante por el sendero, a su paso, le cuenta cosas mientras suben y lo espera si se queda atrás. Arriba se paran juntos y, en una escena, le muestra el valle y el mar, el volcán, y le explica por qué se llama como el traro.
- **Enseña:** trepar y **mirar**.
- **Muestra:** todo su mundo desde arriba, en una escena breve.
- **Enlace:** el padre le avisa que Ñamku amaneció con fiebre y que la machi lo anda buscando.
> CURIÑANCU: El que va a cuidar a su gente tiene que aprender a mirar así: primero todo, después lo suyo.

### 3 — Las plantas de la machi *(jugable)*
**Lugar:** el rewe, el monte soleado, el claro del maqui. **Con:** la machi y Ñamku.
La machi ya no puede andar por el monte: Leftraru será sus pies. Reúne hojas de canelo, corteza de quillay y hojas de maqui, vuelve con ella y le lleva el lawen a Ñamku.
- **Enseña:** reconocer plantas y usar la tecla de acción.
- **Muestra:** que lo que sana no es solo la planta, sino que alguien fue a buscarla pensando en el enfermo.
- **Enlace:** Ñamku, ya con el remedio, le dice que le debe una y que vuelva a verlo apenas se levante.
> MACHI: Antes de cortar, pide. Di para quién es. La planta que se saca sin permiso no sana a nadie.

### 4 — El arco de Ñamku *(jugable)*
**Lugar:** la ruka de Ñamku, el blanco de paja al oriente y el monte. **Con:** Ñamku.
Antes era un encargo secundario («La primera caza»); desde el 17 de noviembre de 2026 es parte de la historia. Ñamku, ya sano, quiere pagar lo que debe enseñando: vienen los de la costa y en la olla no hay más que piñones. Leftraru junta tres cañas de quila y tres plumas, Ñamku le enseña a hacer flechas y le entrega el arco de su padre con tres flechas. Prueba la puntería dándole tres veces al atado de paja, sale tras un pudú, le agradece, lo carga y se lo lleva a Ñamku, que lo reparte.
- **Enseña:** apuntar con el botón derecho del ratón y soltar la flecha con el izquierdo; hacer flechas junto al fogón; seguir huellas sin correr.
- **Muestra:** que se caza cuando hace falta y para todos, pidiendo antes y tomando uno solo.
- **Enlace:** Ñamku le avisa que los de la costa ya deben venir por el camino y que alguien tendrá que salir a recibirlos.
- **Por confirmar:** el arco y la flecha en 1545, y que un niño de once años saliera a cazar.
> ÑAMKU: Se caza cuando hace falta, no cuando dan ganas.

### 5 — Los invitados *(por hacer)*
**Lugar:** camino de la costa. **Con:** Antü y Rayen.
Llegan familias de la costa para celebrar juntos. Leftraru y Rayen salen a recibirlos y los guían a la aldea.
- **Muestra:** que los pueblos de la costa y del cerro se visitaban e intercambiaban: ellos traen algas y pescado seco, la aldea ofrece los piñones que él mismo recogió.
- **Historia:** un niño de la costa cuenta sobre el *Shumpall*, el espíritu que vive en el agua.

### 6 — La noche de las historias *(por hacer)*
**Lugar:** el fogón. **Con:** todos.
La noche más larga del año. Nadie duerme: se come, se conversa y se cuentan historias hasta el alba. El jugador elige a quién escuchar.
- **Historias:** *el regalo del pewen* (la abuela), *la memoria de los incas* (Ñamku), y las que el jugador haya ido encontrando en sus encargos.
- **Muestra:** que la historia y el saber se pasaban hablando, de mayores a niños.

### 7 — We Tripantu *(por hacer)*
**Lugar:** el río. **Con:** toda la aldea.
Antes del alba todos bajan al río a bañarse para recibir el año nuevo. Amanece sobre el volcán. El traro cruza el cielo.
- **Cierre del acto:** la cámara se aleja sobre el bosque. El mundo está entero.

---

## 4. Encargos: misiones secundarias

Son opcionales y se pueden hacer en cualquier orden. **Aparecen en la lista cuando la persona te los encarga**: unos al conocerla, otros al volver a conversar con ella (esas personas llevan un rombo celeste). Los que ya están en el juego:

| Quién | Encargo | Qué pide |
|---|---|---|
| **Millaray** | Conoce a tu gente | Conversar con las siete personas de la aldea. |
| | Manos que ayudan | Alcanzarle la lana, traer agua a la olla y dar pasto a los weke. |
| | El amarillo de la manta | Dos raíces de michay para teñir. |
| **Curiñancu** | El bosque tiene nombres | Observar pewen, coigüe, roble, canelo y el árbol abuelo. |
| | Hojas para el curanto | Dos tallos de nalca (cuando ya conoces la planta). |
| **La abuela** | Lo que se cuenta junto al fuego | Aprender las siete historias y creencias. |
| | Junto al fuego | Sentarse un rato en los troncos del fogón. |
| | Murtilla para la kuku | Tres puñados de murtilla. |
| **Ayelén** | Los que vuelan y los que corren | Observar weke, pudú, traro, choroyes y rayaditos. A las aves se las observa posadas. |
| | Huellas chicas | Encontrar huellas de pudú y seguirlas hasta verlo. |
| **Rayen** | Los caminos del valle | Recorrer los diez lugares del territorio. |
| | A dos rayas | Jugar un palin en la cancha. |
| **La machi** | Pedir permiso | Saludar al entrar al bosque viejo, al menoko y al lugar de los antiguos. |
| | Agua de hierbas | Después de la misión 3. Llevarle hojas de maqui y de boldo; enseña a preparar el agua de hierbas. |
| | Plantas del suelo | Observar helecho, juncos, flores, maqui, quila y copihue. |
| **Ñamku** | La casa y el fuego | Observar la ruka, el fogón, el rewe, el telar y las figuras de madera. |
| | El monte soleado | Observar peumo, boldo, quillay y litre. |

### Ideas para más adelante

#### Familia
- **Kürüf** (corral). La weke joven no se deja guiar. Mirándola, Leftraru entiende qué la asusta y se gana su confianza. *Muestra: el animal doméstico de la época, antes de los caballos.*
- **El lugar de los antiguos** (al oriente). La abuela lo lleva hasta el borde del lugar donde descansan los antepasados y le habla de su abuelo. *No se entra: se mira desde lejos, con respeto.*
- **Ayelén y las escondidas** (aldea, sin marcador). Su hermana se esconde en distintos rincones; encontrarla hace recorrer toda la aldea.

#### Rayen
- **La carrera al río.** Rayen lo reta a correr hasta el agua. Gane o pierda, terminan conversando en la orilla sobre qué quieren ser de grandes.
- **El escondite** (bosque viejo). Rayen le muestra su lugar secreto: un árbol hueco enorme. Hacen una promesa.
- **La honda.** Nahuel le enseña a usarla en la cancha.

#### El bosque y lo místico
- **El canto del chucao.** Se oye un chucao en el bosque espeso. Según por qué lado cante, anuncia buena o mala suerte en el camino. Hay que encontrarlo mirando.
- **Las huellas del nawel.** Huellas grandes en el barro. Siguiéndolas, Leftraru ve por un instante al puma entre los árboles. No hay peligro: solo dos que se miran. *Nahuelbuta lleva en su nombre al gran felino.*
- **Las luces del menoko.** De noche, pequeñas luces se mueven sobre el humedal. Si las sigue, llega a un claro donde no hay nadie. La machi, al oírlo, solo sonríe.
- **El zorro.** Un zorro lo lleva por un sendero oculto. Al contarlo, la abuela responde con un *epew*: el cuento del zorro que se cree más listo que todos.

#### Memoria
- **La memoria de Ñamku** (su ruka). El anciano cuenta cómo, en tiempos de su padre, los ejércitos del inca llegaron desde el norte y no pudieron pasar. Le entrega un objeto pequeño de esa época.

---

## 5. Lo que se colecciona

Como su pueblo no usaba escritura, lo aprendido se guarda como imágenes pintadas:

- **Historias** (7): Treng Treng y Kai Kai, el regalo del pewen, el Shumpall, el epew del zorro, la memoria de los incas, el chucao, las luces.
- **Animales:** weke, pudú, zorro culpeo, monito del monte, traro, choroy, rayadito, chucao, carpintero negro, picaflor y chuncho ya están en el juego (las aves se observan posadas). Falta el puma.
- **Plantas** (6): pewen, canelo, maqui, y tres medicinales.
- **Personas:** cada personaje se completa al terminar su historia.

---

## 6. Cuidado de época

Todavía no existían aquí caballos, ovejas, trigo, hierro ni platería. Los animales domésticos son el weke y el perro; se cultiva maíz, papa y quínoa.

**Pendiente importante:** antes de cerrar el guion conviene que alguien con conocimiento de la cultura mapuche revise nombres, palabras en mapudungun, los relatos y cómo mostramos lo espiritual y los lugares sagrados. Varias costumbres las conocemos por descripciones posteriores a 1545.

---

## 7. Orden de construcción sugerido

1. Mapa ampliado con la aldea y los senderos, y el mapa en pantalla que se va pintando.
2. Sistema de conversaciones y de misiones.
3. Misiones 1 y 2 (ya hay base en el prototipo) más la secundaria A.
4. El resto, zona por zona.

## 8. Decisiones tomadas

1. **Idioma:** español con palabras en mapudungun.
2. **Última línea:** el acto termina con el texto *"Fue el último We Tripantu que Leftraru pasó en su casa."*
3. **Día y noche:** el momento del día cambia al completar misiones principales.

## 9. Interfaz

- **Minimapa** (abajo a la izquierda): el jugador al centro con una flecha que indica hacia dónde camina; los objetivos fuera de vista se marcan en el borde.
- **Notas** (abajo a la derecha, tecla N): todo lo descubierto, separado en Mitología, Personajes y Naturaleza. Cada nota es una hoja con imagen y descripción.
- **Bolsa** (abajo a la derecha, tecla B): lo que Leftraru va encontrando.

## 10. El cuerpo de Leftraru

- **De dónde sale:** un dibujo hecho en kie.ai (opción C, pintado a mano: `docs/personaje/leftraru-c.png`), pasado a 3D con Tripo y con esqueleto y movimientos de Higgsfield. Los archivos están en `public/assets/modelos/`: el modelo con el caminar (`leftraru-camina.glb`) y, aparte, archivos chicos con solo el movimiento (quieto, correr, saltar, recoger, beber), que saca `tools/glb-animacion.mjs`.
- **Es el cuerpo de siempre.** El cuerpo armado por código sigue debajo, invisible, llevando el movimiento y los choques. Si el modelo no carga se ve ese; para verlo a propósito, abrir el juego con `?antiguo` al final de la dirección.
- **Pasos:** quieto, paso y trote se mezclan según la velocidad, y cada uno va al ritmo de lo que avanza para que los pies no patinen. A la velocidad normal (3,3 m/s) va trotando: el caminar que trae el modelo es de paseo (0,6 m/s). Un trote suave hecho a medida sería otro movimiento del catálogo.
- **Quieto:** quieto quiere decir quieto. El movimiento de estar parado que trae el modelo se balancea mucho, así que se usa su postura media y casi nada de ese vaivén (un 3,5 %, y a poco más de la mitad de la velocidad): la cabeza se mueve menos de un centímetro y las manos, unos dos. Lo que se ve es una respiración leve en el pecho, el pestañeo y la cabeza cuando mira algo. La gente de la aldea, de pie, también quedó así: apenas se mece. Los demás personajes en 3D usarán la misma regla.
- **Terreno:** bajo cada pie se mira la altura del suelo; la cadera baja hasta que el pie de más abajo pisa y la otra pierna se recoge. En cuesta el cuerpo se inclina. Parado, los pies se juntan (el movimiento de estar quieto los traía como a medio paso).
- **Cara:** la cara es un dibujo, así que el pestañeo y los labios son piezas chicas pegadas a la cabeza: un párpado por ojo, que baja cada 2 a 6 segundos, y una boca oscura que se abre cuando Leftraru dice algo (los avisos entre «») y al saludar al empezar una conversación.
- **Mirada:** suelto, la cabeza sigue a la cámara; conversando, queda quieta y de frente a la cara de quien le habla.
- **Luz:** recibe el mismo sol, cielo, sombras y fogón que el resto del mundo, y da sombra.

**Parado**, además de la respiración, los brazos se mecen apenas adelante y atrás, como un péndulo lento (unos cinco centímetros en la mano), cada uno a su tiempo.

**Con el arco**, las manos se ponen a mano (sin movimiento del catálogo): al llevarlo, el brazo izquierdo lo sostiene al costado. Al apuntar, como las manos del modelo no tienen dedos que se muevan, se usan otras, hechas por código para verse de cerca (`haceManos` en `src/main.js`): la izquierda cerrada en la empuñadura forrada en cuero, con los cuatro dedos abrazándola por delante y el pulgar por detrás; la derecha con el índice y el medio enganchando la cuerda, la flecha entre los dos, y el anular y el meñique recogidos contra la palma. Cada mano es una sola malla con su antebrazo y las dos comparten material. Entran cuando la cámara ya llegó a los ojos, partiendo de donde el modelo tenía el arco. Mientras se ven, los brazos del modelo no se pintan, pero siguen ahí para la sombra, así que en el suelo se ve al arquero entero. Dónde quedan el arco y las manos en la pantalla se ajusta en `VM`. **Rodar** sí es un movimiento del catálogo (*Roll_Dodge*), del que se usa la vuelta y cuánto baja la cadera; el avance lo pone el juego.

**Los demás personajes** se harán igual: primero un boceto en kie.ai (`node tools/kie-personaje.mjs millaray`), en el mismo estilo pintado, y después el 3D. **Millaray ya está en 3D en el juego** (boceto 1, `millaray-1.png`; el modelo es `public/assets/modelos/millaray.glb`, unos 30.000 triángulos, con esqueleto y su movimiento de reposo). Va encima de su cuerpo de siempre, que queda invisible y sigue decidiendo todo: las manos del modelo van a donde están las manos de ese cuerpo, la cabeza mira hacia donde mira la otra y el tronco se inclina igual. Por eso teje, revuelve la olla (con el palo en la mano), entrega, recibe y acaricia sin haber tenido que rehacer nada. Pestañea y mueve los labios cuando habla. Teje de frente al telar, a un paso de la tela, y sin parar: las dos manos van en la urdimbre, una lleva la trama hacia el otro lado y la otra la recibe, subiendo y bajando entre los hilos, y cada tanto las dos bajan juntas para apretar lo tejido. Al conversar deja las manos quietas. (Durante un tiempo los brazos del modelo no copiaban los del cuerpo de base por un error en una línea; quedó corregido el 17 de noviembre de 2026.) Su dibujo traía luces y brillos pintados (venía de una imagen con luz de estudio); en el juego se apagan, para que la luz que se le vea sea la del lugar. Además de su reposo tiene tres movimientos del catálogo, en archivos chicos (`millaray-habla.json`, `millaray-escucha.json`, `millaray-camina.json`): mueve las manos mientras dice una frase, escucha con atención cuando calla y camina. Los dos primeros van suavizados (al 60 % y al 35 %), para que no se balancee. Después de recibir los piñones deja la olla y vuelve caminando al telar, rodeando el fogón por entre los troncos. Los otros personajes se pueden pasar a 3D con el mismo método: agregarlos a `GENTE3D` en `src/main.js`, con las medidas de sus ojos y su boca.

**Curiñancu también está en 3D** (boceto 1, `curinancu-1.png`: pelo suelto, makuñ negro con franjas rojas y blancas, collar de llanka; el modelo es `public/assets/modelos/curinancu.glb`, unos 28.700 triángulos). De Higgsfield solo se pidieron el modelo y el esqueleto con su reposo. **Los demás movimientos no se pidieron: se traspasaron** de los que ya había, con `tools/glb-traspasa.py`: hablar y escuchar son los de Millaray y caminar es el de Leftraru (`curinancu-habla.json`, `curinancu-escucha.json`, `curinancu-camina.json`). Todos los modelos traen el mismo esqueleto, pero cada uno nace con otra postura (brazos más o menos abiertos), y los movimientos guardan los giros contando desde ahí: copiados tal cual, los huesos quedan corridos hasta 17 grados. La herramienta rehace el movimiento para el otro cuerpo dejando el tronco, los brazos y las piernas apuntando hacia donde apuntan en el original, y ajusta la altura de la cadera. Probada con un movimiento que sí existe para dos personajes (el reposo de Millaray traspasado a Curiñancu contra el reposo que Higgsfield hizo para él), la diferencia es de menos de 3 grados. Así cada personaje nuevo cuesta el modelo y el esqueleto, y nada más.

**Ñamku está en 3D** de la misma forma (un solo boceto, `namku-1.png`; el modelo es `public/assets/modelos/namku.glb`, unos 29.200 triángulos; hablar, escuchar y caminar, traspasados: `namku-habla.json`, `namku-escucha.json`, `namku-camina.json`). El boceto y el modelo nacen derechos, porque el esqueleto lo necesita así; lo encorvado de la ficha se le da en el juego (`encorva` en `GENTE3D`): la parte alta de la espalda se echa adelante y la cabeza sigue mirando al frente. Sus ojos y su boca se midieron fuera del juego, sobre el modelo suelto, y solo entonces se agregó a `GENTE3D`, completo, para que no se viera a medias.

**Parada, la gente en 3D queda derecha:** los dos pies uno al lado del otro (el reposo del catálogo deja uno 20 cm delante del otro; se llevan bajo el medio de la cadera) y los brazos colgando junto al cuerpo, los dos iguales, con el codo apenas doblado. El cuerpo de base trae siempre el antebrazo un poco doblado, y eso se tomaba por «está usando las manos»: por eso a Curiñancu le quedaban los brazos adelante; ya no cuenta.

Al pedir un modelo a Tripo hay que indicar siempre el límite de caras (30.000) y sin mapas extra: sin eso llega de un millón y medio de triángulos. Y antes de pedir el esqueleto hay que girarlo con `tools/glb-gira.py`, porque llega mirando de lado.
