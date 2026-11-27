# Evaluación independiente · Cuadro del día · ronda 3 (27/11)

Evaluador nuevo (no ha construido nada ni toca código). Rama `cuadro-dia-v3` (commit d21d39d) servida en local con
`tools/serve_local.py`, las imágenes de la release `catalogo-img` (1200 + HD), el atlas (`make_atlas.py`) y los detalles y
og (`share_pages.py --images`). Chromium headless `--mute-audio`, móvil táctil, 360 × 800, 360 × 640, 412 × 800 y
768 × 1024, claro y oscuro, partida sembrada (v10 → migra) y como invitado. `node --test tests/`: **686 pasan, 0 fallan**
(3 saltadas). **Ningún error de consola** en ninguna combinación.

Recorrido: portada con el chip pendiente → cuadro (entrando por el chip con `mouse.click` y por `location.hash`) → 3 fallos
tocando la imagen en cada paso → acierto → historia de 3 tarjetas → hecho con lo ganado → Compartir → Conocer a Botticelli →
vista grande ya acabado → «Ver la historia» otra vez → portada con el chip hecho → `#reto-diario`; partida perdida (4 fallos);
partida a medias + recarga; salir con la X; invitado hasta la invitación; teclado y movimiento reducido. Días 2, 8, 9 y 12
(firma tapada) jugados hasta el paso 3 a 3× (píxeles reales de móvil), marco y lupa, con y sin velo; los 14 días, pasos 1 y 2
(cambiando `start` solo en la respuesta del navegador con `page.route`).

## Notas

| # | Criterio | R1 | R2 | **R3** |
|---|---|---|---|---|
| 1 | Material 3 (equivalente web) | 8 | 8 | **8** |
| 2 | UX | 8 | 8 | **9** |
| 3 | Accesibilidad | 8 | 8 | **9** |
| 4 | Rendimiento | 7 | 8 | **9** |
| 5 | Adaptativo | 8 | 8 | **8** |
| 6 | Pulido | 8 | 7 | **8** |
| 7 | Originalidad | 9 | 9 | **9** |
| 8 | Calidad técnica | 8 | 8 | **8** |
| 9 | Textos de las historias | 7 | 8 | **9** |
| 10 | Nada destripa la respuesta | 6 | 6 | **9** |

## Veredicto: APRUEBA (3 iteraciones)

Todas las notas ≥ 8 y **ningún fallo grave**: sin roturas, sin trampas, sin pérdida de progreso, sin datos personales y sin
datos de arte erróneos (hay una pista de época incoherente en el día 12, abajo: confunde, pero no es un dato falso del cuadro).
Lo que queda son detalles; los dos primeros (P1) son de una línea y conviene hacerlos ya.

## Lo que se ha corregido desde la ronda 2 (comprobado)

- **Fallo grave resuelto: las firmas ya no se leen.** El velo pinta su propio trozo de la miniatura de 240 px, desenfocado y
  ampliado. A 3×, en el marco y en la lupa, no queda ni rastro de «Johannes de eyck fuit hic», la firma griega de El Greco,
  «Claude Monet 72» ni «J Sorolla B 1909», también junto al borde del cuadro (Sorolla, Monet) (`03-…png`, a la izquierda con
  velo, a la derecha sin él). Y ya no parece un parche: toma los colores del cuadro y en la lupa del Arnolfini casi no se
  nota (`04-…png`).
- **Lo ganado, a la vista**: «+10 XP · 3 días de racha · Primer cuadro del día» junto a los cuadritos; perdido, «+5 XP».
  La medalla de racha no se repite (la dice la pastilla de la racha). Estado guardado bien: XP 300 → 310, racha 2 → 3,
  `daily-1` y `streak-3`, `cuadros[2026-11-27]` una sola vez.
- **Vista grande del cuadro entero** con su proporción: a 360 px un apaisado gana poco (346 frente a 328 px de ancho, el
  límite es el ancho del móvil), pero un vertical como el Arnolfini llena la pantalla; a 768 px, 737 × 463.
- **Salir con la X ya no mueve el mapa**: `scrollY` 14604 → 14604, entrando por el chip y por el hash; «Tú» en su sitio.
- **Accesibilidad**: un solo anuncio por fallo («No es de Leonardo. Época: …. Te quedan 3 intentos.»), `.cdd-left` sin
  `aria-live`; orden de tabulación natural (marco, 6 nombres, Salir); zonas táctiles de 48 px.
- **Rendimiento**: abrir desde el chip, 93-131 ms; detalles del día de 138 a 281 KB (antes hasta 368).
- **Pulsación larga** sin «abrir imagen» (`pointer-events: none` + `-webkit-touch-callout: none`); sin el pie repetido en la
  historia.
- **Textos**: Miguel Ángel y la Capilla Sixtina presentados, Mateo y sus ayudantes, «pintor flamenco (de Flandes, la actual
  Bélgica)», el Alcázar explicado, «sin escena religiosa», una idea por tarjeta en los días 1, 4 y 7 y las tarjetas 2 ya no
  empiezan todas por «Fíjate en» (8 de 14).
- Sigue bien: el juego cabe sin desplazar a 360 × 800 en los 4 pasos (opciones acaban a 613-725 px) y a 360 × 640 en el
  paso 1 (567 px); sin desbordamiento horizontal en ningún ancho; ningún recorte de los pasos 1 y 2 de los 14 días tiene firma
  ni texto; compartir no destripa nada («Sfumato · Cuadro del día 1 / 🖼️ 🟥🟥🟥🟩 / enlace»; la página `h/cuadro-n.html`
  tampoco: título y descripción genéricos); recargar a medias no regala intentos; `#reto-diario` lleva a la pantalla de
  hecho; invitado juega sin bienvenida, gana sus puntos y ve «¿Te ha gustado?» con «Ahora no» / «Empezar a jugar».

## Fallos graves

Ninguno.

## Cambios, por prioridad

### P1 · conviene hacerlos ya (una línea cada uno)

1. **«XP» en la pantalla de hecho, cuando la app ya dice «puntos»** (pulido, criterio 6). El commit 265cf5c cambió «XP» por
   «puntos» en toda la app (lección, meta, cabecera: «20 de 50 puntos»), y la pastilla nueva dice «+10 XP» (`05-…png`).
   En `ui/screens/cuadro-dia-hecho.js` (`gainsHtml`): `` `+${…} puntos` ``. Corregir también «10 XP si acierta» en
   `docs/SPEC.md` y `BITACORA.md` si se quiere coherencia en los documentos.
2. **Pista de época del día 12 que choca con el año** (textos y pistas, criterios 9 y 10). Sorolla sale como «Época:
   Impresionismo · 1860–1890» y, un paso después, «Año: 1909» (`10-…png`): la segunda pista desmiente la primera y despista
   hacia Monet o Renoir. Es justo el caso para el que existe `era`: en `contenido/cuadro-del-dia/calendario.json`, día 12,
   `"era": "Luminismo español · hacia 1900"` (o «Pintura española · hacia 1900»), y volver a pasar
   `tools/sync_cuadro_dia.py`. Mirar también el día 8: «Manierismo y Renacimiento del Norte · s. XV–XVII» para El Greco
   suena a pintor flamenco; mejor `"era": "Manierismo · s. XVI"`.

### P2 · para subir de 8 a 9

3. **«El siguiente» queda bajo la barra de navegación a 412 × 800** (adaptativo). Con el marco que toma la proporción del
   cuadro, a 412 px la línea queda entera debajo de la barra (749-770 frente a 732; `06-…png`); a 360 × 800 asoma justo
   (716-737). Hay que desplazar para verla. En `cuadro-dia.css`, juntar `.cdd-next` con `.cdd-count` en una sola línea
   («Llevas 1 cuadro del día · el siguiente, en 11 h») o quitar `.cdd-caption` (título y año ya salen en la historia y en el
   visor): con eso cabe en 412 × 800 y 360 × 800.
4. **La pastilla de la racha lleva el icono de medalla** (Material 3 / pulido). La racha es una llama en toda la app
   (cabecera). En `gainsHtml`, `icons.flame(16)` para la racha e `icons.medal(16)` solo para las medallas.
5. **Tableta: pantalla de hecho pequeña y con media pantalla vacía** (adaptativo). A 768 × 1024 el cuadro mide 312 px de ancho
   y sobran ~400 px abajo (`08-…png`). En `brand.css`, dentro de `@media (min-width: 48em)`, `--cuadro-done-vh: 42vh`.
6. **Pruebas de lo nuevo** (calidad técnica). Las vueltas 3 cambian comportamiento sin prueba: lo ganado (`gainsHtml`) y el
   velo nuevo. Propuesta en `tests/cuadro-dia.test.js`: (a) un test de `gainsHtml` (o de la pantalla con un DOM mínimo) que
   con `events` de racha y `streak-3` no repita la medalla y muestre «+10 puntos»; (b) en el e2e (`MIRADA_E2E=1`), para cada
   día con `veil`, la energía de bordes de la zona del velo en el paso 3 baja al menos un 30 % frente a sin velo (aquí bajó
   entre un 26 y un 42 % contando el margen alrededor; dentro del velo, a casi cero).
7. **SPEC desfasada** (calidad técnica). En «4 bis ter», la mecánica aún dice «visor sin título ni autor en los 3-4» (ahora es
   la lupa del juego, como dice el punto siguiente), la historia aún habla de «¿Recuerdas…?», y la pantalla de hecho no
   menciona lo ganado ni la vista grande con la proporción. Ajustar esas tres frases.

### P3 · detalles

8. `img/dia/11.jpg` pesa 281 KB y `1.jpg` 252 KB; el commit y la SPEC prometen ≤ 250 KB. En `tools/share_pages.py`, bajar la
   calidad un punto más para los que pasen.
9. Textos (`calendario.json`), todos ≤ 180:
   - Días 3 y 4 repiten palabra por palabra «Picasso, el gran pintor del siglo XX». En el 4 basta «Picasso retomó esta
     escena…» (ya se presentó el día anterior) o «el malagueño Picasso».
   - Día 5: «el rebelde de la luz de sótano» se entiende a medias. Propuesta: «Era Caravaggio, el rebelde que pintaba con
     luz de foco en plena oscuridad».
   - Las 14 tarjetas 1 dicen «Era X, …». Funciona como revelación, pero en dos o tres días se puede variar («Lo pintó
     Vermeer…», «Detrás está Goya…»).
10. Invitación del invitado a 360 px: «Empezar a jugar» se parte en dos líneas (`09-…png`); con `text-wrap: balance` o un
    `font-size` algo menor en `ui/story-link.js`/su CSS cabe en una.

## Notas de lo comprobado

- Chip: «Cuadro del día, pendiente» → «Cuadro del día, hecho: a la cuarta»; con el detalle del paso 1 en el círculo.
- Datos de arte revisados (todos correctos): «Johannes de eyck fuit hic 1434», las 58 versiones de *Las meninas* de Picasso
  (1957), *Masacre en Corea* (1951), la capilla Contarelli y la luz de pago, Lisa Gherardini y Peruggia (1911), lapislázuli y
  deudas de Vermeer, la *tronie*, El Greco en Toledo (1577-1614), «Impression» y el crítico de 1874, la partitura del Bosco,
  el sanatorio de Saint-Rémy, la mujer y la hija de Sorolla en Valencia (1909), Soult, el Louvre y el canje de 1941, la niña
  del pollo y el barniz de *La ronda de noche*, la Venus de los 10 céntimos italianos.
- Lenguaje cuidado con los desnudos (Venus, el Bosco); ningún «ayer» ni «mañana»; 42 tarjetas, máximo 166 caracteres.
- Perder: «Esta vez no · Era Botticelli», cuatro cuadritos rojos, +5. Invitado acertando a la primera: «+10 XP · 1 día de racha · Primer cuadro del día».

## Capturas (`docs/eval/cuadro-dia-r3/`)

01 portada con el chip pendiente (360) · 02 paso 4 con las tres pistas (360) · **03 los cuatro velos a 3×, marco y lupa, con
y sin velo** · 04 lupa del Arnolfini: el velo casi no se nota · 05 hecho con lo ganado («+10 XP», 360) · 06 hecho a 412
oscuro: «El siguiente» bajo la barra · 07 historia, tarjeta 1 (412, oscuro) · 08 hecho en tableta (768) · 09 invitado: la
invitación · 10 día 12: «Impresionismo · 1860–1890» junto a «1909».
