"""Cuadro del día: valida contenido/cuadro-del-dia/calendario.json y lo vuelca a app/data/dia/ (index.json + <n>.json).

Comprueba cada día (obra del catálogo con fama 3, o 2 si el pintor es español; explicaciones en contenido/explicaciones.json;
6 pintores distintos con la respuesta entre ellos; 3 tarjetas de hasta 180 caracteres, una idea por tarjeta, sin «ayer» ni
«mañana»; fuente; pistas que no nombran al pintor; nitidez del detalle del paso 1 ≥ MIN_DENSITY píxeles de imagen por píxel
CSS con la imagen HD si la hay) y el reparto del calendario, contando la vuelta al principio (el mismo pintor como mucho una
vez cada PAINTER_GAP días; la misma época, no más de ERA_RUN días seguidos; al menos un español en cada SPANISH_WINDOW días).
Avisa (código 2) si quedan menos de ALARM_DAYS días de calendario por delante a partir de hoy (día de Madrid).
Después regenera las páginas para compartir (tools/share_pages.py, app/h/cuadro-<n>.html).

Uso: python3 -I tools/sync_cuadro_dia.py [--check] [--hoy AAAA-MM-DD]   (--check: solo valida, no escribe)
"""
import datetime
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import share_pages  # noqa: E402

ROOT = os.path.dirname(HERE)
APP = os.path.join(ROOT, "app")
SRC = os.path.join(ROOT, "contenido", "cuadro-del-dia", "calendario.json")
EXPLAIN = os.path.join(ROOT, "contenido", "explicaciones.json")
OUT = os.path.join(APP, "data", "dia")

CARDS = 3
MAX_TEXT = 180            # como MAX_TEXT de app/js/engine/stories.js
OPTIONS = 6               # la respuesta y 5 de relleno
ZOOM_STEPS = (3, 1.6)     # zoom del paso 1 y del paso 2 (CUADRO_STEPS en app/js/engine/cuadro-dia.js)
FRAME_CSS = 420           # lado del marco cuadrado del juego en el móvil grande (px CSS)
MIN_DENSITY = 1.5         # píxeles de imagen por píxel CSS del detalle del paso 1
APP_SIDE = 1200           # lado mayor de la imagen normal de la app
PAINTER_GAP = 10
ERA_RUN = 2
SPANISH_WINDOW = 4
ALARM_DAYS = 3            # como CUADRO_ALARM_DAYS de app/js/engine/cuadro-dia.js
SPAIN = "España"
BANNED = re.compile(r"\b(ayer|mañana)\b", re.I)
FIRST_CUE = re.compile(r"recuerdas", re.I)
LOOK_CUE = re.compile(r"^f[ií]jate", re.I)


def read(path):
    with open(path, encoding="utf8") as f:
        return json.load(f)


def crop_rect(ratio, focus, zoom, frame=1.0):
    """Rectángulo [x0, y0, x1, y1] (de 0 a 1) que se ve de la obra en un marco de proporción `frame` con ese zoom (como
    cropRect de app/js/engine/cuadro-dia.js)."""
    rw, rh = (frame / ratio, 1.0) if ratio > frame else (1.0, ratio / frame)
    rw, rh = rw / zoom, rh / zoom
    cx = min(max(focus[0], rw / 2), 1 - rw / 2)
    cy = min(max(focus[1], rh / 2), 1 - rh / 2)
    return [cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2]


def density(w, h, focus, zoom):
    x0, y0, x1, y1 = crop_rect(w / h, focus, zoom)
    return min((x1 - x0) * w, (y1 - y0) * h) / FRAME_CSS


def best_size(work):
    if work.get("hd"):
        return work["hd"]["w"], work["hd"]["h"]
    k = min(1, APP_SIDE / max(work["w"], work["h"]))
    return work["w"] * k, work["h"] * k


def name_tokens(artist):
    words = re.findall(r"[\wÀ-ÿ]+", f"{artist['name']} {artist.get('short', '')}")
    return {w.lower() for w in words if len(w) > 3 and w.lower() not in {"della", "van", "der", "von", "the"}}


def madrid_today():
    # Madrid: UTC+1 en invierno y UTC+2 en verano (último domingo de marzo a último domingo de octubre, a la 1:00 UTC).
    now = datetime.datetime.now(datetime.timezone.utc)
    y = now.year
    last_sun = lambda m: max(datetime.datetime(y, m, d, 1, tzinfo=datetime.timezone.utc) for d in range(25, 32) if datetime.date(y, m, d).weekday() == 6)
    offset = 2 if last_sun(3) <= now < last_sun(10) else 1
    return (now + datetime.timedelta(hours=offset)).date()


def validate(cal, cat, ficha, explain):
    errors = []
    err = errors.append
    works = {w["id"]: w for w in cat["artworks"]}
    artists = {a["id"]: a for a in cat["artists"]}
    movements = {m["id"]: m for m in cat["movements"]}
    days = cal.get("days") or []
    try:
        datetime.date.fromisoformat(cal.get("start", ""))
    except ValueError:
        err("start: fecha de estreno inválida")
    seen = set()
    rows = []
    for i, d in enumerate(days, 1):
        tag = f"día {i}"
        w = works.get(d.get("artwork"))
        if not w:
            err(f"{tag}: obra {d.get('artwork')} no está en el catálogo")
            continue
        if w["id"] in seen:
            err(f"{tag}: {w['id']} repetida en el calendario")
        seen.add(w["id"])
        a = artists[w["artistId"]]
        spanish = a.get("country") == SPAIN
        fame = w.get("fame") or 1
        if not (fame >= 3 or (spanish and fame >= 2)):
            err(f"{tag}: {w['id']} tiene fama {fame} (hace falta 3, o 2 si es español)")
        if w["id"] not in explain:
            err(f"{tag}: {w['id']} sin explicaciones en contenido/explicaciones.json")
        f = d.get("focus")
        if not (isinstance(f, list) and len(f) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in f)):
            err(f"{tag}: focus debe ser [x, y] de 0 a 1")
            continue
        sw, sh = best_size(w)
        dens = density(sw, sh, f, ZOOM_STEPS[0])
        if dens < MIN_DENSITY:
            err(f"{tag}: detalle borroso ({dens:.2f} px por px CSS con {int(sw)}×{int(sh)}; falta la HD: pipeline/hd.py)")
        opts = d.get("options") or []
        names = [w["artistId"], *opts]
        if len(opts) != OPTIONS - 1 or len(set(names)) != OPTIONS:
            err(f"{tag}: hacen falta {OPTIONS - 1} pintores de relleno distintos y distintos de la respuesta")
        for o in opts:
            if o not in artists:
                err(f"{tag}: pintor {o} no está en el catálogo")
        cards = d.get("cards") or []
        if len(cards) != CARDS:
            err(f"{tag}: la historia lleva {CARDS} tarjetas")
        for k, c in enumerate(cards, 1):
            text = c.get("text", "")
            if not text or len(text) > MAX_TEXT:
                err(f"{tag}, tarjeta {k}: {len(text)} caracteres (máximo {MAX_TEXT})")
            if BANNED.search(text):
                err(f"{tag}, tarjeta {k}: dice «ayer» o «mañana»")
            if "http" in text:
                err(f"{tag}, tarjeta {k}: la fuente va en los datos, nunca en la tarjeta")
            cf = c.get("focus")
            if not c.get("whole") and not (isinstance(cf, list) and len(cf) == 3 and 1 <= cf[2] <= 3):
                err(f"{tag}, tarjeta {k}: focus [x, y, zoom] (zoom de 1 a 3) o whole")
        if len(cards) == CARDS:
            short = a.get("short") or a["name"]
            if short.split()[-1].lower() not in cards[0]["text"].lower() or not FIRST_CUE.search(cards[0]["text"]):
                err(f"{tag}: la primera tarjeta dice quién es ({short}) y vuelve al detalle («¿Recuerdas…?»)")
            if not LOOK_CUE.search(cards[1]["text"]):
                err(f"{tag}: la segunda tarjeta empieza por «Fíjate en»")
            if not cards[2].get("whole"):
                err(f"{tag}: la tercera tarjeta enseña la obra entera (whole)")
        if not str(d.get("source", "")).startswith("https://"):
            err(f"{tag}: falta la fuente (https://…)")
        fi = (ficha.get(w["id"]) or {})
        museum = d.get("museum") or ", ".join(x for x in (fi.get("museum"), fi.get("city")) if x)
        mov = movements[a["movementId"]]
        hints = {"era": f"{mov['name']} · {mov['period']}", "year": w["year"], "museum": museum}
        if not museum:
            err(f"{tag}: sin museo en catalog-ficha.json (ponlo en «museum»)")
        tokens = name_tokens(a)
        for key, value in hints.items():
            low = str(value).lower()
            if any(re.search(rf"\b{re.escape(t)}\b", low) for t in tokens):
                err(f"{tag}: la pista «{value}» delata al pintor (pon «museum» a mano)")
        rows.append({"day": d, "work": w, "artist": a, "spanish": spanish, "movement": a["movementId"], "hints": hints})
    errors += check_spread(rows)
    return errors, rows


def check_spread(rows):
    """Reparto contando la vuelta al principio del calendario."""
    errors = []
    n = len(rows)
    if not n:
        return ["el calendario está vacío"]
    for i in range(n):
        for gap in range(1, min(PAINTER_GAP, n)):
            j = (i + gap) % n
            if rows[i]["artist"]["id"] == rows[j]["artist"]["id"]:
                errors.append(f"días {i + 1} y {j + 1}: {rows[i]['artist']['id']} se repite antes de {PAINTER_GAP} días")
        run = [rows[(i + k) % n]["movement"] for k in range(ERA_RUN + 1)]
        if n > ERA_RUN and len(set(run)) == 1:
            errors.append(f"día {i + 1}: {ERA_RUN + 1} días seguidos de {run[0]}")
        window = [rows[(i + k) % n]["spanish"] for k in range(min(SPANISH_WINDOW, n))]
        if not any(window):
            errors.append(f"días {i + 1} a {i + len(window)}: ningún pintor español")
    return errors


def options_order(n, answer, options):
    """Orden fijo de los 6 nombres de un día (el mismo para todos), barajado con el número del día."""
    names = [answer, *options]
    random.Random(f"cuadro-{n}").shuffle(names)
    return names


def build(cal, rows):
    index = {"version": 1, "start": cal["start"], "days": []}
    files = {}
    for n, r in enumerate(rows, 1):
        d = r["day"]
        index["days"].append({"n": n, "artwork": r["work"]["id"], "focus": d["focus"]})
        cards = []
        for c in d["cards"]:
            card = {"text": c["text"], "artwork": r["work"]["id"]}
            if c.get("whole"):
                card["whole"] = True
            else:
                card["focus"] = c["focus"]
            cards.append(card)
        files[f"{n}.json"] = {
            "n": n, "artwork": r["work"]["id"], "artistId": r["artist"]["id"], "focus": d["focus"],
            "options": options_order(n, r["artist"]["id"], d["options"]),
            "hints": r["hints"], "cards": cards, "source": d["source"],
        }
    return index, files


def days_left(start, count, today):
    """Días de calendario que quedan por delante de hoy (negativo si ya ha dado la vuelta)."""
    n = (today - datetime.date.fromisoformat(start)).days + 1
    return count - max(1, n)


def write(index, files):
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):
        if old.endswith(".json") and old != "index.json" and old not in files:
            os.remove(os.path.join(OUT, old))
    dump = lambda name, data: open(os.path.join(OUT, name), "w", encoding="utf8").write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    dump("index.json", index)
    for name, data in files.items():
        dump(name, data)


def main():
    args = sys.argv[1:]
    today = datetime.date.fromisoformat(args[args.index("--hoy") + 1]) if "--hoy" in args else madrid_today()
    cal = read(SRC)
    cat = read(os.path.join(APP, "data", "catalog.json"))
    ficha = read(os.path.join(APP, "data", "catalog-ficha.json"))["ficha"]
    errors, rows = validate(cal, cat, ficha, read(EXPLAIN))
    for e in errors:
        print(f"ERROR {e}", file=sys.stderr)
    if errors:
        sys.exit(1)
    index, files = build(cal, rows)
    if "--check" not in args:
        write(index, files)
        share_pages.main()
        print(f"{len(files)} días -> app/data/dia/")
    left = days_left(cal["start"], len(rows), today)
    end = datetime.date.fromisoformat(cal["start"]) + datetime.timedelta(days=len(rows) - 1)
    if left < ALARM_DAYS:
        print(f"AVISO: quedan {max(0, left)} días de calendario (el último nuevo es el {end.isoformat()}); "
              "añade cuadros al final de contenido/cuadro-del-dia/calendario.json", file=sys.stderr)
        sys.exit(2)
    print(f"calendario hasta el {end.isoformat()} ({left} días por delante)")


if __name__ == "__main__":
    main()
