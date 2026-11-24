"""Servidor estático de pruebas: sirve <app> y, bajo /img/, las w<QID>.jpg de otra carpeta.

Uso: python3 tools/serve_local.py <puerto> <dir_app> [<dir_imagenes>]
Las imágenes del catálogo no están en el repo (se bajan de la release con tools/fetch_images.sh): en local se
bajan a una carpeta temporal y este servidor las monta, sin copiarlas a app/img/. Las hojas del atlas
(app/img/s/, generadas con tools/make_atlas.py) sí salen de <dir_app>.
"""
import gzip
import io
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WORK_IMG = re.compile(r"^/img/(w\d+\.jpg)$")
COMPRESSIBLE = (".json", ".js", ".mjs", ".css", ".html", ".svg", ".md")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, img_dir=None, **kwargs):
        self.img_dir = img_dir
        super().__init__(*args, **kwargs)

    def translate_path(self, path):
        m = WORK_IMG.match(path.split("?", 1)[0])
        if m and self.img_dir and os.path.isfile(os.path.join(self.img_dir, m.group(1))):
            return os.path.join(self.img_dir, m.group(1))
        return super().translate_path(path)

    def send_head(self):
        # Como Render: JSON, JS, CSS, HTML y SVG viajan comprimidos (el presupuesto de arranque del e2e mide eso).
        path = self.translate_path(self.path)
        if (os.path.isfile(path) and path.endswith(COMPRESSIBLE) and "gzip" in self.headers.get("Accept-Encoding", "")):
            with open(path, "rb") as f:
                data = gzip.compress(f.read(), 6)
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            return io.BytesIO(data)
        return super().send_head()

    def log_message(self, *args):
        pass


def main():
    port, app = int(sys.argv[1]), sys.argv[2]
    img = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    handler = partial(Handler, directory=app, img_dir=img)
    ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()


if __name__ == "__main__":
    main()
