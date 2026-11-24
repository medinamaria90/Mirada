# Marca · ronda 2 (identidad, afinando)

Lienzo publicado (una sola página, se lee de arriba abajo):
https://claude.ai/artifact/3cjPwnjMsCBboSL6mGP15w

## Qué se entrega

Mezcla de partida, según lo que María decidió en la ronda 1: estética de interfaz de B (nodos redondos,
botones con relieve), voz de A, símbolo de A (el vano con punto), letras finas (pesos 400 a 600, nada de Rubik).

Mesas, en orden:

1. **Portada** (`Main`): qué se decide y qué ya quedó decidido.
2. **Logo 1, 2 y 3**: Trazo (el de la ronda 1), Pieza (relleno, con el punto en hueco) y Emblema (dos vanos,
   se dibuja en tres pasos). Cada uno en claro, oscuro, icono de app, tamaños y pestaña.
3. **Letra 1, 2 y 3**: Fraunces + Figtree («Clásica amable»), Outfit («Geométrica suave») e
   Instrument Serif + DM Sans («Mezcla»). Titular, nombre de cuadro, texto, botón, cifras y la voz de A.
4. **Color coral, granate y azul**: paleta base común, el protagonista con el contraste medido
   (≥ 4,5:1 para todo lo que lleva texto) y un ejemplo con cabecera, barra, nodos y botones.
5. **Pantallas** 390×844: camino con escenario del Renacimiento, camino con escenario del Barroco, camino
   con solo siluetas, pregunta («¿Quién lo pintó?»), ficha tipo historia (sin examen), celebración de fin
   de etapa (sello, puntos, racha y un pigmento para el taller) y perfil nuevo (portada, retrato, tres
   cifras, «Mi museo», logros; ajustes aparte).
6. **Camino entero** (mesa alta, desplazable): Renacimiento completo → rama Gótico recién abierta (opcional)
   → Manierismo y Norte en curso → Barroco cerrado pero visible → Rococó asomando. El escenario cambia con
   la época (arcada y cúpula; catedral; casas de hastial; fachada barroca).
7. **Cinco preguntas** con respuestas cerradas: logo, letra, color, escenario, rama.

## Color provisional en las pantallas: coral contenido (#E27D66)

Conserva el calor del «Juego de mirar» que eligió María, pero apagado un punto, y es el que menos compite con
los cuadros porque ya está en ellos (piel, cielos de atardecer). Texto tinta sobre el botón: 5,7:1. Como texto
(#A84A35) sobre lino: 5,1:1. El granate es más sobrio pero tira a solemne; el azul descansa pero enfría el
juego. Las tres opciones están medidas en sus mesas y la pregunta 3 deja elegir.

## Escenarios de época

Vectoriales (SVG en línea), en dos tonos apenas más oscuros que el lino, sin trazos negros, para que no
compitan con los cuadros. Si se quedan cortos, el paso siguiente es Gemini con una guía de estilo única.

## Archivos

- `marca/tools/r2_theme.py` tokens (paleta base, tres acentos, tres parejas de letra).
- `marca/tools/r2_parts.py` logotipos, iconos de trazo, medallas.
- `marca/tools/r2_scene.py` escenarios de época (renacimiento, barroco, gótico, norte, siluetas).
- `marca/tools/r2_screens.py` pantallas y camino entero.
- `marca/tools/r2_boards.py` mesas de decisión (portada, logo, letra, color, preguntas).
- `marca/tools/gen_r2.py` genera `marca/project-r2/` (mesas `.dc.html`, `canvas.json`, `img/`) y las vistas
  previas con captura en `marca/preview-r2/`. Alturas medidas guardadas en `marca/tools/alturas-r2.json`.
- `marca/tools/measure.js` ahora acepta rutas por variables de entorno (`MIRADA_PLAYWRIGHT`, `MIRADA_CHROME`)
  y corre siempre sin ventana y sin sonido; `gen.py` (ronda 1) usa `MIRADA_MARCA` o su propia carpeta.

Regenerar (Windows, desde la raíz del repositorio):

```
set MIRADA_PLAYWRIGHT=<carpeta node_modules\playwright>
set MIRADA_CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
python marca\tools\gen_r2.py
```

Las fuentes del lienzo vienen de Google Fonts; en la app se servirán en local.

## Ciudades de época (añadido tras la respuesta de María)

María pidió, en vez del edificio tenue, una **ciudad de época continua y rica** por la que te desplazas. Hecho en
vectorial, un SVG por movimiento en `app/img/escenas/<id>.svg` (los nueve del catálogo), generados por
`marca/tools/escenas.py` (`python marca/tools/escenas.py`). Página nueva «Ciudades» en el lienzo
(https://claude.ai/artifact/3cjPwnjMsCBboSL6mGP15w#page-p1): los nueve apilados con su nombre y el camino del
Renacimiento con el nuevo fondo (`marca/project-r2/Ciudades-*.dc.html`).

Guía de estilo (una sola mano para los nueve):

- `viewBox 0 0 390 H`, `preserveAspectRatio="xMidYMin slice"`; alto según etapas (640 a 1120 px).
- Tres tonos planos sobre el lino, sin trazos oscuros: `#EFE8DD` fondo lejano, `#E6DDCF` edificios cercanos,
  `#DCD2C2` detalles (tejados, cornisas, bordillo). Ventanas = recortes en lino con `<pattern>` sobre una rejilla
  común. Tinta sobre el tono más oscuro: 10,8:1; tinta2 (`#5E574F`): 4,8:1. El coral como texto (`#A84A35`) no llega
  a 4,5:1 sobre los dos tonos más oscuros: no poner texto coral directamente sobre el escenario.
- Cada escenario es una pila de franjas (cielo, silueta lejana, edificios, suelo). La banda de suelo mide 48 px
  (bordillo 3 px, cuerpo, borde 3 px) y queda partida por la mitad entre franjas: los últimos 24 px de un SVG y
  los primeros 24 del siguiente son la misma banda, así que apilados en el orden del camino no hay costura
  (comprobado píxel a píxel).
- Nada de texto, personas, `<image>` ni filtros; 9 a 17 KB por archivo.

## Mapa de mundo tipo Super Mario (página «Mapa» del lienzo)

María quiere, en vez de fachadas de fondo, un **mapa de mundo**: el camino serpentea por un paisaje en falsa 3D y entre
parada y parada hay casitas, árboles, una iglesia, un puente, monumentos de la época, todo pequeño y a escala del camino.
Diseñado en el lienzo (https://claude.ai/artifact/3cjPwnjMsCBboSL6mGP15w#page-p2), sin tocar la app.

Generador: `marca/tools/mapa.py` (reutiliza `r2_theme`, `r2_parts`, `r2_screens`; piezas propias en falsa 3D). Mesas en
`marca/project-r2/Mapa-*.dc.html`, capturas en `marca/preview-r2/Mapa-*.png`, alturas en `marca/tools/alturas-mapa.json`.
Regenerar: `python marca/tools/mapa.py [carpeta_previews]` con `MIRADA_PLAYWRIGHT` y `MIRADA_CHROME` como en `gen_r2.py`.
El `canvas.json` de `marca/project-r2/` es ahora copia del publicado (tres páginas: Ronda 2, Ciudades, Mapa).

Mesas:

1. **Mapa · Renacimiento** (390×844): cabecera, cartela de época, cinco paradas en zigzag con cofre, barra inferior.
   Cúpula de Florencia, campanile, el Arno con puente y barcas, loggia, fuente, casitas de teja, cipreses.
2. **Mapa · Barroco**: plaza con soportales y chapiteles de pizarra, iglesia de torres gemelas, Giralda, naranjos,
   palmeras, obelisco, cúpula con columnas.
3. **Mapa · Bifurcación**: fin del Renacimiento → repaso (oro) → desvío a la rama **Gótico** (ciudad amurallada y
   catedral; cartel de madera «Gótico · opcional») que **encadena** con Medieval (segundo cartel); el camino común sigue
   por la derecha hasta Manierismo y Norte. Nota: ninguna rama bloquea el camino.
4. **Mapa entero · de arriba abajo** y **de abajo arriba** (390×7650): nueve épocas con repaso y cofre, tres ramas
   (Gótico→Medieval, Barroco a fondo, Maestros españoles), «Tu museo» al final, el terreno teñido por época. Un marco
   coral marca lo que se ve al abrir la app y «Estás aquí: Durero» al jugador.
5. **Mapa · cuatro preguntas**: sentido, intensidad del paisaje, estilo de las piezas, dónde van los cofres.

Guía de estilo del mapa:

- **Perspectiva:** falsa 3D suave (proyección caballera): la profundidad va hacia arriba y a la derecha, vector
  (0,5, −0,3) por unidad; se ven la cara frontal (#E6DDCF), la lateral derecha (#DCD2C2) y el techo (#F3EEE5).
  Sombra elíptica `rgba(35,32,28,.08)` bajo cada pieza; las piezas se pintan de atrás adelante ordenadas por su base.
- **Escala:** piezas de 20 a 90 px, nunca más altas que un nodo (68 px; 76 el actual). Tres o cuatro por parada,
  en el margen opuesto al nodo (ancho) y una o dos en el margen del nodo (estrecho). Las etiquetas van en píldoras
  blancas, así todo el texto está a ≥ 4,5:1 (tinta 15:1, tinta2 7:1).
- **Paleta:** piedra en los tres tonos de las ciudades, tejas #DABFA9/#CBA98F, pizarra #D3CFCD/#C2BDBB, copas
  #CBD4B5/#B7C39F, agua #D8E3E5, sin trazos oscuros. Terreno de cada época: una mancha de borde ondulado (sage,
  arena, menta, gris azulado, ocre, lila, trigo, lavanda) al 90 %.
- **Camino:** sendero de 24 px #F1E7D4 con borde #D9CDB5 (30 px) y pisadas lino discontinuas; curvas con tangentes
  verticales en cada nodo; las ramas son el mismo sendero más estrecho (20 px) que sale del repaso hacia la
  izquierda, con cartel de madera (#DABFA9 sobre poste) y, si encadena, otro cartel al final.
- **Nodos:** redondos con anillo blanco de 3 px siempre; actual: coral 4 px + halo suave y botón «Empezar» junto
  al nombre; hechos: anillo del sello (bronce/plata/oro) con tic; cerrados: hueco con candado; repaso: arco coral
  (medalla de oro cuando se supera); cofre: cuadrado dorado girado 7°, sobre el camino.

Recomendación de sentido: **de abajo arriba**. El empuje del juego es subir; el final («Tu museo») queda arriba, junto a
la cabecera, y el horizonte con colinas lejanas cobra sentido como meta. El código soporta los dos sentidos con el mismo
generador (`Mapa('abajo'|'arriba')`), así que cambiarlo en la app no cuesta.
