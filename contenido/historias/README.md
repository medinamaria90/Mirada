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

- `level`: 1 es el nivel básico (quién es el pintor: de dónde viene, qué aportó, una obra clave, «Fíjate en…»). Del 2 en adelante, un «a fondo» por etapa: el número es el `nivel` de la etapa en `catalogo/pintores.json` → `stages`. Cuentan dónde vivía, qué le pasaba y qué cambia en su pintura.
- `stage` (niveles 2 en adelante): el **título corto** del nivel, hasta 12 letras («Sevilla», «La corte»). Es su único origen: `tools/catalog_from_pipeline.py` lo copia a la etapa del catálogo (`short`) y la app lo usa en el aro del mapa, la tarjeta del nodo, la ficha, la cabecera de la historia y la ronda. El nivel 1 se llama siempre «Quién fue». Sin historia no hay tramo en el aro (lo comprueba `tools/validate_catalog.py`).
- `cards`: de 1 a 5. Lo normal son 3; una cuarta o quinta solo si hace falta para que se entienda (por ejemplo, por qué importa el pintor o el contexto que falta), nunca para rellenar. `text` tiene como máximo 180 caracteres.
- `artwork`: id (`w<QID>`) de `catalogo/obras.json`. Debe ser del pintor y del mismo nivel que la historia, o del básico (nivel 1) cuando es una obra clave que ilustra bien la tarjeta. En el nivel básico, solo obras del nivel 1.
- `focus` (opcional): `[x, y, zoom]`; centro del detalle en proporciones de 0 a 1 y zoom de 1 a 3. **Provisional**: se han puesto a ojo según la composición conocida del cuadro y falta una revisión visual en la app. Si falta, se muestra la obra entera.
- `source`: URL que respalda lo que dice la tarjeta.

## Regla de las fuentes

Datos de arte con fuente, nada de memoria. Cada tarjeta lleva la URL de lo que la respalda: la web del museo de referencia, Wikipedia en español (que cita bibliografía, con ancla a la sección concreta) o una enciclopedia. Si un dato no se encuentra con fuente, no se escribe. Los textos de las tarjetas son resúmenes propios, no copias, y las leyendas se marcan como tales («según Palomino», «una leyenda»).

La mayoría de los textos de la primera tanda se redactan a partir del artículo de Wikipedia en español del pintor, leído sección por sección; las anclas apuntan a la sección. Pendiente: contrastarlos con la web del museo de referencia (Prado, Louvre, National Gallery…) antes de publicar.

## Tono

«Museo vivo»: cálido, culto, sin gritar, frases cortas, lenguaje humano, nada de jerga. Nunca «ayer» ni «mañana».

## Estado

- Grandes maestros (14): nivel básico y todas las etapas.
- Maestros: solo el nivel básico, y por ahora 12 (Miguel Ángel, Vermeer, Botticelli, Durero, El Bosco, Ribera, Manet, Degas, Cézanne, Renoir, Gauguin, Turner). Faltan el resto.
- Los archivos de maestros no tienen niveles de etapa: aún no se han escrito.
