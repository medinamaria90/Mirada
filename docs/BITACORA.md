# Bitácora de la noche — Mirada

Registro de decisiones tomadas mientras María duerme (23–24 nov 2026).

## Decisiones de partida

- **Nombre provisional:** Mirada.
- **Dónde se publica:** página privada (artifact). No se ha desplegado en Render: María dio
  permiso, pero no puedo crear un repositorio nuevo en su GitHub desde aquí (la credencial de
  la herramienta `gh` no es válida y no hay otra vía para crear repos). No se ha tocado ningún
  repositorio existente.
- **Imágenes:** la página privada no carga imágenes remotas y este entorno no puede descargar
  de los museos (bloqueado por la política de red). Solución: dataset público en GitHub
  `irinainina/image-data` (241 reproducciones de cuadros famosos con autor, título y año, usado
  en un ejercicio de curso de RS School). Se incluyen solo artistas fallecidos antes de 1956 y
  obras anteriores a 1930; títulos y años revisados y traducidos al español.
  - Pendiente para un lanzamiento público: sustituir por imágenes de colecciones abiertas de
    museos (Met, Art Institute of Chicago, Rijksmuseum…), que tienen licencia explícita CC0.
- **Sin Velázquez/Goya al principio** quedó obsoleto: el dataset sí trae 8 Velázquez y 4 Murillo.
- **Arquitectura:** vanilla JS en módulos ES, sin build ni dependencias; lógica pura en
  `js/engine` con pruebas `node:test`; estado versionado; audio sintetizado.
- **Modelos:** agentes ligeros (Sonnet) para catálogo, audio y evaluadores; modelo potente solo
  para la arquitectura y la app principal.

## Oleadas

- Oleada 0 (23:11): prototipo de una página con 5 pintores (referencia de flujo).
- Oleada 1 (23:20): en paralelo — catálogo, motor de audio y app V1.

## Oleada 2 — integración y primera publicación (23/11, 22:49 UTC)
- Catálogo + audio + app integrados. `node --test tests/` 44/44. Recorrido e2e en Chrome 390×844 con audio integrado: 25 capturas, 0 problemas de consola.
- Publicado v1 como artifact privado: https://claude.ai/artifact/J1Vrn64uAxVn3agRDpbBFm (slug 89bd2448-d3b4-4d0e-afd2-77a562f41200, versión 1795474155-d208, 245 archivos).
- La autoevaluación del agente APP NO cuenta como puerta de calidad (no hubo evaluador independiente). Rendimiento 7 por miniaturas de 1000 px.
- Pendiente oleada 3: miniaturas, evaluador independiente, movimientos sin pintores con etapa (rococó, simbolismo), cuadro con inscripción que delata (Dama del armiño), guardar ronda en curso, intro de movimiento.

## Evaluación independiente, ronda 1 (v1) — NO APRUEBA
Material 3: 8 · UX: 7 · Accesibilidad: 8 · Rendimiento: 8 · Adaptativo: 8 · Pulido: 7 · Originalidad: 7 · Calidad técnica: 8. Informe: docs/eval/ronda1.md.
Fallo grave (contenido): sesgo ruso del catálogo y salto de dificultad en las etapas 11-19. Otros: preguntas de movimiento que se delatan por descarte, práctica repetitiva (misma obra 2-3 veces), pistas genéricas, final de ronda poco celebratorio, tarjetas que parecen pulsables y no lo son, "Repaso" en movimientos de un pintor, ronda sin guardar, cabecera < 48 px, hoja de salir recortada al 200 %.
Plan: oleada 3 (en curso) cubre miniaturas, salas, intro, ronda guardada, tramo ruso. Oleada 4: arreglos del evaluador + celebración. En paralelo, agente buscando más cuadros (Goya, El Greco, Botticelli…) en staging/.

## Oleada 3 terminada (sin publicar aún)
Miniaturas (198, 3,56 MB), 7 obras marcadas `spoiler`, salas para movimientos sin etapas, intro de movimiento, ronda en curso guardada (esquema v2), Realismo en dos tramos. Tests 55/55, e2e 41 capturas sin errores. Sin evaluador independiente todavía.
Staging: 37 obras nuevas (b1-b37) de lorien-danger/knack-paintings (CC0 declarado, máx. 640 px). Sin cubrir: Murillo, Zurbarán, Ribera, Sorolla, Fragonard, Ingres, Botticelli.

## Oleada 4 (en curso, dos agentes en paralelo)
- 4A catálogo: incorporar las 37 obras, etapa propia con ≥3 obras, máx. 4 rusos con etapa (Aivazovski, Shishkin, Repin, Levitán), pistas visuales exclusivas y campo `look` por obra.
- 4B app: todos los arreglos del evaluador + celebración, combo, meta diaria, más niveles, escritorio.
Decisión: no publico la oleada 3 sola; se publica junto con la 4 (v2) y se pasa la ronda 2 del evaluador. La v1 publicada sigue funcionando.

## v2 publicada (versión 1795478112-34ab, 482 archivos)
Incluye oleadas 3 y 4: 235 obras, 32 etapas en 9 movimientos (máx. 4 rusos con etapa), pistas visuales por pintor y `look` por obra, curva de dificultad suave (salto máx. 0,10), celebración, combo, meta diaria, 15 niveles, ronda libre, escritorio. Tests 71/71, e2e 39 capturas sin errores.
Incidencia: un artifact admite como máximo 512 archivos por versión. La tercera tanda falló y la página estuvo unos minutos con 81 miniaturas rotas. Arreglo: las imágenes de ≤700 px hacen de miniatura ellas mismas (37 archivos menos). Margen actual: 30 archivos. Si el catálogo crece, habrá que agrupar miniaturas en hojas o empaquetar el JS.
Publicación delegada en un agente ligero con listas en docs/publish_batch*.json.
Siguiente: evaluador independiente ronda 2.

## Evaluación independiente, ronda 2 (v2) — NO APRUEBA
Material 3: 8 · UX: 7 · Accesibilidad: 8 · Rendimiento: 8 · Adaptativo: 8 · Pulido: 8 · Originalidad: 8 · Calidad técnica: 7. Informe: docs/eval/ronda2.md.
Fallo grave: trampa del planificador (se domina una etapa eligiendo siempre al pintor de la etapa; Leonardo 100 % de las rondas). Resueltos 19 de 25 problemas de la ronda 1. Contenido: 48 obras contrastadas, ningún autor ni título erróneo.
Oleada 5 (en curso): anti-trampa con test, "Practicar" fijo, zoom 200 %, feedback corto, atlas de miniaturas (<320 archivos), primera pantalla más ligera, retos validados, desbloqueo con ≥50 %, repaso rápido.

## v3 publicada (versión 1795481675-5643, 303 archivos)
Oleada 5: planificador anti-trampa (peor caso 1,6 % frente al umbral del 5 %; test antibot), spoilers fuera de toda pregunta, "Practicar" fijo, zoom 200 % sin desbordes, feedback de una frase, retos validados, desbloqueo con ≥50 %, atlas de miniaturas (17 hojas), catálogo partido (73 KB + 16 KB de textos), repaso rápido de 3 preguntas, e2e en tests/e2e.sh. Tests 80/80, e2e 52 capturas sin errores.
Aviso: una ronda puede descargar 2-4 hojas de ~200 KB la primera vez. El reto diario del 24/11 cambió respecto a v2.
Siguiente: evaluador independiente ronda 3.

## Evaluación independiente, ronda 3 (v3) — NO APRUEBA por un criterio
Material 3: 8 · UX: 8 · Accesibilidad: 7 · Rendimiento: 8 · Adaptativo: 8 · Pulido: 8 · Originalidad: 8 · Calidad técnica: 8. Sin fallos graves. Informe: docs/eval/ronda3.md.
Accesibilidad baja por 4 fallos medidos: barra "Practicar" tapa pista y flechas a 360×640; contraste 2,7:1 y 2,33:1 en dos elementos atenuados; deslizador de volumen de 44 px; opción fallada bajo la hoja a 195 px. Trampa: cerrada en la práctica (máx. 1,6 %), residuo del 8 % con un bot mixto y exploit del "movimiento anterior". Contenido: 55 obras revisadas sin errores; a125 (Madonna Litta) atribución discutida; look de b3 incorrecto.
Oleada 6 (en curso): los 4 imprescindibles + mejoras 5-15 + sala de museo y metas tras el camino.

## v4 publicada (versión 1795487707-63cb, 305 archivos)
Oleada 6: los 4 arreglos de accesibilidad (con auditoría automática de contraste y áreas táctiles en 36 pantallas: 0 fallos), aviso de enlace inválido, camino completo solo con todo dominado, pregunta de movimiento sin respuesta fija, distractores de pintores aún no aprendidos, regla de dominio nueva (75 % y 2 de cada 3 del propio pintor), Madonna Litta "atribuida", atlas sin sangrado, arranque más ligero (bienvenida 22 peticiones / 363 KB, con presupuesto en e2e), sala de movimiento dominado, medallas "Ojo de X", contador "Reconoces", reto semanal, detalle del día. Tests 96 + e2e opcional (MIRADA_E2E=1), e2e 73 capturas sin problemas.
Bots (peor caso): simples ≤4,3 %; por descarte 20,7 %.
Decisión a revisar por María: la regla de dominio es exigente en pintores con 2-3 obras (Durero, David: 2 de 2).
Siguiente: evaluador independiente ronda 4.

## Evaluación independiente, ronda 4 (v4) — APRUEBA (margen mínimo)
Los 8 criterios en 8, sin fallos graves. Informe: docs/eval/ronda4.md. Bots sin mirar ≤2 %; por descarte ≤22 %. 48 obras y 29 `look` contrastados sin errores.
Pendiente que el evaluador pide antes de dar por cerrado: contraste de los numerales de rachas bloqueadas (1,2:1) y Enter en la pantalla intermedia. Mejoras: dominio duro con 2 obras propias, "Ojo de…" invisible, medallas de Perfil que parecen botones, recortes del día difíciles, reto semanal para jugador nuevo, contador de repaso que desanima, tarjeta "Hoy", cifras de reconocidas.
Oleada 7 (en curso): esos arreglos. Después v5 y verificación.

## v5 publicada (versión 1795496954-add4, 305 archivos)
Oleada 7 (remate tras aprobar): contraste de sellos de racha, Enter/Espacio en pantallas de un botón, dominio más justo con 2 obras propias (alumno atento 58 % → 75 %; descarte 25 %, en el límite), "Ojo de X · n/m" visible (caja 4), medallas pulsables con hoja, detalle del día con `focus` en 36 obras y menos aumento, aviso en retos con pintores no vistos, bloque "Hoy", "Repaso de hoy · 3 cuadros", cifras unificadas, a60 recortado, humo e2e de 19 s. Tests 99 + humo; e2e completo 0 problemas (105 capturas).
Siguiente: ronda 5 de confirmación (última permitida por la puerta).

## Evaluación independiente, ronda 5 (v5) — APRUEBA
Material 3: 8 · UX: 9 · Accesibilidad: 8 · Rendimiento: 8 · Adaptativo: 8 · Pulido: 8 · Originalidad: 8 · Calidad técnica: 8. Sin fallos graves ni imprescindibles. Informe: docs/eval/ronda5.md. No probó: red lenta, cambio de día, reduced-motion, localStorage bloqueado, 768×1024, salas/audio/ronda libre, lector de pantalla real, Safari/Firefox.
Puerta de calidad cerrada en 5 iteraciones (R1-R3 no aprueban, R4 y R5 aprueban). Versión estable: v5.
Mejoras menores abiertas: enunciado recortado bajo la barra con la hoja abierta e imagen alta; "Ojo de X · 3/7" en dos líneas; cabecera alta a 195 px; galería "3 obras" sin decir "reconocidas".

## v6 publicada (versión 1795513464-845b, 306 archivos) — cambios pedidos por María (24/11, 09:38)
Visor a pantalla completa en toda la app ("Es este" en "¿Cuál es de X?"), sin zoom de página, práctica con una sola pregunta de calentamiento con cuadro visto (6 pintores pasan a enseñar 2 cuadros). Tests 103 + humo; e2e completo 0 problemas (147 pantallas). Bots ≤4,6 %; descarte 25 %.
Efecto a vigilar: dominar es más difícil en pintores con muchas obras (alumno atento: Leonardo 65→57 %, Rafael 75→59 %). En Leonardo se repite una obra no vista para llegar a 6 preguntas.
Duda: dentro del iframe de claude.ai el zoom depende de la página exterior; hay que probarlo en su móvil.
Publicada antes de la evaluación independiente porque María la estaba probando; evaluador ronda 6 en curso.
Peticiones nuevas de María (10:40): pasar a 1.000 obras (pendiente de que cree el repositorio GitHub `mirada`), fichas con datos de la vida del pintor, recompensas tipo Dibulíos (cofres, colección, obras animadas con Gemini).

## Evaluación independiente, ronda 6 (v6) — NO APRUEBA (UX 7)
Material 3: 8 · UX: 7 · Accesibilidad: 8 · Rendimiento: 8 · Adaptativo: 8 · Pulido: 8 · Originalidad: 8 · Calidad técnica: 8. Sin fallos graves. Informe: docs/eval/ronda6.md.
Imprescindible: Leonardo repite cuadro y saca dos recién vistos; responder «¿Cuál es de X?» cuesta dos toques; dificultad dura para el alumno atento (49-71 % de rondas dominadas). Mejoras: Colección y medallas no abren el visor directo, apaisados pequeños en vertical, carrera de «Es este», hueco sobre la rejilla.

## v7 (commit cf42d6f, 24/11 11:41) — correcciones de la ronda 6
Leonardo sin repetir y con un solo cuadro recién visto por ronda; dificultad recalibrada a 65-80 %; «Es este» espera al final del deslizamiento; lupa en el visor; paso entre cuadros en Colección manteniendo el texto. Tests 109 + humo. Publicada como página privada de Claude. Sin evaluador independiente al cerrar la sesión; traspaso escrito.

## Evaluación v7, intento 1 de 5 — NO APRUEBA (UX 7, Adaptativo 7, Calidad técnica 7) (24/11, 14:20)
Material 3: 8 · UX: 7 · Accesibilidad: 8 · Rendimiento: 8 · Adaptativo: 7 · Pulido: 8 · Originalidad: 8 · Calidad técnica: 7. Informe: docs/eval/v7-intento1.md (capturas en docs/eval/v7-1/). Evaluador: agente de Claude nuevo, app ejecutada en Chrome con Playwright en 5 tamaños, motor real con 1.000 semillas en Leonardo y 400 por parada; e2e completo del proyecto 155 pantallas sin fallos de contraste ni táctiles.
Lo imprescindible de la ronda 6, verificado y bien: Leonardo (5 preguntas, 5 cuadros distintos, 1 recién vista), dificultad 69-79 % (media 74 %), bots ≤ 4,6 %, descarte 25 %, sin carrera, lupa, Colección, sin zoom, sin fugas, consola limpia.
Fallos graves: título de a89 («del Prado» por «del Prato»); Matisse († 1954) frente al «1946» de CLAUDE.md (SPEC y validador decían 1956). Imprescindible: feedback «¡Y sin haberlo visto antes!» al repetir una pregunta fallada; ficha de Colección no cabe en móviles bajos ni apaisado; «¿Cuál?» en escritorio con miniaturas de 173 px; imagen de a201 recortada; e2e completo en rojo por 4 `ERR_ABORTED`; 12 colores a mano del visor y 7 en JS; código muerto.
A partir de aquí la nomenclatura es «vN, intento K de 5» (los informes `docs/eval/ronda1-6.md` son los intentos de v1-v6).

## Decisiones de María (24/11, tarde)
- Límite de fallecimiento: **1956** (dominio público en Europa); CLAUDE.md alineado con SPEC y el validador. Matisse se queda.
- Imagen de a201 (La Virgen de las rocas, Louvre): sustituida por la completa de Wikimedia Commons (dominio público), 612×1000.
- Mapa, tarjeta «Continuar» y medallas siguen llevando a su sitio; CLAUDE.md lo dice ahora.
- **Gemini solo para imágenes** (escenario de época, obras animadas). Nunca como evaluador ni para código.
- **Publicada en Render**: https://mirada.onrender.com (sitio estático desde `main`, carpeta `app/`, despliegue automático en cada push). Pendiente 4 cerrado.
- **Puerta de calidad en pausa**: no se hace el intento 2 de la v7. María quiere la marca primero («no tiene sentido pulir sin el rebranding»). Orden nuevo: ronda 2 de marca → aplicar la marca a la app → retomar la puerta de calidad sobre la app con marca. Los arreglos objetivos del intento 1 (errores, no estética) sí se han hecho (v8).

## Marca, ronda 2 publicada y respondida (24/11, 15:00-15:30)
Lienzo: https://claude.ai/artifact/3cjPwnjMsCBboSL6mGP15w (una página: 3 logos, 3 letras, 3 colores, 7 pantallas, camino entero con rama, 5 preguntas; fuentes en `marca/project-r2/` y `marca/tools/r2_*.py`).
María elige a lápiz sobre el lienzo: **logo 2 «Pieza», letra Outfit, coral contenido**. Rama extra opcional. Escenario: la versión tenue de un edificio no le convence; quiere una ciudad de época continua y rica, vectorial. Ve líneas rotas en el camino entero. Gemini no genera imágenes con su clave gratuita (cuota 0 en todos los modelos de imagen; gratis solo en la app de Gemini): se hace en SVG.
Siguiente: aplicar la marca a la app (v9) y las ciudades de época; todo visible en Render.

## v9 — identidad aplicada a la app (24/11, 16:30)
Outfit (variable 300-600, local, OFL) en lugar de Cormorant; paleta lino/tinta con coral contenido como protagonista y tema oscuro noche; variables en `app/css/brand.css` (main.css ya no tiene `:root`; `tests/colores.test.js` vigila: techo de colores a mano fuera de variables bajado de 18 a 4, las máscaras `#000`); logo «Pieza» en cabecera, bienvenida y favicon; botones y chips con relieve que se hunde; nodos redondos con relieve, anillo coral en el actual y oro en los dominados; barra inferior con pastilla coral; «Continuar» → «Seguir». Motor y estado intactos. Tests 112 + 1 omitida; e2e completo 0 problemas (155 pantallas). Archivos en `app/`: 304.
Fuera: escenario (hueco `.path-scene` vacío), perfil nuevo, ficha tipo historia, camino en serpentina, medallas por nivel en nodos.
Ciudades de época (9 SVG, `marca/escenas/`, generador `marca/tools/escenas.py`, página «Ciudades» del lienzo): María las da por buenas pero prefiere pasar directamente al **mapa tipo Super Mario** (camino serpenteante por paisaje isométrico con piezas pequeñas entre paradas); no se integran. Diseño del mapa en curso (página «Mapa» del lienzo).

## Familias visuales en las opciones (25/11)
Las opciones falsas de «¿Quién?», «¿Cuál?» y «¿De qué movimiento?» salen de la familia de la buena (datos en `catalogo/familias.json`, que `tools/catalog_from_pipeline.py` vuelca a `catalog.json`; lógica en `app/js/engine/catalog.js`). Familias: occidental figurativa, medieval, grabado japonés, vanguardias y abstracto (Kandinsky cambia de familia en 1911). Tope de 250 años entre la buena y las falsas en occidental (se relaja a 1,5× y 2,5× solo si falta relleno), 4 puestos en la línea de movimientos, y nada anterior a 1800 con vanguardias o abstracción, ni al revés. Si una familia no tiene relleno propio, entra una cercana (abstracto → vanguardias → occidental posterior a 1800); un movimiento de otra familia (ukiyo-e, gótico) no da pregunta de movimiento. La buena nunca es «la rara»: si es la opción más distinta por familia o siglo, se rehace el sorteo. Con el avance sigue valiendo la dificultad: baja, épocas lejanas dentro del tope; alta, el mismo movimiento o vecinos. Prueba nueva `tests/familias.test.js` y bot «raro» en `tests/lib/antibot.js` (umbrales intactos).

## Mapa vivo: vida de paso (26/11)
Más vida discreta en el mapa, siempre en el tramo que se ve, con la pestaña activa y nunca con «Reducir animaciones»: paseantes (o el carruaje) que cruzan los puentes por el sendero, veleros que recorren los ríos pasando bajo el puente, una barquita que cruza, alguien que nada, barcas en los lagos, pájaros que llegan, se posan en un árbol, saltan a otro y se van, mariposas y la sombra de una nube de día; de noche, estrellas que titilan (en los huecos libres y reflejadas en el agua) y alguna estrella fugaz. Además, giran las aspas de los molinos y sube el humo de las chimeneas. Como mucho dos escenas a la vez, separadas entre 9 y 26 s al azar. Genérico: `tools/mapa_svg.py` marca en cada paisaje ríos, lagos, puentes, aspas, humo y huecos libres (`data-river`, `data-lake`, `data-bridge`, `data-spin`, `data-puff`, `data-free`, `data-glints`) y `app/js/ui/map-scene.js` los lee estén donde estén (si cambia la forma del camino, basta regenerar los paisajes). Figuras en `map-critters.js` y `map-sky.js` (Web Animations API, solo transform y opacity), estilos en `app/css/mapa-vida.css`, colores nuevos `--map-star` y `--map-cloud` en `brand.css`.
Reloj del juego (petición de María, que juega casi siempre de noche): la luz del mapa, las estrellas, las ventanas y la música de noche ya no siguen la hora del móvil sino un reloj propio de 24 minutos por día (12 de día, 2,5 de atardecer, 7 de noche y 2,5 de amanecer; `engine/daylight.js`). Avanza solo con la app a la vista y se guarda en `sfumato.clock` (`state/game-clock.js`); cada sesión nueva (más de 30 min fuera) arranca en la hora real del móvil y, si se vuelve antes, sigue donde iba. Arreglado de paso: el carruaje y las figuras que van «hacia atrás» se desplazaban unos px fuera del sendero (giro en torno al centro).

## Mudanza a sfumato.dibulios.com (27/11)
La app pasa de https://sfumato-arte.onrender.com a https://sfumato.dibulios.com (las dos sirven lo mismo). El progreso vive en
el navegador por dirección. Decisión de María: sin aviso ni botón. En la antigua, si la nueva ya responde (petición no-cors
al manifest, 4 s como mucho), la app (y el test de cultura) se pasa sola con `location.replace` a la misma ruta, y si hay
algo guardado lo lleva en `#mudanza=` (comprimido, base64url; nunca en la query): estado, claves sueltas (`sfumato.*`, test
de cultura) y el fragmento original. Todo el catálogo jugado ocupa ~10 KB, lejos de los 2 MB de Chrome; si no cabe, se va
igual sin él. La nueva valida, migra, se queda con el más avanzado (a igualdad, el suyo), vuelve al fragmento original y
dice «Tu progreso ya está aquí» si lo ha traído. Solo redirige la antigua: sin bucles. Código: `app/js/state/mudanza.js`,
`app/js/ui/move-redirect.js`; pruebas en `tests/mudanza.test.js`. Las URL absolutas de `app/test/` apuntan ya a la nueva.

## Encuadre sin cortes: historias y casillas (27/11)
María vio la cabeza de Cristo fuera de la tarjeta de la Piedad Desplà y la Inmaculada de Murillo sin cabeza en una casilla de «¿Cuál es de…?». No eran las imágenes ni el atlas (vienen enteros): era el recorte de cada vista. Ahora es un sistema (`app/js/engine/framing.js`): una vista solo recorta sin más si pierde ≤ 15 % del cuadro; si pierde más, usa el foco revisado de la obra (`contenido/focos.json`, 408 obras revisadas mirando la imagen con cuadrícula, más los 33 focos del «Detalle del día»). En la historia, a sangre con el foco por encima del texto si pierde ≤ 45 %; si no (o si la obra está en «enteras»), entera sobre su fondo desenfocado, en el hueco entre la cabecera y el texto y con un zoom suave. El foco se aplica también en miniaturas, círculos de nivel y casillas. `node tools/recortes.mjs` lista las obras recortadas y `tests/recortes.test.js` falla si una obra nueva queda muy recortada sin foco.


## Compartir épocas y vista previa ligera (27/11)
Petición de María: las tarjetas «Descubre la época» se comparten como las historias, con un botón discreto arriba a la derecha. El enlace (h/epoca-<id>.html, con og:, generado por tools/share_pages.py) abre la época en tarjetas para cualquiera (#epoca-<id>) sin tocar su partida; a quien no juega, el botón de abajo dice «Empezar a jugar». Las vistas previas usan imágenes ligeras (img/og/, ≤1200 px y <250 KB) que se pintan al desplegar, porque WhatsApp no enseña las pesadas.

## Validador: límite de archivos y Fra Angelico (27/11)
El límite de 600 archivos venía del tope de 512 del artifact; en Render no hay límite, así que sube a 1000 (repo ~630 + atlas 86 + og generadas ~190 ≈ 900) y queda como techo de cordura. Fra Angelico (2 obras) pasa a aviso en `PENDING_WORKS` hasta que el próximo pipeline traiga más (candidatas forzadas en `pipeline/extra.json`); no se rebaja el mínimo de 3 porque hace falta una obra «new» para los retos.
## Camino nuevo: sendero de tierra, puentes alineados y carteles de dos postes (27/11)
Propuesta del experto (`docs/eval/camino-experto.md`), aprobada por María. El sendero es de tierra, sin raya, con
curvas amplias (puntos de paso suavizados en `path-curve.js`), unas cuatro paradas por pantalla y una puerta en el seto
al entrar en cada época. Lo recorrido va en tierra dorada con un hilo de oro hasta la parada actual; lo pendiente ya no
se desatura a gris (los dominados por repasar, menos apagados). Puentes: el trazado (`path-layout.js`) los pone donde el
sendero va recto entre dos paradas del mismo lado, y `tools/mapa_agua.py` hace nacer el río del puente, de borde a borde
y más allá (sale de la pantalla, nunca se corta), con el tablero alineado; `mapa_svg.py` falla si el sendero o un desvío
cruzan agua sin puente. Los desvíos de rama nunca salen de un puente ni van encima de uno. Todos los carteles (época,
tramo, rama) son una placa sobre dos postes; los de rama, bajo su parada en el margen, y al tocarlos se entra en la rama
(se quita la hoja «Ramas»). Carteles de tramo y de rama con sus textos (`contenido/ramas.json`, `tramos.json`, copiados a
`app/data/carteles/` con `tools/sync_carteles.py`) en tarjetas como las de época. Botón flotante para volver a la parada
actual. Hitos del paisaje (molino, castillo…) que caen bajo un rótulo se corren a un hueco libre en vez de perderse.

## Sistema de carteles del mapa, «Tu parada» y vuelta al mismo sitio (27/11)
María vio carteles casi iguales apilados («Primer Renacimiento 4/4» sobre «Renacimiento 8/9») y un desorden de estilos al
inicio de cada época. Ahora el mapa tiene tres estilos de texto y nada más (`app/css/mapa-carteles.css`):
- **Arco de época**: el cartel de la época es el rótulo arqueado sobre los pilares de su puerta, centrado en el sendero,
  con un arco del color de la época (de oro si está completa); nombre, siglos y la única cuenta de la época. El de la
  primera va sobre la puerta de la muralla de salida. Las ramas entran también por su puerta con arco (sin cuenta: ya
  está en la cabecera). Al tocarlo, las tarjetas de siempre.
- **Frontera**: bajo el seto de cada puerta sigue el suelo de la época anterior y se corta en él; de arco a arco se lee
  un bloque, la época.
- **Tablillas** de tramo y de rama: pequeñas, sobre dos postes, bajo la primera parada del tramo. El tramo no lleva
  contador (completo, un sello pequeño de hecho); si empieza nada más cruzar la puerta, su tablilla queda después del
  arco con aire (`ARCH.gap`).
- **Etiquetas** de parada: las de siempre; el repaso cerrado, apagado y en claro («Domina 1 pintor más»).
- **Parada actual** (decisión de María): sin botón «Empezar»; nodo más grande, aro coral con halo lento, nombre más
  marcado y la marca «Tú» que se mece encima (quietas con «Reducir animaciones»). Se toca el nodo. La guía de la primera
  vez dice «Toca el cuadro».
- **«Tu parada»**: el botón flotante pasa a píldora con la miniatura, el texto y una flecha hacia donde queda; solo
  aparece cuando la parada no se ve.
- **Vuelta al mismo sitio** (`app/js/ui/screens/map-memory.js`): al volver al mapa (de un arco, una ficha, una historia,
  una ronda…) la vista queda exactamente donde estaba, anclada al tramo y a la fracción de su alto que había en el centro.
  Se quita la subida automática a la parada siguiente. Solo se centra en la parada actual al abrir la app, al entrar en
  una rama desde el camino o con «Tu parada». Paisajes regenerados (`python3 -I tools/mapa_svg.py`): las ramas entran
  por puerta (seto y entrada más alta) y nada se pinta bajo los arcos. Pruebas en `tests/mapa-carteles.test.js`.

## Colección rehecha: una sola página con estanterías y pintores por descubrir (28/11)
Encargo de María: la Colección estaba desordenada, se entendía poco y no daban ganas de entrar; un pintor no alcanzado no
salía ni en el buscador. Auditoría y propuesta en `docs/eval/ux-coleccion.md`. Fuera las pestañas «Cuadros | Pintores» (las
dos ordenaban lo mismo): una sola página con el buscador siempre visible, «Lo último» (cuadros en su proporción, se abren en
el visor; «Ver los n» lleva a `#coleccion-cuadros`) y una fila por época con tarjetas de pintor (portada de su cuadro visto
más famoso, «n de m», check dorado si está dominado; llevan a su ficha). Las épocas en las que aún no conoces a nadie van al
final, bajo «Por descubrir». Los pintores no alcanzados salen bloqueados (monograma y candado, nunca una obra suya) y su hoja
dice quién es (la frase «por qué importa») y dónde se conoce (camino o rama). El buscador los encuentra como «Por
descubrir». Código: `engine/collection-shelves.js`, `ui/screens/collection-shelves.js`, `ui/locked-painter-sheet.js`;
`#coleccion-pintores` abre la misma página. Pruebas en `tests/coleccion.test.js`.
Los cuadros de la Colección, de «Ver los n» y de la ficha del pintor abren el visor con su dato curioso bajo el título y un
«Ver más» que lleva a la página de la obra (al deslizar cambia el texto: lo que María pidió el 24/11). La página de la obra
termina con «Más de <pintor>», sus otras obras vistas, para pasar de una a otra sin cerrarla. Dentro de una ronda, el visor
sigue igual. Código: `ui/viewer-more.js` (`data-zoom-more` en `artFrame`), `ui/artwork-sheet.js`.

## El mapa sigue la luz del día aunque el móvil vaya en oscuro (27/11)
María entró a las 8:11 con el móvil en oscuro y el mapa se veía de noche. No era el reloj (a las 8:11 da día): el tema oscuro
pintaba el paisaje con su paleta oscura. Ahora, con «Como el móvil», el mapa (`.path-map`) recupera los colores claros de todo
lo que el oscuro cambia (bloque propio en `brand.css`, comprobado en `tests/mapa-tema.test.js`) y la luz la pone el reloj del
juego: amanecer, día, atardecer y noche. Menús, barra de arriba y pestañas siguen oscuros. Si se fuerza un tema en Ajustes,
manda el tema: «Oscuro» deja el mapa de noche (paleta oscura, estrellas y luces) y «Claro», de día (`mapLight` en
`engine/daylight.js`). La música sigue al reloj en todos los casos.
De paso, los edificios de día ganan contraste (encargo de María, 8:13): muros arena con el lado en sombra marcado, ventanas
oscuras, tejados de terracota más vivos, pizarra más definida y sombras en el suelo algo más hondas. Los SVG de reserva de
`app/img/mapa` se han regenerado con la paleta nueva.

## Camino rediseñado: lápida, mojones, sendero de tierra, salida y ramas (27/11)

Encargo de María («horrible el cartel de renacimientos», «lengua de autopista», tablilla con una V suelta, amontonamiento
en Leonardo, avisos de candado apilados, «Tu parada» poco claro, ramas sin vuelta natural). Plan de un planificador de UX
(`docs/eval/plan-composicion-camino.md`, con el estudio de cómo lo resuelven Duolingo, Candy Crush, Two Dots…) y cuatro
evaluadores independientes (`docs/eval/eval-camino-r1..r4.md`; aprueba la r4).
- Antes de todo: el mapa salía sin estilos en el móvil de María (un index.html viejo en caché sin `mapa-carteles.css`):
  `main.js` pide las hojas del arranque que falten (`ui/lazy-css.js`) y la página va sin caché.
- La época, su nombre grabado en el dintel de piedra de su puerta (sin caja blanca: la lápida grande no gustó), con una
  ranura que se llena; completa, se dora. El tramo, una sola tablilla en un hueco propio antes de sus pintores; completo,
  se dora (el mojón de al lado duplicaba). Siguiente ronda: la época como lugar (plaza) en el sendero.
- Espaciado por elementos (`GAP` en `path-layout.js`): el hueco entre paradas suma lo que lleva (puente, rama, mojón).
- Sendero de tierra sin raya, con borde irregular y piedrecitas; nace de una plaza empedrada con fuente, arco y la caseta
  «Cómo se juega». Desvíos tangentes con poste de flecha; en cada rama, «Volver al camino» del lado del camino común.
- Candados: tiembla, vibra y un solo globo con cruz. «Tú»: círculo con flecha que sigue a la parada actual.
- Luz: arrebol rosa al amanecer y ámbar al atardecer, encima de la noche; ningún edificio pisa un río.

## Cuadro del día (27/11)

Diseño aprobado por María: sustituye al reto diario de la cabecera. Un cuadro famoso al día, igual para todos (día de
Madrid): «¿De quién es?», 6 pintores, 4 intentos; cada fallo apaga el nombre y enseña más (detalle ×3 → ×1,6 y época →
entero y año → museo). Al acabar, una historia de 3 tarjetas (gancho que vuelve al detalle, «Fíjate en», anécdota) con el
núcleo de las historias sacado de `story-viewer.js` (`ui/story-core.js`). Calendario curado de 14 días desde el 27/11
(Botticelli, Van Eyck, Velázquez, Goya, Caravaggio, Leonardo, Vermeer, El Greco, Monet, el Bosco, Van Gogh, Sorolla,
Murillo y Rembrandt), validado por `tools/sync_cuadro_dia.py` (nitidez del detalle con la HD que ahora pide también
`pipeline/hd.py`, reparto, pistas sin destripes) con alarma desde el 08/12. Compartir con cuadritos y página
`h/cuadro-<n>.html` con el detalle como vista previa. 10 XP si acierta, 5 si no; cuenta para la racha general; medallas
`daily-1` y `daily-perfect` renombradas. Estado v11. Fuera `planDaily` y la ronda diaria; `#reto-diario` y los enlaces `d…`
llevan al Cuadro del día.

## «Fíjate en» que encaja con la obra (27/11)

María acertó «Los tormentos de San Antonio» y le salió «Fíjate en los cuerpos musculosos» (la pista genérica de Miguel
Ángel, que rota con sus rasgos en `engine/feedback.js`). Ahora `contenido/fijate.json` da a una obra su propio «fíjate»
(≤ 100 letras, con fuente) y/o excluye rasgos del pintor que en ella no se ven (`sin`: posiciones en [pista, *rasgos] o
«todos»); llega como `looks` y `skipTraits` y el motor no enseña nunca un rasgo excluido (tampoco en la ficha del pintor).
En obras etiquetadas, tampoco un rasgo cuyas etiquetas faltan. Mejor sin línea que una que no encaja. Auditoría: 192
obras (juventud de El Greco, Velázquez sevillano, Caravaggio temprano, Van Gogh holandés, retratos de Tiziano…).
Segundo caso («el llanto» de Van der Weyden en un retrato): el filtro pasa a ser seguro por defecto. Cada obra tiene
género (Wikidata reducido a retrato, figuras, paisaje, bodegón o abstracto; 213 a mano en `contenido/generos.json`) y cada
una de las ~600 frases de los 174 pintores declara su alcance en `contenido/rasgos.json` (estilo, géneros o etiquetas).
Unas 265 obras se quedan sin «fíjate» genérico (antes enseñaban algo que quizá no se veía).
Tercer caso (Masaccio: «figuras que pisan firme» en una Virgen sentada y en un San Andrés de medio cuerpo): lo que se
señala tiene que estar a la vista en ESE cuadro. Una frase con un detalle concreto (de pie, paisaje, ruinas, llanto…) va
en `rasgos.json` como {donde, general, generalDonde}: entera solo donde se ve y, si no, su versión general sin el detalle
(«Fíjate en el volumen macizo, como de escultura, y en la luz que llega de un lado»). 49 pintores con versión general;
San Andrés con «fíjate» propio (el manto y la luz lateral, sólido aunque sobre oro).
Relleno (27/11): 173 obras que se habían quedado sin «fíjate» llevan uno propio en `contenido/fijate.json` (≤ 100 letras,
con fuente, sin nombrar al autor ni el título: lo comprueba `validate_catalog.py`), empezando por la fama alta y por
Goya, el Bosco, Géricault, El Greco y Degas; tres Caravaggio pasan a «figuras» en `generos.json`. Quedan 65 sin línea
(61 de fama 1), donde no había certeza de qué señalar.

## Tarjetas de época y de cartel: el cuadro entero (27/11)

«La creación de Adán» salía en cuadrado y a Adán le faltaba la cabeza: la caja tenía alto fijo y recortaba toda obra más
apaisada que ella. Ahora la caja toma la proporción de la obra (`--card-ar`, hasta `--era-art-h` de alto y el ancho de la
tarjeta, con el hueco reservado): ninguna obra se recorta. Solo una tarjeta con `region` enseña un detalle a propósito
(`cardFrame` en `engine/framing.js`); hoy ninguna lo necesita. Revisadas con capturas a 360 px las 81 tarjetas de época
visibles y las de los 54 carteles. Prueba: `tests/epocas-encuadre.test.js`.

## La época, una puerta de ciudad en el camino (27/11)

Tras el prototipo y varias vueltas con evaluadores y directores de arte (`docs/eval/eval-camino-r5*`, `eval-proto-r5*`),
María eligió la puerta de ciudad: cada época entra por una puerta del mismo tamaño (dos torreones de tejado cónico) y el
sendero cruza su arco; cerrada, lleva portón. El nombre va grabado en el ático en la letra de la app, semibold y en
capitales, tinta oscura de día y casi blanca de noche, sin partir palabras («Manierismo y Renacimiento del Norte» se
graba «Renacimiento del Norte»; «Manierismo» sigue en su tramo y en la presentación). La puerta proyecta su sombra
(de noche, la de la luna) y de noche se ilumina un poco con filo de luna y dos faroles. Sin plaza ni fuente (se probó y
se quitó). La salida usa la misma puerta en la muralla, con el sendero desde abajo y la caseta de información sin
rótulo (la «i» basta). El tramo es un hito de piedra con el nombre al lado; las ramas por época se llaman «Más del …»;
los pintores dormidos ya no llevan «¿Lo recuerdas?» bajo el nombre; la guía dice «Prueba del Renacimiento» y cabe entera.

## Test de pintura depurado (27/11)
Portada con gancho («¿Distinguirías un Velázquez de un Murillo?») y una línea práctica; fuera «Cuadros de verdad» y
«Sin registro». Sin pausa a mitad: sigue mientras aciertes (máx. 40) y avisa «Sube la dificultad» sin parar. Niveles
nuevos («Primera visita al museo» … «Ojo clínico»; los guardados con el nombre de antes se traducen). Resultado con la
cifra grande del percentil (estimación de `docs/eval/reconocimiento-fuentes.md`, sin cambios) y texto para compartir
con reto («Sfumato · Sé más de pintura que el 78 % de la gente. ¿Y tú?»; por debajo del 40 %, los aciertos). Salir a
medias (aspa, Esc o «atrás») pide confirmación con hoja propia (`app/js/test/salida.js`). Efectos de sonido de la app
con el ajuste «Sonidos» (`app/js/test/sonido.js`). Los pintores rusos ya no salen en el tramo fácil ni en el medio
(`LOCAL_FAME` en `bolsa.js`). Vista previa (`app/test/portada.jpg`) rehecha con la marca Sfumato.

## Medallón y rombo: paradas que cuentan (28/11)

Pedido de María: la puerta y el tramo se leían como decoración. Ahora son paradas del sendero, de la misma familia
(terracota con un libro en crema, `ui/screens/path-lore.js`), distinta de los círculos de los pintores:
- **Medallón de la época**, en el arco de su puerta y sobre el sendero (Candy Crush): es lo único que se pulsa de la
  puerta. El nombre va en una placa de la misma piedra, algo saliente (filete y sombra corta), sin botón. Abre la
  presentación; si aún no se ha visto, cuenta como vista y «Seguir» continúa al cartel del tramo y al pintor, como la guía.
  Cerrada, la hoja de lo que falta. En la salida, el medallón de la primera época va en la puerta de la muralla.
- **Rombo del tramo**, sobre el sendero antes de su primer pintor, con su nombre en la pastilla de los pintores (sin 📖).
  Abre el cartel; si es lo siguiente del camino, como paso («Saltar»/«Seguir») y después el pintor.
- Sin ver: puntito coral y un respiro suave (sin él con «Reducir animaciones»). Completos: sello de oro. Al tocarlos se
  hunden y suena el toque; zona táctil de 56 px. «Tú» se posa en el medallón o en el rombo cuando son lo siguiente (en
  el medallón cuelga debajo, porque encima está la placa); el botón «Tú», la vista inicial y la guía de bienvenida van ahí.
- **Ritmo:** medallón → rombo → pintores → … → prueba de época, todas las paradas a 180 de distancia vertical, también entre
  épocas y desde la salida (`stops` en `path-layout.js`). Puentes y carteles de rama caben en el hueco sin romperlo. Prueba
  en `tests/camino-forma.test.js`. El mapa es algo más largo; paisajes regenerados (`tools/mapa_svg.py`).
- **Fuera la caseta** de información de la salida: «Cómo se juega» pasa a Perfil → Ajustes, junto a «Acerca de Sfumato»
  (nunca salía sola; la guía de bienvenida sigue igual).
- De paso, el camino en línea (letra muy grande o ventana estrecha) ya no amontona las paradas.

## «Fíjate en…»: variedad y ninguna obra sin pista (28/11)

María veía casi siempre la misma frase tras fallar con un pintor. Ahora cada uno de los 174 pintores tiene 4-5 refuerzos
de estilo en `contenido/pistas.json` (760 en total: color, pincelada, luz, rostros, composición, temas), sin nombrar al
pintor ni títulos para poder usarlos algún día como pistas antes de responder. Llevan alcance (estilo, géneros o
etiquetas) y, cuando se puede, etiquetas visuales para servir también tras un fallo en «¿Cuál es de X?». `feedbackFor`
da primero el «fíjate» propio de la obra y luego rota entre frases y refuerzos sin repetir el último visto de ese pintor
(`recent`, que dura toda la sesión en `lesson.js`). Las obras atípicas excluyen los refuerzos que no les cuadran
(`sinPistas` en `fijate.json`). El 100 % de las 1.469 obras tiene al menos una línea aplicable (prueba en
`tests/fijate.test.js`). La individualización por cuadro sí funciona (sale primero en las 290 obras que la tienen, también
tras fallar); si se nota poco es porque solo el 22 % de las obras del camino tiene «fíjate» propio.
Revisión independiente (una vuelta, 6,5/10): reescritos unos 60 refuerzos (frases genéricas, ángulos repetidos dentro de un
pintor o entre Degas, Lautrec y Cassatt, rasgos de «estilo» que no valían en toda la obra, términos sin explicar). Ahora:
757 refuerzos; mediana de 6 líneas aplicables por obra; 1.469 de 1.469 obras con al menos una.

## Cierre de época: capítulo terminado (28/11)

- **Cuándo:** una época del camino se cierra al ganar su medalla (todas sus paradas dominadas; la Prueba de época se abre
  justo entonces y no es requisito); una rama, al dominar todos sus pintores propios. `engine/era-end.js`.
- **Pantalla** `#cierre-<época>` / `#cierre-rama-<id>` (`ui/screens/era-end.js`, `css/cierre.css`): «Has terminado el
  Renacimiento», la medalla, los pintores en un mosaico de retratos (llevan a su ficha), cuadros vistos y acertados, la frase
  puente y «Cruzar al <época>» (medallón y presentación; si ya entró, su parada abierta) o «Volver al camino». Tras la última
  época, «Ver tu colección». Compartir manda `h/epoca-<id>.html` con «He terminado el Renacimiento en Sfumato». Sonido
  `complete` + `medal` y un brillo breve que no sale con «reducir animaciones».
- **Guía:** regla 1 ter de `nextStep` («Cerrar el Renacimiento»), en el resultado y en el mapa, hasta que se ve. Sale una vez.
- **Frases puente** en `data/cierres.json` (8 transiciones del camino, el final y las 14 ramas), ≤ 180 caracteres, con fuente
  (solo en «Fuentes y créditos», grupo «Carteles y cierres del camino»).
- **Estado:** `progress.closures = { seeded, seen }`, sin subir la versión. Quien ya traía épocas cerradas se siembra al cargar:
  cuentan como vistas salvo la última si aún no ha cruzado a la siguiente. Pruebas en `tests/cierre-epoca.test.js`.
## «Repasar a…»: lo que se olvida vuelve con contexto, y «No lo sé» (28/11)

Pedido de María: con muchos pintores aprendidos, al jugar a uno nuevo le preguntaban por los antiguos y ya no se acordaba;
repetir cuadros sin contexto acaba en memorizar imágenes.
- **Detección** (`engine/recall.js`): cada respuesta de autor o de época queda en un registro corto (`progress.slips`,
  últimas 80; un estado anterior lo recibe vacío). Un fallo cuenta para el que era la respuesta y para el elegido por error;
  lo del propio pintor (o sala) de la ronda no cuenta. Olvidado: `RECALL_SLIPS` (3) fallos en `RECALL_WINDOW_DAYS` (14)
  días, o menos del 50 % con 6 preguntas o más, y solo si ya lo había dominado. «No lo sé» pesa doble (`RECALL_DUNNO_WEIGHT`).
- **Guía** (`engine/next-step.js`, regla 2 bis): «Repasar a Velázquez» / «Repasar el Barroco», con su cara, detrás de
  «Repetir» y «Por hoy, hecho» y delante del repaso general; nunca el mismo dos veces seguidas ni tras otra sesión así. Si
  coinciden un pintor y una época, gana lo que más falla. También en la píldora del mapa.
- **Una sola sesión por pintor** (`ui/screens/recall.js`, `engine/recall-session.js`), la misma desde la ruta y desde la
  ficha: primera tarjeta de su historia de nivel 1 (o la del nivel donde se concentran los fallos) con «Seguir» destacado e
  «Ir a las preguntas» al lado; al final, una sugerencia de otra historia suya («Más de Velázquez: Sevilla ›»), «Cómo
  reconocer a…» (2-3 rasgos y 2-3 cuadros que se abren en grande) y, si lo confunde con alguien, «Velázquez o Zurbarán»
  con un cuadro de cada uno y una frase hecha con sus rasgos. Después, 5 preguntas con sus cuadros (primero los fallados)
  frente a otros. La cuenta vuelve a cero al terminar. Épocas: sus tarjetas «Cuándo y dónde», «Qué cambia» y «Fíjate en»,
  el contraste y preguntas de época.
- **Niveles**: su historia con el mismo patrón («Seguir» / «Ir a las preguntas») y después sus preguntas.
- **Ficha**: un único botón con lo que toca («Nivel 2 de Vermeer» o «Repasar a Vermeer»), sin la insignia de categoría (el
  aro ya enseña el progreso); tocar un círculo hecho enseña solo su historia, con «Volver» y «Preguntas de este nivel».
  Las etiquetas de los círculos ya no parten palabras («Comienzos»).
- **«No lo sé»** (`ui/screens/lesson.js`), solo en el modo aprender (camino, ramas, salas, Prueba de época, repasos y
  «Repasar a…»; nunca en retos ni en el test): enseña la buena con su «Fíjate en…» y la cara del pintor, sin sonido ni
  rojo de fallo y sin puntos; cuenta como fallo (rompe «seguidas», vuelve al final).
- Pruebas en `tests/recordar.test.js`.
Cobertura (28/11): 408 «fíjate» propios nuevos para obras de fama 3 y 2 del camino (y algunas de fama 1), cada uno con
algo que se ve en ese cuadro y su fuente: del 22 % al 63 % de las obras del camino (629 de 1.002). Siguen dejando que
salgan después las frases del pintor (`sin: []`). Unos 45 pintores menores con refuerzos más concretos.

## 28/11 · Niveles «a fondo» en el itinerario: imprescindibles y «Profundiza en…»

- **Imprescindibles por época** (`contenido/imprescindibles.json` → `essentials` del catálogo, `engine/essentials.js`): 2-4
  niveles por época con peso 1-3, título («las pinturas negras de Goya»), motivo y fuente. Se abren con el nivel 1 del pintor
  dominado, sin pasar por los niveles anteriores (si no, cruzar el Romanticismo pediría cinco rondas de Goya).
- **Puerta de época**: cruzar a la siguiente pide los imprescindibles de ESA época (`progress.js isStepUnlocked`). Candado de
  la parada y hoja de la época: «Te falta conocer Las Meninas de Velázquez (nivel 5)» con «Ir»; guía «Te falta conocer…»
  (regla 5 ter); el cierre de época lleva a lo que falta. Quien ya entró en la época (presentación vista o parada jugada) no
  queda cerrado. «Camino completo» y «Museo completo» piden todos. Ramas y demás niveles nunca bloquean.
- **«Profundiza en Rafael: nivel 3»** (`engine/deepen.js`, regla 5 quater): cada `DEEPEN_EVERY` (3) pintores nuevos, un nivel
  pendiente de cualquier época ya recorrida, ponderado (imprescindible 1 + 2 × peso; ×2 si su época ya se cruzó sin él), con
  rotación (`ROTATION` 4: tras saltar A nunca A, y A no vuelve hasta ofrecer otros) y enfriamiento (desde el 2.º salto en
  `COOL_DAYS` 21, el peso se divide; nunca baja de `COOL_FLOOR`). «Ahora no» en el resultado o jugar otra cosa = salto con su
  día (`progress.deepen`). Pruebas en `tests/imprescindibles.test.js`.
Segunda revisión independiente (una vuelta; 7,5/10 los «fíjate» por obra, 7/10 los refuerzos): corregidos 9 «fíjate»
(datos dudosos como la «piel tostada» de la mujer en las olas o el cielo «casi de noche» de la casa amarilla, y títulos casi
literales) y 24 refuerzos que eran de un tema o una etapa y no de toda la obra, o que sonaban genéricos.
«Fíjate en» = rasgo del pintor (28/11). Muchos «fíjate» por obra eran curiosidades (la calavera de Los embajadores, el
guante de Los jugadores de cartas), que ya están en la curiosidad de cada obra. Criterio nuevo: el «Fíjate en…» enseña
siempre a reconocer al pintor con un rasgo de su estilo que se ve en ese cuadro. De los 629 de obras del camino, 124 ya lo
hacían (109 antiguos de catalog_data y 15 propios) y 505 se reescribieron. Las curiosidades que contenían ya estaban en la
curiosidad de su obra (de ahí se habían sacado), así que no se ha perdido ninguna.

## 28/11 — Foco del mapa, burbuja del itinerario y primer tramo fuera

- Partida nueva (y tras «Borrar progreso»): lo primero es el medallón de la primera época; el pintor que va detrás ya no lleva el
  aro de «actual». Se quita «Tú»: lo que recomienda el itinerario (`mapRecommendation`, engine/next-step.js) lleva una burbuja con
  verbo («Abrir», «Conocer», «Empezar», «Seguir», «Repasar», «Profundizar») sobre su parada, con pulso suave (`ui/screens/map-cue.js`);
  es lo único animado de los nodos. Sin recomendación atrás no hay marca en la frontera; con ella, un anillo fino. El botón flotante es
  una flecha hacia lo recomendado y la píldora de guía desaparece.
- Tocar un pintor cuya época o tramo no se han visto abre su tarjeta con «Empezar · antes, el Renacimiento» (`ui/lore-first-card.js`):
  nada se salta sin avisar. El «Ir» del globo de candado lleva a esa tarjeta. Globo rediseñado: pastilla compacta, «Ir» como pastilla
  pequeña, sin cruz.
- Decisión de María: el primer tramo de cada época (el que sigue a su puerta) no sale en el camino (`hasTramoSign`). Sigue en los datos
  porque abre las ramas y agrupa a los nuevos. Su cartel se conserva en `data/carteles/tramos.json` por si hay tarjetas que rescatar.
  Paisajes regenerados.
- Medallón y rombo por delante del progreso: cerrados con candado y el mismo globo («Se abre al cruzar la puerta del Barroco»); al
  llegar a la época se abren sus rombos aunque sus pintores sigan cerrados.
- Prueba general del itinerario (`tests/itinerario.test.js`): una partida que solo sigue `nextStep` recorre todo el camino en orden.
Revisión independiente con ese criterio («¿ayuda a reconocer al pintor la próxima vez?»): ~80 % lo cumplía (7/10).
Corregidos 47: curiosidades que quedaban (gato y jilguero, perro carlino, esqueleto gigante…), datos dudosos (rayos del
atardecer en la cruz de Friedrich, el «con espátula» de La novia judía) y más variedad en Van Eyck, Bronzino, Courbet,
Berruguete y Degas.
Alternancia (28/11): con la memoria de sesión de `lesson.js`, el «fíjate» de la obra ya no sale siempre primero: si lo
último visto de ese pintor fue otra pista propia, o se le parece (comparación de palabras clave, `similar`), toca una frase
de estilo, y viceversa. Más variedad en los «fíjate» de Rafael, Rembrandt y Tiziano y 9 que solo describían la escena.

## 28/11 · Visores de tarjetas: misma forma de avanzar, volver y salir
Criterio de María: época, tramo e historia de pintor pueden verse distintos (claro / oscuro sobre el cuadro), pero se
recorren igual. Componente común `app/js/ui/deck-nav.js` (+ `css/deck.css`): barras arriba, etiqueta discreta («Época»,
«Tramo» o el pintor), compartir y X; tocar a la derecha avanza, a la izquierda vuelve, y deslizar; abajo «Seguir» y, como
atajo, «Saltar» (paso del camino) o «Ir a las preguntas». En la última tarjeta el principal es lo que toca (Seguir en el
itinerario, «Ir a las preguntas», «Volver al camino», «Volver», «Empezar») y el secundario, «Más sobre… ›» (la ficha del
pintor; en época y tramo, la ficha de época cuando exista: `eraFichaRoute` en `era-cards.js`). Fuera «Descubre la época»,
«Descubre más», los puntos, el avance solo con pausa y la insignia del rango en la cabecera. La X sale al camino sin seguir.

## 28/11 · Niveles «a fondo» por importancia

- **Decisión de María:** los niveles de un pintor se ordenan por importancia, no por etapa. Lo imprescindible es el nivel 2
  (las pinturas negras de Goya pasan del 6 al 2; Las Meninas, del 5 al 2) y, si hay varios, los siguientes; después, lo de
  más fama; el resto por fama media. El nivel 1 no cambia y las obras de cada nivel siguen juntas: solo cambia el número.
- 13 pintores cambian de orden (Caravaggio ya estaba bien). Fuente: `pipeline/etapas.json` (el `nivel` es la importancia;
  la lista sigue en orden cronológico para el corte por `hasta`, y `seleccionar.py` ya no la ordena por nivel),
  `ajustes.json` (`etapa`), `seleccion.json`, historias, títulos cortos e `imprescindibles.json`. Volver a seleccionar con
  `seleccionar.py` da exactamente el mismo reparto.
- Sin atajo: un imprescindible ya no se abre saltándose los niveles anteriores (no hace falta: es el nivel 2, y los de
  nivel 3 o 4 van detrás de los anteriores de su pintor, también en el orden de «Te falta conocer…»).
- Cada historia movida dice en su primera tarjeta en qué momento de la vida estamos («Ya anciano y sordo…»,
  «Retrocedemos a sus primeros años en Sevilla…»).
- **Progreso:** `state/level-order.js` traduce al cargar (en `schema.migrate`, sin versión nueva para no romper móviles con
  la app en caché) los niveles hechos (`progress.deep`), la rotación de «Profundiza» y las historias vistas; marca
  `progress.levelOrder` (y `@orden:1` en la lista de historias) para hacerlo una sola vez. Una ronda «a fondo» a medias de
  esos pintores se descarta. Pruebas en `tests/niveles-importancia.test.js`.

## 28/11 — Siempre hay una guía en el mapa

El botón flotante de flecha pasa a píldora con texto («Sigue: Leonardo», «Repasar»…): sale cuando la parada recomendada no se ve
y siempre que el paso no tiene parada en el mapa, y al tocarla lanza el paso (lo mismo que el botón del resultado). Si la parada
está a la vista, basta su burbuja. Se coloca en el hueco de la fila (izquierda, centro o derecha) donde no tape carteles ni paradas.
Antes no salía nada si el paso no era una parada («Repasar» general, reto semanal…). `guideFor` en `ui/screens/map-cue.js`; prueba
general en `tests/itinerario.test.js`.
