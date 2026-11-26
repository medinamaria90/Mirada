# Perfil: logros más contenidos, rango que se entiende

Revisión de UX de `#perfil` (código `app/js/ui/screens/profile*.js`, `app/css/profile.css`). Evaluación y
maqueta, sin tocar la app. Partida de prueba: Aficionado, 1.877 XP, 13 pintores dominados, 14 logros de 146.

## Veredicto

María tiene razón: **los logros se comen el perfil.** Ocho medallas de 3 en fila, con nombres de hasta tres
líneas, ocupan unos 560 px: casi una pantalla entera de 390 × 844. Detrás va «Ver los 146», que repite lo que ya
dice «14 de 146». El perfil acaba siendo una vitrina de medallas y no dice quién eres ni qué te toca hacer.

Lo más grave no son los logros, sino **la barra del rango**:

- Con 1.877 XP la barra sale **vacía**, con el punto al principio. `rankProgress` usa el **mínimo** de las
  condiciones, y «niveles a fondo» está en 0 de 1. Pero el «1877 XP» se lee al lado, y la conclusión natural
  es «el XP no cuenta» o «esto está roto».
- Solo se ve lo que falta («Dominar 1 nivel «a fondo» más»). Lo que ya se ha cumplido (los 1.200 XP) no se ve,
  así que no se entiende que **el rango pide dos cosas**.
- No hay ninguna acción para avanzar. La única condición pendiente no lleva a ningún sitio.

Otros problemas:

- **No hay cifras.** El plan (`perfil-plan.md` §2) preveía tres cifras (cuadros, pintores y racha), y se
  quitaron porque «ya se ven en Colección y en la cabecera». Pero el perfil es justo donde uno mira cuánto
  ha avanzado. Duolingo, Strava y Spotify Wrapped ponen las cifras arriba. Los «pintores dominados» no se ven en
  ningún otro sitio de la app como total.
- **Jerarquía:** el botón más llamativo de la pantalla (coral, a lo ancho) es «Hacer el test», una tarea
  secundaria. Además, el test va en su propia sección, con un título largo para un solo botón.
- **Nombres de los logros**: «Piero della Francesca dominado» parte la casilla en tres líneas. En una
  muestra basta el nombre corto («Piero»). El «dominado» sobra porque ya lo dice el anillo de metal.
- Lo que sobra: «Ver los 146» (el recuento puede servir de enlace) y la sección «Tu test de pintura» como
  bloque aparte.

## Cómo lo hacen las mejores apps

| App | Qué se ve primero | Logros | Qué copiamos |
|---|---|---|---|
| Duolingo | Avatar, nombre, una fila de amigos y luego **4 cifras en fichas de 2 × 2** (racha, XP, liga, podios) | **Una fila de 3 o 4** con «Ver todos» → pantalla aparte por grupos | Fichas 2 × 2, fila corta y pantalla aparte |
| Strava | Identidad y **resumen de la semana** | Trofeos en una fila horizontal y el resto en su pestaña | Que los logros sean un resumen, no el contenido principal |
| Instagram | Identidad con **tres cifras en una línea** | Destacados en una fila de círculos | Los círculos pequeños en fila |
| Spotify | Identidad, y abajo listas cortas con «Mostrar todo» | — | Cada sección es una muestra con su «todo» |

La pauta común es que la cabecera es tuya y tus cifras, y las colecciones se ven en una muestra de una
sola fila que lleva a su pantalla.

## Propuesta

Maqueta (390 px, claro y oscuro, con la paleta de `brand.css` y la letra Outfit):
`perfil-light.png`, `perfil-dark.png`, `logros-light.png` y `logros-dark.png`, en la carpeta
`ux-perfil/` del espacio temporal de la sesión, con su HTML (`build.py` lo genera).

Orden, de arriba abajo (la primera pantalla llega hasta las cifras; en total, ~1,2 pantallas frente a las
~2,3 de ahora):

1. **Identidad** (igual que ahora, un poco más baja: portada de 128 px). Portada con el cuadro (se abre en el
   visor), avatar, «Hola, María» con el lápiz, y el engranaje y la portada en sus botones redondos. Debajo del
   nombre no va el rango, que tiene su propia tarjeta.
2. **Tarjeta de rango**, que explica cómo se sube sin añadir texto:
   - «Aficionado · Rango 2 de 8» y una **escalera de 8 tramos** (los alcanzados en oro y el siguiente
     punteado), que cuenta lo larga que es la carrera.
   - «Para ser **Copista**» y **una fila por condición**: ✓ 1.200 XP (1.877, ya cumplida, en tono apagado) y
     ○ Un nivel «a fondo» 0/1, con el botón **«Elegir»**, que lleva al mapa en un pintor dominado con su
     nivel 2 abierto.
   - Se quita la barra única. Si se quiere mantener alguna barra, que sea una por condición, nunca el
     mínimo de todas.
   - La tarjeta entera abre una hoja con los 8 rangos y lo que pide cada uno.
3. **Cuatro cifras en fichas de 2 × 2**, todas pulsables: racha (días) → calendario de racha; pintores
   dominados → mapa; cuadros vistos → Colección; épocas (2/11) → épocas. Cada una lleva un icono suave del
   color de su significado (coral, oro, verde, acento). Son números grandes con una etiqueta de dos palabras,
   sin frases.
4. **Logros: una fila de 4 dentro de una tarjeta.** Las 3 últimas conseguidas (con su metal) y **la más
   cercana**, en gris, con un arco coral de avance y «12 de 15». La cabecera «Logros» lleva a la derecha
   «14 de 146 ›», que abre la pantalla. Los nombres van cortos y en una sola línea.
5. **Practicar**: tres filas iguales («Repasar lo aprendido», «Test de pintura», «Reto semanal» bloqueado).
   El test deja de ser un botón coral de primer nivel y el resultado del test pasa a la fila («Nivel 3 · 72
   %») cuando lo haya.

**Pantalla «Logros»** (ruta propia `#logros`, ya no una hoja; así «atrás» funciona y se puede enlazar):
barra con ← y «14 de 146», filtros Todos / Conseguidos / Pendientes, una tarjeta **«El más cerca»** con
barra de avance, y los grupos (Pintores, Movimientos, Rachas, Ojo de…, Retos) en una **cuadrícula de 4 por
fila** con medallas de 64 px. Las pendientes se ven en gris y con el cuadro desaturado. Cada medalla sigue
abriendo su hoja.

## Por qué así (y qué no cambiar)

- No se quita nada que María haya validado: la portada, el avatar, el saludo con lápiz, los metales y la hoja
  de cada logro se quedan. Solo se cambia **cuánto espacio** ocupan y **en qué orden** salen.
- La medalla «más cercana» dentro de la fila convierte la vitrina en un objetivo. Es lo que mejor funciona en
  Duolingo para volver al día siguiente.
- El rango es lo que hace distinta a Sfumato: no se sube solo con XP, también hay que mirar a fondo. Por eso
  necesita verse como **dos condiciones** y tener una acción. Si no, el jugador con mucho XP se frustra.

## Notas para quien lo construya

- `rankProgress().items` ya da las condiciones que faltan. Hay que añadir también las cumplidas (con
  `fraction: 1`) para pintar las dos filas.
- `FIRST_SHOWN` pasa de 8 a 4 (3 conseguidas y la más cercana). `medalList().rest[0]` ya es la más cercana de
  «Ojo de…»; habría que ampliarlo a rachas y metas.
- Las cifras salen de `rankStats` (épocas), `collectionIds` (cuadros) y `progress.streak`. Pintores dominados
  = `artists[*].mastered`.
- Zona táctil: las fichas miden 72 px de alto, el botón «Elegir» 36 px visibles con 48 px de zona, y el
  enlace «14 de 146 ›» 44 px.
- Pruebas: barra o condiciones con XP cumplido y «a fondo» pendiente, fila de 4 con la más cercana, y ruta
  `#logros` con «atrás».
