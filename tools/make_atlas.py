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

Si falta la imagen de alguna obra (o no se puede abrir), no se para el despliegue: se avisa, su celda queda
del color de fondo y sus tamaños sueltos (img/t, img/g, img/m y, si se pinta dentro de la app, la w<QID>.jpg)
son un rectángulo neutro con sus proporciones. Solo falla si faltan demasiadas (MAX_MISSING_SHARE): eso ya no
es un desfase puntual entre catálogo y paquete, sino un paquete roto.
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
MAX_MISSING_SHARE = 0.05  # por encima de esta fracción de obras sin imagen, se falla (paquete roto)
PLACEHOLDER_QUALITY = 60


class MissingImage(Exception):
    """La imagen de una obra falta o no se puede usar: se pinta un hueco neutro y se sigue."""


def extrude(canvas, im, x, y, n=EXTRUDE):
    """Repite los píxeles del borde de `im` (pegada en x, y) n px hacia fuera."""
    w, h = im.size
    canvas.paste(im.crop((0, 0, w, 1)).resize((w, n)), (x, y - n))
    canvas.paste(im.crop((0, h - 1, w, h)).resize((w, n)), (x, y + h))
    canvas.paste(im.crop((0, 0, 1, h)).resize((n, h)), (x - n, y))
    canvas.paste(im.crop((w - 1, 0, w, h)).resize((n, h)), (x + w, y))
    for cx, cy, px, py in ((0, 0, x - n, y - n), (w - 1, 0, x + w, y - n), (0, h - 1, x - n, y + h), (w - 1, h - 1, x + w, y + h)):
        canvas.paste(im.getpixel((cx, cy)), (px, py, px + n, py + n))


def clear_jpgs(folder):
    os.makedirs(folder, exist_ok=True)
    for f in os.listdir(folder):
        if f.endswith(".jpg"):
            os.remove(f"{folder}/{f}")


def save_jpeg(im, path, quality):
    im.save(path, "JPEG", quality=quality, progressive=True, optimize=True)


def open_source(path, w):
    """Imagen de origen de la obra `w` en RGB, o MissingImage si falta o no es un JPEG legible."""
    if not os.path.isfile(path):
        raise MissingImage("no está")
    try:
        with Image.open(path) as im:
            if im.format != "JPEG":
                raise MissingImage("no es un JPEG")
            # Mide lo que el catálogo espera (si no, las coordenadas no encajarían con las hojas).
            if im.size != packed_size(w["w"], w["h"]):
                raise SystemExit(f"{w['id']}: la imagen mide {im.size} y el catálogo espera {packed_size(w['w'], w['h'])} "
                                 "(¿el catálogo y las imágenes son de versiones distintas?)")
            return im.convert("RGB")
    except (OSError, Image.DecompressionBombError) as e:
        raise MissingImage(f"no se puede abrir ({e})") from e


def placeholder(w):
    """Rectángulo neutro con las proporciones de la obra, a tamaño de paquete."""
    return Image.new("RGB", packed_size(w["w"], w["h"]), BG)


def write_sizes(im, w, sizes, quality=None):
    """Tamaños sueltos (img/t, img/g, img/m) de la obra a partir de `im` a tamaño completo. `quality` fija la
    calidad de todos (huecos neutros); si no, cada tamaño usa la suya."""
    for folder, side, own_quality in sizes:
        small = im.copy()
        small.thumbnail((side, side), Image.LANCZOS)
        save_jpeg(small, f"{folder}/{w['id']}.jpg", quality or own_quality)


def main():
    app = sys.argv[1]
    imgs = sys.argv[2] if len(sys.argv) > 2 else f"{app}/img"
    # La w<QID>.jpg neutra solo se escribe cuando las imágenes están dentro de la app (despliegue): nunca en una
    # carpeta de descarga, que la siguiente vez parecería completa.
    write_full_placeholder = os.path.realpath(imgs) == os.path.realpath(f"{app}/img")
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    with open(f"{app}/data/catalog.json", encoding="utf-8") as f:
        cat = json.load(f)
    atlas = cat["atlas"]
    out = f"{app}/img/s"
    clear_jpgs(out)
    sizes = [(f"{app}/img/t", TINY, TINY_QUALITY)] + [(f"{app}/img/{name}", side, q) for name, side, q in EXTRA_SIZES]
    for d, _, _ in sizes:
        clear_jpgs(d)
    by_sheet = {}
    for w in cat["artworks"]:
        by_sheet.setdefault(w["thumb"][0], []).append(w)
    total = 0
    missing = []
    for k, src in enumerate(atlas["sheets"]):
        sw, sh = atlas["size"][k]
        canvas = Image.new("RGB", (sw, sh), BG)
        for w in by_sheet.get(k, []):
            _, x, y, tw, th = w["thumb"]
            try:
                im = open_source(f"{imgs}/{w['id']}.jpg", w)
            except MissingImage as e:
                print(f"make_atlas: AVISO: {w['id']}.jpg {e}; queda un hueco neutro", file=sys.stderr)
                missing.append(w["id"])
                hole = placeholder(w)
                write_sizes(hole, w, sizes, PLACEHOLDER_QUALITY)
                if write_full_placeholder:
                    save_jpeg(hole, f"{imgs}/{w['id']}.jpg", PLACEHOLDER_QUALITY)
                continue  # la celda queda del color de fondo
            write_sizes(im, w, sizes)
            im = im.resize((tw, th), Image.LANCZOS)
            canvas.paste(im, (x, y))
            extrude(canvas, im, x, y)
        path = f"{app}/{src}"
        save_jpeg(canvas, path, QUALITY)
        total += os.path.getsize(path)
    n = len(cat["artworks"])
    print(f"hojas={len(atlas['sheets'])} ({total / 1e6:.2f} MB) miniaturas={n} sin_imagen={len(missing)}")
    if missing and len(missing) > n * MAX_MISSING_SHARE:
        raise SystemExit(f"faltan {len(missing)} de {n} imágenes: el paquete no corresponde a este catálogo")


if __name__ == "__main__":
    main()
