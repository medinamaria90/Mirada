# Mirada — Evaluación independiente, ronda 5 (confirmación)

Método: servidor estático :8931; Playwright/Chrome 390×844, 360×640, 1280×800 y 195×422, claro y oscuro. Auditoría propia de contraste (peor caso sobre degradados) y áreas táctiles ≥48 px en inicio, Perfil, Medallas, Colección, bloque «Hoy», detalle del día, hoja de medalla, galería, resultado y retos (4 tamaños × 2 temas en lo principal): 0 fallos de contraste, 0 objetivos < 48 px, 0 desbordes. Jugadas por interfaz: Leonardo (ratón, con un fallo), Durero y Munch (solo teclado, de la intro de movimiento al resultado), Gauguin (ratón, un fallo), Rembrandt con todo fallado (medición de la hoja de feedback a 4 tamaños). Simulación con el motor real (planStage + stageRoundMastered, 300 semillas × 32 etapas, script propio /tmp/ev5/sim.mjs). `node --test tests/`: 99 pasan, 1 omitida; con `MIRADA_E2E=1` el humo e2e pasa en 19 s. 306 archivos (< 512). 0 errores de consola en todo lo jugado. Capturas en docs/eval/r5/.

## Notas

| Criterio | R4 | R5 | Justificación |
|---|---|---|---|
| Material 3 | 8 | 8 | Hojas, diálogo de medalla (modal nativo), tarjeta «Hoy» y oscuro coherentes; sigue sin identidad cinética/forma propia. |
| UX | 8 | 9 | Dominio justo con 2 obras (77–79 % para el alumno atento), «Ojo de X · n/m» visible, medallas pulsables que explican qué piden, bloque «Hoy» compacto, aviso en retos con pintores no vistos. |
| Accesibilidad | 8 | 8 | Contraste y Enter cerrados (0 fallos medidos; Enter avanza en la intermedia con foco en el botón; Esc cierra la medalla y devuelve el foco a la medalla); sin lector de pantalla real ni `forced-colors`. |
| Rendimiento | 8 | 8 | Arranque 22 peticiones/371 KB (bienvenida) y 34/497 KB (inicio) con mi método (no comparable con el de R4, incluye tipografías); 306 archivos de módulos sueltos. No medido en red lenta. |
| Adaptativo | 8 | 8 | 0 desbordes; hoja de feedback sin tapar opciones marcadas ni la frase `look` a 195/360/390/1280; a 195 px la cabecera ocupa ~170 px de 422 y el prompt queda bajo la barra (ver mejoras). |
| Pulido | 8 | 8 | Resultado, medallas y «Hoy» limpios; restan detalles (prompt recortado con la hoja abierta, «Ojo de Rafael · 3/7» partido en dos líneas). |
| Originalidad | 8 | 8 | «Ojo de…» con progreso, sala por movimiento, detalle del día y reto semanal; nada nuevo que suba a 9. |
| Calidad técnica | 8 | 8 | 99 tests, antibot, humo e2e de 19 s dentro de `node --test` con `MIRADA_E2E=1` (sigue sin ser el modo por defecto); sin errores de consola. |

## Veredicto: APRUEBA (todos ≥ 8, sin fallos graves). Nada se ha roto respecto a la ronda 4.

## Fallos graves
Ninguno. Sin roturas, callejones sin salida, pérdida de progreso (recarga a mitad de ronda en Durero conserva pregunta y racha de aciertos), trampas, problemas de privacidad ni datos de arte erróneos vistos (no repetí la verificación de 48 obras; las imágenes/títulos/autores que aparecieron en las capturas son correctos: La última cena, Autorretrato de Durero, El denario del César, La vocación de san Mateo, La rendición de Breda, El descendimiento de la cruz de Rubens, etc.).

## Trampas «dominar sin mirar» (motor real, 300 semillas por etapa, máximo sobre 32 etapas)
- «Siempre el pintor / movimiento de la etapa» (en «¿Cuál?» al azar): 0,7 % máx. (Leonardo 1 %).
- «Por descarte» (conoce a los pintores/movimientos anteriores, descarta lo conocido, azar entre el resto): máx. 24 % (Veronés), media 7,5 %. (R4: ≤ 22 %; mismo orden, no es explotable: hacen falta 3 etapas seguidas sin mirar y cada ronda se rehace.)
- Alumno atento (88 % plano): dominio por intento 76–94 % en las 32 etapas, media 84 %. Con 70 % en obra nueva propia / 90 % obra vista / 88 % resto: 62–89 %, media 78,5 %; el mínimo es Leonardo (62 %, 6/6 propias, hay que acertar 5/6).
- Pintores de 2 obras propias (Durero, David, Gauguin, Munch): 77–79 % (R4: 57–61 %). Problema 3 resuelto de verdad, y no abre trampa: la regla perdona un fallo solo si lo acertado es el «¿Cuál es de X?» (relleno sin aprender, 1 de cada 4 por descarte).

## Estado de los problemas 1–12 de la ronda 4
1. Contraste de numerales de rachas bloqueadas: **resuelto**. Sello bloqueado = `--ink-2` sobre `--surface-2` (como el rótulo), sello conseguido = blanco sobre #6a5434; 0 fallos en Perfil/Medallas, claro y oscuro, 4 tamaños.
2. Enter en la pantalla intermedia: **resuelto**. El foco cae en «Vamos» (descrito por el título) y Enter lo pasa (probado en Durero y Munch solo con teclado). Antes, la intro de movimiento: Tab→Entrar→«Conoce a» con foco en el título, funciona.
3. Dominio duro con 2 obras: **resuelto** (arriba).
4. «Ojo de…» invisible: **resuelto**. Medalla pendiente «Ojo de Rafael · 3/7» en Perfil/Medallas y la hoja de la ganada («Reconoces todos sus cuadros · Conseguida el …»). No vi la línea `eye-line` en Colección con mi estado sembrado (puede requerir obras en `collection`; no lo comprobé).
5. Medallas inertes: **resuelto**. Son `<button aria-haspopup="dialog">` que abren un `<dialog>` modal: título, subtítulo y fecha o «Acierta un cuadro que no habías visto»; foco en «Cerrar», Tab se queda dentro, Esc cierra y devuelve el foco a la medalla (sin fallo en 5 tamaños; a 195 px la hoja mide 388 de 422 px y cabe).
6. Detalle del día difícil: **mejorado**. El recorte de Rubens (rostros y manos) es reconocible y la respuesta, una sola al día, persiste tras recargar («Hecho»). Solo vi un día; no re-muestreé ocho.
7. Reto semanal/diario para jugador nuevo: **resuelto**. «Te han retado · 12 de 15 · Salen pintores que aún no has visto · Aceptar el reto / Ahora no». Aceptar entra en la primera pregunta. (Sigue siendo duro, pero avisa.)
8. «66/143 cuadros por repasar»: **resuelto**. «Repaso de hoy · 3 cuadros».
9. Frase `look` bajo «Continuar» a 195 px: **resuelto** (0 casos de frase tapada en 16 respuestas × 4 tamaños; a 195 px la hoja es desplazable y la última línea de título/año queda bajo el degradado hasta que se desplaza).
10. Hueco del resultado: **no re-evaluado en Ronda libre**; el resultado de etapa a 390 se ve compacto y bien (meta del día, «Lo has reconocido sin verlo antes», «Siguiente etapa»).
11. Mapa tras 5 tarjetas: **resuelto**. Con camino avanzado: «Hoy» (3 filas: Reto diario, Repaso de hoy, Detalle del día) en una sola tarjeta con filas de 48 px; con todo dominado: Ronda libre + Semanal + Diario y el mapa asoma. Con camino a mitad, el mapa hace auto-scroll a la etapa actual y el bloque «Hoy» queda arriba, fuera de la primera pantalla (por diseño).
12. Dos cifras de «reconocidas»: **no re-evaluado** (Perfil dice «Reconoces 0 cuadros» y «Dominados 32/32» en mi estado sembrado, coherente; no probé el caso 41/120).

## Regresiones o problemas nuevos

IMPRESCINDIBLE: ninguno.

MEJORAS
1. **Prompt recortado bajo la barra con la hoja de feedback abierta.** Dónde: ronda, «¿Quién lo pintó?»/«¿De qué movimiento es?» con imagen alta. Qué: al abrir la hoja la página se desplaza para dejar visibles las opciones marcadas y el título de la pregunta queda parcial o totalmente bajo la barra (390×844: 8 de 16 respuestas; 360×640: 11 de 16; 195×422: 16 de 16; 1280×800 ninguna). Las opciones marcadas y la frase nunca quedan tapadas, así que no bloquea nada. Repro: Rembrandt, fallar todo con 360×640, captura fb-360.png / k-durero-wrong.png. Arreglo: reducir la altura máxima de la imagen mientras la hoja está abierta o fijar el prompt bajo la barra.
2. **«Ojo de Rafael · 3/7» se parte en dos líneas** en el rótulo de la medalla (390 px): acortar a «Ojo de Rafael» + «3/7» en línea aparte intencionada, o quitar el punto medio.
3. **195 px (200 % de zoom):** la cabecera ocupa ~170 px de 422 (marca, chips y nivel en tres filas) y el título de la tarjeta se parte en cuatro líneas; usable pero apretado.
4. **Galería** «3 obras» cuenta solo las reconocidas (coherente con el diseño, pero sin etiqueta «reconocidas» alguien puede esperar las 18).
5. Medir arranque en red lenta y empaquetar módulos (R4 punto 13) sigue pendiente; e2e humo dentro de `node --test` sigue siendo opt-in (`MIRADA_E2E=1`).

## Reglas de la dueña
- Todo lo pulsable se puede pulsar: medallas, filas de «Hoy», tarjetas, sellos; sin elementos inertes con aspecto de botón encontrados en Perfil/Medallas/inicio.
- Textos mínimos y humanos: «Ese enlace no vale», «Se abre al dominar el movimiento», «Salen pintores que aún no has visto», «Acierta un cuadro que no habías visto». Sin explicaciones bajo botones.
- «ayer»/«mañana»: 0 apariciones en js, css, index.html ni en catalog-text.json.
- Colores armoniosos: paleta tierra y oscuro coherentes en todas las capturas.
- Enlaces: `#reto-zzz`, `#etapa-nope` (con estado), `#reto-d20261201-5` (futuro), `#reto-d20261124-7.` → inicio + «Ese enlace no vale»; `#galeria-barroco` sin dominar → inicio + «Se abre al dominar el movimiento».

## Qué no probé
Red lenta (100 KB/s); cambio de día/semana con reloj simulado; reduced-motion; localStorage bloqueado; 768×1024; salas de movimiento (jugarlas), audio y música; Ronda libre y su resultado (problema 10); repaso rápido jugado; recorrido completo de 32 etapas por interfaz (el recorrido completo lo hice solo sobre el motor); e2e completo (`tests/e2e.sh`); lector de pantalla real, `forced-colors`; revisión de datos de arte de las 48 obras de R4 (solo vi unas 10 en capturas); línea «Ojo de…» en Colección; Safari/Firefox.
