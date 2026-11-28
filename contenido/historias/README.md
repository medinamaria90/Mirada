# Historias de inicio de nivel

Una historia por nivel de pintor, al estilo de las de Instagram (decisión 21 de `docs/TRASPASO.md`): de 1 a 5 tarjetas (lo normal, 3), cada una con el detalle grande de un cuadro y 2-3 líneas de texto. Sin examen.

## Formato

Un archivo por pintor, `contenido/historias/<pintorId>.json` (el id es el de `catalogo/pintores.json`):

```json
{ "artistId": "goya", "levels": [
  { "level": 1, "title": "Quién fue Goya", "cards": [
    { "text": "2-3 líneas", "artwork": "w2537138", "focus": [0.5, 0.45, 1.5], "source": "https://es.wikipedia.org/wiki/Francisco_de_Goya" } ] },
  { "level": 2, "stage": "Tapices", "title": "…", "cards": [ … ] } ] }
```

- `level`: 1 es el nivel básico (quién es el pintor: de dónde viene, qué aportó, una obra clave, «Fíjate en…»). Del 2 en adelante, un «a fondo» por etapa: el número es el `nivel` de la etapa en `catalogo/pintores.json` → `stages`. Cuentan dónde vivía, qué le pasaba y qué cambia en su pintura. Todo pintor con niveles «a fondo» lleva historia en cada uno, y es nueva: otra etapa, otra faceta, una obra clave, una anécdota o ampliar algo que el nivel 1 solo apuntó, nunca repetirlo (decisión de María, 28/11; `tests/historias-ampliacion.test.js`). Cada una trae su propio «Fíjate en…»: si no, la app cierra con la pista del nivel 1.
- `stage` (niveles 2 en adelante): el **título corto** del nivel, hasta 12 letras («Sevilla», «La corte»). Es su único origen: `tools/catalog_from_pipeline.py` lo copia a la etapa del catálogo (`short`) y la app lo usa en el aro del mapa, la tarjeta del nodo, la ficha, la cabecera de la historia y la ronda. El nivel 1 se llama siempre «Quién fue». Sin historia no hay tramo en el aro (lo comprueba `tools/validate_catalog.py`).
- `cards`: de 1 a 5. Lo normal son 3 o 4; una cuarta o quinta cuando aporta: una anécdota buena que no cabe con otra idea (una idea por tarjeta), por qué importa el pintor o el contexto que falta; nunca para rellenar. `text` tiene como máximo 180 caracteres.
- `artwork`: id (`w<QID>`) de `catalogo/obras.json`. Debe ser del pintor y del mismo nivel que la historia, o del básico (nivel 1) cuando es una obra clave que ilustra bien la tarjeta. En el nivel básico, solo obras del nivel 1. Dentro de una historia no se repite obra (un detalle distinto de la misma, con otro `focus`, sí vale) mientras el pintor tenga otra libre de ese nivel (en el básico, «learn»); lo comprueba `tools/sync_historias.py`.
- `focus` (opcional): `[x, y, zoom]`; detalle de la tarjeta (centro de 0 a 1, zoom de 1 a 3). Solo se usa si el recorte no pierde más de lo que permite `engine/framing.js` (`LOSS_FOCUSED`); si no, la obra se ve entera. Sin él, manda el foco revisado de la obra (`contenido/focos.json`): a sangre si el recorte es pequeño o la obra tiene foco; si no, entera sobre un fondo desenfocado de ella misma.
- `region` (opcional): `[x0, y0, x1, y1]`; detalle intencionado, el rectángulo de la obra que enseña la tarjeta (de 0 a 1), por ejemplo cada panel de un tríptico (El Bosco). Se ve siempre a sangre, como si fuera la obra, y manda sobre la portada propia de la primera tarjeta; con `focus`, su punto es relativo a la región. Su proporción no puede perder más que `LOSS_FOCUSED` (lo vigilan `tools/sync_historias.py` y su prueba). Dos regiones distintas de la misma obra cuentan como imágenes distintas. Un detalle (`region` o `focus` con zoom ≥ 1,5) usa la imagen HD de la obra (paso «hd» del proceso); si se vería con menos de 1,5 píxeles de imagen por píxel CSS, `tools/sync_historias.py` avisa.
- `source`: URL que respalda lo que dice la tarjeta.

## Regla de las fuentes

Datos de arte con fuente, nada de memoria. Cada tarjeta lleva la URL de lo que la respalda: la web del museo de referencia, Wikipedia en español (que cita bibliografía, con ancla a la sección concreta) o una enciclopedia. Si un dato no se encuentra con fuente, no se escribe. Los textos de las tarjetas son resúmenes propios, no copias, y las leyendas se marcan como tales («según Palomino», «una leyenda»).

La mayoría de los textos de la primera tanda se redactan a partir del artículo de Wikipedia en español del pintor, leído sección por sección; las anclas apuntan a la sección. Pendiente: contrastarlos con la web del museo de referencia (Prado, Louvre, National Gallery…) antes de publicar.

## Tono

«Museo vivo»: cálido, culto, sin gritar, frases cortas, lenguaje humano. Los términos del oficio se enseñan con su explicación al lado («una Maestà (una Virgen en su trono)»); quien se cita, presentado en dos palabras («el poeta Dante»); y un pintor que aún no ha salido en el camino, presentado en la frase. Nunca «ayer» ni «mañana».

## Estado

- Grandes maestros (14): nivel básico y todas las etapas.
- Niveles «a fondo»: se escriben por tandas (28/11); los que faltan están en `PENDING` de `tests/historias-ampliacion.test.js`.
