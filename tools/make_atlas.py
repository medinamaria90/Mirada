"""Pinta las hojas del atlas de miniaturas (<app>/img/s/*.jpg) del catálogo grande.

Uso: python3 -I tools/make_atlas.py <dir_app> [<dir_imagenes>]
  dir_app       carpeta de la app (lee data/catalog.json y escribe img/s/)
  dir_imagenes  carpeta con las w<QID>.jpg (por defecto <dir_app>/img; en local, la carpeta temporal
                que baja tools/fetch_images.sh)

Las coordenadas (`thumb`) y el tamaño de las hojas ya están en catalog.json: salen de tools/atlas_layout.py,
que es función solo del catálogo (tools/catalog_from_pipeline.py). Aquí solo se pintan. Mismo formato que el
atlas de la oleada 5: cada obra tiene una celda de CELL×CELL px; la miniatura (lado mayor THUMB px,
proporciones del cuadro) va centrada con un margen «extruido» (se repiten sus píxeles de borde EXTRUDE px) para
que al recortar con CSS no asome la celda vecina.

Además pinta una miniatura suelta por obra (<app>/img/t/<id>.jpg, lado mayor TINY px, unos 10 KB) para las
pantallas que enseñan pocos cuadros sueltos (el perfil): con las hojas del atlas, nueve cuadros recientes podían
costar 2 MB de hojas enteras.

Las imágenes de origen se tratan como no confiables: solo se abren con Pillow como JPEG y se vuelven a
codificar sin metadatos. Se comprueba que cada imagen mide lo que espera el catálogo.
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_layout import THUMB, packed_size  # noqa: E402

EXTRUDE = 3
QUALITY = 72
TINY = 240  # lado mayor de la miniatura suelta (img/t)
TINY_QUALITY = 68
# Más tamaños sueltos: img/g (galerías y franjas, nítidas a 2-3 px por px de CSS) e img/m (portada de la ficha).
EXTRA_SIZES = (("g", 320, 72), ("m", 800, 74))
BG = (221, 213, 199)
MAX_PIXELS = 40_000_000  # tope de píxeles por imagen (Pillow avisa de bombas de descompresión)


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
    imgs = sys.argv[2] if len(sys.argv) > 2 else f"{app}/img"
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    with open(f"{app}/data/catalog.json", encoding="utf-8") as f:
        cat = json.load(f)
    atlas = cat["atlas"]
    out = f"{app}/img/s"
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.endswith(".jpg"):
            os.remove(f"{out}/{f}")
    extra_dirs = {name: f"{app}/img/{name}" for name, _, _ in EXTRA_SIZES}
    for d in extra_dirs.values():
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            if f.endswith(".jpg"):
                os.remove(f"{d}/{f}")
    tiny_dir = f"{app}/img/t"
    os.makedirs(tiny_dir, exist_ok=True)
    for f in os.listdir(tiny_dir):
        if f.endswith(".jpg"):
            os.remove(f"{tiny_dir}/{f}")
    by_sheet = {}
    for w in cat["artworks"]:
        by_sheet.setdefault(w["thumb"][0], []).append(w)
    total = 0
    for k, src in enumerate(atlas["sheets"]):
        sw, sh = atlas["size"][k]
        canvas = Image.new("RGB", (sw, sh), BG)
        for w in by_sheet.get(k, []):
            _, x, y, tw, th = w["thumb"]
            with Image.open(f"{imgs}/{w['id']}.jpg") as im:
                if im.format != "JPEG":
                    raise SystemExit(f"{w['id']}.jpg no es un JPEG")
                # Mide lo que el catálogo espera (si no, las coordenadas no encajarían con las hojas).
                if im.size != packed_size(w["w"], w["h"]):
                    raise SystemExit(f"{w['id']}: la imagen mide {im.size} y el catálogo espera {packed_size(w['w'], w['h'])} "
                                     "(¿el catálogo y las imágenes son de versiones distintas?)")
                im = im.convert("RGB")  # a tamaño completo: de aquí salen también los tamaños sueltos (img/g, img/m)
                tiny = im.copy()
                tiny.thumbnail((TINY, TINY), Image.LANCZOS)
                tiny.save(f"{tiny_dir}/{w['id']}.jpg", "JPEG", quality=TINY_QUALITY, progressive=True, optimize=True)
                for name, side, quality in EXTRA_SIZES:
                    big = im.copy()
                    big.thumbnail((side, side), Image.LANCZOS)
                    big.save(f"{extra_dirs[name]}/{w['id']}.jpg", "JPEG", quality=quality, progressive=True, optimize=True)
                im = im.resize((tw, th), Image.LANCZOS)
                canvas.paste(im, (x, y))
                extrude(canvas, im, x, y)
        path = f"{app}/{src}"
        canvas.save(path, "JPEG", quality=QUALITY, progressive=True, optimize=True)
        total += os.path.getsize(path)
    print(f"hojas={len(atlas['sheets'])} ({total / 1e6:.2f} MB) miniaturas={len(cat['artworks'])}")


if __name__ == "__main__":
    main()
