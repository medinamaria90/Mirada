# Mirada — Evaluación independiente, ronda 2

Método: servidor estático :8871; Playwright/Chrome 390×844, 360×640, 768×1024, 1280×800 (claro/oscuro); partida completa de las 32 etapas + 8 rondas libres con jugador omnisciente y fallos a propósito (consola: 0 errores/avisos); recarga a mitad de ronda, atrás, Esc, teclado (Tab, 1-4, Enter), retos válidos/manipulados/inválidos, localStorage bloqueado, reduced-motion, zoom 200 % (viewport 195 px), cambio de día simulado (racha/meta), contraste medido (0 fallos AA en 8 pantallas × 2 esquemas), objetivos táctiles, peso de peticiones, motor sobre 150 semillas × 32 etapas, y 48 obras contrastadas con su imagen. Capturas en docs/eval/r2/. No he ejecutado los tests unitarios ni probado `#repaso` con SRS vencido.

## Notas

| Criterio | R1 | R2 | Justificación |
|---|---|---|---|
| Material 3 | 8 | 8 | Superficies, hoja de feedback, estados y oscuro coherentes; medallas con miniatura y sello; movimiento más rico, aún sin identidad cinética propia. |
| UX | 7 | 7 | Flujo mejor (ronda reanudable, atrás con confirmación, celebración, meta, racha), pero «Practicar» queda fuera de pantalla en móvil, la respuesta fallada queda tapada por la hoja y el motor se puede ganar sin mirar los cuadros. |
| Accesibilidad | 8 | 8 | Contraste AA sin fallos, cabecera 48 px, foco visible, teclado 1-4/Enter/Esc, alt neutro; sube al 200 % y las opciones se salen (scroll horizontal en inicio y pregunta). |
| Rendimiento | 8 | 8 | Bienvenida 38 peticiones/489 KB sin comprimir (audio ya diferido, 1 imagen de 50 KB); ronda ≈ 540 KB; pero 483 archivos de 512 permitidos (la especificación decía ~250). |
| Adaptativo | 8 | 8 | Sin desbordes en los 4 tamaños salvo zoom 200 %; 1280 ya en dos columnas, aunque la izquierda queda vacía bajo las tarjetas; barra de ronda ahora fija. |
| Pulido | 7 | 8 | Tarjetas pulsables o sin chevron, medallas con cuadro, sello, «Hoy has aprendido»; restan bordes oscuros sueltos en tarjetas del resultado y feedback de tres líneas. |
| Originalidad | 7 | 8 | 32 etapas con Goya, Greco, Murillo, Manet, Klimt, Munch…; rusos reducidos a 4; pista «Mira…» por obra; el enfoque «enseña primero» es propio. |
| Calidad técnica | 8 | 7 | Motor puro y determinista, ronda persistida, retos validados; pero la planificación deja una trampa medible, y los e2e siguen fuera de tests/. |

## Veredicto: NO APRUEBA (UX 7, Calidad técnica 7 y un fallo grave de trampa).

## FALLOS GRAVES

1. **Trampa: se puede «dominar» sin mirar el cuadro.** En `planStage` la mayoría de obras preguntadas son del pintor de la etapa. Un bot que en «¿Quién lo pintó?» elige siempre el pintor de la etapa, en «¿De qué movimiento?» el movimiento de la etapa y en «¿Cuál es…?» al azar, obtiene la nota de dominio (≥75 %) en: Leonardo 100 % de las rondas (todas sus preguntas «quién» tienen como respuesta Leonardo), Van Gogh 74 %, Monet 67 %, Vermeer 57 %, Velázquez 58 %, Rembrandt 59 %, Rafael 55 %, Caravaggio 55 %, Repin 55 %, Renoir 47 %, Tiziano 75 % (300 semillas por etapa, tools propios en /tmp/ev/eng3.mjs). Las etapas con 2 obras `learn` quedan en 0-6 %. Esto vacía la promesa «enseña de verdad» y da medallas gratis. Arreglo: en cada ronda, al menos 40 % de las preguntas «quién» con respuesta distinta del pintor de la etapa, y que el pintor de la etapa aparezca también como distractor en preguntas de otras obras; no preguntar el movimiento propio cuando el título de la pantalla ya lo dice.

No he visto roturas, callejones sin salida, pérdidas de progreso ni problemas de privacidad. No he encontrado obras con título/autor erróneo.

## Estado de los problemas de la ronda 1

1. Catálogo sesgado a Rusia: **resuelto** (4 rusos con etapa; Goya, Greco, Murillo, Manet, Delacroix, Klimt, Munch con etapa; Botticelli y Miguel Ángel siguen de invitados con 2 obras).
2. Salto de dificultad: **resuelto** (parecido medio de distractores 0,42 → 2,05 casi lineal en las 32 etapas).
3. Preguntas de movimiento que se delatan: **resuelto** (siempre un movimiento contiguo; visto Leonardo con Barroco). Queda el caso «pregunta de movimiento propio» del fallo grave.
4. Práctica repetitiva: **resuelto** (0 obras repetidas por ronda en 4 800 rondas; 6-8 preguntas).
5. Pista idéntica al fallar: **resuelto** (campo `look` por obra, en acierto de obra nueva y en fallo).
6. Pistas poco discriminantes: **resuelto** (rasgo visual exclusivo por pintor; verificado en 48 obras).
7. Fin de ronda sin celebración: **resuelto** (primer día de racha, meta cumplida, «Hoy has aprendido», sello/medalla, nivel).
8. Tarjetas que parecen botón: **resuelto** (las 4 con chevron llevan a algún sitio; racha sin chevron).
9. Repaso para movimiento de un pintor: **resuelto** (solo con ≥3 pintores).
10. Progresión corta: **parcial** (32 etapas, niveles hasta «Maestro» a 7 600 XP; tras 32 etapas + 8 rondas libres llegué a «Académico»; sin objetivo a largo plazo más allá de rondas libres).
11. Desbloqueo sin mérito: **parcial** (sigue abriendo con 0 aciertos; ahora se ve «Por repasar · 71 %» y el repaso del movimiento se bloquea).
12. Ronda no persistente: **resuelto** (recarga muestra «Seguimos donde lo dejaste»; atrás abre «¿Salir?» y no sale).
13. Hoja de salir recortada a 200 %: **no verificado del todo**; la hoja no la reproduje, pero las opciones de pregunta sí se salen (problema 3 abajo).
14. Cabecera < 48 px: **resuelto** (81×48, 48×48, 52×48, 99×48; nav 125×61).
15. Barra de ronda desaparece: **resuelto** (sticky; botón salir a 6 px con scroll 246 px).
16. Títulos con «Mañana»: **no** (siguen «Mañana en un bosque de pinos» y «La mañana de la ejecución…»; son títulos reales, aceptado según la regla).
17. Audio y 350 KB de imágenes en la primera pantalla: **resuelto** (audio tras el primer clic; bienvenida con 1 imagen de 50 KB y 2 miniaturas).
18. Medallas con iniciales: **resuelto** (miniaturas de la obra, sello de movimiento).
19. Reto de etapa sin conocer al pintor: **resuelto** (pantalla «Fíjate…» previa).
20. Escritorio vacío: **parcial** (dos columnas a 1280, columna izquierda vacía bajo las tarjetas).
21. Aria-live obsoleto: **no comprobado**.
22. Reto diario por fecha local: **no** (sigue `dayKey` local; documentado, aceptable).
23. Feedback de movimiento sin explicación: **resuelto** (`blurb` del movimiento + pista de la obra).
24. «Empezar de cero» como enlace: **resuelto** (botón con borde punteado de 48 px; pide confirmación según R1/e2e).
25. Sin tests de interfaz en tests/: **no** (el e2e sigue solo en tools/).

## Problemas nuevos o pendientes (priorizados)

1. **Trampa de dominio** (ver Fallo grave 1). Dónde: planner.js `planStage`. Repro: simular «siempre el pintor de la etapa». Arreglo: ver arriba.
2. **«Practicar» fuera de pantalla.** Dónde: pantalla «Conoce a». Qué: botón en y=738 con viewport de 640 y cortado a 844 en 390×844; no es sticky (`position:static`). Repro: abrir cualquier etapa a 360×640. Arreglo: barra inferior fija con el botón.
3. **Zoom 200 % desborda.** Dónde: inicio y pregunta a 195 px de ancho. Qué: scroll horizontal; las opciones («Romanticismo», «Manierismo y…») se salen por la derecha; en inicio «Repaso de Renacimient…» se corta. Repro: viewport 195×422 y `#inicio` o una pregunta. Arreglo: `min-width:0`, `overflow-wrap:anywhere` y `flex-wrap` en `.option` y `.stage`.
4. **La respuesta fallada queda tapada.** Dónde: hoja de feedback en 360×640 y 390×844. Qué: la opción roja (la elegida) queda oculta bajo la hoja; solo se ve la verde. Repro: fallar una pregunta de 4 opciones a 360×640 (opción roja en y=374-430, hoja desde y=377). Arreglo: hacer scroll a la opción elegida o reducir la hoja.
5. **Feedback de tres líneas.** Dónde: hoja tras responder. Qué: título + pintor + blurb o pista + «Mira…» + obra: repite el rasgo («Mira los rizos…» y «Fíjate en la precisión de grabador…»); choca con «textos mínimos». Arreglo: dejar solo la frase `look` y el título/año.
6. **Obras con letrero que delatan.** Dónde: a66 (La dama del armiño, spoiler) en «¿De qué movimiento?». Qué: se permite la imagen con el nombre del autor en preguntas de movimiento. Arreglo: excluir spoilers también de preguntas de movimiento o solo cuando el letrero no sea legible a tamaño de pregunta.
7. **Bordes oscuros sueltos en el resultado.** Dónde: tarjetas «Nuevo nivel» y «Reto diario perfecto» (x-friend-result.png). Qué: dos tarjetas con borde oscuro y las demás sin él, sin motivo aparente (¿foco residual?). Arreglo: unificar o explicar.
8. **Ficheros: 483 de 512.** Dónde: app/. Qué: 236 imágenes + 198 miniaturas; solo quedan 29 archivos antes de romper la publicación como artifact; la especificación dice ~250. Arreglo: atlas de miniaturas (sprites) o generar menos tamaños.
9. **Sin compresión y 489 KB en la primera pantalla.** Dónde: 38 peticiones (30 módulos ES sueltos + catálogo de 126 KB sin comprimir). Arreglo: unir módulos o cargar `catalog.json` reducido (sin `traits`/`look` hasta necesitarlos).
10. **Conmutadores de ajustes de 52×32.** Dónde: perfil. Qué: por debajo de 48 px de alto (el texto de al lado sí es pulsable). Arreglo: ampliar el área táctil de la fila.
11. **Reto con puntuación manipulable.** Dónde: `#reto-d20261124-9`. Qué: cualquier persona puede editar la puntuación del amigo o abrir un diario de otro año (`reto-d90261124-9` se acepta). Arreglo: limitar fechas a ±1 día y avisar de que es un juego entre amigos.
12. **Hash inválido vuelve a inicio en silencio.** Dónde: `#reto-zzz`, `#etapa-nope`. Qué: sin aviso al usuario que pulsó un enlace roto. Arreglo: mensaje breve «Ese reto no es válido».
13. **Pistas de obra poco precisas en algún caso.** Dónde: a12 (Marte y Venus): «la arquitectura detrás» apenas se ve; a224: «cada hoja» es muy genérico. Arreglo: revisar `look` de obras con recorte.
14. **Escritorio con la columna izquierda vacía.** Dónde: 1280×800 inicio. Arreglo: poner racha, medallas recientes o cuadro del día debajo del reto diario.

## Errores de contenido artístico

Contrastadas 48 obras (36 de pintores con etapa y 12 de invitados) con su imagen, título, año y frase `look`: no he encontrado ninguna con autor o título erróneo. Observaciones menores: a12 y a224 con `look` poco visible (arriba); a66 con letrero; títulos repetidos legítimos (Dánae, La encajera, Autorretrato, Las grandes bañistas: Cézanne/Renoir pueden aparecer en la misma pregunta «¿Quién lo pintó?» con título idéntico). Las 18 obras `confidence: medium` no las verifiqué una a una.

## Para enganchar más

1. **Rasgos coleccionables**: cada vez que aciertas un cuadro nuevo se «desbloquea» el rasgo (sfumato, claroscuro…) y se ve una colección de rasgos, no solo de cuadros.
2. **Cuadro del día con zoom guiado**: un detalle ampliado y la pregunta «¿qué rasgo ves?» para reforzar el «Fíjate en…».
3. **Repaso espaciado visible**: aviso «tres cuadros se te olvidan hoy» en el inicio con mini-ronda de 3 preguntas (cierra la racha en 30 s).
4. **Duelo con marcador acumulado** contra el mismo amigo y resultado compartible con la miniatura de la última obra.
5. **Modo «Sala de museo»**: tras dominar un movimiento, una galería de sus obras reconocidas con sonido ambiente de su época.
