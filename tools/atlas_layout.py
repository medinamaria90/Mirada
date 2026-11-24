"""Disposición del atlas de miniaturas: función pura del catálogo (sin leer imágenes).

La usan `catalog_from_pipeline.py` (escribe `thumb` y `atlas` en catalog.json), `make_atlas.py` y
`pipeline/pack.py` (pintan las hojas): así las coordenadas del catálogo y las hojas encajan siempre,
vengan de donde vengan las imágenes. Mismo formato que el atlas de la oleada 5:
`thumb: [hoja, x, y, w, h]`, `atlas: {cell, sheets, size}`.
"""
import math

CELL, THUMB = 288, 280
COVER_COLS, COVER_ROWS = 3, 3
REST_COLS, REST_ROWS = 4, 4
PACK_SIDE = 1200  # lado mayor de las imágenes del paquete (pipeline/pack.py)


def packed_size(w, h, side=PACK_SIDE):
    """Medidas de la imagen empaquetada (Image.thumbnail((side, side)) de Pillow; no amplía)."""
    return thumb_size(w, h, side)


def thumb_size(w, h, box=THUMB):
    """Réplica del cálculo de `Image.thumbnail((box, box))` de Pillow (sin ampliar)."""
    if w <= box and h <= box:
        return w, h
    aspect = w / h
    x = y = box
    if x / y >= aspect:
        x = _round_aspect(y * aspect, lambda n: abs(aspect - n / y))
    else:
        y = _round_aspect(x / aspect, lambda n: 0 if n == 0 else abs(aspect - x / n))
    return min(x, w), min(y, h)


def _round_aspect(number, key):
    return max(min(math.floor(number), math.ceil(number), key=key), 1)


def covers(cat):
    """Portada de cada pintor del camino común (la obra «learn» más conocida), en orden del camino. Las primeras,
    las de los pintores que representan a cada movimiento (la portada más conocida de cada uno: la bienvenida y la
    cabecera del mapa), que caben en la primera hoja de 3×3."""
    by_artist = {}
    for w in cat["artworks"]:
        by_artist.setdefault(w["artistId"], []).append(w)
    out = []
    for a in cat["artists"]:
        if not a.get("onPath") or a.get("guest"):
            continue
        learn = [w for w in by_artist.get(a["id"], []) if w["role"] == "learn"]
        if learn:
            out.append((a["movementId"], max(learn, key=lambda w: w["fame"])))
    movements = [m["id"] for m in sorted(cat["movements"], key=lambda m: m["order"]) if not m.get("branch")]
    first = []
    for mid in movements:
        mine = [w for m, w in out if m == mid]
        if mine:
            first.append(max(mine, key=lambda w: w["fame"]))  # max devuelve el primero con más fama
    rest = [w for _, w in out if w not in first]
    return first + rest


def _pack(n, cols, rows, prefix):
    per = cols * rows
    return [(f"img/s/{prefix}{i // per}.jpg", (i % per) % cols, (i % per) // cols, cols, rows) for i in range(n)]


def layout(cat):
    """Devuelve (atlas, thumbs). `cat`: catálogo con artists y artworks ya ordenados."""
    cover_ids = [w["id"] for w in covers(cat)]
    cover_set = set(cover_ids)
    rest_ids = [w["id"] for w in cat["artworks"] if w["id"] not in cover_set]
    slots = dict(zip(cover_ids, _pack(len(cover_ids), COVER_COLS, COVER_ROWS, "c")))
    slots.update(zip(rest_ids, _pack(len(rest_ids), REST_COLS, REST_ROWS, "r")))
    size = {w["id"]: packed_size(w["w"], w["h"]) for w in cat["artworks"]}
    sheets = {}
    for wid, (src, col, row, cols, rows) in slots.items():
        s = sheets.setdefault(src, {"cols": cols, "rows": 0})
        s["rows"] = max(s["rows"], row + 1)
    names = sorted(sheets, key=lambda s: (s.split("/")[-1][0] != "c", int(s.split("/")[-1][1:-4])))
    index = {n: k for k, n in enumerate(names)}
    thumbs = {}
    for wid, (src, col, row, cols, rows) in slots.items():
        tw, th = thumb_size(*size[wid])
        x = col * CELL + (CELL - tw) // 2
        y = row * CELL + (CELL - th) // 2
        thumbs[wid] = [index[src], x, y, tw, th]
    atlas = {"cell": CELL, "sheets": names,
             "size": [[sheets[s]["cols"] * CELL, sheets[s]["rows"] * CELL] for s in names]}
    return atlas, thumbs
