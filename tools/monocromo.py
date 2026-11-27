"""Detecta imágenes casi monocromas (fotos en blanco y negro, sinopias, escala de grises): no enseñan a reconocer pintura.

Colorido = medida de Hasler y Süsstrunk sobre una miniatura: desviación y media de los ejes rojo-verde y amarillo-azul.
Una escala de grises da exactamente 0; las obras más apagadas del catálogo (Hammershøi, Malévich) rondan 7.
Lista blanca: tools/monocromas_permitidas.json ({id de obra: motivo}); hoy vacía.
Uso: python3 -I tools/monocromo.py <carpeta_imagenes> [<dir_app>]  (lista las que fallan; código != 0 si hay alguna)
"""
import json
import os
import sys

THUMB = 200            # lado mayor de la miniatura con la que se mide
MAX_COLORFULNESS = 3.0  # por debajo, la imagen se considera monocroma
MEAN_WEIGHT = 0.3
ALLOWED = os.path.join(os.path.dirname(os.path.abspath(__file__)), "monocromas_permitidas.json")


def colorfulness(im):
    """Colorido de una imagen PIL (0 = escala de grises)."""
    import numpy as np
    im = im.convert("RGB")
    im.thumbnail((THUMB, THUMB))
    a = np.asarray(im).astype(float)
    rg = a[..., 0] - a[..., 1]
    yb = 0.5 * (a[..., 0] + a[..., 1]) - a[..., 2]
    return float(np.hypot(rg.std(), yb.std()) + MEAN_WEIGHT * np.hypot(rg.mean(), yb.mean()))


def allowed():
    with open(ALLOWED, encoding="utf-8") as f:
        return set(json.load(f))


def monochrome_works(app, imgs):
    """Ids de las obras del catálogo con imagen casi monocroma y fuera de la lista blanca."""
    from PIL import Image
    with open(f"{app}/data/catalog.json", encoding="utf-8") as f:
        works = json.load(f)["artworks"]
    ok = allowed()
    bad = []
    for w in works:
        path = f"{imgs}/{w['id']}.jpg"
        if w["id"] in ok or not os.path.isfile(path):
            continue
        with Image.open(path) as im:
            c = colorfulness(im)
        if c < MAX_COLORFULNESS:
            bad.append((w["id"], round(c, 2)))
    return bad


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    app = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")
    bad = monochrome_works(app, sys.argv[1])
    for wid, c in bad:
        print(f"{wid}: casi monocroma (colorido {c} < {MAX_COLORFULNESS})")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
