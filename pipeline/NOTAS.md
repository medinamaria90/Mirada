# Notas del proceso de catálogo

Proceso que reúne ~1.000 cuadros en dominio público con metadatos y títulos en español.
Todo lo que necesita internet corre en GitHub Actions (`.github/workflows/pipeline.yml`),
que se lanza al hacer push de `pipeline/RUN` (una línea por paso) y hace commit de sus salidas.

## Pasos
1. `resolve` — verifica el QID de cada pintor (`pipeline/painters.json`) → `pipeline/out/painters_resolved.json`.
2. `candidates` — obras candidatas por pintor (Wikidata SPARQL + datos del archivo en Commons) → `pipeline/out/candidates/<id>.json`.
3. `seleccionar.py` (local, sin red; `PYTHONUTF8=1 python pipeline/seleccionar.py`) — elige las obras con `extra.json`, `excluir.json` y `ajustes.json` → `catalogo/seleccion.json` (con `level`).
4. `download [lotes] [tamaño]` — descarga en lotes (150 por defecto), reanudable, commit tras cada lote → `catalogo/img/<id>.jpg`.
5. `build` / `validate` — `catalogo/obras.json`, `catalogo/pintores.json`, `CREDITS.md` y comprobaciones.

## Bitácora

### 24/11 (tarde) — revisión de la selección y arreglos del proceso

**Estado al llegar.** 148 pintores con QID verificado, candidatas para todos, y una `seleccion.json` de
1.079 obras de 130 pintores: faltaban 18 (Fra Angelico, Van der Weyden, Hals, Artemisia, Canaletto y
los 13 rusos invitados) porque `select.py` se había ejecutado antes de que llegaran sus candidatas. No había
ninguna imagen descargada.

**Fallo de nombre.** `pipeline/select.py` hacía sombra al módulo `select` de la biblioteca estándar
(`urllib` → `socket` → `selectors` → `import select` cargaba nuestro archivo) y el paso fallaba al arrancar.
Renombrado a `pipeline/seleccionar.py`. En Windows hay que ejecutarlo con `PYTHONUTF8=1`.

**Por qué faltaban obras icónicas.** Al comparar la selección automática con lo que debería haber por pintor
salieron ausencias graves (Velázquez sin *Las hilanderas*, Leonardo sin *La Última Cena* ni *La dama del
armiño*, Rafael sin *La escuela de Atenas* ni *La Fornarina*, Caravaggio sin *La vocación de San Mateo*,
Munch sin *El grito*, Van Gogh sin *Los girasoles* ni autorretratos, Millais sin *Ofelia*, Bruegel sin
*La torre de Babel*, Van Eyck sin el *Políptico de Gante*, Miguel Ángel sin *La creación de Adán*…). Causas:
- la comprobación «proporción de la imagen ≠ medidas de Wikidata» descartaba obras con medidas mal
  cargadas o intercambiadas en Wikidata (*Ofelia*, *La Última Cena*, *La dama del armiño*);
- «varios autores» descartaba obras cumbre con dos creadores (*Políptico de Gante*, *Venus dormida*,
  *Mañana en un bosque de pinos*, *El rapto de las hijas de Leucipo*);
- Wikidata modela algunas obras como **series** y la fama (sitelinks) se queda en el ítem de la serie,
  mientras cada versión tiene 1-6 sitelinks (*El grito*, *Los girasoles*, *La torre de Babel*, *Los
  jugadores de cartas*, *El dormitorio en Arlés*, *Nenúfares*);
- frescos que la consulta general no devuelve como obra del pintor (*La creación de Adán*, *El Juicio
  Final*, *La escuela de Atenas*) o cuadros que no salían en la consulta (*La condesa de Vilches*);
- imágenes de Wikidata pequeñas (< 1.200 px) aunque Commons tenga otras grandes (*La Anunciación* del
  Prado de Fra Angelico, *¡Triste herencia!*, *Los acuchilladores de parqué*, *Judit I*).

**Qué cambia en el proceso.**
- `pipeline/extra.json`: pintor → {QID: motivo}. Las obras **forzadas** entran aunque tengan dos autores,
  palabras sospechosas, medidas que no casen o una imagen de 1.000-1.200 px, y `candidates.py` las consulta
  aparte por QID (sin exigir autor único ni tipo) y pide sus datos de archivo aunque no estén entre las 80
  más famosas. Si a un pintor le faltan datos de alguna forzada, `candidates` lo vuelve a consultar solo.
- `pipeline/excluir.json`: descartes a mano con motivo (versiones repetidas de Carlos II de Carreño, dos de
  los cuatro Hércules de Zurbarán, lunetos menores de la Sixtina, *Sala delle Asse*, *Noli me tangere* que
  pintó Pontormo, bodegones tempranos repetidos de Velázquez…).
- `pipeline/ajustes.json`: título, año, archivo de Commons alternativo (con `archivoInfo`) y `level` a mano.
- `seleccionar.py` compara la proporción con **todas** las medidas declaradas, suaviza la penalización
  (×0,85 si el desvío es pequeño), ignora colecciones «valor desconocido» de Wikidata (salían como URL
  `well-known/genid`) y escribe `pipeline/logs/select_drops.txt` con cada descarte de fama ≥ 8 sitelinks
  para revisar a mano.
- **Nivel** (`level` 1|2) en cada obra: las 4 más conocidas si el pintor tiene ≤ 8 obras, 5 si ≤ 12, 6 si
  más; ordenadas por sitelinks reales (no por la bonificación de forzada); `ajustes.json` puede fijar
  `level: 1` a icónicas con fama repartida entre versiones. El camino usará el nivel 1; «a fondo», el 2.
- Objetivos subidos: Velázquez y Goya 16, Sorolla 14, Leonardo, Rafael, Tiziano, Caravaggio, Rubens,
  Rembrandt, Monet y Van Gogh 12. Total previsto: 1.180 obras, 148 pintores (336 de españoles).
- Límite de fallecimiento alineado a **1956** (dominio público en Europa; antes 1946) en `validate.py`,
  `build.py` y `resolve.py`.
- `run.sh`: `download [lotes] [tamaño]` (antes solo lotes de 150), para probar con un lote pequeño.
- Este PC no debe recibir descargas masivas: la copia de trabajo del catálogo usa `git sparse-checkout`
  excluyendo `catalogo/img/` (`git sparse-checkout set --no-cone '/*' '!/catalogo/img/'`), así los
  `pull` no bajan las imágenes. Las imágenes viven en el repo (`catalogo/img/`, ~1.180 × ~300 KB) porque
  la app las necesita en Render; si pesa demasiado, alternativa: rama aparte o release con zip.

**Pendiente de datos (consulta en Actions):** faltan datos de archivo de 8 forzadas
(*La creación de Adán*, *El Juicio Final*, *La escuela de Atenas*, *La condesa de Vilches*, *La rendición
de Granada*, *Los jugadores de cartas*, *El dormitorio en Arlés* y *Los girasoles* de Londres); el RUN
`candidates miguel-angel rafael madrazo pradilla cezanne van-gogh` las trae y después se vuelve a ejecutar
`seleccionar.py` en local.
