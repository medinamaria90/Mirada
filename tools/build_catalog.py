"""Construye app/data/catalog.json y app/img/a<N>.jpg a partir de las imágenes del dataset.

Uso: python3 -I build_catalog.py <dir_full> <rs_raw.json> <dir_app>
  dir_full : carpeta con <N>full.jpg (material NO confiable: solo se leen imágenes con Pillow)
  rs_raw.json : metadatos originales (ruso), solo para contrastar atribuciones y años
  dir_app : raíz de la app (se escribe en data/ e img/)
Los datos curados están en catalog_data.py (mismo directorio que este script).
Antes, las obras nuevas (b<N>): bash import_staging.sh <staging> <dir_app>.
Después, generar el atlas de miniaturas y el catálogo final: bash make_thumbs.sh <dir_app>.
"""
import json, os, re, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as D  # noqa: E402
from catalog_extras import build  # noqa: E402

MAX_SIDE, QUALITY = 1000, 75


def process_image(src, dst):
    with Image.open(src) as im:
        im = im.convert("RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        im.save(dst, "JPEG", quality=QUALITY, progressive=True, optimize=True)
        return im.size


def main():
    full_dir, raw_path, app_dir = sys.argv[1:4]
    raw = {r["num"]: r for r in json.load(open(raw_path, encoding="utf-8"))}
    nums = [w[0] for w in D.W]
    assert len(nums) == len(set(nums)), "obra repetida"
    overlap = set(nums) & set(D.EXCLUDED)
    assert not overlap, f"incluidas y excluidas a la vez: {overlap}"
    missing = set(raw) - set(nums) - set(D.EXCLUDED)
    assert not missing, f"sin decidir: {sorted(missing)}"

    os.makedirs(f"{app_dir}/img", exist_ok=True)
    os.makedirs(f"{app_dir}/data", exist_ok=True)
    notes = []
    sizes = {}
    for num, aid, title, year, ysort, fame, role, conf in D.W:
        assert aid in D.A, aid
        ru = raw[num]
        if D.RU_AUTHOR.get(ru["author"]) != aid:
            notes.append(f"AUTOR #{num}: dataset «{ru['author']}» -> {aid}")
        m = re.match(r"\d{4}", ru["year"])
        if m and abs(int(ru["year"]) - ysort) > 3:
            notes.append(f"AÑO #{num} {title}: dataset {ru['year']} -> {year}")
        sizes[f"a{num}"] = process_image(f"{full_dir}/{num}full.jpg", f"{app_dir}/img/a{num}.jpg")
    # Obras de la oleada 4 (b<N>): no vienen del dataset; sus imágenes ya están en app/img
    # (tools/import_staging.sh). Solo se leen sus medidas.
    for w in D.WB:
        with Image.open(f"{app_dir}/img/{w[0]}.jpg") as im:
            sizes[w[0]] = im.size

    # Pintores, guest (regla de etapas), roles, thumb, spoiler, tramos, rasgos y look.
    catalog = build(sizes)
    # El catálogo publicado (con el atlas y los textos aparte) lo escribe make_thumbs.sh.
    print(f"movimientos={len(catalog['movements'])} pintores={len(catalog['artists'])} "
          f"con etapa={sum(not a['guest'] for a in catalog['artists'])} obras={len(catalog['artworks'])} "
          f"excluidas={len(D.EXCLUDED)}")
    print("\n".join(notes))

main()
