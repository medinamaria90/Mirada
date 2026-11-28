# Revisión independiente — banco de preguntas de concepto

Banco: `contenido/preguntas-concepto.json` (82 preguntas, commit `8dc107f`). Revisor independiente: no participó en
la redacción y no toca el banco. Obras resueltas contra `app/data/catalog.json`; contexto leído en
`app/data/epocas/*.json` y `app/data/carteles/tramos.json`.

## Veredicto global

**Aprobado con correcciones.** El contenido es bueno: las respuestas correctas son correctas, los «porqués» enseñan
de verdad y casi todos tienen una anécdota o un contraste útil (Ingres y las vértebras de más, Malévich en el rincón
de los iconos, Leroy y el insulto que da nombre al impresionismo, Rubens que se quedó sus Gracias). El tono está a la
altura de CLAUDE.md. Pero hay **dos fallos de sistema** que dejan adivinar sin mirar el cuadro, y deben arreglarse antes
de publicar:

| | Problema | Gravedad |
|---|---|---|
| **G1** | La respuesta es siempre `a` (82 de 82). El motor que sirve las preguntas (`engine/concepts.js`) aún no existe en la rama y `tools/sync_preguntas.py` no lo comprueba. Si las opciones no se barajan al mostrarse, el juego es trivial. | Grave si no se baraja |
| **G2** | En las 58 preguntas de texto, la buena es la opción más larga en **52** (90 %). En 20 de ellas supera al distractor más largo en 15 caracteres o más. Un jugador aprende enseguida a pulsar la frase más larga. | Grave (trampa) |
| G3 | Muletilla «Es el primer…» / «por primera vez» en 10 distractores (renacimiento-rompe b, manierismo-rompe b, romanticismo-rompe b, impresionismo-rompe b, postimpresionismo-rompe b, simbolismo-rompe b, t-genios-cambia b, t-flandes-rompe b, t-historia-rompe b, t-nace-imp-rompe b). Siempre es falsa, así que se descarta por costumbre. | Media |
| G4 | Distractores comodín muy repetidos («foco de luz en la oscuridad», «puntitos de color», «pinceladas sueltas al aire libre», «contornos marcados y colores planos»). Son didácticos, pero tras 10 preguntas se descartan sin pensar. | Leve |

**Arreglo propuesto para G1:** barajar las opciones en el motor (y que la prueba del motor lo compruebe) o, si se
prefiere orden fijo, repartir `answer` entre a–d en el banco. Añadir a `sync_preguntas.py` un aviso si todas las
respuestas tienen la misma letra.

**Arreglo propuesto para G2:** recortar la buena a la longitud media de las otras o alargar uno o dos distractores con
un matiz creíble. Regla útil para el comprobador: avisar si la buena supera en más de 10 caracteres al distractor más
largo. Las 20 peores (diferencia en caracteres): barroco-rompe (25), t-sorolla-comun (23), romanticismo-cambia (23),
t-alemania-comun (22), t-manierismo-comun (21), t-flandes-rompe (21), impresionismo-rompe (20), romanticismo-rompe (19),
manierismo-rompe (19), t-nace-imp-rompe (18), t-nace-imp-comun (17), t-genios-comun (17), t-bodegon-cambia (17),
rococo-cambia (17), t-paisaje-comun (16), t-orden-rompe (16), t-historia-rompe (16), t-neoclasicismo-comun (15),
t-historia-grande-comun (15), realismo-cambia (15). Ejemplos de recorte:

- barroco-rompe a: «Un momento sagrado ocurre en una taberna, con gente de la calle» → «Lo sagrado pasa en una taberna, entre gente de la calle» (y alargar b: «Renuncia a la perspectiva y al espacio profundo»).
- romanticismo-cambia a: → «El orden deja paso al color y al drama».
- t-sorolla-comun a: → «El sol que rebota en el agua y en la piel».
- t-orden-rompe a: → «Construye cuerpos y árboles con planos de color».
- t-alemania-comun a: → «Precisión del Norte: todo pintado con lupa».

Las preguntas cuyo único problema es G2 aparecen como OK en la tabla; el recorte se hace en bloque.

## Tabla por pregunta

Estado: **OK** (válida tal cual, salvo G1/G2) · **CORREGIR** (cambio de texto) · **CAMBIAR** (cambiar una obra o la pregunta).

| id | Estado | Problema y propuesta |
|---|---|---|
| renacimiento-cual | OK | Nota: el título del Cimabue en el catálogo está en inglés (w15974342 «The Virgin and Child with Two Angels»); traducirlo en el catálogo por si se muestra en la ficha. |
| renacimiento-cambia | CORREGIR | El distractor b («Las figuras religiosas desaparecen») se descarta mirando la Última Cena: es absurdo. Propuesta b: «Se pierde la simetría: todo se descoloca» / why: «No: Leonardo pone a Cristo en el centro exacto y reparte a los apóstoles en cuatro grupos de tres. Lo nuevo es el espacio que se aleja.» En el why de b actual, «vírgenes» en minúscula se lee raro (ver nota de tono): usar «la Virgen y los santos». |
| renacimiento-comun | OK | — |
| renacimiento-rompe | CORREGIR | El why de c nombra a Van Eyck, que el jugador aún no ha visto (llega en el tramo «El óleo en Flandes», de la época siguiente). Propuesta: «…El óleo lo habían llevado lejos los pintores flamencos, como Jan van Eyck, que pintaba con lupa.» |
| manierismo-cual | OK | Muy buena trampa con Ingres. |
| manierismo-cambia | CAMBIAR | El expolio es un mal ejemplo de «cuerpos que se alargan» y además tiene a Cristo iluminado entre cabezas en sombra, así que la c («foco de luz en la oscuridad») se puede defender. Cambiar la segunda obra por **w867403** (Parmigianino, «Virgen del cuello largo»), el contraste de manual con Rafael. why a: «Eso es: tras la armonía de Rafael, Parmigianino estira el cuello, los dedos y hasta al Niño. Belleza llevada a lo raro, a propósito.» why b: «No vuelve el oro: hay espacio, pero no encaja; al fondo, una columna y un profeta diminuto.» why d: «No: sigue siendo una Virgen con el Niño. Los paisajes y escenas de casa fueron cosa del norte protestante.» |
| manierismo-comun | OK | — |
| manierismo-rompe | OK | (G2, G3) |
| barroco-cual | CORREGIR | El why de d enseña un criterio falso: «plano: no hay salas al fondo ni juego de luces». Los retratos barrocos (también los de Velázquez) usan a menudo fondo liso y oscuro. Propuesta: «Es manierismo: El Greco en Toledo, hacia el final del siglo XVI. Cara alargada y pálida, gola blanca y un gesto solemne, casi de juramento, sin el juego de luces y profundidad de Velázquez.» |
| barroco-cambia | CORREGIR | «sonrisa mellada» es dudoso (el niño enseña los dientes, pero no está claro que le falten). Propuesta: «…con su pie torcido y su sonrisa abierta…». |
| barroco-comun | OK | — |
| barroco-rompe | OK | (G2: la peor del banco, 63 frente a 38; ver recorte arriba). |
| rococo-cual | OK | — |
| rococo-cambia | CORREGIR | El distractor b («Aparece un foco de luz en la oscuridad») se puede defender al comparar: los Horacios tienen un fondo de arcos en penumbra y una luz lateral dura, muy distinta de la luz difusa de Watteau. Cambiar b por «Los colores se vuelven claros y pastel» / why: «Al revés: el pastel era lo del rococó. David usa colores firmes, rojos y blancos, y una luz que recorta las figuras como estatuas.» |
| rococo-comun | CORREGIR | El why de d dice «el trazo del pastel»: se confunde con «tonos pastel» de otras preguntas y es un término que hay que explicar. Propuesta: «…Liotard pintó al pastel (barras de color en polvo) sin que se vea un solo trazo.» |
| rococo-rompe | OK | — |
| romanticismo-cual | OK | El Pissarro de vapores es un buen distractor «gemelo». |
| romanticismo-cambia | OK | (G2) |
| romanticismo-comun | CORREGIR | El why de d resta importancia al tren («casi un fantasma»), pero el tren es el tema de Turner (está en el título y en primer plano, con la caldera encendida). Propuesta: «Turner sí pinta un tren, el gran invento de su tiempo; pero en el caminante de Friedrich no hay ni rastro de ciudad. Lo que comparten es una naturaleza inmensa.» |
| romanticismo-rompe | OK | (G2, G3) |
| realismo-cual | CAMBIAR | «Los comedores de patatas» es del Van Gogh de Nuenen, en su etapa realista (admiraba a Millet): mucha gente lo llama realismo, así que hay dos respuestas defendibles. Sustituir b por **w594477** (Van Gogh, «Mujer campesina con un fondo de trigo», 1890). why: «Trampa: una campesina también, pero es Van Gogh en Auvers: trigo de pinceladas en remolino y colores que no copian, expresan.» Además, esta pregunta y t-campo-cual son casi iguales (Millet + campesinos de otra época): conviene variar una de las dos. |
| realismo-cambia | OK | (G2) |
| realismo-comun | OK | — |
| realismo-rompe | OK | — |
| impresionismo-cual | OK | — |
| impresionismo-cambia | OK | — |
| impresionismo-comun | OK | — |
| impresionismo-rompe | OK | (G2, G3) Nota menor en el why de c: solo mira al espectador la mujer desnuda, no «el grupo». |
| postimpresionismo-cual | OK | — |
| postimpresionismo-cambia | OK | — |
| postimpresionismo-comun | OK | Nota de catálogo: w930535 «Mujeres de Tahití» figura con año 1890; es de 1891 (Gauguin llega a Tahití en junio de 1891). Corregir en el catálogo. |
| postimpresionismo-rompe | OK | (G3) |
| simbolismo-cual | OK | — |
| simbolismo-cambia | OK | — |
| simbolismo-comun | OK | — |
| simbolismo-rompe | OK | (G3) |
| t-nace-ren-comun | OK | — |
| t-nace-ren-cual | CORREGIR | Ambigua: Bronzino (c) es florentino del siglo XVI, así que su Cosme I también es «Renacimiento italiano» en sentido amplio. El tramo es el siglo XV: cambiar el enunciado a «¿Cuál de estos retratos es del primer Renacimiento italiano?» y, en el why de c, decir «Es manierismo, la última etapa del Renacimiento, ya en el siglo XVI…». |
| t-genios-comun | CORREGIR | (G2) Tono: «las vírgenes son bellas e ideales» en minúscula se lee raro hoy. Propuesta: «Aquí la Virgen es bella e ideal, más perfecta que cualquier vecina.» |
| t-genios-cambia | OK | (G3) |
| t-venecia-cambia | OK | — |
| t-venecia-cual | OK | Muy buena: cuatro retratos ecuestres de cuatro épocas. |
| t-flandes-comun | OK | — |
| t-flandes-rompe | OK | (G2, G3) |
| t-alemania-comun | OK | (G2) |
| t-alemania-cambia | CORREGIR | «Del encargo de los ricos a la vida de los campesinos» mezcla dos cosas: las escenas campesinas de Brueghel también eran para ricos coleccionistas de Amberes. Propuesta a: «De retratar a los ricos a pintar a los campesinos». Y aprovechar la anécdota en el why: «Van Eyck retrata a un rico mercader; de Brueghel se contaba que se disfrazaba de campesino para colarse en las bodas de pueblo.» |
| t-manierismo-cual | CAMBIAR | El distractor d (Ingres, «La gran odalisca», con la misma explicación de las vértebras) repite el de manierismo-cual: la segunda vez no cuesta nada. Sustituir por **w941416** (Ingres, «Júpiter y Tetis», 1811). why: «Trampa: el cuello de Tetis se estira como el de esta Virgen, pero es Ingres, neoclásico del siglo XIX: línea pura y un Júpiter de estatua.» |
| t-manierismo-comun | CORREGIR | (G2) «pose rígida» encaja con la Leonor de Bronzino, pero no con el conde Sanvitale de Parmigianino, sentado y girado con naturalidad. Propuesta a: «Retratos elegantes y distantes, de piel fría y pose estudiada». |
| t-luz-comun | OK | — |
| t-luz-cual | CAMBIAR | El bodegón de Meléndez (b) tiene fondo oscuro, luz lateral fuerte y objetos aislados: al mirarlo se puede defender como barroco (el propio why admite que «hereda la luz fuerte española»). Sustituir por **w4388208** (Greuze, «El cántaro roto», 1771). why: «Es del siglo XVIII: Greuze pinta a una muchacha con luz suave y colores claros, y una moraleja sentimental. Nada del foco que corta la sombra.» |
| t-reyes-comun | CORREGIR | El why de b dice que no hay idealización, pero Van Dyck sí favorecía a Carlos I (lo hacía parecer más alto y esbelto). Propuesta: «Van Dyck favorecía al rey, que era bajito, pero no lo convierte en estatua; y Velázquez no esconde la mirada desconfiada del papa.» |
| t-reyes-cual | OK | Nota: Bouguereau (w1283024) se repite como distractor en renacimiento-cual con la misma explicación; aceptable, pero se puede variar. |
| t-vida-cual | OK | — |
| t-vida-comun | OK | — |
| t-rococo-comun | OK | — |
| t-rococo-cual | OK | Difícil (Renoir admiraba a Fragonard y se parecen), pero justa: la ropa y el peinado delatan el siglo. |
| t-bodegon-comun | OK | — |
| t-bodegon-cambia | OK | (G2) |
| t-neoclasicismo-comun | OK | (G2) |
| t-neoclasicismo-cual | OK | — |
| t-paisaje-cual | CORREGIR | Whistler aparece sin presentarlo ni decir su época. Propuesta: «Es del estadounidense Whistler, más de medio siglo después, cerca de los impresionistas: unos fuegos artificiales de noche, casi abstractos. Busca belleza, no lo inmenso.» |
| t-paisaje-comun | OK | (G2) |
| t-historia-comun | OK | — |
| t-historia-rompe | OK | (G2, G3) |
| t-campo-cual | CORREGIR | Duplica la estructura de realismo-cual (ver arriba). Además, Constable (d) pintaba del natural y muchos lo ven precursor del realismo: el why debe dar un rasgo visible además del tema. Propuesta: «Es romanticismo inglés, treinta años antes: Constable pinta el campo que amaba, con nubes enormes y luz cambiante. El trabajo es un detalle: manda el paisaje.» |
| t-campo-comun | CORREGIR | «a tamaño de héroe»: vale para Los picapedreros (2,6 m), no para El sembrador (aprox. 1 × 0,8 m). Propuesta a: «El trabajo duro del campo, con dignidad de héroe». Posible anécdota para el why: Los picapedreros se destruyó en Dresde en 1945; solo queda su fotografía. |
| t-historia-grande-comun | OK | (G2) |
| t-historia-grande-cual | CAMBIAR | 1) Dato dudoso: «que Fortuny vio con sus propios ojos». Fortuny fue a la guerra de África como cronista, pero parece que llegó después de la toma de Tetuán (sí vio la batalla de Wad-Ras). Dejar: «Fortuny viajó a esa guerra como cronista y la contó con luz brillante y mil detalles.» 2) «Gassed» de Sargent (d) es, al mirarlo, un cuadro realista y documental; el why solo lo descarta por la fecha («otro siglo»). Sustituir d por **w1237250** (Veronés, «Alegoría de la batalla de Lepanto», 1571). why: «Es del Renacimiento veneciano: la batalla abajo y, arriba, santos que interceden entre nubes. Una alegoría, no la crónica de un testigo.» |
| t-nace-imp-comun | CORREGIR | (G2) Se pierde una buena ocasión: en El balcón posa la pintora Berthe Morisot, que sale en el tramo siguiente. Propuesta para el why: «…en el balcón de Manet posa su amiga la pintora Berthe Morisot…». |
| t-nace-imp-rompe | OK | (G2, G3) |
| t-impresionistas-cual | OK | Nota de catálogo: el título de w3204212 incluye el autor («Inundación en Port Marly, por Alfred Sisley»), cosa que delataría al pintor si se muestra; limpiarlo en el catálogo (afecta a t-impresionistas-comun). |
| t-impresionistas-comun | OK | Ver la nota del título de w3204212. |
| t-sorolla-comun | OK | (G2) |
| t-sorolla-cual | CAMBIAR | El Fortuny de c («Viejo desnudo al sol») es luz de pleno sol pintada del natural; el propio why lo llama «precedente de Sorolla» y solo lo descarta porque no hay mar. Al mirarlo se puede defender como impresionista. Sustituir por **w1070896** (Aivazovski, «Novena ola», 1850). why: «Es romanticismo: el ruso Aivazovski pinta náufragos ante una ola gigante al amanecer. Mar y luz, sí, pero con drama, y pintado en el taller.» |
| t-orden-comun | OK | — |
| t-orden-rompe | CORREGIR | (G2: 70 caracteres, la más larga del banco.) En el why de d, «su compañero de tramo» es jerga de la app. Propuesta: «Eso es Seurat, que buscaba lo mismo por otro camino. Cézanne pinta con pinceladas planas y anchas, como ladrillos de color.» |
| t-color-cual | OK | — |
| t-color-comun | OK | — |
| t-suenos-comun | CORREGIR | «mujer fatal» suena hoy a tópico si va sin contexto. Propuesta para el why de b: «…Klimt la convierte en una femme fatale (la mujer que seduce y destruye, un mito de la época), con oro y mirada desafiante.» |
| t-suenos-cual | CORREGIR | El why de a es vago («una lección escondida») justo en la pregunta más difícil (cuatro desnudos, dos de espaldas). Propuesta: «Sí: un desnudo de espaldas al que miran unas viejas con aire de presagio. Romero de Torres convierte a Venus en símbolo del deseo y del pecado.» |
| t-romper-comun | OK | — |
| t-romper-rompe | CORREGIR | «quizá una botella» transmite duda. Hay que decir lo que se ve con seguridad o quitarlo: «Aquí sí hay objetos: una guitarra sobre una mesa. La abstracción total es la de Kandinsky o Malévich.» |

## Recuento

| Estado | Número |
|---|---|
| OK | 56 |
| CORREGIR | 20 |
| CAMBIAR | 6 |

Más los arreglos de sistema G1 (barajar, obligatorio) y G2 (longitudes, obligatorio), que afectan a todo el banco.

## Comprobaciones hechas sin problemas

- Ningún «porqué» pasa de 180 caracteres; todas las preguntas tienen fuente; los enunciados no preguntan fechas.
- Todas las obras «cual» son de la época que dice el «porqué» según `movementId` del catálogo.
- Firmas: todas las obras con firma o inscripción visible tienen `signs` para velarla (Durero, Marat, Arnolfini,
  Girasoles, Inocencio X…). En ningún caso el cuadro delata la respuesta de forma trivial. El riesgo está en los
  títulos del catálogo si llegaran a mostrarse (w3204212).
- Datos comprobados y correctos: punto de fuga de la Última Cena en la cabeza de Cristo; temple sobre lienzo en el
  Nacimiento de Venus; Durero de frente «como Cristo»; Courbet y el ángel que nunca vio; Entierro en Ornans de más de
  seis metros; naufragio de la Medusa de 1816 y Géricault en el hospital; Leroy y el título de Monet; Seurat, dos
  años con la Grande Jatte; Malévich y el rincón de los iconos; Sardanápalo sacado del drama de Byron; la Inquisición
  y la Maja desnuda; Rubens y sus Gracias hasta su muerte; los venecianos, el óleo y la humedad.

## Nota de tono

En general muy bien: frases vivas, términos explicados («temple (color mezclado con huevo)», «escorzo (la figura acortada
por la perspectiva)»). A vigilar: «vírgenes» en minúscula y en plural (renacimiento-cambia b, t-genios-comun b) se lee
mal hoy, justo el ejemplo que da CLAUDE.md; mejor «la Virgen» o «las Vírgenes». Picasso se nombra en tres «porqués» sin
estar en el catálogo: es muy conocido y se acepta.

## Correcciones aplicadas (generador, tras la revisión)

- G1: el motor baraja las opciones al montar cada pregunta (`engine/concepts.js` `conceptQuestion`), con prueba.
- G2: longitudes equilibradas; `tools/sync_preguntas.py` rechaza una buena más de 2 caracteres más larga que la mala más
  larga y que la buena sea la más larga (o la más corta) en más del 40 % del banco. Hoy: la más corta 14, segunda 16,
  tercera 16, la más larga 12, de 58 preguntas de texto.
- G3: fuera los diez «Es el primer…»; cada uno sustituido por otro distractor con su porqué.
- Todas las filas CORREGIR y CAMBIAR, con las obras propuestas (w867403, w594477, w4388208, w1237250, w1070896). En
  t-manierismo-cual, para no repetir la Gran odalisca ni la Virgen del cuello largo (ahora en manierismo-cambia), la buena
  pasa a ser la Alegoría de Bronzino (w1430990) con Tiziano, Ingres (Júpiter y Tetis) y Rubens de distractores.
- t-impresionistas-comun: fuera w3204212 (su título en el catálogo lleva el autor); entra la regata de Molesey (w3235227).
