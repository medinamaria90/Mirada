# Auditoría de experiencia de usuario: Mirada frente a Duolingo, Tinder e Instagram

24/11/2026 · Auditor UX independiente · Solo lectura (versión servida desde `app/` hoy, posiblemente a medio cambiar).
Método: recorrido real con Chrome y emulación táctil a 390×844, en claro y en oscuro. Perfiles: usuario nuevo (primeros 5 min, jugando de verdad y fallando a propósito), día 2, día 7 (9 paradas dominadas, racha de 6) y camino terminado (32/32, racha de 45). Capturas en `docs/eval/ux/` (`a-*` primera sesión, `b-*` segunda etapa, `d7-*` día 7 en `l` claro / `d` oscuro, `end-*` camino terminado; las de `_exploracion/` son de prueba).

---

## 1. Diagnóstico en 10 líneas

1. **Minuto 1: buena entrada.** La bienvenida (`a-01`) y la portada de movimiento (`a-03`) están bien: tres cuadros en abanico, serif elegante y un solo botón. Da sensación de museo. Pero el primer toque te deja en un **inicio lleno de cosas** (`a-02`): anillo vacío, un sol con «0», «Curioso», una tarjeta negra, el Reto diario y 32 paradas con candado. Antes de jugar te enseña todo el panel de control.
2. **Minuto 1–2: «Conoce a» es una ficha de catálogo, no una experiencia** (`a-04`). Pista en un recuadro, un cuadro, tres líneas de texto pequeño y «Practicar» activo desde el cuadro 1/2. Se puede saltar sin haber mirado nada. Esto es exactamente lo de «en un segundo ya se supone que sé de Rafael».
3. **Minuto 2–3: el bucle de preguntas funciona y el feedback es correcto** (`a-07`, `a-12`): verde o rojo, la frase «Mira…» y el título. Pero no hay **subidón**: ni sonido destacado, ni vibración, ni movimiento con peso. «Eso es» y «+10 XP» se leen como un formulario bien hecho.
4. Las preguntas **se aciertan por descarte**: Leonardo contra Savrásov, Kramskói y Botticelli (`a-11`), o Rafael contra Fragonard y Petrov-Vodkin (`b-06`). Un usuario nuevo nota que «es fácil» sin haber aprendido, y eso abarata el «pintor dominado».
5. **Minuto 3: «Pintor dominado» tras 5 preguntas** (unos 30 s de juego en automático y 2–3 min con una persona). Además, la «Meta del día» queda cumplida en la primera ronda (+80 de 50 XP). Los dos logros llegan demasiado pronto y pierden valor.
6. **Pantalla de resultado** (`a-21`): un informe largo con todo a la vez (aciertos, XP, precisión, «Hoy has aprendido», meta, medalla, siguiente etapa, racha). Duolingo celebra **un logro por pantalla** y Mirada los apila en una lista.
7. **Minuto 5: vuelves a una lista vertical** (`a-22`). No se siente que se ha abierto un camino. No hay animación del nodo, ni cofre, ni nada que dé ganas de jugar «una más», salvo la tarjeta de Rafael.
8. **Día 7** (`d7-l-inicio`): el inicio arranca arriba del todo, con lo ya dominado, en vez de en el punto actual. El perfil (`d7-l-perfil-full`) es una cuadrícula de seis cajas de números, un selector de meta, medallas en lista y los ajustes mezclados. No hay identidad, ni escaparate, ni historia personal. «Muy antiguo» es un diagnóstico justo.
9. **Con el camino terminado** (`end-l-inicio`) queda «Ronda libre» y tres retos. No hay ramas nuevas ni una meta larga visible: el usuario con más compromiso no tiene adónde ir.
10. **Dónde se cae:** entre el minuto 3 y el 5 (la recompensa es plana y el mapa no ilusiona) y en el día 2–7 (no hay motivo de retorno más allá de la racha: no hay cofres, ni objetivos del día, ni colección que crece con sorpresa). La estética de base (paleta, serif, modo oscuro: `d7-d-*`) **sí está a la altura** y hay que conservarla. Lo que falta es **ritmo, profundidad y celebración**.

Errores vistos de paso: (a) en la repetición de una pregunta fallada («OTRA VEZ») el feedback dice «¡Y sin haberlo visto antes!», que es falso (`a-20`, `b-23`). (b) El anillo de la meta y el «sol» de la racha en la cabecera no se entienden sin etiqueta. (c) La meta diaria de 50 XP se cumple con una sola etapa, así que no funciona como meta.

---

## 2. Tabla comparativa por dimensión

| Dimensión | Duolingo | Tinder | Instagram | Mirada hoy | Nota | Brecha |
|---|---|---|---|---|---|---|
| **Primera sesión** | Juegas una lección antes de registrarte. Retrasar el registro dio en torno a +20 % de usuarios diarios ([Taplytics](https://taplytics.com/blog/duolingo-ab-test-onboarding)). El día 1 de racha se celebra antes del registro ([Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/streaks)). | Primera tarjeta en segundos y un único gesto. | Contenido a pantalla completa desde el primer segundo. | Sin registro (bien). Pero entre bienvenida y primera pregunta hay 3 pantallas (inicio, portada y «Conoce a») y el inicio enseña el sistema entero antes de jugar. | 6 | Ir de la bienvenida directo a Leonardo. El inicio se descubre después, con animación. |
| **Bucle central** | Lección corta, preguntas mezcladas, barra de progreso y combo. | Una decisión por pantalla, sin fricción ([Built In](https://builtin.com/articles/tinder-swipe-design)). | Toque para avanzar y deslizar para cambiar. | Rondas de 5–8 preguntas, limpias y bien medidas. Se acierta por descarte y «Conoce a» se puede saltar. | 6 | Fichas que enseñan de verdad, distractores plausibles y niveles por pintor. |
| **Feedback y celebración** | Animación de racha al extenderla: +1,7 % de retención a 7 días en nuevos ([Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). Celebraciones grandes solo en hitos. | El «match» es una pantalla aparte que rompe el ritmo. | Corazón animado con doble toque. | Hoja verde o roja correcta y sobria. El resultado es un informe en lista y no hay hápticos. | 5 | Celebración secuenciada (un logro por pantalla), sonido y háptico de acierto, cofre. |
| **Progreso visible** | Camino con nodos, unidades y una guía por unidad ([Duolingo](https://blog.duolingo.com/new-duolingo-home-screen-design)). | — | — | Lista vertical por movimiento y «0/32 dominados». Correcto pero sin emoción. No hace scroll al punto actual. | 5 | Árbol con tronco y ramas, auto-scroll y nodos que cambian de material (bronce, plata, oro). |
| **Recompensas** | XP, gemas, cofres por misiones y premios por hitos de racha (congeladores, objetos) ([Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/streaks)). Insignias por niveles ([Duolingo](https://blog.duolingo.com/achievement-badges)). | Recompensa variable (el match). | Likes. | XP, 15 niveles con nombre, medallas por pintor y movimiento, «Ojo de…» (meta larga) y salas. No hay sorpresa ni nada coleccionable aparte de los cuadros. | 4 | Cofres y objetos del mundo del arte con rarezas, y logros en bronce, plata y oro. |
| **Perfil e identidad** | Avatar, racha, liga, insignias juntas en un sitio y récords personales ([Duolingo](https://blog.duolingo.com/achievement-badges)). | Perfil con fotos grandes. | El perfil es un escaparate en rejilla. | Seis cajas de números, selector de meta, lista de medallas y ajustes mezclados (`d7-l-perfil-full`). Sin nombre ni avatar. | 3 | Perfil nuevo: identidad, «Mi museo», logros con niveles, estadísticas con gracia. Ajustes en una hoja aparte. |
| **Contenido y ritmo** | Mezcla de lo nuevo y del repaso, unidades cortas y guía por unidad. | Tarjetas a pantalla completa, rápidas. | Historias: toque para avanzar, unos 3 s por foto, deslizar para cerrar ([TechCrunch](https://techcrunch.com/2017/11/11/imagining-instagram-stories-first)). | El cuadro a pantalla completa (visor y lupa) es excelente. «Conoce a» es escueto: 2–3 cuadros con una frase cada uno. | 5 | Fichas tipo historia entre cuadro y cuadro. |
| **Retorno diario** | Racha separada de la meta: +3,3 % de retención a 14 días ([Duolingo](https://blog.duolingo.com/improving-the-streak)). Congeladores (máx. 2) y recuperación de racha. Notificaciones que «protegen el canal» ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)). | Las notificaciones de match. | Historias que caducan en 24 h. | Racha con un día de gracia, reto diario, repaso de 3 y detalle del día. Todo junto en un bloque «Hoy». No hay notificaciones (la plataforma no lo permite). | 5 | Tres objetivos del día con cofre, racha protegida visible e hitos de racha con premio. |
| **Compartir y social** | Ligas semanales: +17 % de tiempo de aprendizaje ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)). Racha con amigos y tarjetas de hito. | — | Compartir es nativo. | Reto diario y semanal con enlace copiado. Sin tarjeta visual. | 4 | Resultado tipo Wordle copiable y pantalla de «Mi cuadro del día» pensada para captura. |
| **Estética y movimiento** | Personalidad de marca fortísima: ilustración, personajes y animación con Rive ([Duolingo](https://blog.duolingo.com/shape-language-duolingos-art-style/)). | Mínima y centrada en la foto. | Minimalista; el contenido manda. | Paleta armoniosa, serif con clase y un oscuro muy bueno. Abuso de rótulos en mayúsculas espaciadas, tarjetas con borde por todas partes, iconos genéricos y transiciones casi inexistentes. | 6 | Subir el acabado (ver §3.10), con transiciones de elemento compartido y menos «cajas». |

**Media de Mirada: 4,9 / 10.** La base es sólida y bonita. La brecha está en profundidad, sorpresa y celebración, no en el color.

---

## 3. Los 12 cambios de mayor impacto (ordenados por impacto/coste)

### 1. Primera sesión «directo al cuadro» · (a) · Coste S · Riesgo bajo
**Problema.** El inicio, con su panel de control, aparece antes de la primera pregunta. Además, «Practicar» se puede pulsar sin mirar.
**Propuesta.**
- Bienvenida → «Empezar» → **directo a las fichas de Leonardo** (cambio 3). Se salta el inicio y la portada del Renacimiento: esa portada se ve después, como primera ficha.
- Al terminar la ronda: celebración secuenciada (cambio 2) y **solo entonces** aparece el inicio, con el nodo de Leonardo poniéndose dorado y la línea que «crece» hasta Rafael.
- La cabecera (racha, meta, nivel) se revela en ese momento con una sola burbuja: «Tu racha empieza hoy». Es un popup, no texto en la página.
**Principio.** Duolingo te hace jugar antes de enseñarte el sistema y antes de pedirte nada ([Taplytics](https://taplytics.com/blog/duolingo-ab-test-onboarding)).

### 2. Celebración secuenciada en lugar de informe · Coste S · Riesgo bajo
**Problema.** El resultado (`a-21`) apila 8 bloques. Ninguno se disfruta.
**Propuesta.** Una idea por pantalla, se pasa tocando y cada una dura unos 2 s:
```
[1] Cuadro estrella del pintor a sangre + sello que cae (stamp)   «Leonardo · Bronce»
[2] Contador de XP que sube + barra de nivel que se llena          «+80 XP»
[3] (si toca) Racha: llama/vela que se enciende, día 1 → 2         «2 días»
[4] (si toca) Cofre que tiembla → toque → se abre (cambio 6)
[5] Resumen compacto: 4/5 · 80 % · [Siguiente: Rafael ▶]  [Inicio]
```
Lo que no ha pasado no se enseña: no hay pantallas vacías. Con «Reducir animaciones», solo la pantalla 5.
**Principio.** Duolingo reserva las celebraciones grandes para los hitos y las encadena tras la lección ([Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). El «match» de Tinder es una pantalla propia que rompe el ritmo.
**Riesgo.** Que canse. Por eso cada pantalla se puede saltar con un toque y las pantallas 3–4 solo aparecen cuando hay algo.

### 3. Fichas tipo historia entre cuadro y cuadro · (b) · Coste M · Riesgo medio
**Problema.** «Conoce a» es escueto y se salta (`a-04`). No hay ningún momento de «aprender» que se disfrute.
**Propuesta.** «Conoce a» pasa a ser una **historia a pantalla completa** de 5–6 fichas. Arriba, barra segmentada. Toque a la derecha avanza, a la izquierda retrocede, mantener pausa y deslizar hacia abajo cierra. Cada ficha es **cuadro grande + una sola idea**, en 12–20 palabras como mucho:
```
┌──────────────────────────┐
│ ▬▬▬▬ ▬▬▬▬ ──── ──── ──── │  ← barra segmentada
│                          │
│     [cuadro a sangre]    │  ← fondo con el color dominante del cuadro, difuminado
│        ◯ ← círculo que   │  ← zona `focus` resaltada (anillo dorado que se dibuja)
│          se dibuja       │
│                          │
│  Sfumato                 │  ← palabra clave, serif grande
│  Sin contornos: la cara  │  ← una idea, 2 líneas
│  sale del humo.          │
└──────────────────────────┘
```
Tipos de ficha (plantillas reutilizables):
1. **Retrato del pintor:** obra emblemática, nombre, lugar y siglo. Una frase de quién fue.
2. **Rasgo 1 con detalle:** zoom animado a la zona `focus` (el recorte ya existe para el «Detalle del día»).
3. **Rasgo 2 en otra obra:** el mismo rasgo en un cuadro distinto, para generalizar.
4. **«No confundir con…»:** dos cuadros en vertical, el pintor frente al de `similarTo` (ej. Leonardo / Rafael), con una diferencia en una línea. Es la ficha que más enseña.
5. **Curiosidad:** una anécdota corta. Es lo que lo hace bonito, no solo útil.
6. **«¿Listo?»** con el botón **Practicar**. Solo aquí.

Además, **fichas intercaladas en la ronda**: tras acertar un cuadro nuevo, la hoja de feedback ofrece «Ver por qué» (un toque abre una ficha de una idea sobre ese cuadro y luego vuelve). Es opcional y no rompe el ritmo de quien va rápido.
**Principio.** Historias de Instagram: pantalla completa, toque para avanzar y una idea por pantalla ([TechCrunch](https://techcrunch.com/2017/11/11/imagining-instagram-stories-first)).
**Riesgo.** Hace falta texto nuevo para 32 pintores (unas 150 fichas). Las plantillas 1–3 y 6 se pueden montar con lo que ya hay (`hint`, `look`, `focus`). La 4 y la 5 piden redacción.

### 4. Niveles por pintor: bronce, plata y oro sin que parezca empollar · (b) · Coste M · Riesgo medio
**Problema.** «Pintor dominado» llega en 5 preguntas y se acierta por descarte.
**Propuesta.** Cada nodo tiene tres niveles. El material del marco del retrato cambia en el mapa.
- **Bronce · Reconocer:** la etapa de hoy, con fichas. **Distractores plausibles** (mismo siglo y pintores de `similarTo`), nunca Savrásov para Leonardo.
- **Plata · Distinguir:** se abre **a partir de 2 días** (repaso espaciado, no maratón). Solo cuadros nuevos, sin pistas, contra su pintor parecido («¿Leonardo o Rafael?»). Ronda de 6.
- **Oro · Ojo experto:** se abre 5 días después de plata. Reconocer **por un fragmento** (recorte `focus`), «el intruso» (4 cuadros, uno no es suyo) y alguna obra atribuida. Se funde con el «Ojo de…» actual.
- El nodo muestra «Plata en 2 días» con un reloj fino. Es una espera visible: crea motivo de retorno sin necesidad de notificación.
**No parece empollar** porque cada nivel cambia la *tarea* (reconocer, distinguir, detectar), no repite la misma, y porque el tiempo entre niveles es parte del juego.
**Principio.** Los niveles por habilidad del árbol antiguo de Duolingo, reconvertidos en su camino a niveles intercalados con repaso espaciado ([Duolingo](https://blog.duolingo.com/new-duolingo-home-screen-design)).
**Riesgo.** Hay que tocar el motor y las pruebas anti-bots. Necesita que cada pintor tenga 6 o más obras preguntables para la plata, o mezclar con las de su parecido.

### 5. Perfil a la altura · (c) · Coste M · Riesgo bajo
**Problema.** `d7-l-perfil-full`: seis cajas iguales, un selector de meta y ajustes mezclados. No dice *quién eres*.
**Propuesta.**
```
┌──────────────────────────┐
│ [portada: tu cuadro vivo │  ← fondo = obra elegida (o legendaria animada)
│   o favorito, a sangre]  │
│   (◉ avatar circular)    │  ← recorte de un retrato que eliges de tu colección
│   María                  │  ← nombre opcional (local)
│   Conocedora · desde nov │
│ ─────────────────────────│
│ 🕯 45 días  ◆ 9.800  ▣ 154│  ← 3 cifras grandes, sin cajas, con icono propio
│ ─────────────────────────│
│ Mi museo            Ver ›│  ← rejilla 3×3 de favoritos (doble toque ♡ en el visor)
│ [▣][▣][▣]               │     con el marco que hayas ganado (cambio 6)
│ [▣][▣][▣]               │
│ Logros             12/40›│  ← fila deslizable de sellos bronce/plata/oro
│ (◎)(◎)(◎)(◎)(◎)          │
│ Tu mirada                │  ← estadísticas con gracia, 1 línea cada una
│ «Has mirado 3 h 12 min de pintura»
│ «Tu ojo más fino: Caravaggio, 96 %»
│ «Tu siglo: el XVII»       │
│ «Racha más larga: 45 días»│
│ Calendario de racha (mes) │
└──────────────────────────┘          ⚙ (arriba a la derecha → hoja de Ajustes)
```
- **Logros con niveles**: cada logro tiene bronce, plata y oro (ej. «Racha»: 7, 30 y 100 días; «Ojo nuevo» (cuadros acertados sin haberlos visto): 10, 50 y 150; «Movimientos»: 3, 6 y 9). Se suman los **récords personales** (más XP en un día, ronda perfecta).
- Ajustes y «Empezar de cero» van a una hoja con el icono ⚙. La meta del día también va allí y se queda en la cabecera como anillo.
**Principio.** Duolingo juntó las insignias en un solo sitio del perfil, con niveles de dificultad y récords personales, porque estaban «escondidas y eran difíciles de celebrar» ([Duolingo](https://blog.duolingo.com/achievement-badges)). Perfil como rejilla y escaparate, al estilo de Instagram.
**Riesgo.** Bajo. Lo nuevo de datos es solo el favorito (doble toque) y el tiempo mirado.

### 6. Cofres y objetos coleccionables del mundo del arte · (d) · Coste M/L · Riesgo medio
**Problema.** No hay sorpresa ni nada que coleccionar aparte de los cuadros. Es lo que la dueña pide de su otra app.
**Propuesta: «El taller».**
- **Cuándo cae un cofre** (siempre por *aprender*, nunca por tiempo de pantalla):
  - **Cofre de madera:** completar los 3 objetivos del día (cambio 11). Uno al día como mucho.
  - **Cofre de plata:** subir un pintor a plata u oro.
  - **Cofre dorado:** completar un movimiento, y en los hitos de racha (7, 30 y 100 días).
- **Objetos y rarezas** (el color del borde va por material, nada estridente):
  - **Común, borde lino. Pigmentos:** bermellón, ocre, tierra de Siena, albayalde, verdigrís, negro de hueso… (24). Cada uno con una línea de historia: «El lapislázuli valía más que el oro».
  - **Raro, plata. Herramientas del taller:** pincel de marta, espátula, tiento, mortero, caballete, cuchillo de paleta… (16).
  - **Épico, oro. Objetos de maestro:** la paleta de Rubens, la cámara oscura (vinculada a Vermeer), el espejo convexo (vinculado a Van Eyck), la vela de La Tour, el sombrero de paja de Van Gogh… (12). Son ilustraciones propias, no fotos.
  - **Legendario, lapislázuli. «Cuadro vivo»:** una obra icónica con animación muy sutil en bucle: los remolinos de *La noche estrellada*, la ola de Hokusai, el humo de Turner, la llama en un cuadro de vela, la niebla en *Caminante sobre el mar de nubes*. Hay 6–8 y se hacen con CSS o canvas sobre la propia imagen (capas y desplazamiento), sin vídeo.
- **Probabilidades a la vista** en el propio cofre (madera: 80 % común, 18 % raro, 2 % épico), con **garantía**: un legendario cada 25 cofres de plata u oro como mucho. No se compra nada, nunca.
- **Qué se hace con ellos:**
  1. **Álbum** con huecos visibles («Pigmentos 7/24»). Es la meta larga.
  2. Los **pigmentos se combinan** en recetas sencillas para **restaurar marcos** (dorado, ébano, tallado), que visten los cuadros de «Mi museo».
  3. Los **cuadros vivos** se ponen de portada del perfil y de fondo de la cabecera de la Colección.
  4. Las herramientas desbloquean un **detalle de la lupa** (ej. el «cuentahilos» amplía ×3).
- **Apertura del cofre:** la tapa se abre con resorte, sale una luz cálida y el objeto sube y gira 15°, con háptico triple y una nota de cuerda. Un toque y se guarda.
**Principio.** Recompensa variable (Tinder, cofres de Duolingo), aplicada aquí solo a objetos *de colección*, nunca al aprendizaje en sí. Las rarezas siguen el patrón de las tiers de insignias de Duolingo ([Duolingo](https://blog.duolingo.com/achievement-badges)).
**Riesgo.** Ilustrar unos 50 objetos (coste de arte) y que la colección acabe pesando más que el aprendizaje ([Mogavi et al., 2022](https://arxiv.org/abs/2203.16175)). Por eso los cofres solo salen de aprender, y uno al día como mucho por objetivos.

### 7. El mapa como árbol: tronco común y ramas opcionales · (e) · Coste M (L si hay contenido nuevo) · Riesgo bajo
**Problema.** Lista vertical que no hace scroll al punto actual y no da ganas de explorar. Con el camino terminado no hay adónde ir.
**Propuesta.**
- **Tronco:** los 9 movimientos en un camino que **serpentea suavemente** (no en zigzag de juego). Nodos grandes con el retrato del pintor y el marco de su nivel (bronce, plata u oro). Al entrar, **scroll automático** al nodo actual. La cabecera de cada movimiento es una franja con su obra emblemática difuminada y su número romano.
- **Ramas** que salen a un lado del tronco como un sendero punteado. Antes de abrirse muestran un candado y una miniatura en gris con el texto «Al completar Barroco». **Nunca bloquean el tronco.** Con el catálogo actual ya hay material para varias, porque los pintores invitados existen:
  - **Maestros italianos** (desde Renacimiento): Botticelli, Miguel Ángel, Bellini y Correggio.
  - **Primitivos flamencos** (desde Manierismo y Norte): Van Eyck, y se amplía con contenido nuevo.
  - **Paisaje inglés** (desde Romanticismo): Turner, Constable y Gainsborough.
  - **Pintura rusa** (desde Realismo): Savrásov, Kuindzhi, Kramskói, Súrikov y Vasnetsov… Hay 25 pintores rusos en el catálogo y hoy salen sobre todo como distractores. Aquí lucen.
  - **Hacia la abstracción** (desde Simbolismo): Matisse, Kandinsky y Malévich.
  - **Pintura medieval** (rama *anterior* al Renacimiento, a la izquierda del primer nodo, que se abre al dominar el Renacimiento): Giotto, Duccio, Simone Martini y los iconos. **Requiere contenido nuevo** (coste L).
- Cada rama es corta (3–5 nodos) y tiene su propio sello de movimiento, que cuenta para los logros.
**Principio.** Duolingo pasó del árbol al camino porque la gente no sabía «cuál era la forma correcta» de avanzar ([Duolingo](https://blog.duolingo.com/new-duolingo-home-screen-design)). Por eso el **tronco es único y obvio** y las ramas son extras opcionales: se mantiene la claridad del camino y se recupera la exploración del árbol.
**Riesgo.** Que el mapa se vuelva denso. Una rama cerrada se ve como un trazo fino, y solo la abierta muestra sus nodos.

### 8. Gestos y contenido a pantalla completa · (f) · Coste M · Riesgo medio
**Problema.** Fuera del visor, el cuadro se ve como una miniatura dentro de una tarjeta.
**Propuesta.**
- **«¿Quién lo pintó?» a sangre:** el cuadro ocupa todo el fondo, con un velo inferior oscuro y las 4 opciones como botones translúcidos. El cuadro *es* la pantalla.
- **Las fichas** (cambio 3) **y la Colección** se recorren con toque o deslizando lateralmente, como historias.
- **Doble toque = «Me gusta»** (corazón dibujado en línea fina) en el visor y en la Colección. Alimenta «Mi museo». **Fuera de preguntas solamente.**
- **Deslizar hacia abajo cierra** cualquier pantalla completa (visor, ficha, celebración).
- **Transición de elemento compartido:** la miniatura «crece» hasta la pantalla completa y vuelve a su sitio al cerrar (View Transitions API, con alternativa a fundido).
- **Ronda relámpago «¿Es de Caravaggio?»** como modo *opcional de repaso*: tarjeta a pantalla completa, deslizar a la derecha «sí» y a la izquierda «no», 10 tarjetas y fin. Juzgar sí o no sobre un cuadro es una tarea perceptiva legítima. Pero tiene **límite y final** (ver §4).
**Principio.** Tarjeta a pantalla completa y gesto físico de Tinder ([Built In](https://builtin.com/articles/tinder-swipe-design)). Historias y doble toque de Instagram ([TechCrunch](https://techcrunch.com/2017/11/11/imagining-instagram-stories-first)).
**Riesgo.** Entra en conflicto con la lupa y con deslizar en el visor. Regla: con la lupa activa no hay gestos, y en preguntas no hay doble toque.

### 9. Sonido, hápticos y movimiento · (g) · Coste S · Riesgo bajo
**Problema.** No hay vibración (`navigator.vibrate` no aparece en el código) y el movimiento es escaso. El acierto no se *siente*.
**Propuesta (un patrón fijo por evento, siempre el mismo):**

| Evento | Sonido (ya hay `sfx`) | Háptico (`navigator.vibrate`, solo Android; en iOS no existe) | Movimiento |
|---|---|---|---|
| Tocar una opción | clic de madera muy corto | 8 ms | la opción se hunde 2 px |
| Acierto | dos notas ascendentes de celesta | 15 ms | marco verde que se dibuja y XP que sube flotando |
| Acierto de un cuadro nuevo | tres notas con un brillo | 15–40–15 | además, un destello dorado que recorre el borde del cuadro |
| Fallo | una nota grave suave, nunca un «buzz» | 30–30 | movimiento lateral de 4 px; nada rojo a pantalla completa |
| Combo 3/5/10 | sube un semitono cada vez | — | el número del combo hace un «pop» |
| Cofre | crujido de madera, cuerda en pizzicato | 20–60–20–60–80 | ver cambio 6 |
| Subir de nivel o sello | acorde breve de la era musical actual | 40–80–40 | el sello cae girando (el `stamp` ya existe) |

- Ajuste propio para «Vibración», con la misma regla que música y efectos. Con movimiento reducido no hay desplazamientos, solo fundidos.
- **Transiciones entre pantallas**: elemento compartido (cambio 8), deslizamiento lateral entre pestañas y subida desde abajo para las hojas. Todas de 200–280 ms con una curva suave de desaceleración.
**Principio.** Hápticos coherentes, que acompañan a lo visual, sin abusar y que se pueden apagar ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)). La animación como seña de identidad de Duolingo ([Duolingo, art style](https://blog.duolingo.com/shape-language-duolingos-art-style/)).

### 10. Dirección estética: que se sienta «cara» · (h) · Coste M · Riesgo medio
**Qué subir (válido para cualquier dirección):**
- **Menos cajas.** Hoy casi todo es una tarjeta con borde y radio de 20 (inicio, perfil, resultado). Se quitan bordes y se agrupa con espacio y filetes finos. El lujo es el aire.
- **Menos rótulos en mayúsculas espaciadas.** «CONOCE A», «CAMINO», «ACIERTOS», «EXPERIENCIA», «HOY HAS APRENDIDO»… aparecen 6–8 por pantalla y abaratan. Se dejan solo para un dato por pantalla.
- **Escala tipográfica de 4 tamaños, no 7.** Serif de títulos un punto más grande y con más contraste. Cifras en serif con numerales de estilo antiguo para estadísticas (como 45 · 9.800).
- **Iconos propios** de trazo fino de 1,5 px y del mundo del arte: vela para la racha (el sol se lee como «modo claro»), sello de lacre para el nivel, marco para la colección, paleta para el taller. El anillo vacío de la cabecera lleva un número dentro.
- **El cuadro a sangre y con luz.** Sombra suave y realista (dos capas, la de abajo más difusa) y un **viñeteado cálido** alrededor de la obra, como un foco de museo.
- **Color por movimiento en tonos de pigmento histórico** (ya está empezado): siempre apagado, como acento y nunca como fondo plano.
- **Microdetalles**: barra de progreso con extremo redondeado y un leve brillo al avanzar, números que cuentan en lugar de aparecer, sellos con relieve.

**Dirección A: «Sala nocturna»** (oscuro primero, el más «caro»)
- Fondo negro cálido `#12100E` → `#1B1815`. El texto principal es marfil `#EFE8DC` y el secundario `#A79E90`. Acento **oro viejo** `#B8985A` solo para logros y el nodo actual.
- Los cuadros se iluminan con un **foco**: un degradado radial cálido detrás, al 8 % de opacidad. Todo lo demás se retira.
- Tipografía: serif display de contraste alto (Cormorant Garamond, ya en uso, en 600 para títulos) y sans humanista (Inter, ya en uso) a 15–16 px. Interlineado generoso.
- Materiales: el oro y la plata de sellos y marcos con un **degradado metálico sutil** de tres paradas, no plano.
- Movimiento: lento y teatral (fundidos de 280 ms y «la luz se enciende» al entrar en una ficha).
- Referencia de sensación: la app de un museo de primer nivel por la noche. Encaja con el visor actual, que ya es oscuro.

**Dirección B: «Cuaderno del conservador»** (claro, editorial)
- Fondo de lino `#F4EFE7` con una **textura de papel** casi imperceptible (ruido al 2 %), tinta `#1E1B17` y una regla de color sepia `#8A6E4B`.
- Acentos por movimiento como **pigmentos**: verde tierra, bermellón apagado, azul esmalte, ocre. Cada movimiento tiene su «lomo» de color en el mapa.
- Tipografía editorial: serif de texto para las ideas de las fichas, a 18–20 px (que se lean como un libro), y versalitas reales para el único rótulo por pantalla.
- **Ilustración de grabado** a línea para los objetos del taller y los estados vacíos (pigmentos, pinceles), como un tratado antiguo.
- Ficha de cuadro como **cartela de museo**: título en cursiva, autor y fecha alineados a una retícula fija.
- Movimiento: preciso y de papel (las hojas suben como láminas, los sellos se estampan).
- Referencia de sensación: un libro de arte bien editado. Es más original y menos «app».

Recomendación: **B como modo claro y A como modo oscuro**, con un único sistema de componentes. Las dos comparten tipografías y la lógica de material (lino, plata, oro, lapislázuli).

### 11. Retorno diario: tres objetivos del día y racha protegida · Coste S/M · Riesgo bajo
**Problema.** La meta de 50 XP se cumple en una ronda. El bloque «Hoy» es una lista de tareas.
**Propuesta.**
- **Tres objetivos del día**, que rotan y se ven como tres anillos pequeños en el inicio. Ejemplos: «Reconoce 2 cuadros que no habías visto», «5 aciertos seguidos», «Abre un cuadro con la lupa», «Haz el repaso». Los tres cumplidos dan el **cofre de madera**. Sustituyen a la meta en XP como motivo diario (la meta de XP queda solo en Ajustes).
- **Racha protegida visible:** «Barniz protector» (el nombre del congelador de racha en Mirada). Se gana uno cada 7 días de racha, se pueden tener 2 como mucho y se aplica solo. En la vela de la cabecera se ve un pequeño escudo de barniz.
- **Hitos de racha (7, 30, 100 y 365 días)** con pantalla propia y cofre dorado. El resto de días, solo un «+1» discreto.
- La racha se extiende con **una ronda cualquiera**, separada de los objetivos.
- Sin notificaciones (la plataforma no las permite): el **motivo de retorno está dentro**. «Plata de Rafael disponible», «Tu cofre de hoy» y el detalle del día como primera historia del inicio.
**Principio.** Separar la racha de la meta: +3,3 % de retención a 14 días y +19 % de nuevos con racha ([Duolingo](https://blog.duolingo.com/improving-the-streak)). Permitir dos congeladores: +0,38 % de usuarios activos diarios ([Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). Hitos con celebración ([Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/streaks)).

### 12. Compartir sin Web Share: resultado copiable y pantalla para captura · Coste S · Riesgo bajo
**Problema.** La plataforma prohíbe Web Share y las descargas. Hoy solo se copia un enlace.
**Propuesta.**
- **Resultado del reto diario como texto tipo Wordle**, copiado con `clipboard.writeText` dentro del clic: «Mirada · 24 nov · 7/8 ▮▮▮▮▮▮▯▮ · ¿me ganas? <enlace>».
- **Pantalla «Mi cuadro del día»** en formato 9:16 pensada para hacer captura de pantalla: cuadro a sangre, título, «reconocido por María» y la racha. Un toque la abre desde la celebración.
- **Reto a un amigo** (ya existe): se ve como una tarjeta con el cuadro y no como un enlace suelto.
**Principio.** Tarjetas de hito diseñadas para redes, como las de Duolingo ([Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/streaks)). Compartir nativo, como en Instagram.

**Arreglos rápidos que no cuentan como cambio (hacer ya):** el texto «¡Y sin haberlo visto antes!» en las repeticiones, el scroll automático del inicio al nodo actual, etiquetar el anillo de meta de la cabecera, y bloquear «Practicar» hasta la última obra de «Conoce a».

---

## 4. Qué NO haría (y por qué)

1. **Ligas y clasificaciones contra desconocidos.** Duolingo ganó un +17 % de tiempo con ellas ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)), pero el estudio de foros de Duolingo documenta que la competitividad lleva a «farmear» XP y a perder el foco del aprendizaje ([Mogavi et al., 2022](https://arxiv.org/abs/2203.16175)). Para una app de *mirar con calma* es lo contrario de lo que se busca. Además, exige servidor y cuentas. Como mucho: reto con amigos por enlace (ya existe).
2. **Vidas, corazones o castigos por fallar.** En arte fallar es *parte* de aprender a mirar, y la hoja roja ya basta. Penalizar empuja a responder por descarte.
3. **Deslizar como forma principal de responder.** La propia crítica de Tinder dice que deslizar ocurre «más rápido de lo que se reflexiona» y que encaja mal en tareas educativas ([Built In](https://builtin.com/articles/tinder-swipe-design)). Solo lo usaría en la ronda relámpago opcional, de 10 tarjetas y con final.
4. **Feed infinito.** Ni la Colección ni nada debe ser infinito. El valor es que se acaba («154 cuadros») y que hay un final visible. El scroll sin fin destruye la sensación de logro.
5. **Mascota o personaje.** La pide el «modelo Duolingo», pero aquí los protagonistas son los cuadros. Un búho de museo abarataría el tono «caro» que quiere la dueña. La personalidad debe venir del material (sellos, marcos, pigmentos, luz).
6. **Notificaciones de culpa, aunque se pudiera.** El patrón del «búho que te persigue» está documentado como patrón oscuro, sobre todo con menores ([Deceptive Patterns](https://deceptive.design/articles/the-evil-bird-and-the-right-to-disconnect-children-s-vulnerability-to-exit-dark-patterns-in-gamified-educational-apps)). Y Duolingo mismo limita el volumen para «proteger el canal» ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).
7. **Cofres de pago, monedas o probabilidades ocultas.** La recompensa variable sin coste y con probabilidades visibles es un juego. Con dinero o con probabilidades opacas se convierte en tragaperras.
8. **Llevar la contraria a la dueña en tres puntos:**
   - **«Fichas muy desarrolladas» ≠ más texto.** Lo que falta es *más pantallas con una idea cada una*, no párrafos. Una ficha de 60 palabras rompe la regla de textos mínimos que ella misma pone. Tope: 20 palabras por ficha.
   - **Cofres en cada etapa no.** Si caen siempre, dejan de ser recompensa. Uno al día por objetivos más los de hitos. Su otra app tiene otro ritmo.
   - **Rama medieval: sí, pero no ya.** Necesita imágenes nuevas, textos y validar atribuciones. Primero las ramas que salen gratis con los pintores invitados que ya hay (italianos, rusos, paisaje inglés, abstracción). La medieval va en la fase de 3 meses.
9. **Copiar el zigzag de nodos de Duolingo.** Es su firma visual, y la SPEC prohíbe copiar. Un camino que serpentea con suavidad y retratos enmarcados es propio y más elegante.
10. **Zoom de página.** Coincido con la dueña en mantenerlo desactivado. La lupa del visor ya resuelve el «ver de cerca» con más gracia.

---

## 5. Plan en tres fases

**Fase 1 · 1 semana (todo S, sin contenido nuevo)**
- Arreglos rápidos (texto de las repeticiones, auto-scroll, etiqueta del anillo, «Practicar» al final).
- Primera sesión directa al cuadro (cambio 1).
- Celebración secuenciada (cambio 2).
- Hápticos, sonidos por evento y transiciones de elemento compartido (cambio 9).
- Limpieza estética: menos cajas y rótulos, iconos de vela y sello (parte del cambio 10).
- Distractores plausibles en las preguntas del pintor de la etapa (parte del cambio 4; obliga a recalibrar `antibot`).
- Objetivo: que los primeros 5 minutos den gusto.

**Fase 2 · 1 mes**
- Fichas tipo historia con las plantillas 1–3 y 6, con datos que ya existen, y redacción de las plantillas 4–5 para los 10 primeros pintores (cambio 3).
- Perfil nuevo con «Mi museo», logros con niveles y ajustes aparte (cambio 5).
- Tres objetivos del día, «Barniz protector» e hitos de racha (cambio 11).
- Cofres con pigmentos y herramientas, álbum y probabilidades visibles (cambio 6, sin legendarios todavía).
- Mapa con tronco serpenteante y nodos de material (cambio 7, sin ramas).
- Elegir y fijar el sistema A+B (cambio 10).
- Compartir copiable y pantalla para captura (cambio 12).

**Fase 3 · 3 meses**
- Niveles plata y oro por pintor con espera espaciada (cambio 4 completo).
- Ramas con los pintores invitados (italianos, rusos, paisaje inglés y abstracción) y, al final, la rama medieval con contenido nuevo (cambio 7).
- Cuadros vivos legendarios (6–8) y recetas de marcos (cambio 6 completo).
- Ronda relámpago opcional y doble toque «Me gusta» (cambio 8).
- Fichas 4–5 para los 32 pintores.
- Medir con datos locales y anónimos (si algún día hay servidor) qué celebraciones se saltan.

---

### Fuentes consultadas
- Duolingo. [How the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit) · [Improving the streak](https://blog.duolingo.com/improving-the-streak) · [New home screen design](https://blog.duolingo.com/new-duolingo-home-screen-design) · [Achievement badges](https://blog.duolingo.com/achievement-badges) · [Shape language / art style](https://blog.duolingo.com/shape-language-duolingos-art-style/)
- Lenny's Newsletter. [How Duolingo reignited user growth](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Taplytics. [Duolingo A/B test of delayed sign-up](https://taplytics.com/blog/duolingo-ab-test-onboarding)
- Deconstructor of Fun. [Duolingo streak mechanics](https://duolingo.deconstructoroffun.com/mechanics/streaks)
- Built In. [What makes swipe right such a compelling UX feature](https://builtin.com/articles/tinder-swipe-design)
- TechCrunch. [Imagining Instagram: Stories-first](https://techcrunch.com/2017/11/11/imagining-instagram-stories-first)
- Apple Human Interface Guidelines. [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) (página cargada solo en parte; pautas generales)
- Mogavi et al. (2022). [When gamification spoils your learning](https://arxiv.org/abs/2203.16175)
- Deceptive Patterns. [The evil bird and the right to disconnect](https://deceptive.design/articles/the-evil-bird-and-the-right-to-disconnect-children-s-vulnerability-to-exit-dark-patterns-in-gamified-educational-apps) (citado por su título; no leído entero)
