# Tema principal: «Sala de entrada», auditoría y plan de leitmotiv

Pieza: `app/js/audio/scores.js`, `menu`. Prototipos: `app/js/audio/variants/tema.js` (fuera de lista).

## 1. Auditoría de la original

| Aspecto | Qué hay | Juicio |
|---|---|---|
| Tempo y compás | 84 ppm, 4/4 | Andar tranquilo, bien para una portada |
| Forma y bucle | A–A′–B (24 compases), unos 69 s | Corto: en una sesión de 10 min suena 9 veces; sin vuelta a A al final |
| Armonía | I–vi–IV–V–I–iii con séptimas mayores; puente vi–ii–V–I–IV–iii–ii–V | Cálida y neutra (color de «lounge» a lo Animal Crossing). Es lo que le gusta a María |
| Melodía | Casi todo negras que recorren el acorde (mi sol mi re · do mi la · la sol fa mi…) | Agradable y cantable, pero es un arpegio con forma de melodía: ninguna figura propia |
| Ritmo | Un solo puntillo en 24 compases | Sin ritmo característico: no se puede tararear «de memoria» |
| Motivo | La primera frase (mi–sol–mi–re, do–mi–**la**) es bonita; el salto de sexta a la es el mejor momento | No vuelve nunca: ni repetición ni secuencia |
| Puente | Mismo ritmo y mismo registro que A | Sin contraste: no se nota que se entra en otra parte |
| Final | Cierra en do y el puente acaba en sol (dominante) | El final de B sí invita a volver: es un acierto que hay que conservar |
| Timbre | Piano de fieltro, arpegio en negras y colchón de cuerda | Suave y no compite con los cuadros. Plano: nada cambia entre vueltas |

**Por qué gusta:** armonía de séptimas mayores, timbre de fieltro, tempo sereno y nada estridente.
**Qué le falta para ser memorable:** un gancho de 4-8 notas con ritmo propio (largo-corto), que se
repita y se transponga (la repetición es lo que hace que algo se quede), un puente con otro ritmo, y
una segunda vuelta del tema algo más arropada para que el bucle no sea idéntico.

## 2. Propuesta

### (a) Versión pulida: «Sala de entrada (tema)» (`menu/tema`)
Misma tonalidad, armonía, timbre (fieltro y colchón) y carácter; 88 ppm.
- **Gancho** (sale de su primera frase): `mi— sol mi re | do mi la— sol`, ritmo
  *puntillo-corchea-negra-negra | corchea-corchea-blanca-negra*. En grados: 3-5-3-2 | 1-3-6-5.
- **Repetición con variación:** compás 3, el gancho una tercera arriba (la— do la sol); compás 4, el
  mismo salto de sexta (fa la re′); compás 5, vuelve el gancho tal cual; compás 6, sube con el
  motivo-firma mi–sol–la–do′ (el que ya comparten «Umbral» y «Paseo»), que enlaza las tres piezas de
  la portada.
- **Forma A–A′–B–A′** (32 compases, unos 87 s). La segunda y la cuarta vez el tema lleva una
  contramelodía grave de clarinete.
- **Puente** con otro ritmo: secuencia ascendente (negra-corchea-negra con puntillo) que sube por
  la–re–la′ y acaba en la dominante, como la original.
- El cierre termina en do y deja una anacrusa (sol grave) que vuelve a llevar al gancho.

### (b) El tema como hilo conductor por épocas
Mismo gancho y mismo ritmo en todas; cambian el modo, el timbre y el acompañamiento. Así, en
cualquier pantalla se reconoce «la música de Sfumato», como las horas de Animal Crossing.

| Época | Versión | Cambio | Estado |
|---|---|---|---|
| Renacimiento | Tema en pavana | Re dórico (el si natural da el color modal), flauta dulce y laúd, viola en la 2.ª vuelta, mordentes | **Prototipo** |
| Barroco | Tema en giga | Re menor, clave, el gancho en imitación a dos voces (canon a 1 compás) sobre bajo caminante | Plan (el Barroco compuesto no le gustó: probar después) |
| Rococó | Tema en minué | Sol mayor 3/4, caja de música y clave, apoyaturas galantes | Plan |
| Romanticismo | Tema en nocturno | Do menor (la sexta se vuelve **la bemol**: nostalgia), piano con pedal en arpegios, cello que responde en el puente | **Prototipo** |
| Impresionismo | Tema en reflejos | Re bemol con acordes de 9.ª, flauta, arpa (timbre nuevo, cuerda de tripa suave) y cuerdas; el puente salta a la mayor (mediante cromática) | **Prototipo** |
| Postimpresionismo / Moderno | Tema en musette / en cuartas | Guitarra y acordeón en 3/4; vibráfono y 5/4 | Plan |
| Noche (portada) | Tema de noche | Mismo gancho a 66 ppm, celesta y cuerdas, sin bajo marcado; sonaría de 21 h a 7 h (rotation.js ya distingue noche) | Plan |

### (c) Motivo de celebración
Cabeza del gancho, transpuesta a la tónica de lo que suena (sfx.js ya transpone):
- **Resultado de ronda:** `mi–sol–do′` (3 notas, la subida del gancho resuelta en la tónica).
- **Dominar a un pintor:** `mi–sol–la–do′–mi′` sobre acorde de do con 7.ª mayor (el motivo-firma completo
  y una nota más que «abre»). Sustituiría a `levelup`/`complete` solo si María lo aprueba.

## 3. Prototipos y nivel

Nivel medido como las demás (render sin conexión, 30 s, `__audioDiag` de escucha.html):

| Pieza | RMS dBFS | Pico dBFS |
|---|---|---|
| menu (original) | −26,0 | −11,8 |
| menu/tema | −25,8 | −11,2 |
| renaissance/tema | −25,9 | −11,1 |
| romantic/tema | −26,1 | −10,5 |
| impressionism/tema | −26,1 | −14,2 |

Pasan `tests/audio.test.js` (partitura, armonía en tiempos fuertes, saltos ≤ 8.ª, rango, forma,
motivo-firma en la portada). `playlists.js` no cambia: la original sigue de principal y «Paseo» de
secundaria.

**Dónde oírlos:** en la página de escucha, la última pieza de Portada, Renacimiento, Romanticismo e
Impresionismo; en la app, modo secreto, «Siguiente» desde el tema principal: portada ×3,
Renacimiento ×6, Romanticismo ×5, Impresionismo ×4.
