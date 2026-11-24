# Evaluación ronda 6 (visor, sin zoom, práctica)

Método: Playwright/Chrome táctil 390×844 y 360×640 (oscuro), 1280×800 sin táctil (oscuro), 844×390 apaisado; motor real (planStage, 300 semillas/etapa). `node --test tests/`: 103 pasan, 1 omitida (e2e opt-in). Capturas en docs/eval/r6/. Servidor cerrado.

## Notas
| Criterio | Nota | Frase |
|---|---|---|
| Material 3 | 8 | Visor modal oscuro sobrio, botones tonales y foco coherentes; sin rasgos propios nuevos. |
| UX | 7 | Visor muy logrado, pero responder «¿Cuál es de X?» pasa a costar 2 toques y la colección/medallas/mapa no abren el cuadro directamente. |
| Accesibilidad | 8 | dialog modal, foco a «Es este»/Cerrar y devuelto al abrir-cerrar, Esc, atrás; sin fugas en alt/aria. Sin lector real. |
| Rendimiento | 8 | Visor diferido; miniatura del atlas bajo la imagen grande; solo carga la actual y vecinas. |
| Adaptativo | 8 | Vertical, apaisado y escritorio bien; apaisados anchos quedan pequeños en móvil vertical (358×179). |
| Pulido | 8 | Limpio; pequeños flecos (carrera, hueco sobre el grid en «¿Cuál?»). |
| Originalidad | 8 | Igual que R5. |
| Calidad técnica | 8 | 103 tests verdes, antibot intacto; el visor se carga de forma diferida. |

## Veredicto: NO APRUEBA (UX 7). Sin fallos graves (sin roturas, pérdida de progreso ni fugas).

## Fallos graves
Ninguno. Fugas: en pregunta sin responder, el visor solo contiene el prompt, «n / 4» y «Es este»; ni título, autor ni año en texto, alt (vacío) ni aria (`Cuadro para identificar`, `¿Cuál es de Leonardo?`); los src son ids opacos (img/a93.jpg, img/s/r4.jpg). Tras responder el visor sí muestra las 4 fichas (correcto).

## Verificado y bien
- Visor: abre en Conoce a, bienvenida, galería, ficha de colección, sello de medalla, preguntas (3 tipos), tras responder (miniaturas y cuadro del feedback). Imagen entera (contain), miniatura mientras carga, grande 1000×500 / 671×1000 cargada.
- Cierre: aspa, Esc, atrás (queda en Conoce a / en la misma pregunta; el segundo atrás da «¿Salir de la ronda?»), fuera (barra superior). Foco devuelto al cuadro abierto. Hoja/ficha subyacente sigue abierta al cerrar el visor.
- Sin zoom: pellizco con CDP en página y en visor → visualViewport.scale = 1; doble toque no amplía. Deslizar entre cuadros (swipe táctil real), flechas y carrusel de Conoce a funcionan.
- «Cerrar no responde» comprobado. «Es este» (208×52 px) responde con la miniatura visible.
- Práctica: Durero/Murillo etc. (pocas obras) 1–2 recién; Caravaggio, Velázquez, Rafael, Rembrandt y resto de 3+ obras: 1 recién por ronda. Resto de preguntas, cuadros no enseñados.

## Problemas
### Imprescindible
1. **Leonardo (primera impresión) incumple «como mucho una recién vista» y repite cuadro.** Dónde: planner.firstStageSlots. Leonardo tiene 7 obras, pero una (La dama del armiño) es `spoiler` y la Madonna Litta está atribuida, así que solo hay 3 cuadros nuevos preguntables: salen 2 recién (La última cena y La Gioconda) de 6 preguntas, y para llegar a MIN_ROUND=6 **se repite un cuadro nuevo** (p. ej. La virgen y santa Ana primero en «¿Quién?» y luego en «¿Cuál?»; mismo patrón en seeds a, b, c). 5 de 6 son «¿Cuál es de Leonardo?» sobre las mismas 5 obras: justo lo que la dueña criticó. Arreglo: dejar 1 recién; permitir la Madonna Litta como cuadro «¿Cuál?» (o bajar MIN_ROUND a 5 en la 1.ª etapa); mezclar un «¿De qué movimiento es?» no está disponible (nadie antes), así que una ronda de 5 sin repetir es mejor.
2. **Responder «¿Cuál es de X?» cuesta 2 toques mínimo** (miniatura → «Es este») y en móvil no hay respuesta directa (1-4 solo con teclado). Antes era 1. Se entiende sin texto (el prompt va arriba del visor), no hay respuesta por error (cerrar no responde), pero en rondas de 6–8 preguntas duplica la fricción. Arreglo: tocar la miniatura responde directo con el visor accesible por la marca de ampliar de la esquina (ya está), o conservar el patrón pero con «Es este» también por doble flecha... lo más claro: toque en la miniatura = responder; marca ⤢ = visor. (Decisión de la dueña; no lo cambio yo.)
3. **Dificultad más dura para el alumno atento.** Simulación (motor real, 300 semillas, 88 % vistas / 70 % no vistas): dominio por ronda 49–71 % (media ≈ 60 %); mínimo Aivazovski 49 %, Durero 53 %, Murillo 53 %, Monet/Levitán 52 %, Degas 51 %, Leonardo 60 %. Con 88 % plano: 76–94 % (media ≈ 83 %). R5 fue 62–89 % (media 78,5 %) con 70/90/88. Fallar casi 1 de cada 2 rondas con un alumno atento es frustrante; apunta a 65–80 % (p. ej. perdonar un fallo en no vistas o 1 pregunta más de repaso fácil).

### Mejora
4. **No abren el cuadro al pulsar** (navegación): carátulas del mapa (`stage-thumb`), tarjeta «Continuar» (`card-thumb`), rejilla de Colección (`coll-item` abre la ficha; el cuadro grande de la ficha sí abre el visor: 2 toques) y miniaturas de medallas (abre la hoja; el sello sí abre visor). Contra la frase «cada cuadro, si lo picas, se pone en pantalla completa, y eso en toda la aplicación»: al menos Colección debería abrir el visor directo. Mapa/Continuar son botones de navegación: aceptable.
5. **Cuadros apaisados en móvil vertical quedan pequeños** (La última cena 358×179 de 390×844; 328×164 a 360). Sin zoom no se puede ampliar. Mejora: pista de «gira el móvil» o permitir rotar (en apaisado se ve 235×228 con 390 de alto; válido).
6. **Carrera «Es este»**: tocar «siguiente» y «Es este» en <100 ms responde con el cuadro anterior (la posición se actualiza por scroll+rAF). Con ≥150 ms correcto. Arreglo: fijar `pos` a k en goTo y desactivar «Es este» mientras desliza.
7. Recargar con el visor abierto en la primera pregunta de Leonardo devuelve a «Conoce a» (el progreso se guarda tras la primera respuesta; no hay pérdida real).
8. Hueco vertical de ~180 px sobre el grid en «¿Cuál es de X?» a 390×844.
9. Tocar fuera: en cuadros verticales a 360 de ancho, el fondo accesible es solo la barra superior; el aspa y Esc siguen.

## Qué no probé
Detalle del día (no había fila en mi estado), retos diario/semanal, intro de movimiento (la pared de intro con zoom: mi estado no la mostró), sala jugada y su Conoce a, perfil en visor, 195 px, reduced-motion, red lenta, lector de pantalla real, Safari iOS (gesturestart), claro en escritorio, dominar etapas jugando por interfaz más allá de Leonardo; la simulación de rondas es del motor, no por interfaz. No jugué Durero ni Caravaggio por UI (solo plan del motor).
