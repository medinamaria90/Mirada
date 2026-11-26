# Paisajes propios de las pantallas de rama (app/img/mapa/rama-<id>.svg), para tools/mapa_svg.py: secano español
# (ocres, pueblos blancos, campanarios, olivos), escuela rusa (abedules, cúpulas de cebolla, nieve), estampa japonesa
# (pinos, puente curvo, el Fuji, cerezos), campiña inglesa (setos, prados, casitas, aguja de iglesia) y gótico
# (catedral, muralla, árboles desnudos). Las ramas de época usan el paisaje de su época (DECO de mapa_svg.py).
#
# Mismas reglas que los paisajes de época: solo colores de la paleta (TOKENS de mapa_svg.py, que manda brand.css),
# nada bajo los rótulos de las paradas, árboles en <g data-sway> y ventanas con data-lamp.
#
# Uso: mapa_svg.py llama a registrar(mapa_svg) y añade lo que devuelve a DECO y ESPARCIDO.

S = None   # tools/mapa_svg.py (lo fija registrar)
M = None   # marca/tools/mapa.py

BLOOM = '#E9BFB5'
FRUTO = '#E8C9A0'
HENO, HENO2 = '#E6D9B8', '#D9C9A3'
CAMPO, CAMPO2 = '#E6DCB8', '#DACDA6'
ORO = '#E3C76B'


def _libre(fn):
    """Como las piezas de mapa_svg.py: no se pinta si su base cae bajo un rótulo (o justo debajo)."""
    def envuelta(x, y, *a, **k):
        for r in S.LIBRE['rotulos']:
            if r['x0'] - S.MARGEN_X <= x <= r['x1'] + S.MARGEN_X and r['y0'] <= y <= r['y1'] + S.ALTO_PIEZA:
                return (y, '')
        res = fn(x, y, *a, **k)
        if res[1]:
            S.OCUPADO['piezas'].append((x, y))
        return res
    return envuelta


def _mece(x, res):
    return (res[0], f'<g data-sway="{M.f(x)}">{res[1]}</g>' if res[1] else '')


# ---- piezas nuevas ---------------------------------------------------------------------------------------------

@_libre
def olivo(x, y, r=7):
    tronco = M.P(f'M{M.f(x - 1.6)} {M.f(y)}C{M.f(x - 2.4)} {M.f(y - r * .5)} {M.f(x + 1)} {M.f(y - r * .6)} {M.f(x - .6)} {M.f(y - r * 1.1)}'
                 f'L{M.f(x + 1.2)} {M.f(y - r * 1.1)}C{M.f(x + 2.6)} {M.f(y - r * .6)} {M.f(x)} {M.f(y - r * .4)} {M.f(x + 1.6)} {M.f(y)}Z', M.T3)
    copa = (M.E(x + 1, y - r * 1.3, r * 1.25, r * .72, M.VERDE2) + M.E(x - r * .35, y - r * 1.45, r * .85, r * .5, M.VERDE)
            + M.E(x + r * .55, y - r * 1.6, r * .5, r * .32, M.VERDE))
    return _mece(x, (y, M.sombra(x + 2, y + 1, r * 1.1, r * .32) + tronco + copa))


def olivar(x, y):
    return [olivo(x + dx, y + dy, 5 + (i % 2)) for i, (dx, dy) in enumerate(((0, 0), (17, -5), (34, -10), (-8, 11), (9, 6), (26, 1)))]


@_libre
def secano(x, y, w=64):
    return M.campos(x, y, w, 16, HENO, HENO2, 4)


def casa_blanca(x, y, w=18, h=12, d=10):
    return M.casa(x, y, w, h, d, front=M.TOP)


def campanario(x, y, w=13, h=46):
    return M.torre(x, y, w, h, 'cupulin', front=M.TOP, win=(1, 2))


def pueblo_blanco(x, y):
    return [casa_blanca(x - 30, y + 12, 18, 12, 10), casa_blanca(x - 10, y + 16, 20, 13, 10), campanario(x + 12, y + 8),
            casa_blanca(x + 30, y + 18, 16, 11, 9), casa_blanca(x - 22, y - 2, 16, 10, 9), M.cipres(x + 46, y + 14, 24)]


@_libre
def abedul(x, y, h=30):
    marcas = ''.join(M.R(x - 1.2 + (i % 2) * .8, y - h * t, 1.6, .9, M.T3) for i, t in enumerate((.2, .38, .55, .7)))
    copa = M.E(x, y - h * .92, h * .2, h * .3, M.VERDE) + M.E(x + h * .08, y - h * .78, h * .16, h * .22, M.VERDE2)
    return _mece(x, (y, M.sombra(x + 2, y + 1, 5, 1.6) + M.R(x - 1.3, y - h * .8, 2.6, h * .8, M.TOP) + marcas + copa))


def bosque_abedules(x, y):
    return [abedul(x + dx, y + dy, 24 + (i % 3) * 6) for i, (dx, dy) in enumerate(((-24, 4), (-10, 10), (6, 2), (20, 12), (34, 6)))]


def _cebolla(cx, y0, w, color):
    d = (f'M{M.f(cx - w / 2)} {M.f(y0)}C{M.f(cx - w * .62)} {M.f(y0 - w * .55)} {M.f(cx - w * .08)} {M.f(y0 - w * .7)} {M.f(cx)} {M.f(y0 - w * 1.25)}'
         f'C{M.f(cx + w * .08)} {M.f(y0 - w * .7)} {M.f(cx + w * .62)} {M.f(y0 - w * .55)} {M.f(cx + w / 2)} {M.f(y0)}Z')
    cruz = M.R(cx - .6, y0 - w * 1.25 - 6, 1.2, 6, M.T3) + M.R(cx - 2.2, y0 - w * 1.25 - 4.4, 4.4, 1.1, M.T3)
    return M.P(d, color) + cruz


@_libre
def iglesia_cebolla(x, y):
    """Iglesia rusa: cuerpo blanco, tambores y tres cúpulas de cebolla (la del centro, dorada)."""
    _, cuerpo = M.caja(x - 18, y, 36, 22, 14, front=M.TOP, win=(3, 1), puerta=True)
    tambores = M.R(x - 4, y - 34, 9, 12, M.TOP) + M.R(x - 17, y - 28, 6, 7, M.TOP) + M.R(x + 12, y - 28, 6, 7, M.TOP)
    cupulas = _cebolla(x + .5, y - 34, 13, ORO) + _cebolla(x - 14, y - 28, 8, M.PIZARRA2) + _cebolla(x + 15, y - 28, 8, M.PIZARRA2)
    return (y, cuerpo + tambores + cupulas + M.R(x - 1.5, y - 30, 3, 5, M.LINO).replace('<rect', '<rect data-lamp=""', 1))


def isba(x, y):
    return M.casa(x, y, 20, 13, 12, teja=M.PIZARRA, teja2=M.PIZARRA2, front=HENO2)


@_libre
def nieve(x, y, w=40):
    return (y - 200, M.E(x, y, w / 2, w * .1, M.TOP) + M.E(x + w * .3, y + 2, w * .25, w * .07, M.TOP))


@_libre
def abeto_nevado(x, y, h=26):
    res = M.abeto(x, y, h)     # ya va en su <g data-sway>: la nieve entra en el mismo grupo
    if not res[1]:
        return res
    w = h * .5
    gorros = ''.join(M.poly([(x - ww * .22, y - h * (b - .12)), (x, y - h * b), (x + ww * .22, y - h * (b - .12))], M.TOP) for b, ww in ((.45, w), (.74, w * .8), (1, w * .56)))
    return (y, res[1][:-len('</g>')] + gorros + '</g>')


@_libre
def pino(x, y, h=30):
    """Pino japonés: tronco curvo y copas planas en capas."""
    tronco = M.P(f'M{M.f(x - 2)} {M.f(y)}C{M.f(x - 1)} {M.f(y - h * .4)} {M.f(x + h * .3)} {M.f(y - h * .55)} {M.f(x + h * .18)} {M.f(y - h)}'
                 f'L{M.f(x + h * .24)} {M.f(y - h)}C{M.f(x + h * .38)} {M.f(y - h * .55)} {M.f(x + 2)} {M.f(y - h * .4)} {M.f(x + 2)} {M.f(y)}Z', M.T3)
    capas = ''.join(M.E(x + dx, y - h * t, rx, rx * .32, M.VERDE2) + M.E(x + dx - 1.5, y - h * t - 1.4, rx * .72, rx * .22, M.VERDE)
                    for dx, t, rx in ((h * .35, .62, h * .26), (h * .05, .8, h * .22), (h * .26, .98, h * .2)))
    return _mece(x, (y, M.sombra(x + 3, y + 1, h * .3, h * .08) + tronco + capas))


@_libre
def cerezo(x, y, r=8):
    """Cerezo en flor: tronco oscuro y una nube de flores en tres copas."""
    flores = (M.C(x - r * .55, y - r * 1.25, r * .7, BLOOM) + M.C(x + r * .5, y - r * 1.35, r * .75, BLOOM) + M.C(x, y - r * 1.85, r * .72, BLOOM)
              + M.C(x - r * .2, y - r * 1.95, r * .32, M.TOP) + M.C(x + r * .6, y - r * 1.5, r * .22, M.TOP))
    return _mece(x, (y, M.sombra(x + 2, y + 1, r, r * .3) + M.R(x - 1.2, y - r, 2.4, r, M.T3) + flores))


@_libre
def puente_curvo(cx, y, w=58):
    """Puente japonés en arco sobre un estanque."""
    x0, x1 = cx - w / 2, cx + w / 2
    agua = M.E(cx, y + 4, w * .62, 7, M.AGUA) + M.E(cx - w * .2, y + 3, w * .2, 2, M.AGUA2).replace('<ellipse', '<ellipse data-flow=""', 1)
    tablero = M.P(f'M{M.f(x0)} {M.f(y)}Q{M.f(cx)} {M.f(y - w * .42)} {M.f(x1)} {M.f(y)}', 'none', M.TEJA2, 4)
    baranda = M.P(f'M{M.f(x0 + 2)} {M.f(y - 7)}Q{M.f(cx)} {M.f(y - w * .42 - 8)} {M.f(x1 - 2)} {M.f(y - 7)}', 'none', M.TEJA2, 1.6)
    postes = ''.join(M.R(x0 + w * t - .8, y - 7 - w * .42 * 4 * t * (1 - t) * .5 - 1, 1.6, 8, M.TEJA2) for t in (.12, .3, .5, .7, .88))
    return (y, agua + tablero + baranda + postes)


@_libre
def fuji(cx, y, w=150, h=62):
    cima = .26   # ancho de la cima plana
    cuerpo = M.poly([(cx - w / 2, y), (cx - w * cima / 2, y - h), (cx + w * cima / 2, y - h), (cx + w / 2, y)], M.T1)
    lado = M.poly([(cx, y), (cx + w * cima / 2, y - h), (cx + w / 2, y)], M.T2)
    nieve_ = M.poly([(cx - w * .27, y - h * .58), (cx - w * cima / 2, y - h), (cx + w * cima / 2, y - h), (cx + w * .27, y - h * .58), (cx + w * .16, y - h * .66),
                     (cx + w * .08, y - h * .56), (cx - w * .02, y - h * .68), (cx - w * .12, y - h * .57), (cx - w * .19, y - h * .66)], M.TOP)
    return (y - 400, cuerpo + lado + nieve_)


@_libre
def pagoda(x, y):
    out = [M.sombra(x + 4, y + 2, 16, 4)]
    for i, (w, h) in enumerate(((22, 10), (18, 9), (14, 8))):
        base = y - i * 15
        out.append(M.R(x - w / 2 + 3, base - h, w - 6, h, M.T2))
        out.append(M.P(f'M{M.f(x - w / 2 - 5)} {M.f(base - h + 1)}Q{M.f(x)} {M.f(base - h - 4)} {M.f(x + w / 2 + 5)} {M.f(base - h + 1)}L{M.f(x + w / 2 - 1)} {M.f(base - h - 4)}H{M.f(x - w / 2 + 1)}Z', M.TEJA2))
    out.append(M.R(x - .7, y - 54, 1.4, 10, M.T3))
    return (y, ''.join(out))


@_libre
def torii(x, y, w=26, h=24):
    return (y, M.R(x - w / 2 + 3, y - h, 3, h, M.TEJA2) + M.R(x + w / 2 - 6, y - h, 3, h, M.TEJA2) + M.R(x - w / 2 + 1, y - h + 5, w - 2, 2.4, M.TEJA2)
            + M.P(f'M{M.f(x - w / 2 - 3)} {M.f(y - h)}Q{M.f(x)} {M.f(y - h + 2)} {M.f(x + w / 2 + 3)} {M.f(y - h)}L{M.f(x + w / 2 + 4)} {M.f(y - h - 3.4)}Q{M.f(x)} {M.f(y - h - 1.6)} {M.f(x - w / 2 - 4)} {M.f(y - h - 3.4)}Z', M.TEJA2))


def cottage(x, y, w=20):
    return M.casa(x, y, w, 12, 11, teja=HENO, teja2=HENO2, front=M.TOP)


@_libre
def seto(x, y, w=70):
    """Seto vivo de la campiña: una franja verde y redondeada que sube en falsa 3D."""
    x1, y1 = x + w, y - w * .23
    d = f'M{M.f(x)} {M.f(y - 3)}L{M.f(x1)} {M.f(y1 - 3)}'
    luz = f'M{M.f(x + 2)} {M.f(y - 5)}L{M.f(x1 - 2)} {M.f(y1 - 5)}'
    return (y, M.P(d, 'none', M.VERDE2, 7) + M.P(luz, 'none', M.VERDE, 3.4))


@_libre
def prado(x, y, w=64):
    return M.campos(x, y, w, 16, M.VERDE, M.VERDE2, 3)


def iglesia_aguja(x, y):
    return [M.casa_larga(x - 18, y + 4, 32, 16, 12, win=(2, 1), arco=True, teja=M.PIZARRA, teja2=M.PIZARRA2), M.torre(x + 14, y + 4, 12, 30, 'aguja', ar=26, win=(1, 1))]


def catedral(x, y):
    return [M.casa_larga(x - 22, y + 10, 44, 26, 14, win=(2, 1), arco=True, teja=M.PIZARRA, teja2=M.PIZARRA2),
            M.torre(x - 34, y + 10, 12, 56, 'aguja', ar=34, win=(1, 2)), M.torre(x + 22, y + 10, 12, 56, 'aguja', ar=34, win=(1, 2)),
            (y + 11, M.C(x, y - 6, 4.5, M.LINO).replace('<circle', '<circle data-lamp=""', 1))]


# ---- paisajes: una viñeta por parada, en el lado contrario a su rótulo -----------------------------------------

# Sin carteles en la pantalla de rama, el margen estrecho junto a cada parada queda libre (viñeta junto al nodo) y,
# entre parada y parada, la franja sin rótulos a los dos lados del sendero (otra viñeta, alternando el lado). Las
# viñetas ponen sus piezas algo por debajo de la y que reciben.
MARGEN = {'left': 52, 'right': 338}
FRANJA = {'left': 66, 'right': 324}


def _por_parada(p, h, vinetas, relleno, extra=None):
    out = []
    for i, q in enumerate(p):
        out += vinetas[i % len(vinetas)](MARGEN['left' if q[0] < 195 else 'right'], q[1], i)
        if i + 1 < len(p):
            m = S.mid(q, p[i + 1])
            out += vinetas[(i + 2) % len(vinetas)](FRANJA['right' if i % 2 else 'left'], m[1], i)
            out.append(relleno(FRANJA['left' if i % 2 else 'right'], m[1] + 14, i))
            if extra:
                out += extra(m, i)
    return out


def deco_espana(p, h):
    vinetas = [
        lambda x, y, i: pueblo_blanco(x, y + 4),
        lambda x, y, i: olivar(x - 20, y + 30) + [secano(x - 40, y + 8, 60)],
        lambda x, y, i: [M.molino(x - 18, y + 14, 16, 28), M.molino(x + 10, y + 6, 16, 28), secano(x - 34, y + 34, 56)],
        lambda x, y, i: [M.torre(x - 8, y + 18, 15, 70, 'cupulin', front=M.TOP, win=(1, 3)), casa_blanca(x + 14, y + 22, 18, 12, 10), olivo(x - 32, y + 26, 6), olivo(x + 40, y + 30)],
        lambda x, y, i: [campanario(x - 6, y + 10, 14, 54), casa_blanca(x + 14, y + 18), casa_blanca(x - 32, y + 20, 16, 11, 9), olivo(x + 40, y + 30)],
    ]
    relleno = lambda x, y, i: olivo(x, y, 6 + i % 2) if i % 3 else M.cipres(x, y, 22)
    return _por_parada(p, h, vinetas, relleno, lambda m, i: [secano(m[0] - 140, m[1] + 8, 52)] if i % 3 == 1 else [])


def deco_rusia(p, h):
    vinetas = [
        lambda x, y, i: [iglesia_cebolla(x, y + 20), abedul(x - 40, y + 26), abedul(x + 38, y + 24, 26), nieve(x, y + 30, 70)],
        lambda x, y, i: bosque_abedules(x - 4, y + 18) + [nieve(x, y + 34, 60)],
        lambda x, y, i: [isba(x - 28, y + 18), isba(x + 2, y + 22), abeto_nevado(x + 34, y + 20), abeto_nevado(x - 40, y + 26, 22), nieve(x - 10, y + 32, 56)],
        lambda x, y, i: [abeto_nevado(x - 20, y + 16, 30), abeto_nevado(x, y + 22, 24), abeto_nevado(x + 20, y + 14, 28), nieve(x, y + 30, 64)],
    ]
    relleno = lambda x, y, i: abedul(x, y, 22 + (i % 2) * 4) if i % 2 else abeto_nevado(x, y, 20)
    return _por_parada(p, h, vinetas, relleno, lambda m, i: [M.rio(m[1], 20, onda=6)] if i % 4 == 2 else [])


def deco_japon(p, h):
    vinetas = [
        lambda x, y, i: [fuji(x, y + 20, 130, 54), pino(x + 40, y + 30, 28)],
        lambda x, y, i: [puente_curvo(x, y + 26), cerezo(x - 40, y + 20), pino(x + 38, y + 18, 26)],
        lambda x, y, i: [pagoda(x - 6, y + 28), cerezo(x + 30, y + 26, 7), cerezo(x - 38, y + 22, 7)],
        lambda x, y, i: [torii(x, y + 24), pino(x - 36, y + 26, 30), pino(x + 34, y + 20, 24)],
    ]
    relleno = lambda x, y, i: pino(x, y, 22) if i % 2 else cerezo(x, y, 6)
    return _por_parada(p, h, vinetas, relleno)


def deco_inglaterra(p, h):
    vinetas = [
        lambda x, y, i: [cottage(x - 24, y + 16), cottage(x + 4, y + 22, 18), M.arbol(x + 38, y + 22, 10), seto(x - 46, y + 38, 84)],
        lambda x, y, i: [prado(x - 44, y + 20, 60), S.rebano(x - 10, y + 6), M.arbol(x + 40, y + 24, 11)],
        lambda x, y, i: iglesia_aguja(x, y + 16) + [M.arbol(x - 42, y + 26, 9), seto(x - 40, y + 40, 80)],
        lambda x, y, i: [M.lago(x, y + 26, 30, 7), M.arbol(x - 40, y + 20, 11), M.arbol(x + 40, y + 16, 9), cottage(x - 6, y + 4, 16)],
    ]
    relleno = lambda x, y, i: M.arbol(x, y, 8 + (i % 2) * 2)
    return _por_parada(p, h, vinetas, relleno, lambda m, i: [seto(m[0] - 150, m[1] + 12, 70)] if i % 2 else [])


def deco_gotico(p, h):
    vinetas = [
        lambda x, y, i: catedral(x, y + 8),
        lambda x, y, i: [M.muralla(x - 34, y + 22, 68, 12), M.torre(x - 40, y + 22, 12, 28, 'aguja', ar=14, win=(1, 1)), M.torre(x + 28, y + 22, 12, 28, 'aguja', ar=14, win=(1, 1)),
                         M.casa(x - 8, y + 6, 18, 14, 10, teja=M.PIZARRA, teja2=M.PIZARRA2)],
        lambda x, y, i: [M.casa(x - 30, y + 16, 18, 20, 10, teja=M.PIZARRA, teja2=M.PIZARRA2), M.casa(x - 10, y + 18, 16, 24, 10, teja=M.PIZARRA, teja2=M.PIZARRA2),
                         M.arbol_desnudo(x + 26, y + 20, 26), M.arbol(x + 44, y + 26, 7)],
    ]
    relleno = lambda x, y, i: M.arbol_desnudo(x, y, 22) if i % 2 else M.arbol(x, y, 7)
    return _por_parada(p, h, vinetas, relleno, lambda m, i: [M.rio(m[1], 20, onda=6), M.puente(m[0], m[1], 46, 2)] if i == 2 else [])


def registrar(mod):
    """Da a mapa_svg.py los paisajes de rama (DECO) y lo que se esparce por sus huecos (ESPARCIDO)."""
    global S, M
    S, M = mod, mod.M
    deco = {'maestros-espanoles': deco_espana, 'escuela-rusa': deco_rusia, 'ukiyo-e': deco_japon, 'pintura-britanica': deco_inglaterra, 'gotico': deco_gotico}
    flores = lambda colores: (lambda x, y, i: S.flores(x, y, colores))
    esparcido = {
        'maestros-espanoles': [(3, lambda x, y, i: S.mata(x, y, 3.2)), (3, lambda x, y, i: S.roca(x, y, 5 + i % 3)), (2, lambda x, y, i: S.hierba(x, y)),
                               (1, lambda x, y, i: olivo(x, y, 4)), (1, flores([ORO, M.TOP]))],
        'escuela-rusa': [(4, lambda x, y, i: nieve(x, y, 18 + i % 3 * 6)), (2, lambda x, y, i: abedul(x, y, 16)), (1, lambda x, y, i: S.roca(x, y))],
        'ukiyo-e': [(3, flores([BLOOM, M.TOP])), (2, lambda x, y, i: S.mata(x, y, 3.2, BLOOM)), (2, lambda x, y, i: S.roca(x, y, 5)), (1, lambda x, y, i: S.hierba(x, y))],
        'pintura-britanica': [(3, lambda x, y, i: S.mata(x, y)), (2, lambda x, y, i: S.rebano(x, y)), (2, flores([M.TOP, '#EBD38A'])), (2, lambda x, y, i: S.hierba(x, y))],
        'gotico': [(3, lambda x, y, i: S.hierba(x, y)), (2, lambda x, y, i: S.roca(x, y)), (2, lambda x, y, i: S.mata(x, y)), (1, flores([M.TOP, BLOOM]))],
    }
    return deco, esparcido
