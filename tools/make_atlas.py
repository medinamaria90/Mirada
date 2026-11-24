"""Genera las hojas de miniaturas (atlas) y vuelca el catálogo con su posición.

Uso: python3 -I make_atlas.py <dir_app>

Cada obra tiene una celda de CELL×CELL px en una hoja JPEG de img/s/; la miniatura (lado mayor
THUMB px, proporciones del cuadro) va centrada en su celda con margen, para que al recortar no
asome la vecina. El catálogo guarda para cada obra `thumb: [hoja, x, y, w, h]` y arriba
`atlas: {cell, sheets: [ruta…], size: [[w, h]…]}`; la app recorta con CSS (ui/art.js).

Orden pensado para descargar poco: primero las portadas (la obra que representa a cada pintor con
etapa: mapa, medallas, tarjetas, bienvenida e intros) en hojas pequeñas; después el resto por
pintor en el orden del camino (los distractores parecidos caen en hojas cercanas).

Las imágenes de origen (app/img/<id>.jpg) se tratan como no confiables: solo se abren con Pillow
como JPEG y se vuelven a codificar sin metadatos.
"""
import json, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalog_extras import all_works, build, write_catalog, LAYOUT_PATH  # noqa: E402

CELL, THUMB = 288, 280
# Bordes «extruidos»: alrededor de cada miniatura se repiten sus píxeles de borde EXTRUDE px (dentro
# de su celda). Si al escalar con CSS el navegador muestrea un poco fuera de la región, toma el
# color del propio cuadro y no el fondo de la hoja ni la celda vecina (sangrado entre celdas).
EXTRUDE = 3
COVER_COLS, COVER_ROWS = 3, 3
REST_COLS, REST_ROWS = 4, 4
QUALITY = 72
BG = (221, 213, 199)


def covers_first(cat):
    """Portadas de los pintores con etapa (primera obra «learn» de más fama), en orden del camino."""
    by_artist = {}
    for w in cat["artworks"]:
        by_artist.setdefault(w["artistId"], []).append(w)
    out = []
    for a in cat["artists"]:  # ya vienen en orden de movimiento y de pintor
        if a["guest"]:
            continue
        learn = [w for w in by_artist.get(a["id"], []) if w["role"] == "learn"]
        if learn:
            out.append(max(learn, key=lambda w: w["fame"]))  # max devuelve el primero con más fama
    return out


def pack(ids, cols, rows, prefix):
    per = cols * rows
    return [(f"img/s/{prefix}{i // per}.jpg", (i % per) % cols, (i % per) // cols, cols, rows)
            for i in range(len(ids))]


def extrude(canvas, im, x, y, n=EXTRUDE):
    """Repite los píxeles del borde de `im` (pegada en x, y) n px hacia fuera."""
    w, h = im.size
    canvas.paste(im.crop((0, 0, w, 1)).resize((w, n)), (x, y - n))
    canvas.paste(im.crop((0, h - 1, w, h)).resize((w, n)), (x, y + h))
    canvas.paste(im.crop((0, 0, 1, h)).resize((n, h)), (x - n, y))
    canvas.paste(im.crop((w - 1, 0, w, h)).resize((n, h)), (x + w, y))
    for cx, cy, px, py in ((0, 0, x - n, y - n), (w - 1, 0, x + w, y - n), (0, h - 1, x - n, y + h), (w - 1, h - 1, x + w, y + h)):
        canvas.paste(im.getpixel((cx, cy)), (px, py, px + n, py + n))


def main():
    app = sys.argv[1]
    sizes = {}
    for w in all_works():
        with Image.open(f"{app}/img/{w[0]}.jpg") as im:
            sizes[w[0]] = im.size
    cat = build(sizes)
    covers = [w["id"] for w in covers_first(cat)]
    rest = [w["id"] for w in cat["artworks"] if w["id"] not in set(covers)]
    slots = dict(zip(covers, pack(covers, COVER_COLS, COVER_ROWS, "c")))
    slots.update(zip(rest, pack(rest, REST_COLS, REST_ROWS, "r")))

    os.makedirs(f"{app}/img/s", exist_ok=True)
    for f in os.listdir(f"{app}/img/s"):
        os.remove(f"{app}/img/s/{f}")
    sheets = {}
    layout = {}
    for wid, (src, col, row, cols, rows) in slots.items():
        sheet = sheets.setdefault(src, {"cols": cols, "rows": 0, "items": []})
        sheet["rows"] = max(sheet["rows"], row + 1)
        sheet["items"].append((wid, col, row))
    names = sorted(sheets, key=lambda s: (s.split("/")[-1][0] != "c", int(s.split("/")[-1][1:-4])))
    for k, src in enumerate(names):
        sheet = sheets[src]
        canvas = Image.new("RGB", (sheet["cols"] * CELL, sheet["rows"] * CELL), BG)
        for wid, col, row in sheet["items"]:
            with Image.open(f"{app}/img/{wid}.jpg") as im:
                im.draft("RGB", (THUMB * 2, THUMB * 2))
                im = im.convert("RGB")
                im.thumbnail((THUMB, THUMB), Image.LANCZOS)
                x = col * CELL + (CELL - im.width) // 2
                y = row * CELL + (CELL - im.height) // 2
                canvas.paste(im, (x, y))
                extrude(canvas, im, x, y)
                layout[wid] = [k, x, y, im.width, im.height]
        canvas.save(f"{app}/{src}", "JPEG", quality=QUALITY, progressive=True, optimize=True)
    atlas = {"cell": CELL, "sheets": names,
             "size": [[sheets[s]["cols"] * CELL, sheets[s]["rows"] * CELL] for s in names]}
    with open(LAYOUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"atlas": atlas, "thumbs": layout}, f, ensure_ascii=False, separators=(",", ":"))
    write_catalog(app, cat)
    total = sum(os.path.getsize(f"{app}/{s}") for s in names)
    print(f"hojas={len(names)} ({total / 1e6:.2f} MB) miniaturas={len(layout)} portadas={len(covers)}")
    for s in names:
        print(f"  {s}: {os.path.getsize(f'{app}/{s}') // 1024} KB")


main()
