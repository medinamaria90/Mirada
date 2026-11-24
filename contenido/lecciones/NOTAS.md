# Notas del piloto (Leonardo, Rafael, Velázquez) - formato definitivo

Formato: un JSON por pintor con 12 tarjetas (`kind`: tecnica, vida, obra, epoca). Sin niveles ni preguntas. Ocho tarjetas por pintor llevan `clue` (pregunta sin imagen cuya respuesta es el pintor) y `decoys` (2-4 distractores del catálogo con etapa). Lo escrito antes con niveles y preguntas se descartó (copia en /tmp/old_formato, fuera del proyecto).

## Decisiones
- Una idea por tarjeta, texto ≤220 caracteres. Las tarjetas sin pista son técnica general que otros pintores comparten (perspectiva aérea, pirámide, pincelada suelta): no daría una respuesta única.
- Las pistas se basan en hechos distintivos: escritura en espejo, carta a Sforza, robo de 1911, aposentador del rey, único desnudo conservado, etc. Algunas describen una obra sin título.
- Leyendas y dudas se redactan con cautela: cruz de Santiago "una leyenda dice"; carta de Rafael "se le atribuye"; "probablemente" con Perugino.
- Los decoys son de la misma época o país, pero claramente incorrectos para esa pista. Los he elegido a mano, sin comprobar que cada pista sea 100 % exclusiva entre los 32; en la app conviene que otro revisor mire las 24 pistas.

## Dudas
- "La Madonna del Prado" (a89) es la Madonna del Prato de Viena, no el Museo del Prado; se aclara en la tarjeta. Sugiero retitularla en el catálogo. "prato = prado" es traducción directa, no viene en la fuente.
- La Virgen de las rocas (a201): no verifiqué si la imagen es la versión del Louvre o la de Londres; la tarjeta habla de las dos.
- La Sixtina: la fecha varía según la fuente; no se usa.
- Pistas con posible competidor entre los "grandes maestros" (no entre los 32): "pintor sevillano" de bodegones (Zurbarán, no está en la lista); Panteón (Annibale Carracci también está enterrado allí, por eso se añade "último gran cuadro sin acabar"); salas del Vaticano (Miguel Ángel pintó la Sixtina, pero no son "salas con filósofos").
- Fuentes: sobre todo Wikipedia (en) y Britannica, más National Gallery, Prado (Breda) y Smarthistory. Fallaron Louvre, ficha del Prado de Las Meninas y Britannica de Leonardo. Falta una pasada contra museos antes de publicar.

## Descartado por falta de fuente o discrepancia
- Edad y fecha de nacimiento de Rafael, causa de su muerte, aprendizaje a los ocho años.
- Leyenda del ángel de Leonardo en el Bautismo de Verrocchio.
- "Grises y platas" como rasgo de Velázquez (solo en el catálogo).
- Obra de Calderón sobre Breda; sala exacta de Las Meninas.
- Encargo directo de Felipe IV para Breda (se dice solo "colgó en").
- Medio de La última cena: la fuente dice temple, no óleo.

## Propuesta para extender a los 32 pintores
1. Reutilizar tal cual el esquema, el validador (`tools/validar.py`) y la plantilla: 12 tarjetas por pintor (4 técnica, 3-4 vida, 3-4 obra, 0-1 época) con ~8 pistas.
2. Plan por pintor: 4-5 consultas para vida y época, 3-4 para las 3 obras clave del catálogo (fame alto), 2-3 para técnica con fuentes de museo.
3. Hacer una lista maestra de "hechos distintivos" por pintor (mecenas, ciudad, técnica propia, obra clave, anécdota documentada) antes de redactar.
4. Generar las pistas por lotes y revisarlas contra todos los pintores del catálogo: un segundo agente, con otro modelo, intenta responder cada pista y propone competidores.
5. Pistas de técnica general (sfumato, claroscuro...) solo si el término identifica a un único pintor del catálogo.
6. Decoys: por periodo y país primero; añadir 1 de otra época para que haya variedad.
7. El validador debería, además, comprobar que cada URL responde, que ninguna pista se repite entre pintores y que el decoy no tenga el mismo dato.
8. Coste estimado: unas 10-12 consultas web, una redacción y una revisión por pintor. Con modelos ligeros para borrador y verificación cruzada con uno potente, unas 30 veces el piloto.
9. Rusos e impresionistas: menos fuentes en español; usar Wikipedia (en) y el museo (Hermitage, Tretiakov, Orsay).
