"""Copia las tarjetas de época de contenido/epocas/ a app/data/epocas/ (lo que sirve la app) y escribe su índice.

Valida cada archivo (formato de contenido/epocas/README.md): las 8 tarjetas con los ocho «kickers» en orden, cinco de
ellas «oficiales», la ficha de la época (artículo en cinco bloques con su fuente) y, como mucho, una tarjeta extra con «kicker» propio en cualquier sitio (p. ej. «Mientras, en el sur»), texto de hasta 180 caracteres, fuente con URL y, si hay catálogo en app/data/catalog.json, que el movimiento exista y que
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
KICKERS = [
    "Cuándo y dónde", "Por qué surge", "Qué cambia", "Cómo se pintaba",
    "Fíjate en", "Sus grandes temas", "Qué nos dejó", "Curiosidad",
]
MAX_EXTRA = 1  # tarjetas de más, con su propio «kicker», para épocas que necesitan contar dos caminos
FORBIDDEN_WORDS = ("ayer", "mañana")
OFFICIAL = 5  # tarjetas «oficiales» («oficial»: true): las que enseña la presentación en el camino; el resto, en la ficha
FICHA_BLOCKS = ["Qué es", "Cuándo y dónde", "Qué cambia", "Cómo se reconoce", "Sus grandes nombres"]
FICHA_MAX_WORDS = 900


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


def forbidden(text):
    words = {w.strip(".,;:!?¡¿«»()").lower() for w in text.split()}
    return bool(words & set(FORBIDDEN_WORDS))


def check_work(tag, work_id, name, works):
    if works is None:
        return []
    info = works.get(work_id)
    if info is None:
        return [f"{tag}: obra {work_id} fuera del catálogo"]
    mov, role = info
    errors = []
    if mov != name:
        errors.append(f"{tag}: obra {work_id} es de «{mov}», no de «{name}»")
    if role != "learn":
        errors.append(f"{tag}: obra {work_id} no es «learn» (es «{role}»)")
    return errors


# Ficha de la época (ui/screens/era-page.js): nombre corto, dónde, los cinco bloques del artículo en su orden (cada uno con
# su cuadro y su texto) y sus fuentes, que solo salen en «Fuentes y créditos».
def check_ficha(ficha, name, works):
    if not isinstance(ficha, dict):
        return [f"{name}: falta la ficha de la época"]
    errors = []
    for key in ("corto", "donde"):
        if not str(ficha.get(key, "")).strip():
            errors.append(f"{name} ficha: falta «{key}»")
    blocks = ficha.get("bloques") or []
    if [b.get("titulo") for b in blocks] != FICHA_BLOCKS:
        errors.append(f"{name} ficha: los bloques deben ser {FICHA_BLOCKS}, en orden")
    total = 0
    for b in blocks:
        tag = f"{name} ficha «{b.get('titulo')}»"
        text = b.get("texto") or ""
        total += len(text.split())
        if not text.strip():
            errors.append(f"{tag}: sin texto")
        if forbidden(text):
            errors.append(f"{tag}: contiene «ayer» o «mañana»")
        errors += check_work(tag, b.get("artwork"), name, works)
    if total > FICHA_MAX_WORDS:
        errors.append(f"{name} ficha: {total} palabras, como mucho {FICHA_MAX_WORDS}")
    sources = ficha.get("fuentes") or []
    if not sources or not all(str(u).startswith("http") for u in sources):
        errors.append(f"{name} ficha: sin fuentes")
    return errors


def check(data, name, movements, works):
    errors = []
    if data.get("movementId") != name:
        errors.append(f"{name}: movementId «{data.get('movementId')}» no coincide con el archivo")
    if movements is not None and name not in movements:
        errors.append(f"{name}: movimiento desconocido")
    cards = data.get("cards", [])
    if not len(KICKERS) <= len(cards) <= len(KICKERS) + MAX_EXTRA:
        errors.append(f"{name}: {len(cards)} tarjetas, deben ser {len(KICKERS)} (+{MAX_EXTRA} extra como mucho)")
    expected = 0
    for i, c in enumerate(cards):
        tag = f"{name} tarjeta {i + 1}"
        kicker = (c.get("kicker") or "").strip()
        if expected < len(KICKERS) and kicker == KICKERS[expected]:
            expected += 1
        elif not kicker or kicker in KICKERS:
            want = KICKERS[expected] if expected < len(KICKERS) else "una extra"
            errors.append(f"{tag}: kicker «{c.get('kicker')}», debía ser «{want}» o uno propio de tarjeta extra")
        text = c.get("text") or ""
        if not text or len(text) > MAX_TEXT:
            errors.append(f"{tag}: texto vacío o de más de {MAX_TEXT} caracteres")
        if forbidden(text):
            errors.append(f"{tag}: contiene «ayer» o «mañana»")
        if not str(c.get("source", "")).startswith("http"):
            errors.append(f"{tag}: sin fuente")
        errors += check_work(tag, c.get("artwork"), name, works)
    if expected < len(KICKERS):
        errors.append(f"{name}: falta la tarjeta «{KICKERS[expected]}» (los ocho kickers, en orden)")
    official = sum(1 for c in cards if c.get("oficial") is True)
    if official != OFFICIAL:
        errors.append(f"{name}: {official} tarjetas oficiales, deben ser {OFFICIAL}")
    return errors + check_ficha(data.get("ficha"), name, works)


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
