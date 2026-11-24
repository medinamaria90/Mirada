# Mapa de mundo tipo «Super Mario» para el camino de Mirada (página «Mapa» del lienzo de la ronda 2).
# El camino serpentea por un paisaje en falsa 3D (proyección caballera suave: la profundidad va hacia arriba
# y a la derecha); las paradas son los pintores; entre parada y parada, piezas de época pequeñas, a escala del
# camino. Todo vectorial (SVG en línea) salvo los cuadros (jpg de marca/project-r2/img) y el texto (HTML).
#
# Genera en marca/project-r2/: Mapa-renacimiento, Mapa-barroco, Mapa-bifurcacion, Mapa-entero-abajo,
# Mapa-entero-arriba y Mapa-notas (.dc.html), más vistas previas con captura en la carpeta que se indique.
#
# Uso (desde la raíz del repositorio, Windows o Linux):
#   set MIRADA_PLAYWRIGHT=<node_modules\playwright>   set MIRADA_CHROME=<chrome.exe>
#   python marca/tools/mapa.py [carpeta_previews] [--sin-medir]
import datetime
import json
import math
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r2_theme import BASE, ACCENTS, LETRAS, RECOMENDADA  # noqa: E402
import r2_screens  # noqa: E402
from r2_parts import lockup, ico, medalla  # noqa: E402

# María eligió la letra 2 (Outfit, pesos <= 600): se fija en tiempo de ejecución para que cabecera y barra la usen.
RECOMENDADA['letra'] = 2
L = LETRAS[2]
UI = L['ui']
TIT = f"font-family: {L['tit']}; font-weight: 500; letter-spacing: -0.02em"
r2_screens.UI = UI
r2_screens.TIT = TIT
A = ACCENTS['coral']

ROOT = os.environ.get('MIRADA_MARCA') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ = os.path.join(ROOT, 'project-r2')

# ---- paleta del mapa: todo de baja intensidad, para que manden los cuadros y el texto ---------------------------
LINO = BASE['lino']
INK, INK2, LINEA, BLANCO = BASE['tinta'], BASE['tinta2'], BASE['linea'], BASE['blanco']
T1, T2, T3 = '#EFE8DD', '#E6DDCF', '#DCD2C2'   # piedra: lejos, cara frontal, cara lateral/detalle
TOP = '#F3EEE5'                                 # cara superior (recibe luz)
TEJA, TEJA2 = '#DABFA9', '#CBA98F'              # tejas
PIZARRA, PIZARRA2 = '#D3CFCD', '#C2BDBB'        # pizarra (norte, París)
VERDE, VERDE2 = '#CBD4B5', '#B7C39F'            # copas
AGUA, AGUA2 = '#D8E3E5', '#EEF4F5'              # ríos y lagos
CAMINO, CAMINO_BORDE, CAMINO_PISADA = '#F1E7D4', '#D9CDB5', '#FCF9F3'
SOMBRA = 'rgba(35,32,28,.08)'
ORO = BASE['oro']

KX, KY = 0.5, 0.3   # vector de profundidad por unidad (hacia arriba y a la derecha)
W = 390


def f(v):
    r = round(v, 1)
    return str(int(r)) if r == int(r) else str(r)


def R(x, y, w, h, fill, rx=None, o=None):
    s = f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" fill="{fill}"'
    if rx:
        s += f' rx="{f(rx)}"'
    if o:
        s += f' opacity="{o}"'
    return s + '/>'


def P(d, fill, stroke=None, sw=1, o=None, dash=None):
    s = f'<path d="{d}" fill="{fill}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{f(sw)}" stroke-linecap="round" stroke-linejoin="round"'
    if dash:
        s += f' stroke-dasharray="{dash}"'
    if o:
        s += f' opacity="{o}"'
    return s + '/>'


def C(cx, cy, r, fill, o=None):
    s = f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"'
    if o:
        s += f' opacity="{o}"'
    return s + '/>'


def E(cx, cy, rx, ry, fill, o=None):
    s = f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"'
    if o:
        s += f' opacity="{o}"'
    return s + '/>'


def poly(pts, fill, o=None):
    return P('M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z', fill, o=o)


# ---- piezas en falsa 3D ---------------------------------------------------------------------------------------
# Convención: (x, y) es la esquina inferior izquierda de la cara frontal; w ancho, h alto, d profundidad.
# Se ven la cara frontal (T2), la lateral derecha (T3) y la superior (TOP). Cada pieza devuelve (y_orden, svg):
# se pintan de atrás hacia delante ordenando por y_orden.

def sombra(cx, cy, rx, ry=None):
    return E(cx, cy, rx, ry or rx * .32, SOMBRA)


def ventanas(x, y0, w, h, cols, filas, arco=False, vw=5, vh=8, puerta=False):
    out = []
    px = (w - cols * vw) / (cols + 1)
    py = (h - filas * vh) / (filas + 1)
    for i in range(cols):
        for j in range(filas):
            vx = x + px + i * (vw + px)
            vy = y0 + py + j * (vh + py)
            if arco:
                out.append(P(f'M{f(vx)} {f(vy + vh)}V{f(vy + vw / 2)}a{f(vw / 2)} {f(vw / 2)} 0 0 1 {f(vw)} 0V{f(vy + vh)}Z', LINO))
            else:
                out.append(R(vx, vy, vw, vh, LINO, rx=1))
    if puerta:
        out.append(P(f'M{f(x + w / 2 - 4)} {f(y0 + h)}V{f(y0 + h - 8)}a4 4 0 0 1 8 0V{f(y0 + h)}Z', T3))
    return ''.join(out)


def caja(x, y, w, h, d, front=T2, side=T3, top=TOP, win=None, puerta=False, cornisa=False):
    dx, dy = d * KX, d * KY
    out = [sombra(x + w / 2 + dx / 2, y - dy / 2 + 3, w * .75, w * .22),
           poly([(x, y - h), (x + w, y - h), (x + w + dx, y - h - dy), (x + dx, y - h - dy)], top),
           poly([(x + w, y), (x + w, y - h), (x + w + dx, y - h - dy), (x + w + dx, y - dy)], side),
           R(x, y - h, w, h, front)]
    if cornisa:
        out.append(R(x - 1, y - h, w + 2, 2.5, T3))
    if win:
        out.append(ventanas(x, y - h, w, h, *win, puerta=puerta))
    return (y, ''.join(out))


def casa(x, y, w, h, d, r=None, teja=TEJA, teja2=TEJA2, win=(2, 1), puerta=True, front=T2):
    """Casa con tejado a dos aguas, cumbrera de delante atrás."""
    r = r or w * .45
    dx, dy = d * KX, d * KY
    cx = x + w / 2
    out = [sombra(cx + dx / 2, y - dy / 2 + 3, w * .8, w * .25),
           poly([(cx, y - h - r), (x, y - h), (x + dx, y - h - dy), (cx + dx, y - h - r - dy)], teja2),   # vertiente izquierda (asoma)
           poly([(x + w, y), (x + w, y - h), (x + w + dx, y - h - dy), (x + w + dx, y - dy)], T3),
           poly([(cx, y - h - r), (x + w, y - h), (x + w + dx, y - h - dy), (cx + dx, y - h - r - dy)], teja),
           R(x, y - h, w, h, front),
           poly([(x - 1, y - h), (cx, y - h - r - 1), (x + w + 1, y - h)], front)]
    if win:
        out.append(ventanas(x, y - h, w, h, *win, puerta=puerta))
    return (y, ''.join(out))


def casa_larga(x, y, w, h, d, r=None, teja=TEJA, teja2=TEJA2, win=(3, 1), arco=False, puerta=True, front=T2):
    """Casa con la cumbrera de izquierda a derecha: se ve la vertiente delantera y el hastial derecho."""
    r = r or d * .9
    dx, dy = d * KX, d * KY
    out = [sombra(x + w / 2 + dx / 2, y - dy / 2 + 3, w * .7, w * .18),
           poly([(x + w, y), (x + w, y - h), (x + w + dx / 2, y - h - r - dy / 2), (x + w + dx, y - h - dy), (x + w + dx, y - dy)], T3),
           R(x, y - h, w, h, front),
           poly([(x - 1, y - h), (x + w + 1, y - h), (x + w + dx / 2, y - h - r - dy / 2), (x + dx / 2, y - h - r - dy / 2)], teja)]
    if win:
        out.append(ventanas(x, y - h, w, h, *win, arco=arco, puerta=puerta))
    return (y, ''.join(out))


def torre(x, y, w, h, remate='aguja', ar=None, front=T2, side=T3, aguja=T3, win=(1, 2), arco=True):
    """Torre de base cuadrada (profundidad = ancho). Remates: aguja, plano, cupulin, almenas, chapitel."""
    d = w
    dx, dy = d * KX, d * KY
    ar = ar or w * 1.5
    cx, cy = x + w / 2 + dx / 2, y - h - dy / 2   # centro de la cara superior
    out = [sombra(x + w / 2 + dx / 2, y - dy / 2 + 3, w * .9, w * .3),
           poly([(x, y - h), (x + w, y - h), (x + w + dx, y - h - dy), (x + dx, y - h - dy)], TOP),
           poly([(x + w, y), (x + w, y - h), (x + w + dx, y - h - dy), (x + w + dx, y - dy)], side),
           R(x, y - h, w, h, front)]
    if win:
        out.append(ventanas(x, y - h, w, h, *win, arco=arco, vw=4, vh=7))
    if remate == 'aguja' or remate == 'chapitel':
        ap = (cx, cy - ar)
        out.append(poly([(x + w, y - h), (x + w + dx, y - h - dy), ap], aguja))
        out.append(poly([(x, y - h), (x + w, y - h), ap], TEJA2 if remate == 'chapitel' else T2))
        if remate == 'chapitel':
            out.append(C(ap[0], ap[1] - 2, 2.2, T3))
    elif remate == 'almenas':
        k = max(2, int(w // 7))
        p = w / (2 * k - 1)
        for i in range(k):
            out.append(R(x + i * 2 * p, y - h - 5, p, 5, front))
    elif remate == 'cupulin':
        out.append(P(f'M{f(cx - w * .45)} {f(cy + 2)}C{f(cx - w * .45)} {f(cy - w * .7)} {f(cx + w * .45)} {f(cy - w * .7)} {f(cx + w * .45)} {f(cy + 2)}Z', T3))
        out.append(P(f'M{f(cx - w * .45)} {f(cy + 2)}C{f(cx - w * .45)} {f(cy - w * .7)} {f(cx + w * .3)} {f(cy - w * .7)} {f(cx + w * .3)} {f(cy + 2)}Z', T2))
        out.append(R(cx - 1, cy - w * .7 - 6, 2, 8, T3))
    elif remate == 'plano':
        out.append(R(x - 1, y - h, w + 2, 2.5, T3))
    return (y, ''.join(out))


def cupula(cx, y, r, tambor=18, alto=1.05, linterna=True, nervios=False, color=T2, color2=T3):
    """Tambor cilíndrico y cúpula; sombra en el lado derecho para dar volumen."""
    ty = y - tambor
    out = [sombra(cx, y + 2, r * 1.2, r * .36),
           R(cx - r, ty, 2 * r, tambor, color),
           R(cx + r * .45, ty, r * .55, tambor, color2),
           E(cx, y, r, r * .3, color),
           ventanas(cx - r, ty, 2 * r, tambor, 4, 1, arco=True, vw=4, vh=7),
           E(cx, ty, r, r * .3, T3),
           P(f'M{f(cx - r)} {f(ty)}C{f(cx - r)} {f(ty - r * alto)} {f(cx + r)} {f(ty - r * alto)} {f(cx + r)} {f(ty)}Z', color2),
           P(f'M{f(cx - r)} {f(ty)}C{f(cx - r)} {f(ty - r * alto)} {f(cx + r * .55)} {f(ty - r * alto)} {f(cx + r * .5)} {f(ty)}Z', color)]
    if nervios:
        for k in (-.5, -.15, .2):
            xx = cx + r * k
            out.append(P(f'M{f(xx)} {f(ty)}Q{f(cx + (xx - cx) * .5)} {f(ty - r * alto * .6)} {f(cx)} {f(ty - r * alto * .75)}', 'none', LINO, 1.2))
    if linterna:
        top = ty - r * alto * .75
        out.append(R(cx - 3, top - 9, 6, 10, color))
        out.append(R(cx + 1, top - 9, 2, 10, color2))
        out.append(poly([(cx - 4, top - 9), (cx, top - 15), (cx + 4, top - 9)], T3))
    return (y, ''.join(out))


def arcada(x, y, w, h, d, bays, top=TOP):
    """Soportales: caja con arcos en la cara frontal."""
    yy, base = caja(x, y, w, h, d, top=top, cornisa=True)
    paso = w / bays
    r = paso / 2 - 3
    out = [base]
    for i in range(bays):
        cx = x + paso * (i + .5)
        out.append(P(f'M{f(cx - r)} {f(y)}V{f(y - h + 6 + r)}A{f(r)} {f(r)} 0 0 1 {f(cx + r)} {f(y - h + 6 + r)}V{f(y)}Z', T1))
    return (y, ''.join(out))


def muralla(x, y, w, h, d=10):
    yy, base = caja(x, y, w, h, d, top=TOP)
    out = [base]
    k = int(w // 9)
    for i in range(k):
        if i % 2 == 0:
            out.append(R(x + i * 9, y - h - 4, 5, 4, T2))
    return (y, ''.join(out))


def puente(cx, y, w=52, arcos=2):
    """Puente de piedra visto de frente, bajo el camino."""
    out = [R(cx - w / 2, y - 6, w, 12, T2), R(cx - w / 2 - 2, y - 8, w + 4, 3, T3), R(cx - w / 2 - 2, y + 4, w + 4, 3, T3)]
    paso = w / arcos
    r = paso / 2 - 4
    for i in range(arcos):
        ax = cx - w / 2 + paso * (i + .5)
        out.append(P(f'M{f(ax - r)} {f(y + 7)}V{f(y + 7 - r)}A{f(r)} {f(r)} 0 0 1 {f(ax + r)} {f(y + 7 - r)}V{f(y + 7)}Z', AGUA))
    return (y + 8, ''.join(out))


def fuente(cx, y, w=30):
    out = [sombra(cx, y + 2, w * .7, w * .2),
           E(cx, y, w / 2, w * .17, T3), E(cx, y - 4, w / 2, w * .17, T2), E(cx, y - 4, w * .4, w * .12, AGUA),
           R(cx - 2, y - 20, 4, 16, T2), E(cx, y - 20, 8, 2.5, T2), R(cx - 1, y - 28, 2, 8, T3), C(cx, y - 29, 1.8, T3)]
    return (y, ''.join(out))


def obelisco(cx, y, h=44):
    return (y, sombra(cx, y + 2, 7, 2.5) + R(cx - 5, y - 6, 10, 6, T3) + R(cx - 3.5, y - 9, 7, 3, T2)
            + poly([(cx - 3, y - 9), (cx - 1.5, y - h), (cx, y - h - 4), (cx + 1.5, y - h), (cx + 3, y - 9)], T2)
            + poly([(cx, y - h - 4), (cx + 1.5, y - h), (cx + 3, y - 9), (cx, y - 9)], T3))


def columna(cx, y, h=40):
    return (y, R(cx - 3, y - h, 6, h, T2) + R(cx + 1, y - h, 2, h, T3) + R(cx - 5, y - h - 3, 10, 3, T3) + R(cx - 5, y - 3, 10, 3, T3) + C(cx, y - h - 6, 3, T3))


def cipres(x, y, h, w=6, c=VERDE2, c2=VERDE):
    d = (f'M{f(x)} {f(y)}C{f(x - w)} {f(y - h * .35)} {f(x - w)} {f(y - h * .78)} {f(x)} {f(y - h)}'
         f'C{f(x + w)} {f(y - h * .78)} {f(x + w)} {f(y - h * .35)} {f(x)} {f(y)}Z')
    d2 = (f'M{f(x)} {f(y)}C{f(x - w)} {f(y - h * .35)} {f(x - w)} {f(y - h * .78)} {f(x)} {f(y - h)}'
          f'C{f(x + w * .3)} {f(y - h * .78)} {f(x + w * .3)} {f(y - h * .35)} {f(x)} {f(y)}Z')
    return (y, sombra(x + 2, y + 1, w * 1.6, w * .5) + P(d, c) + P(d2, c2))


def arbol(x, y, r, c=VERDE, c2=VERDE2, tronco=T3):
    return (y, sombra(x + 2, y + 1, r * 1.1, r * .35) + R(x - 1.5, y - r * .9, 3, r * .9, tronco)
            + C(x, y - r * 1.4, r, c2) + C(x - r * .18, y - r * 1.55, r * .8, c))


def naranjo(x, y, r=9):
    yy, s = arbol(x, y, r)
    pts = ''.join(C(x + dx, y - r * 1.4 + dy, 1.3, '#E8C9A0') for dx, dy in ((-4, -3), (3, -5), (5, 2), (-2, 4), (0, -1)))
    return (y, s + pts)


def arbol_desnudo(x, y, h, c=T3):
    d = (f'M{f(x - 1.5)} {f(y)}L{f(x - 1)} {f(y - h * .5)}L{f(x - h * .28)} {f(y - h * .8)}L{f(x - h * .25)} {f(y - h * .84)}L{f(x - .5)} {f(y - h * .6)}'
         f'L{f(x + .5)} {f(y - h)}L{f(x + 2)} {f(y - h)}L{f(x + 1)} {f(y - h * .68)}L{f(x + h * .3)} {f(y - h * .78)}L{f(x + h * .32)} {f(y - h * .74)}'
         f'L{f(x + 1.5)} {f(y - h * .52)}L{f(x + 1.5)} {f(y)}Z')
    return (y, P(d, c))


def abeto(x, y, h, c=VERDE2, c2=VERDE):
    w = h * .5
    out = [sombra(x + 2, y + 1, w * .5, w * .16), R(x - 1, y - 6, 2, 6, T3)]
    for a, b, ww in ((.06, .45, w), (.36, .74, w * .8), (.64, 1, w * .56)):
        out.append(poly([(x - ww / 2, y - h * a), (x, y - h * b), (x + ww / 2, y - h * a)], c))
        out.append(poly([(x - ww / 2, y - h * a), (x, y - h * b), (x - ww * .05, y - h * a)], c2))
    return (y, ''.join(out))


def palmera(x, y, h):
    out = [sombra(x + 2, y + 1, 8, 2.5), P(f'M{f(x - 1.5)} {f(y)}Q{f(x)} {f(y - h * .5)} {f(x + 3)} {f(y - h)}L{f(x + 5)} {f(y - h)}Q{f(x + 2)} {f(y - h * .5)} {f(x + 1.5)} {f(y)}Z', T3)]
    for dx, dy in ((-14, -3), (14, -4), (-9, -11), (10, -12), (0, -14)):
        out.append(E(x + 4 + dx / 2, y - h + dy / 2, 9, 3, VERDE2))
    return (y, ''.join(out))


def podado(x, y, h=16, w=12):
    """Tilo recortado en cubo (jardín a la francesa)."""
    dx, dy = 6 * KX, 6 * KY
    return (y, sombra(x + w / 2, y + 1, w * .7, w * .2) + R(x + w / 2 - 1.5, y - h * .4, 3, h * .4, T3)
            + poly([(x, y - h), (x + w, y - h), (x + w + dx, y - h - dy), (x + dx, y - h - dy)], VERDE)
            + poly([(x + w, y - h * .4), (x + w, y - h), (x + w + dx, y - h - dy), (x + w + dx, y - h * .4 - dy)], VERDE2)
            + R(x, y - h, w, h * .6, VERDE))


def cono(x, y, h):
    return (y, sombra(x, y + 1, h * .3, h * .1) + poly([(x - h * .22, y), (x, y - h), (x + h * .22, y)], VERDE) + poly([(x, y), (x, y - h), (x + h * .22, y)], VERDE2))


def montana(cx, y, w, h, c=T1, c2=T2, nieve=False):
    out = [poly([(cx - w / 2, y), (cx, y - h), (cx + w / 2, y)], c), poly([(cx, y), (cx, y - h), (cx + w / 2, y)], c2)]
    if nieve:
        out.append(poly([(cx - w * .12, y - h * .76), (cx, y - h), (cx + w * .12, y - h * .76), (cx + w * .05, y - h * .7), (cx - w * .04, y - h * .74)], LINO))
    return (y - h, ''.join(out))


def niebla(cx, y, w, o=.85):
    return (y, E(cx, y, w / 2, 7, T1, o) + E(cx + w * .3, y + 4, w * .3, 5, T1, o))


def lago(cx, y, rx, ry):
    return (y - ry, E(cx, y, rx, ry, AGUA) + E(cx - rx * .3, y - ry * .3, rx * .35, ry * .25, AGUA2, .9))


def rio(y, h=26, x0=0, x1=W, onda=10):
    """Banda de agua con orillas onduladas, de lado a lado."""
    top = f'M{f(x0)} {f(y - h / 2)}'
    xs = list(range(int(x0), int(x1) + 1, 60))
    for i, xx in enumerate(xs[1:]):
        top += f'Q{f(xx - 30)} {f(y - h / 2 + (onda if i % 2 == 0 else -onda))} {f(xx)} {f(y - h / 2)}'
    bot = f'L{f(x1)} {f(y + h / 2)}'
    for i, xx in enumerate(reversed(xs[:-1])):
        bot += f'Q{f(xx + 30)} {f(y + h / 2 + (-onda if i % 2 == 0 else onda))} {f(xx)} {f(y + h / 2)}'
    ondas = ''.join(R(xx, y + dy, 18, 1.5, AGUA2, rx=1) for xx, dy in ((30, -5), (120, 4), (210, -3), (300, 6), (350, -6), (75, 7)) if x0 <= xx <= x1 - 18)
    return (y - 200, P(top + bot + 'Z', AGUA) + ondas)


def barca(x, y, w=18):
    return (y, poly([(x, y - 4), (x + 3, y), (x + w - 3, y), (x + w, y - 4)], T3) + R(x + w / 2 - .8, y - 14, 1.6, 10, T3)
            + poly([(x + w / 2 + 1, y - 14), (x + w / 2 + 8, y - 7), (x + w / 2 + 1, y - 6)], LINO))


def molino(x, y, w=18, h=30):
    yy, base = torre(x, y, w, h, 'aguja', ar=10, win=None)
    cx, cy = x + w / 2 + 2, y - h - 2
    aspas = ''.join(P(f'M{f(cx)} {f(cy)}L{f(cx + 18 * math.cos(a))} {f(cy + 18 * math.sin(a))}', 'none', T3, 2.5) for a in (0.6, 0.6 + math.pi / 2, 0.6 + math.pi, 0.6 + 3 * math.pi / 2))
    return (y, base + aspas + C(cx, cy, 2.2, T3))


def chimenea(x, y, h, w=8):
    yy, base = caja(x, y, w, h, w * .8, win=None)
    humo = C(x + 6, y - h - 6, 4, T1) + C(x + 11, y - h - 13, 5.5, T1) + C(x + 19, y - h - 20, 7, T1)
    return (y, humo + base)


def almiar(x, y, w=18):
    return (y, sombra(x, y + 1, w * .6, w * .18) + P(f'M{f(x - w / 2)} {f(y)}C{f(x - w / 2)} {f(y - w * 1.3)} {f(x + w / 2)} {f(y - w * 1.3)} {f(x + w / 2)} {f(y)}Z', '#E6D9B8')
            + P(f'M{f(x + w * .1)} {f(y)}C{f(x + w * .2)} {f(y - w * 1.2)} {f(x + w / 2)} {f(y - w)} {f(x + w / 2)} {f(y)}Z', '#D9C9A3'))


def campos(x, y, w, h, c='#E6DCB8', c2='#DACDA6', surcos=4):
    dx, dy = 40 * KX, 40 * KY
    out = [poly([(x, y), (x + w, y), (x + w + dx, y - dy), (x + dx, y - dy)], c)]
    for i in range(1, surcos):
        t = i / surcos
        out.append(P(f'M{f(x + dx * t)} {f(y - dy * t)}L{f(x + w + dx * t)} {f(y - dy * t)}', 'none', c2, 1.5))
    return (y - 300, ''.join(out))


def girasoles(x, y, w, h):
    yy, base = campos(x, y, w, h, '#EADFB4', '#DCCF9E', 3)
    dx, dy = 40 * KX, 40 * KY
    pts = ''.join(C(x + 8 + i * 11 + dx * (j / 3), y - 3 - dy * (j / 3) - j * 2, 2, '#E3C76B') for j in range(3) for i in range(int(w // 11)))
    return (y - 300, base + pts)


def quiosco(x, y):
    return (y, sombra(x, y + 1, 10, 3) + R(x - 7, y - 20, 14, 20, VERDE2) + R(x - 5, y - 16, 10, 12, LINO, rx=1)
            + P(f'M{f(x - 10)} {f(y - 20)}C{f(x - 10)} {f(y - 30)} {f(x + 10)} {f(y - 30)} {f(x + 10)} {f(y - 20)}Z', VERDE) + R(x - 1, y - 33, 2, 5, T3))


def farola(x, y, h=18):
    return (y, R(x - .8, y - h, 1.6, h, T3) + R(x - 3, y - h - 6, 6, 7, T3, rx=1.5) + R(x - 2, y - h - 5, 4, 4, LINO, rx=1))


def eiffel(cx, y, h=70):
    return (y, sombra(cx, y + 1, 14, 4) + poly([(cx - 13, y), (cx - 3, y - h * .55), (cx - 1.5, y - h), (cx + 1.5, y - h), (cx + 3, y - h * .55), (cx + 13, y)], T3)
            + poly([(cx - 9, y), (cx - 2, y - h * .5), (cx + 2, y - h * .5), (cx + 9, y)], LINO)
            + R(cx - 12, y - h * .32, 24, 2.5, T3) + R(cx - 6, y - h * .58, 12, 2, T3))


def noria(cx, y, r=22):
    out = [sombra(cx, y + 1, r * .6, r * .18), poly([(cx - r * .5, y), (cx, y - r), (cx + r * .5, y)], T2),
           C(cx, y - r - 4, r, 'none').replace('fill="none"', f'fill="none" stroke="{T3}" stroke-width="3"')]
    for k in range(8):
        a = math.pi * 2 * k / 8
        px, py = cx + r * math.cos(a), y - r - 4 + r * math.sin(a)
        out.append(P(f'M{f(cx)} {f(y - r - 4)}L{f(px)} {f(py)}', 'none', T3, 1.2))
        out.append(R(px - 2.5, py - 1.5, 5, 6, TEJA, rx=1.5))
    out.append(C(cx, y - r - 4, 3, T3))
    return (y, ''.join(out))


def sagrada(x, y):
    out = [sombra(x + 30, y + 2, 34, 9), R(x + 2, y - 30, 56, 30, T2), ventanas(x + 2, y - 30, 56, 30, 4, 1, arco=True, vw=4, vh=9)]
    for i, h in enumerate((70, 84, 84, 70)):
        cx = x + 8 + i * 15
        out.append(P(f'M{f(cx - 6)} {f(y)}V{f(y - h * .4)}C{f(cx - 6)} {f(y - h * .85)} {f(cx - 1)} {f(y - h)} {f(cx)} {f(y - h)}C{f(cx + 1)} {f(y - h)} {f(cx + 6)} {f(y - h * .85)} {f(cx + 6)} {f(y - h * .4)}V{f(y)}Z', T2 if i % 2 == 0 else T3))
        out.append(C(cx, y - h - 2, 2, '#E3C76B'))
    return (y, ''.join(out))


def pedrera(x, y, w=50, h=34, d=16):
    yy, base = caja(x, y, w, h, d, win=None)
    ondas = ''.join(P(f'M{f(x + 2)} {f(yy_)}c8 -4 16 4 24 0s14 -4 22 0', 'none', LINO, 2) for yy_ in (y - 26, y - 17, y - 8))
    return (y, base + ondas)


def secesion(x, y, w=30, h=28):
    yy, base = caja(x, y, w, h, 20, win=None)
    cx, cy = x + w / 2 + 5, y - h - 14
    hojas = ''.join(C(cx + 10 * math.cos(a), cy + 10 * math.sin(a), 1.6, LINO) for a in [i * math.pi / 5 for i in range(10)])
    return (y, base + C(cx, cy, 12, '#E3C76B') + C(cx - 2, cy - 2, 9, '#EBD38A') + hojas)


def cafe(x, y, w=40, h=30):
    yy, base = caja(x, y, w, h, 18, win=(2, 1), cornisa=True)
    toldo = R(x - 2, y - 16, w + 4, 6, '#E7C98A') + ''.join(P(f'M{f(x - 2 + i * 7)} {f(y - 10)}q3.5 4 7 0Z', '#E7C98A') for i in range(int((w + 4) // 7)))
    mesas = ''.join(E(x + 8 + i * 14, y + 6, 4, 1.5, LINO) + R(x + 8 + i * 14 - .8, y + 2, 1.6, 4, T3) for i in range(3))
    return (y + 6, base + toldo + mesas)


def ruina(x, y):
    out = [sombra(x + 30, y + 2, 34, 8), R(x, y - 44, 10, 44, T2), R(x + 10, y - 40, 44, 40, T2),
           P(f'M{f(x + 22)} {f(y)}V{f(y - 26)}Q{f(x + 22)} {f(y - 34)} {f(x + 29)} {f(y - 38)}Q{f(x + 36)} {f(y - 34)} {f(x + 36)} {f(y - 26)}V{f(y)}Z', LINO),
           poly([(x + 10, y - 40), (x + 20, y - 50), (x + 30, y - 46), (x + 42, y - 56), (x + 54, y - 40)], T2),
           R(x + 54, y - 30, 14, 30, T3), C(x + 29, y - 46, 4, LINO)]
    return (y, ''.join(out))


def castillo(x, y):
    out = [montana(x + 40, y + 10, 110, 60, T2, T3)[1], muralla(x + 8, y - 24, 64, 14, 10)[1],
           torre(x, y - 24, 14, 36, 'aguja', ar=18, win=(1, 1))[1], torre(x + 58, y - 24, 14, 32, 'aguja', ar=16, win=(1, 1))[1],
           torre(x + 28, y - 30, 18, 44, 'aguja', ar=22, win=(1, 2))[1]]
    return (y + 10, ''.join(out))


def escalinata(x, y, w, pasos=4):
    out = []
    for i in range(pasos):
        out.append(R(x + i * 3, y - i * 5, w - i * 6, 5, T2 if i % 2 else T3))
    return (y, ''.join(out))


def rosa_viento(cx, y):
    return (y - 500, ''.join(P(f'M{f(cx)} {f(y - 16)}L{f(cx + 3)} {f(y)}L{f(cx)} {f(y + 16)}L{f(cx - 3)} {f(y)}Z', T3)
                             + P(f'M{f(cx - 16)} {f(y)}L{f(cx)} {f(y + 3)}L{f(cx + 16)} {f(y)}L{f(cx)} {f(y - 3)}Z', T3)
                             + C(cx, y, 3, LINO) + C(cx, y, 1.5, T3) for _ in (0,)))


def cartel_poste(x, y):
    """Poste de madera: la tabla con el texto va en HTML encima."""
    return (y, sombra(x + 2, y + 1, 5, 2) + R(x - 1.5, y - 30, 3, 30, TEJA2))


# ---- paisaje de cada época -----------------------------------------------------------------------------------
# Cada función recibe los centros de los nodos (pts, en orden de avance) y devuelve piezas. Las piezas se colocan
# respecto a los nodos, así que valen igual si la época se recorre hacia abajo o hacia arriba.
#   lado(i): x del margen ancho (el lado opuesto al nodo i);  mismo(i): x del margen estrecho (el lado del nodo).

def _lado(p):
    return 322 if p[0] < 195 else 50


def _mismo(p):
    return 36 if p[0] < 195 else 352


def _mid(pts, i):
    return ((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)


def deco_renacimiento(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [cupula(x + 12, p[0][1] + 14, 29, 18, nervios=True), torre(x - 36, p[0][1] + 12, 14, 66, 'plano'), cipres(x - 46, p[0][1] + 14, 32), cipres(x + 52, p[0][1] + 16, 26)]
    m = _mid(p, 1)
    out += [rio(m[1], 24), puente(m[0], m[1]), barca(30, m[1] + 4), barca(330, m[1] - 2)]
    x = _lado(p[1])
    out += [casa(x - 20, p[1][1] + 16, 24, 16, 12), casa(x + 10, p[1][1] + 22, 20, 14, 10), cipres(x + 40, p[1][1] + 20, 28), arbol(x - 32, p[1][1] + 24, 8)]
    x = _lado(p[2])
    out += [arcada(x - 24, p[2][1] + 14, 56, 22, 16, 3), cipres(x + 42, p[2][1] + 12, 34), cipres(x + 50, p[2][1] + 16, 24)]
    if len(p) > 3:
        x = _lado(p[3])
        out += [fuente(x, p[3][1] + 6, 28), arbol(x - 30, p[3][1] + 12, 9), arbol(x + 30, p[3][1] + 14, 8)]
    if len(p) > 4:
        x = _lado(p[4])
        out += [torre(x - 10, p[4][1] + 14, 16, 40, 'almenas', win=(1, 2), arco=False), casa(x + 14, p[4][1] + 18, 22, 14, 10), cipres(x - 24, p[4][1] + 16, 28)]
    for i, q in enumerate(p[:5]):
        xm = _mismo(q)
        out += [cipres(xm, q[1] + 10 + i * 3, 22 + (i % 2) * 8), arbol(xm + (12 if xm < 195 else -12), q[1] + 18, 6)]
    return out


def deco_norte(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [torre(x - 6, p[0][1] + 12, 14, 48, 'aguja', ar=30, win=(1, 2)), casa(x - 34, p[0][1] + 16, 20, 18, 10, teja=PIZARRA, teja2=PIZARRA2), casa(x + 18, p[0][1] + 18, 18, 16, 10, teja=PIZARRA, teja2=PIZARRA2)]
    m = _mid(p, 0)
    out += [rio(m[1], 22, onda=6), puente(m[0], m[1], 48, 2), barca(60, m[1] + 3, 16)]
    x = _lado(p[1])
    out += [casa(x - 24, p[1][1] + 14, 18, 22, 10, teja=PIZARRA, teja2=PIZARRA2), casa(x, p[1][1] + 16, 16, 26, 10, teja=PIZARRA, teja2=PIZARRA2), casa(x + 20, p[1][1] + 14, 18, 20, 10, teja=PIZARRA, teja2=PIZARRA2)]
    x = _lado(p[2])
    out += [molino(x - 6, p[2][1] + 12), arbol(x + 26, p[2][1] + 16, 8), arbol(x - 30, p[2][1] + 18, 7)]
    if len(p) > 3:
        x = _lado(p[3])
        out += [muralla(x - 30, p[3][1] + 12, 60, 10), torre(x - 36, p[3][1] + 12, 12, 24, 'aguja', ar=12, win=(1, 1)), torre(x + 24, p[3][1] + 12, 12, 24, 'aguja', ar=12, win=(1, 1))]
    for i, q in enumerate(p[:4]):
        xm = _mismo(q)
        out += [arbol(xm, q[1] + 12 + i * 2, 7), arbol_desnudo(xm + (10 if xm < 195 else -10), q[1] + 20, 22)]
    return out


def deco_barroco(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [arcada(x - 30, p[0][1] + 10, 64, 24, 18, 4, top=TOP), torre(x - 38, p[0][1] + 10, 14, 44, 'chapitel', ar=20, win=(1, 2), arco=False), torre(x + 32, p[0][1] + 10, 14, 44, 'chapitel', ar=20, win=(1, 2), arco=False), fuente(x, p[0][1] + 28, 26)]
    x = _lado(p[1])
    out += [torre(x - 28, p[1][1] + 12, 14, 54, 'cupulin', win=(1, 2)), torre(x + 16, p[1][1] + 12, 14, 54, 'cupulin', win=(1, 2)), casa_larga(x - 13, p[1][1] + 12, 28, 34, 14, win=(1, 1), arco=True, teja=T3, teja2=T3),
            naranjo(x - 38, p[1][1] + 22), naranjo(x + 42, p[1][1] + 20)]
    x = _lado(p[2])
    out += [torre(x - 8, p[2][1] + 12, 15, 76, 'cupulin', win=(1, 3)), casa(x + 16, p[2][1] + 18, 20, 14, 10), casa(x - 36, p[2][1] + 20, 18, 12, 10), palmera(x + 44, p[2][1] + 16, 30), palmera(x - 44, p[2][1] + 18, 26)]
    if len(p) > 3:
        x = _lado(p[3])
        out += [obelisco(x, p[3][1] + 8, 46), naranjo(x - 26, p[3][1] + 14), naranjo(x + 26, p[3][1] + 14), naranjo(x - 14, p[3][1] + 24, 8), naranjo(x + 14, p[3][1] + 24, 8)]
    if len(p) > 4:
        x = _lado(p[4])
        out += [cupula(x, p[4][1] + 12, 20, 14, linterna=True), columna(x - 34, p[4][1] + 10, 34), columna(x + 34, p[4][1] + 10, 34)]
    if len(p) > 5:
        x = _lado(p[5])
        out += [casa_larga(x - 26, p[5][1] + 12, 52, 20, 14, win=(4, 1), arco=True), fuente(x, p[5][1] + 30, 22)]
    for i, q in enumerate(p[:6]):
        xm = _mismo(q)
        out += [naranjo(xm, q[1] + 10 + i * 2, 8), farola(xm + (12 if xm < 195 else -12), q[1] + 20, 14)]
    return out


def deco_rococo(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [casa_larga(x - 36, p[0][1] + 10, 72, 24, 16, win=(5, 1), arco=True, teja=PIZARRA, teja2=PIZARRA2), escalinata(x - 20, p[0][1] + 12, 40), cono(x - 44, p[0][1] + 16, 24), cono(x + 44, p[0][1] + 16, 24)]
    x = _lado(p[1])
    out += [lago(x, p[1][1] + 14, 34, 11), podado(x - 44, p[1][1] + 10), podado(x + 30, p[1][1] + 10), podado(x - 44, p[1][1] + 28), podado(x + 30, p[1][1] + 28), fuente(x, p[1][1] + 2, 16)]
    x = _lado(p[2])
    out += [arcada(x - 20, p[2][1] + 12, 40, 26, 14, 1), (p[2][1] + 13, R(x - 14, p[2][1] - 20, 28, 6, T3)), columna(x - 30, p[2][1] + 12, 26), columna(x + 30, p[2][1] + 12, 26), cono(x - 46, p[2][1] + 14, 22), cono(x + 46, p[2][1] + 14, 22)]
    for i, q in enumerate(p[:3]):
        xm = _mismo(q)
        out += [cono(xm, q[1] + 10, 20), podado(xm + (8 if xm < 195 else -20), q[1] + 22, 12, 10)]
    return out


def deco_romanticismo(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [montana(x, p[0][1] + 14, 90, 70, T1, T2, nieve=True), montana(x + 40, p[0][1] + 18, 60, 40), niebla(x, p[0][1] + 8, 80), abeto(x - 30, p[0][1] + 20, 26), abeto(x + 24, p[0][1] + 22, 22)]
    x = _lado(p[1])
    out += [castillo(x - 36, p[1][1] + 4), abeto(x + 44, p[1][1] + 16, 28), abeto(x - 48, p[1][1] + 18, 24)]
    x = _lado(p[2])
    out += [ruina(x - 32, p[2][1] + 12), arbol_desnudo(x + 40, p[2][1] + 12, 30), arbol_desnudo(x - 44, p[2][1] + 14, 26)]
    if len(p) > 3:
        x = _lado(p[3])
        out += [lago(x, p[3][1] + 14, 40, 12), barca(x - 10, p[3][1] + 10, 14), abeto(x - 46, p[3][1] + 16, 26), abeto(x + 46, p[3][1] + 14, 30), niebla(x, p[3][1] + 24, 70, .7)]
    for i, q in enumerate(p[:4]):
        xm = _mismo(q)
        out += [abeto(xm, q[1] + 10 + i * 2, 22 + (i % 2) * 8), abeto(xm + (12 if xm < 195 else -12), q[1] + 20, 16)]
    return out


def deco_realismo(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [campos(x - 40, p[0][1] + 24, 70, 20), almiar(x - 20, p[0][1] + 16), almiar(x + 6, p[0][1] + 20, 14), almiar(x + 30, p[0][1] + 14, 16), casa_larga(x - 40, p[0][1] + 2, 30, 14, 12, win=(2, 1))]
    x = _lado(p[1])
    out += [chimenea(x - 20, p[1][1] + 12, 50), chimenea(x + 12, p[1][1] + 14, 40, 7), casa_larga(x - 36, p[1][1] + 16, 60, 18, 14, win=(4, 1), teja=PIZARRA, teja2=PIZARRA2)]
    x = _lado(p[2])
    out += [casa_larga(x - 30, p[2][1] + 10, 56, 20, 14, win=(3, 1), arco=True), (p[2][1] + 9, R(x - 36, p[2][1] + 14, 70, 3, T3) + R(x - 36, p[2][1] + 20, 70, 3, T3)), torre(x + 20, p[2][1] + 10, 12, 30, 'aguja', ar=12, win=(1, 1), arco=False), arbol(x - 42, p[2][1] + 14, 8)]
    for i, q in enumerate(p[:3]):
        xm = _mismo(q)
        out += [arbol(xm, q[1] + 12, 7), almiar(xm + (10 if xm < 195 else -10), q[1] + 22, 10)]
    return out


def deco_impresionismo(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [caja(x - 34, p[0][1] + 10, 64, 30, 16, win=(5, 2), cornisa=True), (p[0][1] + 11, R(x - 34, p[0][1] - 24, 64, 4, PIZARRA2)), eiffel(x + 48, p[0][1] + 10, 82), arbol(x - 44, p[0][1] + 16, 8)]
    m = _mid(p, 0)
    out += [rio(m[1], 26, onda=8), puente(m[0], m[1], 56, 3), barca(40, m[1] + 4, 16), barca(300, m[1] - 3, 14), barca(340, m[1] + 5, 12)]
    x = _lado(p[1])
    out += [arbol(x - 30, p[1][1] + 14, 10), arbol(x - 6, p[1][1] + 18, 9), arbol(x + 18, p[1][1] + 14, 10), arbol(x + 40, p[1][1] + 18, 8), quiosco(x + 4, p[1][1] + 28), farola(x - 20, p[1][1] + 30), farola(x + 28, p[1][1] + 30)]
    x = _lado(p[2])
    out += [caja(x - 30, p[2][1] + 12, 60, 24, 16, win=(4, 1)), (p[2][1] + 13, P(f'M{f(x - 30)} {f(p[2][1] - 12)}Q{f(x)} {f(p[2][1] - 34)} {f(x + 30)} {f(p[2][1] - 12)}Z', AGUA2)), arbol(x + 42, p[2][1] + 14, 8)]
    if len(p) > 3:
        x = _lado(p[3])
        out += [lago(x, p[3][1] + 14, 44, 12), barca(x - 16, p[3][1] + 8, 14), barca(x + 10, p[3][1] + 14, 12), arbol(x - 46, p[3][1] + 12, 9), arbol(x + 46, p[3][1] + 10, 9)]
    for i, q in enumerate(p[:4]):
        xm = _mismo(q)
        out += [arbol(xm, q[1] + 12, 8), farola(xm + (12 if xm < 195 else -12), q[1] + 22, 14)]
    return out


def deco_postimpresionismo(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [girasoles(x - 40, p[0][1] + 26, 72, 20), casa(x - 10, p[0][1], 22, 14, 12), cipres(x + 26, p[0][1] + 2, 34), cipres(x + 34, p[0][1] + 6, 24)]
    x = _lado(p[1])
    out += [cafe(x - 24, p[1][1] + 8), farola(x + 30, p[1][1] + 18), arbol(x - 40, p[1][1] + 12, 9)]
    x = _lado(p[2])
    out += [casa(x - 36, p[2][1] + 16, 18, 12, 10), casa(x - 14, p[2][1] + 12, 20, 16, 10), torre(x + 10, p[2][1] + 12, 11, 34, 'plano', win=(1, 1)), casa(x + 26, p[2][1] + 18, 18, 12, 10), cipres(x + 48, p[2][1] + 14, 30), arbol(x - 46, p[2][1] + 18, 7)]
    if len(p) > 3:
        x = _lado(p[3])
        out += [montana(x, p[3][1] + 12, 90, 46, T1, T2), arbol(x - 30, p[3][1] + 16, 9), arbol(x + 30, p[3][1] + 16, 8), arbol(x, p[3][1] + 22, 7)]
    for i, q in enumerate(p[:4]):
        xm = _mismo(q)
        out += [cipres(xm, q[1] + 10 + i * 2, 26), arbol(xm + (12 if xm < 195 else -12), q[1] + 20, 6)]
    return out


def deco_modernismo(pts):
    p = pts
    out = []
    x = _lado(p[0])
    out += [sagrada(x - 30, p[0][1] + 10), palmera(x + 40, p[0][1] + 14, 28)]
    x = _lado(p[1])
    out += [pedrera(x - 26, p[1][1] + 12), arbol(x + 36, p[1][1] + 14, 9), farola(x - 36, p[1][1] + 18, 14)]
    x = _lado(p[2])
    out += [noria(x + 16, p[2][1] + 10, 24), secesion(x - 44, p[2][1] + 12), arbol(x - 4, p[2][1] + 20, 7)]
    if len(p) > 3:
        x = _lado(p[3])
        out += [torre(x - 20, p[3][1] + 12, 16, 50, 'cupulin', win=(1, 3)), caja(x + 2, p[3][1] + 12, 36, 28, 14, win=(3, 2), cornisa=True), arbol(x + 48, p[3][1] + 14, 8)]
    for i, q in enumerate(p[:4]):
        xm = _mismo(q)
        out += [arbol(xm, q[1] + 12, 8), farola(xm + (12 if xm < 195 else -12), q[1] + 22, 14)]
    return out


def deco_gotico(pts, anchor=None):
    """Rama: ciudad medieval amurallada y catedral. Se coloca a la derecha de los nodos de la rama."""
    p = pts
    x, y = anchor or (236, p[0][1] + 40)
    out = [muralla(x - 50, y + 30, 100, 14, 12), torre(x - 56, y + 30, 14, 30, 'aguja', ar=14, win=(1, 1)), torre(x + 42, y + 30, 14, 30, 'aguja', ar=14, win=(1, 1)),
           casa_larga(x - 30, y + 4, 40, 24, 14, win=(2, 1), arco=True, teja=PIZARRA, teja2=PIZARRA2), torre(x - 42, y + 4, 12, 54, 'aguja', ar=32, win=(1, 2)), torre(x + 12, y + 4, 12, 54, 'aguja', ar=32, win=(1, 2)),
           (y + 5, C(x - 10, y - 10, 5, LINO)), casa(x + 30, y + 14, 16, 12, 10, teja=PIZARRA, teja2=PIZARRA2), casa(x - 34, y + 20, 14, 10, 8, teja=PIZARRA, teja2=PIZARRA2)]
    for q in p:
        out += [arbol(q[0] + 50, q[1] + 24, 7), arbol_desnudo(q[0] - 46, q[1] + 10, 22)]
    return out


def deco_medieval(pts, anchor=None):
    p = pts
    x, y = anchor or (236, p[0][1] + 40)
    out = [casa_larga(x - 30, y + 20, 44, 20, 14, win=(3, 1), arco=True), torre(x + 14, y + 20, 14, 34, 'aguja', ar=14, win=(1, 1)),
           cupula(x - 40, y + 26, 10, 6, alto=.9, linterna=False), muralla(x - 50, y + 44, 90, 10, 8), arbol(x + 44, y + 30, 8), abeto(x - 56, y + 34, 24)]
    return out


def deco_espanoles(pts, anchor=None):
    p = pts
    x, y = anchor or (236, p[0][1] + 40)
    out = [caja(x - 40, y + 30, 80, 24, 20, win=(6, 2), cornisa=True), torre(x - 46, y + 30, 13, 40, 'chapitel', ar=18, win=(1, 2), arco=False), torre(x + 34, y + 30, 13, 40, 'chapitel', ar=18, win=(1, 2), arco=False),
           cupula(x, y + 8, 14, 10, linterna=True), cipres(x - 56, y + 36, 28), cipres(x + 56, y + 34, 24), montana(x, y + 70, 120, 24, T1, T2)]
    return out


def deco_barroco_fondo(pts, anchor=None):
    p = pts
    x, y = anchor or (236, p[0][1] + 40)
    out = [casa_larga(x - 30, y + 24, 60, 26, 16, win=(4, 1), arco=True), torre(x + 30, y + 24, 14, 50, 'cupulin', win=(1, 2)), fuente(x - 44, y + 36, 22), naranjo(x + 52, y + 30), naranjo(x - 60, y + 20, 7)]
    return out


EPOCAS = {
    'renacimiento': dict(nombre='Renacimiento', siglos='Siglos XV y XVI', tinte='#E6E8D0', deco=deco_renacimiento),
    'manierismo-y-norte': dict(nombre='Manierismo y Norte', siglos='Siglo XVI', tinte='#DFE5D8', deco=deco_norte),
    'barroco': dict(nombre='Barroco', siglos='Siglo XVII', tinte='#EEE3CC', deco=deco_barroco),
    'rococo-neoclasicismo': dict(nombre='Rococó y Neoclasicismo', siglos='Siglo XVIII', tinte='#E1E9DA', deco=deco_rococo),
    'romanticismo': dict(nombre='Romanticismo', siglos='Primera mitad del XIX', tinte='#DEE3E5', deco=deco_romanticismo),
    'realismo': dict(nombre='Realismo', siglos='Mediados del XIX', tinte='#EAE1C9', deco=deco_realismo),
    'impresionismo': dict(nombre='Impresionismo', siglos='1860 a 1890', tinte='#E5E4EE', deco=deco_impresionismo),
    'postimpresionismo': dict(nombre='Postimpresionismo', siglos='1880 a 1905', tinte='#F0E7C9', deco=deco_postimpresionismo),
    'simbolismo-modernismo': dict(nombre='Simbolismo y Modernismo', siglos='1885 a 1930', tinte='#E7E1EA', deco=deco_modernismo),
    'gotico': dict(nombre='Gótico', siglos='Siglos XIII a XV', tinte='#E3E4DB', deco=deco_gotico),
    'medieval': dict(nombre='Medieval', siglos='Siglos XI y XII', tinte='#E7E5D8', deco=deco_medieval),
    'espanoles': dict(nombre='Maestros españoles', siglos='Del Greco a Goya', tinte='#EDE4D2', deco=deco_espanoles),
    'barroco-fondo': dict(nombre='Barroco a fondo', siglos='Nivel 2', tinte='#EFE5D0', deco=deco_barroco_fondo),
}

XS = [120, 268, 130, 274, 118, 270, 126, 272]   # zigzag de los nodos


# ---- nodos y texto (HTML sobre el SVG) -----------------------------------------------------------------------

def pill(texto, x, y, lado='der', peso=500, color=INK, bg=BLANCO, extra=''):
    pos = f'left: {f(x)}px' if lado == 'der' else f'right: {f(W - x)}px'
    return (f'<span style="position: absolute; top: {f(y)}px; {pos}; transform: translateY(-50%); white-space: nowrap; background: {bg}; color: {color}; '
            f'font-family: {UI}; font-size: 14px; font-weight: {peso}; line-height: 1; padding: 6px 10px; border-radius: 99px; '
            f'box-shadow: 0 1.5px 0 {LINEA}, inset 0 0 0 1px {LINEA}; {extra}">{texto}</span>')


def nodo_html(x, y, estado, img=None, nombre=None, nivel=None, size=68, etiqueta_abajo=False, boton=None):
    """estado: done | now | open | lock. Anillo blanco de 3 px siempre, para que el nodo no se pierda en el paisaje."""
    s = size + (8 if estado == 'now' else 0)
    r = s / 2
    anillo = {'bronce': BASE['bronce'], 'plata': BASE['plata'], 'oro': BASE['oro']}.get(nivel, LINEA)
    if estado == 'lock':
        inner = (f'<div style="width: {s}px; height: {s}px; border-radius: 99px; background: {BASE["hueco"]}; box-shadow: 0 0 0 3px {BLANCO}, 0 4px 0 3px {BASE["hueco_sombra"]}; '
                 f'display: flex; align-items: center; justify-content: center">{ico("candado", "#8E857B", 22, 1.8)}</div>')
    else:
        if estado == 'now':
            ring = f'box-shadow: 0 0 0 3px {BLANCO}, 0 0 0 7px {A["base"]}, 0 0 0 16px {A["suave"]}'
        elif estado == 'done':
            ring = f'box-shadow: 0 0 0 3px {BLANCO}, 0 0 0 6px {anillo}, 0 5px 0 6px rgba(35,32,28,.12)'
        else:
            ring = f'box-shadow: 0 0 0 3px {BLANCO}, 0 0 0 5px {LINEA}, 0 5px 0 5px rgba(35,32,28,.10)'
        inner = f'<img src="img/{img}.jpg" alt="" style="display: block; width: {s}px; height: {s}px; border-radius: 99px; object-fit: cover; {ring}">'
        if estado == 'done':
            inner += (f'<span style="position: absolute; right: -8px; bottom: -6px; width: 24px; height: 24px; border-radius: 99px; background: {anillo}; box-shadow: 0 0 0 3px {BLANCO}; '
                      f'display: flex; align-items: center; justify-content: center">{ico("check", "#FFFFFF", 13, 3)}</span>')
    html = f'<div style="position: absolute; left: {f(x - r)}px; top: {f(y - r)}px; width: {s}px; height: {s}px; z-index: 3">{inner}</div>'
    if nombre:
        peso = 600 if estado == 'now' else 500
        color = INK2 if estado == 'lock' else INK
        if etiqueta_abajo:
            html += (f'<span style="position: absolute; left: {f(x)}px; top: {f(y + r + 12)}px; transform: translateX(-50%); white-space: nowrap; background: {BLANCO}; color: {color}; z-index: 3; '
                     f'font-family: {UI}; font-size: 13px; font-weight: {peso}; line-height: 1; padding: 5px 9px; border-radius: 99px; box-shadow: 0 1.5px 0 {LINEA}, inset 0 0 0 1px {LINEA}">{nombre}</span>')
        else:
            lado = 'der' if x < 195 else 'izq'
            lx = x + r + 14 if lado == 'der' else x - r - 14
            if boton:
                html += (f'<div style="position: absolute; top: {f(y)}px; {"left" if lado == "der" else "right"}: {f(lx if lado == "der" else W - lx)}px; transform: translateY(-50%); z-index: 3; '
                         f'display: flex; flex-direction: column; align-items: {"flex-start" if lado == "der" else "flex-end"}; gap: 6px">'
                         f'<span style="white-space: nowrap; background: {BLANCO}; color: {INK}; font-family: {UI}; font-size: 14px; font-weight: 600; line-height: 1; padding: 6px 10px; border-radius: 99px; box-shadow: 0 1.5px 0 {LINEA}, inset 0 0 0 1px {LINEA}">{nombre}</span>'
                         f'<button type="button" style="border: 0; height: 34px; padding: 0 14px; border-radius: 12px; background: {A["base"]}; color: {A["sobre"]}; box-shadow: 0 3px 0 {A["sombra"]}; '
                         f'font-family: {UI}; font-size: 14px; font-weight: 600">{boton}</button></div>')
            else:
                html += pill(nombre, lx, y, lado, peso, color, extra='z-index: 3')
    return html


def cofre_html(x, y, estado='open', size=48):
    if estado == 'lock':
        st, c = f'background: {BASE["hueco"]}; box-shadow: 0 0 0 3px {BLANCO}, 0 4px 0 3px {BASE["hueco_sombra"]}', '#8E857B'
    elif estado == 'done':
        st, c = f'background: {BASE["oro"]}; opacity: .55; box-shadow: 0 0 0 3px {BLANCO}, 0 4px 0 3px {BASE["oro_sombra"]}', '#FFFFFF'
    else:
        st, c = f'background: {BASE["oro"]}; box-shadow: 0 0 0 3px {BLANCO}, 0 4px 0 3px {BASE["oro_sombra"]}', '#FFFFFF'
    return (f'<div style="position: absolute; left: {f(x - size / 2)}px; top: {f(y - size / 2)}px; width: {size}px; height: {size}px; border-radius: 14px; {st}; '
            f'display: flex; align-items: center; justify-content: center; transform: rotate(-7deg); z-index: 3">{ico("cofre", c, 26, 2)}</div>')


def repaso_html(x, y, estado, nombre='Repaso', size=58):
    r = size / 2
    if estado == 'done':
        inner = f'<div style="width: {size}px; height: {size}px; border-radius: 99px; box-shadow: 0 0 0 3px {BLANCO}">{medalla("oro", size)}</div>'
    elif estado == 'lock':
        inner = (f'<div style="width: {size}px; height: {size}px; border-radius: 99px; background: {BASE["hueco"]}; box-shadow: 0 0 0 3px {BLANCO}, 0 4px 0 3px {BASE["hueco_sombra"]}; '
                 f'display: flex; align-items: center; justify-content: center">{ico("candado", "#8E857B", 20, 1.8)}</div>')
    else:
        ring = f'0 0 0 3px {BLANCO}, 0 0 0 7px {A["base"]}, 0 0 0 16px {A["suave"]}' if estado == 'now' else f'0 0 0 3px {BLANCO}, 0 0 0 6px {A["base"]}, 0 5px 0 6px rgba(35,32,28,.12)'
        inner = (f'<div style="width: {size}px; height: {size}px; border-radius: 99px; background: {BLANCO}; box-shadow: {ring}; '
                 f'display: flex; align-items: center; justify-content: center">{ico("arco", A["texto"], 26, 2)}</div>')
    html = f'<div style="position: absolute; left: {f(x - r)}px; top: {f(y - r)}px; width: {size}px; height: {size}px; z-index: 3">{inner}</div>'
    lado = 'der' if x < 195 else 'izq'
    lx = x + r + 14 if lado == 'der' else x - r - 14
    html += pill(nombre, lx, y, lado, 500, INK2 if estado == 'lock' else INK, extra='z-index: 3')
    return html


def ribbon(x, y, nombre, siglos, sub=None, estado='open'):
    """Cartela de época: tabla blanca con el nombre y los siglos (y una línea pequeña opcional)."""
    c = INK2 if estado == 'lock' else INK
    extra = f'<span style="font-size: 12px; font-weight: 500; color: {A["texto"]}; margin-top: 2px">{sub}</span>' if sub else ''
    return (f'<div style="position: absolute; left: {f(x)}px; top: {f(y)}px; transform: translate(-50%, -50%); z-index: 3; display: flex; flex-direction: column; align-items: center; '
            f'background: {BLANCO}; padding: 8px 16px 9px; border-radius: 16px; box-shadow: 0 2px 0 {LINEA}, inset 0 0 0 1.5px {LINEA}; white-space: nowrap">'
            f'<span style="{TIT}; font-size: 19px; line-height: 1.1; color: {c}">{nombre}</span>'
            f'<span style="font-family: {UI}; font-size: 12px; color: {INK2}; letter-spacing: .02em">{siglos}</span>{extra}</div>')


def cartel_html(x, y, titulo, sub, flecha=False):
    """Tabla del poste de madera (el poste va en el SVG). x, y = punto donde apoya el poste."""
    arrow = f'<span style="display: inline-flex; margin-left: 4px">{ico("arrow" if False else "arco", A["texto"], 14, 2)}</span>' if flecha else ''
    return (f'<div style="position: absolute; left: {f(x)}px; top: {f(y - 30)}px; transform: translate(-50%, -100%); z-index: 3; display: flex; flex-direction: column; align-items: center; '
            f'background: {TEJA}; color: {INK}; padding: 6px 12px 7px; border-radius: 8px; box-shadow: 0 2px 0 {TEJA2}, inset 0 0 0 1.5px {TEJA2}; white-space: nowrap">'
            f'<span style="font-family: {UI}; font-size: 14px; font-weight: 600; line-height: 1.1; display: flex; align-items: center">{titulo}{arrow}</span>'
            f'<span style="font-family: {UI}; font-size: 11px; font-weight: 500; color: {INK}; opacity: .8; letter-spacing: .02em">{sub}</span></div>')


def nota_centrada(x, y, texto, coral=False, ancho=None):
    bg = A['suave'] if coral else BLANCO
    c = A['texto'] if coral else INK2
    w = f'width: {ancho}px; white-space: normal; text-align: center; line-height: 1.3;' if ancho else 'white-space: nowrap;'
    return (f'<span style="position: absolute; left: {f(x)}px; top: {f(y)}px; transform: translate(-50%, -50%); z-index: 3; {w} background: {bg}; color: {c}; '
            f'font-family: {UI}; font-size: 12px; font-weight: 500; padding: 6px 10px; border-radius: 99px; box-shadow: 0 1.5px 0 {LINEA}, inset 0 0 0 1px {LINEA}">{texto}</span>')


def nota_pill(x, y, texto, lado='der', coral=False):
    bg = A['suave'] if coral else BLANCO
    c = A['texto'] if coral else INK2
    return pill(texto, x, y, lado, 500, c, bg, extra='z-index: 3; font-size: 12px')


# ---- camino -------------------------------------------------------------------------------------------------

def camino_svg(pts, ancho=24, bloqueado_desde=None):
    """Sendero de tierra que serpentea entre los puntos (tangentes verticales en cada nodo)."""
    if len(pts) < 2:
        return ''
    d = f'M{f(pts[0][0])} {f(pts[0][1])}'
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        ym = (y0 + y1) / 2
        d += f'C{f(x0)} {f(ym)} {f(x1)} {f(ym)} {f(x1)} {f(y1)}'
    return (P(d, 'none', CAMINO_BORDE, ancho + 6) + P(d, 'none', CAMINO, ancho)
            + P(d, 'none', CAMINO_PISADA, 3, dash='3 9'))


def camino_rama(d):
    return P(d, 'none', CAMINO_BORDE, 26) + P(d, 'none', CAMINO, 20) + P(d, 'none', CAMINO_PISADA, 3, dash='3 9')


def tinte_svg(y0, y1, color, x0=-10, x1=W + 10):
    """Mancha de terreno de la época, con bordes blandos (ondas) para que una época funda con la siguiente."""
    d = f'M{f(x0)} {f(y0 + 10)}Q{f(x0 + 100)} {f(y0 - 18)} {f(x0 + 200)} {f(y0 + 6)}Q{f(x0 + 300)} {f(y0 + 24)} {f(x1)} {f(y0 - 4)}'
    d += f'L{f(x1)} {f(y1 - 8)}Q{f(x1 - 110)} {f(y1 + 16)} {f(x1 - 210)} {f(y1 - 6)}Q{f(x1 - 310)} {f(y1 - 22)} {f(x0)} {f(y1 + 4)}Z'
    return P(d, color, o=.9)


def horizonte_svg(y, h=90):
    """Cielo y colinas lejanas (fondo del mapa)."""
    g = y + h
    return (P(f'M-10 {f(g)}V{f(g - 36)}C60 {f(g - 60)} 120 {f(g - 30)} 200 {f(g - 44)}C280 {f(g - 58)} 330 {f(g - 28)} 400 {f(g - 46)}V{f(g)}Z', T1)
            + P(f'M-10 {f(g)}V{f(g - 18)}C90 {f(g - 34)} 150 {f(g - 8)} 240 {f(g - 24)}C310 {f(g - 36)} 350 {f(g - 10)} 400 {f(g - 22)}V{f(g + 10)}Z', T2, o=.7)
            + E(90, y + 26, 30, 9, T1) + E(76, y + 20, 18, 9, T1) + E(300, y + 40, 26, 8, T1) + E(314, y + 34, 16, 8, T1))


# ---- motor de secciones ------------------------------------------------------------------------------------------

class Mapa:
    def __init__(self, direccion='abajo', paso=112):
        self.dir = direccion
        self.paso = paso
        self.bloques = []     # (tipo, datos, longitud)

    def seccion(self, ep, pintores, estado='lock', repaso='lock', cofre_tras=1, cofre_estado=None, sub=None, xs=None, paso=None, repaso_nombre=None, con_repaso=True):
        n = len(pintores)
        paso = paso or self.paso
        largo = 62 + 76 + paso * n + (36 if con_repaso else 0) + 40
        self.bloques.append(('seccion', dict(ep=ep, pintores=pintores, estado=estado, repaso=repaso, cofre_tras=cofre_tras, cofre_estado=cofre_estado, sub=sub,
                                             xs=xs, paso=paso, repaso_nombre=repaso_nombre, con_repaso=con_repaso), largo))

    def rama(self, ep, pintores, estado='open', sigue=None, largo=360):
        if self.bloques and self.bloques[-1][0] == 'seccion':
            self.bloques[-1][1]['x_fin'] = 272   # el desvío sale por la izquierda: el nudo queda a la derecha
        self.bloques.append(('rama', dict(ep=ep, pintores=pintores, estado=estado, sigue=sigue), largo))

    def final(self, largo=260):
        self.bloques.append(('final', {}, largo))

    def render(self, y_ini, h_total=None):
        """Devuelve (svg_fondo, svg_piezas, html, puntos_camino, alto_usado)."""
        total = sum(b[2] for b in self.bloques)
        html, fondo, piezas, camino = [], [], [], []
        ramas_svg = []
        y = y_ini
        xi = 0
        ultimo = None
        for tipo, d, largo in self.bloques:
            if self.dir == 'abajo':
                y0 = y
                T = lambda t, y0=y0: y0 + t
            else:
                y0 = y_ini + total - (y - y_ini) - largo
                T = lambda t, y0=y0, largo=largo: y0 + largo - t
            y += largo
            if tipo == 'final':
                yy = T(100)
                g = yy + 150 if self.dir == 'abajo' else yy - 50
                html.append(ribbon(195, yy, 'Tu museo', 'Nueve épocas, todos los pintores', 'Y lo que venga después', 'open'))
                piezas += [cupula(195, g, 24, 16, nervios=True), columna(146, g - 4, 32), columna(244, g - 4, 32), cipres(116, g - 2, 32), cipres(274, g - 4, 30), arbol(96, g + 4, 7), arbol(294, g + 2, 7)]
                camino.append((195, yy + (6 if self.dir == 'abajo' else -6)))
                continue
            E_ = EPOCAS[d['ep']]
            fondo.append(tinte_svg(y0 - 20, y0 + largo + 20, E_['tinte']))
            if tipo == 'seccion':
                xs = d['xs'] or XS[xi:xi + 9]
                pts = []
                html.append(ribbon(195, T(32), E_['nombre'], E_['siglos'], d['sub'], d['estado']))
                tt = 62 + 76
                for i, p_ in enumerate(d['pintores']):
                    x = xs[i % len(xs)]
                    pts.append((x, T(tt)))
                    tt += d['paso']
                if d['con_repaso']:
                    x = d.get('x_fin') or xs[len(d['pintores']) % len(xs)]
                    pts.append((x, T(tt - d['paso'] + 100)))
                xi = (xi + len(pts)) % 2
                piezas += E_['deco'](pts)
                camino += pts
                for i, p_ in enumerate(d['pintores']):
                    nombre, img, est, nivel = p_
                    html.append(nodo_html(pts[i][0], pts[i][1], est, img, nombre, nivel, boton=('Empezar' if est == 'now' else None)))
                    if i == d['cofre_tras']:
                        mx, my = _mid(pts, i)
                        html.append(cofre_html(mx, my, d['cofre_estado'] or ('done' if est == 'done' else 'lock' if est == 'lock' else 'open')))
                if d['con_repaso']:
                    html.append(repaso_html(pts[-1][0], pts[-1][1], d['repaso'], d['repaso_nombre'] or 'Repaso'))
                ultimo = pts[-1]
            else:   # rama: desvío a la izquierda; el camino común sigue por la derecha
                j = ultimo
                pts = [(96, T(130)), (62, T(248))]
                anchor = (242, T(170))
                piezas += E_['deco'](pts, anchor)
                # el sendero de la rama sale del nudo (a la derecha) y, si encadena, sigue hacia el borde izquierdo
                d_ = f'M{f(j[0])} {f(j[1])}C{f(j[0])} {f(T(40))} 96 {f(T(50))} 96 {f(T(130))}'
                d_ += f'C96 {f(T(190))} 62 {f(T(190))} 62 {f(T(248))}'
                if d['sigue']:
                    d_ += f'C62 {f(T(300))} 30 {f(T(306))} -20 {f(T(largo + 10))}'
                ramas_svg.append(camino_rama(d_))
                xc, yc = (168, T(72)) if self.dir == 'abajo' else (222, T(10))
                piezas.append(cartel_poste(xc, yc))
                html.append(cartel_html(xc, yc, f'{E_["nombre"]} · opcional', E_['siglos']))
                html.append(nota_centrada(300, T(largo - 44), 'Puedes saltarla', coral=True))
                for i, p_ in enumerate(d['pintores']):
                    nombre, img, est, nivel = p_
                    html.append(nodo_html(pts[i][0], pts[i][1], est, img, nombre, nivel, size=62, etiqueta_abajo=True, boton=None))
                if d['sigue']:
                    ys = T(largo - 20) if self.dir == 'abajo' else T(largo - 80)
                    piezas.append(cartel_poste(160, ys))
                    html.append(cartel_html(160, ys, f'Sigue: {EPOCAS[d["sigue"]]["nombre"]}', EPOCAS[d['sigue']]['siglos']))
                camino.append((300, T(largo / 2)))
                ultimo = (300, T(largo / 2))
        piezas.sort(key=lambda p: p[0])
        return ''.join(fondo), ''.join(ramas_svg), ''.join(p[1] for p in piezas), ''.join(html), camino, total


# ---- mesas ----------------------------------------------------------------------------------------------------

def raiz(h, inner, fijo=True):
    return (f'<div data-root style="width: 390px; height: {h}px; box-sizing: border-box; position: relative; overflow: hidden; background: {LINO}; '
            f'font-family: {UI}; color: {INK}">{inner}</div>')


def cabecera():
    return r2_screens.cabecera('coral', '12', '340')


def nav():
    return r2_screens.nav(0, 'coral')


def svg_capa(h, inner, top=0):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{h}" viewBox="0 {f(top)} {W} {h}" style="position: absolute; left: 0; top: {f(top)}px" aria-hidden="true">{inner}</svg>'


def detalle(ep):
    """Pantalla 390x844: cabecera, cartela de época, cinco paradas con cofre y barra inferior."""
    if ep == 'renacimiento':
        pintores = [('Botticelli', 'a200', 'done', 'oro'), ('Rafael', 'a188', 'done', 'plata'), ('Leonardo', 'a154', 'now', None), ('Tiziano', 'a147', 'lock', None), ('Miguel Ángel', 'a6', 'lock', None)]
        sub = 'Etapa 3 de 6'
    else:
        pintores = [('Caravaggio', 'b11', 'done', 'plata'), ('Velázquez', 'a62', 'done', 'oro'), ('Rembrandt', 'a195', 'now', None), ('Vermeer', 'a115', 'lock', None), ('Murillo', 'a68', 'lock', None)]
        sub = 'Etapa 3 de 7'
    m = Mapa('abajo', paso=104)
    m.seccion(ep, pintores, 'open', 'lock', cofre_tras=3, sub=sub, con_repaso=False)
    fondo, ramas, piezas, html, pts, total = m.render(66)
    entrada = [] if ep == 'renacimiento' else [(pts[0][0] + 150, -60)]
    svg = svg_capa(844, horizonte_svg(40, 100) + fondo + camino_svg(entrada + pts + [(pts[-1][0] - 60, 900)]) + ramas + piezas)
    return raiz(844, svg + html + cabecera() + nav())


def bifurcacion():
    """Pantalla 390x844: fin del Renacimiento, repaso, desvío opcional al Gótico (que encadena con Medieval) y el camino común que sigue."""
    m = Mapa('abajo', paso=104)
    inner = []
    # último tramo del Renacimiento: Miguel Ángel hecho y repaso hecho
    pts_main = [(118, 176), (272, 286)]
    html = [ribbon(195, 100, 'Renacimiento', 'Siglos XV y XVI', 'Completo', 'open'),
            nodo_html(118, 176, 'done', 'a6', 'Miguel Ángel', 'bronce'),
            repaso_html(272, 286, 'done', 'Repaso: oro')]
    # rama Gótico: sale del repaso hacia la izquierda; al final, cartel que encadena con Medieval
    pts_rama = [(96, 436), (62, 554)]
    j = (272, 286)
    d_ = f'M{f(j[0])} {f(j[1])}C272 340 96 346 96 436C96 496 62 496 62 554C62 616 40 622 -20 660'
    # camino común: del repaso hacia abajo por la derecha, hasta Manierismo y Norte
    pts_comun = [(272, 286), (306, 460), (292, 672)]
    piezas = deco_gotico(pts_rama, (224, 476)) + [cartel_poste(168, 378), cartel_poste(90, 732), cipres(352, 350, 26), arbol(362, 580, 8), cipres(40, 186, 30), arbol(352, 196, 9), arbol(36, 300, 7)]
    piezas.sort(key=lambda p: p[0])
    svg = svg_capa(844, horizonte_svg(40, 100) + tinte_svg(80, 350, EPOCAS['renacimiento']['tinte'], -10, 400) + tinte_svg(350, 700, EPOCAS['gotico']['tinte'], -10, 230)
                   + tinte_svg(350, 900, EPOCAS['manierismo-y-norte']['tinte'], 200, 400)
                   + camino_svg(pts_main + pts_comun[1:] + [(292, 900)]) + camino_rama(d_) + ''.join(p[1] for p in piezas))
    html += [cartel_html(168, 378, 'Gótico · opcional', 'Siglos XIII a XV'),
             nodo_html(96, 436, 'open', 'a22', 'Van Eyck', None, size=62, etiqueta_abajo=True),
             nodo_html(62, 554, 'lock', None, 'Giotto', None, size=62, etiqueta_abajo=True),
             cartel_html(90, 732, 'Sigue: Medieval', 'Otra rama, si quieres'),
             nota_centrada(302, 400, 'Puedes saltarla: el camino sigue', coral=True),
             ribbon(276, 584, 'Manierismo y Norte', 'Siglo XVI', 'Siguiente parada', 'open'),
             nodo_html(292, 672, 'now', 'a184', 'El Bosco', None, boton='Empezar'),
             nota_centrada(195, 742, 'Las ramas se abren al dominar el tramo y ninguna bloquea el camino común', coral=True, ancho=310)]
    return raiz(844, svg + ''.join(html) + cabecera() + nav())


def mapa_entero(direccion):
    m = Mapa(direccion)
    m.seccion('renacimiento', [('Botticelli', 'a200', 'done', 'oro'), ('Rafael', 'a188', 'done', 'plata'), ('Leonardo', 'a154', 'done', 'oro'), ('Tiziano', 'a147', 'done', 'bronce'), ('Miguel Ángel', 'a6', 'done', 'bronce')],
              'open', 'done', 3, 'done', 'Completo', repaso_nombre='Repaso: oro')
    m.rama('gotico', [('Van Eyck', 'a22', 'open', None), ('Giotto', None, 'lock', None)], sigue='medieval')
    m.seccion('manierismo-y-norte', [('El Bosco', 'a184', 'done', 'plata'), ('Durero', 'b10', 'now', None), ('Brueghel', None, 'lock', None), ('El Greco', None, 'lock', None)], 'open', 'lock', 2, 'lock', 'Etapa 2 de 5')
    m.seccion('barroco', [('Caravaggio', None, 'lock', None), ('Rubens', None, 'lock', None), ('Velázquez', None, 'lock', None), ('Rembrandt', None, 'lock', None), ('Murillo', None, 'lock', None), ('Vermeer', None, 'lock', None)], 'lock', 'lock', 2, sub='Se abre al terminar Manierismo y Norte')
    m.rama('barroco-fondo', [('Zurbarán', None, 'lock', None), ('Ribera', None, 'lock', None)], 'lock')
    m.seccion('rococo-neoclasicismo', [('Fragonard', None, 'lock', None), ('Boucher', None, 'lock', None), ('David', None, 'lock', None)], 'lock', 'lock', 1)
    m.seccion('romanticismo', [('Goya', None, 'lock', None), ('Friedrich', None, 'lock', None), ('Turner', None, 'lock', None), ('Delacroix', None, 'lock', None)], 'lock', 'lock', 1)
    m.rama('espanoles', [('Sorolla', None, 'lock', None), ('Fortuny', None, 'lock', None)], 'lock')
    m.seccion('realismo', [('Courbet', None, 'lock', None), ('Millet', None, 'lock', None), ('Repin', None, 'lock', None)], 'lock', 'lock', 1)
    m.seccion('impresionismo', [('Manet', None, 'lock', None), ('Monet', None, 'lock', None), ('Degas', None, 'lock', None), ('Renoir', None, 'lock', None)], 'lock', 'lock', 2)
    m.seccion('postimpresionismo', [('Cézanne', None, 'lock', None), ('Van Gogh', None, 'lock', None), ('Gauguin', None, 'lock', None), ('Toulouse-Lautrec', None, 'lock', None)], 'lock', 'lock', 1)
    m.seccion('simbolismo-modernismo', [('Klimt', None, 'lock', None), ('Munch', None, 'lock', None), ('Matisse', None, 'lock', None), ('Kandinsky', None, 'lock', None)], 'lock', 'lock', 2)
    m.final()
    y_ini = 150 if direccion == 'abajo' else 140
    fondo, ramas, piezas, html, pts, total = m.render(y_ini)
    H = y_ini + total + 90
    if direccion == 'arriba':
        pts = list(reversed(pts))   # el camino se dibuja igual en los dos sentidos; solo cambia el orden de los puntos
    horizonte = horizonte_svg(60, 100)
    svg = svg_capa(H, horizonte + fondo + camino_svg(pts) + ramas + piezas)
    # dónde está el jugador y qué se ve al abrir la app: marco de 390x844 centrado en el nodo actual
    ahora_y = ahora_x = None
    for b in html.split('<div style="position: absolute; left: '):
        if 'Empezar</button>' in b and ahora_y is None:
            ahora_y = float(b.split('top: ')[1].split('px')[0]) + 38
            ahora_x = float(b.split('px')[0]) + 38
    vy = max(0, min(H - 844, ahora_y - 470))
    marco = (f'<div style="position: absolute; left: 0; top: {f(vy)}px; width: 390px; height: 844px; border: 3px dashed {A["base"]}; border-radius: 30px; box-sizing: border-box; z-index: 4; pointer-events: none"></div>'
             f'<span style="position: absolute; right: 14px; top: {f(vy + 14 if direccion == "abajo" else vy + 844 - 42)}px; z-index: 5; background: {A["base"]}; color: {A["sobre"]}; font-family: {UI}; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 99px; white-space: nowrap">Al abrir la app ves esto</span>'
             f'<span style="position: absolute; {"left" if ahora_x > 195 else "right"}: 16px; top: {f(ahora_y + 48)}px; z-index: 5; background: {BLANCO}; color: {A["texto"]}; font-family: {UI}; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 99px; box-shadow: 0 1.5px 0 {LINEA}, inset 0 0 0 1.5px {A["base"]}; white-space: nowrap">Estás aquí: Durero</span>')
    flecha = nota_centrada(195, 108, 'Empiezas arriba y bajas' if direccion == 'abajo' else 'Empiezas abajo y subes: vas creciendo')
    cab = r2_screens.cabecera('coral', '45', '9.800')
    return raiz(H, svg + html + marco + flecha + cab + r2_screens.nav(0, 'coral')), H


def notas():
    def chips(items):
        return ''.join(f'<span style="display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 99px; background: {BLANCO}; box-shadow: inset 0 0 0 1px {LINEA}; font-size: 14px; font-weight: 600">{t}</span>' for t in items)
    qs = [
        ('¿En qué sentido se recorre el camino?', chips(['De arriba abajo (como ahora)', 'De abajo arriba (vas subiendo)']), 'Mi propuesta: de abajo arriba. Empiezas al pie del mapa y la cabecera te espera arriba; el lugar que falta por recorrer queda siempre por encima.'),
        ('¿Cuánto paisaje?', chips(['Así, como en las mesas', 'Más piezas y más color', 'Menos: solo lo esencial']), 'Las mesas llevan una intensidad media: tres o cuatro piezas por parada, tonos a medio camino entre el lino y la tinta, nada de trazos oscuros.'),
        ('¿Qué estilo para las piezas?', chips(['Isométrico limpio (como aquí)', 'Más dibujado, con trazo']), 'Lo de aquí es falsa 3D geométrica: caras planas, sombra en el lado derecho, sin líneas. «Más dibujado» sería un trazo a mano, como un cuaderno de viaje.'),
        ('¿Dónde van los cofres?', chips(['En el camino, entre paradas', 'Aparte, en una vitrina de premios']), 'En las mesas van en el camino: se ven venir y se cogen al pasar, como en Mario. La vitrina de premios puede existir además, en el perfil.'),
    ]
    items = ''.join(f'''
<div style="display: flex; flex-direction: column; gap: 10px; padding: 16px 0; border-top: 1px solid {LINEA}">
<span style="font-size: 17px; font-weight: 600; line-height: 1.3"><span style="display: inline-flex; width: 26px; height: 26px; border-radius: 99px; background: {INK}; color: #FFFFFF; align-items: center; justify-content: center; font-size: 13px; margin-right: 8px; vertical-align: 2px">{i + 1}</span>{q}</span>
<div style="display: flex; flex-wrap: wrap; gap: 8px">{c}</div>
<p style="margin: 0; font-size: 14px; line-height: 1.45; color: {INK2}">{nota}</p></div>''' for i, (q, c, nota) in enumerate(qs))
    guia = ''.join(f'<li style="margin: 0 0 6px"><strong>{a}</strong> {b}</li>' for a, b in (
        ('Perspectiva.', 'Falsa 3D suave: la profundidad va hacia arriba y a la derecha; se ven la cara de delante, la de la derecha y el techo.'),
        ('Escala.', 'Las piezas miden entre 20 y 90 px: nunca más altas que un nodo. Son compañía del camino, no decorado de fondo.'),
        ('Paleta.', 'Piedra en tres tonos sobre lino (#EFE8DD, #E6DDCF, #DCD2C2), tejas, pizarra, verdes y agua apagados; cada época tiñe su terreno de un tono distinto.'),
        ('Camino.', 'Sendero de tierra de 24 px con borde y pisadas; las ramas opcionales son un desvío real, con cartel de madera.'),
        ('Nodos.', 'Redondos, con anillo blanco de 3 px siempre; coral para el actual, color del sello para los hechos, hueco con candado para los cerrados.'),
    ))
    return (f'<div data-root style="width: 390px; box-sizing: border-box; padding: 26px 20px 30px; background: {LINO}; font-family: {UI}; color: {INK}; display: flex; flex-direction: column; gap: 18px">'
            f'<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 13px; font-weight: 600; color: {INK2}; letter-spacing: .02em">Mapa · para cerrar</span>'
            f'<h1 style="margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.05">Cuatro preguntas</h1>'
            f'<p style="margin: 0; font-size: 15px; line-height: 1.45">Contesta en una línea, por ejemplo: <strong>Abajo arriba · Así · Isométrico · En el camino</strong>. Y comenta encima de lo que quieras cambiar.</p></div>'
            f'<div>{items}</div>'
            f'<div style="background: {BLANCO}; border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 0 0 2px {A["base"]}">'
            f'<span style="font-size: 13px; font-weight: 600; color: {A["texto"]}">Guía de estilo del mapa, en cinco líneas</span>'
            f'<ul style="margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.45">{guia}</ul></div>'
            f'<p style="margin: 0; font-size: 13px; line-height: 1.45; color: {INK2}">Los cuadros de las paradas son los de la ronda 2; a partir del Rococó todo está cerrado porque el jugador va por Durero. Las ramas (Gótico → Medieval, Barroco a fondo, Maestros españoles) son ejemplos: se abren al dominar el tramo y ninguna bloquea el camino común.</p>'
            f'</div>')


# ---- generación ------------------------------------------------------------------------------------------------

CSS = 'family=Outfit:wght@300;400;500;600'


def dc(title, body, w, h):
    props = json.dumps({'$preview': {'width': w, 'height': h}})
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{CSS}&amp;display=swap">
<style>
body{{margin:0}}
*{{box-sizing:border-box}}
button{{cursor:pointer}}
h1,h2,h3,p{{margin:0}}
</style>
</helmet>
{body.strip()}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''


def preview(title, body, img_dir):
    return (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=390">'
            f'<title>{title}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?{CSS}&display=swap">'
            f'<style>body{{margin:0}}*{{box-sizing:border-box}}h1,h2,h3,p{{margin:0}}</style></head>'
            f'<body>{body.replace(chr(34) + "img/", chr(34) + img_dir + "/")}</body></html>')


def boards():
    ab, hab = mapa_entero('abajo')
    ar, har = mapa_entero('arriba')
    return [
        ('Mapa-renacimiento.dc.html', 'Mapa · Renacimiento', detalle('renacimiento'), 844),
        ('Mapa-barroco.dc.html', 'Mapa · Barroco', detalle('barroco'), 844),
        ('Mapa-bifurcacion.dc.html', 'Mapa · Bifurcación: rama opcional', bifurcacion(), 844),
        ('Mapa-entero-abajo.dc.html', 'Mapa entero · de arriba abajo', ab, hab),
        ('Mapa-entero-arriba.dc.html', 'Mapa entero · de abajo arriba', ar, har),
        ('Mapa-notas.dc.html', 'Mapa · cuatro preguntas', notas(), None),
    ]


def medir(files):
    res = subprocess.run(['node', os.path.join(ROOT, 'tools', 'measure.js')] + files, capture_output=True, text=True, env=dict(os.environ))
    if res.returncode:
        print(res.stderr)
        sys.exit(1)
    return json.loads(res.stdout)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    prev_dir = args[0] if args else os.path.join(ROOT, 'preview-r2')
    sin_medir = '--sin-medir' in sys.argv
    os.makedirs(prev_dir, exist_ok=True)
    os.makedirs(PROJ, exist_ok=True)
    img_dir = os.path.join(PROJ, 'img').replace('\\', '/')
    bs = boards()
    prev_files = []
    for fn, t, body, fijo in bs:
        p = os.path.join(prev_dir, fn[:-8] + '.html')
        open(p, 'w', encoding='utf-8').write(preview(t, body, img_dir))
        prev_files.append(p)
    heights = {}
    if not sin_medir:
        heights = {os.path.basename(k)[:-5]: v for k, v in medir(prev_files).items()}
    altos = {}
    for fn, t, body, fijo in bs:
        medido = heights.get(fn[:-8], fijo or 1200)
        altos[fn] = fijo or medido
        if fijo and medido > fijo + 2:
            print('DESBORDA', fn, medido, '>', fijo)
        b2 = body if fijo else body.replace('<div data-root style="width: 390px;', f'<div data-root style="width: 390px; height: {altos[fn]}px;', 1)
        open(os.path.join(PROJ, fn), 'w', encoding='utf-8').write(dc(t, b2, 390, altos[fn]))
        print(fn, altos[fn])
    json.dump(altos, open(os.path.join(ROOT, 'tools', 'alturas-mapa.json'), 'w', encoding='utf-8'), indent=1)


if __name__ == '__main__':
    main()
