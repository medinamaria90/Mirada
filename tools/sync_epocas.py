"""Copia las tarjetas de época de contenido/epocas/ a app/data/epocas/ (lo que sirve la app) y escribe su índice.

Valida cada archivo (formato de contenido/epocas/README.md): exactamente 4 tarjetas con los cuatro «kickers» en orden,
texto de hasta 180 caracteres, fuente con URL y, si hay catálogo en app/data/catalog.json, que el movimiento exista y que
cada obra exista, sea «learn» y pertenezca al movimiento. Uso: python3 -I tools/sync_epocas.py
El índice (`index.json`) es la lista de ids de movimiento con tarjetas: así la app no pide archivos que no existen.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "contenido", "epocas")
DST = os.path.join(ROOT, "app", "data", "epocas")
MAX_TEXT = 180
KICKERS = ["Cuándo y dónde", "Qué cambia", "Fíjate en", "Curiosidad"]
FORBIDDEN_WORDS = ("ayer", "mañana")


def load_catalog():
    path = os.path.join(ROOT, "app", "data", "catalog.json")
    if not os.path.isfile(path):
        return None, None
    with open(path, encoding="utf8") as f:
        cat = json.load(f)
    movements = {m["id"] for m in cat["movements"]}
    artist_movement = {a["id"]: a["movementId"] for a in cat["artists"]}
    works = {w["id"]: (artist_movement.get(w["artistId"]), w.get("role")) for w in cat["artworks"]}
    return movements, works


def check(data, name, movements, works):
    errors = []
    if data.get("movementId") != name:
        errors.append(f"{name}: movementId «{data.get('movementId')}» no coincide con el archivo")
    if movements is not None and name not in movements:
        errors.append(f"{name}: movimiento desconocido")
    cards = data.get("cards", [])
    if len(cards) != len(KICKERS):
        errors.append(f"{name}: {len(cards)} tarjetas, deben ser {len(KICKERS)}")
    for i, c in enumerate(cards):
        tag = f"{name} tarjeta {i + 1}"
        if i < len(KICKERS) and c.get("kicker") != KICKERS[i]:
            errors.append(f"{tag}: kicker «{c.get('kicker')}», debía ser «{KICKERS[i]}»")
        text = c.get("text") or ""
        if not text or len(text) > MAX_TEXT:
            errors.append(f"{tag}: texto vacío o de más de {MAX_TEXT} caracteres")
        words = {w.strip(".,;:!?¡¿«»()").lower() for w in text.split()}
        if words & set(FORBIDDEN_WORDS):
            errors.append(f"{tag}: contiene «ayer» o «mañana»")
        if not str(c.get("source", "")).startswith("http"):
            errors.append(f"{tag}: sin fuente")
        if works is not None:
            info = works.get(c.get("artwork"))
            if info is None:
                errors.append(f"{tag}: obra {c.get('artwork')} fuera del catálogo")
            else:
                mov, role = info
                if mov != name:
                    errors.append(f"{tag}: obra {c['artwork']} es de «{mov}», no de «{name}»")
                if role != "learn":
                    errors.append(f"{tag}: obra {c['artwork']} no es «learn» (es «{role}»)")
    return errors


def main():
    movements, works = load_catalog()
    os.makedirs(DST, exist_ok=True)
    for old in os.listdir(DST):
        os.remove(os.path.join(DST, old))
    index, errors = [], []
    for fname in sorted(os.listdir(SRC)):
        if not fname.endswith(".json"):
            continue
        name = fname[:-5]
        with open(os.path.join(SRC, fname), encoding="utf8") as f:
            data = json.load(f)
        errors += check(data, name, movements, works)
        with open(os.path.join(DST, fname), "w", encoding="utf8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        index.append(name)
    with open(os.path.join(DST, "index.json"), "w", encoding="utf8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(index)} épocas con tarjetas -> app/data/epocas/")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
