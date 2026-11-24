"""Validaciones del catálogo (catalogo/obras.json). Sale con código 1 si hay errores.
Uso: validate.py [--parcial]   (--parcial: no exige que toda la selección esté descargada ni con ficha)"""
import os, re, struct, sys
from lib import *

EN = re.compile(r"\b(the|of|with|and|portrait|lady|young|woman|girl|boy|saint|still life|landscape|view|holy)\b", re.I)
# Nivel básico por categoría (propuesta de pintores): mínimo y máximo (las icónicas forzadas pueden pasar del cupo)
LEVEL1 = {"gran-maestro": (8, 11), "maestro": (7, 9), "invitado": (3, 5)}
FONDO_MIN, FONDO_AVISO = 3, 5  # «a fondo»: error por debajo de 3 obras, aviso por debajo de 5


def jpeg_size(path):
    with open(path, "rb") as f:
        d = f.read()
    i = 2
    while i < len(d):
        if d[i] != 0xFF:
            i += 1; continue
        m = d[i + 1]
        if m in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", d[i + 5:i + 9]); return w, h
        i += 2 + struct.unpack(">H", d[i + 2:i + 4])[0]
    return None


def main():
    parcial = "--parcial" in sys.argv
    cat = load(os.path.join(CAT, "obras.json"), {})
    obras = cat.get("artworks", [])
    pintores = {p["id"]: p for p in cat.get("artists", [])}
    movs = {m["id"] for m in cat.get("movements", [])}
    err, warn = [], []
    POCAS = set()
    ids = [o["id"] for o in obras]
    if len(ids) != len(set(ids)):
        err.append("ids repetidos: %s" % sorted({i for i in ids if ids.count(i) > 1}))
    qids = [o["source"]["wikidata"] for o in obras]
    if len(qids) != len(set(qids)):
        err.append("QID repetidos")
    files = [o["source"]["file"] for o in obras]
    if len(files) != len(set(files)):
        err.append("archivo de Commons repetido")
    for p in pintores.values():
        if p["died"] >= 1956:
            err.append(f"pintor muerto en 1956 o después: {p['id']} ({p['died']})")
        if p["movementId"] not in movs:
            err.append(f"{p['id']}: movimiento desconocido {p['movementId']}")
        if not p["order"]:
            err.append(f"{p['id']}: sin order")
        n1 = p.get("level1", 0)
        cat = p.get("category")
        if cat not in LEVEL1:
            err.append(f"{p['id']}: categoría desconocida {cat}")
        else:
            lo, hi = LEVEL1[cat]
            if p["id"] in POCAS and n1 >= 3:
                lo = 3  # tope de candidatas aptas (Fedótov, Gisbert…)
            if not (lo <= n1 <= hi):
                err.append(f"{p['id']}: {n1} obras de nivel 1 ({cat}: entre {lo} y {hi})")
        for st in p.get("stages", []):
            if not st.get("fuente") and not st.get("provisional"):
                err.append(f"{p['id']}: etapa «{st['nombre']}» sin fuente")
            n = sum(1 for o in obras if o["artistId"] == p["id"] and o["level"] == st["nivel"])
            if n < FONDO_MIN:
                err.append(f"{p['id']}: nivel {st['nivel']} «{st['nombre']}» con {n} obras (mínimo {FONDO_MIN})")
            elif n < FONDO_AVISO:
                warn.append(f"{p['id']}: nivel {st['nivel']} «{st['nombre']}» con {n} obras (< {FONDO_AVISO}: faltan candidatas)")
    for o in obras:
        p = pintores.get(o["artistId"])
        tag = f"{o['id']} ({o['artistId']})"
        if not p:
            err.append(f"{tag}: pintor inexistente"); continue
        path = os.path.join(CAT, o["img"])
        if o["downloaded"] and os.path.exists(path):  # las imágenes viven en la release; aquí solo si están en local
            wh = jpeg_size(path)
            if not wh:
                err.append(f"{tag}: no es un JPEG válido")
            elif max(wh) < 1000:
                err.append(f"{tag}: imagen pequeña {wh}")
            elif list(wh) != [o["w"], o["h"]]:
                err.append(f"{tag}: w/h no casan con el archivo")
        elif not o["downloaded"] and not parcial:
            err.append(f"{tag}: imagen sin descargar")
        y = o["yearSort"]
        if not y or y >= 1930 or y < p["born"] or y > p["died"] + 1:
            err.append(f"{tag}: año fuera de rango ({o['year']} / {y})")
        if not o["title"].strip():
            err.append(f"{tag}: título vacío")
        if o["level"] != 1 and o["level"] not in {st["nivel"] for st in p.get("stages", [])}:
            err.append(f"{tag}: level inválido {o['level']}")
        if o["titleSource"] in ("traducir", "revisar-idioma"):
            if o["confidence"] != "medium":
                err.append(f"{tag}: título por traducir sin marcar")
            else:
                warn.append(f"{tag}: título pendiente de traducir: {o['title']}")
        elif EN.search(o["title"]) and o["titleSource"] == "wikidata-es":
            warn.append(f"{tag}: título quizá en inglés: {o['title']}")
        if not o["source"].get("license"):
            warn.append(f"{tag}: licencia no indicada en Commons")
        if "sin-ficha" in o["warnings"]:
            (warn if parcial else err).append(f"{tag}: sin ficha de Wikidata")
        else:
            for k in ("museum", "technique", "dimensions"):
                if not o.get(k):
                    warn.append(f"{tag}: ficha sin {k}")
    size = sum(os.path.getsize(os.path.join(CAT, o["img"])) for o in obras if os.path.exists(os.path.join(CAT, o["img"])))
    print(f"validate: {len(obras)} obras ({sum(1 for o in obras if o['downloaded'])} con imagen), {len(pintores)} pintores, "
          f"imágenes {size/1e6:.1f} MB; {len(err)} errores, {len(warn)} avisos")
    for e in err[:120]:
        print("ERROR", e)
    for w in warn[:60]:
        print("aviso", w)
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    main()
