"""Páginas para compartir: app/h/<pintor>-1.html por historia de nivel 1 y app/h/epoca-<id>.html por época con tarjetas.

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
    return pages


def save_light(src, dst):
    """Copia ligera de src en dst: lado mayor de OG_MAX_SIDE px como mucho y menos de OG_MAX_BYTES. Devuelve los bytes."""
    from PIL import Image  # solo al desplegar (fetch_images.sh se asegura de que esté)

    with Image.open(src) as im:
        im = im.convert("RGB")
        side = OG_MAX_SIDE
        while True:
            im.thumbnail((side, side), Image.LANCZOS)
            for q in OG_QUALITIES:
                im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
                size = os.path.getsize(dst)
                if size <= OG_MAX_BYTES:
                    return size
            side = int(side * OG_SHRINK)


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
