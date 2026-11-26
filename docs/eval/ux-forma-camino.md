# Forma del camino: ¿recto, con curvas o en diagonal?

Análisis de diseño visual del camino de la portada (64 paradas), comparado con juegos de referencia.
Noviembre de 2026. Capturas en Pixel 7 del último commit (la copia de trabajo estaba a medio cambiar
y no cargaba la colección).

## Respuesta corta

- **Ningún juego de referencia sube recto.** El modelo «saga» (Candy Crush, Angry Birds 2) y Duolingo
  usan un **sendero vertical que serpentea** de lado a lado; la diagonal aparece solo en tramos cortos.
- **El nuestro ya serpentea, pero de forma demasiado regular.** Es una onda perfecta: mismas dos
  columnas (x ≈ 128 y 262), mismo paso (124 px) y cada época empieza igual (recta larga y cartel).
  64 veces lo mismo. Ahí está lo «aburrido», no en que suba recto.
- **Los juegos no evitan la monotonía con la forma sino con el ritmo y los hitos**: cada mundo con su
  tema, monumentos a buen tamaño, ríos y puentes, cambios de dirección y desvíos visibles.
- Algunos de los que más facturan (Royal Match, Homescapes/Gardenscapes) **quitaron el mapa** y lo
  cambiaron por decorar un castillo o una casa. No nos sirve: el camino es nuestra seña (modelo Duolingo).

## Cómo es hoy

- Mapa entero a escala (de abajo a la izquierda hacia arriba a la derecha): la onda es idéntica en las
  9 épocas. Los paisajes llevan detalles pequeños (casitas, árboles) que, vistos de lejos, no se distinguen.
- Lo que sí funciona: el sendero es continuo, el nodo actual destaca y hay río con puente en el Renacimiento.
- Además de la forma, pesa el color: en las capturas el paisaje se ve gris azulado y apagado, también en
  la época actual. Conviene revisarlo aparte (puede que sea un tinte de «bloqueado» demasiado general).

## Juegos de referencia

| Juego | Forma del camino | Ritmo y variación | Sensación de viaje | Fuente / confianza |
|---|---|---|---|---|
| Duolingo (camino de 2022) | Vertical; nodos redondos en curva de lado a lado | Cabecera por unidad; iconos distintos por nodo (estrella, libro, micro, pesa…) | Color por unidad; personajes junto a la curva (sin fuente) | Blog de Duolingo [1]; vp0 [2] |
| Candy Crush Saga | Sendero sinuoso de saga; luego mapa en 3D | Episodios con tema propio, agrupados en mundos; más camino entre mundos que entre episodios | Cada episodio es un escenario nuevo; se renovó en 2022 para leerse mejor | Wiki de fans y King [3][4] |
| Royal Match | Sin mapa de niveles: botón de nivel y castillo por zonas | Ritmo de dificultad: nivel difícil y muy difícil cada 10, luego uno fácil | Restaurar salas del castillo; Royal Kingdom (2024) sí vuelve a un mapa desplazable | Análisis en Medium y esports.net [5][6] |
| Homescapes / Gardenscapes | Sin mapa de saga, a propósito | — | Historia con personajes y reformar casa o jardín | Entrevista a Playrix en Game Developer [7] |
| Two Dots | Mundos ilustrados que se recorren desplazando | Mundos de 25 o más niveles | Temas: tundra ártica, selva, fondo del mar, espacio; «la historia se cuenta al desplazar» | App Store y Wikipedia [8]; la forma exacta, sin confirmar |
| Angry Birds 2 | Mapa sinuoso «al estilo Candy Crush» | Arcos de progreso paralelos y entrelazados | — | Macworld y Game Developer [9][10]; detalle visual sin confirmar |
| Super Mario Bros. Wonder | Mapa continuo con iconos de nivel en 3D | Un centro (Islas Pétalo) del que salen 6 mundos; entradas al Mundo Especial | Cada mundo con clima propio; el castillo de Bowser flota en el centro | Super Mario Wiki [11] |
| Super Mario World | Mapa con ramas | Puntos rojos = nivel con salida secreta (24 de 96); los Caminos Estrella conectan zonas | Descubrir atajos y zonas secretas | Super Mario Wiki [12] |
| Toon Blast | Sin confirmar | — | — | No se encontraron fuentes fiables |
| Cookie Jam | Sin confirmar | — | «Islas temáticas de postres» | App Store [13] |
| Monument Valley | No tiene camino: cada pantalla es una pieza | — | «Cada pantalla, una obra que podrías colgar en la pared» | Game Developer [14] |

Patrón común: **un mundo por tema con transición marcada**, **un hito grande por mundo** y **un
ritmo que cambia** (tramos rápidos, respiros, picos). Ninguna fuente fiable defiende la diagonal ni la
espiral como forma principal en móvil.

## 5 mejoras, por impacto

Todas caben en el sistema actual: `path-layout.js` es la única fuente del trazado y
`tools/mapa_svg.py` pinta los paisajes a partir de ella (vía `tools/mapa-layout.mjs`), así que los
cambios llegan solos al paisaje.

1. **Romper la regularidad con «figuras» por época** (lo que más cambia la sensación).
   - Cambiar `XS` y el paso fijo por una tabla de figuras: curva en S amplia (x 95-300), diagonal de 3
     paradas en el mismo sentido (paso corto, unos 84-96 px), horquilla que rodea un monumento (paso
     largo, unos 150 px) y curva suave.
   - Combinación fija por época (sin azar), para que cada época tenga su silueta y el paisaje cuadre.
   - Hay que mantener: el sendero siempre sube (`roadX` lo da por hecho), las tangentes verticales en
     los nodos y el rótulo del lado con más sitio (ya sale de `p.x`). Sin lazos completos: bajarían, y
     subir es la metáfora del progreso. Prueba en `tests/mapa.test.js`.
2. **Una puerta y un monumento grande por época.**
   - Cambiar la recta vacía de entrada (196 px, idéntica en las 9 épocas) por una puerta o arco sobre
     el sendero, con el cartel de época al lado.
   - Cada época con un monumento a 2-3 veces el tamaño actual, dentro de la horquilla: cúpula de
     Florencia, molino flamenco, palacio barroco, puente de hierro, estanque de nenúfares… `mapa_svg.py`
     ya tiene un `deco_*` por época: es cuestión de escala y sitio.
3. **Ríos y agua que cruzan en diagonal, con puente.** `M.rio` y `M.puente` ya existen, pero hoy el río
   es una banda horizontal. Uno en diagonal que el sendero cruza en mitad de una S se ve como un viaje.
   Que cambie por época: Arno, canal flamenco, Sena, estanque.
4. **Ritmo de paradas variable.** Paradas juntas en las diagonales (sensación de avanzar rápido) y un
   respiro antes del repaso y de la puerta. El repaso, como plaza algo mayor. Mínimo de unos 84 px
   entre paradas para que el aro de niveles, el rótulo y el botón «Empezar» no choquen.
5. **Las ramas, como desvíos de verdad.** Hoy son una línea de puntos hacia el margen. Mejor un sendero
   estrecho que sale por el lado de fuera de una curva, justo donde el camino principal se aleja de ese
   margen (así hay sitio para su cartel), y se pierde en el paisaje. Las figuras de la mejora 1 se
   eligen para dejar ese hueco.

Descartado o con cuidado:

- **Perspectiva o elevación fuerte**: encoge los nodos y los rótulos de arriba y estorba al tocar en
  una columna de 390 px. Como mucho, colinas de fondo con algo de paralaje.
- **Diagonal de borde a borde**: con 64 paradas obliga a desplazar mucho más y los rótulos no caben.

## Maqueta

El trazado actual frente al propuesto, con las mismas 18 paradas (Renacimiento + Manierismo y Norte):
curva en S, diagonal, horquilla alrededor de la cúpula, río en diagonal con puente, puerta de época,
molino y desvío de rama. Es un esquema de la forma, no un diseño acabado: en la versión real, los
rótulos de la horquilla irían por fuera.

## Capturas (temporales, en el scratchpad de la sesión)

- `…/scratchpad/caminos/hoy-mapa-entero.png`: mapa entero a escala, en 5 columnas.
- `…/scratchpad/caminos/hoy-0.png` … `hoy-7.png`: pantallas de móvil del museo (0) a la salida (7).
- `…/scratchpad/caminos/maqueta.png` y `maqueta.html`: comparación de hoy frente a la propuesta.

## Fuentes

1. Duolingo, «New Duolingo home screen design»: https://blog.duolingo.com/new-duolingo-home-screen-design
2. vp0, «Build a Duolingo-style learning tree UI»: https://vp0.com/blogs/duolingo-learning-tree-gamification-ui
3. Candy Crush Wiki, «Worlds»: https://candycrush.fandom.com/wiki/Worlds
4. PocketGamer.biz, entrevista a King sobre el mapa: https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase
5. Medium, «Game Analysis of Royal Match»: https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b
6. esports.net, «Royal Match Areas»: https://www.esports.net/news/mobile-games/royal-match-areas/ y Deconstructor of Fun sobre Royal Kingdom: https://www.deconstructoroffun.com/blog/2024/07/01/royal-kingdom-will-it-outgrow-its-big-brothers-influence
7. Game Developer, «Are casual games maturing? Lessons from Playrix»: https://www.gamedeveloper.com/game-platforms/part-2-are-casual-games-maturing-lessons-from-playrix-
8. Wikipedia, «Two Dots»: https://en.wikipedia.org/wiki/Two_Dots_(game) y su ficha en la App Store
9. Macworld, «Angry Birds 2 freemium field test»: https://www.macworld.com/article/226106/freemium-field-test-angry-birds-2-is-a-somewhat-muddled-return-to-form.html
10. Game Developer, «Lessons from Angry Birds 2»: https://www.gamedeveloper.com/game-platforms/are-casual-games-maturing-lessons-from-angry-birds-2
11. Super Mario Wiki, «Super Mario Bros. Wonder» y «Petal Isles»: https://www.mariowiki.com/Petal_Isles
12. Super Mario Wiki, «Secret exit» y «Star Road»: https://www.mariowiki.com/Secret_exit
13. App Store, «Cookie Jam»: https://apps.apple.com/us/app/cookie-jam-matching-game/id727296976
14. Game Developer, «Designing the surprise mobile hit Monument Valley»: https://gamedeveloper.com/design/designing-the-surprise-mobile-game-hit-i-monument-valley-i-

Nota: las webs de fans y de Game Developer no se pudieron abrir desde la sesión (red restringida). Los
datos de esas fuentes vienen de los extractos del buscador. Lo marcado «sin fuente» o «sin confirmar»
es observación general, no un dato verificado.
