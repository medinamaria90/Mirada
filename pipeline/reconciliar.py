"""Quita de catalogo/img_meta.json los ids cuya imagen no consta en ninguna release.
Uso: reconciliar.py <fichero con un nombre de recurso por línea>.  Así download.py volverá a bajarlos."""
import sys
from lib import *

en_release = {l.strip()[:-4] for l in open(sys.argv[1], encoding="utf-8") if l.strip().endswith(".jpg")}
if len(en_release) < 100:
    sys.exit("reconciliar: lista de la release sospechosamente corta (%d); no toco nada" % len(en_release))
p = os.path.join(CAT, "img_meta.json")
meta = load(p, {})
fuera = [k for k in meta if k not in en_release]
for k in fuera:
    meta.pop(k)
save(p, meta)
print(f"reconciliar: {len(en_release)} imágenes en releases, {len(meta)} en img_meta, quitadas {len(fuera)} que no estaban subidas")
