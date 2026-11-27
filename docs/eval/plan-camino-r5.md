# Plan r5 · la época como lugar, un solo objeto por tramo, «¿Lo recuerdas?»

Planificador, 27/11. Base: main tras r4 (`path-layout.js`, `path-art.js`, `path-signs.js`, `path-map.js`), capturas a
360 px (salida, Renacimiento, Barroco, `#rama-escuela-rusa`). Unidades del trazado: ancho 390 (1 u ≈ 0,92 px a 360).
Bocetos: `plan-camino-r5/boceto-1.svg` (recomendado), `boceto-2.svg`, `boceto-3.svg`.

## 0. Qué falla hoy (visto en las capturas)

- **Lápida**: caja blanca de ~150×80 u, a la izquierda de dos pilares sueltos; el arco no existe y la lápida no toca
  el camino. Se lee como cartel pegado encima del paisaje, no como sitio.
- **Tramo**: mojón «I» + tablilla «Nace el Renacimiento» dicen lo mismo, y la tablilla se confunde con los postes de
  rama («Gótico 0/5»): misma madera, mismos postes.
- **«¿Lo recuerdas?»**: con una semana sin jugar, *todos* los dominados lo llevan (Masaccio, Botticelli…): el mapa
  se llena de preguntas idénticas.

## 1. Bocetos de «la época como lugar»

Común a los tres: un solo `<button data-action="intro">` cubre el lugar (abre `movimiento-<id>`); cerrada,
`era-lock` como hoy. No es `.stage-spot` ni lleva `data-step` (no rompe `placeMap`, «Tu parada», `keys.next` ni la
memoria de scroll, que ancla por época + fracción). El nombre es texto HTML (legible y traducible por lector), sobre
piedra del mismo tono que el edificio, nunca sobre una placa blanca. Señal de pulsable: el «›» tras los siglos (el
mismo de los postes de rama) y, mientras la presentación no se haya visto (`intros[id]` vacío), un brillo suave
una vez al entrar en pantalla (sin movimiento reducido: un punto dorado de 6 u en la esquina del rótulo).

### Boceto 1 · Plaza con logia (recomendado)

- **Qué se ve**: al cruzar el seto de la época, el sendero se abre en una **plaza empedrada** (elipse rx 150 ry 40,
  la misma pieza que la plaza de salida) y sale por el **arco central de una logia** (arcada a lo ancho, 320×64 u,
  arco central 44 u de luz sobre el sendero de 26). Encima de la arcada, el **friso** (54 u) con frontón bajo.
  Detalle de lugar: fuente o ciprés a un lado. Variante por época solo en el remate (frontón clásico, cúpula
  barroca, frontón roto rococó, hierro y cristal en el XIX): 4 remates, no 10 dibujos.
- **Sendero**: pasa de verdad: entra por abajo, cruza la plaza y atraviesa el arco (los pilares y el friso van
  delante del sendero; el fondo del vano, detrás). La recta de entrada (`ENTRY.run`) crece de 64 a ~170 u.
- **Nombre**: grabado en el friso, 600, 1,1 fs; siglos debajo, 0,76 fs. Ancho útil 300 u (≈ 276 px a 360):
  «Manierismo y Renacimiento del Norte» cabe en 2 líneas sin bajar la letra.
- **Progreso**: la ranura de hoy pasa a ser la **moldura baja del friso** (3 u, 50 % de ancho, relleno de acento).
  Completa: el friso y el frontón se doran (`--map-sign-done`, letras `--gold-text`) y la ranura queda llena de oro.
  Cerrada: piedra apagada, **reja** dibujada en el arco central y candado ante los siglos.
- **Primera época (muralla)**: la plaza de salida *es* la plaza del Renacimiento: la logia sustituye a la lápida, al
  fondo de la plaza, y la puerta de la muralla queda detrás como salida de la ciudad (o se quita la muralla y la
  logia hace de puerta: más limpio; lo decido con la captura). Caseta «Cómo se juega» y fuente se quedan.
- **Ramas**: misma logia a la entrada, con el nombre de la rama (`branchEntrySign`), remate según la rama
  (cúpula de cebolla en Escuela rusa, aguja en Gótico, tejadillo en Estampa japonesa). «Volver al camino» sigue
  en su poste, al lado de la plaza.
- **Medidas**: plaza 300×80 + logia y friso 118 + aire 20 ≈ **170 u** (hoy puerta + lápida ≈ 140): +30 u por época.
- **Coste / riesgo**: *medio*. `path-layout.js`: `ENTRY.run` y `ARCH` → `PLAZA = { rx, ry, loggiaH, friezeH }`;
  `archAt` devuelve la caja de la logia centrada en el sendero (arcada asimétrica si el sendero va a 248–262: más
  arcos del lado con sitio, nunca fuera del mapa). `path-art.js`: `eraLoggia(x, y, span, remate)` sustituye a
  `eraGate`; la plaza ya la pinta `trailSvg(…, plaza)`. `path-signs.js`: `eraArch` pierde la caja (`archBox`) y
  se coloca sobre el friso. `tools/mapa-layout.mjs` exporta la caja de plaza + logia como zona sin dibujo y se
  regeneran los 23 SVG (`mapa_svg.py`, prueba de «agua sin puente»). «Tú» no cambia (apunta a la parada). Rendimiento:
  ~30 formas SVG por época, sin filtros; despreciable.
- **Pros**: es un sitio al que se llega y por el que se pasa; une puerta y rótulo en una pieza; reutiliza la plaza;
  friso ancho = nombres largos sin apuros. **Contras**: +30 u por época; hay que dibujar 4 remates y la reja.

### Boceto 2 · Glorieta con templete

- **Qué se ve**: el sendero se abre en **anillo** alrededor de un templete redondo (columnas y cúpula, tipo
  Bramante), 256×208 u; placa en el zócalo de cara al que llega (152 u) con nombre, siglos, «›» y ranura.
- **Progreso / completado**: ranura en la placa; completa, cúpula dorada. Cerrada, placa apagada y candado.
- **Primera época / ramas**: glorieta al salir de la plaza de salida; en ramas, el templete con su remate.
- **Medidas**: ≈ 230 u (+90 por época). **Coste / riesgo**: *alto*. El sendero se bifurca: `spline`, `walkedD`
  («qué ramal está andado»), desvíos y puentes suponen un camino único; la placa estrecha obliga a 3 líneas en
  nombres largos o a bajar la letra (lo que María no quiere).
- **Pros**: el centro de atención más claro y más «juego». **Contras**: rompe el sendero único y es caro.

### Boceto 3 · Calle de pueblo con pendón

- **Qué se ve**: el sendero se empiedra y pasa entre 4–6 **casas** a los dos lados; un **pendón** colgado de casa a
  casa sobre la calle lleva nombre y siglos; bajo él, una ristra de **banderines**, uno por pintor (dominado: de
  color; pendiente: crudo). Completa: pendón dorado.
- **Primera época / ramas**: la salida ya es un pueblo; en ramas, casas de su tema.
- **Medidas**: ≈ 260 u (+120). **Coste / riesgo**: *alto*: casas propias por época (si son iguales, no hay «lugar»),
  y con 12–15 pintores los banderines se vuelven un contador ruidoso. Se apelotona con el paisaje pregenerado.
- **Pros**: muy cálido, progreso visible de un vistazo. **Contras**: más dibujo, más alto, más ruido.

### Recomendación: boceto 1

Es el único que hace pasar el camino *a través* del lugar sin bifurcarlo, resuelve a la vez la queja de la lápida
(el rótulo vive en la arquitectura, del color de la piedra) y la de «parada sin bolita», crece poco (+30 u) y
reutiliza piezas validadas (plaza de salida, ranura, dorado de completado, «›» de los postes). El 2 y el 3 son más
vistosos pero cuestan el doble y meten riesgo en el trazado (2) o ruido de contador (3).

## 2. Tramo: una sola pieza

**Fuera la tablilla de madera; queda una piedra con el nombre grabado** (boceto 1, «Luz en la oscuridad»): un hito
bajo y ancho al borde del sendero (hasta 150×40 u, 1–2 líneas, letra 0,82 fs en `--map-sign-ink`), con zócalo.
Sin número romano (no aporta al público general; el orden ya se lee al subir). Así cada familia tiene su material:
**piedra arquitectónica** = época, **piedra de camino** = tramo, **madera con flecha** = rama. Completo: letras en oro
y una ramita de laurel grabada en la cara (sin iconos sueltos). Abre su cartel como hoy (`data-kind="tramo"`).
Toque ≥ 48×48 px. Cambios: `tramoSign` (path-signs.js) sin `.tramo-stone` ni `data-n`; `.is-tramo` en
`mapa-carteles.css` con variables `--tramo-stone-*` (cierra también el punto 3 de r4); `GAP.tramo` 76 se queda.

## 3. «¿Lo recuerdas?»

**Se quita el texto del mapa** y se sustituye por una señal visual, **solo en los dos dormidos más antiguos** del
camino (no en todos):
- En el nodo: la insignia ✓ dorada pasa a **↻** sobre crudo (`--map-dormant`), y se mantiene el cuadro algo
  desaturado. Sin texto bajo el nombre.
- El resto de dormidos se pintan como dominados normales (no son un problema que resolver; es repaso opcional).
- El texto vive donde se lee con calma: en `aria-label` («Masaccio, dominado. Hace tiempo que no lo ves») y en la
  tarjeta del nivel al tocarlo, con «Repasar» como acción principal.
- Cambios: `path-map.js` (elige los 2 con `lastSeen` más antiguo), `path-nodes.js` (`dotFor` con insignia ↻,
  `DORMANT_TEXT` solo en la etiqueta), `main.css`; prueba nueva: con 5 dormidos, solo 2 llevan `.is-dormant`.

## 4. Orden de trabajo

1. Trazado: `PLAZA` en `path-layout.js`, caja de logia, `ENTRY.run`; pruebas de solapes y de «el sendero pasa por el
   arco central» (x del vano = x del sendero ±2 u) en todas las épocas y ramas.
2. Logia y plaza (`path-art.js`, `path-signs.js`, `mapa-carteles.css`), 4 remates + reja; salida fusionada.
3. Tramo en una pieza. 4. Dormidos (máx. 2, ↻). 5. Regenerar paisajes, `node --test tests/`, e2e, capturas a
   360/412/768 claro/oscuro/noche → evaluador independiente.
