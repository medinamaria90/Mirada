# Mirada — Evaluación independiente, ronda 3

Método: servidor estático :8891; Playwright/Chrome 390×844, 360×640, 768×1024, 1280×800 y 195×422 (zoom 200 %), claro y oscuro; camino completo de 32 etapas por la interfaz (jugador con 88 % de acierto, 0 errores de consola); bots propios sobre el motor (300 semillas × 32 etapas, /tmp/ev3/bots.mjs); retos válidos/manipulados/inválidos, localStorage bloqueado, reduced-motion, teclado, cambio de día simulado (clock), <50 %, recarga a mitad de ronda, red lenta (CDP 100 KB/s, 300 ms), contraste medido por script (canvas), objetivos táctiles; 55 obras contrastadas con su imagen (24 de id b*); `node --test tests/` (80/80 en verde); validate_catalog OK (304 archivos). Capturas en docs/eval/r3/.

## Notas

| Criterio | R1 | R2 | R3 | Justificación |
|---|---|---|---|---|
| Material 3 | 8 | 8 | 8 | Superficies, hoja de feedback, oscuro y jerarquía tipográfica coherentes; sin identidad cinética propia. |
| UX | 7 | 7 | 8 | La trampa está cerrada en la práctica y «Practicar» ya es visible, pero la barra fija tapa controles/pista en 360×640 y los enlaces rotos vuelven a inicio en silencio. |
| Accesibilidad | 8 | 8 | 7 | Foco, teclado (1-4/Enter/Esc), alt neutro y 48 px casi en todo; fallos medidos: numerales de movimientos bloqueados 2,7:1, teclas «1-4» de opciones atenuadas 2,3:1, deslizador de volumen 44 px, a 200 % la hoja tapa la opción fallada, y la barra fija tapa las flechas del carrusel. |
| Rendimiento | 8 | 8 | 8 | 304 archivos (antes 483); bienvenida 36 peticiones/≈500 KB sin comprimir, mapa 49/≈560 KB, ronda +8; a 100 KB/s: bienvenida 4,4 s, mapa 5,8 s, marcadores neutros mientras cargan las miniaturas. |
| Adaptativo | 8 | 8 | 8 | Sin desbordes horizontales en los 5 tamaños; escritorio con tarjeta «Esta semana» en la columna izquierda; la hoja de feedback se corta por abajo a 1280×800. |
| Pulido | 7 | 8 | 8 | Tarjetas y chevrons coherentes, medallas con cuadro; restan «Camino completo» con 2 etapas «Por repasar» y «Hoy has aprendido» con un 14 % de aciertos. |
| Originalidad | 7 | 8 | 8 | «Enseña primero», pista `look` por cuadro, 32 pintores; sin gran novedad nueva en esta ronda. |
| Calidad técnica | 8 | 7 | 8 | Motor puro, 80 tests, antibot en tests/ y trampa cerrada; el antibot no cubre mis combinaciones (8 %) y el e2e sigue fuera de `node --test`. |

## Veredicto: NO APRUEBA por un criterio (Accesibilidad 7). No hay fallos graves; con los arreglos «imprescindibles» (≈1 h de trabajo) aprobaría.

## FALLOS GRAVES

Ninguno. Sin roturas, callejones sin salida, pérdida de progreso (recarga a mitad de ronda conserva posición 25/25), problemas de privacidad ni autor/título erróneo en las 55 obras revisadas. Con localStorage bloqueado una ronda completa funciona.

## Trampa «dominar sin mirar» (reproducido por mí)
- Bots sin mirar el cuadro (probabilidad exacta de llegar al 75 %, 300 semillas/etapa):
  - «pintor de la etapa» + «movimiento anterior más cercano»: máx. 1,6 % (R2: hasta 100 %).
  - «aprendido más reciente»: máx. 4,6 %.
  - Mixto («moneda» si hay pintor de etapa y aprendido en «quién» + regla de movimiento): 8,1 % en 14 etapas (Brueghel…Renoir, Shishkin, Repin, Van Gogh); el test del equipo exige ≤5 % pero no incluye este bot.
  - Posición de la respuesta uniforme (25,1/24,8/24,9/25,1 %).
- Exploit real pero pequeño: en «¿De qué movimiento?» la respuesta es SIEMPRE el movimiento inmediatamente anterior al de la etapa (se acierta al 100 % sin mirar); hay ≈0,9 preguntas de ese tipo por ronda.
- Alumno que NO ha estudiado el pintor actual pero conoce a los anteriores (elimina por descarte): 25–61 % de rondas dominadas (David 61 %, Renoir 59 %, Durero 53 %, Gauguin 52 %). Menos grave (hay que conocer a los anteriores), pero la etapa no exige haber visto al pintor nuevo.
- Alumno que solo estudió el pintor actual: 9–41 % (leonardo 100 % es legítimo, primera etapa).
- Estado: **RESUELTO en la práctica** (solo mejoras).
- Observación: el 6.º y el 7.º del camino se desbloquean con ≥50 %; en mi partida Fragonard (4/7) y Gauguin (4/6) quedaron «Por repasar» y aun así el mapa dice «Camino completo / Ronda libre» con 30/32.

## Estado de los problemas de la ronda 2

1. Trampa de dominio: **resuelto** (ver arriba; residuo 8 % con bot mixto).
2. «Practicar» fuera de pantalla: **parcial** (ahora es barra fija y visible en 390×844 y 360×640, pero tapa las flechas/contador del carrusel y la pista «Fíjate en…» queda bajo la barra en 360×640: pista y=616–720, barra y=575).
3. Zoom 200 % desborda: **resuelto** (0 desbordes horizontales en inicio, intro, conoce, pregunta a 195 px).
4. Respuesta fallada tapada por la hoja: **resuelto salvo 200 %** (en 390×844, 360×640, 768 y 1280 la opción roja y la verde quedan sobre la hoja; a 195×422 la roja queda parcialmente bajo la hoja).
5. Feedback de tres líneas: **resuelto** (título + pintor + una frase `look` + obra/año).
6. Obras con letrero que delatan: **resuelto** (15 con `spoiler`, incluidos b10 «Albertus Dürerus…» y b30 «A MARAT / DAVID», no salen en preguntas).
7. Bordes oscuros sueltos en el resultado: **resuelto** (tarjetas uniformes en captura).
8. Ficheros 483/512: **resuelto** (304 archivos; atlas de 17 hojas, 2,9 MB).
9. 489 KB / 38 peticiones sin comprimir: **parcial** (36 peticiones y ≈504 KB en bienvenida; catálogo de texto diferido, pero siguen 30 módulos sueltos).
10. Interruptores 52×32: **resuelto** (interruptores ≥48); queda un `input` (volumen) de 176×44.
11. Reto manipulable: **parcial** (un año distinto `d9…` se rechaza; la puntuación del amigo sigue siendo editable, inevitable sin servidor).
12. Hash inválido vuelve a inicio en silencio: **no** (`#reto-zzz`, `#etapa-nope`, `#reto-d9…` → inicio sin aviso).
13. `look` poco preciso (a12, a224): **resuelto** (a12 «seda rosa del manto junto a la armadura dorada», a224 «contornos limpios del caballo blanco»: coinciden con la imagen).
14. Escritorio con columna izquierda vacía: **resuelto** (tarjeta «Esta semana» con racha).
15. Sin tests de interfaz en tests/: **no** (e2e solo en tools/ y `tests/e2e.sh`, no en `node --test`).
- De la R1 que seguían parciales: progresión corta (32 etapas, sin metas a largo plazo: parcial); desbloqueo con ≥50 %: parcial.

## Problemas nuevos o pendientes (priorizados)

IMPRESCINDIBLE PARA LLEGAR A 8 EN ACCESIBILIDAD
1. **Barra «Practicar» tapa controles y pista.** Dónde: pantalla «Conoce a», 360×640 (y 390×844 parcial: pista y=698–802 con barra desde 779). Qué: el contador y las flechas del carrusel quedan medio bajo el botón y la pista «Fíjate en…» (lo que se enseña) no se ve sin desplazar. Repro: abrir cualquier etapa a 360×640 (captura v-360-light-learn.png). Arreglo: poner la pista encima del carrusel (o compactar el carrusel) y reservar `padding-bottom` = altura de la barra + safe-area para que nada de contenido ni flechas queden bajo ella.
2. **Contraste de textos funcionales.** Dónde: `.movement-num` de movimientos bloqueados (2,7:1 claro / 2,84 oscuro), `.key` 1–4 en opciones atenuadas (2,33:1). Arreglo: subir color ≥4,5:1 o, si es solo decorativo, ocultar a lectores y no usar texto (los numerales romanos son título del movimiento). Con la atenuación de opciones no elegidas, limitar a opacidad ≥0,7 en texto.
3. **Deslizador de volumen 44 px.** Dónde: Perfil, `input` 176×44. Arreglo: `min-height:48px` en la fila/pulgar.
4. **Hoja de feedback tapa la opción fallada a 200 %.** Dónde: 195×422; opción roja en y=134–203, hoja desde y=138. Arreglo: `scrollIntoView` de la opción elegida con margen igual a la altura de la hoja, o hoja con `max-height:45vh` y scroll interno.

MEJORAS
5. **Hash roto sin aviso** (`#reto-zzz`, `#etapa-nope`, `#reto-d90261124-9`). Toast breve «Ese enlace no es válido».
6. **«Camino completo» con etapas por repasar.** Dónde: fin del mapa con 30/32 dominados (captura full-home.png). Arreglo: mostrar «30/32 dominados · repasa Fragonard y Gauguin» o no declarar completo hasta dominar todo.
7. **«Hoy has aprendido» con 1/7 aciertos** (14 %). Dónde: resultado de Tiziano con acc 0,3. Arreglo: mostrar solo si se acertó ≥50 % o cambiar a «Repásalo: …».
8. **Exploit del movimiento anterior.** Dónde: `planStage` rama `makeMovementQuestion` con `includeMovements`. Arreglo: de vez en cuando (30 %) que la respuesta sea el movimiento de la etapa cuando la obra es de un pintor ya visto del mismo movimiento, o que la opción «anterior contiguo» no sea siempre la correcta; añadir el bot «mixto» a `tests/lib/antibot.js`.
9. **Etapa superable sin estudiar al pintor nuevo** (por descarte con pintores previos: 52–61 % en David/Renoir/Durero). Arreglo: en las preguntas «quién» de obra del pintor, rellenar con ≥2 pintores aún no aprendidos o futuros.
10. **Hoja de feedback cortada por abajo a 1280×800** (modo oscuro y claro; card sobresale del viewport por ~10 px). Arreglo: `max-height` con `calc(100vh - …)`.
11. **Peso de arranque.** 36 peticiones; empaquetar los ~30 módulos ES en 3–4 (o `modulepreload` de los de la bienvenida) y servir comprimido si la plataforma lo permite.
12. **Tests de interfaz** fuera de `node --test` (e2e.sh): añadirlo como script `npm test` documentado o un humo de 10 s con Playwright.
13. **Miniatura con franja oscura vertical** observada una vez en una opción atenuada de «¿Cuál es de Leonardo?» (borde derecho, captura z-bleed.png); no pude reproducirla al aislar a0 a opacidad plena. Revisar sangrado del atlas con opacidad <1 (`will-change`/`transform` sobre `.art-sheet`).
14. **Rareza de contenido ya señalada:** b37 muestra «JUDITH UND HOLOFERNES» en el marco (título, no autor; aceptable) y el enlace de una ronda con fecha de reto sigue por fecha local.
15. **Progresión a largo plazo** sin metas más allá de la ronda libre (R1 #10): añadir rasgos coleccionables.

## Errores de contenido artístico

55 obras contrastadas con imagen/título/autor/año/`look` (24 b*, 20 a*, 3 de R2, 8 `confidence: medium`): **ninguna con autor o título erróneo**. Observaciones:
- **a125 «La Madonna Litta», Leonardo, c. 1490–1491**: atribución discutida (Boltraffio/taller); está como `medium`. Sugerencia: «atribuida a Leonardo» o retirarla de las preguntas «quién».
- **b3 `look`** «fondo pardo y vacío»: el cuadro tiene sofá verde y almohadones; mejorar a «el cuerpo claro sobre el sofá verde, sin ningún adorno».
- **a12 `look`** «armadura dorada»: apenas se ve a tamaño de pregunta; «seda rosa» sí.
- Títulos coincidentes legítimos («Las grandes bañistas» Cézanne/Renoir) pueden salir en la misma pregunta «quién».
- Matisse (a41, a132) y Vrúbel/Serov/Makovski son invitados (sin etapa) pero salen como distractores: coherente con la regla.
- Sin «ayer»/«mañana» en textos de la app (grep en app/js limpio).

## Reglas de la dueña
- Todo lo que parece pulsable se pulsa: sí (tarjetas de resultado con chevron son botones; racha sin chevron; Repaso rápido con «Jugar»). Las opciones atenuadas no son pulsables tras responder, correcto.
- Textos mínimos: sí (hoja de feedback de 3 líneas útiles).
- Colores armoniosos: sí (paleta tierra, oscuro bien resuelto).

## ¿Engancha? ¿Enseña?
Enseña: la pista `look` por cuadro y las rondas con repaso intercalado funcionan; de 229 respuestas, 92 fueron cuadros nuevos acertados y el feedback nunca se repitió. Engancha: racha, meta diaria, repaso rápido («12 cuadros por repasar») y reto diario aparecen el día correcto (racha 1 → reinicia tras 3 días de hueco; el repaso rápido aparece al día siguiente). Falta un motivo para volver tras terminar el camino.

## 5 ideas para enganchar más
1. **Rasgos coleccionables**: al acertar un cuadro nuevo se desbloquea el rasgo (sfumato, claroscuro…) y se colecciona.
2. **Detalle ampliado del día**: un recorte de cuadro y «¿de quién es?», 10 s, sin pasar por el camino.
3. **Duelo asíncrono con marcador** contra el mismo amigo (misma semilla, historial local de 5 retos).
4. **Misión «tres cuadros que se te olvidan»** en la cabecera con progreso visible, para cerrar la racha en 30 s.
5. **Sala de museo** tras dominar un movimiento: galería de sus obras reconocidas con música de su época y un «explicador» de 1 línea por sala.
