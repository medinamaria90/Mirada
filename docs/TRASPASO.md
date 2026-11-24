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
- **Versión publicada hasta ahora:** v7, como página privada de Claude
  (https://claude.ai/artifact/J1Vrn64uAxVn3agRDpbBFm). Esa vía tiene un límite de 512 archivos y no es
  el destino final: **falta publicar en Render** (sitio estático; carpeta `app/`).
- **Repositorio:** github.com/medinamaria90/Mirada (público por ahora para que GitHub Actions sea gratis).
- **Contenido actual:** 235 obras, 75 pintores (32 con etapa), 9 movimientos. Imágenes de ≤1000 px.

## 2. Estado de calidad

- `node --test tests/`: 109 pruebas en verde. Humo e2e en verde.
- Puerta de calidad: rondas 1-3 no aprueban, 4 y 5 aprueban (v5). La ronda 6 (v6, tras añadir visor a
  pantalla completa y práctica nueva) **no aprobó** (UX 7). La v7 corrige lo que señaló (Leonardo sin
  repetir, dificultad 65-80 % para un alumno atento, carrera en «Es este», lupa, paso entre cuadros en
  Colección) pero **no ha pasado evaluador independiente**: es lo primero que hay que hacer.
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
8. **Mapa como árbol:** camino común (del Renacimiento en adelante) y **ramas extra** que se
   desbloquean (gótico/medieval, quizá «Maestros españoles»). Desplazable para ver lo bloqueado. Falta
   confirmar con ella si las ramas son opcionales (recomendado) u obligatorias. Arte clásico antiguo:
   se le desaconsejó como rama de pintores (casi no hay autores); no decidido.
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

## 4. Marca: dónde quedó

- Ronda 1 publicada: https://claude.ai/artifact/EQigNSbX1Az6yjM9FtdYsv (lienzo con tres rutas A «Museo
  vivo», B «Juego de mirar», C «Editorial»). Fuentes en `marca/` (`tools/gen.py` regenera).
- Respuesta de María: **estética de interfaz de B** (le gusta sobre todo la pantalla del camino con nodos
  redondos y botones con relieve), **tono de voz de A**, **logo: le convence más el de A** (vano con
  punto) que el de B; **no le gusta la letra de B (Rubik) ni tanta negrita**. Del color no ha opinado.
  La pantalla del camino le parece **vacía**: de ahí el escenario de época (§3.9).
- **Ronda 2: no entregada** (el agente se detuvo a medias; puede haber trabajo parcial en `marca/`).
  Debe traer: 3 variantes de logo a partir del de A; 3 parejas de letra más finas (pesos ≤ 600); 3
  opciones de color protagonista contenidas; pantallas de camino con escenario (Renacimiento y Barroco,
  más variante de siluetas), pregunta, ficha tipo historia, celebración y perfil; una mesa alta con el
  camino entero desplazable y una rama; y 4-5 preguntas rápidas. Todo en UNA sola página del lienzo
  (en la ronda 1 no veía B y C porque estaban en páginas distintas).
- El auditor de UX recomendó conservar paleta y serif actuales; el agente de marca, B. María eligió B con
  matices. Cuando se cierre la marca, se adapta la app.

## 5. Pendientes, en orden recomendado

1. **Evaluador independiente sobre v7** y corregir hasta aprobar.
2. **Refactorización de código** (sin cambiar lo que se ve; comparar capturas antes/después):
   - `app/css/main.css` (≈1.150 líneas) → dividir en variables, base, componentes y pantallas.
   - ~40 colores escritos a mano fuera de variables en CSS y ~10 en JS → a variables.
   - Partir `engine/planner.js`, `engine/progress.js`, `ui/screens/flows.js`, `ui/screens/home.js` (>450 líneas).
   - Añadir una comprobación automática que falle si aparece un color a mano.
3. **Catálogo de ~1.000 obras** (`pipeline/`, `catalogo/`): hecho el diseño, la lista de pintores con QID
   verificados (`pipeline/painters.json`), las candidatas por pintor (`pipeline/out/candidates/`) y una
   primera selección (`catalogo/seleccion.json`). **No se ha descargado ninguna imagen.** Fuente
   principal: Wikidata + Wikimedia Commons (títulos en español, cuadros del Prado). Corre en GitHub
   Actions al hacer push de `pipeline/RUN`; desde un ordenador normal puede ejecutarse directamente.
   Falta: descargar por lotes (1600 px), revisión visual de identidad de una muestra, construir
   `catalogo/obras.json`, y **migrar la app al catálogo nuevo** (sustituye las imágenes actuales, parte
   de ellas de una fuente sin licencia declarada). Lee `pipeline/NOTAS.md`.
4. **Publicar en Render** como sitio estático desde el repositorio.
5. **Fase 1 de la auditoría (≈1 semana):** primera sesión directa al cuadro, celebración por pasos,
   vibración/sonido/transiciones, distractores más creíbles (recalibrar anti-bots), arreglos rápidos
   (p. ej. el texto «¡Y sin haberlo visto antes!» sale en repeticiones; anillo de meta y sol de racha no
   se entienden sin etiqueta).
6. **Cerrar marca** (ronda 2 y siguientes) y aplicarla.
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
  imagen sin errores, 17 años sin confirmar (`confidence: medium`). «La Madonna del Prado» de Rafael
  (a89) es en realidad la «Madonna del Prato» (Viena): **corregir el título**.
- Los enlaces de reto de versiones anteriores abren rondas distintas (el planificador ha cambiado).
- María detuvo los tres agentes que quedaban en marcha (ronda 2 de marca, descarga de obras y la tanda
  de lupa/Colección/dificultad). Lo de la tanda estaba ya en commits y es la v7.
- No tocar Dibulíos ni otros proyectos suyos desde este.
