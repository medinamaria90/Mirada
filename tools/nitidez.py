"""Nitidez de los detalles de las historias: cuántos píxeles de imagen caen en cada píxel CSS al enseñar a sangre una
`region` o un `focus` con zoom grande (engine/stories.js) en el móvil típico (412 × 915 CSS).

Lo usan tools/sync_historias.py (avisa si un detalle se verá borroso) y pipeline/hd.py (decide qué obras llevan imagen HD y a
qué tamaño). Sin dependencias: solo biblioteca estándar.
"""
import math

FRAME_CSS = (412, 915)   # marco de la historia en el móvil típico (ancho, alto en píxeles CSS)
APP_SIDE = 1200          # lado mayor de las imágenes de la app (app-img-1200.zip, pipeline/pack.py)
MIN_DENSITY = 1.5        # por debajo, el detalle se ve borroso: sync_historias avisa
HD_DENSITY = 2.0         # densidad que busca la imagen HD (con DPR 2,6 ya no se ve el grano)
HD_MAX_SIDE = 3840       # lado mayor de la HD: la miniatura más grande que sirve Commons
HD_ZOOM_MIN = 1.5        # un `focus` con este zoom o más es un detalle (como una `region`)
ZOOM_DEFAULT = 1.5       # zoom de un `focus` sin tercer valor (cropOf en engine/stories.js)
ZOOM_RANGE = (1, 3)
REGION_MIN = 0.05


def _region(card):
    r = card.get("region")
    ok = isinstance(r, list) and len(r) == 4 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in r)
    return tuple(r) if ok and r[2] - r[0] >= REGION_MIN and r[3] - r[1] >= REGION_MIN else None


def _zoom(card):
    f = card.get("focus")
    if not isinstance(f, list) or len(f) < 2:
        return None
    z = f[2] if len(f) > 2 and isinstance(f[2], (int, float)) else ZOOM_DEFAULT
    return min(ZOOM_RANGE[1], max(ZOOM_RANGE[0], z))


def is_detail(card):
    """La tarjeta enseña un trozo de la obra (una `region` o un `focus` con zoom ≥ HD_ZOOM_MIN): pide la imagen HD si la hay."""
    zoom = _zoom(card)
    return _region(card) is not None or (zoom is not None and zoom >= HD_ZOOM_MIN)


def served(w, h, side=APP_SIDE):
    """Tamaño de la imagen servida: la obra (proporción w × h) a lado mayor `side`, sin ampliar."""
    k = min(1, side / max(w, h))
    return w * k, h * k


def density(card, img_w, img_h):
    """Píxeles de imagen por píxel CSS en el peor caso (el detalle a sangre, con su zoom) para una imagen de img_w × img_h."""
    x0, y0, x1, y1 = _region(card) or (0, 0, 1, 1)
    zoom = _zoom(card) or 1
    rw, rh = img_w * (x1 - x0), img_h * (y1 - y0)
    css_per_px = max(FRAME_CSS[0] / rw, FRAME_CSS[1] / rh) * zoom
    return 1 / css_per_px


def side_needed(card, w, h, target=HD_DENSITY):
    """Lado mayor (en px, redondeado a la centena) para que el detalle llegue a `target` píxeles por píxel CSS."""
    sw, sh = served(w, h, max(w, h))
    need = max(w, h) * target / density(card, sw, sh)
    return int(math.ceil(need / 100) * 100)
