# Cronología sin años: antes, después y a la vez

Propuesta de diseño de aprendizaje (sin tocar código). Maqueta y capturas (temporales, fuera del repo) en
`/tmp/claude-0/-home-user-Mirada/6e4efa67-f85b-5559-9545-892873e98ef7/scratchpad/ux-cronologia/`:
`maqueta.html`, `pregunta-light.png`, `respuesta-light.png`, `ficha-light.png`, `ficha-dark.png`,
`repaso-light.png` y `repaso-dark.png`.

## 1. Diagnóstico

- **Un año suelto no se queda.** «1401» no se engancha a nada: es un dato aislado, y la memoria guarda
  relaciones, no números. Lo que sí retiene quien visita un museo es un **orden** («Masaccio va antes
  que Botticelli»), una **coincidencia** («Piero y Botticelli vivieron a la vez») y alguna **herencia**
  («Miguel Ángel copiaba a Masaccio»). Eso es lo que hay que construir.
- **El modelo mental útil es una cinta corta con los pintores que ya conoces**, no la historia del arte
  entera. Cada pintor nuevo se coloca respecto a dos o tres que ya conoces (sus vecinos): antes, después
  o a la vez. Cuantos más pintores conoces, más fácil es colocar al siguiente.
- **Hoy el camino da más saltos atrás de los que importan.** Si contamos cada pintor que nació antes que
  alguno ya visto en su época, salen 18. Solo 7 son de **otra generación** (≥ 20 años de diferencia o
  sin coincidir en activo): Masaccio y Piero (respecto a Botticelli), Leonardo (respecto a Rafael),
  Parmigianino y Bronzino (respecto a Bruegel) y Rubens (respecto a Zurbarán). Los otros 11 son
  **contemporáneos** (Ribera y Artemisia se llevan 2 años; Sisley y Renoir, 2). Decir «retrocedemos»
  con contemporáneos es falso y lía.
- **Lo que pide María es lo que mejor funciona: preguntar.** Recuperar algo de memoria lo fija mucho más
  que releerlo (efecto test), y adivinar antes de ver la respuesta también ayuda, aunque se falle. Con
  dos pintores anteriores seguidos, la segunda explicación sobra: basta con preguntar.

**Regla propuesta (calculable con `born`/`died` del catálogo):** A es **antes** que B si A murió antes
de que B cumpliera 25 años o si nació ≥ 20 años antes; si no, **a la vez**. Ejemplos: Masaccio
(†1428) es antes que Piero (n. c. 1415), que tenía 13 años; Parmigianino y Bronzino (los dos de 1503)
son a la vez, así que nunca se pregunta «¿antes o después?» entre ellos.

## 2. Opciones comparadas

| Opción | Ejemplos | Claridad | Coste | ¿Estorba al juego? |
|---|---|---|---|---|
| **A. Cinta en la historia**: en la primera tarjeta, los pintores que ya conoces de la época en fila, a distancia proporcional y sin años; el nuevo cae en su sitio | Línea del tiempo del Rijksmuseum, «Timeline» de Khan Academy, salas del Prado en orden | Alta: se ve, no se lee | Medio: un componente (datos ya en el catálogo) | No: va dentro de la historia, que ya existe |
| **B. Preguntar en vez de contar**: con el segundo salto seguido (Piero), la tarjeta pregunta «¿antes o después de Masaccio?»; en los repasos, «¿Quién fue antes?» entre dos pintores ya vistos de distinta generación | Predicción de Brilliant antes de explicar; repaso de Duolingo | Alta, y fija el orden | Medio: un tipo de tarjeta y, en fase 2, un tipo de pregunta | Poco: un toque, sin vidas ni castigo; en los repasos aporta variedad |
| **C. Orden del camino estrictamente cronológico dentro de cada tramo, salvo la puerta de entrada** | Cursos de historia del arte | Alta | Bajo: cambiar `tools/camino.json` | No, salvo que se pierde algún gancho |
| **D. Marcador «antes de Botticelli» en el nodo del mapa** | — | Baja: un rótulo más, sin contexto | Bajo | **Sí**: recarga el mapa, va contra «textos mínimos» |
| **E. Línea del tiempo de la época al desbloquearla**, con los pintores que ya conoces | Esquemas de Google Arts & Culture | Media: llega antes de conocer a nadie | Medio-alto | Algo: otra pantalla entre el usuario y el juego |
| **F. Árbol de maestros e influencias** | Diagrama de Alfred Barr para el MoMA (1936) | Alta cuando hay datos | **Alto**: cada línea hay que verificarla con fuentes, y el catálogo tiene pocas parejas maestro–alumno | No, pero llega tarde |

Descartadas: **D** (ruido en el mapa) y **E** (llega cuando aún no conoces a nadie, así que es una lista
de años). **F**, mejor como frase suelta en las historias («Miguel Ángel iba a copiarlas»), que ya se
hace, que como pantalla.

## 3. Recomendación

**A + B, con la regla de generaciones y un retoque de orden (C) en el Alto Renacimiento.**

1. **Cinta en la primera tarjeta de la historia** cuando el pintor no va simplemente «después del
   anterior». Solo nombres y miniaturas de los pintores vistos de esa época (máx. 4: el nuevo y sus
   vecinos), separados en proporción a cuándo vivieron y **sin años**.
2. **El primer salto se cuenta; el segundo seguido se pregunta.** Masaccio: «Retrocedemos a 1425, antes
   de Botticelli» (ya escrito). Piero: la primera tarjeta es la pregunta, con dos botones; al responder,
   Piero cae en la cinta y sale una frase corta. Sin vidas ni puntos: es para fijar, no para examinar.
3. **Contemporáneos: «a la vez que».** Ribera, Hals, Pissarro, Sisley, Van Gogh, Gauguin, Matisse,
   Kandinsky… no «retroceden»: su historia dice «mientras Artemisia…» y la cinta los pone juntos.
4. **Ficha del pintor: «Su tiempo»**, con barras de vida alineadas de los pintores que ya conoces
   (como mucho 4) y una frase que se genera sola («Llegó justo después de Masaccio y coincidió con
   Botticelli»). Así se ve quién coincidió con quién y la consulta siempre está ahí. El eje solo dice
   «siglo XV | XVI».
5. **Fase 2, en los repasos: «¿Quién fue antes?»**, solo entre pintores ya vistos y **de distinta
   generación** según la regla (nunca contemporáneos: sería una trampa). La respuesta enseña la mini
   cinta.

**Textos mínimos (todos los datos sacados de `born`/`died`, con fuente en el catálogo):**

- Pregunta: «¿Piero vino antes o después de Masaccio?» · botones «Antes» / «Después».
- Respuesta: «**Después.** Cuando murió Masaccio, Piero era un muchacho. Y luego vivió a la vez que
  Botticelli.»
- Ficha: título «Su tiempo»; frase «Llegó justo después de Masaccio y coincidió con Botticelli.»
- Repaso: «¿Quién fue antes?» → «¡Eso es! Piero murió cuando Rafael era un niño.»

**Orden del camino.** Primer Renacimiento, **sin cambios**: Botticelli → Masaccio → Piero → Berruguete.
Ya es «puerta de entrada y luego cronológico»: Botticelli engancha, Masaccio retrocede (se cuenta),
Piero se pregunta y Berruguete (n. 1450) vuelve a la época de Botticelli («a la vez que Botticelli»).
**Alto Renacimiento: propongo Leonardo → Miguel Ángel → Rafael** (hoy Rafael → Leonardo → Miguel
Ángel). Quita el único salto de verdad del tramo (Leonardo es 31 años mayor que Rafael) y deja la
mejor historia del tramo: Rafael, el joven que aprendió de los dos que acabas de ver. La razón para
retrasar a Leonardo era no empezar la app por él; en la parada 5 eso ya no pesa. Decide María.
Los otros saltos de generación (Parmigianino y Bronzino tras Bruegel; Rubens tras Zurbarán) se quedan
como están: son cambios de escuela o de país («Volvemos a Italia…») y la cinta los coloca bien.

## 4. Maqueta

Cuatro pantallas a 390 px (la historia siempre va en modo noche; la ficha y el repaso, en claro y en
oscuro), con la paleta de `app/css/brand.css`:

- **Pregunta** (historia de Piero, tarjeta 1): cinta con Masaccio y Botticelli, botones Antes/Después.
- **Respuesta**: Piero, con aro coral, cae entre los dos; «Después.» en verde suave.
- **Ficha**: tarjeta «Su tiempo» con barras de vida y miniatura de cada pintor; el actual, en coral suave.
- **Repaso**: «¿Quién fue antes?», Rafael frente a Piero; la respuesta, con la mini cinta Piero ·
  Botticelli · Rafael.

Para construir: la cinta y las barras son un solo componente (`ui/`) con la regla en el motor
(`engine/`, puro y con pruebas: «antes / a la vez / después» a partir de `born`/`died`). Las medidas de
la maqueta (`--dot`, `--bar-h`…) irían a `brand.css`. Accesibilidad: la cinta lleva una etiqueta de
texto con el orden («Masaccio, Piero, Botticelli») y los botones son de 54 px.
