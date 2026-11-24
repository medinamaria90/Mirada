"""Monta app/data/catalog.json a partir de los datos curados de catalog_data.py.

Lo usan build_catalog.py (tras procesar las imágenes del dataset) y patch_catalog.py (sin tocar
imágenes): ambos llaman a build(sizes) con las medidas reales de cada imagen, así que regenerar
nunca pierde campos. Incluye los campos de las oleadas 3 y 4 (thumb, spoiler, section, traits de
movimiento, look) y la regla de etapas (catalog_data.is_guest).
"""
import json, os
import catalog_data as D

# Posición de cada miniatura en las hojas del atlas (la escribe make_atlas.py).
LAYOUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "atlas_layout.json")
# Textos que la app no necesita para pintar la primera pantalla: van en data/catalog-text.json.
TEXT_FILE = "catalog-text.json"
ARTWORK_KEYS = ["id", "artistId", "title", "year", "yearSort", "img", "thumb", "w", "h", "role", "fame",
                "confidence", "spoiler", "attributed", "focus", "look"]
ARTIST_KEYS = ["id", "name", "short", "movementId", "born", "died", "country", "order", "guest",
               "section", "hint", "traits", "similarTo"]


def all_works():
    """Todas las obras curadas como (id, artista, título, año, yearSort, fame, role, confidence)."""
    return [(f"a{w[0]}",) + tuple(w[1:]) for w in D.W] + [tuple(w) for w in D.WB]


def build(sizes):
    """sizes: id de obra -> (w, h) de app/img/<id>.jpg. Devuelve el catálogo completo."""
    works = all_works()
    ids = [w[0] for w in works]
    assert len(ids) == len(set(ids)), "obra repetida"
    count = {}
    for w in works:
        assert w[1] in D.A, f"pintor desconocido: {w[1]}"
        count[w[1]] = count.get(w[1], 0) + 1

    movements = []
    for i, n, p, o, e, b, c in D.MOVEMENTS:
        m = dict(id=i, name=n, period=p, order=o, era=e, blurb=b, accent=c)
        if i in D.MOVEMENT_TRAITS:
            m["traits"] = list(D.MOVEMENT_TRAITS[i])
        movements.append(m)
    mov_order = {m["id"]: m["order"] for m in movements}

    artists = []
    for a in D.A.values():
        if not count.get(a["id"]):
            raise SystemExit(f"pintor sin obras: {a['id']}")
        a = dict(a, guest=D.is_guest(a["id"], count[a["id"]]))
        if a["id"] in D.SECTIONS and not a["guest"]:
            a["section"] = D.SECTIONS[a["id"]]
        artists.append({k: a[k] for k in ARTIST_KEYS if k in a})
    artists.sort(key=lambda a: (mov_order[a["movementId"]], a["order"]))
    guest = {a["id"]: a["guest"] for a in artists}

    artworks = []
    for wid, aid, title, year, ysort, fame, role, conf in works:
        w_, h_ = sizes[wid]
        w = dict(id=wid, artistId=aid, title=title, year=year, yearSort=ysort,
                 img=f"img/{wid}.jpg", w=w_, h=h_,
                 role="new" if guest[aid] else role, fame=fame, confidence=conf)
        if wid in D.SPOILERS:
            w["spoiler"] = True
        if wid in getattr(D, "ATTRIBUTED", ()):
            w["attributed"] = True
        if wid in D.LOOK:
            w["look"] = D.LOOK[wid]
        if wid in getattr(D, "FOCUS", {}):
            w["focus"] = [round(float(v), 3) for v in D.FOCUS[wid]]
        artworks.append({k: w[k] for k in ARTWORK_KEYS if k in w})
    rank = {a["id"]: i for i, a in enumerate(artists)}
    artworks.sort(key=lambda w: (rank[w["artistId"]], w["yearSort"], w["id"]))
    return dict(version=1, movements=movements, artists=artists, artworks=artworks)


def write_catalog(app, cat):
    """Añade el atlas de miniaturas y escribe data/catalog.json (compacto, sin `look` ni `traits`
    de pintor) y data/catalog-text.json (esos textos, que la app pide después de pintar)."""
    with open(LAYOUT_PATH, encoding="utf-8") as f:
        layout = json.load(f)
    missing = [w["id"] for w in cat["artworks"] if w["id"] not in layout["thumbs"]]
    if missing:
        raise SystemExit(f"obras sin miniatura en el atlas: {missing[:5]}… (bash tools/make_thumbs.sh app)")
    core = dict(version=cat["version"], atlas=layout["atlas"], movements=cat["movements"], artists=[], artworks=[])
    text = dict(version=1, look={}, traits={})
    for a in cat["artists"]:
        text["traits"][a["id"]] = a["traits"]
        core["artists"].append({k: v for k, v in a.items() if k != "traits"})
    for w in cat["artworks"]:
        if "look" in w:
            text["look"][w["id"]] = w["look"]
        core["artworks"].append(dict({k: v for k, v in w.items() if k != "look"}, thumb=layout["thumbs"][w["id"]]))
    for name, data in (("catalog.json", core), (TEXT_FILE, text)):
        with open(f"{app}/data/{name}", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
            f.write("\n")
    return core, text


def apply_extras(catalog, sizes_from_files=None):
    """Compatibilidad: regenera el catálogo con las medidas que ya tiene `catalog` (y, para obras
    nuevas, las que dé sizes_from_files(id))."""
    sizes = {w["id"]: (w["w"], w["h"]) for w in catalog.get("artworks", [])}
    for w in all_works():
        if w[0] not in sizes:
            if sizes_from_files is None:
                raise SystemExit(f"sin medidas para {w[0]}")
            sizes[w[0]] = sizes_from_files(w[0])
    return build(sizes)
