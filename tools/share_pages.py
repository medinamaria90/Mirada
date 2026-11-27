"""Páginas para compartir historias: app/h/<pintor>-1.html, una por historia de nivel 1 (las que se comparten).

La app es una página sin servidor y WhatsApp (o Telegram, iMessage…) no ejecuta su código: para que el enlace enseñe el
cuadro, el título y la primera frase, cada historia tiene su página estática con sus etiquetas og:, que nada más abrirse
lleva a la app en esa historia (#historia-<pintor>-1). Se generan desde app/data/historias/ y app/data/catalog.json
(las llama tools/sync_historias.py; también a mano: python3 -I tools/share_pages.py). La imagen es la del cuadro de la
primera tarjeta, que la app sirve en img/ al desplegar.
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
STORIES = os.path.join(APP, "data", "historias")
OUT = os.path.join(APP, "h")
SITE = "https://sfumato-arte.onrender.com"
APP_NAME = "Sfumato"
SHARE_LEVEL = 1  # como SHARE_LEVEL de app/js/engine/stories.js

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


def build_pages():
    """{nombre de archivo: html} de todas las historias que se comparten."""
    with open(os.path.join(APP, "data", "catalog.json"), encoding="utf8") as f:
        cat = json.load(f)
    works = {w["id"]: w for w in cat["artworks"]}
    artists = {a["id"]: a for a in cat["artists"]}
    with open(os.path.join(STORIES, "index.json"), encoding="utf8") as f:
        index = json.load(f)
    pages = {}
    for artist_id, levels in sorted(index.items()):
        if SHARE_LEVEL not in levels or artist_id not in artists:
            continue
        with open(os.path.join(STORIES, f"{artist_id}.json"), encoding="utf8") as f:
            story = json.load(f)
        lv = next(l for l in story["levels"] if l["level"] == SHARE_LEVEL)
        card = lv["cards"][0]
        work = works.get(card["artwork"])
        if not work:
            continue
        name = artists[artist_id]["name"]
        esc = lambda s: html.escape(str(s), quote=True)
        fname = page_name(artist_id)
        pages[fname] = PAGE.format(
            app=APP_NAME,
            title=esc(lv.get("title") or name),
            text=esc(card["text"]),
            url=esc(f"{SITE}/h/{fname}"),
            image=esc(f"{SITE}/{work['img']}"),
            alt=esc(f"{work['title']}, de {name}"),
            route=f"historia-{artist_id}-{SHARE_LEVEL}",
        )
    return pages


def main():
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
