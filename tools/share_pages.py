"""Páginas para compartir: app/h/<pintor>-1.html por historia de nivel 1, app/h/epoca-<id>.html por época con tarjetas y
app/h/cuadro-<n>.html por día del calendario del Cuadro del día (su imagen es el recorte del detalle del paso 1, sin título ni
pintor; el enlace abre siempre el cuadro de hoy, #cuadro-del-dia).

La app es una página sin servidor y WhatsApp (o Telegram, iMessage…) no ejecuta su código: para que el enlace enseñe el
cuadro, el título y una frase, cada cosa que se comparte tiene su página estática con sus etiquetas og:, que nada más
abrirse lleva a la app (#historia-<pintor>-1 o #epoca-<id>). Se generan desde app/data/historias/, app/data/epocas/ y
app/data/catalog.json (las llama tools/sync_historias.py; también a mano: python3 -I tools/share_pages.py). La imagen es una
versión ligera del cuadro de la primera tarjeta (img/og/<nombre de la página>.jpg: WhatsApp no enseña las pesadas), que se
pinta al desplegar con tools/fetch_images.sh: python3 -I tools/share_pages.py --images <carpeta con las w*.jpg> (las deja en
su og/; necesita Pillow).
"""
import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
STORIES = os.path.join(APP, "data", "historias")
ERAS = os.path.join(APP, "data", "epocas")
OUT = os.path.join(APP, "h")
SITE = "https://sfumato.dibulios.com"  # dirección principal; la antigua se pasa sola a esta (app/js/state/mudanza.js)
APP_NAME = "Sfumato"
SHARE_LEVEL = 1  # como SHARE_LEVEL de app/js/engine/stories.js
OG_DIR = "og"  # dentro de img/: las imágenes ligeras para la vista previa
OG_MAX_SIDE = 1200  # px del lado mayor
OG_MAX_BYTES = 250 * 1024  # WhatsApp no enseña la vista previa de las imágenes pesadas
OG_QUALITIES = (82, 74, 66, 58, 50)  # se baja la calidad JPEG hasta que quepa; si ni así, se reduce el tamaño
OG_SHRINK = 0.85

PAGE = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} · {app}</title>
  <meta name="description" content="{text}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="{app}">
  <meta property="og:locale" content="es_ES">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{text}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{image}">
  <meta property="og:image:alt" content="{alt}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <script>location.replace('../#{route}');</script>
</head>
<body>
  <p><a href="../#{route}">{title}</a></p>
</body>
</html>
"""


ERA_PREFIX = "epoca-"  # como eraRoute de app/js/ui/router.js
CUADRO_PREFIX = "cuadro-"
CUADRO_ROUTE = "cuadro-del-dia"  # como CUADRO_ROUTE de app/js/engine/cuadro-dia.js
CUADRO_TITLE = "Cuadro del día"
CUADRO_TEXT = "¿De quién es? Un detalle, seis pintores y cuatro intentos."
CUADRO_ALT = "Detalle de un cuadro"
CUADRO_ZOOM = 3  # el detalle del paso 1 (CUADRO_STEPS de app/js/engine/cuadro-dia.js)
CUADRO_SIDE = 1080  # lado del recorte cuadrado para la vista previa
DETAIL_DIR = "dia"  # dentro de img/: el detalle de cada día para los pasos 1 y 2 del juego (img/dia/<n>.jpg)
DETAIL_ZOOM = 1.6  # el recorte del paso 2, que contiene el del paso 1 (WIDE_ZOOM de app/js/engine/cuadro-calendar.js)
DETAIL_SIDE = 1200  # px: el detalle del paso 1 (0,53 del recorte) queda a 1,52 px de imagen por px CSS en un marco de 420 px
DETAIL_QUALITY = 72


def read_json(*parts):
    with open(os.path.join(*parts), encoding="utf8") as f:
        return json.load(f)


def shared_cards():
    """[(pintor, nombre, nivel, primera tarjeta, obra)] de las historias que se comparten."""
    cat = read_json(APP, "data", "catalog.json")
    works = {w["id"]: w for w in cat["artworks"]}
    artists = {a["id"]: a for a in cat["artists"]}
    index = read_json(STORIES, "index.json")
    out = []
    for artist_id, levels in sorted(index.items()):
        if SHARE_LEVEL not in levels or artist_id not in artists:
            continue
        story = read_json(STORIES, f"{artist_id}.json")
        lv = next(l for l in story["levels"] if l["level"] == SHARE_LEVEL)
        card = lv["cards"][0]
        work = works.get(card["artwork"])
        if work:
            out.append((artist_id, artists[artist_id]["name"], lv, card, work))
    return out


def shared_eras():
    """[(movimiento, obra de su primera tarjeta, nombre del pintor)] de las épocas con tarjetas."""
    cat = read_json(APP, "data", "catalog.json")
    works = {w["id"]: w for w in cat["artworks"]}
    artists = {a["id"]: a for a in cat["artists"]}
    movements = {m["id"]: m for m in cat["movements"]}
    out = []
    for movement_id in sorted(read_json(ERAS, "index.json")):
        cards = read_json(ERAS, f"{movement_id}.json").get("cards") or []
        work = works.get(cards[0]["artwork"]) if cards else None
        if movement_id in movements and work:
            out.append((movements[movement_id], work, artists[work["artistId"]]["name"]))
    return out


def shared_items():
    """[(nombre sin extensión, título, frase, obra, pintor de la obra, ruta de la app)] de todo lo que se comparte."""
    items = [
        (f"{artist_id}-{SHARE_LEVEL}", lv.get("title") or name, card["text"], work, name, f"historia-{artist_id}-{SHARE_LEVEL}")
        for artist_id, name, lv, card, work in shared_cards()
    ]
    items += [
        (f"{ERA_PREFIX}{m['id']}", m["name"], m["blurb"], work, painter, f"{ERA_PREFIX}{m['id']}")
        for m, work, painter in shared_eras()
    ]
    return items


def cuadro_items():
    """[(nombre sin extensión, obra, foco del detalle)] de los días del calendario del Cuadro del día."""
    path = os.path.join(APP, "data", "dia", "index.json")
    if not os.path.isfile(path):
        return []
    works = {w["id"]: w for w in read_json(APP, "data", "catalog.json")["artworks"]}
    return [(f"{CUADRO_PREFIX}{d['n']}", works[d["artwork"]], d["focus"]) for d in read_json(path)["days"] if d["artwork"] in works]


def crop_rect(ratio, focus, zoom):
    """Como cropRect de app/js/engine/cuadro-calendar.js en un marco cuadrado: [x0, y0, x1, y1] de 0 a 1."""
    rw, rh = (1 / ratio, 1.0) if ratio > 1 else (1.0, ratio)
    rw, rh = rw / zoom, rh / zoom
    cx = min(max(focus[0], rw / 2), 1 - rw / 2)
    cy = min(max(focus[1], rh / 2), 1 - rh / 2)
    return cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2


def build_pages():
    """{nombre de archivo: html} de todo lo que se comparte."""
    esc = lambda s: html.escape(str(s), quote=True)
    pages = {}
    for stem, title, text, work, painter, route in shared_items():
        fname = f"{stem}.html"
        pages[fname] = PAGE.format(
            app=APP_NAME,
            title=esc(title),
            text=esc(text),
            url=esc(f"{SITE}/h/{fname}"),
            image=esc(f"{SITE}/img/{OG_DIR}/{stem}.jpg"),
            alt=esc(f"{work['title']}, de {painter}"),
            route=route,
        )
    for stem, _work, _focus in cuadro_items():
        fname = f"{stem}.html"
        pages[fname] = PAGE.format(
            app=APP_NAME, title=esc(CUADRO_TITLE), text=esc(CUADRO_TEXT), url=esc(f"{SITE}/h/{fname}"),
            image=esc(f"{SITE}/img/{OG_DIR}/{stem}.jpg"), alt=esc(CUADRO_ALT), route=CUADRO_ROUTE,
        )
    return pages


def save_light(src, dst, crop=None):
    """Copia ligera de src en dst: lado mayor de OG_MAX_SIDE px como mucho y menos de OG_MAX_BYTES. Devuelve los bytes.
    crop: (x0, y0, x1, y1) de 0 a 1, el trozo de la imagen que se guarda (el detalle del Cuadro del día)."""
    from PIL import Image  # solo al desplegar (fetch_images.sh se asegura de que esté)

    with Image.open(src) as im:
        im = im.convert("RGB")
        if crop:
            W, H = im.size
            im = im.crop((round(crop[0] * W), round(crop[1] * H), round(crop[2] * W), round(crop[3] * H)))
            im = im.resize((CUADRO_SIDE, CUADRO_SIDE), Image.LANCZOS)
        side = OG_MAX_SIDE
        while True:
            im.thumbnail((side, side), Image.LANCZOS)
            for q in OG_QUALITIES:
                im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
                size = os.path.getsize(dst)
                if size <= OG_MAX_BYTES:
                    return size
            side = int(side * OG_SHRINK)


def save_detail(src, dst, crop):
    """El detalle de los pasos 1 y 2 del Cuadro del día: el recorte del paso 2 a DETAIL_SIDE px (unos 200 KB frente a los
    1-3 MB de la imagen HD entera)."""
    from PIL import Image

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB")
        W, H = im.size
        im = im.crop((round(crop[0] * W), round(crop[1] * H), round(crop[2] * W), round(crop[3] * H)))
        side = min(DETAIL_SIDE, max(im.size))
        im = im.resize((side, round(side * im.size[1] / im.size[0])), Image.LANCZOS)
        im.save(dst, "JPEG", quality=DETAIL_QUALITY, optimize=True, progressive=True)
    return os.path.getsize(dst)


def make_images(img_dir):
    """Pinta <img_dir>/og/<página>.jpg desde las imágenes de img_dir (en el despliegue, app/img). Devuelve cuántas."""
    out = os.path.join(img_dir, OG_DIR)
    os.makedirs(out, exist_ok=True)
    made, missing = 0, []
    for stem, _title, _text, work, _painter, _route in shared_items():
        src = os.path.join(img_dir, os.path.basename(work["img"]))
        if not os.path.isfile(src):
            missing.append(work["id"])
            continue
        save_light(src, os.path.join(out, f"{stem}.jpg"))
        made += 1
    for stem, work, focus in cuadro_items():
        name = os.path.basename(work["img"])
        hd = os.path.join(img_dir, "hd", name)  # el detalle, de la HD si la hay (la de 1200 px se ve borrosa tan ampliada)
        src = hd if os.path.isfile(hd) else os.path.join(img_dir, name)
        if not os.path.isfile(src):
            missing.append(work["id"])
            continue
        save_light(src, os.path.join(out, f"{stem}.jpg"), crop_rect(work["w"] / work["h"], focus, CUADRO_ZOOM))
        save_detail(src, os.path.join(img_dir, DETAIL_DIR, f"{stem[len(CUADRO_PREFIX):]}.jpg"), crop_rect(work["w"] / work["h"], focus, DETAIL_ZOOM))
        made += 1
    print(f"{made} imágenes para compartir -> {out}")
    if missing:
        print(f"sin imagen de origen: {', '.join(missing)}", file=sys.stderr)
    return made


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--images":
        make_images(sys.argv[2])
        return
    pages = build_pages()
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):
        if old.endswith(".html") and old not in pages:
            os.remove(os.path.join(OUT, old))
    for fname, text in pages.items():
        with open(os.path.join(OUT, fname), "w", encoding="utf8") as f:
            f.write(text)
    print(f"{len(pages)} páginas para compartir -> app/h/")


if __name__ == "__main__":
    main()
