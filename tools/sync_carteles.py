"""Copia los carteles del mapa de contenido/ (ramas.json y tramos.json) a app/data/carteles/, lo que sirve la app
(ui/sign-cards.js). Antes los revisa con tools/check_carteles.py y, si algo falla, no copia nada.
Uso: python3 -I tools/sync_carteles.py"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "contenido"
DST = ROOT / "app" / "data" / "carteles"
FILES = ("ramas.json", "tramos.json")


def main():
    check = subprocess.run([sys.executable, "-I", str(ROOT / "tools" / "check_carteles.py")], check=False)
    if check.returncode:
        sys.exit("carteles con errores: no se copian")
    DST.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        data = json.loads((SRC / name).read_text(encoding="utf-8"))
        (DST / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{name}: {len(data)} carteles -> app/data/carteles/")


if __name__ == "__main__":
    main()
