# Niveles e historias: el aro que se toca

Propuesta de UX (sin código). Maqueta y capturas a 390 px, en claro y en oscuro, en la carpeta temporal de la sesión
(`ux-niveles/maqueta.html`, `mapa-*.png`, `toque-*.png`, `ficha-*.png`, `historia-*.png`, `maqueta-light.png`, `maqueta-dark.png`).
Ejemplo: Velázquez con el nivel 1 y el 2 hechos, el 3 por jugar y el 4 y el 5 cerrados. Textos de historia y obras sacados de
`app/data/historias/velazquez.json` y del catálogo.

## En una frase

**Un tramo del aro = un nivel = una historia.** El aro del mapa dice cuántos niveles hay y por dónde vas. Al tocar el retrato
sale una tarjeta con esas mismas historias en círculos, como las historias destacadas de Instagram, y un solo botón «Jugar».
La ficha repite la misma fila de círculos bajo el nombre.

## Lo que hay hoy (comprobado en la app)

- **Punto 3, confirmado.** Cada nivel «a fondo» abre con su historia antes de las preguntas: en la ruta `a-fondo-<pintor>-<n>`,
  `withStory(ctx, el, id, level, …)` llama a `playStory(..., { force: true })` (`ui/screens/flows.js`). Al pasar de la última
  tarjeta, o con «Jugar», empieza la ronda. **Pega:** si el nivel no tiene historia, se salta sin avisar a las preguntas.
- El aro del mapa (`ui/deep-badges.js`) cuenta solo los niveles «a fondo» (no el 1). Pinta en coral lo que queda y apagado lo
  hecho, y **desaparece cuando lo has hecho todo**. Es decir: justo cuando hay más historias que volver a ver, desaparece la
  puerta para verlas.
- En el retrato de un maestro dominado se juntan **dos aros**: el dorado de «dominado», con su check, y el partido. A 390 px
  se leen como un único borde raro (`now-map.png`).
- La ficha solo tiene «Ver su historia» (siempre la del nivel 1). Las etapas salen en una lista lejos de la cabecera.
- **Datos:** casi todos los maestros de una sola parada tienen un nivel 2 provisional, «Más obras», sin historia (Botticelli,
  Masaccio, Piero, Veronés…: 49 maestros, y 65 pintores en total). Hoy les sale un aro de un tramo que no lleva a ninguna historia. Y el nombre de cada etapa no
  coincide con el título de su historia («Sevilla» en el catálogo, «Sevilla: el joven maestro» en la historia; en Goya, «Formación
  y cartones» frente a «Zaragoza y los cartones para tapices»).

## Alternativas

| | Qué es | A favor | En contra | Veredicto |
|---|---|---|---|---|
| **A. Ramitas** (idea de María) | Nodos pequeños «Botticelli 2, 3…» que salen del principal. | Se ve a la primera que hay más. Recuerda las lecciones del camino de Duolingo. | Con 64 paradas y hasta 6 niveles, saldrían unos 60 nodos más. El mapa dejaría de leerse como un camino, y cada ramita es un objetivo táctil más en una pantalla ya llena. Además no responde a «dónde veo las historias». | No. Lo bueno que tiene (numerar los niveles) pasa a la tarjeta. |
| **B. El aro como Instagram puro** | Tocar el retrato reproduce las historias del tirón; jugar, desde otro sitio. | Es el gesto que todo el mundo conoce. | El nodo del camino siempre ha servido para *jugar*: si al tocarlo salta una historia, ese gesto cambia de significado solo en 14 pintores. Encima, encadenar 5 historias es un muro de unos 60 s. Y los tramos sueltos del aro no se pueden tocar: miden 4–7 px, muy por debajo de los 44 px. | No. |
| **C. Aro + tarjeta del nodo con historias destacadas** (elegida) | El aro informa. Al tocar sale la tarjeta del nodo (la burbuja de «Empezar» que ya existe, en grande) con un círculo por nivel y un botón «Jugar». Los mismos círculos aparecen en la ficha. | El nodo sigue siendo la puerta de entrada, como en Duolingo, y dentro se ve exactamente qué hay y qué falta. Cada historia está a un toque y el siguiente nivel también. Mapa limpio. | Un toque más que la opción B para ver una historia. A cambio, nunca te encuentras una historia que no esperabas. | **Sí.** |

Referencias: la tarjeta que sale al tocar un nodo del camino de Duolingo («Lección 3 de 4» + «Empezar») ([Duolingo](https://blog.duolingo.com/new-duolingo-home-screen-design));
las historias destacadas de Instagram (círculos con título bajo el perfil, en fila que se desliza) y su aro de color = «hay algo
nuevo» ([TechCrunch](https://techcrunch.com/2017/11/11/imagining-instagram-stories-first)); los anillos partidos por progreso del
antiguo árbol de coronas de Duolingo. Lo que se descarta de ellos: el aro de Instagram caduca y no tiene estados, y aquí hacen falta tres.

## La propuesta, pieza a pieza

### 1. En el mapa (`mapa-light.png`, `mapa-dark.png`)

- **Un solo aro** alrededor del retrato. Sustituye al aro dorado de «dominado» en los pintores con niveles (fuera el doble borde).
- **Un tramo por nivel, contando el 1** («Quién fue»). Así coincide uno a uno con los círculos de la tarjeta y de la ficha.
  Velázquez: 5 tramos. Empieza a las 12 y avanza en el sentido del reloj, con huecos de unos 9°.
- **Tres estados:**
  - **Hecho:** oro (`--gold`), el color que la app ya usa para lo dominado.
  - **Por jugar:** coral (`--brand`), un poco más grueso, con un halo suave que respira (quieto con «reducir movimiento»).
    Solo hay uno a la vez: el siguiente.
  - **Cerrado:** lino apagado (`--line-2` / gris cálido en oscuro).
- **Sello** abajo a la derecha, en el mismo sitio del check actual: coral con el número del siguiente nivel («3») o, si está todo
  hecho, check dorado. Con todo hecho, **el aro se queda entero en oro** (Zurbarán en la maqueta): es el premio visible y la puerta
  a sus historias. Hoy el aro desaparece en ese momento.
- Sin texto nuevo en el mapa. La etiqueta del nombre no cambia. Para lectores de pantalla: «Velázquez. Nivel 3 de 5 por jugar».

### 2. Al tocar el retrato (`toque-light.png`, `toque-dark.png`)

Sale la tarjeta del nodo, anclada con su pico al retrato, que sigue encendido sobre el velo:

- **Cabecera:** «Velázquez ›», que se puede tocar y lleva a la ficha, y una pastilla «Nivel 3 de 5».
- **Fila de historias destacadas**, una por nivel, con portada (la obra de su primera tarjeta) y título corto debajo:
  - **Hecho:** aro fino de oro. Al tocarlo se reproduce esa historia y, al terminar, vuelves a la tarjeta (sin ronda).
  - **Por jugar:** aro coral‑oro (degradado de marca, como el de «no visto» de la ficha actual), título en negrita y una
    pequeña insignia ▶. Al tocarlo pasa lo mismo que con «Jugar»: historia y luego preguntas.
  - **Cerrado:** portada muy desenfocada y en gris, sin spoiler, con un candado. El título sí se ve: abre el apetito. Al tocarlo,
    el círculo tiembla y aparece una línea en la propia tarjeta: «Se abre al terminar La corte». No se usa `alert`.
  - Con 6 niveles (Goya, Van Gogh) la fila se desliza. El sexto asoma por el borde y deja claro que hay más.
- **Un botón:** «Jugar · La corte». Siempre lleva al siguiente nivel, con su historia delante (como ahora).
- Con todo hecho, el botón pasa a «Repasar» (una ronda mixta de sus etapas) y la pastilla dice «Completo».

### 3. En la ficha (`ficha-light.png`, `ficha-dark.png`)

- El **avatar lleva el mismo aro partido** que el mapa. Al tocarlo se reproduce la historia nueva (la coral) o, si no hay ninguna
  nueva, la de «Quién fue».
- **Las historias destacadas** van justo bajo el nombre y las etiquetas, donde Instagram las pone. Sin título de sección, porque los círculos ya se
  explican solos. Se comportan igual que en la tarjeta del nodo.
- Sustituyen al botón «Ver su historia». El botón principal se queda en «Jugar · La corte».
- La lista «Etapas» de más abajo sobra en buena parte: los años de cada etapa pueden ir como subtítulo en la primera tarjeta
  de su historia. Recomiendo quitarla o dejarla plegada. Así no hay dos índices de lo mismo en la misma pantalla.

### 4. Antes de cada nivel nuevo (`historia-*.png`)

Lo que ya ocurre, con un ajuste: la cabecera de la historia dice de qué nivel es, «3 · La corte», junto al nombre del pintor. Así
la historia se ata al tramo que acabas de tocar. Las barras de arriba siguen siendo las tarjetas de la historia, no los niveles:
mezclar las dos cosas confundiría.

## Textos (todos)

`Nivel 3 de 5` · `Jugar · <etapa>` · `Se abre al terminar <etapa>` · `Completo` · `Repasar` · títulos cortos de nivel. Nada más.
No hay textos de ayuda: el aro y los círculos se entienden con el primer toque.

## Lo que hace falta antes de construirlo

1. **Un título corto por nivel** (hasta unos 10 caracteres: «Quién fue», «Sevilla», «La corte», «Madrid», «Roma»), escrito a mano junto
   a la historia y con un único origen para el catálogo y la historia. Hoy hay dos nombres distintos para cada etapa.
2. **Regla «sin historia no hay tramo»**, comprobada en `tools/validate_catalog.py`: un nivel sin historia no suma tramo. Para los
   49 maestros con un único nivel «Más obras» sin historia, o se escribe su historia (lo mejor, siguiendo el modelo validado del
   Renacimiento) o no llevan aro y conservan el check de dominado, con su «Más obras» en la ficha. Un aro que promete una historia
   y no la da es justo la trampa que María quiere evitar.
3. Cambiar `deepBadgeInfo` para contar el nivel 1 y que el aro no desaparezca al completarlo. Es una prueba nueva en `tests/`.

## Riesgos y por qué los asumo

- **Un toque más para jugar** a un maestro dominado (antes: tocar, ficha, etapa). Ahora es tocar y «Jugar», así que en realidad
  hay un paso menos que hoy.
- **El oro se repite** (aro, sello, pastilla). Es a propósito: en toda la app, el oro significa «hecho o dominado», y el coral, «lo siguiente».
- **Tamaño:** la tarjeta mide 358 × 260 px. Cabe sobre el mapa sin taparle a nadie su propio nodo, porque se ancla debajo o encima
  según el hueco.
