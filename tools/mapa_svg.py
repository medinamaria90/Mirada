# Paisajes del mapa del camino: un SVG por época en app/img/mapa/<movimiento>.svg.
#
# Reutiliza las piezas en falsa 3D de marca/tools/mapa.py (la página «Mapa» del lienzo de la ronda 2) con un
# paisaje más rico por tramo: hitos reconocibles algo más grandes y con algo más de color, casitas, árboles,
# agua y terreno teñido por época. Sin trazos oscuros; las etiquetas van aparte (en el DOM, en píldoras).
#
# El trazado (alto del tramo, nodos) lo da la app (tools/mapa-layout.mjs → ui/screens/path-map.js),
# así que los dos pintan lo mismo. Los colores salen de app/css/brand.css (variables --map-*, tema claro y
# bloque oscuro): el SVG lleva su propio <style> con las dos paletas y una media query prefers-color-scheme,
# que Chrome y Firefox evalúan con el color-scheme del <img> (así sigue al tema elegido en Ajustes).
#
# Uso (desde la raíz del repositorio): python -I tools/mapa_svg.py
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'marca', 'tools'))
import mapa as M  # noqa: E402

OUT = os.path.join(ROOT, 'app', 'img', 'mapa')
MAX_KB = 40
W = M.W

# Colores de las piezas (constantes de marca/tools/mapa.py) → variable de brand.css.
TOKENS = {
    M.T1: 'stone-far', M.T2: 'stone-front', M.T3: 'stone-side', M.TOP: 'stone-top', M.LINO: 'window',
    M.TEJA: 'tile', M.TEJA2: 'tile-2', M.PIZARRA: 'slate', M.PIZARRA2: 'slate-2',
    M.VERDE: 'leaf', M.VERDE2: 'leaf-2', M.AGUA: 'water', M.AGUA2: 'water-2', M.SOMBRA: 'shade',
    '#E8C9A0': 'fruit', '#E6D9B8': 'hay', '#D9C9A3': 'hay-2', '#E6DCB8': 'field', '#DACDA6': 'field-2',
    '#EADFB4': 'crop', '#DCCF9E': 'crop-2', '#E3C76B': 'gold', '#EBD38A': 'gold-2', '#E7C98A': 'awning',
}
CLASS = {name: f'c{i}' for i, name in enumerate(dict.fromkeys(TOKENS.values()))}
CLASS['tint'] = 'tint'


def brand_palette():
    """Variables --map-* de brand.css: (claro, oscuro)."""
    css = open(os.path.join(ROOT, 'app', 'css', 'brand.css'), encoding='utf-8').read()
    def block(selector):
        i = css.index(selector)
        return css[i:css.index('}', i)]
    pick = lambda text: dict(re.findall(r'--map-([a-z0-9-]+):\s*([^;]+);', text))
    return pick(block(':root {')), pick(block(':root[data-theme="dark"] {'))


# ---- piezas: atajos sobre mapa.py ------------------------------------------------------------------------------

def lado(p):
    return M._lado(p)


def mismo(p):
    return M._mismo(p)


def mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def tinte(h, tint_class):
    return (-10_000, f'<rect x="0" y="0" width="{W}" height="{h}" class="{tint_class}"/>')


def margenes(p, h, arbol):
    """Relleno común: algo pequeño en el margen estrecho de cada nodo y a los lados de la cartela (abajo)."""
    out = []
    for i, q in enumerate(p):
        xm = mismo(q)
        out.append(arbol(xm, q[1] + 12 + (i % 2) * 6, i))
        if i + 1 < len(p):
            my = mid(q, p[i + 1])[1]
            out.append(arbol(xm + (14 if xm < 195 else -14), my + 10, i + 1))
    out += [arbol(44, h - 42, 0), arbol(346, h - 38, 1), arbol(28, h - 20, 2), arbol(362, h - 16, 3)]
    return out


def cipreses(x, y, i):
    return M.cipres(x, y, 24 + (i % 3) * 6)


def arboles(x, y, i):
    return M.arbol(x, y, 7 + (i % 2) * 2)


def abetos(x, y, i):
    return M.abeto(x, y, 20 + (i % 3) * 6)


def naranjos(x, y, i):
    return M.naranjo(x, y, 8 + (i % 2))


def conos(x, y, i):
    return M.cono(x, y, 18 + (i % 2) * 6)


# ---- paisaje por época (p: nodos de abajo arriba) --------------------------------------------------------------

def deco_renacimiento(p, h):
    out = []
    x = lado(p[0])     # Florencia: cúpula de Brunelleschi, campanile y el Arno con su puente
    out += [M.cupula(x + 6, p[0][1] + 22, 30, 16, nervios=True), M.torre(x - 48, p[0][1] + 10, 14, 50, 'plano', win=(1, 2)),
            M.cipres(x - 60, p[0][1] + 16, 30), M.cipres(x + 52, p[0][1] + 20, 26), M.casa(x + 34, p[0][1] + 30, 18, 12, 10), M.casa(x - 30, p[0][1] + 32, 16, 12, 9)]
    m = mid(p[0], p[1])
    out += [M.rio(m[1], 26), M.puente(m[0], m[1], 56, 3), M.barca(26, m[1] + 4), M.barca(330, m[1] - 3), M.barca(60, m[1] - 6, 14)]
    x = lado(p[1])     # pueblo de teja y cipreses
    out += [M.casa(x - 28, p[1][1] + 16, 26, 18, 12), M.casa(x + 6, p[1][1] + 22, 22, 14, 10), M.casa(x - 6, p[1][1] + 4, 20, 14, 10),
            M.cipres(x + 42, p[1][1] + 20, 30), M.arbol(x - 40, p[1][1] + 24, 9), M.cipres(x + 50, p[1][1] + 6, 22)]
    if len(p) > 2:
        x = lado(p[2])  # loggia y fuente
        out += [M.arcada(x - 30, p[2][1] + 14, 66, 24, 18, 3), M.cipres(x + 46, p[2][1] + 12, 36), M.cipres(x + 54, p[2][1] + 16, 26),
                M.fuente(x - 2, p[2][1] + 34, 26), M.arbol(x - 46, p[2][1] + 20, 8)]
    if len(p) > 3:
        x = lado(p[3])  # palacio almenado
        out += [M.torre(x - 12, p[3][1] + 14, 18, 52, 'almenas', win=(1, 3), arco=False), M.casa(x + 14, p[3][1] + 18, 24, 16, 10),
                M.casa(x - 40, p[3][1] + 22, 20, 12, 10), M.cipres(x - 48, p[3][1] + 10, 28), M.arbol(x + 44, p[3][1] + 20, 8)]
    if len(p) > 4:
        x = lado(p[4])  # villa con jardín
        out += [M.casa_larga(x - 30, p[4][1] + 12, 56, 20, 14, win=(4, 1), arco=True), M.cipres(x - 44, p[4][1] + 14, 30), M.cipres(x + 38, p[4][1] + 12, 32),
                M.podado(x - 20, p[4][1] + 28, 12, 10), M.podado(x + 8, p[4][1] + 28, 12, 10)]
    for i in range(5, len(p)):
        x = lado(p[i])
        out += [M.casa(x - 16, p[i][1] + 16, 24, 16, 12), M.cipres(x + 24, p[i][1] + 14, 30), M.arbol(x - 36, p[i][1] + 20, 8)]
    return out + margenes(p, h, cipreses)


def deco_norte(p, h):
    out = []
    x = lado(p[0])     # ciudad flamenca: aguja, casas de pizarra con hastial, canal con puente
    out += [M.torre(x - 8, p[0][1] + 12, 16, 60, 'aguja', ar=36, win=(1, 3)), M.casa(x - 40, p[0][1] + 16, 20, 22, 10, teja=M.PIZARRA, teja2=M.PIZARRA2),
            M.casa(x + 20, p[0][1] + 18, 18, 18, 10, teja=M.PIZARRA, teja2=M.PIZARRA2), M.casa(x + 40, p[0][1] + 20, 16, 14, 10, teja=M.PIZARRA, teja2=M.PIZARRA2)]
    m = mid(p[0], p[1])
    out += [M.rio(m[1], 22, onda=6), M.puente(m[0], m[1], 50, 2), M.barca(50, m[1] + 3, 16), M.barca(320, m[1] - 2, 14)]
    x = lado(p[1])     # hilera de casas estrechas
    out += [M.casa(x - 30, p[1][1] + 14, 18, 24, 10, teja=M.PIZARRA, teja2=M.PIZARRA2), M.casa(x - 10, p[1][1] + 16, 16, 28, 10, teja=M.PIZARRA, teja2=M.PIZARRA2),
            M.casa(x + 8, p[1][1] + 14, 18, 22, 10, teja=M.PIZARRA, teja2=M.PIZARRA2), M.casa(x + 28, p[1][1] + 18, 16, 18, 10, teja=M.PIZARRA, teja2=M.PIZARRA2),
            M.arbol(x - 44, p[1][1] + 20, 7)]
    if len(p) > 2:
        x = lado(p[2])  # molino y campo
        out += [M.molino(x - 10, p[2][1] + 12, 20, 34), M.campos(x - 46, p[2][1] + 30, 60, 16), M.arbol(x + 30, p[2][1] + 16, 9), M.arbol(x - 36, p[2][1] + 10, 7),
                M.almiar(x + 44, p[2][1] + 26, 12)]
    if len(p) > 3:
        x = lado(p[3])  # muralla con torres
        out += [M.muralla(x - 34, p[3][1] + 12, 68, 12), M.torre(x - 40, p[3][1] + 12, 12, 28, 'aguja', ar=14, win=(1, 1)),
                M.torre(x + 28, p[3][1] + 12, 12, 28, 'aguja', ar=14, win=(1, 1)), M.casa(x - 8, p[3][1] - 4, 18, 14, 10, teja=M.PIZARRA, teja2=M.PIZARRA2)]
    if len(p) > 4:
        x = lado(p[4])  # catedral de dos torres y plaza
        out += [M.casa_larga(x - 20, p[4][1] + 14, 40, 26, 14, win=(2, 1), arco=True, teja=M.PIZARRA, teja2=M.PIZARRA2),
                M.torre(x - 32, p[4][1] + 14, 12, 50, 'aguja', ar=28, win=(1, 2)), M.torre(x + 20, p[4][1] + 14, 12, 50, 'aguja', ar=28, win=(1, 2)),
                M.arbol_desnudo(x + 44, p[4][1] + 18, 26), M.arbol(x - 46, p[4][1] + 20, 8)]
    for i in range(5, len(p)):
        x = lado(p[i])
        out += [M.casa(x - 10, p[i][1] + 16, 20, 20, 10, teja=M.PIZARRA, teja2=M.PIZARRA2), M.arbol_desnudo(x + 24, p[i][1] + 14, 24), M.arbol(x - 34, p[i][1] + 18, 8)]
    return out + margenes(p, h, lambda x, y, i: M.arbol(x, y, 7) if i % 2 else M.arbol_desnudo(x, y, 20))


def deco_barroco(p, h):
    out = []
    x = lado(p[0])     # plaza mayor con soportales y chapiteles, fuente
    out += [M.arcada(x - 34, p[0][1] + 10, 72, 26, 18, 4), M.torre(x - 42, p[0][1] + 10, 14, 48, 'chapitel', ar=22, win=(1, 2), arco=False),
            M.torre(x + 36, p[0][1] + 10, 14, 48, 'chapitel', ar=22, win=(1, 2), arco=False), M.fuente(x, p[0][1] + 30, 26), M.farola(x - 24, p[0][1] + 32, 12), M.farola(x + 24, p[0][1] + 32, 12)]
    x = lado(p[1])     # iglesia de torres gemelas y naranjos
    out += [M.torre(x - 30, p[1][1] + 12, 14, 58, 'cupulin', win=(1, 2)), M.torre(x + 18, p[1][1] + 12, 14, 58, 'cupulin', win=(1, 2)),
            M.casa_larga(x - 15, p[1][1] + 12, 32, 36, 14, win=(1, 1), arco=True, teja=M.T3, teja2=M.T3), M.naranjo(x - 42, p[1][1] + 22), M.naranjo(x + 44, p[1][1] + 20), M.naranjo(x + 2, p[1][1] + 30, 7)]
    if len(p) > 2:
        x = lado(p[2])  # la Giralda, casas blancas y palmeras
        out += [M.torre(x - 8, p[2][1] + 12, 16, 84, 'cupulin', win=(1, 4)), M.casa(x + 18, p[2][1] + 18, 22, 14, 10), M.casa(x - 40, p[2][1] + 20, 20, 12, 10),
                M.casa(x + 32, p[2][1] + 6, 18, 12, 10), M.palmera(x + 48, p[2][1] + 16, 32), M.palmera(x - 48, p[2][1] + 18, 28)]
    if len(p) > 3:
        x = lado(p[3])  # obelisco entre naranjos
        out += [M.obelisco(x, p[3][1] + 8, 50), M.naranjo(x - 28, p[3][1] + 14), M.naranjo(x + 28, p[3][1] + 14), M.naranjo(x - 14, p[3][1] + 26, 8), M.naranjo(x + 14, p[3][1] + 26, 8),
                M.casa(x - 48, p[3][1] + 4, 18, 12, 10)]
    if len(p) > 4:
        x = lado(p[4])  # cúpula con columnata
        out += [M.cupula(x, p[4][1] + 12, 24, 16, linterna=True), M.columna(x - 38, p[4][1] + 10, 36), M.columna(x + 38, p[4][1] + 10, 36),
                M.columna(x - 50, p[4][1] + 18, 28), M.columna(x + 50, p[4][1] + 18, 28)]
    if len(p) > 5:
        x = lado(p[5])  # palacio con jardín
        out += [M.casa_larga(x - 30, p[5][1] + 12, 60, 22, 14, win=(4, 1), arco=True), M.fuente(x, p[5][1] + 32, 22), M.podado(x - 46, p[5][1] + 28, 12, 10), M.podado(x + 36, p[5][1] + 28, 12, 10)]
    if len(p) > 6:
        x = lado(p[6])  # canal holandés con casas altas
        out += [M.casa(x - 30, p[6][1] + 14, 16, 28, 10, teja=M.PIZARRA, teja2=M.PIZARRA2), M.casa(x - 12, p[6][1] + 16, 16, 32, 10, teja=M.PIZARRA, teja2=M.PIZARRA2),
                M.casa(x + 6, p[6][1] + 14, 16, 26, 10, teja=M.PIZARRA, teja2=M.PIZARRA2), M.molino(x + 30, p[6][1] + 18, 16, 26), M.lago(x - 4, p[6][1] + 30, 40, 7), M.barca(x - 12, p[6][1] + 30, 14)]
    for i in range(7, len(p)):
        x = lado(p[i])
        out += [M.casa_larga(x - 20, p[i][1] + 12, 40, 18, 12, win=(3, 1), arco=True), M.naranjo(x + 34, p[i][1] + 16), M.naranjo(x - 34, p[i][1] + 18)]
    return out + margenes(p, h, lambda x, y, i: naranjos(x, y, i) if i % 3 else M.farola(x, y, 14))


def deco_rococo(p, h):
    out = []
    x = lado(p[0])     # palacio con escalinata y jardín a la francesa
    out += [M.casa_larga(x - 40, p[0][1] + 10, 80, 26, 16, win=(5, 1), arco=True, teja=M.PIZARRA, teja2=M.PIZARRA2), M.escalinata(x - 22, p[0][1] + 12, 44),
            M.cono(x - 48, p[0][1] + 16, 26), M.cono(x + 48, p[0][1] + 16, 26), M.podado(x - 36, p[0][1] + 30, 12, 10), M.podado(x + 24, p[0][1] + 30, 12, 10)]
    if len(p) > 1:
        x = lado(p[1])  # estanque con fuente y tilos recortados
        out += [M.lago(x, p[1][1] + 14, 38, 12), M.fuente(x, p[1][1] + 2, 18), M.podado(x - 48, p[1][1] + 8), M.podado(x + 32, p[1][1] + 8),
                M.podado(x - 48, p[1][1] + 28), M.podado(x + 32, p[1][1] + 28), M.cono(x - 24, p[1][1] + 34, 18), M.cono(x + 20, p[1][1] + 34, 18)]
    if len(p) > 2:
        x = lado(p[2])  # templete neoclásico
        out += [M.arcada(x - 22, p[2][1] + 12, 44, 28, 14, 1), (p[2][1] + 13, M.R(x - 16, p[2][1] - 22, 32, 6, M.T3)), M.columna(x - 32, p[2][1] + 12, 28),
                M.columna(x + 32, p[2][1] + 12, 28), M.cono(x - 48, p[2][1] + 14, 24), M.cono(x + 48, p[2][1] + 14, 24)]
    for i in range(3, len(p)):
        x = lado(p[i])
        out += [M.casa_larga(x - 24, p[i][1] + 12, 48, 20, 14, win=(3, 1), arco=True, teja=M.PIZARRA, teja2=M.PIZARRA2), M.cono(x - 38, p[i][1] + 16, 22), M.cono(x + 38, p[i][1] + 16, 22)]
    return out + margenes(p, h, lambda x, y, i: conos(x, y, i) if i % 2 else M.podado(x - 6, y, 12, 10))


def deco_romanticismo(p, h):
    out = []
    x = lado(p[0])     # montañas con nieve y niebla
    out += [M.montana(x, p[0][1] + 14, 100, 78, M.T1, M.T2, nieve=True), M.montana(x + 46, p[0][1] + 18, 64, 44), M.montana(x - 50, p[0][1] + 20, 54, 36),
            M.niebla(x, p[0][1] + 8, 84), M.abeto(x - 30, p[0][1] + 22, 28), M.abeto(x + 26, p[0][1] + 24, 24), M.abeto(x + 6, p[0][1] + 30, 18)]
    if len(p) > 1:
        x = lado(p[1])  # castillo en el risco
        out += [M.castillo(x - 40, p[1][1] + 4), M.abeto(x + 46, p[1][1] + 18, 30), M.abeto(x - 52, p[1][1] + 20, 26), M.abeto(x + 36, p[1][1] + 30, 18)]
    if len(p) > 2:
        x = lado(p[2])  # ruina gótica y árboles desnudos
        out += [M.ruina(x - 34, p[2][1] + 12), M.arbol_desnudo(x + 42, p[2][1] + 12, 32), M.arbol_desnudo(x - 46, p[2][1] + 14, 28), M.niebla(x, p[2][1] + 20, 60, .6)]
    if len(p) > 3:
        x = lado(p[3])  # lago con barca
        out += [M.lago(x, p[3][1] + 14, 44, 13), M.barca(x - 12, p[3][1] + 10, 14), M.abeto(x - 48, p[3][1] + 16, 28), M.abeto(x + 48, p[3][1] + 14, 32),
                M.niebla(x, p[3][1] + 26, 72, .7), M.abeto(x + 30, p[3][1] + 30, 18)]
    if len(p) > 4:
        x = lado(p[4])  # acantilado con faro
        out += [M.montana(x, p[4][1] + 16, 90, 40, M.T2, M.T3), M.torre(x - 8, p[4][1] - 22, 10, 28, 'plano', win=(1, 1), arco=False), M.lago(x + 10, p[4][1] + 26, 46, 9),
                M.barca(x + 20, p[4][1] + 24, 12), M.abeto(x - 46, p[4][1] + 16, 24)]
    for i in range(5, len(p)):
        x = lado(p[i])
        out += [M.montana(x, p[i][1] + 14, 80, 50), M.abeto(x - 36, p[i][1] + 18, 24), M.abeto(x + 36, p[i][1] + 18, 22)]
    return out + margenes(p, h, abetos)


def deco_realismo(p, h):
    out = []
    x = lado(p[0])     # campos, almiares y granja
    out += [M.campos(x - 44, p[0][1] + 26, 76, 22), M.almiar(x - 22, p[0][1] + 16), M.almiar(x + 6, p[0][1] + 22, 14), M.almiar(x + 32, p[0][1] + 14, 16),
            M.casa_larga(x - 44, p[0][1] + 2, 32, 16, 12, win=(2, 1)), M.arbol(x + 46, p[0][1] + 6, 8)]
    if len(p) > 1:
        x = lado(p[1])  # fábricas con chimeneas humeantes
        out += [M.chimenea(x - 22, p[1][1] + 12, 56), M.chimenea(x + 14, p[1][1] + 14, 44, 7), M.casa_larga(x - 40, p[1][1] + 16, 66, 20, 14, win=(5, 1), teja=M.PIZARRA, teja2=M.PIZARRA2),
                M.chimenea(x + 34, p[1][1] + 10, 36, 6)]
    if len(p) > 2:
        x = lado(p[2])  # estación y puente de hierro
        out += [M.casa_larga(x - 32, p[2][1] + 10, 60, 22, 14, win=(3, 1), arco=True), (p[2][1] + 9, M.R(x - 40, p[2][1] + 14, 78, 3, M.T3) + M.R(x - 40, p[2][1] + 20, 78, 3, M.T3)),
                M.torre(x + 22, p[2][1] + 10, 12, 32, 'aguja', ar=12, win=(1, 1), arco=False), M.arbol(x - 46, p[2][1] + 14, 8), M.farola(x - 44, p[2][1] + 28, 12)]
    if len(p) > 3:
        x = lado(p[3])  # aldea con iglesia y campos
        out += [M.campos(x - 40, p[3][1] + 30, 70, 18, surcos=5), M.casa(x - 30, p[3][1] + 14, 22, 14, 10), M.casa(x - 4, p[3][1] + 18, 20, 12, 10),
                M.torre(x + 22, p[3][1] + 14, 12, 30, 'aguja', ar=14, win=(1, 1)), M.arbol(x + 44, p[3][1] + 20, 9)]
    for i in range(4, len(p)):
        x = lado(p[i])
        out += [M.campos(x - 40, p[i][1] + 28, 70, 18), M.almiar(x - 10, p[i][1] + 16), M.casa(x + 16, p[i][1] + 14, 20, 14, 10)]
    return out + margenes(p, h, lambda x, y, i: arboles(x, y, i) if i % 2 else M.almiar(x, y, 10))


def deco_impresionismo(p, h):
    out = []
    x = lado(p[0])     # bulevar haussmanniano y la torre Eiffel
    out += [M.caja(x - 36, p[0][1] + 10, 68, 32, 16, win=(5, 2), cornisa=True), (p[0][1] + 11, M.R(x - 36, p[0][1] - 26, 68, 4, M.PIZARRA2)), M.eiffel(x + 50, p[0][1] + 10, 90),
            M.arbol(x - 46, p[0][1] + 16, 8), M.farola(x - 10, p[0][1] + 30, 14), M.farola(x + 20, p[0][1] + 30, 14)]
    m = mid(p[0], p[1]) if len(p) > 1 else (195, p[0][1] - 56)
    out += [M.rio(m[1], 26, onda=8), M.puente(m[0], m[1], 60, 3), M.barca(40, m[1] + 4, 16), M.barca(300, m[1] - 3, 14), M.barca(340, m[1] + 5, 12)]
    if len(p) > 1:
        x = lado(p[1])  # jardín público con quiosco
        out += [M.arbol(x - 32, p[1][1] + 14, 10), M.arbol(x - 6, p[1][1] + 18, 9), M.arbol(x + 20, p[1][1] + 14, 10), M.arbol(x + 42, p[1][1] + 18, 8),
                M.quiosco(x + 4, p[1][1] + 30), M.farola(x - 22, p[1][1] + 32), M.farola(x + 30, p[1][1] + 32)]
    if len(p) > 2:
        x = lado(p[2])  # estación de cristal
        out += [M.caja(x - 32, p[2][1] + 12, 64, 26, 16, win=(4, 1)), (p[2][1] + 13, M.P(f'M{M.f(x - 32)} {M.f(p[2][1] - 14)}Q{M.f(x)} {M.f(p[2][1] - 38)} {M.f(x + 32)} {M.f(p[2][1] - 14)}Z', M.AGUA2)),
                M.arbol(x + 44, p[2][1] + 14, 8), M.farola(x - 44, p[2][1] + 24, 14)]
    if len(p) > 3:
        x = lado(p[3])  # estanque de nenúfares con puente japonés
        out += [M.lago(x, p[3][1] + 14, 46, 13), M.barca(x - 18, p[3][1] + 8, 14), M.puente(x + 8, p[3][1] + 4, 30, 1), M.arbol(x - 48, p[3][1] + 12, 9), M.arbol(x + 48, p[3][1] + 10, 9),
                (p[3][1] + 20, M.E(x - 8, p[3][1] + 18, 4, 1.6, M.VERDE) + M.E(x + 12, p[3][1] + 20, 3.5, 1.4, M.VERDE) + M.E(x + 2, p[3][1] + 23, 4, 1.6, M.VERDE))]
    if len(p) > 4:
        x = lado(p[4])  # ópera y café con toldo
        out += [M.cafe(x - 26, p[4][1] + 10), M.caja(x + 20, p[4][1] + 10, 30, 26, 14, win=(2, 2), cornisa=True), M.arbol(x - 44, p[4][1] + 14, 9), M.farola(x + 50, p[4][1] + 24, 14)]
    for i in range(5, len(p)):
        x = lado(p[i])
        out += [M.caja(x - 30, p[i][1] + 12, 60, 24, 16, win=(4, 1), cornisa=True), M.arbol(x + 40, p[i][1] + 14, 8), M.arbol(x - 40, p[i][1] + 16, 8)]
    return out + margenes(p, h, lambda x, y, i: arboles(x, y, i) if i % 2 else M.farola(x, y, 14))


def deco_postimpresionismo(p, h):
    out = []
    x = lado(p[0])     # campo de girasoles, casa y cipreses
    out += [M.girasoles(x - 44, p[0][1] + 28, 80, 22), M.casa(x - 12, p[0][1], 24, 16, 12), M.cipres(x + 28, p[0][1] + 2, 36), M.cipres(x + 36, p[0][1] + 6, 26),
            M.cipres(x - 40, p[0][1] + 4, 28)]
    if len(p) > 1:
        x = lado(p[1])  # café con terraza, de noche
        out += [M.cafe(x - 26, p[1][1] + 8, 44, 32), M.farola(x + 32, p[1][1] + 18), M.arbol(x - 42, p[1][1] + 12, 9), M.farola(x - 40, p[1][1] + 28, 12)]
    if len(p) > 2:
        x = lado(p[2])  # pueblo provenzal con campanario
        out += [M.casa(x - 38, p[2][1] + 16, 18, 12, 10), M.casa(x - 16, p[2][1] + 12, 22, 16, 10), M.torre(x + 10, p[2][1] + 12, 12, 38, 'plano', win=(1, 2)),
                M.casa(x + 26, p[2][1] + 18, 18, 12, 10), M.cipres(x + 50, p[2][1] + 14, 32), M.arbol(x - 48, p[2][1] + 18, 7), M.casa(x - 4, p[2][1] + 30, 16, 10, 8)]
    if len(p) > 3:
        x = lado(p[3])  # la montaña Sainte-Victoire
        out += [M.montana(x, p[3][1] + 12, 96, 50, M.T1, M.T2), M.arbol(x - 32, p[3][1] + 16, 9), M.arbol(x + 32, p[3][1] + 16, 8), M.arbol(x, p[3][1] + 24, 7),
                M.casa(x - 48, p[3][1] + 22, 16, 10, 8), M.cipres(x + 48, p[3][1] + 20, 24)]
    if len(p) > 4:
        x = lado(p[4])  # playa del sur con palmeras
        out += [M.lago(x, p[4][1] + 24, 50, 9), M.palmera(x - 40, p[4][1] + 14, 30), M.palmera(x + 40, p[4][1] + 12, 28), M.barca(x + 4, p[4][1] + 22, 14), M.casa(x - 10, p[4][1] + 4, 20, 12, 10)]
    for i in range(5, len(p)):
        x = lado(p[i])
        out += [M.girasoles(x - 36, p[i][1] + 26, 70, 18), M.cipres(x + 36, p[i][1] + 8, 30), M.casa(x - 16, p[i][1] + 2, 20, 14, 10)]
    return out + margenes(p, h, lambda x, y, i: cipreses(x, y, i) if i % 2 else M.arbol(x, y, 7))


def deco_modernismo(p, h):
    out = []
    x = lado(p[0])     # la Sagrada Familia en obras, palmeras
    out += [M.sagrada(x - 32, p[0][1] + 10), M.palmera(x + 42, p[0][1] + 14, 30), M.palmera(x - 46, p[0][1] + 18, 26), M.farola(x + 10, p[0][1] + 30, 12)]
    if len(p) > 1:
        x = lado(p[1])  # la Pedrera y la Secesión vienesa
        out += [M.pedrera(x - 30, p[1][1] + 12, 54, 36), M.secesion(x - 46, p[1][1] - 10, 26, 24), M.arbol(x + 40, p[1][1] + 14, 9), M.farola(x - 40, p[1][1] + 26, 14), M.arbol(x + 48, p[1][1] + 26, 7)]
    if len(p) > 2:
        x = lado(p[2])  # noria del Prater
        out += [M.noria(x + 16, p[2][1] + 10, 26), M.secesion(x - 44, p[2][1] + 12), M.arbol(x - 4, p[2][1] + 22, 7), M.farola(x - 20, p[2][1] + 30, 12)]
    if len(p) > 3:
        x = lado(p[3])  # ciudad nueva con cúpula
        out += [M.torre(x - 22, p[3][1] + 12, 16, 52, 'cupulin', win=(1, 3)), M.caja(x + 2, p[3][1] + 12, 38, 30, 14, win=(3, 2), cornisa=True), M.arbol(x + 50, p[3][1] + 14, 8),
                M.farola(x - 36, p[3][1] + 28, 14)]
    for i in range(4, len(p)):
        x = lado(p[i])
        out += [M.caja(x - 28, p[i][1] + 12, 56, 28, 14, win=(4, 2), cornisa=True), M.palmera(x + 40, p[i][1] + 14, 28), M.arbol(x - 40, p[i][1] + 16, 8)]
    return out + margenes(p, h, lambda x, y, i: M.palmera(x - 4, y, 22) if i % 3 == 0 else arboles(x, y, i))


DECO = {
    'renacimiento': deco_renacimiento,
    'manierismo-y-norte': deco_norte,
    'barroco': deco_barroco,
    'rococo-neoclasicismo': deco_rococo,
    'romanticismo': deco_romanticismo,
    'realismo': deco_realismo,
    'impresionismo': deco_impresionismo,
    'postimpresionismo': deco_postimpresionismo,
    'simbolismo-modernismo': deco_modernismo,
}

COLOR_ATTR = re.compile(r'\b(fill|stroke)="(#[0-9A-Fa-f]{6}|rgba?\([^)]*\))"')


def classify(svg):
    """fill/stroke con color → clases de la paleta. Un color fuera de la paleta es un error (brand.css manda)."""
    def sub(m):
        attr, color = m.group(1), m.group(2)
        key = color.upper() if color.startswith('#') else color
        name = TOKENS.get(key)
        if attr == 'stroke' and name == 'window':
            name = 'stone-top'   # nervios de cúpula y aspas: un tono de piedra, no una ventana encendida
        if not name:
            raise SystemExit(f'color sin variable en brand.css: {color}')
        return f'class="{"s-" if attr == "stroke" else ""}{CLASS[name]}"'
    out = COLOR_ATTR.sub(sub, svg)
    # dos atributos convertidos en el mismo elemento: class="a" class="s-b" → class="a s-b"
    return re.sub(r'class="([^"]+)" class="([^"]+)"', r'class="\1 \2"', out)


def style(light, dark, era):
    def rules(pal):
        parts = [f'.{CLASS["tint"]}{{fill:{pal[f"tint-{era}"]}}}']
        for name, cls in CLASS.items():
            if name == 'tint':
                continue
            parts.append(f'.{cls}{{fill:{pal[name]}}}.s-{cls}{{stroke:{pal[name]}}}')
        return ''.join(parts)
    return f'<style>{rules(light)}@media(prefers-color-scheme:dark){{{rules(dark)}}}</style>'


def build(era, light, dark):
    pts = [(q['x'], q['y']) for q in era['points']]
    pieces = [tinte(era['h'], CLASS['tint'])] + DECO[era['id']](pts, era['h'])
    pieces.sort(key=lambda t: t[0])
    body = classify(''.join(t[1] for t in pieces))
    points = ' '.join(f'{M.f(x)},{M.f(y)}' for x, y in pts)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {era["h"]}" width="{W}" height="{era["h"]}" data-points="{points}">'
            f'{style(light, dark, era["id"])}{body}</svg>')


def main():
    node = shutil.which('node')
    if not node:
        raise SystemExit('hace falta node para leer el trazado (tools/mapa-layout.mjs)')
    layout = json.loads(subprocess.run([node, os.path.join(ROOT, 'tools', 'mapa-layout.mjs'), os.path.join(ROOT, 'app', 'data', 'catalog.json')],
                                       capture_output=True, text=True, check=True, cwd=ROOT).stdout)
    light, dark = brand_palette()
    os.makedirs(OUT, exist_ok=True)
    for era in layout['eras']:
        svg = build(era, light, dark)
        path = os.path.join(OUT, f'{era["id"]}.svg')
        with open(path, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(svg)
        kb = len(svg.encode('utf-8')) / 1024
        if kb > MAX_KB:
            raise SystemExit(f'{path}: {kb:.1f} KB, por encima de {MAX_KB} KB')
        print(f'{era["id"]:24s} {era["h"]:4d} px  {kb:5.1f} KB')


if __name__ == '__main__':
    main()
