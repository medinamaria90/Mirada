"""Páginas para compartir historias: app/h/<pintor>-1.html, una por historia de nivel 1 (las que se comparten).

La app es una página sin servidor y WhatsApp (o Telegram, iMessage…) no ejecuta su código: para que el enlace enseñe el
cuadro, el título y la primera frase, cada historia tiene su página estática con sus etiquetas og:, que nada más abrirse
lleva a la app en esa historia (#historia-<pintor>-1). Se generan desde app/data/historias/ y app/data/catalog.json
(las llama tools/sync_historias.py; también a mano: python3 -I tools/share_pages.py). La imagen es una versión ligera del
cuadro de la primera tarjeta (img/og/<pintor>-1.jpg: WhatsApp no enseña las pesadas), que se pinta al desplegar con
tools/fetch_images.sh: python3 -I tools/share_pages.py --images <carpeta con las w*.jpg> (las deja en su og/; necesita Pillow).
"""
import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
STORIES = os.path.join(APP, "data", "historias")
OUT = os.path.join(APP, "h")
SITE = "https://sfumato.dibulios.com"  # dirección pública de la app: la única que llevan las páginas
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


def page_name(artist_id):
    return f"{artist_id}-{SHARE_LEVEL}.html"


def og_image_name(artist_id):
    return f"{artist_id}-{SHARE_LEVEL}.jpg"


def shared_cards():
    """[(pintor, nombre, nivel, primera tarjeta, obra)] de las historias que se comparten."""
    with open(os.path.join(APP, "data", "catalog.json"), encoding="utf8") as f:
        cat = json.load(f)
    works = {w["id"]: w for w in cat["artworks"]}
    artists = {a["id"]: a for a in cat["artists"]}
    with open(os.path.join(STORIES, "index.json"), encoding="utf8") as f:
        index = json.load(f)
    out = []
    for artist_id, levels in sorted(index.items()):
        if SHARE_LEVEL not in levels or artist_id not in artists:
            continue
        with open(os.path.join(STORIES, f"{artist_id}.json"), encoding="utf8") as f:
            story = json.load(f)
        lv = next(l for l in story["levels"] if l["level"] == SHARE_LEVEL)
        card = lv["cards"][0]
        work = works.get(card["artwork"])
        if work:
            out.append((artist_id, artists[artist_id]["name"], lv, card, work))
    return out


def build_pages():
    """{nombre de archivo: html} de todas las historias que se comparten."""
    pages = {}
    for artist_id, name, lv, card, work in shared_cards():
        esc = lambda s: html.escape(str(s), quote=True)
        fname = page_name(artist_id)
        pages[fname] = PAGE.format(
            app=APP_NAME,
            title=esc(lv.get("title") or name),
            text=esc(card["text"]),
            url=esc(f"{SITE}/h/{fname}"),
            image=esc(f"{SITE}/img/{OG_DIR}/{og_image_name(artist_id)}"),
            alt=esc(f"{work['title']}, de {name}"),
            route=f"historia-{artist_id}-{SHARE_LEVEL}",
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
    """Pinta <img_dir>/og/<pintor>-1.jpg desde las imágenes de img_dir (en el despliegue, app/img). Devuelve cuántas."""
    out = os.path.join(img_dir, OG_DIR)
    os.makedirs(out, exist_ok=True)
    made, missing = 0, []
    for artist_id, _name, _lv, _card, work in shared_cards():
        src = os.path.join(img_dir, os.path.basename(work["img"]))
        if not os.path.isfile(src):
            missing.append(work["id"])
            continue
        save_light(src, os.path.join(out, og_image_name(artist_id)))
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
