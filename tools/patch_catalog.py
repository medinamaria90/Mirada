"""Regenera app/data/catalog.json desde catalog_data.py sin reprocesar imágenes.

Lee las medidas reales de app/img/<id>.jpg (imágenes ya optimizadas por build_catalog.py o
import_staging.sh) y vuelca el catálogo con catalog_extras.build + write_catalog (data/catalog.json
y data/catalog-text.json): es la forma normal de aplicar cualquier cambio en los datos curados
(títulos, roles, pistas, look…).
Uso: python3 -I patch_catalog.py <dir_app>
"""
import json, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalog_extras import all_works, build, write_catalog  # noqa: E402


def main():
    app = sys.argv[1]
    sizes = {}
    for w in all_works():
        with Image.open(f"{app}/img/{w[0]}.jpg") as im:
            sizes[w[0]] = im.size
    cat = build(sizes)
    # Usa la posición de las miniaturas de tools/atlas_layout.json (si cambian las obras o sus
    # imágenes: bash tools/make_thumbs.sh <dir_app>, que regenera el atlas y el catálogo).
    write_catalog(app, cat)
    stage = [a for a in cat["artists"] if not a["guest"]]
    print(f"obras={len(cat['artworks'])} pintores={len(cat['artists'])} con etapa={len(stage)} "
          f"spoiler={sum(1 for w in cat['artworks'] if w.get('spoiler'))} "
          f"look={sum(1 for w in cat['artworks'] if w.get('look'))} "
          f"tramos={sum(1 for a in cat['artists'] if a.get('section'))}")


main()
