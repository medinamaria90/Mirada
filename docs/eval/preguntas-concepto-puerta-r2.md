# Puerta de calidad — preguntas de concepto (ronda 2)

Evaluador independiente nuevo: no construyó nada y no toca código. Rama `preguntas-concepto`, commit `523be15`.

## Veredicto: **APRUEBA**

Los cinco cambios de la ronda 1 están aplicados y no hay fallos graves nuevos.

## Comprobaciones

- `node --test tests/preguntas-concepto.test.js`: 13/13 (con aserciones nuevas para la X, las letras y la rotación del tramo).
- `python3 -I tools/sync_preguntas.py --check`: correcto, 82 preguntas; el árbol queda limpio.
- `node --test tests/`: 792 pruebas, 789 pasan, 0 fallos (3 omitidas, e2e).

## Los cinco cambios

1. **Saltar sin aviso falso** ✔ — `skippable: true` en `concept-quiz.js`; en `lesson.js` la X llama a `leaveRound()` sin
   hoja y su `aria-label` es «Saltar las preguntas». «Atrás» del navegador sigue preguntando, ahora «¿Dejar las
   preguntas?» sin «Perderás…». Las demás rondas no cambian (mismo texto y hoja por defecto).
2. **Resultado con sentido** ✔ — «N de M acertadas» o «¡Todas acertadas!».
3. **Historial desde el mapa** ✔ — sin `next`, `onEnd` hace `history.back()` si hay ruta previa (la ruta se abre con
   `ctx.go` desde `path-actions.js`, es decir, con push) y, si se entró por enlace directo, `inicio` con `replace`. La
   guarda se retira antes (`afterGuard` espera al `popstate`), así que no hay dos atrás seguidos ni dos mapas. Mismo
   patrón que `recall.js`. Falta la prueba o comprobación e2e que se pidió (nota abajo).
4. **Tramos sin repetición** ✔ (vía alternativa aceptable) — `tramoCount`: dos la primera vez y, cuando ya salieron
   las dos, una sola, la menos reciente; con la prueba de que la segunda visita trae solo `again[0]`. Ya no salen las
   mismas dos al reabrir; con dos por tramo la rotación es a/b alterna, suficiente hasta ampliar el banco.
5. **Detalles técnicos** ✔ — espaciados de `conceptos.css` en variables (`--cq-gap-sm`, `--cq-space`, `--cq-chip-pad`;
   no hay escala global de espaciado a la que remitir), comentario de `router.js` en su sitio y letras de opción
   repartidas tras barajar (la buena ya no es siempre `a` en el DOM; `answerId` coherente).

## Notas

| Criterio | Nota | Motivo |
|---|---|---|
| Material 3 (equivalente web) | 8 | Sin cambios visuales; reutiliza ronda, hoja y botones. |
| UX | **8** | Saltar en un toque, resultado legible, atrás vuelve a donde se estaba y el tramo no repite. |
| Accesibilidad | 8 | Nombre del botón acorde a lo que hace; lo demás, como en la ronda 1. |
| Rendimiento | 9 | Sin cambios: carga perezosa del banco, CSS y módulo. |
| Adaptativo | 8 | Sin cambios de maquetación. |
| Pulido | 8 | Hoja de «atrás» sin texto sobrante; aviso final claro. |
| Originalidad | 9 | Igual que en la ronda 1. |
| Calidad técnica | 8 | Cambios pequeños y probados. Pendientes menores: prueba del cambio 3, `flows.js` en 708 líneas, y el ternario anidado de `onEnd` se leería mejor como función. |

## Fallos graves

Ninguno.

## Mejoras sugeridas (no bloquean)

- Comprobación en el e2e (o prueba con el DOM de `tests/test-salida.test.js`) de que, tras las preguntas de un tramo
  abiertas desde el mapa, un solo «atrás» sale del mapa.
- Subir el banco a 3-4 preguntas por tramo cuando haya tiempo: la rotación de una en una es correcta, pero breve.
- Partir `flows.js`.
