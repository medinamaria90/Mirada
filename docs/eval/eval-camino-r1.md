# Evaluación independiente · rediseño del mapa del camino (rama `camino-rediseno-r1`, ronda 1)

Evaluador nuevo, sin tocar código. Capturas reales con Playwright (Chromium, `isMobile`, `hasTouch`, DPR 2/1), 360/412/768 px,
móvil en claro y en oscuro, horas fijadas (7:00, 12:00, 17:30, 19:00, 19:30, 23:00) y tema forzado. Usuario sembrado con 8
pintores del Renacimiento dominados (parada actual: Veronés). `node --test tests/`: 0 fallos. Sin errores de consola.
Nota: `docs/eval/plan-composicion-camino.md`, citado en `path-layout.js`, **no existe** en la rama.

## Notas

| Criterio | Nota | | Pieza | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Lápida de época | 8 |
| UX | 7 | | Mojón / tramo completado | 7 |
| Accesibilidad | 7 | | Espaciado / composición | 9 |
| Rendimiento | 8 | | Sendero y plaza | 8 |
| Adaptativo | 8 | | Candados | 8 |
| Pulido | 7 | | Botón «Tú» | **6** |
| Originalidad | 9 | | Paleta de luz / edificios | 7 |
| Calidad técnica | 7 | | | |

**Veredicto: NO APRUEBA** (UX, accesibilidad, pulido y calidad técnica en 7; botón «Tú» en 6). Fallos graves: ninguno
(sin roturas, la memoria de scroll funciona: 12671→12671 al ir a `#rama-escuela-rusa` y volver, y 16385→16385 con el
botón «Camino» de la rama). La composición es lo mejor del trabajo: 0 solapes entre paradas, carteles, lápidas y kiosco en
todas las vistas medidas (rectángulos de `.road-sign`, `.stage`, `.era-arch`, `.start-kiosk`).

## Lo que hay que arreglar (por prioridad)

1. **«Tú» apunta al lado contrario** (grave para la UX, no rompe la navegación) · `07-tu-flecha-invertida.png`.
   Ir de la salida al Romanticismo de un salto: flecha ↑ con la parada 7181 px **por debajo**. `map-return.js` solo
   calcula `is-up` en el callback del `IntersectionObserver`, que no salta si la parada nunca entra en la vista (saltos,
   tocar la barra de estado en iOS, volver con la memoria de scroll). Arreglo: recalcular `is-up` también en `scroll`
   (pasivo, con rAF) comparando `dot.getBoundingClientRect().top` con `innerHeight / 2`; dejar el IO solo para mostrar/ocultar.
2. **«Tú» queda debajo de la tarjeta «Nuevos pintores»** · `02-tu-bajo-tarjeta-nuevos.png`: asoma un borde naranja
   tras `.news-card` y no se puede pulsar (Playwright: «news-close intercepts pointer events»). Arreglo: mientras haya
   `.news-card`, subir el botón por encima de ella (`--map-return-b` + alto de la tarjeta) o esconderlo.
3. **«Tú» tapa contenido fijo del mapa** · `01-salida-lapida-plaza.png`: en la salida cubre el kiosco «Información»
   (solapa 36×49 px; solo se ve la «i»), y en el Romanticismo corta «mediados s. X|IX» de la lápida (`10`, dentro de
   `08`). Arreglo: en la salida, kiosco a la izquierda de la plaza o reservar el hueco del botón (`right` del kiosco ≥
   ancho del botón + 16 px).
4. **Mojón de tramo: estela ilegible y objetivo táctil bajo** · `03-renacimiento-tramo-rama.png`, `04`.
   `.tramo-stone` mide 13×22 px y se lee como una puertecita/nevera, no como un mojón; cambia de lado respecto a la
   tablilla (derecha en «Primer Renacimiento», izquierda en «Alto Renacimiento»). La tablilla `.sign-plate.is-tramo` mide
   132×26 px: por debajo de 44/48 px. Arreglo: estela ~22×34 con remate redondo y una muesca o número grabado, siempre
   del lado del sendero; ampliar el área pulsable de la tablilla a ≥44 px con `::before` transparente (sin crecer a la vista).
5. **El globo de una rama cerrada tapa la propia rama** · `06-globo-tapa-cartel-rama.png`: «Se abre al dominar a Goya»
   cubre «Más del Romanticismo». `lock-note` usa `top: 26px; left: 44px` fijos. Arreglo: para `.sign-plate.branch`,
   abrir el globo encima del cartel (o debajo si no cabe), nunca encima del texto.
6. **Paleta: dos noches distintas y un atardecer turbio** · `08`, `09`, `10`.
   - Con el móvil en oscuro a las 23:00 la noche automática es gris azulada clara; con tema «Oscuro» forzado, azul marino
     profundo con ventanas encendidas (precioso, contraste 1,8:1 sendero/suelo). Son dos «noches» distintas. Arreglo:
     que la noche del reloj se acerque a la forzada (al menos con el móvil en oscuro, que hoy pinta un mapa claro con el
     marco oscuro: el contraste marco/mapa a las 12:00 es brusco, `08` fila 1).
   - Atardecer (19:00 pico, 19:30): malva-topo plano; tejados y fachadas casi se funden con el suelo y el sendero
     (contraste sendero/suelo ≈ 1,24:1, igual que de día y de noche automática). Falta el arrebol cálido. Arreglo: tinte
     anaranjado en `--day-dusk` sobre cielo/suelo, oscurecer un 10–15 % la base del suelo y mantener tejados a ≥ 1,5:1.
   - Edificios: de noche las ventanas encendidas dan vida y contraste (bien); de día y al amanecer, correctos.
7. **Lápida cerrada con siglos largos** · `05-candado-globo.png`: en «Romanticismo» el candado queda huérfano a la
   izquierda y los siglos en dos líneas. Arreglo: candado en línea con el nombre (o encima), siglos con `text-wrap: balance`.
8. **Calidad técnica**: capas con números (`z-index: 3/4/5` en `mapa-carteles.css`) y medidas en px en `.lock-note`
   en vez de variables (regla de CLAUDE.md); `path-map.js` en 300 líneas; falta el documento de plan que cita el código;
   sin prueba de la dirección de la flecha de «Tú» (añadir una con saltos de scroll).

## Por pieza (lo que está bien)

- **Lápida** (8): estela con zócalo y cornisa junto a la puerta, nunca sobre el sendero; la de la primera época junto a la
  muralla y el kiosco a la derecha; ranura de progreso discreta y legible. Pierde por el punto 7.
- **Mojón** (7): la tablilla dorada de tramo completo se entiende sin check; va en su hueco, antes de sus pintores;
  se abre siempre (la hoja de «Paisaje» con la época cerrada funciona, `12`). Pierde por el punto 4.
- **Espaciado** (9): pintor + tramo + desvío + puente respiran (Renacimiento: Leonardo / «Alto Renacimiento» / «Más del
  Renacimiento» / Berruguete sin roces a 360, 412 y 768). Para 10: a 768 los rótulos se ven pequeños para el ancho.
- **Sendero y plaza** (8): tierra con borde irregular y piedrecitas, sin raya; lo recorrido, dorado y cálido de día; la
  plaza empedrada con fuente cierra bien la salida. Pierde por el contraste de noche/atardecer (punto 6).
- **Candados** (8): un solo globo, el nuevo sustituye al anterior (Goya→Friedrich), se cierra al tocar fuera, al
  desplazar 60 px y con Esc; cruz de 48×48; se anuncia por `announce`. «tras Goya» y «faltan 2 pintores» se entienden.
  No pude ver el temblor (la siembra pide movimiento reducido, y entonces no tiembla ni vibra: correcto).
- **«Tú»** (6): el círculo con flecha y «Tú» es más limpio que la píldora y repite la marca de la parada; 52×52 px;
  al pulsarlo centra y enfoca la parada. Pierde por los puntos 1–3.
- **Paleta** (7): el paisaje sigue al reloj con el móvil en oscuro, «Oscuro» = noche y «Claro» = día (comprobado). Puntos 6.

## Capturas (`docs/eval/eval-camino-r1/`)

01 salida (lápida, plaza, «Tú» sobre el kiosco) · 02 «Tú» bajo la tarjeta de novedades · 03 Renacimiento (tramo + rama)
· 04 Barroco (lápida cerrada, «Claroscuro») · 05 globo de candado · 06 globo que tapa la rama · 07 flecha invertida ·
08 luz: fila 1, móvil oscuro 7:00/12:00/19:30/23:00 y móvil claro 7:00; fila 2, móvil claro 12:00/19:30/23:00 y
repetidos de 12:00 (claro) y 23:00 (oscuro) · 09 tema forzado (Oscuro 7:00 y
12:00, Claro 23:00) y 17:30/8:30 · 10 atardecer 19:00 claro/oscuro · 11 anchos 360 y 768 · 12 hoja de tramo, hoja de época
cerrada, globo de rama, `#rama-escuela-rusa` y `#rama-gotico`.

## Iteración 2: qué pedir al generador

Arreglar 1–5 (obligatorio para aprobar), 6 (noche automática ≈ noche forzada y arrebol cálido) y 7–8. Volver a pasar
este mismo guion: saltos de scroll con «Tú», tarjeta de novedades abierta, globos de rama, 19:00 y 23:00 en ambos esquemas.
