# Evaluación independiente · mapa del camino y pantallas de rama (rama `camino-rediseno-r2`, ronda 2)

Evaluador nuevo, sin tocar código. Playwright (Chromium, `isMobile`, `hasTouch`), 360/412/768 px, móvil claro y oscuro,
hora fijada (7, 12, 19, 23 h), tema forzado (estado sembrado con `version: 10`: con `version: 4` la migración pone el
tema en «system» y el forzado no se ve). 8 pintores del Renacimiento dominados (parada actual: Veronés).
`node --test tests/`: 593 bien, 0 fallos. Sin errores de consola en ningún recorrido.

## Notas

| Criterio | Nota | | Pieza | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Salida / plaza | **7** |
| UX | 8 | | Lápida | 8 |
| Accesibilidad | 8 | | Mojón / tramo completado | **7** |
| Rendimiento | 8 | | Espaciado | 9 |
| Adaptativo | 8 | | Sendero | 8 |
| Pulido | **7** | | Desvíos de rama (bifurcación) | 8 |
| Originalidad | 9 | | Vuelta desde la rama | 9 |
| Calidad técnica | **7** | | Candados | 8 |
| | | | Botón «Tú» | 8 |
| | | | Paleta de luz / edificios | **6** |

**Veredicto: NO APRUEBA** (pulido 7, calidad técnica 7; piezas salida 7, mojón 7, paleta 6). Fallos graves: ninguno
(sin roturas ni pérdida de progreso; la vuelta desde las tres ramas cae en su desvío).

## Comprobado de la ronda 1 (resuelto)

- **«Tú»**: la flecha se recalcula al desplazar. Salto de la salida a y=5000: flecha ↓ con la parada 10714 px más
  abajo (bien); arriba del todo, ↓; en la salida, ↑. Al pulsarlo centra la parada (punto en y=387 de 860) y se oculta.
  48×48. Con la tarjeta «Nuevos pintores» se oculta y vuelve al cerrarla (Playwright: `hidden` true → false).
- **Kiosco**: ya no lo tapa el botón (kiosco hasta x=290, botón desde x=296 a 360 px). Abre «Cómo se juega».
- **Globo de la rama cerrada**: «Se abre al dominar a Goya» sale bajo el cartel, sin taparlo (`05`). Un solo globo visible.
- **Lápida cerrada**: candado en línea con los siglos (`05`, «Romanticismo»; `06`, «Barroco»).
- **Vuelta desde la rama** (`07`→`08`): la tablilla «Volver al camino · Renacimiento» (115×41, `aria-label` «Volver al
  camino, al Renacimiento») devuelve a `#inicio` con el desvío en y=368 de 800 y el foco en su cartel. Igual desde
  `#rama-escuela-rusa` (desvío en 365, foco «Escuela rusa…») y `#rama-gotico` (379). La tablilla queda del lado del
  camino común (Gótico a la izquierda, Descubre a la derecha) y con la flecha hacia él: se entiende sin leer.
- **Ríos**: recorrido entero a 412 (`12`): ninguna casa pisa un río o lago; las barcas vistas, siempre sobre el agua.

## Lo que hay que arreglar (por prioridad)

1. **Paleta: amanecer = atardecer y dos noches distintas** (pieza 6, pulido) · `10`, `11`.
   - 7:00 y 19:00 dan el mismo malva-topo plano (fila 1, columnas 1 y 3, idénticas en claro y en oscuro). Sigue sin
     arrebol: el sendero apenas se separa del suelo y las casas se funden. Arreglo (`app/js/engine/daylight.js` y
     `css/mapa-vivo.css`): que `--day-dusk` tiña cálido (melocotón/ámbar) solo por la tarde y el amanecer vaya a un rosa
     frío y claro; oscurecer el suelo un 10 % en ambos y mantener sendero/suelo ≥ 1,4:1 y tejado/suelo ≥ 1,5:1.
   - Noche del reloj (23 h, móvil oscuro o claro) = gris azulado claro; «Oscuro» forzado = casi negro (`11`, col. 2 y 3).
     La ronda 1 ya lo pedía. Arreglo: una sola noche; propongo un azul pizarra intermedio para ambas (la forzada es
     bonita, pero el desvío y el tramo pendiente casi desaparecen: rama `Más del Renacimiento` gris sobre negro).
2. **Salida poco memorable** (prioridad de María) · `01`, `02`, `03`.
   - La plaza es un óvalo liso con un ribete de puntos: no se lee «empedrada». La fuente queda **fuera** de la plaza, a
     la izquierda (a 768, `03`, flota sola). Arreglo: adoquines en el interior (patrón SVG ya hay de grano, como
     `map-grain`), fuente dentro de la plaza, a la izquierda del arranque del sendero; un banco o farola junto al kiosco.
   - La muralla no tiene puerta: el sendero cruza entre dos torres sin arco. Un arco de entrada (la «puerta» de la
     primera época) haría de la salida un lugar y no un trozo de mapa.
   - Lo pulsable de la salida (kiosco «Cómo se juega») se ve pulsable (tablilla blanca, aviso «!»), bien; pero el
     kiosco mide 56×56 y a 768 se pierde. Arreglo: escalar con `--map-fs`.
3. **Mojón: la estela sigue siendo pequeña** · `04`, `06`. `--tramo-stone-w/h` 18×28 px (`css/brand.css:166`); el plan
   pedía 30×42 u y la ronda 1 ~22×34. Con la «inscripción» de dos rayitas se lee como una puerta o un buzón. Arreglo:
   24×36, remate redondo, una cruz o número romano grabado del tramo y sombra al pie como los árboles.
4. **Calidad técnica**.
   - Reglas duplicadas y muertas: `css/main.css:270-274` define `.is-tramo .sign-plate` (`min-height: 44px`, padding,
     tamaño) y `css/mapa-carteles.css:63-65` las pisa todas (`min-height: 0`…). Borrar las de `main.css`.
   - Medidas a mano en `css/mapa-carteles.css:112` (`.stage-you`: `20px`, `3px 10px 4px`, `999px`) → variables.
   - `path-map.js` en 300 líneas justas: partir antes de la siguiente ronda.
   - Commits «wip camino 2…5»: CLAUDE.md pide mensajes claros en español. Rehacerlos al fusionar (squash con mensaje).
5. **UX menores**.
   - Memoria frente a desvío: si se entra a una rama sin pasar por su desvío (p. ej. navegando por hash desde el mapa)
     tras haber vuelto de otra, «Volver al camino» lleva a la posición guardada (14302, el desvío de la anterior) y no
     al de la rama actual. Arreglo: al volver con la tablilla, priorizar siempre el desvío de *esa* rama (`map-memory.js`).
   - «Tú» (fijo abajo a la derecha) tapa a veces carteles de rama del borde derecho («Pintura británi|», «Maestros
     españo|», `12`, columnas 3 y 6). Aceptable en un botón flotante; si se quiere fino, `scroll-padding-bottom` o
     dejar libre ese hueco en `besideRoad`.

## Por pieza (lo que está bien)

- **Lápida** (8): estela con cornisa junto a la puerta, progreso en ranura (8/9 a la vista, `01`). Siglos largos aún en
  dos líneas («finales s. XVIII– / mediados s. XIX»): legible, pero con `text-wrap: balance` quedaría mejor.
- **Espaciado** (9): Leonardo / «Alto Renacimiento» / «Más del Renacimiento» / Berruguete respiran a 360 sin roces (`04`).
- **Sendero** (8): nace de la plaza sin punta; lo recorrido, dorado de día. Pierde por el contraste de noche y alba.
- **Desvíos** (8): salen tangentes, sin codo; tablilla con flecha («‹ 0/9», «0/5 ›»). El poste indicador es la propia
  tablilla: correcto, sin más piezas. Cerrados: «tras Goya», «faltan 2 pintores», claros.
- **Vuelta desde la rama** (9): la mejor novedad; mismo lenguaje que el cartel del desvío, del lado bueno, y aterriza
  en el desvío con foco. Para 10: el punto 5.
- **Candados** (8): un globo, bajo el cartel, cruz y cierre al tocar fuera. «Se abre al acertar la mitad en Ingres» se
  entiende.
- **«Tú»** (8): todo lo pedido. Para 9: apartarse (subir) en vez de esconderse con la tarjeta de novedades.

## Capturas (`docs/eval/eval-camino-r2/`)

01 salida 360 día · 02 plaza en detalle (DPR 2) · 03 salida 412 noche automática · 04 Renacimiento, tramo + desvío ·
05 Romanticismo, globo de rama cerrada · 06 Barroco · 07 rama Descubre con «Volver al camino» · 08 vuelta con el desvío
a la vista · 09 rama Escuela rusa · 10 luz por reloj (fila 1 móvil claro, fila 2 oscuro; 7/12/19/23 h) · 11 tema
forzado (Oscuro a 12 y 23 h, noche automática, Claro a 23 h) · 12 todos los tramos con ríos y lagos.

## Iteración 3: qué pedir al generador

1 (paleta: alba ≠ atardecer, una sola noche) y 2–3 (salida con adoquines, fuente dentro y arco; estela mayor) son
obligatorios para aprobar; 4 y 5 en la misma ronda. Repetir este guion: 7/19/23 h en ambos esquemas y forzado, 360 y 768.
