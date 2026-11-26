# Posición en el mapa al entrar y al volver de un nivel

Análisis de referentes (noviembre de 2026) para el camino de Mirada: 64 paradas en vertical, de abajo
arriba, con ramas laterales y paradas con niveles «a fondo».

**Grado de certeza.** La búsqueda web dio poca documentación oficial sobre este detalle de interfaz y
varios sitios no se pudieron abrir desde esta sesión (blog de Duolingo, entre otros). Marco cada dato:
**[F]** = con fuente enlazada; **[O]** = comportamiento conocido de uso habitual, sin fuente encontrada
en esta búsqueda; **[?]** = no lo he podido confirmar.

## 1. Tabla por juego

| Juego | Al abrir | Al volver de un nivel | Volver a mi sitio | Hecho / pendiente / progreso en nodo |
|---|---|---|---|---|
| **Duolingo** (camino) | Camino situado en la lección actual [O]. | Vuelve al camino; el nodo se rellena y el siguiente se activa; cofres en el camino que se abren con animación de gemas [F, diseño de un ex-diseñador del camino]. Desplazamiento exacto de cámara: [?]. | Botón flotante «ir a la lección actual», añadido porque el camino es muy largo [F, uxdesign.cc]. Al cerrar la lista de secciones con la X vuelves a tu sitio [F, blog Duolingo]. | Hechos en dorado y se pueden repetir; actual destacado; anillo de progreso alrededor del nodo [O]; cofres y trofeo al acabar unidad [F]. |
| **Candy Crush Saga** | Debería abrir en el nivel actual; hay quejas de que a veces abre en el nivel 1 o en otro antiguo [F, foro King]. | El personaje avanza al siguiente nivel en el mapa [O]; desplazamiento [?]. | Botón rosa con el número de tu nivel que salta a él [F, foro King]; quejas de que la flecha apuntaba al sitio equivocado [F]. Piden también lo contrario: ir al principio [F]. | Estrellas (1-3) bajo cada nivel hecho; bloqueados hasta pasar el anterior [F]. |
| **Homescapes / Gardenscapes** | No hay mapa de niveles: pantalla de la casa/jardín con botón «Nivel N» [O]. | Vuelves a la casa con la estrella ganada para gastarla en tareas [F, App Store]. | No aplica: el botón siempre lleva al siguiente. | Contador único de nivel; progreso visible en la decoración [F]. |
| **Royal Match** | Igual: castillo por zonas y botón de nivel, sin mapa largo [F, análisis: «una pantalla cada vez»]. | Vuelves al castillo con una estrella; al acabar zona, cofre [F]. | No aplica. | Tareas por zona con su coste en estrellas [F]. Su sucesor Royal Kingdom sí recupera un mapa continuo por el placer de ver lo hecho [F, opinión]. |
| **Super Mario World / Wonder** | Mario en el último punto donde estaba en el mapa del mundo [O]. | Mario reaparece en el nivel que acaba de completar; se abre (con animación) el camino al siguiente; en Wonder hay escenas que «te devuelven al mapa con un camino nuevo» [F]. | El jugador camina; la cámara siempre le sigue [O]. | Puntos de nivel que cambian de color al superarse; los de salida secreta van en rojo [F]. |
| **Angry Birds 2** | Mapa del mundo para elegir nivel [F]. | Pantalla de resultado con estrellas y premio [F]; vuelta al mapa: [?]. | [?] | Estrellas por nivel [F]. |
| **Clash Royale** (Camino de trofeos) | Se abre desde el menú, en tu número de trofeos [O]. | Al subir trofeos aparecen premios para reclamar en el camino [F]. | [?] | Tu posición y la de tus amigos en el lateral, más arriba quien más tiene [F]. |
| **Brawl Stars** (Camino de trofeos) | Rediseñado en 2025 como un recorrido por el mapa de un parque [F]. | Premios por hitos; los no reclamados se dieron solos al actualizar [F]. | [?] | Hitos con premio [F]. |
| **Pokémon GO** | Mapa real centrado en tu ubicación [F]. | Al salir de un gimnasio o captura vuelves al mapa en tu posición [O]. | Brújula / recentrar; en 2026 brújula y tiempo comparten icono que cambia según lo que haces [F]. | No es un camino; progreso en la barra de nivel [O]. |
| **Monument Valley** | Selección de capítulos [F]. | El dibujo geométrico que hiciste en el nivel aparece luego en la selección de niveles [F]. | No aplica (pocos niveles). | Progreso mostrado con puertas y arquitectura, no barras [F]. |
| **Two Dots** | Mapa vertical continuo [O]. | [?] | [?] | [?] |
| **Khan Academy Kids** | Un botón «jugar» en inicio que sigue el itinerario [F]. | Si te interrumpen, al volver y pulsar jugar sigues en la siguiente lección [F]. | No hace falta: el botón te lleva. | Biblioteca aparte para elegir libremente [F]. |
| **Brilliant** | Itinerario con punto de partida según nivel [F]. | [?] | [?] | Rumbo y progreso claros sin quitar libertad de elegir [F, ustwo]. |
| **Mimo** | Camino de lecciones [O]. | [?] | [?] | [?] |

## 2. Patrones comunes

1. **Abrir donde toca jugar.** Todos los caminos largos abren en la parada actual; cuando falla (Candy
   Crush abriendo en el nivel 1) es una de las quejas más repetidas en sus foros.
2. **La vuelta celebra en el mapa, no solo en la pantalla de resultado.** El nodo cambia de estado, el
   siguiente se enciende y, si toca, se abre un cofre o se dibuja el tramo nuevo (Duolingo, Mario).
3. **Botón para volver a tu sitio**, flotante y con tu nivel (Candy Crush) o con flecha (Duolingo).
   Su fallo típico: apuntar al sitio equivocado.
4. **Los juegos de decoración evitan el problema** quitando el mapa largo y dejando un solo botón
   «siguiente» (Royal Match, Homescapes, Khan Kids). El mapa se mantiene cuando ver lo hecho motiva.
5. **Estados legibles de un vistazo:** hecho (color pleno o estrellas, se puede repetir), actual
   (destacado y con el personaje), bloqueado (visible pero apagado). Progreso dentro del nodo con anillo
   o estrellas, nunca con texto.

## 3. Cinco recomendaciones para Mirada (por impacto)

1. **Al volver de una parada, recuperar la posición exacta del camino** (la parada desde la que
   entraste, incluida una rama lateral), no la parada actual ni el principio. Es lo que más molesta
   cuando falla y es pérdida de contexto.
2. **Celebrar en el camino:** al volver tras completar, sello del nodo → el muñeco camina a la
   siguiente parada → desplazamiento suave solo si esa parada queda fuera de pantalla. Corto (≈1 s),
   se cancela si la usuaria toca o desplaza, y sin animación con `prefers-reduced-motion`.
3. **Botón flotante «volver a mi parada»** que solo aparece cuando la parada actual no se ve, con
   flecha hacia arriba o abajo calculada en cada desplazamiento (no guardada) y la miniatura del cuadro
   de esa parada. Sin texto de ayuda.
4. **Al abrir en frío, situar la parada actual algo por debajo del centro** (≈60 % de la altura), para
   ver lo recorrido abajo y el siguiente tramo arriba, sin animación de entrada. La tarjeta «Continuar»
   sigue siendo el atajo de un toque (patrón Khan Kids).
5. **Estados claros y progreso dentro del nodo:** hechas con su cuadro a color; actual con el muñeco y
   un halo; pendientes visibles pero atenuadas (no grises frías, para no competir con los cuadros);
   niveles «a fondo» como anillo segmentado alrededor del nodo; en el arranque de cada rama, puntos con
   cuántas paradas lleva hechas.

## Fuentes

- Duolingo: [uxdesign.cc — rediseño](https://uxdesign.cc/duolingos-redesign-4-things-they-got-right-1-possible-improvement-acec8af9ec10),
  [blog — repasar lecciones](https://blog.duolingo.com/how-to-review-lessons-on-duolingo),
  [blog — nuevo inicio](https://blog.duolingo.com/new-duolingo-home-screen-design),
  [Devansh Gandhi — delight on path](https://devansh.design/delight-on-path),
  [60fps — animación de unidad](https://60fps.design/shots/duolingo-section-unit-complete-trophy-morph-animation)
- Candy Crush: [King — Map navigation](https://community.king.com/en/candy-crush-saga/discussion/294787/map-navigation),
  [King — volver al nivel actual](https://community.king.com/en/candy-crush-soda-saga/discussion/322941/how-can-i-get-back-to-my-current-level-without-scrolling-all-the-way-from-1),
  [King — botón al principio](https://community.king.com/en/candy-crush-saga/discussion/269355/button-to-scroll-to-beginning-levels),
  [King — carga en nivel incorrecto](https://community.king.com/en/candy-crush-saga/discussion/256158/candy-crush-loading-on-incorrect-level),
  [Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga)
- Royal Match / Homescapes: [Royal Kingdom vs Royal Match](https://medium.com/@chrisjameswallace/royal-kingdom-the-next-puzzle-hit-from-dream-games-c7395e26b185),
  [Naavik](https://naavik.co/deep-dives/royal-match/), [Gameloop](https://gameloop.com/in/blog/games/explore-the-unique-gameplay-and-features-of-royal-match-a-puzzle-and-castlebuilding-game),
  [Homescapes en App Store](https://apps.apple.com/gr/app/homescapes/id1195621598)
- Mario: [Wonder — caminos nuevos (wccftech)](https://wccftech.com/how-to/super-mario-bros-wonder-guide-unlock-w2-special-stage/),
  [Super Mario World (MarioWiki)](https://mariowiki.com/Super_Mario_World), [Salida secreta](https://www.mariowiki.com/Secret_exit)
- Angry Birds 2: [Wikipedia](https://en.wikipedia.org/wiki/Angry_Birds_2)
- Clash Royale: [Supercell — Trophy Road](https://supercell.com/en/games/clashroyale/blog/release-notes/new-update-feature-enter-the-trophy-road)
- Brawl Stars: [Fragster — Brawl Talk junio 2025](https://www.fragster.com/brawl-talk-june-2025-trophy-road-revamp-new-brawlers-modes-more/),
  [Supercell — rip masteries](https://supercell.com/en/games/brawlstars/blog/news/rip-masteries)
- Pokémon GO: [Niantic — Map view](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/84-map-view/),
  [Actualización oct. 2026](https://pokemongo.com/news/pgo-gameplay-update-oct-2026)
- Monument Valley: [uxdesign.cc — MV2](https://uxdesign.cc/beyond-beauty-best-usability-practices-from-monument-valley-2-fca37ef7c498),
  [TV Tropes — MV2](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/MonumentValley2)
- Khan Academy Kids: [Cómo funciona el itinerario](https://khankids.zendesk.com/hc/en-us/articles/360041615571)
- Brilliant: [Learning paths](https://brilliant.org/help/features/what-are-learning-paths), [ustwo](https://ustwo.com/work/brilliant)
