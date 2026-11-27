# Plan · composición del camino (arco, tramos, sendero)

Planificador, 27/11 (v2, con los añadidos de María). Base: `path-layout.js`, `path-signs.js`, `path-map.js`,
`path-actions.js`, `mapa-carteles.css`, `main.css`, capturas a 360 px (Renacimiento, claro). Unidades: diseño de 390
de ancho (1 u ≈ 0,92 px a 360, 1,06 px a 412).

## 1. Diagnóstico

- **Orden de lectura roto.** La tablilla de tramo cuelga *bajo* su primer pintor (`TRAMO_BOX` 58–106 bajo el nodo),
  pegada a él: se lee como «etiqueta de Botticelli», no como «aquí empieza el Primer Renacimiento».
- **Espaciado fijo por pintor.** Las paradas van cada `STEP`=172 pase lo que pase; tablilla de tramo, cartel de rama
  (`BRANCH_BELOW` 118) y puente se encajan en el hueco que haya. Entre Leonardo y Berruguete coinciden «Alto
  Renacimiento» y «Más del Renacimiento»: amontonados.
- **Arco = banda flotante** sobre los pilares (lift 52 + alto 82): tapa 52 u de sendero tras la puerta. «s. XV–XVI ·
  2/9» mezcla dato y progreso.
- **Completado = icono suelto** (`.sign-check`, círculo dorado con ✓); la tablilla no cambia.
- **Sendero de autopista**: trazos perfectos 26/20 y `trail-thread` (hilo dorado central) en lo recorrido. Arranque
  en la plaza con `stroke-linecap: round`: acaba en punta redondeada.
- **Avisos de candado apilados**: `showLockNote` crea una nota por botón (`.lock-note`, 4,5 s); varios toques = varias
  notas a la vez tapando el mapa. «falta 1» en las ramas cerradas no dice falta 1 *qué*.

## 2. Época y tramo: ¿paradas propias? (para el informe a María)

**Cómo lo resuelven otros**
- **Duolingo**: en el camino *solo hay cosas jugables* (lecciones, cofres, repasos). La unidad se marca con una
  **cabecera** que corta el camino (banda de color con nombre y guía) y se queda fija arriba al hacer scroll; las
  secciones son pantallas aparte. Separador ≠ parada.
- **Candy Crush**: los episodios cambian de **paisaje** y empiezan con una escena/puerta con nombre; el mundo
  se reconoce por el decorado, no por un cartel. Los niveles siguen el mismo ritmo.
- **Two Dots / Royal Match**: expediciones/zonas con paisaje propio y un **hito decorativo** (monumento, edificio
  que restauras) al terminar; no es pulsable para jugar, celebra.
- **Monument Valley**: capítulos en un menú aparte; no hay camino continuo (no aplica, salvo la idea de que cada
  capítulo tenga su luz y su arquitectura).

**Opciones**
1. **Paradas propias en el sendero** (mojón sobre el camino como un nodo). *Pro*: orden inequívoco, espacio
   garantizado. *Contra*: rompe la regla que todos los juegos respetan: lo que está *en* el camino se juega; el
   usuario tocará el mojón esperando una ronda, y añade «paradas» que no avanzan el progreso.
2. **Hito al borde con hueco propio en el trazado** (recomendada): la época es la **puerta con lápida** (el camino
   pasa por debajo); el tramo es un **mojón al borde del sendero** (estela de piedra + tablilla), en un hueco
   reservado *antes* de sus pintores, sin nada más a esa altura. *Pro*: orden lógico al subir, nunca amontonado, el
   camino solo tiene paradas jugables, encaja con la señalética actual (tablillas, puertas). *Contra*: algo más de
   alto por tramo (~70 u) y hay que regenerar los paisajes.
3. **Cabecera fija tipo Duolingo** (banda «Renacimiento · Primer Renacimiento» pegada arriba al hacer scroll) y en el
   mapa solo una raya/cambio de suelo. *Pro*: orientación constante. *Contra*: otra barra encima del mapa (ya están la
   barra superior y la inferior), compite con los cuadros en 360 px y quita el encanto de «llegar» a un sitio.

**Elección: opción 2.** Da el orden que pide María (arco → tramo → pintores) sin convertir en parada lo que no se
juega, y lo integra en la escena con piezas del mismo mundo (puerta de piedra, mojón y tablilla de madera). La
sensación de «nuevo mundo» de Candy Crush llega en la fase 2 con el paisaje (sección 9).

## 3. Espaciado por elementos (regla general)

El hueco entre dos pintores seguidos ya no es fijo: **se suma lo que hay dentro**. Hueco (centro a centro):

```
hueco = max(STEP, LIBRE_NODO + Σ alto(elemento) + LIBRE_NODO)
```

| Elemento en el hueco | Alto reservado (u) | Notas |
|---|---|---|
| `LIBRE_NODO` (por cada pintor que lo cierra) | 56 | medio nodo 36 + aire 20 |
| Mojón de tramo (estela + tablilla) | 76 | 56 de pieza + 20 de aire |
| Cartel de rama (desvío) | 86 | 66 con postes + 20 |
| Puente (recta + aire) | 110 | 2 × `BRIDGE_HALF` 35 + 2 × 20 |
| Puerta con lápida (al inicio de la época) | 44 + 118 | puerta `GATE_Y` + lápida; luego aire 36 |

Ejemplos: pintor–pintor solo = max(172, 112) = **172** (igual que hoy). Leonardo + «Alto Renacimiento» + «Más del
Renacimiento» + Berruguete = 56 + 76 + 86 + 56 = **274**. Puente solo = 222 → 222.
**Orden al apilar (de abajo arriba):** puente → rama → tramo (el mojón siempre pegado *antes* de su primer pintor).
Puente y mojón no comparten hueco (`bridgeSlots` veta ese hueco). Todos los elementos se apilan, nunca lado a lado
(robusto a 360 px). Constantes en `path-layout.js`: `LIBRE_NODO`, `ALTO = { tramo, rama, puente }`, `LAPIDA`;
`eraLayout` acumula `y` hueco a hueco; se borran `TRAMO_BOX`, `BRANCH_BELOW` y el empuje bajo el arco.
**Pruebas nuevas** (`tests/camino-forma.test.js`): ninguna caja de pieza (nodo + nombre, mojón, cartel, lápida,
puente) se solapa con otra con aire < 20 u; cada mojón queda por debajo de su primer pintor y por encima del
pintor anterior; en todas las épocas y ramas.

## 4. Arco de época (lápida en el dintel)

- `eraGate` gana el **dintel**: losa de piedra que une los pilares (alto 84, ancho `min(268, 2·(x−EDGE))`), con
  `land-front`; el rótulo HTML va **dentro** de la losa. El sendero pasa bajo el vano (52 u libres): se ve entrar y
  salir; nada flota encima del camino.
- Dos niveles: **nombre** (600, 1,1 fs, máx. 2 líneas, `text-wrap: balance`) y **siglos** (500, 0,76 fs). Progreso
  **fuera del texto**: ranura grabada bajo los siglos (3 u de alto, 60 % del ancho, fondo `--map-sign-line`, relleno
  `--accent`), `aria-label` «2 de 9 pintores». Nada de «8/9».
- A 360: «Manierismo y Renacimiento del Norte» y «Simbolismo y las vanguardias» en 2 líneas dentro de 268 u; si no
  caben, `--map-fs` local −8 % (nunca corte ni elipsis).
- Estados: abierta (piedra clara, filete del color de la época); **completa**: la losa se dora (`--map-sign-done`,
  filete `--gold`, letras `--gold-text`) y la ranura pasa a laurel grabado a lo ancho; cerrada: piedra apagada y
  candado a la izquierda de los siglos. Misma pieza en la muralla (`START_ARCH`) y en `branchEntrySign`.

## 5. Mojón de tramo y su estado completado

- Estela 30×42 u con remate redondo, **al borde del sendero** (pie a `ROAD_HALF + 8` del eje), del lado con más sitio
  (`besideRoad`); tablilla de madera (nombre del tramo, 1–2 líneas) a su lado, hacia fuera. Un solo `<button>` (estela
  + tablilla) ≥ 48×48 px; abre el cartel del tramo. `<li class="tramo-spot">` antes de su primer pintor en el `<ol>`.
- Estados: **abierto** (piedra clara, filete del acento en la estela); **cerrado** (estela y tablilla apagadas, nombre
  en `--map-sign-ink-2`, sin candado); **completado**: inscripción dorada en la estela (`--map-sign-done`, filete
  `--gold`) y **cinta dorada** en el canto inferior de la tablilla (`inset 0 -3px 0 var(--gold)`), nombre en
  `--gold-text`. Se borra `.sign-check` en tramo y arco.

## 6. Sendero

- **Fuera** `trail-thread` y `--map-trail-thread`.
- Capas: `trail-shade` (28) → `trail-rough` **nuevo** (30, `--map-trail-edge`, opacidad .55, `stroke-dasharray:
  13 7 5 11`: borde festoneado irregular) → `trail-edge` (25) → `trail-fill` (20) → `trail-grain` **nuevo** (18,
  `stroke: url(#map-grain)`, patrón de motas 9×9 definido una vez en un `<svg><defs>` oculto; motas
  `--map-trail-grain` al 35 %). Sin `feTurbulence` (caro en móvil). Grosores en variables.
- **Recorrido**: firme `--map-trail-done` (tierra pisada, más cálida y algo más oscura), borde `--map-trail-done-edge`,
  mismo grano. Contraste entre firmes ≥ 1,3:1, sin brillo. Variantes claro/oscuro (`brand.css`) y noche (`mapa-vivo.css`).
- **Arranque**: la plaza (`START_PLAZA`) se dibuja dentro de `trailSvg` como elipse empedrada rx 64 ry 24 con las
  mismas clases; orden borde del sendero → plaza → firme: el camino **nace de la plaza**, sin punta. Primer segmento
  `stroke-linecap: butt`; en «Tu museo», termina bajo el escalón de la puerta.

## 7. Candados: un solo aviso, pequeño (como Duolingo)

Duolingo: al tocar una lección cerrada sale **un** globo pequeño junto a ella («Completa lo anterior para abrir»), que
se va al tocar fuera; no hay cola de avisos. Propuesta:
- Al tocar un candado: **tiembla** (±3 px, 3 vaivenes, 280 ms, como un cofre cerrado) + `navigator.vibrate(12)` si
  existe. Con movimiento reducido: sin temblor ni vibración, solo el globo.
- **Un único globo** para todo el mapa (un nodo `.lock-note` reutilizado, no uno por botón): globo de 1–2 líneas con
  pico hacia la parada y botón de cierre (×, zona 48 px). El nuevo **sustituye** al anterior. Se cierra al tocar
  fuera, al hacer scroll (> 24 px), con Esc o al cambiar de pantalla. Sin temporizador (no desaparece mientras se lee).
  `role="status"` para lectores de pantalla; el foco no salta.
- Texto: «Se abre al acertar la mitad con Friedrich» (más corto y humano que «Se abre con la mitad de aciertos en…»);
  mismo texto en `path-map.js` (l. 180 y 198) y `branch.js:38`.
- **Ramas cerradas**: «🔒 falta 1» → segunda línea «tras Berruguete» (1 pendiente) o «tras 2 pintores» (más); el globo
  completa: «Se abre al dominar a Botticelli y Berruguete». Mismo globo único.

## 8. Riesgos

- **Paisajes pregenerados**: `mapa_svg.py` / `mapa_ramas.py` leen `tools/mapa-layout.mjs`; cambian alturas, nodos,
  puentes y cajas. Exportar las cajas nuevas (lápida, mojón, carteles apilados) como zonas sin dibujo y **regenerar
  los 23 SVG de `app/img/mapa/`**; pasar la prueba de «agua sin puente».
- **Memoria de scroll**: `map-memory.js` ancla por época + fracción de alto: aguanta. El mojón **no** es
  `.stage-spot` ni lleva `data-step` (si no, se rompen `placeMap`, «Tu parada» y `keys.next`).
- **Modo en línea** (`.is-linear`): lápida y mojón pasan a placas en el flujo; revisar.
- **e2e**: selectores `.arch-band`, `.is-tramo .sign-plate`, `.sign-check`, `.lock-note`; añadir auditoría táctil del
  mojón y prueba de «un solo globo».
- El mapa crece ~10 u por época y ~100 u donde se juntan tramo y rama: asumible.

## 9. Fase 2 · el paisaje cuenta el viaje (segunda entrega)

Idea: al subir se nota que se avanza porque el suelo y el horizonte cambian, época a época, con fundidos suaves
(los últimos ~120 u de una época mezclan su suelo con el de la siguiente: `--era-prev` → `--era-tint` ya existe, se
alarga el degradado y se mezclan 2–3 piezas de cada lado).

| Época | Lugar | Suelo (`--map-tint-*`) | Piezas (`mapa_svg.py`) |
|---|---|---|---|
| Renacimiento | Toscana | verde oliva suave | cipreses, colinas redondas, villa, olivos |
| Manierismo y Norte | Flandes | verde húmedo, más frío | canales, molinos, diques, sauces |
| Barroco | Castilla / Roma | campo seco ocre | encinas, olivar en filas, sierra al fondo, cúpula |
| Rococó y Neoclasicismo | jardín francés | verde claro ordenado | parterres, setos recortados, templete |
| Romanticismo | montaña | gris verdoso, roca | picos, pinos, niebla en capas, ruina |
| Realismo | campo de trabajo | trigo, tierra | gavillas, surcos, granja |
| Impresionismo | París y el Sena | malva claro | sauces, río, barquitas, puente de hierro |
| Postimpresionismo | Provenza | amarillo cálido | campos de girasol, cipreses en llama, mas |
| Simbolismo y modernismo | ciudad 1900 | lila grisáceo | farolas, cúpulas modernistas, jardín nocturno |

- Cada época: tres variables de suelo (`--map-tint-<id>`, `--map-ground-<id>-2`, `--map-ground-<id>-3`) y una de
  horizonte; piezas con las clases `land-*` ya existentes. Todo en `brand.css`, nada escrito a mano en el SVG.
- **Cuatro luces**: las variables se definen para claro y oscuro; día/noche las tiñe el filtro de `mapa-vivo.css`
  / `daylight` (lo está ajustando otro agente): no duplicar tonos por hora, solo comprobar contraste del
  sendero y los rótulos en las cuatro combinaciones.
- Ramas «Descubre…»: el paisaje de su época; temáticas (Gótico, Estampa, Rusia, Británica, Españoles), el suyo.

## 10. Cambios priorizados

1. **Trazado** (`path-layout.js`): huecos por elementos (sección 3), mojón al borde con hueco propio, vetos de
   puentes, cajas nuevas en `mapa-layout.mjs`; pruebas de solapes y de orden. *(lo más importante)*
2. **Mojón de tramo** (`path-signs.js`, `path-map.js`, `mapa-carteles.css`) con sus tres estados; fuera la tablilla
   bajo el nodo y `.sign-check`.
3. **Lápida de época** (`path-art.js`, `eraArch`, `branchEntrySign`): rótulo en la losa, ranura de progreso, dorado.
4. **Sendero**: sin hilo, borde festoneado, grano, recorrido en tierra pisada, plaza que hace nacer el camino.
5. **Candados**: globo único, temblor + vibración, textos nuevos; ramas «tras Berruguete».
6. **Regenerar paisajes** y revisar 360/412, claro/oscuro, día/noche: Renacimiento, Barroco, Impresionismo,
   `#rama/escuela-rusa`, Gótico. `node --test tests/` + e2e completo → evaluador independiente.
7. **Fase 2**: paisaje por épocas (sección 9), en entrega aparte.
