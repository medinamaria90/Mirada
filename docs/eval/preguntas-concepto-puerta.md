# Puerta de calidad — preguntas de concepto (ronda 1)

Evaluador independiente: no construyó nada de esto y no toca código. Rama `preguntas-concepto`, commit `6c4fb54`.

## Veredicto: **NO APRUEBA** (UX 7)

No hay fallos graves. Falta un punto de UX: saltar las preguntas cuesta dos toques y un aviso que no viene a cuento, el
resultado final no se entiende y, desde el mapa, al terminar queda una entrada repetida en el historial. Son arreglos
pequeños (lista abajo).

## Comprobaciones

- `node --test tests/preguntas-concepto.test.js`: 13/13. `node --test tests/`: 792 pruebas, 789 pasan, 0 fallos (3 omitidas, e2e).
- `python3 -I tools/sync_preguntas.py --check`: correcto, 82 preguntas.
- Banco: 9 épocas × 4 y 23 tramos × 2. La buena es la más larga en 15 de 58 preguntas de texto y la más corta en 14
  (lo esperable al azar es 25 %): **sin pista por longitud**. Ninguna fecha en enunciados ni opciones; porqués ≤ 173
  caracteres. La respuesta es siempre `a` en el banco, pero el motor baraja las opciones (`conceptQuestion`, con prueba).
- Correcciones del revisor: las 6 CAMBIAR tienen la obra nueva (w867403, w594477, w4388208, w1237250, w1070896, w941416)
  y las CORREGIR comprobadas están aplicadas (sin «vírgenes», «mellada», «quizá», «compañero de tramo», «propios ojos»;
  con «primer Renacimiento» y «femme fatale (…)»). Los diez «Es el primer…» han desaparecido.
- Muestreo de 23 preguntas (barroco-cambia, realismo-cual, t-manierismo-cual, t-flandes-rompe, realismo-cambia,
  t-vida-comun, manierismo-comun, barroco-comun, t-impresionistas-comun, rococo-cambia, t-luz-cual, manierismo-rompe,
  t-historia-grande-cual, postimpresionismo-cambia, manierismo-cual, rococo-cual, t-neoclasicismo-comun, t-bodegon-comun,
  barroco-cual, romanticismo-cual, manierismo-cambia, t-nace-ren-cual, t-color-cual): obras y épocas coinciden con el
  catálogo, datos correctos y distractores defendibles solo a medias, que es lo que se busca. El tono está a la altura.
- Requisitos: «Ir a las preguntas» sale al llegar a la última tarjeta (época y tramo) ✔; 3 en la época (2 de imagen con
  pintores conocidos + 1 de concepto; sin conocidos, 3 del banco, con el primer tramo incluido) ✔ y 2 en el tramo ✔; sin
  puntos ni desbloqueos ✔; cuentan para «Repasar…» y lo aún no aprendido no cuenta como olvido ✔; títulos y firmas
  ocultos hasta responder (alt vacío, firmas veladas, `isSpoiler` en «¿Cuál…?» y en las de imagen) ✔; rotación con
  `recent` en la época ✔ (en el tramo no es posible: ver cambio 4).
- Historial: la guarda de la ronda se retira con `history.back()` antes de seguir (sin `hashchange` porque la URL es la
  misma); atrás durante la tanda abre «¿Salir?» como en cualquier ronda. Correcto, salvo el caso del cambio 3.
- Privacidad: el banco se sirve desde la app, sin servicios nuevos. Sin `alert`/`confirm`, sin colores a mano, sin `var`.

## Notas

| Criterio | Nota | Motivo |
|---|---|---|
| Material 3 (equivalente web) | 8 | Reutiliza la ronda, la hoja inferior y los botones; las etiquetas de época en píldora encajan. |
| UX | **7** | Saltar = aspa + «¿Salir de la ronda? Perderás lo de esta ronda», un aviso falso para algo opcional; el toast «2 de 3» va sin contexto; el tramo repite siempre sus mismas dos preguntas; entrada duplicada en el historial desde el mapa. |
| Accesibilidad | 8 | `aria-live` en el título que aparece, nombres «Opción N» / «Cuadro 1, Manierismo», teclas 1-4, foco en «Seguir», movimiento reducido. |
| Rendimiento | 9 | Banco, CSS y módulo cargados al primer uso; carga del banco con reintento. |
| Adaptativo | 8 | Alturas en `svh` y pareja de cuadros que cabe a 360 px en claro y oscuro. En «¿Cuál…?» del tramo queda mucho hueco entre el enunciado y la rejilla. |
| Pulido | 8 | Hoja con los dos porqués, títulos con hueco reservado (no salta nada). En la última tarjeta del tramo conviven «Seguir» arriba e «Ir a las preguntas» abajo: aceptable. |
| Originalidad | 9 | «¿Qué cambia respecto a lo anterior?» con la pareja etiquetada y distractores «trampa» (dos Columpios, Ingres con cuello largo): enseña a comparar, no a memorizar. |
| Calidad técnica | 8 | Motor puro y probado, validador del banco con regla de longitudes. Detalles: espaciados a mano en `conceptos.css`, comentario descolocado en `router.js`, `flows.js` en 707 líneas. |

## Fallos graves

Ninguno.

## Cambios para llegar a 8 (UX) y detalles

1. **Saltar sin aviso falso** — `app/js/ui/screens/lesson.js` + `app/js/ui/concept-quiz.js`: con una opción de config
   (p. ej. `skippable: true`), que el aspa salga sin la hoja «¿Salir de la ronda?» (o con un texto propio, «¿Dejar las
   preguntas?», sin «Perderás…») y que su `aria-label` diga «Saltar las preguntas». Mantener la confirmación al pulsar
   «atrás» del navegador, si se quiere.
2. **Resultado con sentido** — `app/js/ui/concept-quiz.js` (`end`): el toast «2 de 3» → «2 de 3 acertadas» (o «¡Todas!»
   si son todas).
3. **Historial desde el mapa** — `app/js/ui/screens/flows.js` `renderConcepts`: sin `next`, al terminar volver con
   `history.back()` (a la pantalla de la que se vino) en vez de `ctx.go('inicio', { replace: true })`, que deja dos
   «inicio» seguidos y obliga a pulsar atrás dos veces. Añadir su prueba, o al menos una comprobación en el e2e.
4. **Tramos sin repetición** — `contenido/preguntas-concepto.json`: cada tramo tiene exactamente 2 preguntas y la tanda
   pide 2, así que al reabrir el cartel salen siempre las mismas. Subir a 3-4 por tramo (o, mientras tanto, no ofrecer
   «Ir a las preguntas» al reabrir un cartel cuyas dos preguntas ya salieron la última vez, con `recentConcepts`).
5. (Calidad técnica, no bloquea) `app/css/conceptos.css`: pasar `.35rem`, `1rem`, `.15rem .6rem` y `.7rem` a variables
   de espaciado ya existentes. `app/js/ui/router.js`: el comentario «Repasar a Vermeer…» quedó encima del regex de
   preguntas; ponerlo en su sitio. Opcional: barajar también los `id` de las opciones (hoy `data-id="a"` es siempre la
   buena en el DOM; no se ve, pero sobra).
