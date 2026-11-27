"""Valida app/data/catalog.json (+ catalog-text.json y catalog-ficha.json) contra el contrato de docs/SPEC.md §4 y §4 ter.

Uso: python3 -I tools/validate_catalog.py <dir_app> [<dir_imagenes>]   (código de salida != 0 si hay errores)
  dir_imagenes: si se da, comprueba además que cada obra tiene su w<QID>.jpg con las medidas del catálogo
  y que las hojas del atlas de <dir_app>/img/s (si existen) tienen el tamaño declarado.
Las imágenes no están en el repo (se bajan de la release al desplegar: tools/fetch_images.sh) ni el atlas
(tools/make_atlas.py), así que sin dir_imagenes solo se valida lo que hay en el repo.
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_layout import layout, packed_size  # noqa: E402

FIRST_TRAMO = 4  # «Nace el Renacimiento»: Botticelli, Masaccio, Piero y Berruguete
# Techo de archivos de app/ ya desplegada. El número original (512 por versión) era de cuando la app era un artifact; en Render
# (sitio estático) no hay límite de archivos. Hoy es un techo de cordura: repo (~630) + 86 hojas del atlas + ~190 imágenes og
# de compartir, generadas al desplegar, rondan los 900.
MAX_APP_FILES = 1000
# Pintores invitados con menos de 3 obras por falta de imágenes: aviso (no error) hasta traerlas con el pipeline.
PENDING_WORKS = {}
LOOK_MAX = 100
MIN_PATH_LEVEL1 = 4          # obras de nivel 1 sin spoiler de un pintor con etapa
STAGE_CATEGORIES = ("gran-maestro", "maestro")
CATEGORIES = STAGE_CATEGORIES + ("invitado", "rama")
ERAS = {"menu", "gothic", "renaissance", "northern", "baroque", "rococo", "neoclassic", "romantic", "realism",
        "impressionism", "postimpressionism", "modern"}
errors = []
warnings = []


def err(msg):
    errors.append(msg)


def check(cond, msg):
    if not cond:
        err(msg)


def name_tokens(artist):
    """Palabras del nombre que delatarían al autor (se ignoran partículas cortas: «de», «El»…)."""
    words = set()
    for part in (artist["name"], artist["short"]):
        words.add(part.lower())
        words.update(t.lower() for t in re.split(r"[\s.\-]+", part) if len(t) >= 4)
    return words


def check_look(wid, look, kind, title, artist):
    if not (isinstance(look, str) and look.strip() and "\n" not in look):
        err(f"{wid}: look vacío o con saltos de línea")
        return
    check(len(look) <= LOOK_MAX, f"{wid}: look de {len(look)} caracteres (máx. {LOOK_MAX})")
    low = look.lower()
    words = set(re.findall(r"\w+", low))
    # Un cuadro atípico se presenta como «No parece un X…»: ahí nombrar al autor es el sentido de la pista.
    if artist and kind != "atipico":
        bad = [t for t in name_tokens(artist) if (t in words if " " not in t else t in low)]
        check(not bad, f"{wid}: el look nombra al autor ({bad})")
    t = re.sub(r"\s*\(.*?\)", "", title).strip().lower()
    check(t not in low, f"{wid}: el look nombra el título")


def check_level_ring(app, artist, ws):
    """Aro de niveles (engine/level-ring.js): un tramo y un círculo por nivel, tenga o no historia. Cada etapa lleva su título
    corto (`short`, ≤ 12 letras, distinto en cada nivel): el `stage` de su historia si la tiene (único origen) y, si no, el de
    tools/catalog_data.py STAGE_SHORT o su nombre. Una historia de nivel «a fondo» tiene su etapa."""
    path = f"{app}/data/historias/{artist['id']}.json"
    story = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    told = {lv["level"]: lv.get("stage", "") for lv in story.get("levels", [])}
    deep = [s for s in artist["stages"] if any(w["level"] == s["id"] for w in ws)]
    for s in artist["stages"]:
        short = s.get("short", "")
        check(0 < len(short) <= 12, f"{artist['id']}: etapa {s['id']} sin título corto de ≤ 12 letras ({short!r})")
        check(s["id"] not in told or short == told[s["id"]], f"{artist['id']}: etapa {s['id']} con título corto distinto del de su historia")
    shorts = [s.get("short") for s in deep]
    check(len(shorts) == len(set(shorts)), f"{artist['id']}: dos niveles con el mismo título corto {shorts}")
    check(all(lv == 1 or any(s["id"] == lv for s in deep) for lv in told), f"{artist['id']}: historia de un nivel sin etapa")


def main():
    app = sys.argv[1]
    imgs = sys.argv[2] if len(sys.argv) > 2 else None
    cat = json.load(open(f"{app}/data/catalog.json", encoding="utf-8"))
    text = json.load(open(f"{app}/data/catalog-text.json", encoding="utf-8"))
    ficha = json.load(open(f"{app}/data/catalog-ficha.json", encoding="utf-8"))
    check(cat.get("version") == 2, "catalog.json: version debe ser 2")
    check(text.get("version") == 3, "catalog-text: version debe ser 3")
    for k in ("look", "looks", "kind", "tags", "curio"):
        check(not any(k in w for w in cat["artworks"]), f"catalog.json no debe llevar {k} (va en catalog-text.json)")
    for k in ("traits", "traitTags"):
        check(not any(k in a for a in cat["artists"]), f"catalog.json no debe llevar {k} de pintor")
    # Ninguna obra de pipeline/excluir.json (claves QID o w<número>) puede llegar al catálogo de la app.
    excl_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pipeline", "excluir.json")
    excluded = {re.sub(r"^Q(?=\d+$)", "w", k) for k in json.load(open(excl_path, encoding="utf-8"))}
    for w in cat["artworks"]:
        check(w["id"] not in excluded, f"{w['id']}: está en pipeline/excluir.json y no debe estar en el catálogo")
    labels = text.get("tagLabels", {})
    check(isinstance(labels, dict) and labels, "catalog-text: falta tagLabels")
    check(set(text.get("negableTags", [])) <= set(labels), "catalog-text: negableTags fuera del vocabulario")

    # --- Movimientos ---
    mids = [m["id"] for m in cat["movements"]]
    check(len(mids) == len(set(mids)), "ids de movimiento repetidos")
    check(len({m["order"] for m in cat["movements"]}) == len(mids), "order de movimientos repetido")
    mov = {m["id"]: m for m in cat["movements"]}
    for m in cat["movements"]:
        for k in ("id", "name", "period", "order", "era", "blurb", "accent"):
            check(k in m, f"movimiento {m.get('id')} sin {k}")
        check(m.get("era") in ERAS, f"era inválida en {m['id']}")
        check(re.fullmatch(r"#[0-9a-fA-F]{6}", m.get("accent", "")), f"accent inválido en {m['id']}")
        check(re.fullmatch(r"[a-z0-9-]+", m["id"]), f"id de movimiento no ASCII-plano: {m['id']}")
        t = m.get("traits")
        check(isinstance(t, list) and 1 <= len(t) <= 4 and all(isinstance(x, str) and x.strip() for x in t),
              f"traits de movimiento ausentes o inválidos en {m['id']}")
        if m.get("branch"):
            check(m.get("opensAt") in mov and not mov[m["opensAt"]].get("branch"), f"{m['id']}: opensAt inválido")
        else:
            check("opensAt" not in m, f"{m['id']}: opensAt solo en ramas")
    check(len({m["accent"].lower() for m in cat["movements"]}) == len(mids), "accent repetido")

    # --- Pintores ---
    aids = [a["id"] for a in cat["artists"]]
    check(len(aids) == len(set(aids)), "ids de pintor repetidos")
    by_id = {a["id"]: a for a in cat["artists"]}
    works = defaultdict(list)
    for w in cat["artworks"]:
        works[w["artistId"]].append(w)
    orders = defaultdict(list)
    for a in cat["artists"]:
        for k in ("id", "name", "short", "movementId", "born", "died", "country", "order", "guest", "category",
                  "onPath", "stages", "branches", "hint", "similarTo"):
            check(k in a, f"pintor {a.get('id')} sin {k}")
        check(a["movementId"] in mids, f"movimiento inexistente en {a['id']}")
        check(a["died"] < 1956, f"{a['id']} murió en {a['died']} (>=1956)")
        check(a["category"] in CATEGORIES, f"{a['id']}: categoría {a['category']}")
        orders[a["movementId"]].append(a["order"])
        ws = works.get(a["id"], [])
        check(len(ws) > 0, f"{a['id']} sin obras")
        stage = a["category"] in STAGE_CATEGORIES
        check(a["guest"] == (not stage), f"{a['id']}: guest no casa con la categoría")
        fame3 = any(w["fame"] == 3 for w in ws)
        in_branch = bool(mov.get(a["movementId"], {}).get("branch"))
        # Camino común: grandes maestros, maestros e invitados con alguna obra icónica; nunca las ramas (un gran maestro de
        # rama, como Giotto en el Gótico, tiene niveles pero no es parada del camino).
        check(a["onPath"] == ((stage and not in_branch) or (a["category"] == "invitado" and fame3)), f"{a['id']}: onPath no sigue la regla")
        l1 = [w for w in ws if w["level"] == 1 and not w.get("spoiler") and not w.get("attributed")]
        if stage:
            check(len(l1) >= MIN_PATH_LEVEL1, f"{a['id']}: {len(l1)} obras de nivel 1 sin spoiler (mín. {MIN_PATH_LEVEL1})")
            roles = Counter(w["role"] for w in ws if w["level"] == 1)
            check(roles["learn"] >= 3 and roles["new"] >= 3, f"{a['id']}: roles de nivel 1 {dict(roles)}")
            check(not in_branch or a["category"] == "gran-maestro", f"{a['id']}: en una rama solo un gran maestro tiene etapa")
        else:
            if len(ws) < 3 and a["id"] in PENDING_WORKS:
                warnings.append(f"{a['id']}: solo {len(ws)} obras; pendiente: {PENDING_WORKS[a['id']]}")
            else:
                check(len(ws) >= 3, f"{a['id']}: menos de 3 obras")
        check(all(w["role"] == "new" for w in ws if w["level"] > 1), f"{a['id']}: obra «a fondo» con role learn")
        levels = {s["id"] for s in a["stages"]}
        check(all(w["level"] == 1 or w["level"] in levels for w in ws), f"{a['id']}: obra de un nivel sin etapa")
        for s in a["stages"]:
            check(s["id"] >= 2 and all(k in s for k in ("id", "name", "from", "to", "source")), f"{a['id']}: etapa mal formada {s}")
            check(s.get("provisional") or s.get("source"), f"{a['id']}: etapa {s['id']} sin fuente")
        for s in a["similarTo"]:
            check(s in by_id and s != a["id"], f"similarTo inválido en {a['id']}: {s}")
        check_level_ring(app, a, ws)
        check(isinstance(a["hint"], str) and "\n" not in a["hint"], f"hint de {a['id']}")
        if a["hint"]:
            check(a["hint"].startswith("Fíjate en"), f"hint de {a['id']} debe empezar por «Fíjate en»")
        if "section" in a:
            check(stage and isinstance(a["section"], str) and a["section"].strip(), f"{a['id']}: section solo en pintores con etapa")
    for mid, os_ in orders.items():
        check(len(os_) == len(set(os_)), f"order repetido en movimiento {mid}")
    path = sorted((a for a in cat["artists"] if a["category"] in STAGE_CATEGORIES and a["onPath"]), key=lambda a: (mov[a["movementId"]]["order"], a["order"]))
    ids = [a["id"] for a in path]
    check(ids[:1] == ["botticelli"] and ids[FIRST_TRAMO:FIRST_TRAMO + 3] == ["leonardo", "miguel-angel", "rafael"],
          f"el camino abre con Botticelli; Leonardo, Miguel Ángel y Rafael justo después del primer tramo ({FIRST_TRAMO} paradas)")
    # Los tramos de un movimiento son contiguos en el orden del camino.
    for mid in mids:
        stage = [a for a in path if a["movementId"] == mid]
        secs = [a.get("section") for a in stage]
        runs = [s for i, s in enumerate(secs) if s and (i == 0 or s != secs[i - 1])]
        check(len(runs) == len(set(runs)), f"{mid}: tramos no contiguos {runs}")

    # --- Ramas: cronológicas por dentro y con el tramo en que se abre cada pintor ---
    bids = [b["id"] for b in cat["branches"]]
    check(len(bids) == len(set(bids)), "ids de rama repetidos")
    for b in cat["branches"]:
        check(b["artists"] and all(x in by_id for x in b["artists"]), f"rama {b['id']}: pintores inexistentes")
        born = [by_id[x]["born"] for x in b["artists"]]
        check(born == sorted(born), f"rama {b['id']}: no cronológica por nacimiento")
        flat = [x for t in b["tramos"] for x in t["artists"]]
        check(sorted(flat) == sorted(b["artists"]), f"rama {b['id']}: tramos no cubren a sus pintores")
        orders_ = [mov[t["opensAt"]]["order"] for t in b["tramos"]]
        check(orders_ == sorted(orders_) and b["opensAt"] == b["tramos"][0]["opensAt"], f"rama {b['id']}: tramos desordenados")
        check(all(t["opensAt"] in mov and not mov[t["opensAt"]].get("branch") for t in b["tramos"]), f"rama {b['id']}: tramo en una rama")
        for x in b["artists"]:
            check(b["id"] in by_id[x]["branches"], f"{x}: no lista la rama {b['id']}")
    off_path = {a["id"] for a in cat["artists"] if not a["onPath"]}
    in_discover = {x for b in cat["branches"] if b["kind"] == "epoca" for x in b["artists"]}
    check(in_discover <= off_path and {x for x in off_path if by_id[x]["category"] == "invitado"} <= in_discover,
          "los invitados fuera del camino van, todos y solo ellos, en las ramas «Descubre…»")

    # --- Obras ---
    wids = [w["id"] for w in cat["artworks"]]
    check(len(wids) == len(set(wids)), "ids de obra repetidos")
    for w in cat["artworks"]:
        check(re.fullmatch(r"w\d+", w["id"]), f"{w['id']}: id no w<QID>")
        check(w["artistId"] in by_id, f"{w['id']}: artista inexistente")
        check(w["yearSort"] < 1930 and isinstance(w["yearSort"], int), f"{w['id']}: yearSort {w['yearSort']}")
        check(w["fame"] in (1, 2, 3), f"{w['id']}: fame inválida")
        check(w["role"] in ("learn", "new"), f"{w['id']}: role inválido")
        check(w["confidence"] in ("high", "medium"), f"{w['id']}: confidence inválida")
        check(isinstance(w["level"], int) and w["level"] >= 1, f"{w['id']}: level inválido")
        check(w["title"].strip() and w["year"].strip(), f"{w['id']}: título/año vacío")
        check(isinstance(w["inSpain"], bool), f"{w['id']}: inSpain debe ser booleano")
        check("spoiler" not in w or w["spoiler"] is True, f"{w['id']}: spoiler debe ser true u omitirse")
        check("attributed" not in w or w["attributed"] is True, f"{w['id']}: attributed debe ser true u omitirse")
        if w.get("spoiler") or w.get("attributed"):
            check(w["level"] != 1 or w["role"] == "learn" or by_id[w["artistId"]]["category"] not in STAGE_CATEGORIES,
                  f"{w['id']}: obra de nivel 1 imposible de preguntar y sin «Conoce a»")
        if "focus" in w:
            f = w["focus"]
            check(isinstance(f, list) and len(f) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in f),
                  f"{w['id']}: focus debe ser [x, y] entre 0 y 1")
    # --- Textos y ficha ---
    known = set(wids)
    for k in ("look", "looks", "kind", "tags", "curio"):
        check(set(text.get(k, {})) <= known, f"catalog-text: {k} de obras inexistentes")
    work_by_id = {w["id"]: w for w in cat["artworks"]}
    for wid, look in text.get("look", {}).items():
        w = work_by_id[wid]
        check_look(wid, look, text.get("kind", {}).get(wid), w["title"], by_id.get(w["artistId"]))
    for wid, kind in text.get("kind", {}).items():
        check(kind in ("tipico", "atipico", "memoria"), f"{wid}: kind desconocido")
    for wid, looks in text.get("looks", {}).items():
        check(1 <= len(looks) <= 2 and looks[0]["text"] == text["look"].get(wid), f"{wid}: looks no empieza por look")
    for wid, tags in text.get("tags", {}).items():
        check(all(t in labels for t in tags.split()), f"{wid}: tags fuera del vocabulario")
    for aid, tt in text.get("traitTags", {}).items():
        check(aid in by_id and len(tt) == 1 + len(text.get("traits", {}).get(aid, [])), f"{aid}: traitTags no alineado con [hint, *traits]")
        check(all(t in labels for g in tt for t in g.split()), f"{aid}: traitTags fuera del vocabulario")
    check(set(ficha.get("ficha", {})) == known, "catalog-ficha: no cubre exactamente las obras")
    for wid, c in text.get("curio", {}).items():
        check(isinstance(c.get("text"), str) and 0 < len(c["text"]) <= 240, f"{wid}: curio vacío o de más de 240 letras")
    for wid, f in ficha.get("ficha", {}).items():
        if "about" in f:
            check(f["about"].get("text") and all(isinstance(t, str) and t for t in f["about"]["text"]), f"{wid}: about sin párrafos")
        check(f.get("source", {}).get("wikidata", "").startswith("Q"), f"{wid}: ficha sin fuente de Wikidata")

    # --- Atlas: las coordenadas son función del catálogo ---
    atlas, thumbs = layout(cat)
    check(cat.get("atlas") == atlas, "atlas distinto del que sale de tools/atlas_layout.py (regenera el catálogo)")
    for w in cat["artworks"]:
        check(w.get("thumb") == thumbs[w["id"]], f"{w['id']}: thumb distinto del atlas")
    check(sorted({w["thumb"][0] for w in cat["artworks"]}) == list(range(len(atlas["sheets"]))), "hojas del atlas sin usar")

    # --- Imágenes y hojas (solo si se da la carpeta) ---
    if imgs:
        from PIL import Image
        for w in cat["artworks"]:
            path_ = f"{imgs}/{w['id']}.jpg"
            if not os.path.isfile(path_):
                err(f"{w['id']}: falta {path_}")
                continue
            with Image.open(path_) as im:
                check(im.size == packed_size(w["w"], w["h"]), f"{w['id']}: mide {im.size}, el catálogo espera {packed_size(w['w'], w['h'])}")
                check(not im.getexif(), f"{w['id']}: lleva EXIF")
            hd = w.get("hd")
            if hd:  # HD de los detalles de las historias (paso «hd» del proceso): en <imgs>/hd/
                hd_path = f"{imgs}/hd/{w['id']}.jpg"
                if not os.path.isfile(hd_path):
                    err(f"{w['id']}: falta {hd_path}")
                    continue
                with Image.open(hd_path) as im:
                    check(list(im.size) == [hd["w"], hd["h"]], f"{w['id']}: la HD mide {im.size}, el catálogo espera {hd['w']}x{hd['h']}")
        for k, src in enumerate(atlas["sheets"]):
            p = f"{app}/{src}"
            if os.path.isfile(p):
                with Image.open(p) as im:
                    check(list(im.size) == atlas["size"][k], f"{src}: tamaño {im.size} ≠ {atlas['size'][k]}")
                    check(im.format == "JPEG" and not im.getexif(), f"{src}: no es JPEG limpio")
    app_files = sum(len(fs) for _, _, fs in os.walk(app))
    check(app_files < MAX_APP_FILES, f"{app_files} archivos en {app} (límite {MAX_APP_FILES})")

    for w_ in warnings:
        print(f"aviso: {w_}")
    if errors:
        print(f"{len(errors)} ERRORES")
        print("\n".join(errors))
        sys.exit(1)
    cats = Counter(a["category"] for a in cat["artists"] if a["onPath"])
    print(f"OK: {len(cat['movements'])} movimientos, {len(aids)} pintores (camino: {dict(cats)}), {len(wids)} obras, "
          f"{len(cat['branches'])} ramas, atlas de {len(atlas['sheets'])} hojas, {app_files} archivos en la app; "
          f"{sum(1 for w in cat['artworks'] if w.get('spoiler'))} con spoiler; "
          f"{sum(1 for w in cat['artworks'] if w.get('attributed'))} atribuidas")


main()
