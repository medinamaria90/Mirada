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
- **Dónde se ve:** https://mirada.onrender.com (Render, sitio estático que sirve `app/` desde `main`;
  se redespliega solo con cada push, en segundos). María la mira ahí desde el móvil y da feedback: es
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
9. **Escenario de época en el camino:** fondo con arquitectura/paisaje de la época por la que avanzas
   (edificios renacentistas, catedrales en la rama medieval…). Quiere encargarlo a **Gemini** (su clave
   está en su Claude Code). Recomendación dada: probar antes una versión vectorial sobria y de bajo
   contraste; si se queda corta, Gemini con guía de estilo única.
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
    de identidad (y como herramienta de escritorio). Se decide al cerrar la marca.

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
4. **Catálogo de ~1.000 obras** (`pipeline/`, `catalogo/`): hecho el diseño, la lista de pintores con QID
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
