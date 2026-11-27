# Evaluación independiente · Cuadro del día · ronda 2 (27/11)

Evaluador nuevo (no ha construido nada ni toca código). Rama `cuadro-dia-v2` (commit 9891eca) servida en local con
`tools/serve_local.py`, las imágenes de la release `catalogo-img` (1200 + HD), el atlas (`make_atlas.py`) y los detalles y
og (`share_pages.py --images`). Chromium headless `--mute-audio`, táctil, 360 × 800, 412 × 800 y 768 × 1024, claro y oscuro,
partida sembrada (v10 → migra) y como invitado. `node --test tests/`: **662 pasan, 0 fallan**. Ningún error de consola en
ninguna combinación.

Recorrido: portada con el chip pendiente → cuadro → 3 fallos (tocando la imagen en cada paso) → acierto → historia de 3
tarjetas → hecho → Compartir → Conocer a Botticelli / Lo conocerás en el camino → visor → portada con el chip hecho →
`#reto-diario`; salir con la X; partida a medias + recarga; invitado con la invitación al final. Los 14 días se jugaron
uno a uno (cambiando `start` solo en la respuesta del navegador con `page.route`, sin tocar el repo) hasta el paso 3 y la
vista grande; las firmas tapadas (días 2, 8, 9 y 12) se miraron a 3×, con y sin velo.

## Notas

| # | Criterio | R1 | **R2** |
|---|---|---|---|
| 1 | Material 3 (equivalente web) | 8 | **8** |
| 2 | UX | 8 | **8** |
| 3 | Accesibilidad | 8 | **8** |
| 4 | Rendimiento | 7 | **8** |
| 5 | Adaptativo | 8 | **8** |
| 6 | Pulido | 8 | **7** |
| 7 | Originalidad | 9 | **9** |
| 8 | Calidad técnica | 8 | **8** |
| 9 | Textos de las historias | 7 | **8** |
| 10 | Nada destripa la respuesta | 6 | **6** |

## Veredicto: NO APRUEBA

Dos notas por debajo de 8 (6 · pulido y 10 · destripes) y **un fallo grave (trampa)**: el velo no tapa la firma de Sorolla
(día 12). Es el último escollo serio: lo demás que pedía la ronda 1 está casi todo resuelto, y bien.

## Fallo grave

1. **Día 12, *Paseo a orillas del mar*: «J Sorolla B 1909» se lee a través del velo** en los pasos 3-4, en el marco y en la
   vista grande. El velo (`.cdd-veil`, `backdrop-filter: blur(7px)`) está en su sitio (`left 0,66 %; top 95 %; 12,8 × 5 %`),
   pero toca los bordes inferior e izquierdo del cuadro y ahí Chrome casi no desenfoca: el desenfoque toma píxeles
   reflejados del mismo trozo y la firma sale como un fantasma legible (prueba: `cuadro-dia-r2/08-…png`, a la izquierda con
   velo y a la derecha sin velo, captura a 3× = píxeles reales de un móvil). En los días 2, 8 y 9 el velo sí funciona (no
   se lee nada). Llega el 8 de diciembre: hay tiempo, pero sin esto no se aprueba.

## Lo que se ha corregido desde la ronda 1 (comprobado)

- Las firmas de Van Eyck, El Greco y Monet quedan tapadas en el marco y en la vista grande; antes de acabar ya no se abre
  el visor con lupa, sino la lupa del juego con el mismo encuadre. Vermeer (día 7), Rembrandt (14) y Van Gogh (11): en la
  imagen de 1200 px no se ve firma legible; no hacía falta velo.
- **Peso**: los pasos 1-2 usan `img/dia/<n>.jpg` (127-368 KB, frente a 0,8-2,9 MB de la HD de antes) y la de 1200 px se pide
  desde el paso 2. Abrir desde el chip: 146-172 ms en local.
- **Textos**: Médici explicados, año de la Venus a «c. 1485», Picasso presentado, *Masacre en Corea* (1951), el vidriero de
  1911, Sorolla sin repetir «pintor de la luz», «se suele leer como un símbolo de fidelidad», la fórmula «¿Recuerdas…?» ya
  no se repite, y `era` propio para Van Eyck y el Bosco.
- **UX**: la historia espera 1,6 s antes de abrirse; el fallo tiembla y vibra; a 768 px el marco crece (450 px) y las
  opciones van en 3 columnas; al volver de la pantalla de hecho, el mapa vuelve a «Tú».
- **Accesibilidad**: `.cdd-hint-k` a 0,8 rem; la región viva de la historia dice solo «Tarjeta 1 de 3» (sin texto doble).
- Sigue bien: el progreso se guarda una vez (`progress.cuadros`, +10 XP, racha 2 → 3, medalla `daily-1`), recargar a medias
  no regala intentos, `#reto-diario` lleva a la pantalla de hecho, compartir no destripa nada («Sfumato · Cuadro del día 1 /
  🖼️ 🟥🟥🟥🟩 / enlace») e invitado juega sin bienvenida y ve «¿Te ha gustado?» con «Ahora no» / «Empezar a jugar».
  Ningún recorte del paso 1 de los 14 días tiene firma ni texto (`10-…png`), y los 14 casan con su «… del principio».

## Cambios, por prioridad

### P0 · imprescindibles para aprobar

1. **Velo que no dependa de `backdrop-filter`** (criterio 10, fallo grave) — `app/js/ui/cuadro-frame.js` (`veilHtml`) y
   `app/css/cuadro-dia.css` (`.cdd-veil`). Que el velo pinte su propio contenido en vez de desenfocar lo de debajo: un
   `<span class="cdd-veil">` con `overflow: hidden` que lleve dentro la miniatura (`tinySrc(work)`, 240 px) colocada con la
   misma caja que la imagen (en % relativos al velo) y `filter: blur(var(--cuadro-veil-blur))` sobre esa miniatura. Con 240
   px la firma ya casi no existe y el desenfoque la borra del todo, en cualquier borde y en cualquier navegador (Safari
   incluido). Además, en `contenido/cuadro-del-dia/calendario.json`, día 12, ensanchar la caja a `[0, 0.94, 0.16, 1.0]` por
   margen.
   Prueba: en `tests/e2e.test.js` (o un test propio con `MIRADA_E2E=1`), para cada día con `signature`, capturar la zona del
   velo en el paso 3 con y sin velo y exigir que la energía de bordes (suma de |gradiente|) baje al menos un 70 %.
2. **Que el velo no parezca una mancha** (criterio 6) — mismo cambio: con la miniatura desenfocada dentro, el velo toma los
   colores del cuadro. Hoy es una píldora beis clara (`color-mix(... var(--surface-2) 18%)`) que en el Arnolfini, oscuro,
   queda en mitad del cuadro como un parche de interfaz (`09-…png`). Quitar ese fondo y dejar un radio pequeño
   (`--radius-sm`) o ninguno.

### P1 · para subir a 9

3. **Las medallas, la racha y la XP no se cuentan** (UX). `finishCuadro` devuelve `events` (medalla «Primer cuadro del
   día», `streak-3`, meta…) y `cuadro-dia.js` se los pasa a `renderCuadroDone`, pero esta solo lee `{ fresh }`: el jugador
   gana medallas y racha sin enterarse, y el parámetro queda muerto. En `ui/screens/cuadro-dia-hecho.js`: con `fresh`,
   enseñar «+10 XP» junto a los cuadritos y, al cerrar la historia, la medalla nueva con el mismo aviso que usa
   `result.js` (líneas 124-128). Prueba: un test que acabe el primer cuadro y compruebe que sale «Primer cuadro del día».
4. **La vista grande del cuadro entero no es más grande** (UX, pasos 3-4). La lupa abre el mismo marco cuadrado con bandas
   desenfocadas: en un cuadro apaisado en móvil vertical se ve igual que en la pantalla (≈345 frente a 328 px de ancho,
   medido en la lupa del paso 4). En `openLoupe` con `zoom === 1`, usar una caja con la proporción de la obra
   (`aspect-ratio: w / h`, `max-width: 96vw; max-height: calc(100dvh - 7rem)`), sin fondo desenfocado, y el velo en esa caja.
5. **Salir con la X sigue moviendo el mapa** (UX, pendiente de la ronda 1). A 360 px: `scrollY` 14604 → 14244 (unos 360 px,
   «Tú» queda fuera de sitio). Al volver por la pantalla de hecho ya está bien. En `quit` (`cuadro-dia.js`), `history.back()`
   no restaura el scroll porque el mapa se repinta tarde: guardar `scrollY` del camino al tocar el chip y restaurarlo tras
   pintar el mapa, o centrar en «Tú» como hace la vuelta desde la pantalla de hecho.
6. **Pantalla de hecho a 360 × 800**: «El siguiente, en 11 h» queda debajo de la barra de navegación (`bottom` 770 frente a
   `top` 732 de la barra; también a 412). En `brand.css`, `--cuadro-done-vh: 34vh` (hoy 38vh) o quitar `.cdd-caption` del
   flujo (el título y el año ya están en la historia) para que todo quepa sin desplazar (`06-…png`).
7. **Textos** (`contenido/cuadro-del-dia/calendario.json`), todos ≤ 180:
   - **Día 5**, tarjeta 1: Miguel Ángel y la Capilla Sixtina sin presentar → «…copiada de la de Adán que pintó el gran
     Miguel Ángel en la Capilla Sixtina (la del Papa, en Roma)». Para que quepa, «Era Caravaggio, el rebelde de la luz de
     sótano».
   - **Día 5**, tarjeta 2: «la mesa donde Mateo, el cobrador de impuestos, cuenta el dinero» da por hecho cuál es Mateo, y
     es discutido (el barbudo que se señala o el joven que cuenta monedas). → «…cae sobre la mesa de Mateo, el cobrador de
     impuestos, y sus ayudantes».
   - **Día 2**: «el flamenco» se confunde con el baile → «el pintor flamenco (de Flandes, la actual Bélgica)…»; para caber,
     «…está pintado pelo a pelo: se suele leer como símbolo de fidelidad».
   - **Día 8**, tarjeta 3: «sin santos ni personajes» no es exacto (hay figuras diminutas junto al río) → «sin escena
     religiosa: la protagonista es la ciudad». Tarjeta 1: «el Alcázar (la fortaleza)».
   - **Una idea por tarjeta**: día 1, tarjeta 3 (desnudo desde la Antigüedad + moneda), día 4, tarjeta 3 (1814 + Picasso)
     y día 7, tarjeta 3 (tronie + quién posó + apodo). Quedarse con la mejor o pasarla a una cuarta tarjeta.
   - **Fórmula**: las 14 tarjetas 2 empiezan por «Fíjate en». Mantenerlo en la mitad y variar el arranque en las demás
     («Mira el cielo…», «El azul del turbante…», «¿Ves las sombras?»).
8. **Accesibilidad**: tras un fallo se anuncia dos veces lo mismo: `.cdd-left` tiene `aria-live="polite"` y además
   `announce()` dice el fallo y la pista. Quitar `aria-live` de `.cdd-left` (`cuadro-dia.js`) y añadir «Te quedan n» al
   texto de `announce`.

### P2 · detalles

9. Pulsación larga sobre la imagen (Android: «Abrir imagen en otra pestaña») da la de 1200 px sin velo. Poner
   `pointer-events: none` a `.cdd-img` y `.cdd-bg` en `cuadro-dia.css` (el botón sigue recibiendo el toque) y
   `-webkit-touch-callout: none` en `.cdd-frame`.
10. Rendimiento: `img/dia/11.jpg` pesa 368 KB y `6.jpg`/`10.jpg` unos 300 KB (la SPEC dice ~200). En `share_pages.py`,
    bajar a calidad 78 o a 1.000 px los que pasen de 250 KB.
11. En la tarjeta de historia el título sale dos veces (cabecera «El nacimiento de Venus» y pie en cursiva). Quitar el pie
    en `story-cuadro` (`historias.css`), que ya lo dice la cabecera.

## Notas de lo comprobado

- Sin desbordamiento horizontal en ningún ancho; el juego cabe sin desplazar en 360 × 800 en los 4 pasos (opciones
  acaban a 652-725 px). Zonas táctiles ≥ 44 px en toda la pantalla.
- Chip: «Cuadro del día, pendiente» → «Cuadro del día, hecho: a la cuarta»; el círculo enseña el mismo detalle del paso 1.
- Pistas de museo que delatan, tapadas (Marmottan → «Un museo de París», Museo Sorolla → «Una casa-museo de Madrid»).
- Textos: 42 tarjetas, todas ≤ 180 caracteres (máx. 173), ningún «ayer» ni «mañana», lenguaje cuidado con los desnudos.
  Datos revisados y correctos además de los de la ronda 1: Lisa Gherardini y el comerciante de seda, la *Masacre en
  Corea* de 1951, Peruggia vidriero, la luz de pago de San Luis de los Franceses, la luminosidad igual del sol de Monet,
  el pollo de la niña de *La ronda de noche*, la sombra de la mano del capitán, Soult y el canje de 1941.

## Capturas (`docs/eval/cuadro-dia-r2/`)

01 portada con el chip pendiente (360, claro) · 02 paso 1, detalle (360) · 03 paso 4 con las tres pistas (412, oscuro) ·
04 paso 2 en tableta (768) · 05 historia, tarjeta 1 · 06 pantalla de hecho, «El siguiente» bajo la barra (360) ·
07 invitado: invitación al final (360, oscuro) · **08 fallo grave: día 12 con velo y sin velo (3×)** · 09 velo del
Arnolfini en la vista grande, que parece un parche · 10 los 14 detalles del paso 1.
