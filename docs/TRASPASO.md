# Traspaso de Mirada (24/11/2026)

Documento para el agente que continúa el proyecto en Claude Code. Las reglas permanentes están en
`CLAUDE.md`; aquí va el estado, lo decidido y lo pendiente. El detalle cronológico está en
`docs/BITACORA.md`.

## 1. Qué es y dónde está

- **Producto:** web app para aprender a mirar pintura clásica jugando. Cada pintor es una etapa:
  «Conoce a» (cuadros + rasgo «Fíjate en…») → ronda de preguntas (¿Quién lo pintó? / ¿De qué movimiento
  es? / ¿Cuál es de X?) mezclando pintores ya aprendidos. Racha, meta diaria, niveles, medallas, reto
  diario y semanal, reto a un amigo por enlace, colección, salas por movimiento, detalle del día,
  repaso espaciado, música sintetizada por época.
- **Dónde se ve:** https://mirada.onrender.com (Render, sitio estático que sirve `app/` desde `main`).
  El sitio se creó por URL pública sin conectar la cuenta de GitHub, así que **el push no dispara el
  despliegue**: tras cada push hay que lanzarlo (conector de Render, `trigger_deploy`, servicio
  `srv-dc2p5uks728c73b8ke80`; tarda unos 10 s) o que María conecte GitHub en el panel de Render para
  que sea automático. María la mira ahí desde el móvil y da feedback: es
  su forma de aportar, así que cada cambio visible se sube cuanto antes. La página privada de Claude
  (https://claude.ai/artifact/J1Vrn64uAxVn3agRDpbBFm, v7) ya no se actualiza.
- **Repositorio:** github.com/medinamaria90/Mirada (público por ahora para que GitHub Actions sea gratis).
- **Contenido actual:** 235 obras, 75 pintores (32 con etapa), 9 movimientos. Imágenes de ≤1000 px.

## 2. Estado de calidad

- `node --test tests/` en verde (más las pruebas nuevas de v8). Humo e2e en verde; el e2e completo
  también (los `ERR_ABORTED` al navegar ya no cuentan). En Windows el e2e corre con `MIRADA_PLAYWRIGHT`,
  `MIRADA_CHROME` y `MIRADA_PYTHON` (ver CLAUDE.md).
- Nomenclatura de la puerta de calidad desde el 24/11 por la tarde: **«vN, intento K de 5»** (los
  informes `docs/eval/ronda1-6.md` son los intentos de v1 a v6; a María el número de ronda acumulado la
  confundía).
- Historial: v1-v3 no aprueban, v4 y v5 aprueban, v6 no aprueba (UX 7). **v7, intento 1: NO APRUEBA**
  (UX 7, Adaptativo 7, Calidad técnica 7; informe `docs/eval/v7-intento1.md`, capturas `docs/eval/v7-1/`).
  Lo imprescindible de la ronda 6 quedó verificado y bien; lo que falló eran errores concretos (feedback
  falso al repetir, ficha de Colección cortada, «¿Cuál?» en escritorio, título de a89, imagen de a201,
  colores a mano, código muerto) y se corrigió en la **v8**. Lo de gusto (hueco en «¿Quién?» apaisado,
  distractores más creíbles, tablet, perfil) queda para después de la marca.
- **La puerta de calidad está en pausa por decisión de María**: no se ha hecho el intento 2. Se retoma
  cuando la app lleve la marca nueva (ver §5).
- Auditoría de UX frente a Duolingo/Tinder/Instagram: `docs/eval/auditoria-ux.md`. Nota media 4,9/10;
  12 cambios priorizados. Léela entera: marca la dirección del producto.
- Pruebas anti-trampa (`tests/antibot.test.js`): bots que no miran ≤ 5 % de rondas dominadas, alumno por
  descarte ≤ 25 %. No relajar esos umbrales en silencio.

## 3. Decisiones de María del 24/11 (vigentes)

1. **Cuadros a pantalla completa** en toda la app al pulsarlos; en «¿Cuál es de X?» se abre el visor y se
   responde con «Es este». **Sin zoom de página.** **Lupa** en el visor para ver detalles.
2. **Práctica:** como mucho una pregunta de calentamiento con un cuadro recién visto; el resto, cuadros
   no enseñados.
3. **Colección:** poder pasar de un cuadro a otro manteniendo el texto explicativo. Le gusta mucho.
4. **1.000 obras**, y lo primero que echa de menos es que haya «tan poquísimas obras por autor»
   (objetivo 8-12 por pintor; 12-15 los españoles principales).
5. **Sesgo español:** sobrerrepresentar autores españoles, **mezclados** en su época, sin bloque aparte.
   La ficha cuenta que son españoles.
6. **No empezar por Leonardo.** Se entiende empezar por el Renacimiento. Propuesta pendiente de su visto
   bueno: abrir con Botticelli y seguir con Rafael; Leonardo tercero o cuarto.
7. **Más profundidad por pintor, sin empollar:** lo actual es «el nivel 1». Formato acordado:
   **tarjetas informativas** bonitas entre cuadro y cuadro (técnica, vida, obra, época) sin examen; y, en
   niveles posteriores, **preguntas sin imagen mezclando autores** del tipo «¿Quién difuminaba los
   contornos como humo?» con 4 pintores como opciones. Descartado: preguntas obvias de comprensión y
   exámenes de biografía. Piloto escrito en `contenido/lecciones/` (Leonardo, Rafael, Velázquez: 12
   tarjetas cada uno, 24 pistas, con fuentes); **falta montarlo en la app** y una segunda pasada de
   fuentes contra museos.
8. **Mapa como árbol:** camino común (del Renacimiento en adelante) y **varias ramas opcionales**, no
   una (24/11 tarde): gótico, medieval, maestros españoles, arte clásico…; algunas pueden
   **encadenarse entre sí**. Opcionales confirmado: se abren al dominar el tramo, no bloquean el camino
   común. Desplazable para ver lo bloqueado. **Por decidir con ella:** si el camino se recorre de arriba
   abajo (como ahora) o **de abajo arriba**, «para que haya la sensación de que estás creciendo»;
   preparar las dos en el lienzo antes de tocar la app. Arte clásico antiguo: se le desaconsejó como
   rama de pintores (casi no hay autores); ella lo sigue nombrando, así que buscar un formato
   (mosaicos, frescos, cerámica, retrato de El Fayum) antes de descartarlo.
9. **Escenario de época en el camino:** fondo con arquitectura/paisaje de la época por la que avanzas.
   **Hecho (24/11, versión 1):** nueve ciudades vectoriales de baja intensidad, una por movimiento,
   continuas y sin costuras (`app/img/escenas/<movimiento>.svg`, generador `marca/tools/escenas.py`,
   guía de estilo en `marca/RONDA2.md`; página «Ciudades» del lienzo de la ronda 2). María: «está
   bien», pero los nodos y los puntos del camino pierden presencia sobre los edificios. **Decisión:
   NO se integran en la app** (los SVG se guardan como piezas en `marca/`, no en `app/img/`): se pasa
   directamente al mapa tipo Super Mario, que «va a dar un buen salto de calidad». Gemini no genera
   imágenes con su clave gratuita (cuota 0): se descartó para esto.
   **Dirección para la versión 2 (su idea de verdad):** un **mapa de mundo tipo Super Mario**: el
   camino serpentea por un paisaje en falsa 3D (isométrico) y entre parada y parada hay casitas,
   árboles, una iglesia, un puente, monumentos de la época en pequeño, a escala del camino, no
   fachadas grandes de fondo. Casa con los nodos redondos y con las ramas (un desvío literal del
   camino). Hacerlo cuando se diseñe el mapa en árbol (§3.8).
   **Diseñado (24/11, 17:00):** página «Mapa» del lienzo
   (https://claude.ai/artifact/3cjPwnjMsCBboSL6mGP15w#page-p2; generador `marca/tools/mapa.py`,
   mesas `marca/project-r2/Mapa-*.dc.html`, guía de estilo en `marca/RONDA2.md`): camino en zigzag
   por paisaje en falsa 3D (caballera), piezas pequeñas por época, nodos con anillo blanco, cofres,
   ramas como desvíos con cartel. **María decide: de abajo arriba, con «Tu museo» arriba como meta.**
   **Paisaje MÁS rico** (17:10: «se puede poner más edificaciones, más detalles, que sea más rico el
   fondo»; «mejora lo que hay»): más piezas por tramo, hitos más grandes y algo más de color, sin
   competir con cuadros ni texto. Isométrico limpio y cofres en el camino.
   **HECHO en la app: v10 (24/11, 18:35, en Render).** `ui/screens/path-map.js` (trazado, HTML,
   paisajes por IntersectionObserver, scroll a la parada actual), `ui/path-character.js` (muñeco con
   boina: respira en la parada actual, camina por el sendero al cambiar; sin animación con movimiento
   reducido), paisajes `app/img/mapa/<movimiento>.svg` (7-25 KB, generados por `tools/mapa_svg.py` +
   `tools/mapa-layout.mjs` desde las piezas de `marca/tools/mapa.py`, con los colores de `brand.css`
   y paleta nocturna por media query; la prueba avisa si quedan desincronizados: regenerar al cambiar
   el catálogo o `brand.css`), DOM en orden cronológico y `column-reverse` para subir, cofres solo
   visuales y cerrados, «Tu museo» arriba, `home.js` baja a 210 líneas. `tests/mapa.test.js` (8).
   Tope de archivos de `app/` subido a 400 en `tools/validate_catalog.py` (app/ tiene 330). El
   presupuesto de arranque del e2e completo oscila (33/492 frente a 32/440 con el mismo código, por
   el orden de carga de atlas y paisajes): subir a 34/500 con nota. Fuera: ramas (esperan al
   catálogo), ropa del personaje (fase 2), `blurb` del movimiento ya no sale en la cartela.
9 bis. **Personaje en el camino (DECIDIDO 24/11, 17:20: sí, sencillo y propio, animación mínima con
    sentido; estilo del mapa «limpio», no dibujado a mano; la fase 1 entra con el mapa):** un
    muñeco que avanza por el mapa, «medio animado», al estilo de las caritas de Dibulíos (inspiración,
    no las mismas), al que se le ponen los objetos que ganas: pincel en la mano, gorra o boina, túnica,
    una mascota al lado. Recomendación dada: sí, por fases: (1) personaje sencillo y propio en el
    estilo limpio del mapa, respira en el nodo actual y camina al siguiente al dominar un pintor (sin
    animación con movimiento reducido); (2) cuatro huecos (cabeza, mano, cuerpo, compañía) con 8-10
    objetos que salen de cofres y medallas, muchos como guiños a cuadros (boina de Velázquez,
    turbante de Van Eyck, perro de Las meninas); (3) armario en el perfil nuevo. Enlaza con §3.10.
10. **Recompensas tipo Dibulíos:** experiencia, metas visibles y duraderas, cofres, objetos
    coleccionables del mundo del arte, y **obras icónicas animadas** (con Gemini) como premio raro. La
    auditoría propone «El taller» (pigmentos, herramientas, objetos de maestro, cuadros vivos). Se le
    recomendó no generar «reliquias» con IA sino sacarlas de las propias obras; no decidido.
11. **Perfil:** el actual «queda muy antiguo, no está a la altura de Duolingo». Rehacer (propuesta en la
    auditoría: identidad, tres cifras, «Mi museo» en rejilla, logros oro/plata/bronce, ajustes aparte).
12. **Estética y experiencia:** «tiene que ser un placer estar en ella». Referencias: Duolingo, Instagram,
    Tinder.
13. **Código:** refactorización pedida (ver §5.2) y skill global `buenas-practicas-codigo`.
14. **Marca (en curso, por rondas):** ver §4.

Decisiones de la tarde del 24/11:

15. **Orden del trabajo:** primero la marca, después aplicarla a la app, y solo entonces la puerta de
    calidad. «No tiene sentido una puerta de calidad tan sofisticada sin haber hecho el rebranding.»
16. **Gemini solo para imágenes** (escenario de época, obras animadas). Nunca como evaluador ni para
    código o texto: se fía más de los agentes de Claude para eso.
17. **Límite de fallecimiento 1956** (dominio público en Europa), como SPEC y el validador; CLAUDE.md
    alineado. Matisse se queda.
18. **Mapa, tarjeta «Continuar» y medallas** siguen llevando a su sitio al pulsar el cuadro; el resto
    abre el visor. CLAUDE.md lo recoge.
19. **Quiere ver cada cambio en Render y dar feedback** («es lo más importante que yo aporte»). Subir a
    menudo; no acumular.
20. **Copia local del proyecto:** no quiere clones permanentes en su PC. Se trabaja en una carpeta
    temporal que se borra al acabar, o en la nube; nada se instala fuera de ella.
21. **Ampliar dentro del visor (pendiente, ligado a la marca):** la lupa «está bien, pero no es la mejor
    solución»; le gustaría pellizco con dos dedos dentro del visor, y duda si dejar la lupa «por el
    meme». Recomendación dada: pellizco y doble toque sobre la imagen del visor como gesto principal
    (sin tocar el bloqueo del zoom de página); la lupa se queda solo si la marca la convierte en gesto
    de identidad (y como herramienta de escritorio). **Decidido: pellizco y doble toque dentro del
    visor; la lupa se queda de guiño.** María lo echó en falta el 24/11 a las 18:10 («el zoom se
    sigue sin poder hacer en las imágenes de mi galería»): en curso (`ui/viewer.js`, módulo
    `ui/viewer-zoom.js` con límites puros y prueba; e2e con pellizco por CDP dentro del visor).

### Feedback de María jugando en Render (móvil real, tema oscuro, 24/11 16:00)

1. **Reto diario y detalle del día se confunden:** tras terminar el reto (10 preguntas), al subir ve el
   «Detalle del día» ya resuelto («Es de Johannes Vermeer») y cree que es el reto repetido. Dos bloques
   «del día» seguidos, el segundo ocupando media pantalla una vez resuelto. Propuesta dada: diferenciarlos
   (nombre propio tipo «Lupa del día», con la lupa como guiño, y que al resolverse se encoja a una línea
   con miniatura) o fusionarlos en un solo bloque «Hoy». **Decidido (María: «lo que tú me
   recomiendes»): diferenciarlos.** Nombre propio con el tono de voz A (p. ej. «Lupa del día») y
   bloque que se encoge a una línea con miniatura al resolverse. Hacerlo justo después de la v9 (marca),
   en la portada (`ui/screens/home.js`), con su prueba.
7. **El sol de la racha parece un interruptor de tema** (16:45): lo pulsó esperando pasar a modo claro
   (su móvil va en oscuro y la app sigue al sistema; no hay selector propio). Decidido: icono de
   racha que no sea un sol (llama o días) con etiqueta corta («1 día»), anillo de meta con su cifra
   («0/50»), y selector de tema en Perfil → Ajustes («Claro / Oscuro / Como el móvil», por defecto
   como el móvil, guardado en el estado con migración y prueba). **Hecho (17:20, en Render):** llama
   con «n días» apilado en el chip (en línea no cabía a 390 px), «20/50» junto al anillo, selector de
   tema en Perfil → Ajustes (`settings.theme`, **esquema v5**, `ui/theme.js`, `data-theme` en
   `<html>` puesto por un guion inline en `index.html` antes del primer pintado; `brand.css` lleva el
   bloque oscuro duplicado para `prefers-color-scheme` y `[data-theme="dark"]`, con prueba de que
   no se separen). Presupuesto de arranque del inicio: 29 peticiones / 440 KB. La «Lupa del día»
   también está hecha y en Render (`ui/screens/home-detail.js`, `tests/lupa.test.js`).
9. **Pistas de feedback que contradicen la respuesta (18:31):** en «¿Cuál es de Tiziano?» falló
   eligiendo la Virgen del canciller Rolin (Van Eyck, mucha tela roja) y el feedback dijo «Fíjate en
   los rojos intensos de las telas junto a pieles cálidas y doradas» con el Carlos V en Mühlberg
   (oscuro) como correcto: la pista encajaba mejor con el distractor. Causa: pista genérica del
   pintor (`traits`), no del cuadro. **Decidido: auditar y corregir** `engine/feedback.js`: tras un
   fallo en «¿Cuál?», usar el `look` del cuadro correcto o un rasgo del pintor que NO se cumpla en el
   cuadro elegido (anotar en el catálogo qué rasgos aplican a qué obras, o al menos evitar rasgos de
   color cuando el distractor los comparte); revisar todas las pistas de `catalog_data.py` contra sus
   cuadros; prueba que recorra todas las combinaciones correcto/distractor del motor.
   **Modelo definitivo (María, 18:45; aceptado):** cada cuadro lleva **dos pistas propias**, escritas
   mirando ese cuadro y con **fuente real** (comentario de museo o publicación), que expliquen por qué
   se nota que es de ese autor; el motor rota la pista al repetir fallo. Cada cuadro declara su tipo:
   **típico** (la pista enseña el rasgo del autor), **atípico** («no parece un X; lo reconoces por…»)
   o **de memoria** («este hay que sabérselo»; la pista cuenta algo del cuadro para fijarlo). Se
   escribe al seleccionar cada obra del catálogo grande (nivel 1 primero, ~400 obras), con revisión
   obra a obra. Para las 235 actuales, la auditoría de hoy es el apaño.
   **HECHO (24/11, 20:25, en Render):** motor `engine/feedback.js` con la regla (pista propia del
   cuadro correcto → rasgo del pintor cuyas etiquetas se ven en el correcto y no en el elegido → nada;
   «No es de X» con seña ausente solo si es segura); `feedbackFor(..., { retry, chosenId })` devuelve
   `chosen`; esquema en `tools/catalog_data.py` (`LOOK`, `LOOK2` con fuente, `LOOK_SOURCE`, `KIND`,
   `TAGS` con vocabulario cerrado `TAG_LABELS`/`NEGABLE_TAGS`, `TRAIT_TAGS`) y `catalog-text.json` v2;
   357 pistas revisadas cuadro a cuadro (3 cambiadas, 4 looks nuevos, 5 segundas pistas con fuente,
   2 atípicos: a182 Adoración de Velázquez y a236 Muchacho de El Greco); `tests/pistas.test.js`
   recorre 29.000 combinaciones. Prado, Mauritshuis, MoMA y Orsay bloquean lecturas automáticas
   (403): sus textos hay que leerlos a mano.
10. **Al fallar, decir de quién era lo elegido (18:50, «súper importante»):** en «¿Cuál es de X?»,
    línea «El que has elegido es de <pintor> · <título>» y etiqueta con el pintor sobre el cuadro
    elegido en la rejilla; en «¿Quién lo pintó?», «No es de <elegido>» (+ rasgo ausente si es seguro);
    el cuadro elegido se abre en el visor ya revelado. En curso en la misma tanda de feedback.
18. **Menos invitados en el camino común (23:10, decidido):** solo los invitados con alguna obra
    icónica (fame 3; p. ej. Ofelia, La balsa de la Medusa, El caminante sobre el mar de nubes) van
    intercalados en el camino común (≈ 25-30 en vez de 93); el resto pasa a **ramas opcionales por
    época, «Descubre <época>: pintores menos conocidos»**, que cuentan para subir de rango como los
    «a fondo». El catálogo no cambia (las obras se descargan igual); se decide en la migración con esa
    regla y ajustes a mano. Lavinia Fontana o Elisabetta Sirani: posible invitada más (pendiente).
17. **Ficha de pintor consultable (23:00, idea de María; recomendada dentro de la migración):** para
    los pintores que aparecen «por la cara» (93 invitados). En Colección, pestañas «Cuadros» y
    «Pintores» (lista por épocas, buscador, estado); se abre tocando el nombre del pintor en feedback,
    «Conoce a» y ficha de obra. Lleva fechas, país, época, 3-4 líneas de vida y aportación con fuente,
    «Fíjate en…», etapas (grandes maestros), **solo obras ya vistas** (sin spoilers), progreso y botón
    para jugar su etapa o «a fondo». Biografías breves de Wikipedia/Wikidata con enlace al principio;
    las de grandes maestros, con el piloto de `contenido/lecciones/`. **Aprobado (23:15): entra en la
    migración del catálogo.**
16. **Menos pintores con etapa, más obras cada uno (21:25, idea de María; recomendada):** con el
    catálogo tal cual saldrían ~100 etapas de ~8 obras (camino largo y plano; «a fondo» vacío en los
    pequeños). Propuesta: ~50 pintores con etapa (imprescindibles por época, españoles
    sobrerrepresentados) con 10-16 obras (6-8 de nivel 1 en su sección, el resto en su «a fondo»);
    ~100 invitados con 3-6 obras intercalados en el avance (se enseñan, se preguntan y salen como
    distractores) y con etapa propia en las ramas «a fondo». Se reajustan los objetivos por pintor
    del proceso (hay hasta 80 candidatas) y se relanza en Actions; total ~1.100-1.200. Pendiente: que
    María revise la lista de los 50 antes de tocar nada.
    **Refinado (21:35, intuición de María: «no es lo mismo un pintor que otro»):** tres categorías.
    (a) **Grandes maestros** (~12-15: Velázquez, Goya, El Greco, Leonardo, Rafael, Tiziano, Caravaggio,
    Rembrandt, Rubens, Monet, Van Gogh, Sorolla…) con **camino propio de 3-4 niveles por etapas de su
    vida** (ej. Goya: icónicas · cartones y juventud · retratos de corte y madurez · Desastres y
    pinturas negras), 16-24 obras; solo el nivel 1 es obligatorio en el camino común; los demás se
    desbloquean al hacer el 1 y son voluntarios. (b) **Maestros** (~35: Manet, Turner, Vermeer,
    Zurbarán, Murillo…) con etapa de 6-8 obras + un «a fondo». (c) **Invitados** (~100) con 3-6 obras
    intercaladas y etapa en el «a fondo» de su época. **Rango general tipo Duolingo**: subir de cierto
    nivel exige haber completado niveles profundos (p. ej. «Conservador: 3 caminos de gran maestro
    hasta el nivel 2»). Etapas de vida por año de Wikidata con cortes a mano y fuente biográfica.
    Catálogo ~1.200-1.300. Pendiente: propuesta de categorías y niveles para que la revise.
    **Profundidad variable (21:45; sin tope desde las 21:50):** cada pintor tiene su nivel básico más
    **0 a n niveles «a fondo»**: tantos como etapas reales de su obra con fuente, con ≥ 5 obras nuevas
    por nivel (Van Gogh, Goya, Rembrandt, Tiziano o Rubens pueden llegar a 5-6). **Las etapas son las
    que establecen los historiadores del arte para cada pintor, una a una y con fuente; no es una
    decisión algorítmica** (María, 21:55). Picasso, Dalí, Miró: fuera (muerte ≥ 1956); los
    niveles por etapas de vida de los grandes maestros son esos «a fondo» sucesivos. **Propuesta
    hecha (22:30): `docs/propuesta-pintores.md`**: 13 grandes maestros (Velázquez 4, Goya 5, El Greco 3,
    Murillo 4, Sorolla 3, Leonardo 1, Rafael 4, Tiziano 4, Caravaggio 3, Rubens 4, Rembrandt 4, Monet 4,
    Van Gogh 5 niveles «a fondo»), 42 maestros, 93 invitados; camino común de 55 etapas (abre
    Botticelli, Rafael 3.º, Leonardo 4.º); 1.547 obras (27 % españolas), en dos fases (1.192 + 355);
    8 rangos. Etapas de los artículos de Wikipedia en español con enlace; las marcadas «(verificar)» y
    todo lo demás, contrastar con museo o monografía antes de escribir fichas.
    **Decidido (22:40, María: «sigue con tus recomendaciones»):** Murillo gran maestro; Leonardo sigue
    de gran maestro con 1 «a fondo»; Zurbarán sube a gran maestro (3 etapas); dos fases (1.192 y luego
    +355); ampliar candidatas de Goya, El Greco, Murillo, Sorolla y Monet en la fase 2; abre
    Botticelli; invitados españoles con 4 obras; etapas de Murillo por las secciones de Wikipedia.
    En curso: aplicar la fase 1 al proceso de catálogo (Actions).
    Ajustes (22:55): Sisley a maestro (criterio del coordinador: núcleo del grupo impresionista);
    Caillebotte sigue de invitado con 1 «a fondo»; Cassatt y Vigée Le Brun con 1 «a fondo» (poca
    representación femenina; Artemisia y Morisot ya son maestras); nuevos invitados: Sofonisba
    Anguissola, Judith Leyster, Rosa Bonheur y Bazille; Regoyos invitado sin «a fondo».
15. **Más machacón, sin deprimir (19:50):** hoy «avanzo súper rápido»; con 1.000 obras teme que el
    avance se haga lento. Duolingo repite «una y otra vez lo mismo» sin desmotivar: quiere una
    **auditoría de cómo gestiona Duolingo el avance y la repetición** para copiarlo (en curso, con
    fuentes) y aplicarlo: más repaso (el `srs` existe pero apenas se ve), niveles por pintor, repaso
    de errores, pintores que se «agrietan», sin bloquear el mapa. **Hecha:**
    `docs/eval/auditoria-progresion-duolingo.md` (10 propuestas por impacto/coste; 1, 2, 5 y 6 con el
    motor actual; 3 y 4 con el catálogo grande; no copiar corazones, ligas ni avisos pasivo-agresivos).
    **Decidido (20:50): aprobados 1, 2, 3, 4, 5, 6, 7, 9 y 10. El 8 (dificultad automática por
    rendimiento) se descarta** porque un cambio invisible desconcierta, rompe el significado del 75 %
    y descoloca el anti-trampa; su parte buena va en el 4 (coronas y «Legendario» con distractores
    más parecidos, etiquetados como difíciles). En curso: 1, 2, 5, 6, 7 y 9 con el motor actual; 3, 4
    y 10 con la migración al catálogo grande.
14. **«Solo he visto 3 o 4 obras de Bruegel y ya está completado»** (19:10): hoy cada pintor tiene 4,8
    obras de media (2 en «Conoce a» + 2-3 preguntadas en su ronda); le gusta el intercalado con
    pintores anteriores (mantener). Propuesta para la migración al catálogo grande: «Conoce a» con 4-5
    obras de nivel 1; ronda con 3-4 obras propias no vistas + repaso intercalado (≈ 8 obras del pintor
    en su sección); el nivel 2 en la rama «a fondo», repasos, reto diario y Colección; y **«dominado»
    exige haber visto todas las obras de nivel 1** (en 1 o 2 rondas), no solo una ronda al 75 %.
    Pendiente de su OK.
13. **Test de cultura pictórica como gancho (idea de María, 19:05; recomendado sí):** página propia e
    indexable (`app/test/index.html`, título, descripción, imagen de vista previa), **24 preguntas
    fijas en tres tramos de 8** (María: 12 «me parece poco»; «que el que no tiene ni idea saque algo y
    el que sabe mucho saque mucho»): fácil (obras universales), media (pintor por estilo y época en
    cuadros menos famosos), difícil (parecidos: Tiziano/Veronés, Zurbarán/Ribera, Monet/Sisley,
    Manierismo/Barroco); las tres mecánicas y todas las épocas, con españoles. Resultado: nivel de la
    app + «n de 24» + desglose por tramo + frase; resultado parcial disponible en cualquier momento;
    compartir como el reto diario; «Sigue aprendiendo en Mirada». Sin progreso ni cuentas; reutiliza
    motor y catálogo. Dominio propio: **más adelante, por ahora no** (María, 21:15). Orden: tras la tanda de
    feedback, antes de migrar el catálogo grande. **Aprobado en lo esencial; arrancar.**
    **Adaptativo (19:20-19:30, su algoritmo):** banco de 5 tramos × 8 = 40 (fácil, media, difícil,
    experto, «friki»); bloques de 4: 3-4 aciertos sube de tramo, 2 repite, 0-1 se para («al tuntún»;
    «que pare cuando vea que ya no lo estás sabiendo, para ver tu conocimiento real»); test largo
    para quien sabe. Puntuación ACUMULADA (acierto × tramo: llegar más lejos es la medida).
    Resultado: «n de m», nivel, y **«Sabes más de pintura que el X % de la gente»** (percentil con
    distribución supuesta, documentada, marcada como estimación).
    **HECHO (24/11, 20:40, en Render): https://mirada.onrender.com/test/**. `app/test/` (index.html
    indexable con Open Graph y `portada.jpg` 1200×630, `preguntas.json` con 40 preguntas fijas en 5
    tramos), `app/js/test/` (motor adaptativo, resultado con percentil por bandas de
    `docs/eval/reconocimiento-fuentes.md`, pantallas, compartir), `app/css/test.css`,
    `tests/test-gancho.test.js` (12 pruebas con jugadores simulados). Pausa «Llevas 20 y vas muy bien»
    desde la 20. Último resultado en `localStorage` (`mirada.test.last`). Sin visor ni audio en el
    test. Faltan en el catálogo para el banco: Girasoles (firma), Guernica, Ofelia, Hay Wain, Sorolla,
    Zurbarán, Ribera, Hals, Pissarro, Sisley → revisar el banco al migrar el catálogo grande.
    Percentil reescalado al máximo honesto de 80 puntos (el perfecto ve 24 preguntas) para que llegue
    al 99 %. **Fallo que sufrió María (19:35): tocar una miniatura en «¿Cuál?» respondía** (quería
    verla en grande). Regla: el test se comporta como la app: tocar abre el visor, «Es este» responde;
    en «¿Quién?» el cuadro se abre en grande sin responder. En curso.
    **Rejugable (19:40, decidido):** «si hace 7 veces el test, 7 contenidos distintos»: clasificar todas
    las obras en los 5 tramos por reglas (fama, pintor con etapa o invitado, parecidos, mecánica) con
    ajustes manuales (`app/test/tramos.json`), bolsa generada en tiempo de ejecución, 8 por tramo
    sorteadas por partida con mezcla de mecánicas y épocas, evitando las dos últimas partidas; crece
    sola con el catálogo grande. En curso.
12. **«¿De qué movimiento es?» con años** (18:56): las opciones solo decían el nombre del movimiento
    («es un lío»); deben llevar su periodo («Renacimiento · s. XV–XVI»), y el feedback también. En
    curso en la tanda de feedback.
11. **«No me deja hacer el repaso»** (18:43): tenía 3/4 dominados y Veronés en «Por repasar · 63 %»;
    el repaso se abre al **dominar** a todos (regla intacta), pero el nodo solo mostraba un candado.
    **Hecho (en Render):** el repaso cerrado dice «Falta dominar a Veronés» / «Faltan X y n más» bajo el
    nombre, en la nota al pulsar y en el `aria-label` (`path-map.js`, `pendingLine`; prueba en
    `tests/mapa.test.js`). **Decidido (18:55): el repaso se abre al dominar** (no al jugar), y a
    cambio «lo de repetir tiene que estar más claro»: el nodo jugado sin dominar muestra «Repite · n %»
    como botón suave coral (hecho, en Render).
8. **Música:** la ha oído por fin: «se puede hacer más variada, temas un poquito más variados y que
   enganchen más». Plan: 2-3 variantes por época con más gancho (melodía memorable, bajo y ritmo
   marcados, secciones, instrumentación por época), página de escucha para que vote desde el móvil,
   y las elegidas entran en la app. Las pruebas de `tests/audio.test.js` (no satura, armonía) siguen.
   También quiere **música propia en la sección principal** (portada con el camino): un «tema
   principal de Mirada» con dos variantes, motivo corto reconocible que pueda asomar en celebraciones.
   **Hecho (24/11, 17:40):** 22 piezas nuevas (portada: «Umbral» y «Paseo» con motivo-firma
   mi–sol–la–do′; 2-3 por época) en `app/js/audio/variants/`, registro `audio/variants.js`, API
   `audio.setVariant(era, id)` / `listVariants` / `getState().variants` / `restore({variants})`;
   timbres y patrones de danza nuevos (`sustained.js`, `styles-dance.js`). **La original sigue
   sonando por defecto hasta que María elija.** Página de escucha: https://mirada.onrender.com/escucha.html
   (copia de `tools/audio-demo.html`; quitar de `app/` cuando se elija). Muestras wav de 28 s en la
   carpeta temporal `scratchpad\musica\muestras\` (se borran con la sesión). Pendiente: guardar
   `settings.variants` en el estado y pasarlo por `audio-bridge.js` a `restore`, o selector en Ajustes;
   motivo-firma en `sfx.js` para celebraciones si lo quiere.
   **Reacción de María (17:50):** «ha mejorado mucho»; le gusta el tema principal de la portada; el
   Barroco «no me encanta». Propone **arreglos simplificados de obras de dominio público** (Bach,
   Vivaldi, Mozart, Chopin, Debussy, Satie, y españoles: Narváez, Sanz, Soler, Albéniz, Granados,
   Falla) «para partir de una partitura que ya sabemos que funciona». Es legal (autor muerto > 70 años
   y lo toca nuestro sintetizador); arreglo propio, nunca copiar una edición moderna. En curso: fila
   «Clásicos (dominio público)» por época en la página de escucha, con `source` y `arrangement`.
   Le gusta la idea de «Guárdame las vacas». **Aviso suyo: un timbre de cuerda pulsada suena
   «demasiado metálico»** (los Karplus-Strong: laúd, guitarra, clave): suavizar (filtro más cerrado,
   ataque menos brillante, cuerpo de madera), medido por espectro.
   **DECISIÓN (19:00): la música se aparca hasta la v2; antes va el catálogo grande.** Lo compuesto
   queda en el repo (variantes, clásicos que se terminaran, página de escucha) sin cambiar lo que
   suena por defecto; María no ha votado todavía.
2. **«No puede ser que el Renacimiento sean 5 autores»:** ve 4 etapas (Leonardo, Rafael, Tiziano,
   Veronés) + repaso y le parece inaceptable; Botticelli y Miguel Ángel están de invitados (2 obras) y
   el resto del Renacimiento va en otro tramo («Manierismo y Renacimiento del Norte»), lo que también
   confunde. Respuesta dada: lo arregla el catálogo de 1.000 obras (26 pintores renacentistas), y el
   camino debe agrupar por tramos con sentido (Florencia temprana, Alto Renacimiento, Venecia, Norte,
   España), manteniendo al pintor como unidad. **El catálogo grande sube a pendiente inmediato tras la
   v9.** Sugirió «a lo mejor no dividir tanto por autores»: tenerlo presente al diseñar los tramos.
3. **Cuántas obras reconoce una persona culta:** se le explicó la diferencia entre reconocer obras
   concretas (200-400 una persona culta; > 1.000 es nivel historiador) y atribuir cuadros nuevos a un
   pintor por su mano (80-150 pintores), que es lo que enseña Mirada. Las 1.000 obras son material
   de aprendizaje, no lista a memorizar. El perfil debería mostrar las dos cifras: «cuadros que
   reconoces» y «pintores que distingues».
4. **Camino lateral para profundizar por época (DECIDIDO por María el 24/11: sí, «Barroco a fondo» y
   equivalentes; se construye después del catálogo grande):** acabado el Barroco, poder
   elegir entre seguir al Rococó o entrar en «Barroco a fondo»: otra tanda de obras de los mismos
   pintores, pintores secundarios de la época y las preguntas sin imagen entre autores. Es el «nivel
   2» de §3.7 convertido en rama opcional. Condiciona el catálogo: cada obra lleva su nivel (1 o 2)
   desde la selección.
6. **Ficha de obra (DECIDIDO 24/11):** cada obra tiene ficha: qué representa (2-3 líneas, sin
   empollar), cuándo se pintó, dónde está hoy (museo y ciudad; decir si es en España), técnica y
   tamaño. Se abre **voluntaria y a un toque** desde el feedback de la ronda (una «i» junto al título;
   la tarjeta se gira; si no se toca, «Siguiente» sin más) y es **la misma ficha de la Colección**
   (ampliar la actual). Nunca obligatoria en medio de la ronda. Datos con fuente: museo, fecha, técnica
   y medidas desde Wikidata en el catálogo grande; el «qué representa» se escribe y contrasta con la
   web del museo al seleccionar cada obra (como las fichas de pintor del piloto).
5. **Obras representativas, nunca al azar:** la selección del catálogo grande ordena por fama con datos
   públicos (sitelinks de Wikipedia, museo, enlaces) y entran primero las más representativas de cada
   pintor; las menos conocidas, al nivel 2. Antes de darla por buena, revisión obra a obra.

## 4. Marca: dónde quedó

- Ronda 1 publicada: https://claude.ai/artifact/EQigNSbX1Az6yjM9FtdYsv (lienzo con tres rutas A «Museo
  vivo», B «Juego de mirar», C «Editorial»). Fuentes en `marca/` (`tools/gen.py` regenera).
- Respuesta de María: **estética de interfaz de B** (le gusta sobre todo la pantalla del camino con nodos
  redondos y botones con relieve), **tono de voz de A**, **logo: le convence más el de A** (vano con
  punto) que el de B; **no le gusta la letra de B (Rubik) ni tanta negrita**. Del color no ha opinado.
  La pantalla del camino le parece **vacía**: de ahí el escenario de época (§3.9).
- **Ronda 2 publicada** (24/11 por la tarde): https://claude.ai/artifact/3cjPwnjMsCBboSL6mGP15w,
  todo en una página. Fuentes en `marca/project-r2/` y `marca/tools/r2_*.py` + `gen_r2.py` (regenera;
  `marca/RONDA2.md` explica). Propuesta del agente: logo 2 «Pieza» · letra 1 Fraunces + Figtree · coral
  contenido; escenarios de época en SVG sobrio (si se quedan cortos, Gemini: ver §3.9 y el aviso de la
  cuota en §6).
- **Respuesta de María (24/11, tarde), marcada a lápiz sobre el lienzo y confirmada en chat:** **logo 2
  «Pieza»** (vano relleno, punto en hueco), **letra Outfit** (una sola familia, pesos ≤ 600; no la
  propuesta Fraunces + Figtree), **color coral contenido** (`#E27D66`). **Escenario:** el fondo tenue de
  un solo edificio «se queda corto»; quiere una **ciudad de época continua y rica** (muchos edificios)
  por la que te desplazas y que cambia con cada movimiento; se hace **vectorial** (SVG) aquí, no con
  Gemini (no hay cuota de imágenes). Vio **líneas que se rompen** en la mesa del camino entero (tramos de
  escenario que no casan): revisar. **Rama extra: opcional.** Lo que trajo la ronda 2: 3 variantes de logo a partir del de A; 3 parejas de letra más finas (pesos ≤ 600); 3
  opciones de color protagonista contenidas; pantallas de camino con escenario (Renacimiento y Barroco,
  más variante de siluetas), pregunta, ficha tipo historia, celebración y perfil; una mesa alta con el
  camino entero desplazable y una rama; y 4-5 preguntas rápidas. Todo en UNA sola página del lienzo
  (en la ronda 1 no veía B y C porque estaban en páginas distintas).
- El auditor de UX recomendó conservar paleta y serif actuales; el agente de marca, B. María eligió B con
  matices. Cuando se cierre la marca, se adapta la app.

## 5. Pendientes, en orden recomendado

1. **Cerrar la marca** (ronda 2 en curso; las que hagan falta) y **aplicarla a la app**: logo, letra
   (local, pesos ≤ 600), color, botones con relieve, nodos redondos, escenario de época en el camino.
   Subir a Render cada paso visible para que María opine.
2. **Puerta de calidad sobre la app con marca** («v9, intento 1 de 5» o el número que toque), y de paso
   lo de gusto que dejó el intento 1 de la v7 (`docs/eval/v7-intento1.md` §Mejora: hueco en «¿Quién?»
   apaisado, distractores más creíbles con el anti-bots recalibrado, tablet desde 768, perfil).
3. **Refactorización de código** (sin cambiar lo que se ve; comparar capturas antes/después):
   - `app/css/main.css` (≈1.150 líneas) → dividir en variables, base, componentes y pantallas.
   - Los ~29 colores a mano que quedan en CSS fuera de `:root` → a variables (los del visor y los de JS
     ya están; una prueba en `tests/` vigila que el número solo baje y que en JS no haya ninguno).
   - Partir `engine/planner.js`, `engine/progress.js`, `ui/screens/flows.js`, `ui/screens/home.js` (>450 líneas).
4. **Catálogo de ~1.000 obras** — **estado 24/11, 20:50:** `catalogo/obras.json` con 1.180 obras de 148
   pintores (336 de españoles), fichas de Wikidata (museo, ciudad, técnica, medidas) y `level` 1|2;
   icónicas forzadas (`pipeline/extra.json`), descartes a mano (`excluir.json`), ajustes
   (`ajustes.json`). Las imágenes NO van al repo ni al PC: release de GitHub `catalogo-img`, descarga
   en Actions por 8 lotes de 150 (4 hechos a las 19:45). Plan de migración en 7 pasos al final de
   `pipeline/NOTAS.md`. **Decidido por María (21:05): las imágenes llegan a Render al desplegar**:
   Actions prepara un paquete a 1200 px como recurso de la release y el comando de construcción de
   Render lo baja y lo coloca en `app/img/`; nada pesado en el repo ni en su PC; en local, un script lo
   baja a una carpeta temporal. Render no se cambia hasta la migración. Migración después de la tanda de repaso (v12),
   porque ambas tocan el esquema del estado (v6 el repaso, v7 la migración).
   Texto original del pendiente: **Catálogo de ~1.000 obras** (`pipeline/`, `catalogo/`): hecho el diseño, la lista de pintores con QID
   verificados (`pipeline/painters.json`), las candidatas por pintor (`pipeline/out/candidates/`) y una
   primera selección (`catalogo/seleccion.json`). **No se ha descargado ninguna imagen.** Fuente
   principal: Wikidata + Wikimedia Commons (títulos en español, cuadros del Prado). Corre en GitHub
   Actions al hacer push de `pipeline/RUN`; desde un ordenador normal puede ejecutarse directamente.
   Falta: descargar por lotes (1600 px), revisión visual de identidad de una muestra, construir
   `catalogo/obras.json`, y **migrar la app al catálogo nuevo** (sustituye las imágenes actuales, parte
   de ellas de una fuente sin licencia declarada). Lee `pipeline/NOTAS.md`.
5. **Fase 1 de la auditoría (≈1 semana):** primera sesión directa al cuadro, celebración por pasos,
   vibración/sonido/transiciones, distractores más creíbles (recalibrar anti-bots), arreglos rápidos
   (anillo de meta y sol de racha no se entienden sin etiqueta; lo del texto «¡Y sin haberlo visto
   antes!» ya está hecho en v8).
6. ~~Publicar en Render~~ hecho (https://mirada.onrender.com). ~~Cerrar marca~~ pasa al punto 1.
7. **Fichas tipo historia + pistas entre autores** en la app (piloto de 3 pintores → 32 → todos).
8. **Perfil nuevo, cofres y colección de objetos.**
9. **Mapa en árbol con ramas y escenario de época** (Gemini o vectorial).
10. Más adelante: obras animadas como premio, duelo en tiempo real con un amigo, versión de música clásica
    con el mismo motor.

## 6. Avisos

- La **música** la han validado pruebas automáticas (no satura, armonía correcta) pero nadie la ha
  escuchado: pídele opinión a María.
- No se ha probado en **móvil real, Safari/iOS ni lector de pantalla**. El bloqueo del pellizco en iPhone
  depende de `touch-action` y hay que comprobarlo.
- Títulos y años del catálogo actual salen del conocimiento de agentes; ~150 obras contrastadas con su
  imagen sin errores, 17 años sin confirmar (`confidence: medium`). El título de a89 (Rafael) ya está
  corregido a «La Madonna del Prato» (Viena).
- Los enlaces de reto de versiones anteriores abren rondas distintas (el planificador ha cambiado).
- La imagen de a201 (La Virgen de las rocas) es ahora la completa de Commons (612×1000, dominio
  público); el evaluador sugirió mirar también a235 (proporción 0,67 frente a 0,77 real) y a184 (si es
  solo la tabla central, decirlo en el título), y las inscripciones de a157 (Durero) y a22 (Arnolfini)
  por si deben ir como `spoiler`.
- Pulsar cuadros en Chrome con ventana hace sonar la música: en las pruebas, Chrome siempre headless y
  con `--mute-audio` (María los oía).
- Las sesiones anteriores detuvieron agentes a medias; lo que había en commits es la v7.
- No tocar Dibulíos ni otros proyectos suyos desde este.
