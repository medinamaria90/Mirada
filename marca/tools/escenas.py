# Escenarios de época para el camino: una «ciudad» vectorial por movimiento, apilable sin costura.
#
# Guía de estilo (la misma mano en los nueve):
#   - viewBox 0 0 390 H, preserveAspectRatio xMidYMin slice; H según etapas del movimiento (600-1200).
#   - Tres tonos planos apenas más oscuros que el lino, sin trazos oscuros:
#       T1 #EFE8DD (fondo lejano)  T2 #E6DDCF (edificios cercanos)  T3 #DCD2C2 (detalles: tejados, cornisas, bordillo).
#     Las ventanas son recortes en lino (#F7F3EC) mediante patrones (<pattern>) alineados a una rejilla global.
#   - Cada escenario es una pila de «franjas» (tiers): cielo, silueta lejana (T1), edificios cercanos (T2/T3),
#     y una banda de suelo de 48 px (bordillo T3 de 3 px, cuerpo T2, borde inferior T3 de 3 px).
#   - La banda de suelo está partida por la mitad entre franjas: los últimos 24 px de un SVG y los primeros 24
#     del siguiente son exactamente la misma banda, así que apilados no se ve costura.
#   - Nada de texto, personas, <image> ni filtros. Peso objetivo ≤ 25 KB.
#
# Uso (desde la raíz del repositorio):  python marca/tools/escenas.py [carpeta_salida]
import json
import os
import random
import sys

LINO = '#F7F3EC'
T1 = '#EFE8DD'
T2 = '#E6DDCF'
T3 = '#DCD2C2'
W = 390
BANDA = 24           # media banda de suelo (arriba y abajo de cada franja)

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


def n(v):
    """Coordenada redondeada: enteros cuando se puede, un decimal si hace falta."""
    r = round(v, 1)
    return str(int(r)) if r == int(r) else str(r)


def R(x, y, w, h, f, rx=None, o=None):
    a = f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}" fill="{f}"'
    if rx:
        a += f' rx="{n(rx)}"'
    if o:
        a += f' opacity="{o}"'
    return a + '/>'


def P(d, f, o=None, stroke=None, sw=None):
    a = f'<path d="{d}" fill="{f}"'
    if stroke:
        a += f' stroke="{stroke}" stroke-width="{n(sw or 1)}"'
    if o:
        a += f' opacity="{o}"'
    return a + '/>'


def C(cx, cy, r, f, o=None):
    a = f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{f}"'
    if o:
        a += f' opacity="{o}"'
    return a + '/>'


def E(cx, cy, rx, ry, f, o=None):
    a = f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{f}"'
    if o:
        a += f' opacity="{o}"'
    return a + '/>'


def poly(pts, f, o=None):
    d = 'M' + ' L'.join(f'{n(x)} {n(y)}' for x, y in pts) + 'Z'
    return P(d, f, o)


# ---- patrones de ventanas (rejilla global, userSpaceOnUse) -------------------------------------------------
PATRONES = {
    'pw': (14, 18, f'<rect x="4" y="4" width="6" height="10" rx="1" fill="{LINO}"/>'),                       # ventana recta
    'pa': (16, 20, f'<path d="M4 16V8a4 4 0 0 1 8 0v8Z" fill="{LINO}"/>'),                                   # ventana de medio punto
    'pg': (14, 22, f'<path d="M4 18V9q0-4 3-6q3 2 3 6v9Z" fill="{LINO}"/>'),                                 # ventana ojival
    'pp': (10, 10, f'<rect x="1.5" y="1.5" width="7" height="7" fill="{LINO}"/>'),                           # cristalera
    'pr': (24, 16, f'<rect x="0" y="0" width="24" height="1.5" fill="{T3}"/><rect x="0" y="8" width="24" height="1.5" fill="{T3}"/>'
                   f'<rect x="0" y="0" width="1.5" height="8" fill="{T3}"/><rect x="12" y="8" width="1.5" height="8" fill="{T3}"/>'),  # almohadillado
    'pd': (6, 6, f'<circle cx="3" cy="3" r="1" fill="{LINO}"/>'),                                             # puntos (cúpula dorada)
    'ps': (12, 12, f'<path d="M6 1 11 6 6 11 1 6Z" fill="none" stroke="{LINO}" stroke-width="1.2"/>'),        # sebka (Giralda)
    'pt': (12, 12, f'<circle cx="2" cy="3" r=".7" fill="{T3}"/><circle cx="8" cy="9" r=".7" fill="{T3}"/><circle cx="10" cy="2" r=".5" fill="{T3}"/>'),  # grano
    'pb': (12, 20, f'<rect x="3" y="3" width="6" height="14" rx="3" fill="{LINO}"/>'),                        # balaustres
}


def snap(x0, x1, tw):
    a = -(-x0 // tw) * tw
    b = (x1 // tw) * tw
    return a, b


def win(x, y, w, h, pat='pw', mx=5, my=6, mb=8):
    """Rectángulo de ventanas ajustado a la rejilla del patrón (así los recortes nunca quedan partidos)."""
    tw, th, _ = PATRONES[pat]
    ax, bx = snap(x + mx, x + w - mx, tw)
    ay, by = snap(y + my, y + h - mb, th)
    if bx - ax < tw or by - ay < th:
        return ''
    return f'<rect x="{n(ax)}" y="{n(ay)}" width="{n(bx - ax)}" height="{n(by - ay)}" fill="url(#{pat})"/>'


# ---- primitivas de arquitectura ---------------------------------------------------------------------------
def caja(x, g, w, h, f=T2, pat=None, cornisa=True, mx=5, my=6, mb=8):
    out = [R(x, g - h, w, h, f)]
    if cornisa and f == T2:
        out.append(R(x - 2, g - h, w + 4, 3, T3))
    if pat:
        out.append(win(x, g - h, w, h, pat, mx, my, mb))
    return ''.join(out)


def casa(x, g, w, h, techo=22, f=T2, pat='pw', tejado=T3, mx=4):
    """Casa con tejado a dos aguas (vertiente frontal como triángulo)."""
    out = [R(x, g - h, w, h, f), poly([(x - 2, g - h), (x + w / 2, g - h - techo), (x + w + 2, g - h)], tejado if f == T2 else f)]
    if pat:
        out.append(win(x, g - h, w, h, pat, mx))
    return ''.join(out)


def casa_lateral(x, g, w, h, techo=18, f=T2, pat='pw'):
    """Casa vista de lado: tejado como trapecio (cumbrera horizontal)."""
    out = [R(x, g - h, w, h, f), poly([(x - 3, g - h), (x + 8, g - h - techo), (x + w - 8, g - h - techo), (x + w + 3, g - h)], T3 if f == T2 else f)]
    if pat:
        out.append(win(x, g - h, w, h, pat))
    return ''.join(out)


def hastial(x, g, w, h, pasos=4, f=T2, pat='pw'):
    """Casa de hastial escalonado (Flandes)."""
    pw = w / 2 / (pasos + 1)
    ph = 11
    y0 = g - h
    pts = [(x, g), (x, y0)]
    for i in range(pasos):
        pts += [(x + pw * (i + 1), y0 - ph * i), (x + pw * (i + 1), y0 - ph * (i + 1))]
    pts += [(x + w - pw * pasos, y0 - ph * pasos)]
    for i in range(pasos - 1, -1, -1):
        pts += [(x + w - pw * i, y0 - ph * i), (x + w - pw * i, y0 - ph * (i - 1) if i > 0 else y0)]
    pts += [(x + w, g)]
    out = [poly(pts, f)]
    if pat:
        out.append(win(x, y0, w, h, pat, 4, 4))
    return ''.join(out)


def campana(x, g, w, h, f=T2, pat='pw'):
    """Casa de hastial de campana (curvo)."""
    y0 = g - h
    d = (f'M{n(x)} {n(g)}V{n(y0)}C{n(x)} {n(y0 - 18)} {n(x + w * .3)} {n(y0 - 14)} {n(x + w * .4)} {n(y0 - 28)}'
         f'Q{n(x + w / 2)} {n(y0 - 40)} {n(x + w * .6)} {n(y0 - 28)}C{n(x + w * .7)} {n(y0 - 14)} {n(x + w)} {n(y0 - 18)} {n(x + w)} {n(y0)}V{n(g)}Z')
    out = [P(d, f)]
    if pat:
        out.append(win(x, y0, w, h, pat, 4, 4))
    return ''.join(out)


def torre(x, g, w, h, remate='aguja', f=T2, pat='pa', alto_remate=None):
    y0 = g - h
    out = [R(x, y0, w, h, f)]
    ar = alto_remate or w * 1.6
    if remate == 'aguja':
        out.append(poly([(x - 2, y0), (x + w / 2, y0 - ar), (x + w + 2, y0)], T3 if f == T2 else f))
    elif remate == 'chapitel':   # pizarra madrileña: cuerpo puntiagudo con bola
        out.append(poly([(x - 3, y0), (x + w * .3, y0 - ar * .55), (x + w / 2, y0 - ar), (x + w * .7, y0 - ar * .55), (x + w + 3, y0)], T3 if f == T2 else f))
        out.append(C(x + w / 2, y0 - ar - 3, 3, T3 if f == T2 else f))
    elif remate == 'almenas':
        k = max(2, int(w // 8))
        p = w / (2 * k - 1)
        for i in range(k):
            out.append(R(x + i * 2 * p, y0 - 7, p, 7, f))
    elif remate == 'cupulin':
        out.append(P(f'M{n(x - 2)} {n(y0)}C{n(x - 2)} {n(y0 - w * .9)} {n(x + w + 2)} {n(y0 - w * .9)} {n(x + w + 2)} {n(y0)}Z', T3 if f == T2 else f))
        out.append(R(x + w / 2 - 1.5, y0 - w * .9 - 8, 3, 10, T3 if f == T2 else f))
    elif remate == 'bulbo':
        cx = x + w / 2
        out.append(P(f'M{n(x - 2)} {n(y0)}C{n(x - 8)} {n(y0 - w * .5)} {n(cx - 2)} {n(y0 - w * .8)} {n(cx)} {n(y0 - w * 1.5)}'
                     f'C{n(cx + 2)} {n(y0 - w * .8)} {n(x + w + 8)} {n(y0 - w * .5)} {n(x + w + 2)} {n(y0)}Z', T3 if f == T2 else f))
    elif remate == 'plano':
        out.append(R(x - 2, y0, w + 4, 3, T3 if f == T2 else f))
    if pat and f == T2:
        out.append(win(x, y0, w, h, pat, 3, 10))
    return ''.join(out)


def cupula(cx, g, ancho, alto_tambor=30, f=T2, nervios=True, linterna=True):
    r = ancho / 2
    tambor = g - alto_tambor
    cima = tambor - r * .9
    out = [R(cx - r + 5, tambor, ancho - 10, alto_tambor, f),
           P(f'M{n(cx - r)} {n(tambor)}C{n(cx - r)} {n(cima + 10)} {n(cx - r * .55)} {n(cima)} {n(cx)} {n(cima)}'
             f'C{n(cx + r * .55)} {n(cima)} {n(cx + r)} {n(cima + 10)} {n(cx + r)} {n(tambor)}Z', f)]
    if nervios and f == T2:
        for k in (-.6, -.3, 0, .3, .6):
            x = cx + r * k
            out.append(P(f'M{n(x)} {n(tambor)}Q{n(cx + (x - cx) * .55)} {n(cima + 8)} {n(cx)} {n(cima)}', 'none', stroke=LINO, sw=1.5))
    if f == T2:
        out.append(win(cx - r + 5, tambor, ancho - 10, alto_tambor, 'pa', 4, 6, 6))
    if linterna:
        out.append(R(cx - 5, cima - 18, 10, 20, f))
        out.append(poly([(cx - 7, cima - 18), (cx, cima - 28), (cx + 7, cima - 18)], T3 if f == T2 else f))
    return ''.join(out)


def columnata(x, g, w, h, cols, f=T2, fuste=T2, fondo=T1, capitel=True):
    """Fila de columnas sobre fondo más claro, con entablamento."""
    out = [R(x, g - h, w, h, fondo)]
    paso = w / cols
    cw = max(6, paso * .3)
    for i in range(cols):
        cx = x + paso * (i + .5)
        out.append(R(cx - cw / 2, g - h + 10, cw, h - 10, fuste))
        if capitel:
            out.append(R(cx - cw / 2 - 2, g - h + 10, cw + 4, 4, T3))
            out.append(R(cx - cw / 2 - 2, g - 5, cw + 4, 5, T3))
    out.append(R(x - 3, g - h - 8, w + 6, 10, f))
    return ''.join(out)


def fronton(x, y, w, h, f=T3):
    return poly([(x - 2, y), (x + w / 2, y - h), (x + w + 2, y)], f)


def fronton_partido(cx, y, w, h, f=T3):
    return (poly([(cx - w / 2, y), (cx - w / 2, y - 4), (cx - 8, y - h), (cx - 8, y)], f)
            + poly([(cx + w / 2, y), (cx + w / 2, y - 4), (cx + 8, y - h), (cx + 8, y)], f))


def arcada(x, g, w, h, bahias, f=T2, hueco=LINO):
    out = [R(x, g - h, w, h, f), R(x - 2, g - h, w + 4, 3, T3)]
    paso = w / bahias
    r = paso / 2 - 5
    for i in range(bahias):
        cx = x + paso * (i + .5)
        top = g - h + 12 + r
        out.append(P(f'M{n(cx - r)} {n(g)}V{n(top)}A{n(r)} {n(r)} 0 0 1 {n(cx + r)} {n(top)}V{n(g)}Z', hueco))
    return ''.join(out)


def arco_ojival(cx, g, w, h, f):
    r = w / 2
    return P(f'M{n(cx - r)} {n(g)}V{n(g - h + r * 1.4)}Q{n(cx - r)} {n(g - h)} {n(cx)} {n(g - h - 6)}Q{n(cx + r)} {n(g - h)} {n(cx + r)} {n(g - h + r * 1.4)}V{n(g)}Z', f)


def balaustrada(x, y, w):
    return R(x, y - 16, w, 16, 'url(#pb)') + R(x, y - 18, w, 3, T3) + R(x, y - 2, w, 3, T3)


# ---- vegetación y accesorios -----------------------------------------------------------------------------
def cipres(x, g, h, w=7, f=T2):
    return P(f'M{n(x)} {n(g)}C{n(x - w)} {n(g - h * .35)} {n(x - w)} {n(g - h * .75)} {n(x)} {n(g - h)}C{n(x + w)} {n(g - h * .75)} {n(x + w)} {n(g - h * .35)} {n(x)} {n(g)}Z', f)


def arbol(x, g, h, r=None, f=T2, tronco=T3):
    r = r or h * .42
    return R(x - 2, g - h * .5, 4, h * .5, tronco) + C(x, g - h + r, r, f) + C(x - r * .6, g - h + r * 1.4, r * .7, f) + C(x + r * .6, g - h + r * 1.4, r * .7, f)


def pino_parasol(x, g, h, f=T2):
    return (R(x - 2, g - h * .7, 4, h * .7, T3)
            + P(f'M{n(x - h * .45)} {n(g - h * .6)}Q{n(x)} {n(g - h * 1.15)} {n(x + h * .45)} {n(g - h * .6)}Q{n(x)} {n(g - h * .5)} {n(x - h * .45)} {n(g - h * .6)}Z', f))


def abeto(x, g, h, w=None, f=T2):
    w = w or h * .5
    return (R(x - 1.5, g - 8, 3, 8, T3)
            + poly([(x - w / 2, g - 6), (x, g - h * .45), (x + w / 2, g - 6)], f)
            + poly([(x - w * .4, g - h * .38), (x, g - h * .75), (x + w * .4, g - h * .38)], f)
            + poly([(x - w * .28, g - h * .68), (x, g - h), (x + w * .28, g - h * .68)], f))


def arbol_desnudo(x, g, h, f=T2):
    return P(f'M{n(x - 2.5)} {n(g)}L{n(x - 1.5)} {n(g - h * .5)}L{n(x - h * .3)} {n(g - h * .85)}L{n(x - h * .27)} {n(g - h * .88)}L{n(x - 1)} {n(g - h * .62)}'
             f'L{n(x + 1)} {n(g - h)}L{n(x + 3)} {n(g - h)}L{n(x + 1.5)} {n(g - h * .7)}L{n(x + h * .32)} {n(g - h * .8)}L{n(x + h * .34)} {n(g - h * .77)}L{n(x + 2)} {n(g - h * .55)}L{n(x + 2.5)} {n(g)}Z', f)


def podado(x, g, h, w, f=T2):
    """Tilo recortado en caja (jardín a la francesa)."""
    return R(x - 1.5, g - h * .35, 3, h * .35, T3) + R(x - w / 2, g - h, w, h * .68, f, rx=4)


def cono(x, g, h, f=T2):
    return poly([(x - h * .22, g), (x, g - h), (x + h * .22, g)], f)


def nube(cx, cy, s=1, f=T1):
    return (E(cx, cy, 40 * s, 13 * s, f) + E(cx - 16 * s, cy - 7 * s, 22 * s, 14 * s, f) + E(cx + 16 * s, cy - 6 * s, 20 * s, 12 * s, f))


def niebla(y, h=18, o=.8, f=T1):
    """Jirones de niebla: elipses anchas que se desvanecen hacia los bordes."""
    return (E(150, y + h / 2, 210, h / 2, f, o) + E(300, y + h / 2 + 2, 150, h / 2.4, f, o) + E(40, y + h / 2 - 2, 120, h / 2.6, f, o))


def humo(x, y, s=1):
    return (C(x, y, 5 * s, T1) + C(x + 5 * s, y - 8 * s, 7 * s, T1) + C(x + 13 * s, y - 15 * s, 9 * s, T1) + C(x + 24 * s, y - 21 * s, 10 * s, T1))


def colinas(g, alto=50, f=T1, fase=0):
    a = g - alto
    return P(f'M0 {n(g)}V{n(a + 20 + fase)}C70 {n(a - 10)} 130 {n(a + 4)} 200 {n(a + 12)}C260 {n(a + 18)} 330 {n(a - 14)} 390 {n(a + 8 + fase)}V{n(g)}Z', f)


def montanas(g, alto, f=T1, desfase=0):
    a = g - alto
    pts = [(0, g), (0, a + 50), (60 + desfase, a + 10), (110 + desfase, a + 40), (175 + desfase, a), (240 + desfase, a + 44),
           (300 + desfase, a + 14), (355 + desfase, a + 48), (390, a + 30), (390, g)]
    return poly(pts, f)


def rio(y, h=26):
    out = [R(0, y, W, h, T1)]
    for i, (x, yy, l) in enumerate(((20, 8, 50), (120, 16, 70), (230, 7, 40), (300, 17, 60), (90, 20, 30), (350, 10, 30))):
        out.append(R(x, y + yy, l, 1.5, LINO, rx=1))
    return ''.join(out)


def fuente(cx, g, w=60):
    return (E(cx, g - 6, w / 2, 8, T2) + R(cx - w / 2, g - 16, w, 12, T2) + R(cx - w / 2 - 2, g - 18, w + 4, 3, T3)
            + R(cx - 4, g - 40, 8, 24, T3) + E(cx, g - 42, 16, 5, T2) + R(cx - 1.5, g - 62, 3, 20, T2) + C(cx, g - 62, 2.5, T2))


def obelisco(cx, g, h):
    return (R(cx - 10, g - 14, 20, 14, T3) + R(cx - 7, g - 20, 14, 6, T2)
            + poly([(cx - 5, g - 20), (cx - 3.5, g - h), (cx, g - h - 7), (cx + 3.5, g - h), (cx + 5, g - 20)], T2))


def farola(x, g, h=34):
    return R(x - 1, g - h, 2, h, T3) + R(x - 4, g - h - 9, 8, 10, T3, rx=2)


def quiosco(x, g):
    return (R(x - 12, g - 34, 24, 34, T2) + poly([(x - 16, g - 34), (x, g - 48), (x + 16, g - 34)], T3) + R(x - 1.5, g - 54, 3, 7, T3)
            + R(x - 8, g - 28, 16, 20, LINO, rx=2))


def chimenea(x, g, h, w=10):
    return R(x - w / 2, g - h, w, h, T2) + R(x - w / 2 - 2, g - h, w + 4, 5, T3) + humo(x + 2, g - h - 8, .8)


def tranvia(x, g, w=74):
    return (R(x, g - 22, w, 20, T2, rx=3) + R(x - 2, g - 24, w + 4, 4, T3, rx=2) + R(x + 6, g - 18, w - 12, 9, 'url(#pp)')
            + R(x + w / 2 - 1, g - 38, 2, 14, T3) + R(x + 4, g - 4, w - 8, 3, T3) + R(x + w / 2 - 8, g - 42, 16, 2, T3))


def puente_hierro(x, g, w, h=40, arcos=3):
    """Puente de hierro de celosía: tablero y arcos con cristalera de huecos."""
    out = [R(x, g - h, w, 6, T3)]
    paso = w / arcos
    for i in range(arcos):
        ax = x + paso * i
        out.append(P(f'M{n(ax)} {n(g)}V{n(g - h + 6)}Q{n(ax + paso / 2)} {n(g - h - 14)} {n(ax + paso)} {n(g - h + 6)}V{n(g)}Z', T2))
        out.append(P(f'M{n(ax + 8)} {n(g)}V{n(g - h + 14)}Q{n(ax + paso / 2)} {n(g - h - 2)} {n(ax + paso - 8)} {n(g - h + 14)}V{n(g)}Z', T1))
    out.append(R(x, g - h + 6, w, 10, 'url(#pp)'))
    return ''.join(out)


def noria(cx, g, r):
    out = [poly([(cx - r * .55, g), (cx, g - r * 1.05), (cx + r * .55, g)], T2),
           C(cx, g - r - 8, r, 'none').replace('fill="none"', f'fill="none" stroke="{T2}" stroke-width="5"'),
           C(cx, g - r - 8, r * .82, 'none').replace('fill="none"', f'fill="none" stroke="{T2}" stroke-width="2"')]
    import math
    for k in range(12):
        a = math.pi * 2 * k / 12
        out.append(P(f'M{n(cx)} {n(g - r - 8)}L{n(cx + r * math.cos(a))} {n(g - r - 8 + r * math.sin(a))}', 'none', stroke=T2, sw=2))
        out.append(R(cx + r * math.cos(a) - 4, g - r - 8 + r * math.sin(a) - 2, 8, 9, T3, rx=2))
    out.append(C(cx, g - r - 8, 6, T3))
    return ''.join(out)


def grua(x, g, h, brazo=50, lado=1):
    return (R(x - 2, g - h, 4, h, T2) + R(x - 4 if lado > 0 else x - brazo + 4, g - h, brazo, 3, T2)
            + R(x + (brazo - 10) * lado - 1, g - h, 2, 16, T2) + R(x + (brazo - 10) * lado - 4, g - h + 16, 8, 6, T3))


def banda_suelo(y, mitad=None):
    """Banda de suelo de 48 px: bordillo T3 (3 px), cuerpo T2, borde T3 (3 px). mitad='sup'|'inf' = solo 24 px."""
    if mitad == 'sup':
        return R(0, y, W, 24, T2) + R(0, y, W, 3, T3)
    if mitad == 'inf':
        return R(0, y, W, 24, T2) + R(0, y + 21, W, 3, T3)
    return R(0, y, W, 48, T2) + R(0, y, W, 3, T3) + R(0, y + 45, W, 3, T3)


def silueta_lejana(g, semilla, alto=(50, 120), f=T1, x0=-10, x1=400, torres=True):
    """Fila de perfiles sencillos al fondo (sin ventanas)."""
    rnd = random.Random(semilla)
    out = []
    x = x0
    while x < x1:
        w = rnd.choice((26, 34, 42, 50))
        h = rnd.randint(*alto)
        k = rnd.random()
        if k < .45:
            out.append(R(x, g - h, w, h, f))
        elif k < .8:
            out.append(R(x, g - h, w, h, f) + poly([(x - 1, g - h), (x + w / 2, g - h - w * .5), (x + w + 1, g - h)], f))
        elif torres:
            out.append(R(x, g - h, w * .5, h, f) + poly([(x - 1, g - h), (x + w * .25, g - h - w * .9), (x + w * .5 + 1, g - h)], f))
            x -= w * .5
        else:
            out.append(R(x, g - h, w, h, f))
        x += w + rnd.choice((0, 2, 4))
    return ''.join(out)


# ---- franjas por movimiento -------------------------------------------------------------------------------
# Cada función de franja recibe (y0, h): la franja ocupa [y0, y0+h): media banda arriba, escena, media banda abajo.
# g = y0 + h - 24 es la línea de suelo (bordillo) donde apoyan los edificios.

def franja(y0, h, cuerpo):
    g = y0 + h - BANDA
    return banda_suelo(y0, 'sup') + cuerpo(g, y0 + BANDA) + banda_suelo(g, 'inf')


# Renacimiento ------------------------------------------------------------------------------------------------
def ren_florencia(g, cielo):
    out = [nube(80, cielo + 40, .9), nube(300, cielo + 24, .7),
           colinas(g, 70), silueta_lejana(g, 11, (40, 90)),
           # palacio con almohadillado (Strozzi / Medici)
           R(0, g - 150, 150, 150, T2), R(-2, g - 150, 154, 4, T3), R(0, g - 56, 150, 56, 'url(#pr)'),
           win(0, g - 150, 150, 94, 'pa', 6, 8, 2), R(-2, g - 94, 154, 3, T3),
           P(f'M62 {n(g)}V{n(g - 36)}A14 14 0 0 1 90 {n(g - 36)}V{n(g)}Z', LINO),
           # campanile de Giotto
           torre(188, g, 30, 215, 'plano', pat='pa'), R(184, g - 217, 38, 4, T3), R(186, g - 60, 34, 3, T3), R(186, g - 130, 34, 3, T3),
           # casas-torre y loggia
           caja(228, g, 50, 100, pat='pw'), casa_lateral(282, g, 70, 86, 16),
           arcada(352, g, 60, 70, 2),
           cipres(165, g, 70), cipres(176, g, 50), cipres(372, g, 60, 6), cipres(384, g, 40, 5)]
    return ''.join(out)


def ren_cupula(g, cielo):
    out = [nube(60, cielo + 30, .7), nube(330, cielo + 56, .9),
           colinas(g, 60, fase=10), silueta_lejana(g, 12, (36, 80)),
           cipres(30, g, 54), cipres(44, g, 40),
           # Santa Maria del Fiore: naves, cúpula de Brunelleschi, baptisterio
           R(40, g - 110, 310, 110, T2), R(38, g - 110, 314, 4, T3), win(40, g - 110, 310, 110, 'pa', 8, 10, 10),
           cupula(215, g - 110, 180, 34),
           R(90, g - 150, 20, 40, T2), R(88, g - 150, 24, 3, T3), R(300, g - 150, 20, 40, T2), R(298, g - 150, 24, 3, T3),
           # baptisterio octogonal (a la derecha)
           poly([(318, g), (318, g - 70), (330, g - 80), (390, g - 80), (390, g)], T2), R(330, g - 82, 70, 4, T3),
           poly([(316, g - 80), (355, g - 104), (394, g - 80)], T3),
           # palazzo con loggia (izquierda)
           arcada(0, g, 60, 60, 2), R(0, g - 120, 60, 60, T2), R(-2, g - 120, 64, 3, T3), win(0, g - 120, 60, 60, 'pa', 4, 8, 4)]
    return ''.join(out)


def ren_roma(g, cielo):
    out = [nube(200, cielo + 36, 1), colinas(g, 56, fase=-8), silueta_lejana(g, 13, (40, 100)),
           # Panteón: pórtico con frontón y cúpula baja detrás
           cupula(150, g - 90, 150, 24, nervios=False, linterna=False), R(75, g - 90, 150, 90, T2),
           columnata(60, g, 150, 86, 8), fronton(60, g - 94, 150, 34),
           # Villa con pinos y obelisco
           obelisco(290, g, 120),
           caja(318, g, 72, 118, pat='pw'), fronton(318, g - 118, 72, 20),
           pino_parasol(30, g, 120), pino_parasol(250, g, 96), cipres(372, g, 70), cipres(385, g, 50)]
    return ''.join(out)


# Manierismo y Norte --------------------------------------------------------------------------------------------
def nor_canal(g, cielo):
    out = [nube(120, cielo + 30, .8), nube(320, cielo + 40, .6),
           silueta_lejana(g - 40, 21, (50, 110)),
           # torre gótica tardía al fondo (Amberes/Brujas)
           torre(300, g - 40, 30, 160, 'aguja', f=T1, alto_remate=64),
           torre(150, g - 40, 40, 140, 'almenas', f=T1)]
    # fila de casas de hastial sobre el canal
    x = -6
    rnd = random.Random(5)
    while x < 396:
        w = rnd.choice((44, 50, 56))
        h = rnd.choice((110, 126, 140))
        if rnd.random() < .75:
            out.append(hastial(x, g - 40, w, h, rnd.choice((3, 4, 5))))
        else:
            out.append(campana(x, g - 40, w, h))
        out.append(R(x, g - 40, w, 3, T3))
        x += w + 3
    # canal con puente
    out.append(rio(g - 40, 40))
    out.append(P(f'M60 {n(g)}V{n(g - 22)}Q110 {n(g - 58)} 160 {n(g - 22)}V{n(g)}Z', T2))
    out.append(P(f'M76 {n(g)}V{n(g - 18)}Q110 {n(g - 46)} 144 {n(g - 18)}V{n(g)}Z', T1))
    out.append(R(58, g - 40, 104, 4, T3))
    # barca
    out.append(P(f'M250 {n(g - 8)}L256 {n(g - 2)}H300L306 {n(g - 8)}Z', T2))
    return ''.join(out)


def nor_catedral(g, cielo):
    out = [nube(70, cielo + 50, .7), nube(250, cielo + 24, .9),
           silueta_lejana(g, 22, (40, 90)),
           # muralla con torres
           R(0, g - 44, 390, 44, T1), R(0, g - 50, 390, 6, T1),
           # catedral gótica tardía: torre alta, nave, arbotantes
           torre(70, g, 44, 220, 'aguja', alto_remate=90, pat='pg'),
           R(114, g - 120, 110, 120, T2), R(112, g - 120, 114, 4, T3), win(114, g - 120, 110, 120, 'pg', 6, 8, 8),
           poly([(110, g - 120), (169, g - 160), (228, g - 120)], T3),
           torre(224, g, 30, 150, 'aguja', alto_remate=60, pat='pg'),
           # ayuntamiento con hastial y casas alemanas (entramado sugerido con bandas T3)
           hastial(262, g, 70, 120, 5), R(262, g - 60, 70, 2, T3),
           casa(336, g, 54, 90, 30), R(340, g - 50, 2, 50, T3), R(362, g - 50, 2, 50, T3), R(384, g - 50, 2, 50, T3),
           # molino
           R(20, g - 60, 24, 60, T2), poly([(16, g - 60), (32, g - 76), (48, g - 60)], T3),
           P(f'M32 {n(g - 70)}L52 {n(g - 100)}M32 {n(g - 70)}L12 {n(g - 40)}M32 {n(g - 70)}L62 {n(g - 50)}M32 {n(g - 70)}L2 {n(g - 90)}', 'none', stroke=T3, sw=3)]
    return ''.join(out)


# Barroco -------------------------------------------------------------------------------------------------------
def bar_plaza_mayor(g, cielo):
    out = [nube(90, cielo + 30, .8), nube(310, cielo + 48, .7), silueta_lejana(g - 30, 31, (40, 80))]
    # Plaza Mayor de Madrid: fachada corrida con soportales y chapiteles de pizarra
    out.append(R(0, g - 130, 390, 100, T2))
    out.append(R(0, g - 132, 390, 4, T3))
    out.append(win(0, g - 130, 390, 100, 'pw', 6, 8, 2))
    for yy in (g - 100, g - 70):
        out.append(R(0, yy, 390, 2, T3))
    out.append(arcada(0, g, 390, 32, 10))
    for tx in (40, 300):
        out.append(torre(tx, g - 130, 50, 40, 'chapitel', alto_remate=70, pat='pw'))
    out.append(poly([(120, g - 130), (195, g - 170), (270, g - 130)], T3))
    out.append(R(100, g - 134, 190, 4, T3))
    # fuente y farolas en la plaza
    out.append(fuente(195, g, 64))
    out.append(farola(60, g, 30))
    out.append(farola(330, g, 30))
    return ''.join(out)


def bar_roma(g, cielo):
    out = [nube(60, cielo + 40, .8), nube(260, cielo + 20, 1), silueta_lejana(g, 32, (40, 100)),
           cupula(330, g - 60, 110, 26, nervios=True),
           # iglesia barroca: torres gemelas, frontón partido, óculo, columnas salomónicas
           R(90, g - 150, 210, 150, T2), R(88, g - 150, 214, 4, T3),
           torre(60, g, 40, 200, 'cupulin', pat='pa'), torre(290, g, 40, 200, 'cupulin', pat='pa'),
           fronton_partido(195, g - 150, 150, 40),
           C(195, g - 110, 18, LINO), C(195, g - 110, 13, T2), C(195, g - 110, 9, LINO),
           win(90, g - 150, 210, 150, 'pa', 8, 60, 50)]
    for cx in (120, 150, 240, 270):
        out.append(R(cx - 7, g - 110, 14, 110, T1))
        y = g - 104
        while y < g - 10:
            out.append(P(f'M{n(cx - 7)} {n(y)}q7 8 14 0', 'none', stroke=T3, sw=2.5))
            y += 14
        out.append(R(cx - 10, g - 116, 20, 7, T3))
    out.append(P(f'M170 {n(g)}V{n(g - 44)}A25 25 0 0 1 220 {n(g - 44)}V{n(g)}Z', T3))
    out.append(P(f'M178 {n(g)}V{n(g - 42)}A17 17 0 0 1 212 {n(g - 42)}V{n(g)}Z', LINO))
    out.append(obelisco(30, g, 100))
    out.append(fuente(350, g, 50))
    return ''.join(out)


def bar_sevilla(g, cielo):
    out = [nube(120, cielo + 24, .9), nube(330, cielo + 60, .6), silueta_lejana(g, 33, (36, 80), torres=False),
           # Catedral con pináculos y Giralda
           R(20, g - 120, 190, 120, T2), R(18, g - 120, 194, 4, T3), win(20, g - 120, 190, 120, 'pg', 8, 10, 10)]
    for px in range(30, 210, 30):
        out.append(poly([(px - 4, g - 120), (px, g - 140), (px + 4, g - 120)], T3))
    out.append(R(224, g - 210, 50, 210, T2))
    out.append(R(228, g - 180, 42, 100, 'url(#ps)'))
    out.append(win(224, g - 80, 50, 80, 'pa', 6, 6, 6))
    out.append(R(222, g - 212, 54, 4, T3))
    out.append(arcada(230, g - 212, 38, 34, 2))
    out.append(R(236, g - 270, 26, 24, T2))
    out.append(P(f'M232 {n(g - 270)}C232 {n(g - 292)} 266 {n(g - 292)} 266 {n(g - 270)}Z', T3))
    out.append(R(248, g - 304, 2, 14, T3))
    out.append(C(249, g - 306, 3, T3))
    # casas encaladas y palmeras
    out.append(caja(290, g, 60, 80, pat='pw'))
    out.append(caja(354, g, 50, 60, pat='pw'))
    for px, ph in ((336, 110), (378, 90)):
        out.append(R(px - 2, g - ph, 4, ph, T3))
        for dx, dy in ((-26, -8), (26, -8), (-18, -24), (18, -24), (0, -30)):
            out.append(E(px + dx / 2, g - ph + dy / 2, 16, 5, T2))
    for ax in (8, 40, 70, 100):
        out.append(arbol(ax, g, 40, 14))
    return ''.join(out)


# Rococó y Neoclasicismo ---------------------------------------------------------------------------------------------
def roc_palacio(g, cielo):
    out = [nube(100, cielo + 36, .9), nube(300, cielo + 26, .8), silueta_lejana(g - 70, 41, (40, 70), torres=False),
           # palacio largo con columnata central, frontón y balaustrada
           R(0, g - 160, 390, 90, T2), R(-2, g - 160, 394, 4, T3), win(0, g - 160, 390, 90, 'pa', 8, 10, 8),
           balaustrada(0, g - 160, 390),
           columnata(130, g - 70, 130, 90, 7), fronton(130, g - 164, 130, 30), balaustrada(130, g - 164, 130)]
    for xx in (0, 330):
        out.append(R(xx, g - 180, 60, 110, T2))
        out.append(R(xx - 2, g - 180, 64, 4, T3))
        out.append(win(xx, g - 180, 60, 110, 'pa', 6, 8, 8))
    # jardín a la francesa: parterres, estanque, conos
    out.append(R(0, g - 70, 390, 70, T1))
    out.append(E(195, g - 34, 60, 16, T2))
    out.append(E(195, g - 34, 50, 12, T1))
    out.append(R(193, g - 60, 4, 26, T2))
    out.append(E(195, g - 60, 10, 3, T2))
    for px in (20, 50, 340, 370):
        out.append(cono(px, g, 60))
    for px in (90, 120, 270, 300):
        out.append(podado(px, g, 50, 26))
    for xx in (70, 245):
        out.append(R(xx, g - 24, 74, 12, T2, rx=6))
        out.append(R(xx + 6, g - 20, 62, 4, T1, rx=2))
    return ''.join(out)


def neo_ciudad(g, cielo):
    out = [nube(60, cielo + 30, .7), nube(230, cielo + 50, .9), silueta_lejana(g, 42, (40, 90), torres=False),
           # rotonda con cúpula (Panteón de París / Observatorio)
           cupula(70, g - 70, 110, 26, nervios=False), columnata(20, g, 100, 66, 6), fronton(20, g - 70, 100, 26),
           # Puerta de Alcalá
           R(150, g - 90, 110, 90, T2), R(148, g - 92, 114, 4, T3),
           P(f'M187 {n(g)}V{n(g - 60)}A18 18 0 0 1 223 {n(g - 60)}V{n(g)}Z', LINO),
           R(158, g - 48, 18, 48, LINO), R(234, g - 48, 18, 48, LINO),
           R(165, g - 118, 80, 28, T2), fronton(165, g - 118, 80, 18),
           # museo con pórtico dórico (Prado)
           R(270, g - 100, 120, 100, T2), R(268, g - 100, 124, 4, T3), win(270, g - 100, 120, 100, 'pw', 6, 8, 8),
           columnata(282, g, 96, 70, 6), fronton(282, g - 74, 96, 24)]
    for px in (130, 140):
        out.append(podado(px, g, 54, 18))
    out.append(obelisco(382, g, 70))
    return ''.join(out)


def roc_jardin(g, cielo):
    out = [nube(180, cielo + 30, 1), colinas(g - 60, 60, fase=6),
           # orangerie y pabellón con terrazas
           caja(20, g - 60, 140, 60, pat='pa', mx=6, my=8, mb=6), fronton(60, g - 120, 60, 22), balaustrada(20, g - 120, 140),
           cupula(310, g - 90, 80, 22, nervios=False), R(260, g - 90, 100, 30, T2), R(258, g - 90, 104, 4, T3),
           columnata(268, g - 60, 84, 30, 5),
           # escalinata y terraza
           R(0, g - 60, 390, 12, T2), R(0, g - 48, 390, 12, T1), R(0, g - 36, 390, 12, T2), R(0, g - 24, 390, 24, T1),
           balaustrada(170, g - 60, 60)]
    for px in (12, 40, 350, 378):
        out.append(cono(px, g - 60, 50))
    for px in (100, 130, 250, 280):
        out.append(cono(px, g, 40))
    out.append(E(195, g - 10, 40, 8, T2))
    out.append(E(195, g - 10, 32, 5, T1))
    return ''.join(out)


# Romanticismo ---------------------------------------------------------------------------------------------------
def rom_bosque(g, cielo):
    out = [C(300, cielo + 60, 22, T1), montanas(g, 170, T1), niebla(g - 110, 22, .9), montanas(g, 110, T2, 40), niebla(g - 60, 26, .85)]
    rnd = random.Random(51)
    for x in range(-6, 400, 18):
        out.append(abeto(x + rnd.randint(-4, 4), g, rnd.randint(60, 120), f=T2 if rnd.random() < .7 else T1))
    out.append(niebla(g - 26, 20, .7))
    return ''.join(out)


def rom_castillo(g, cielo):
    out = [C(70, cielo + 50, 18, T1), nube(250, cielo + 40, 1, T1), montanas(g, 150, T1, -30), niebla(g - 90, 24, .9),
           # peñasco
           poly([(100, g), (120, g - 100), (150, g - 126), (200, g - 136), (250, g - 126), (280, g - 90), (300, g)], T2),
           # castillo
           R(150, g - 180, 100, 54, T2), R(148, g - 180, 104, 3, T3), win(150, g - 180, 100, 54, 'pg', 4, 6, 8),
           torre(130, g - 126, 26, 80, 'aguja', alto_remate=40, pat='pg'), torre(244, g - 126, 26, 70, 'aguja', alto_remate=36, pat='pg'),
           torre(185, g - 180, 30, 40, 'aguja', alto_remate=44, pat='pg'),
           niebla(g - 40, 26, .8)]
    for x, h in ((20, 90), (50, 70), (330, 100), (365, 80), (385, 60)):
        out.append(abeto(x, g, h))
    out.append(arbol_desnudo(90, g, 70))
    out.append(arbol_desnudo(310, g, 60))
    return ''.join(out)


def rom_ruinas(g, cielo):
    out = [nube(120, cielo + 30, .8), colinas(g, 60, T1), silueta_lejana(g - 20, 52, (30, 80)), niebla(g - 50, 20, .8),
           # abadía en ruinas: muro con ventanales ojivales rotos
           R(60, g - 160, 24, 160, T2), R(84, g - 150, 120, 150, T2), arco_ojival(144, g, 70, 120, LINO),
           poly([(84, g - 150), (110, g - 180), (130, g - 166), (160, g - 190), (204, g - 150)], T2),
           R(204, g - 130, 20, 130, T2), R(224, g - 90, 60, 90, T2), arco_ojival(254, g - 20, 30, 50, LINO),
           poly([(224, g - 90), (250, g - 110), (284, g - 90)], T2),
           # rosetón roto
           C(144, g - 140, 16, LINO), C(144, g - 140, 5, T2)]
    for px in (300, 340, 380, 20):
        out.append(arbol_desnudo(px, g, 90 if px != 20 else 70))
    out.append(niebla(g - 18, 16, .6))
    return ''.join(out)


def rom_ciudad_lejana(g, cielo):
    out = [C(200, cielo + 44, 20, T1), nube(80, cielo + 70, .9), montanas(g - 60, 90, T1, 20), niebla(g - 120, 24, .9),
           silueta_lejana(g - 60, 53, (40, 110), T2),
           torre(180, g - 60, 26, 170, 'aguja', alto_remate=70, pat='pg'), torre(214, g - 60, 26, 150, 'aguja', alto_remate=60, pat='pg'),
           R(170, g - 160, 80, 100, T2), win(170, g - 160, 80, 100, 'pg', 6, 8, 8),
           cupula(300, g - 80, 70, 20, nervios=False),
           rio(g - 60, 60),
           P(f'M0 {n(g)}V{n(g - 20)}Q60 {n(g - 50)} 120 {n(g - 20)}V{n(g)}Z', T2),
           P(f'M12 {n(g)}V{n(g - 16)}Q60 {n(g - 40)} 108 {n(g - 16)}V{n(g)}Z', T1),
           niebla(g - 40, 20, .6)]
    for px, h in ((320, 70), (350, 90), (380, 60)):
        out.append(abeto(px, g, h))
    return ''.join(out)


# Realismo --------------------------------------------------------------------------------------------------------
def rea_fabricas(g, cielo):
    out = [nube(260, cielo + 30, .8), silueta_lejana(g, 61, (40, 90), torres=False)]
    for x, h in ((40, 165), (120, 130), (330, 150)):
        out.append(chimenea(x, g, h))
    # naves con dientes de sierra
    out.append(R(60, g - 80, 200, 80, T2))
    out.append(win(60, g - 80, 200, 80, 'pw', 6, 20, 8))
    for i in range(5):
        x = 60 + i * 40
        out.append(poly([(x, g - 80), (x + 28, g - 104), (x + 40, g - 80)], T3))
    # gasómetro
    out.append(R(280, g - 110, 90, 110, T1))
    for x in (280, 310, 340, 368):
        out.append(R(x, g - 118, 3, 118, T2))
    out.append(R(278, g - 60, 94, 3, T2))
    out.append(R(278, g - 100, 94, 3, T2))
    # depósito de agua
    out.append(R(10, g - 70, 4, 70, T2))
    out.append(R(30, g - 70, 4, 70, T2))
    out.append(R(4, g - 100, 36, 32, T2, rx=4))
    out.append(R(16, g - 108, 12, 8, T2))
    return ''.join(out)


def rea_estacion(g, cielo):
    out = [nube(60, cielo + 40, .7), humo(250, cielo + 90, 1.3), silueta_lejana(g - 60, 62, (40, 80), torres=False),
           # estación con marquesina de cristal y torre del reloj
           R(40, g - 150, 230, 90, T2), R(38, g - 150, 234, 4, T3),
           P(f'M60 {n(g - 60)}V{n(g - 110)}A95 70 0 0 1 250 {n(g - 110)}V{n(g - 60)}Z', T1),
           P(f'M70 {n(g - 60)}V{n(g - 108)}A85 62 0 0 1 240 {n(g - 108)}V{n(g - 60)}Z', 'url(#pp)'),
           torre(270, g - 60, 40, 130, 'aguja', alto_remate=36, pat='pw'), C(290, g - 160, 10, LINO), C(290, g - 160, 3, T3),
           caja(314, g - 60, 76, 70, pat='pw'),
           # río con puente de hierro y barcaza
           rio(g - 60, 60), puente_hierro(0, g - 10, 390, 44, 4),
           P(f'M300 {n(g - 20)}L306 {n(g - 12)}H356L362 {n(g - 20)}Z', T2), R(320, g - 30, 6, 10, T3)]
    return ''.join(out)


def rea_campos(g, cielo):
    out = [nube(150, cielo + 26, 1), colinas(g, 80, T1),
           # campos ondulados con surcos
           P(f'M0 {n(g)}V{n(g - 40)}C100 {n(g - 70)} 200 {n(g - 20)} 390 {n(g - 48)}V{n(g)}Z', T2)]
    for yy in range(8, 40, 8):
        out.append(P(f'M0 {n(g - yy - 2)}C100 {n(g - yy - 30)} 200 {n(g - yy + 16)} 390 {n(g - yy - 10)}', 'none', stroke=T3, sw=1.5))
    # aldea
    out.append(casa(40, g - 46, 50, 36, 16))
    out.append(casa(96, g - 48, 40, 30, 14))
    out.append(torre(146, g - 50, 18, 56, 'aguja', alto_remate=26, pat=None))
    out.append(casa_lateral(168, g - 50, 60, 34, 14))
    # almiares
    for px in (280, 320, 360):
        out.append(P(f'M{n(px - 16)} {n(g - 36)}C{n(px - 16)} {n(g - 64)} {n(px + 16)} {n(g - 64)} {n(px + 16)} {n(g - 36)}Z', T2))
    for px in (250, 380):
        out.append(arbol(px, g - 36, 50, 16))
    return ''.join(out)


def rea_barrio_obrero(g, cielo):
    out = [nube(320, cielo + 36, .8), silueta_lejana(g, 64, (50, 110), torres=False), chimenea(360, g, 160, 8), chimenea(20, g, 140, 8)]
    # casas adosadas en hilera, con chimeneas
    x = 40
    while x < 330:
        out.append(casa_lateral(x, g, 46, 70, 14))
        out.append(R(x + 30, g - 92, 6, 12, T3))
        x += 48
    # castillete de mina y esclusa de canal
    out.append(poly([(330, g), (348, g - 120), (366, g)], T2))
    out.append(C(348, g - 120, 12, T3))
    out.append(C(348, g - 120, 5, LINO))
    out.append(R(0, g - 30, 60, 30, T1))
    out.append(R(28, g - 44, 6, 44, T3))
    return ''.join(out)


# Impresionismo ------------------------------------------------------------------------------------------------------
def imp_bulevar(g, cielo):
    out = [nube(90, cielo + 36, 1), nube(300, cielo + 20, .7), silueta_lejana(g, 71, (60, 120), torres=False),
           # torre Eiffel lejana
           poly([(200, g), (214, g - 120), (218, g - 200), (222, g - 120), (236, g)], T1),
           R(196, g - 60, 44, 6, T1), R(206, g - 120, 24, 5, T1)]
    # manzanas Haussmann: cuerpo, balcones corridos, mansarda con buhardillas
    x = -10
    rnd = random.Random(71)
    while x < 396:
        w = rnd.choice((70, 86, 100))
        out.append(R(x, g - 130, w, 130, T2))
        out.append(R(x, g - 150, w, 20, T3))
        out.append(win(x, g - 130, w, 130, 'pw', 5, 6, 10))
        for yy in (g - 94, g - 40):
            out.append(R(x + 2, yy, w - 4, 2.5, T3))
        for bx in range(int(x + 10), int(x + w - 10), 24):
            out.append(R(bx, g - 146, 8, 10, T2, rx=1))
            out.append(R(bx + 2, g - 144, 4, 6, LINO))
        out.append(P(f'M{n(x + w / 2 - 14)} {n(g)}V{n(g - 22)}A14 14 0 0 1 {n(x + w / 2 + 14)} {n(g - 22)}V{n(g)}Z', T3))
        x += w + 2
    # árboles en hilera, quioscos y farolas
    for px in (30, 110, 280, 360):
        out.append(arbol(px, g, 60, 18))
    out.append(quiosco(190, g))
    for px in (70, 230, 320):
        out.append(farola(px, g, 30))
    return ''.join(out)


def imp_estacion(g, cielo):
    out = [nube(330, cielo + 40, .9), humo(120, cielo + 80, 1.2), humo(200, cielo + 110, .8), silueta_lejana(g - 50, 72, (50, 100), torres=False),
           # Gare Saint-Lazare: marquesina de hierro y cristal
           P(f'M20 {n(g - 50)}V{n(g - 110)}Q195 {n(g - 240)} 370 {n(g - 110)}V{n(g - 50)}Z', T2),
           P(f'M34 {n(g - 50)}V{n(g - 110)}Q195 {n(g - 224)} 356 {n(g - 110)}V{n(g - 50)}Z', 'url(#pp)'),
           R(16, g - 54, 358, 6, T3)]
    for xx in range(60, 340, 54):
        out.append(R(xx, g - 180, 3, 130, T3))
    # Pont de l'Europe: puente de hierro con celosía
    out.append(puente_hierro(0, g, 390, 50, 3))
    out.append(R(0, g - 50, 390, 2.5, T3))
    for px in (40, 130, 260, 350):
        out.append(farola(px, g - 50, 24))
    return ''.join(out)


# Postimpresionismo ------------------------------------------------------------------------------------------------
def post_pueblo(g, cielo):
    out = [C(300, cielo + 50, 26, T1), P(f'M0 {n(g - 60)}L120 {n(g - 170)}L240 {n(g - 120)}L390 {n(g - 150)}V{n(g)}H0Z', T1)]
    # campos ondulados
    out.append(P(f'M0 {n(g - 60)}C80 {n(g - 100)} 160 {n(g - 30)} 260 {n(g - 70)}C320 {n(g - 94)} 360 {n(g - 60)} 390 {n(g - 70)}V{n(g)}H0Z', T2))
    for yy in range(12, 60, 12):
        out.append(P(f'M0 {n(g - 60 + yy)}C80 {n(g - 100 + yy)} 160 {n(g - 30 + yy)} 260 {n(g - 70 + yy)}C320 {n(g - 94 + yy)} 360 {n(g - 60 + yy)} 390 {n(g - 70 + yy)}', 'none', stroke=T1, sw=2))
    # pueblo en lo alto: casas apiñadas y campanario
    base = g - 64
    out.append(casa_lateral(40, base - 6, 50, 36, 12))
    out.append(casa(94, base - 8, 34, 44, 14))
    out.append(casa_lateral(132, base - 10, 60, 40, 12))
    out.append(torre(196, base - 10, 22, 80, 'plano', pat='pa'))
    out.append(P(f'M198 {n(base - 92)}Q207 {n(base - 112)} 216 {n(base - 92)}', 'none', stroke=T3, sw=2.5))
    out.append(casa(222, base - 8, 44, 38, 14))
    out.append(casa_lateral(270, base - 4, 56, 34, 12))
    for px, h in ((22, 90), (34, 70), (335, 100), (348, 76), (360, 60)):
        out.append(cipres(px, base + 4, h, 8))
    # olivos y lavanda
    for px in (60, 150, 250, 300):
        out.append(arbol(px, g - 18, 34, 12))
    for yy in (g - 8, g - 16):
        for px in range(10, 390, 22):
            out.append(E(px + (6 if yy == g - 16 else 0), yy, 8, 4, T3))
    return ''.join(out)


def post_cafe(g, cielo):
    out = [C(80, cielo + 44, 22, T1), nube(260, cielo + 40, .8), P(f'M150 {n(g - 100)}L230 {n(g - 170)}L300 {n(g - 140)}L390 {n(g - 150)}V{n(g - 100)}Z', T1),
           silueta_lejana(g - 100, 81, (30, 60), torres=False),
           # trigal ondulado
           P(f'M0 {n(g - 100)}C100 {n(g - 130)} 200 {n(g - 80)} 390 {n(g - 110)}V{n(g)}H0Z', T2)]
    for yy in range(14, 100, 14):
        out.append(P(f'M0 {n(g - 100 + yy)}C100 {n(g - 130 + yy)} 200 {n(g - 80 + yy)} 390 {n(g - 110 + yy)}', 'none', stroke=T1, sw=2))
    # café con toldo y mesas
    out.append(R(0, g - 130, 150, 130, T2))
    out.append(R(-2, g - 130, 154, 3, T3))
    out.append(win(0, g - 130, 150, 130, 'pw', 6, 8, 60))
    out.append(R(0, g - 60, 160, 14, T3))
    for sx in range(0, 160, 16):
        out.append(P(f'M{n(sx)} {n(g - 46)}q8 8 16 0Z', T3))
    out.append(R(10, g - 46, 140, 46, LINO))
    for mx in (40, 90, 130):
        out.append(R(mx - 1.5, g - 18, 3, 18, T3))
        out.append(E(mx, g - 18, 12, 4, T3))
    # puente levadizo (Langlois) y plátanos
    out.append(R(240, g - 20, 100, 8, T2))
    out.append(R(258, g - 70, 4, 50, T2))
    out.append(R(318, g - 70, 4, 50, T2))
    out.append(P(f'M258 {n(g - 70)}L300 {n(g - 100)}M318 {n(g - 70)}L300 {n(g - 100)}', 'none', stroke=T2, sw=3))
    out.append(arbol(200, g, 110, 36))
    out.append(arbol(370, g, 90, 30))
    return ''.join(out)


# Simbolismo y modernismo -------------------------------------------------------------------------------------------
def mod_barcelona(g, cielo):
    out = [nube(80, cielo + 30, .8), nube(300, cielo + 50, .7), silueta_lejana(g, 91, (50, 110), torres=False)]
    # Sagrada Familia en construcción: cuatro torres parabólicas y grúas
    for cx, h in ((90, 210), (120, 240), (150, 240), (180, 210)):
        out.append(P(f'M{n(cx - 14)} {n(g)}V{n(g - h * .4)}C{n(cx - 14)} {n(g - h * .8)} {n(cx - 4)} {n(g - h)} {n(cx)} {n(g - h)}'
                     f'C{n(cx + 4)} {n(g - h)} {n(cx + 14)} {n(g - h * .8)} {n(cx + 14)} {n(g - h * .4)}V{n(g)}Z', T2))
        out.append(win(cx - 14, g - h * .85, 28, h * .85, 'pg', 4, 6, 20))
    out.append(R(76, g - 110, 118, 110, T2))
    out.append(win(76, g - 110, 118, 110, 'pg', 8, 10, 10))
    out.append(grua(60, g, 250, 60, 1))
    out.append(grua(220, g, 226, 60, -1))
    # Casa Milà: fachada ondulante
    out.append(P(f'M240 {n(g)}V{n(g - 120)}C260 {n(g - 130)} 280 {n(g - 112)} 300 {n(g - 122)}C320 {n(g - 132)} 340 {n(g - 114)} 360 {n(g - 124)}V{n(g)}Z', T2))
    for yy in (g - 95, g - 65, g - 35):
        out.append(P(f'M244 {n(yy)}C262 {n(yy - 8)} 280 {n(yy + 6)} 300 {n(yy - 2)}C320 {n(yy - 8)} 340 {n(yy + 6)} 356 {n(yy - 2)}', 'none', stroke=T3, sw=2.5))
        out.append(P(f'M244 {n(yy)}C262 {n(yy - 8)} 280 {n(yy + 6)} 300 {n(yy - 2)}C320 {n(yy - 8)} 340 {n(yy + 6)} 356 {n(yy - 2)}', 'none', stroke=LINO, sw=1))
    out.append(win(242, g - 120, 116, 120, 'pw', 6, 30, 8))
    for px in (20, 376):
        out.append(R(px - 2, g - 90, 4, 90, T3))
        for dx, dy in ((-24, -6), (24, -6), (-16, -20), (16, -20), (0, -26)):
            out.append(E(px + dx / 2, g - 90 + dy / 2, 15, 5, T2))
    return ''.join(out)


def mod_viena(g, cielo):
    out = [nube(60, cielo + 40, .9), nube(330, cielo + 24, .8), silueta_lejana(g, 92, (50, 100), torres=False),
           # noria (Riesenrad)
           noria(300, g, 70),
           # Karlskirche: cúpula y dos columnas
           cupula(120, g - 90, 90, 30), R(60, g - 90, 120, 90, T2), R(58, g - 90, 124, 4, T3), win(60, g - 90, 120, 90, 'pa', 8, 40, 10),
           columnata(84, g - 20, 72, 36, 4), fronton(84, g - 60, 72, 20),
           R(30, g - 160, 14, 160, T2), R(26, g - 166, 22, 6, T3), R(196, g - 160, 14, 160, T2), R(192, g - 166, 22, 6, T3),
           # Secesión: cubo con cúpula dorada de laurel
           R(200, g - 90, 70, 90, T2), R(198, g - 90, 74, 4, T3), R(206, g - 70, 58, 20, LINO),
           C(235, g - 112, 24, T3), C(235, g - 112, 24, 'url(#pd)'),
           # tranvía
           tranvia(150, g, 80)]
    return ''.join(out)


def mod_munich(g, cielo):
    out = [nube(200, cielo + 30, 1), silueta_lejana(g, 93, (50, 110), torres=False),
           # torre de hierro / depósito modernista
           poly([(40, g), (56, g - 150), (64, g - 150), (80, g)], T2), R(36, g - 190, 48, 40, T2, rx=8), R(34, g - 192, 52, 4, T3),
           R(44, g - 100, 32, 3, T3), R(48, g - 60, 24, 3, T3),
           # fachadas modernistas: curvas de látigo, miradores
           R(100, g - 140, 90, 140, T2), R(98, g - 140, 94, 4, T3), win(100, g - 140, 90, 140, 'pw', 6, 8, 8),
           P(f'M100 {n(g - 140)}Q145 {n(g - 176)} 190 {n(g - 140)}Z', T3),
           R(196, g - 120, 60, 120, T2), R(194, g - 120, 64, 4, T3), win(196, g - 120, 60, 120, 'pa', 6, 8, 8),
           P(f'M196 {n(g - 120)}C210 {n(g - 150)} 240 {n(g - 150)} 256 {n(g - 120)}Z', T3),
           R(262, g - 150, 70, 150, T2), R(260, g - 150, 74, 4, T3), win(262, g - 150, 70, 150, 'pw', 6, 8, 8),
           R(276, g - 160, 42, 12, T3, rx=6)]
    for yy in (g - 100, g - 56):
        out.append(P(f'M104 {n(yy)}c10 -8 20 8 30 0s20 -8 30 0s14 6 22 0', 'none', stroke=T3, sw=2.5))
        out.append(P(f'M266 {n(yy)}c8 -8 16 8 24 0s16 -8 24 0s10 6 14 0', 'none', stroke=T3, sw=2.5))
    # cúpula dorada y tranvía
    out.append(cupula(365, g - 60, 60, 20, nervios=False))
    out.append(R(336, g - 60, 60, 60, T2))
    out.append(win(336, g - 60, 60, 60, 'pa', 4, 6, 6))
    out.append(C(365, g - 60 - 20 - 27, 10, 'url(#pd)'))
    out.append(tranvia(120, g, 90))
    return ''.join(out)


# ---- catálogo de escenarios -------------------------------------------------------------------------------------
ESCENAS = {
    'renacimiento': ('Florencia y Roma del Renacimiento', [(300, ren_florencia), (300, ren_cupula), (300, ren_roma)]),
    'manierismo-y-norte': ('Ciudad flamenca y alemana', [(320, nor_canal), (320, nor_catedral)]),
    'barroco': ('Madrid, Roma y Sevilla barrocas', [(320, bar_plaza_mayor), (330, bar_roma), (330, bar_sevilla)]),
    'rococo-neoclasicismo': ('Palacio, jardín y ciudad neoclásica', [(320, roc_palacio), (300, neo_ciudad), (300, roc_jardin)]),
    'romanticismo': ('Bosque, castillo, ruinas y ciudad en la niebla', [(280, rom_bosque), (290, rom_castillo), (280, rom_ruinas), (270, rom_ciudad_lejana)]),
    'realismo': ('Ciudad industrial, estación y campos', [(280, rea_fabricas), (300, rea_estacion), (260, rea_campos), (260, rea_barrio_obrero)]),
    'impresionismo': ('París de los bulevares y la estación de cristal', [(320, imp_bulevar), (330, imp_estacion)]),
    'postimpresionismo': ('Pueblo provenzal y café con toldo', [(360, post_pueblo), (360, post_cafe)]),
    'simbolismo-modernismo': ('Barcelona, Viena y Múnich modernistas', [(320, mod_barcelona), (310, mod_viena), (310, mod_munich)]),
}

ORDEN = ['renacimiento', 'manierismo-y-norte', 'barroco', 'rococo-neoclasicismo', 'romanticismo', 'realismo',
         'impresionismo', 'postimpresionismo', 'simbolismo-modernismo']


def defs(cuerpo):
    out = []
    for k, (tw, th, inner) in PATRONES.items():
        if f'url(#{k})' in cuerpo:
            out.append(f'<pattern id="{k}" width="{tw}" height="{th}" patternUnits="userSpaceOnUse">{inner}</pattern>')
    return '<defs>' + ''.join(out) + '</defs>' if out else ''


def escena(mid):
    etiqueta, franjas = ESCENAS[mid]
    partes = []
    y = 0
    for h, fn in franjas:
        partes.append(franja(y, h, fn))
        y += h
    H = y
    cuerpo = ''.join(partes)
    if mid == 'impresionismo':   # guiño a la fotografía antigua: grano y viñeta, vectoriales
        cuerpo += R(0, BANDA, W, H - 2 * BANDA, 'url(#pt)', o=.35)
        cuerpo += R(0, BANDA, W, H - 2 * BANDA, 'url(#vg)', o=.7)
    d = defs(cuerpo)
    if mid == 'impresionismo':
        d = d.replace('</defs>', f'<linearGradient id="vg" x1="0" x2="1"><stop offset="0" stop-color="{T1}"/><stop offset=".18" stop-color="{T1}" stop-opacity="0"/>'
                                 f'<stop offset=".82" stop-color="{T1}" stop-opacity="0"/><stop offset="1" stop-color="{T1}"/></linearGradient></defs>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMin slice" '
           f'role="img" aria-label="Escenario: {etiqueta}">{d}{cuerpo}</svg>')
    return svg, H


def main():
    destino = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'app', 'img', 'escenas')
    os.makedirs(destino, exist_ok=True)
    info = {}
    for mid in ORDEN:
        svg, H = escena(mid)
        ruta = os.path.join(destino, mid + '.svg')
        with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
            f.write(svg)
        info[mid] = dict(alto=H, bytes=len(svg.encode('utf-8')))
        print(f'{mid:24s} {H:5d} px  {len(svg.encode("utf-8")) / 1024:5.1f} KB')
    return info


if __name__ == '__main__':
    main()
