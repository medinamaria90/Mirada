# Mirada — Evaluación independiente, ronda 1

Método: servidor estático en :8841, Playwright/Chrome en 390×844, 360×640, 768×1024 y 1280×800 (claro y oscuro); partida completa de las 23 etapas con jugador "omnisciente", fallos a propósito, recarga a mitad de ronda, atrás/adelante, enlace de reto (válido e inválido), teclado, zoom de texto 200 %, reduced-motion, localStorage bloqueado, medición de contraste y de objetivos táctiles, y análisis del motor sobre 690 etapas generadas. Tests unitarios: 44/44 en verde. Consola: 0 errores/avisos en todos los recorridos. Capturas en docs/eval/r1/.

## Notas

| Criterio | Nota | Justificación |
|---|---|---|
| Material 3 | 8 | Jerarquía, superficies, hoja inferior de feedback, estados (acierto/fallo/bloqueado/dominado) y modo oscuro coherentes; falta movimiento con carácter (casi no hay celebración). |
| UX | 7 | Flujo claro (conocer, practicar, cuadros nuevos), reintentos y confirmación al salir; pero salto de dificultad brusco, práctica repetitiva y final de ronda poco celebratorio. |
| Accesibilidad | 8 | Contraste medido ≥ 6,8:1 en textos secundarios, foco visible, aria, teclado 1-4/Esc, alt neutro; cabecera a 42-44 px (<48) y hoja de salir recortada al 200 %. |
| Rendimiento | 8 | Primera pantalla: 47 peticiones, ~705 KB (incluye 3 JPG de ~350 KB y todo el motor de audio, ~60 KB, cargado antes de pintar); mapa casi sin coste extra; sin bloqueos; cascada de ~40 módulos ES sin bundle. |
| Adaptativo | 8 | Sin desbordes en los 4 tamaños, columna centrada en escritorio y feedback sin tapar la respuesta a 360×640; en escritorio queda mucho vacío y la barra superior de la ronda desaparece al hacer scroll en móvil pequeño. |
| Pulido | 7 | Tipografía y paleta muy cuidadas; fallos: tarjetas de evento que parecen pulsables, texto de hoja recortado con zoom, "Repaso disponible" por un movimiento de un solo pintor, medallas con iniciales. |
| Originalidad | 7 | Identidad de museo bien resuelta (serif, paleta cálida, medallas de sello); pero el catálogo (11 de 23 etapas son pintores rusos; sin Goya, Miguel Ángel, Botticelli, Manet…) diluye la propuesta para un público hispano. |
| Calidad técnica | 8 | Motor puro y determinista, esquema versionado, almacenamiento con degradación, 44 tests, ID de retos validados; sin tests de UI/e2e en el repositorio de tests y el estado de la ronda no se persiste. |

Nota para la puerta (todos ≥ 8): NO aprueba — UX 7, Pulido 7, Originalidad 7.

## FALLOS GRAVES

1. **Contenido que rompe la promesa y la curva de dificultad (efectivamente una trampa de aprendizaje).** Las etapas 11-19 (Vasnetsov, Kuindzhi, Shishkin, Levitán, Polénov, Súrikov, Repin, Perov, Makovski) son 9 realistas rusos seguidos; en esas etapas el 52-99 % de los distractores de "¿Quién lo pintó?" son del mismo movimiento y las pistas "Fíjate en…" describen tema, no rasgo visual. Medido con el motor (40 semillas por etapa): parecido medio de distractores 0,00 en las 4 primeras etapas, 0,27 en Velázquez, 0,64 Aivazovski, 1,34 Vasnetsov, 2,3-2,6 desde Repin. Un principiante pasa de "imposible equivocarse" a "adivinar" sin transición, y las obras de Goya, Miguel Ángel, Botticelli, El Greco, Murillo, Rubens, Delacroix, Manet, Klimt, Munch quedan como "invitados" sin etapa. (data/catalog.json, js/engine/planner.js `baseDifficulty`.)

No hay roturas, callejones sin salida, pérdidas de progreso entre rondas ni problemas de privacidad detectados (localStorage bloqueado: la partida completa funciona en memoria; hash de reto inválido o de índice inexistente: aviso o vuelta a inicio).

## Problemas priorizados (25)

1. **Catálogo sesgado a Rusia.** Dónde: catalog.json / mapa. Qué: 25 de 71 artistas son rusos, 9 etapas seguidas de realismo ruso, Rococó/Neoclasicismo y Simbolismo sin etapas (ocultos). Repro: abrir el mapa completo. Arreglo: promover a etapa Goya, Botticelli, Miguel Ángel, El Greco, Murillo, Manet, Delacroix, Klimt con ≥4 obras, y reducir los rusos a 3-4 (Repin, Shishkin, Aivazovski).
2. **Salto de dificultad.** Dónde: planner.js `baseDifficulty` + `pickDistractorArtists`. Qué: ver Fallo grave 1. Repro: jugar Repin tras Velázquez. Arreglo: curva por etapa con tope de 1 distractor "similar" hasta la mitad del camino y rampa gradual; intercalar etapas de contraste entre bloques parecidos.
3. **Preguntas que se delatan por descarte.** Dónde: preguntas de movimiento en las primeras etapas. Qué: la Dama del armiño con opciones Impresionismo / Renacimiento / Simbolismo / Postimpresionismo: solo una opción es anterior a 1800. Repro: Leonardo, pregunta 1 con semilla cualquiera. Arreglo: al menos un distractor contiguo en movimiento desde la etapa 1 y no preguntar movimiento antes de haber enseñado ese movimiento.
4. **Práctica repetitiva.** Dónde: `planStage`. Qué: 5 preguntas de práctica sobre 2-3 obras (media 2,65 obras distintas); Caravaggio y otros con 2 obras `learn`: la misma obra sale 2-3 veces en 5 preguntas. Repro: jugar Caravaggio. Arreglo: máximo 1 pregunta por obra en práctica y añadir una variante "señala el rasgo".
5. **La pista "Fíjate en…" solo se enseña una vez y se repite idéntica al fallar.** Dónde: lesson.js `showFeedback`. Qué: tras un fallo se muestra el mismo texto genérico del pintor, sin relación con la obra concreta; en acierto no se refuerza. Repro: fallar dos preguntas de Leonardo. Arreglo: pista por obra (campo `look` en artworks) y mostrar rasgo en aciertos de cuadros nuevos.
6. **Pistas poco discriminantes.** Dónde: catalog.json `hint`. Qué: Velázquez y Tiziano comparten "pincelada suelta"; Levitán/Shishkin/Polénov hablan de "paisaje" sin rasgo distinguible; Repin/Surikov/Perov describen tema. Arreglo: reescribir con un rasgo visual exclusivo por pintor y una comparación con su "similarTo".
7. **Final de ronda sin celebración.** Dónde: result.js. Qué: la primera ronda no muestra racha (solo si >1), no hay confeti/pulso en medalla, las tarjetas aparecen con fundido y ya; "Muy buen ojo" no es una recompensa. Repro: completar la primera etapa. Arreglo: ver "Para enganchar más" 1-3.
8. **Tarjetas de evento con aspecto de botón que no se pulsan.** Dónde: result.js `.event` ("Siguiente etapa" con círculo y chevron). Qué: viola la regla de la dueña. Repro: terminar etapa y tocar "Siguiente etapa · Rafael". Arreglo: hacerlas pulsables (ir a esa etapa) o quitar el chevron/círculo.
9. **"Repaso disponible" para un movimiento de un solo pintor.** Dónde: progress.js `isReviewUnlocked`. Qué: tras Bruegel aparece "Repaso de Manierismo y Renacimiento del Norte" (sin más obras que las ya vistas) y también para movimientos de 1 pintor (Postimpresionismo). Arreglo: exigir ≥3 pintores o fusionar movimientos.
10. **Progresión demasiado corta.** Dónde: progress.js LEVELS. Qué: con 23 etapas perfectas se llega a 4110 XP (Comisario) y no hay objetivo posterior; tras ~2 minutos de partida simulada no queda nada nuevo salvo reto diario/repaso. Arreglo: más etapas (puntos 1-2) y niveles hasta ~8000 XP, más modos de repaso.
11. **Desbloqueo sin mérito.** Dónde: `isArtistUnlocked` (plays>0). Qué: la siguiente etapa se abre aunque se saque 0/8; "dominado" no condiciona nada. Repro: fallar todo en Leonardo y ver Rafael abierto. Arreglo: mantenerlo abierto pero mostrar estado "por repasar" y recomendar repetición; aceptable si se comunica.
12. **Ronda no persistente.** Dónde: lesson.js / main.js. Qué: recargar a mitad de ronda vuelve a la pantalla "Conoce a" y se pierde la ronda; atrás sale sin avisar (la ronda comparte hash con la lección). Repro: iniciar práctica, F5, o botón atrás. Arreglo: guardar la ronda en memoria/localStorage y confirmar en atrás.
13. **Hoja de salir recortada con texto al 200 %.** Dónde: `.quit-sheet`. Qué: "¿Salir de la ronda?" se corta por la derecha y Seguir/Salir quedan en una fila apretada. Repro: zoom 200 % + Esc en una ronda. Arreglo: `overflow-wrap`, `flex-wrap` y título con `max-width:100%`.
14. **Cabecera por debajo de 48 px.** Dónde: shell. Qué: Mirada 74×42, Racha 53×44, Nivel 107×44, Ajustes 44×44; además racha y nivel parecen botones (¿llevan a algo?). Arreglo: 48×48 mínimo y confirmar su destino (perfil).
15. **La barra de ronda desaparece en pantallas pequeñas.** Dónde: lesson.js + `revealCorrect`. Qué: a 360×640, tras responder se hace scroll y se pierde el botón de salir y el progreso. Arreglo: barra `position:sticky`.
16. **Título de obra "Mañana…".** Dónde: catalog.json (a… "Mañana en un bosque de pinos", "La mañana de la ejecución de los strelitzi"). Qué: la regla prohíbe "mañana" en textos; son títulos reales pero se muestran en el pie de feedback. Arreglo: dejarlo con aviso a la dueña o usar título sin esa palabra.
17. **Primera pantalla carga el audio entero.** Dónde: main.js `loadAudio` en `Promise.all`. Qué: ~60 KB de módulos de audio bloquean el arranque y 350 KB de imágenes en bienvenida. Arreglo: importar audio de forma perezosa en el primer clic; imágenes de bienvenida más pequeñas.
18. **Medallas con iniciales.** Dónde: medals.js, perfil. Qué: "IA", "KB", "VV"… no reconocibles; bloqueadas "I, II, III". Arreglo: miniatura de la obra o motivo gráfico por movimiento.
19. **Reto de etapa a quien no ha aprendido al pintor.** Dónde: challenge.js. Qué: un enlace `#reto-s…` salta la fase "Conoce" y pregunta sobre obras de `learn` nunca enseñadas, primera pregunta de movimiento sin contexto. Arreglo: pantalla corta con las 3 obras antes de aceptar.
20. **Escritorio con mucho vacío.** Dónde: 1280×800. Qué: columna de ~560 px, laterales vacíos. Arreglo: panel lateral con racha/medallas o imagen mayor en preguntas.
21. **Aria-live obsoleto.** Dónde: `#live`. Qué: tras `#reto-s99x1-3` el texto del lector sigue diciendo "Reto · Leonardo da Vinci". Arreglo: limpiar al renderizar pantallas de error.
22. **Reto diario por fecha local.** Dónde: dates.js `dayKey`. Qué: "igual para todos" depende de la zona horaria; cambio a medianoche local. Arreglo: aceptar y documentar, o usar fecha en Europe/Madrid.
23. **Textos en feedback de movimiento.** Dónde: lesson.js. Qué: en fallo de movimiento la línea 2 repite el nombre del pintor + pista de pintor, pero no explica por qué es de ese movimiento. Arreglo: usar el `blurb` del movimiento en un fallo de tipo movimiento.
24. **"Empezar de cero" parece enlace pequeño.** Dónde: profile.js. Qué: botón destructivo con aspecto de texto subrayado; sí pide confirmación. Arreglo: botón con borde y objetivo 48 px.
25. **Sin tests de interfaz en tests/.** Dónde: tests/. Qué: 44 pruebas del motor, el e2e vive en tools/ y no se ejecuta con `run-all.js`. Arreglo: incluirlo con el servidor local.

## Para enganchar más (ordenadas por impacto/coste)

1. **Celebración de fin de etapa** (alto/bajo): sello de medalla que cae y se estampa, pulso de color del movimiento, contador de XP con sonido, y mostrar la racha desde el día 1 ("Primer día").
2. **Meta diaria visible** (alto/bajo): anillo de "una ronda hoy" en la cabecera que se rellena y activa la racha; hoy el motivo para volver al día siguiente solo se ve en perfil.
3. **Frase de cierre con un rasgo aprendido** (alto/bajo): "Hoy has aprendido: sfumato" con la obra y el rasgo en grande, para que se sienta el progreso de conocimiento, no solo de puntos.
4. **Combo con efecto** (medio/bajo): hoy solo el texto "3 seguidas"; añadir pulso en la barra y sonido ascendente.
5. **Más contenido hispano y mejor curva** (muy alto/alto): Goya, Velázquez, El Greco, Murillo, Miguel Ángel, Botticelli como etapas; es la mejora de enganche más grande por duración y relevancia.
6. **"Cuadro del día" y repaso por rasgos** (medio/medio): una obra con la pregunta "¿qué rasgo ves?" para reforzar el "Fíjate en…".
7. **Mapa con hitos** (medio/medio): fin de movimiento con pantalla propia, galería de las obras reconocidas de ese movimiento.
8. **Duelo con histórico** (medio/medio): guardar los retos aceptados y mostrar marcador contra el mismo amigo.
