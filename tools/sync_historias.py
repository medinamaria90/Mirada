"""Copia las historias de contenido/historias/ a app/data/historias/ (lo que sirve la app) y escribe su índice.

Valida cada una (formato de contenido/historias/README.md): como mucho 5 tarjetas, texto de hasta 180 caracteres, fuente,
título corto en cada etapa y, si hay catálogo en app/data/catalog.json, que el pintor y las obras existan y que una historia no repita obra si el pintor tiene otra de ese nivel. Uso: python3 -I tools/sync_historias.py
El índice (`index.json`) dice qué niveles tiene cada pintor: así la app no pide archivos que no existen.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import share_pages  # noqa: E402

SRC = os.path.join(ROOT, "contenido", "historias")
DST = os.path.join(ROOT, "app", "data", "historias")
MAX_TEXT = 180
MAX_CARDS = 5
SHORT_MAX = 12  # título corto de nivel (`stage`): cabe bajo su círculo en la fila de historias
BASIC_LEVEL = 1


def check(story, name, artists, works):
    errors = []
    if story.get("artistId") != name:
        errors.append(f"{name}: artistId «{story.get('artistId')}» no coincide con el archivo")
    if artists is not None and name not in artists:
        errors.append(f"{name}: pintor desconocido")
    for lv in story.get("levels", []):
        if lv.get("level", 0) >= 2 and not 0 < len(str(lv.get("stage", "")).strip()) <= SHORT_MAX:
            errors.append(f"{name} nivel {lv.get('level')}: falta el título corto (`stage`, hasta {SHORT_MAX} letras)")
        cards = lv.get("cards", [])
        if not 1 <= len(cards) <= MAX_CARDS:
            errors.append(f"{name} nivel {lv.get('level')}: {len(cards)} tarjetas")
        for i, c in enumerate(cards):
            tag = f"{name} nivel {lv.get('level')} tarjeta {i + 1}"
            if not c.get("text") or len(c["text"]) > MAX_TEXT:
                errors.append(f"{tag}: texto vacío o de más de {MAX_TEXT} caracteres")
            if not str(c.get("source", "")).startswith("http"):
                errors.append(f"{tag}: sin fuente")
            if works is not None and c.get("artwork") not in works:
                errors.append(f"{tag}: obra {c.get('artwork')} fuera del catálogo")
    return errors


def repeats(story, name, works):
    """Obras repetidas (misma obra y mismo encuadre) entre tarjetas de una historia cuando el pintor tiene alternativa.

    Alternativa: una obra del pintor y del nivel de la historia (en el básico, solo las «learn») que la historia no usa.
    `works`: {id: obra del catálogo}. Sin alternativa, la repetición es inevitable y no cuenta.
    """
    errors = []
    for lv in story.get("levels", []):
        level = lv.get("level")
        cards = lv.get("cards", [])
        ids = [c.get("artwork") for c in cards]
        # Un detalle distinto de la misma obra (otro `focus`) no cuenta como repetición.
        shots = [(c.get("artwork"), tuple(c.get("focus") or ())) for c in cards]
        twice = sorted({a for a, f in shots if shots.count((a, f)) > 1})
        if not twice:
            continue
        free = sorted(w["id"] for w in works.values()
                      if w["artistId"] == name and w.get("level") == level and w["id"] not in ids
                      and (level != BASIC_LEVEL or w.get("role") == "learn"))
        if free:
            errors.append(f"{name} nivel {level}: repite {', '.join(twice)}; sin usar: {', '.join(free)}")
    return errors


def main():
    catalog = os.path.join(ROOT, "app", "data", "catalog.json")
    artists = works = None
    if os.path.isfile(catalog):
        with open(catalog, encoding="utf8") as f:
            cat = json.load(f)
        artists = {a["id"] for a in cat["artists"]}
        works = {w["id"]: w for w in cat["artworks"]}
    os.makedirs(DST, exist_ok=True)
    for old in os.listdir(DST):
        os.remove(os.path.join(DST, old))
    index, errors = {}, []
    for fname in sorted(os.listdir(SRC)):
        if not fname.endswith(".json"):
            continue
        name = fname[:-5]
        with open(os.path.join(SRC, fname), encoding="utf8") as f:
            story = json.load(f)
        errors += check(story, name, artists, works)
        if works is not None:
            errors += repeats(story, name, works)
        with open(os.path.join(DST, fname), "w", encoding="utf8") as f:
            json.dump(story, f, ensure_ascii=False, separators=(",", ":"))
        index[name] = [lv["level"] for lv in story.get("levels", [])]
    with open(os.path.join(DST, "index.json"), "w", encoding="utf8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print(f"{len(index)} pintores con historia -> app/data/historias/")
    if os.path.isfile(catalog):
        share_pages.main()  # sus páginas para compartir (vista previa en WhatsApp)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
