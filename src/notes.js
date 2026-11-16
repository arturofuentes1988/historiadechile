// El cuaderno de Leftraru: todo lo que se puede descubrir, con su descripción y sus puntos.
// Las imágenes no están aquí: son "fotos" que el juego toma del elemento real al descubrirlo.
export const CATS = {
  naturaleza: { name: 'Naturaleza', pts: 10, how: 'Acércate a plantas y animales y obsérvalos.' },
  cultura: { name: 'Vida y cultura', pts: 15, how: 'Observa las construcciones y los objetos de la aldea.' },
  lugares: { name: 'Lugares', pts: 15, how: 'Recorre el territorio.' },
  personas: { name: 'Personas', pts: 20, how: 'Conversa con la gente de la aldea.' },
  mitologia: { name: 'Mitología y memoria', pts: 25, how: 'Escucha lo que la gente tiene que contar.' },
};
export const LEVELS = [[0, 'Recién llegado'], [60, 'Curioso'], [150, 'Observador'], [280, 'Conocedor del bosque'], [420, 'Memoria de la aldea']];

export const NOTES = [
  // ---------- naturaleza ----------
  { id: 'pewen', cat: 'naturaleza', title: 'Pewen', sub: 'Araucaria · Araucaria araucana', hint: 'Abundan en el bosque al norte de la aldea.',
    text: 'Árbol de tronco recto y copa en forma de paraguas, con ramas que salen en pisos y se curvan hacia arriba. Sus hojas son duras y puntiagudas, y cubren las ramas como escamas. Crece muy lento: puede superar los mil años y los cuarenta metros. Vive en la cordillera de los Andes y en Nahuelbuta. Hay árboles que dan piñas con semillas y otros que solo dan polen.' },
  { id: 'pinon', cat: 'naturaleza', title: 'Piñón', sub: 'Ngülliw · semilla del pewen', hint: 'Recoge uno en el bosque de pewenes.',
    text: 'La semilla del pewen. Madura al final del verano y cae al suelo en otoño. Se come cocido o tostado, se muele para hacer harina y se guarda para pasar el invierno. Es tan importante que la gente que vive junto a estos bosques se llama pewenche: "gente del pewen".' },
  { id: 'coigue', cat: 'naturaleza', title: 'Coigüe', sub: 'Koywe · Nothofagus dombeyi', hint: 'Árbol alto de copa en pisos, común en todo el bosque.',
    text: 'Árbol grande de hoja pequeña y perenne: no la pierde en invierno. Su copa crece en pisos horizontales, como bandejas. Prefiere los lugares húmedos, cerca de ríos y quebradas, y su madera sirve para construir.' },
  { id: 'roble', cat: 'naturaleza', title: 'Roble', sub: 'Koyam · Nothofagus obliqua', hint: 'Es el árbol de hojas doradas.',
    text: 'A diferencia del coigüe, el roble pierde sus hojas: en otoño se ponen doradas y rojizas, y en invierno caen. Su madera es dura y resistente al agua, la preferida para los postes de las rukas. Cuando el árbol es viejo y su madera se vuelve rojiza, se le llama pellín.' },
  { id: 'canelo', cat: 'naturaleza', title: 'Canelo', sub: 'Foye · Drimys winteri', hint: 'Árbol delgado de corteza clara; crece junto al rewe y en lugares húmedos.',
    text: 'Árbol sagrado del pueblo mapuche. De tronco claro y hojas largas y brillantes, crece en suelos húmedos. Sus ramas acompañan al rewe y a las ceremonias, y se levantan como señal de paz. Su corteza y sus hojas se usan como remedio.' },
  { id: 'peumo', cat: 'naturaleza', title: 'Peumo', sub: 'Pengu · Cryptocarya alba', hint: 'En los manchones soleados de bosque bajo, entre la aldea y el río.',
    text: 'Árbol de copa redonda y muy densa, de hojas duras, lustrosas y aromáticas que no caen en invierno. Da un fruto rojo que se come después de remojarlo en agua tibia. Es parte del bosque esclerófilo: árboles de hoja dura, hechos para aguantar veranos secos.' },
  { id: 'boldo', cat: 'naturaleza', title: 'Boldo', sub: 'Folo · Peumus boldus', hint: 'Árbol bajo y ramificado de las laderas soleadas.',
    text: 'Árbol bajo, que se ramifica desde cerca del suelo. Sus hojas gruesas y ásperas tienen un olor fuerte, y en infusión alivian el estómago y el hígado. También da un fruto pequeño y dulce. Solo crece en estas tierras.' },
  { id: 'quillay', cat: 'naturaleza', title: 'Quillay', sub: 'Küllay · Quillaja saponaria', hint: 'Árbol de copa rala y corteza gris agrietada, en las laderas soleadas.',
    text: 'Árbol de copa irregular y corteza gris muy agrietada. Su corteza, machacada en agua, hace espuma: con ella se lava el pelo y la lana antes de teñirla. Resiste bien la sequía y el frío.' },
  { id: 'litre', cat: 'naturaleza', title: 'Litre', sub: 'Lithi · Lithraea caustica', hint: 'Arbolito ancho de las laderas soleadas. Cuidado.',
    text: 'Árbol pequeño de hojas duras con nervios amarillos muy marcados. A mucha gente le provoca ronchas y picazón con solo tocarlo o descansar a su sombra. Por eso se le trata con respeto: se le saluda antes de pasar. Su madera es durísima.' },
  { id: 'gigante', cat: 'naturaleza', title: 'El árbol abuelo', sub: 'Coigüe centenario', hint: 'Está al final del sendero del bosque viejo, al norponiente.',
    text: 'En el bosque viejo hay coigües que nadie recuerda haber visto pequeños. El mayor de todos tiene un tronco que varias personas no alcanzan a rodear con los brazos. A árboles así se les trata con respeto, como a un anciano.' },
  { id: 'helecho', cat: 'naturaleza', title: 'Helecho', sub: 'Planta del sotobosque', hint: 'Crece a la sombra, sobre todo en el bosque viejo.',
    text: 'Planta sin flores ni semillas, de las más antiguas del bosque. Crece donde hay sombra y humedad, y sus hojas nuevas brotan enrolladas como un caracol. Donde hay muchos helechos, el suelo guarda agua.' },
  { id: 'junco', cat: 'naturaleza', title: 'Juncos', sub: 'Plantas de orilla', hint: 'En el menoko y a la orilla del río.',
    text: 'Plantas altas y delgadas que crecen con los pies en el agua. Con sus tallos se tejen esteras y canastos, y entre ellos anidan las aves del humedal. Donde hay juncos, el agua está cerca aunque no se vea.' },
  { id: 'flores', cat: 'naturaleza', title: 'Flores del claro', sub: 'Flores silvestres', hint: 'En los claros con pasto, como el del maqui.',
    text: 'En los claros donde entra el sol crecen flores pequeñas entre el pasto. Algunas dan tintes para la lana; otras, remedios. Reconocerlas es parte de lo que la machi enseña.' },
  { id: 'maqui', cat: 'naturaleza', title: 'Maqui', sub: 'Maki · Aristotelia chilensis', hint: 'Arbustos del claro al surponiente de la aldea.',
    text: 'Arbusto de ramas rojizas que da un fruto pequeño, negro y dulce al final del verano. Con el fruto se tiñe de morado y se prepara bebida; con las hojas se curan heridas y dolores de garganta.' },
  { id: 'quila', cat: 'naturaleza', title: 'Quila', sub: 'Küla · Chusquea quila', hint: 'Matas de cañas arqueadas en el bosque.',
    text: 'Bambú nativo que crece en matas espesas de cañas delgadas y arqueadas. Forma marañas difíciles de cruzar, donde se esconden el pudú y los pájaros. Con sus cañas se hacen lanzas, flautas y canastos. Florece muy rara vez, y cuando lo hace, toda la mata muere.' },
  { id: 'copihue', cat: 'naturaleza', title: 'Copihue', sub: 'Kopiwe · Lapageria rosea', hint: 'Trepa por algunos troncos del bosque. Busca sus flores rojas.',
    text: 'Enredadera del bosque húmedo que trepa por los troncos buscando la luz. Sus flores rojas con forma de campana cuelgan desde el final del verano hasta el invierno, cuando casi nada más florece. Su fruto es dulce y se come.' },
  { id: 'murtilla', cat: 'naturaleza', title: 'Murtilla', sub: 'Üñü · Ugni molinae', hint: 'Mata baja de frutos rojos, en claros y laderas soleadas.',
    text: 'Arbusto bajo de hojas chicas y brillantes. A fines del verano se llena de frutos rojos, redondos y muy perfumados, que se comen frescos o se guardan secos para el invierno. Crece en los claros y en los bordes del bosque, donde llega el sol.' },
  { id: 'michay', cat: 'naturaleza', title: 'Michay', sub: 'Berberis darwinii', hint: 'Arbusto espinoso de flores anaranjadas, en lo más soleado.',
    text: 'Arbusto de hojas duras y oscuras, con espinas en el borde, que se cubre de racimos de flores anaranjadas. Sus frutos son pequeños y azulados, y se comen. De la raíz y la corteza se saca un tinte amarillo para la lana.' },
  { id: 'chilco', cat: 'naturaleza', title: 'Chilco', sub: 'Fuchsia magellanica', hint: 'Flores colgantes rojas y moradas, cerca del agua.',
    text: 'Arbusto de ramas delgadas y arqueadas que crece donde hay humedad: junto a los esteros y en lo más sombrío del bosque. Sus flores cuelgan como gotas, rojas por fuera y moradas por dentro, y los picaflores las visitan todo el día. Donde hay chilco, hay agua cerca.' },
  { id: 'nalca', cat: 'naturaleza', title: 'Nalca', sub: 'Pangue · Gunnera tinctoria', hint: 'Hojas enormes junto al agua y en el menoko.',
    text: 'Planta de hojas enormes, ásperas y redondas, tan grandes que sirven para taparse de la lluvia. Los tallos tiernos se pelan y se comen, ácidos y frescos. Con las hojas se cubre la comida que se cuece bajo tierra, y de la raíz se saca un tinte oscuro para la lana.' },
  { id: 'weke', cat: 'naturaleza', title: 'Weke', sub: 'Chilihueque', hint: 'En el corral de la aldea.',
    text: 'El animal doméstico del pueblo mapuche antes de la llegada de los caballos y las ovejas. No se sabe con certeza qué animal era: pudo ser una llama traída del norte, pero el estudio de huesos antiguos hallados en la isla Mocha apunta a un guanaco domesticado. Da lana para tejer y es señal de riqueza: se entrega en acuerdos y matrimonios, y se sacrifica en ceremonias importantes. Los blancos son los más apreciados. Una familia tiene pocos, y su carne solo se come en ocasiones especiales.' },
  { id: 'pudu', cat: 'naturaleza', title: 'Pudú', sub: 'Püdu · Pudu puda', hint: 'Entre los árboles, lejos de la aldea. Huye si te acercas rápido.',
    text: 'Uno de los ciervos más pequeños del mundo: apenas llega a la rodilla de un adulto. Vive escondido en el bosque espeso, come hojas y brotes, y al menor ruido escapa corriendo en zigzag. Para verlo de cerca hay que moverse despacio.' },
  { id: 'traro', cat: 'naturaleza', title: 'Traro', sub: 'Traru · Caracara plancus', hint: 'Planea sobre el cerro Treng Treng.',
    text: 'Ave rapaz de cara rojiza y copete oscuro. Camina tanto como vuela y observa largo rato antes de actuar. De ella viene el nombre de Leftraru: "traro veloz".' },
  { id: 'choroy', cat: 'naturaleza', title: 'Choroy', sub: 'Loro del bosque', hint: 'Una bandada verde cruza el cielo sobre todo el valle.',
    text: 'Loro verde de pico largo y curvo que solo vive en estos bosques. Vuela en bandadas ruidosas y con su pico abre las piñas del pewen para comer los piñones. Donde gritan los choroyes, hay piñones cerca.' },
  { id: 'rayadito', cat: 'naturaleza', title: 'Rayadito', sub: 'Pajarito del bosque', hint: 'Revolotean en grupo entre los árboles.',
    text: 'Pájaro pequeño e inquieto, de cola con puntas como espinas. Recorre troncos y ramas en grupo, buscando insectos bajo la corteza, y no se va en invierno.' },
  { id: 'rio', cat: 'naturaleza', title: 'El río', sub: 'Lewfü', hint: 'Al sur de la aldea.',
    text: 'El río baja de la cordillera hacia el mar. Da agua, peces y un camino. Como todo lugar con agua, tiene su ngen, su dueño, y se le saluda antes de entrar. En su poza se recibe el año nuevo.' },
  // ---------- vida y cultura ----------
  { id: 'ruka', cat: 'cultura', title: 'Ruka', sub: 'La casa', hint: 'Observa cualquiera de las casas de la aldea.',
    text: 'La casa mapuche. Tiene una armazón de troncos cubierta de paja o juncos, sin ventanas, y su puerta mira al oriente, por donde sale el sol. Adentro vive toda la familia alrededor del fuego. Levantarla es trabajo de toda la comunidad, y termina con una fiesta.' },
  { id: 'kutral', cat: 'cultura', title: 'Kütral', sub: 'El fuego', hint: 'El fogón del centro de la aldea.',
    text: 'El fuego nunca se deja apagar. Alrededor de él se cocina, se conversa y se enseña: es donde los mayores cuentan las historias y donde los niños aprenden a escuchar. El humo, además, protege la paja del techo y conserva los alimentos.' },
  { id: 'rewe', cat: 'cultura', title: 'Rewe', sub: 'El lugar puro', hint: 'Junto a la ruka de la machi, al suroriente.',
    text: 'Tronco tallado con peldaños, plantado en la tierra frente a la ruka de la machi y adornado con ramas de canelo. Es su escalera entre este mundo y el de arriba: sobre él canta y toca su kultrún en las ceremonias.' },
  { id: 'witral', cat: 'cultura', title: 'Witral', sub: 'El telar', hint: 'Junto a la ruka de la familia, donde trabaja Millaray.',
    text: 'Telar vertical de palos. En él se tejen mantas, fajas y ponchos con lana hilada a mano y teñida con plantas, barro y cortezas. Los dibujos del tejido no son adorno: dicen de dónde viene quien lo lleva y qué lugar ocupa.' },
  { id: 'chemamull', cat: 'cultura', title: 'Chemamüll', sub: 'Gente de madera', hint: 'En el lugar de los antiguos, al oriente.',
    text: 'Grandes figuras de madera con forma humana que se levantan donde descansan los muertos. Acompañan al difunto y recuerdan a los vivos quiénes vinieron antes. No es un lugar para jugar: se entra en silencio o no se entra.' },
  { id: 'palin', cat: 'cultura', title: 'Palin', sub: 'El juego', hint: 'Pregúntale a Rayen, en la cancha.',
    text: 'Juego de dos equipos que, con bastones curvos de madera, disputan una pequeña bola en una cancha larga y angosta. Sirve para entrenar el cuerpo, estrechar la amistad entre comunidades y también para resolver disputas sin llegar a la guerra. Siempre termina con comida compartida.' },
  { id: 'incas', cat: 'cultura', title: 'La memoria del norte', sub: 'Cuando vinieron los incas', hint: 'Ñamku, el anciano, la guarda.',
    text: 'Dos generaciones atrás, los ejércitos del inca avanzaron desde el norte conquistando pueblo tras pueblo. Aquí no pudieron: los detuvieron al norte de estas tierras y nunca dominaron el territorio mapuche. Los ancianos lo cuentan para que nadie olvide que ya una vez vinieron extraños a mandar.' },
  // ---------- lugares ----------
  { id: 'l-aldea', cat: 'lugares', title: 'La aldea', sub: 'Lof', hint: 'Es tu hogar.', text: 'Un lof es una comunidad de familias emparentadas que comparten un territorio y reconocen a un mismo lonko. Las rukas no forman calles: cada familia levanta la suya donde le acomoda, cerca del agua y de los suyos.' },
  { id: 'l-pewen', cat: 'lugares', title: 'Bosque de pewenes', sub: 'Pewenentu', hint: 'Sigue el sendero hacia el norte.', text: 'Un bosque donde casi todos los árboles son pewenes. El suelo está cubierto de sus hojas secas y, en otoño, de piñones. La comunidad lo cuida como una despensa que es de todos.' },
  { id: 'l-cerro', cat: 'lugares', title: 'Cerro Treng Treng', sub: 'El cerro que salva', hint: 'Sube por el sendero del nororiente.', text: 'El cerro más alto del valle. Desde su cima se ve todo el mundo de Leftraru: el mar hacia el poniente y el volcán hacia el oriente. En muchos lugares hay un cerro con este nombre, y siempre por la misma historia.' },
  { id: 'l-menoko', cat: 'lugares', title: 'Menoko', sub: 'El humedal', hint: 'Al final del sendero del surponiente.', text: 'Un menoko es un lugar donde el agua brota y se queda entre plantas. Allí crecen muchos de los remedios que usa la machi. Es un lugar con dueño: no se corre ni se grita, y se pide permiso antes de sacar una planta.' },
  { id: 'l-costa', cat: 'lugares', title: 'Camino de la costa', sub: 'Hacia el lafken', hint: 'Sigue el sendero hacia el poniente.', text: 'Por este sendero se llega al mar en un par de días. Por él vienen los parientes de la costa a intercambiar algas y pescado seco por piñones, y por él llegan las noticias.' },
  { id: 'l-poza', cat: 'lugares', title: 'La poza del río', sub: 'Donde se recibe el año', hint: 'Baja por el sendero del sur.', text: 'Aquí el río se ensancha y el agua corre mansa. Es donde la aldea se baña antes del amanecer del We Tripantu, para recibir limpia el regreso del sol.' },
  { id: 'l-viejo', cat: 'lugares', title: 'Bosque viejo', sub: 'Los árboles mayores', hint: 'Toma el sendero del norponiente.', text: 'La parte más antigua y húmeda del bosque, con árboles enormes cubiertos de musgo y un suelo de helechos. Aquí la luz llega de a poco y todo suena más bajo.' },
  { id: 'l-antiguos', cat: 'lugares', title: 'Lugar de los antiguos', sub: 'Eltun', hint: 'Al oriente de la aldea.', text: 'Donde descansan los que vivieron antes. Está en un claro rodeado de canelos, a la vista de la aldea, porque los muertos siguen siendo parte de la comunidad.' },
  { id: 'l-maqui', cat: 'lugares', title: 'Claro del maqui', sub: 'Un claro soleado', hint: 'A medio camino hacia el menoko.', text: 'Un claro donde entra el sol y crecen pasto, flores y arbustos de maqui. Es el lugar preferido para buscar plantas de teñir.' },
  { id: 'l-cancha', cat: 'lugares', title: 'La cancha de palin', sub: 'Paliwe', hint: 'Al norponiente, saliendo de la aldea.', text: 'Una franja de tierra despejada, larga y angosta, marcada con estacas. Aquí se juega palin y se reúne la gente cuando hay algo que celebrar o que resolver.' },
  // ---------- personas ----------
  { id: 'leftraru', cat: 'personas', title: 'Leftraru', sub: 'Tú', hint: '', text: 'Tiene once años. Su nombre significa "traro veloz". Es curioso y paciente: le gusta quedarse quieto mirando cómo se mueven los animales. Con el tiempo, la historia lo conocerá como Lautaro.' },
  { id: 'curinancu', cat: 'personas', title: 'Curiñancu', sub: 'Tu padre, lonko', hint: 'Está en la aldea, cerca del sendero del norte.', text: 'Padre de Leftraru y lonko, cabeza de la comunidad. Su nombre significa "aguilucho negro". Habla poco y enseña haciendo. Un lonko no manda por la fuerza: lo siguen porque sabe escuchar y decidir. Según la tradición, así se llamaba el padre de Lautaro.' },
  { id: 'millaray', cat: 'personas', title: 'Millaray', sub: 'Tu madre, tejedora', hint: 'Trabaja en el telar, junto a la ruka de la familia.', text: 'Madre de Leftraru. Su nombre significa "flor de oro". Hila, tiñe y teje la ropa de toda la familia, y sabe leer en un tejido de dónde viene quien lo lleva. Tiene un humor seco y poca paciencia para las excusas.' },
  { id: 'abuela', cat: 'personas', title: 'La abuela', sub: 'Kuku', hint: 'Junto al fogón.', text: 'Madre de Curiñancu. Kuku es como un niño llama a su abuela paterna. Guarda las historias de la familia y las cuenta junto al fuego, siempre igual, porque una historia que cambia se pierde.' },
  { id: 'ayelen', cat: 'personas', title: 'Ayelén', sub: 'Tu hermana menor', hint: 'Corretea por la aldea.', text: 'Tiene seis años y sigue a Leftraru a todas partes. Pregunta por todo, y cuando no le contestan, pregunta otra vez. Su nombre habla de alegría.' },
  { id: 'rayen', cat: 'personas', title: 'Rayen', sub: 'Tu amiga', hint: 'En la cancha de palin.', text: 'Tiene doce años y es la mejor jugando palin entre los niños de la aldea. Rápida y burlona, no entiende cómo Leftraru puede pasar una tarde entera mirando un pájaro. Su nombre significa "flor".' },
  { id: 'machi', cat: 'personas', title: 'La machi', sub: 'Sanadora', hint: 'Junto al rewe, al suroriente de la aldea.', text: 'La machi cura con plantas, con cantos y con su kultrún, y es quien habla con los espíritus en nombre de la comunidad. No se elige serlo: el llamado llega en sueños o con una enfermedad. Habla poco y entiende mucho.' },
  { id: 'namku', cat: 'personas', title: 'Ñamku', sub: 'El anciano', hint: 'Al oriente de la aldea, frente a su ruka.', text: 'El más anciano de la aldea. Guarda la memoria de lo que pasó antes de que nacieran los demás, y la repite para quien quiera oírla. Su nombre es el del aguilucho.' },
  // ---------- mitología y memoria ----------
  { id: 'ngen', cat: 'mitologia', title: 'Ngen', sub: 'Los dueños de la naturaleza', hint: 'La machi sabe de esto.', text: 'Cada parte de la naturaleza tiene un ngen: un espíritu dueño que la cuida. El bosque tiene el suyo, y también el agua, el viento, los cerros y el fuego. Por eso, antes de cortar una planta o entrar al agua se pide permiso y se explica para qué, y se toma solo lo necesario. Quien toma de más, ofende.' },
  { id: 'pewen-sagrado', cat: 'mitologia', title: 'El regalo del pewen', sub: 'Por qué no se sacude el árbol', hint: 'Tu padre te lo puede explicar.', text: 'Se cuenta que hubo un invierno de hambre en que la gente no sabía que el piñón se podía comer, porque el pewen es un árbol sagrado y nadie tocaba sus frutos. Un anciano se le apareció a un joven y le enseñó a cocerlos. Desde entonces el pewen alimenta a su gente, y por eso no se le golpea ni se le sacude: se recoge lo que él deja caer.' },
  { id: 'trengtreng', cat: 'mitologia', title: 'Treng Treng y Kai Kai', sub: 'Las dos serpientes', hint: 'La abuela cuenta esta historia.', text: 'Al principio, Kai Kai, la serpiente del mar, se enojó con la gente e hizo subir las aguas para ahogarla. Treng Treng, la serpiente de la tierra, llamó a las personas a su cerro y lo fue levantando mientras el agua subía. Pelearon hasta que Kai Kai se cansó. Los que alcanzaron la cima se salvaron y de ellos viene la gente de hoy. Por eso tantos cerros se llaman Treng Treng.' },
  { id: 'pillan', cat: 'mitologia', title: 'Pillán', sub: 'El espíritu del volcán', hint: 'Mira el volcán desde la cima del cerro.', text: 'Los pillán son espíritus poderosos, antepasados que habitan en los volcanes y en las alturas. Cuando el volcán humea o truena, se dice que se están moviendo. No son buenos ni malos: son fuertes, y se les respeta.' },
  { id: 'lafken', cat: 'mitologia', title: 'Lafken', sub: 'El mar y su gente', hint: 'Mira hacia el poniente desde la cima del cerro.', text: 'Hacia donde se pone el sol está el lafken, el mar. Su gente, los lafkenche, vive de lo que el mar entrega. Se cuenta que las almas de los muertos viajan hacia el poniente, cruzando el mar, hasta una isla donde siguen viviendo.' },
  { id: 'pewma', cat: 'mitologia', title: 'Pewma', sub: 'Los sueños', hint: 'La machi pregunta por ellos.', text: 'Los sueños no son cosa sin importancia: son mensajes. Al despertar se cuentan a la familia, y los mayores ayudan a entender qué avisan. Un sueño puede anunciar una visita, una enfermedad o un llamado.' },
  { id: 'wetripantu', cat: 'mitologia', title: 'We Tripantu', sub: 'El regreso del sol', hint: 'Toda la aldea se está preparando: pregúntale a tu madre.', text: 'El año nuevo mapuche. Llega con la noche más larga del invierno, cuando el sol empieza a regresar y la naturaleza despierta de nuevo. La familia espera despierta junto al fuego, contando historias, y antes del alba baja a bañarse al río para recibir limpia el nuevo ciclo.' },
];

// Lo que dice cada persona. "da" son las notas que se aprenden al terminar de conversar.
export const TALK = {
  curinancu: { name: 'Curiñancu', da: ['pewen-sagrado'], lines: ['Mari mari, hijo. Los piñones están en el bosque del norte. Sigue el sendero.', 'Recoge los que cayeron solos. No sacudas el árbol: él decide cuánto da.', 'Hubo un invierno en que la gente pasó hambre teniendo el pewen al lado. Que no se te olvide a quién le debemos comer.'], again: 'Anda, que la luz no espera. Y mira bien por dónde pisas.' },
  millaray: { name: 'Millaray', da: ['wetripantu'], lines: ['¿Todavía aquí? Tu padre te mandó por piñones hace rato.', 'Faltan pocos días para el We Tripantu y quiero terminar esta manta antes. La noche más larga se pasa mejor abrigado.', 'Cuando vuelva el sol, bajaremos todos al río antes del alba. Tú también, aunque el agua esté helada.'], again: 'Si vas al claro del maqui, tráeme algo para teñir.' },
  abuela: { name: 'La abuela', da: ['trengtreng'], lines: ['Siéntate un momento, Leftraru. ¿Ves ese cerro, hacia donde sale el sol?', 'Cuando Kai Kai hizo subir el mar para ahogarnos, Treng Treng llamó a la gente a su cerro y lo fue levantando, más y más alto.', 'Los que llegaron arriba se salvaron. De ellos venimos. Por eso, cuando la tierra tiembla, se sube al cerro.'], again: 'Te la cuento otra vez la noche del We Tripantu, completa.' },
  ayelen: { name: 'Ayelén', da: [], lines: ['¡Leftraru! ¿A dónde vas? ¿Puedo ir?', '¿Por qué te llamas como el traro? ¿Es porque miras tanto?', 'La kuku dice que el traro mira mucho antes de bajar. Yo no puedo quedarme quieta tanto rato.'], again: '¡Tráeme un piñón grande!' },
  rayen: { name: 'Rayen', da: ['palin'], lines: ['Mari mari, mirón. ¿Vienes a jugar o a quedarte parado?', 'Para el We Tripantu vienen los de la costa y habrá palin. Los grandes juegan en serio: con el palin se arreglan cosas que, si no, terminarían mal.', 'Después todos comen juntos, hayan ganado o perdido. Así tiene que ser.'], again: 'Cuando vuelvas del bosque, una carrera hasta el río.' },
  machi: { name: 'La machi', da: ['ngen', 'pewma'], lines: ['Leftraru. ¿Qué soñaste anoche?', 'Los sueños se cuentan. Si los guardas, no sabes qué te estaban avisando.', 'Y cuando entres al bosque, saluda. Todo lo que ves tiene dueño: el agua, los árboles, el cerro. Pide antes de tomar, y toma poco.'], again: 'En el menoko no se corre ni se grita. Estás de visita.' },
  namku: { name: 'Ñamku', da: ['incas'], lines: ['Acércate, niño. A los viejos nos gusta que nos escuchen.', 'Mi padre era joven cuando llegaron del norte los hombres del inca, con sus ejércitos y sus caminos. Querían que les sirviéramos.', 'No pasaron. Los detuvimos antes de estas tierras. Te lo cuento para que sepas que puede volver a venir gente así.'], again: 'El que no escucha a los viejos, tropieza con la misma piedra.' },
};

// ---------- saberes: habilidades que se aprenden gastando puntos de investigación ----------
// Cada saber lo enseña alguien de la aldea: hay que haber conversado con esa persona.
export const SKILLS = [
  { id: 'vista', name: 'Vista de traro', cost: 40, rama: 'El bosque', de: 'curinancu', col: 0, row: 0, text: 'Reconoces las cosas desde más lejos: puedes observar árboles, animales y objetos sin tener que acercarte tanto.' },
  { id: 'rastro', name: 'Rastreador', cost: 80, rama: 'El bosque', de: 'curinancu', pide: 'vista', col: 0, row: 1, text: 'El minimapa marca con un signo lo que todavía no has descubierto cerca de ti.' },
  { id: 'pudu', name: 'Paso de pudú', cost: 50, rama: 'El bosque', de: 'machi', col: 1, row: 0, text: 'Te mueves sin espantar: los animales del bosque te dejan acercarte mucho más antes de huir.' },
  { id: 'ligero', name: 'Paso ligero', cost: 40, rama: 'El cuerpo', de: 'rayen', col: 2, row: 0, text: 'Corres más rápido.' },
  { id: 'salto', name: 'Salto firme', cost: 60, rama: 'El cuerpo', de: 'rayen', pide: 'ligero', col: 2, row: 1, text: 'Saltas más alto: alcanzas rocas y troncos que antes no.' },
  { id: 'memoria', name: 'Buena memoria', cost: 60, rama: 'La palabra', de: 'abuela', col: 3, row: 0, text: 'Recuerdas mejor lo que ves y lo que te cuentan: cada descubrimiento nuevo da 5 puntos más.' },
];

// ---------- misiones ----------
// check recibe el estado del juego y devuelve [hecho, avance, total]
const count = (c, ids) => ids.filter((id) => c.has(id)).length;
const set = (ids) => (c) => { const n = count(c, ids); return [n === ids.length, n, ids.length]; };
export const MISSIONS = [
  { id: 'm1', main: true, n: 1, title: 'Los piñones del pewen', who: 'Curiñancu', pts: 40, text: 'Tu padre te encargó reunir los últimos piñones para la celebración. Están en el bosque de pewenes, siguiendo el sendero hacia el norte. Uno quedó sobre unas rocas.', check: (c) => [c.got >= c.total, c.got, c.total] },
  { id: 'm2', main: true, n: 2, title: 'El traro', who: 'Curiñancu', pts: 40, pide: 'm1', text: 'Tu padre te espera en la cima del cerro Treng Treng, por el sendero del nororiente. Dicen que desde arriba se ve el mundo entero.', check: (c) => [c.summit, c.summit ? 1 : 0, 1] },
  { id: 'm3', main: true, n: 3, title: 'Las plantas de la machi', soon: true },
  { id: 'm4', main: true, n: 4, title: 'Los invitados', soon: true },
  { id: 'm5', main: true, n: 5, title: 'La noche de las historias', soon: true },
  { id: 'm6', main: true, n: 6, title: 'We Tripantu', soon: true },
  { id: 's1', title: 'Conoce a tu gente', pts: 30, text: 'Conversa con cada persona de la aldea. Cada una tiene algo que enseñar.', check: set(['curinancu', 'millaray', 'abuela', 'ayelen', 'rayen', 'machi', 'namku']) },
  { id: 's2', title: 'El bosque tiene nombres', pts: 30, text: 'Observa cada tipo de árbol: pewen, coigüe, roble, canelo y el árbol abuelo.', check: set(['pewen', 'coigue', 'roble', 'canelo', 'gigante']) },
  { id: 's3', title: 'Los que vuelan y los que corren', pts: 30, text: 'Observa a los animales: el weke, el pudú, el traro, los choroyes y los rayaditos.', check: set(['weke', 'pudu', 'traro', 'choroy', 'rayadito']) },
  { id: 's4', title: 'Los caminos del valle', pts: 30, text: 'Recorre todos los lugares del territorio.', check: set(['l-aldea', 'l-pewen', 'l-cerro', 'l-menoko', 'l-costa', 'l-poza', 'l-viejo', 'l-antiguos', 'l-maqui', 'l-cancha']) },
  { id: 's5', title: 'La casa y el fuego', pts: 30, text: 'Observa las cosas de la aldea: la ruka, el fogón, el rewe, el telar y las figuras de madera.', check: set(['ruka', 'kutral', 'rewe', 'witral', 'chemamull']) },
  { id: 's6', title: 'Lo que se cuenta junto al fuego', pts: 30, text: 'Aprende todas las historias y creencias que la gente tiene para contar.', check: set(['ngen', 'pewen-sagrado', 'trengtreng', 'pillan', 'lafken', 'pewma', 'wetripantu']) },
  { id: 's8', title: 'El monte soleado', pts: 30, text: 'Observa los árboles de hoja dura de las laderas con sol: peumo, boldo, quillay y litre.', check: set(['peumo', 'boldo', 'quillay', 'litre']) },
  { id: 's7', title: 'Plantas del suelo', pts: 30, text: 'Observa las plantas pequeñas: helecho, juncos, flores, maqui, quila y copihue.', check: set(['helecho', 'junco', 'flores', 'maqui', 'quila', 'copihue']) },
];

// Entradas del cuaderno que tienen una fotografía fija y detallada (assets/cuaderno); los lugares se fotografían en el juego.
export const FOTOS = new Set(NOTES.filter((n) => n.cat !== 'lugares').map((n) => n.id));
