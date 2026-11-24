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
