"""Valida app/data/catalog.json contra el contrato del §4 de docs/SPEC.md.

Uso: python3 -I validate_catalog.py <dir_app>   (código de salida != 0 si hay errores)

Reglas de etapas (oleada 4): un pintor tiene etapa propia (guest=false) con ≥3 obras; con 3 obras,
2 «learn» + 1 «new». Como máximo 4 pintores rusos con etapa: el resto de rusos son invitados
aunque tengan ≥3 obras.
"""
import json, os, re, sys
from collections import Counter, defaultdict
from PIL import Image

MIN_STAGE_WORKS = 3
MAX_APP_FILES = 320          # límite propio (el artifact admite 512 archivos por versión)
MAX_SHEETS = 24
MAX_STAGE_RUSSIANS = 4
LOOK_MAX = 100
ERAS = {"menu", "renaissance", "baroque", "rococo", "neoclassic", "romantic", "realism",
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


def check_look(w, artist):
    look = w["look"]
    if not (isinstance(look, str) and look.strip() and "\n" not in look):
        err(f"{w['id']}: look vacío o con saltos de línea")
        return
    check(len(look) <= LOOK_MAX, f"{w['id']}: look de {len(look)} caracteres (máx. {LOOK_MAX})")
    low = look.lower()
    words = set(re.findall(r"\w+", low))
    if artist:
        bad = [t for t in name_tokens(artist) if (t in words if " " not in t else t in low)]
        check(not bad, f"{w['id']}: el look nombra al autor ({bad})")
    title = re.sub(r"\s*\(.*?\)", "", w["title"]).strip().lower()
    check(title not in low, f"{w['id']}: el look nombra el título")


def check_atlas(app, atlas):
    """Hojas del atlas: existen, sin metadatos y con el tamaño declarado. Devuelve sus tamaños."""
    sheets = atlas.get("sheets")
    if not (isinstance(sheets, list) and sheets and isinstance(atlas.get("cell"), int)):
        err("falta el atlas de miniaturas (bash tools/make_thumbs.sh app)")
        return []
    check(len(sheets) <= MAX_SHEETS, f"{len(sheets)} hojas en el atlas (máx. {MAX_SHEETS})")
    check(len(atlas.get("size", [])) == len(sheets), "atlas.size no cuadra con atlas.sheets")
    sizes = []
    for i, src in enumerate(sheets):
        check(re.fullmatch(r"img/s/[a-z0-9]+\.jpg", src), f"ruta de hoja rara: {src}")
        path = f"{app}/{src}"
        if not os.path.isfile(path):
            err(f"falta la hoja {src}")
            sizes.append((0, 0))
            continue
        with Image.open(path) as im:
            sizes.append(im.size)
            check(list(im.size) == list(atlas["size"][i]), f"{src}: tamaño {im.size} ≠ {atlas['size'][i]}")
            check(im.format == "JPEG" and not im.getexif() and "icc_profile" not in im.info, f"{src}: no es JPEG limpio")
    return sizes


def check_thumb(w, atlas, sheet_sizes):
    t = w.get("thumb")
    if not (isinstance(t, list) and len(t) == 5 and all(isinstance(v, int) for v in t)):
        err(f"{w['id']}: thumb debe ser [hoja, x, y, w, h]")
        return
    k, x, y, tw, th = t
    if not (0 <= k < len(sheet_sizes)):
        err(f"{w['id']}: hoja {k} inexistente")
        return
    sw, sh = sheet_sizes[k]
    cell = atlas["cell"]
    check(x >= 0 and y >= 0 and x + tw <= sw and y + th <= sh, f"{w['id']}: miniatura fuera de la hoja")
    check(x // cell == (x + tw - 1) // cell and y // cell == (y + th - 1) // cell, f"{w['id']}: miniatura entre dos celdas")
    check(tw <= cell - 4 and th <= cell - 4 and max(tw, th) >= cell // 2, f"{w['id']}: miniatura de {tw}×{th}")
    check(abs(tw / th - w["w"] / w["h"]) <= 0.03 * (w["w"] / w["h"]) + 0.01, f"{w['id']}: miniatura sin las proporciones del cuadro")


def main():
    app = sys.argv[1]
    cat = json.load(open(f"{app}/data/catalog.json", encoding="utf-8"))
    # Textos aparte (data/catalog-text.json): `look` de obra y `traits` de pintor.
    text = json.load(open(f"{app}/data/catalog-text.json", encoding="utf-8"))
    check(text.get("version") == 1, "catalog-text: version debe ser 1")
    check(not any("look" in w for w in cat["artworks"]), "catalog.json no debe llevar look (va en catalog-text.json)")
    check(not any("traits" in a for a in cat["artists"]), "catalog.json no debe llevar traits de pintor")
    for a in cat["artists"]:
        a["traits"] = text.get("traits", {}).get(a["id"], [])
    known = {w["id"] for w in cat["artworks"]}
    check(set(text.get("look", {})) <= known, "catalog-text: look de obras inexistentes")
    for w in cat["artworks"]:
        if w["id"] in text.get("look", {}):
            w["look"] = text["look"][w["id"]]
    check(cat.get("version") == 1, "version debe ser 1")
    mids = [m["id"] for m in cat["movements"]]
    check(len(mids) == len(set(mids)), "ids de movimiento repetidos")
    check(len({m["order"] for m in cat["movements"]}) == len(mids), "order de movimientos repetido")
    for m in cat["movements"]:
        for k in ("id", "name", "period", "order", "era", "blurb", "accent"):
            check(k in m, f"movimiento {m.get('id')} sin {k}")
        check(m.get("era") in ERAS, f"era inválida en {m['id']}")
        check(re.fullmatch(r"#[0-9a-fA-F]{6}", m.get("accent", "")), f"accent inválido en {m['id']}")
        check(re.fullmatch(r"[a-z0-9-]+", m["id"]), f"id de movimiento no ASCII-plano: {m['id']}")
    check(len({m["accent"].lower() for m in cat["movements"]}) == len(mids), "accent repetido")
    for m in cat["movements"]:
        t = m.get("traits")
        check(isinstance(t, list) and 1 <= len(t) <= 4 and all(isinstance(x, str) and x.strip() for x in t),
              f"traits de movimiento ausentes o inválidos en {m['id']}")
        check(isinstance(m.get("blurb"), str) and m["blurb"].strip(), f"blurb vacío en {m['id']}")

    aids = [a["id"] for a in cat["artists"]]
    check(len(aids) == len(set(aids)), "ids de pintor repetidos")
    works = defaultdict(list)
    for w in cat["artworks"]:
        works[w["artistId"]].append(w)
    stage_ids = {a["id"] for a in cat["artists"] if not a.get("guest")}
    russians = sorted(a["id"] for a in cat["artists"] if not a.get("guest") and a.get("country") == "Rusia")
    check(len(russians) <= MAX_STAGE_RUSSIANS, f"{len(russians)} pintores rusos con etapa (máx. {MAX_STAGE_RUSSIANS}): {russians}")
    orders = defaultdict(list)
    for a in cat["artists"]:
        for k in ("id", "name", "short", "movementId", "born", "died", "country", "order",
                  "guest", "hint", "traits", "similarTo"):
            check(k in a, f"pintor {a.get('id')} sin {k}")
        check(a["movementId"] in mids, f"movimiento inexistente en {a['id']}")
        check(a["died"] < 1956, f"{a['id']} murió en {a['died']} (>=1956)")
        check(isinstance(a["order"], int), f"order no entero en {a['id']}")
        orders[a["movementId"]].append(a["order"])
        ws = works.get(a["id"], [])
        check(len(ws) > 0, f"{a['id']} sin obras")
        if len(ws) < MIN_STAGE_WORKS:
            check(a["guest"], f"{a['id']}: con {len(ws)} obras debe ser invitado")
        elif a["guest"]:
            check(a["country"] == "Rusia",
                  f"{a['id']}: tiene {len(ws)} obras y no es ruso: debería tener etapa (guest=false)")
        for s in a["similarTo"]:
            check(s in aids and s != a["id"], f"similarTo inválido en {a['id']}: {s}")
        if not a["guest"]:
            roles = Counter(w["role"] for w in ws)
            check(roles["learn"] >= 2 and roles["new"] >= 1, f"{a['id']}: roles {dict(roles)}")
            check(roles["learn"] <= 3, f"{a['id']}: más de 3 learn")
            if len(ws) == 3:
                check(roles["learn"] == 2 and roles["new"] == 1, f"{a['id']}: con 3 obras se esperan 2 learn + 1 new")
            # Hace falta material sin firma legible para «¿Quién lo pintó?» en práctica y en cuadros nuevos.
            for r in ("learn", "new"):
                check(any(w["role"] == r and not w.get("spoiler") and not w.get("attributed") for w in ws),
                      f"{a['id']}: ninguna obra «{r}» sin spoiler ni atribución dudosa")
            check(a["hint"].startswith("Fíjate en") and "\n" not in a["hint"], f"hint de {a['id']}")
            check(len(a["traits"]) == 3, f"{a['id']}: se esperan 3 traits")
            check(len(a["similarTo"]) >= 1, f"{a['id']}: similarTo vacío")
            if a["similarTo"] and not any(s in stage_ids for s in a["similarTo"]):
                warnings.append(f"{a['id']}: ningún similarTo con etapa propia ({a['similarTo']})")
        else:
            check(a["hint"].strip() != "", f"{a['id']}: hint vacío")
        if "section" in a:
            check(not a["guest"] and isinstance(a["section"], str) and a["section"].strip(),
                  f"{a['id']}: section solo en pintores con etapa y con texto")
    for mid, os_ in orders.items():
        check(len(os_) == len(set(os_)), f"order repetido en movimiento {mid}")
    # Los tramos de un movimiento son contiguos en el orden del camino.
    for mid in mids:
        stage = sorted((a for a in cat["artists"] if a["movementId"] == mid and not a["guest"]), key=lambda a: a["order"])
        secs = [a.get("section") for a in stage]
        if any(secs):
            check(all(secs), f"{mid}: todos sus pintores con etapa necesitan section si alguno la tiene")
            runs = [s for i, s in enumerate(secs) if i == 0 or s != secs[i - 1]]
            check(len(runs) == len(set(runs)), f"{mid}: tramos no contiguos {runs}")
            check(len(stage) > 4, f"{mid}: con {len(stage)} pintores con etapa no debe haber tramos")

    by_id = {a["id"]: a for a in cat["artists"]}
    wids = [w["id"] for w in cat["artworks"]]
    check(len(wids) == len(set(wids)), "ids de obra repetidos")
    files = {f for f in os.listdir(f"{app}/img") if os.path.isfile(f"{app}/img/{f}")}
    check(not os.path.isdir(f"{app}/img/t"), "img/t/ ya no se usa (miniaturas en el atlas img/s/)")
    atlas = cat.get("atlas") or {}
    sheet_sizes = check_atlas(app, atlas)
    for w in cat["artworks"]:
        check(w["artistId"] in aids, f"{w['id']}: artista inexistente")
        check(w["yearSort"] < 1930, f"{w['id']}: yearSort {w['yearSort']} >= 1930")
        check(isinstance(w["yearSort"], int), f"{w['id']}: yearSort no entero")
        check(w["fame"] in (1, 2, 3), f"{w['id']}: fame inválida")
        check(w["role"] in ("learn", "new"), f"{w['id']}: role inválido")
        check(w["confidence"] in ("high", "medium"), f"{w['id']}: confidence inválida")
        check(w["title"].strip() and w["year"].strip(), f"{w['id']}: título/año vacío")
        check(w.get("spoiler", False) in (True, False) and ("spoiler" not in w or w["spoiler"] is True),
              f"{w['id']}: spoiler debe ser true u omitirse")
        check("attributed" not in w or w["attributed"] is True, f"{w['id']}: attributed debe ser true u omitirse")
        if w.get("attributed"):
            check("atribuida" in w["title"], f"{w['id']}: atribución dudosa sin «(atribuida)» en el título")
        if "look" in w:
            check_look(w, by_id.get(w["artistId"]))
        if "focus" in w:
            f = w["focus"]
            check(isinstance(f, list) and len(f) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in f),
                  f"{w['id']}: focus debe ser [x, y] entre 0 y 1")
            check("look" in w, f"{w['id']}: focus sin look")
        # Detalle del día: obras de fama 3 de pintores con etapa que se preguntan; todas llevan look.
        a_ = by_id.get(w["artistId"])
        if a_ and not a_["guest"] and w["fame"] == 3 and not w.get("spoiler") and not w.get("attributed"):
            check("look" in w, f"{w['id']}: fama 3 sin look (sale en el detalle del día)")
        check_thumb(w, atlas, sheet_sizes)
        path = f"{app}/{w['img']}"
        if not os.path.isfile(path):
            err(f"{w['id']}: falta {w['img']}")
            continue
        with Image.open(path) as im:
            check(im.size == (w["w"], w["h"]), f"{w['id']}: w/h no coinciden con {im.size}")
            check(max(im.size) <= 1000, f"{w['id']}: imagen > 1000 px")
            check(not im.getexif(), f"{w['id']}: lleva EXIF")
    extra = files - {os.path.basename(w["img"]) for w in cat["artworks"]}
    check(not extra, f"imágenes sobrantes en img/: {sorted(extra)[:5]}")
    check(len(files) <= 250, f"{len(files)} imágenes (límite 250)")
    sheets_used = {w["thumb"][0] for w in cat["artworks"] if isinstance(w.get("thumb"), list)}
    check(sheets_used == set(range(len(atlas.get("sheets", [])))), "hojas del atlas sin usar")
    thumbs_mb = sum(os.path.getsize(f"{app}/{s}") for s in atlas.get("sheets", []) if os.path.isfile(f"{app}/{s}")) / 1e6
    check(thumbs_mb < 5, f"atlas: {thumbs_mb:.2f} MB (límite 5 MB)")
    app_files = sum(len(fs) for _, _, fs in os.walk(app))
    check(app_files < MAX_APP_FILES, f"{app_files} archivos en {app} (límite {MAX_APP_FILES})")

    for w_ in warnings:
        print(f"aviso: {w_}")
    if errors:
        print(f"{len(errors)} ERRORES")
        print("\n".join(errors))
        sys.exit(1)
    total = sum(os.path.getsize(f"{app}/img/{f}") for f in files) / 1e6
    print(f"OK: {len(cat['movements'])} movimientos, {len(aids)} pintores "
          f"({sum(not a['guest'] for a in cat['artists'])} con etapa), "
          f"{len(wids)} obras, {len(files)} archivos, {total:.1f} MB; "
          f"atlas de {len(atlas['sheets'])} hojas, {thumbs_mb:.2f} MB; {app_files} archivos en la app; "
          f"{sum(1 for w in cat['artworks'] if w.get('spoiler'))} con spoiler; "
          f"{sum(1 for w in cat['artworks'] if w.get('attributed'))} atribuidas")


main()
