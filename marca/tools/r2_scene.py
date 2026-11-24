# Ronda 2: escenarios de época para el camino. SVG vectorial, sobrio y de bajo contraste:
# dos tonos apenas más oscuros que el lino, sin trazos negros, para que los cuadros manden.
from r2_theme import BASE

T1 = '#EFE9DF'   # tono 1: casi lino
T2 = '#E5DCCE'   # tono 2: un punto más
T3 = '#DCD2C2'   # tono 3: solo para detalles pequeños
LINO = BASE['lino']


def _svg(h, body, label):
    return (f'<svg width="390" height="{h}" viewBox="0 0 390 {h}" fill="none" role="img" aria-label="{label}" '
            f'style="position: absolute; left: 0; top: 0; pointer-events: none">{body}</svg>')


def _cipres(x, base, alto, w=9):
    return f'<path d="M{x} {base} C{x - w} {base - alto * .3} {x - w} {base - alto * .75} {x} {base - alto} C{x + w} {base - alto * .75} {x + w} {base - alto * .3} {x} {base}Z" fill="{T2}"/>'


def _colinas(g):
    return (f'<path d="M0 {g + 10} C60 {g - 28} 130 {g - 32} 200 {g - 6} C260 {g + 14} 330 {g - 30} 390 {g - 14} V{g + 60} H0Z" fill="{T1}"/>'
            f'<path d="M0 {g + 30} C90 {g} 160 {g + 8} 240 {g + 22} C300 {g + 32} 350 {g + 10} 390 {g + 18} V{g + 60} H0Z" fill="{T2}" opacity=".7"/>')


def _arcada(y, alto=120, bahias=4, tono=T1, hueco=LINO):
    """Banda de arcos de medio punto con columnas: Renacimiento."""
    paso = 390 / bahias
    out = [f'<rect x="0" y="{y}" width="390" height="{alto}" fill="{tono}"/>']
    r = paso / 2 - 11
    for i in range(bahias):
        cx = paso * i + paso / 2
        top = y + 22
        out.append(f'<path d="M{cx - r} {y + alto} V{top + r} A{r} {r} 0 0 1 {cx + r} {top + r} V{y + alto}Z" fill="{hueco}"/>')
        out.append(f'<circle cx="{cx}" cy="{top + r}" r="3" fill="{T2}"/>')
    # capiteles
    for i in range(bahias + 1):
        x = paso * i
        out.append(f'<rect x="{x - 8}" y="{y + 22 + r - 4}" width="16" height="5" rx="1" fill="{T2}"/>')
    out.append(f'<rect x="0" y="{y}" width="390" height="10" fill="{T2}"/>')
    return ''.join(out)


def _cupula(cx, base, ancho=120, tono=T2):
    """Cúpula con tambor y linterna, a la florentina."""
    r = ancho / 2
    tambor = base - 44
    cima = tambor - r * .92
    out = [
        f'<rect x="{cx - r + 6}" y="{tambor}" width="{ancho - 12}" height="44" fill="{tono}"/>',
        f'<path d="M{cx - r} {tambor} C{cx - r} {cima + 14} {cx - r * .55} {cima} {cx} {cima} C{cx + r * .55} {cima} {cx + r} {cima + 14} {cx + r} {tambor}Z" fill="{tono}"/>',
        f'<rect x="{cx - 7}" y="{cima - 26}" width="14" height="28" fill="{tono}"/>',
        f'<circle cx="{cx}" cy="{cima - 30}" r="4" fill="{tono}"/>',
    ]
    for k in (-.6, -.3, 0, .3, .6):
        x = cx + r * k
        out.append(f'<path d="M{x} {tambor} Q{cx + (x - cx) * .55} {cima + 10} {cx} {cima}" stroke="{LINO}" stroke-width="2"/>')
    for k in (-.55, -.18, .18, .55):
        out.append(f'<rect x="{cx + r * k - 4}" y="{tambor + 10}" width="8" height="22" rx="4" fill="{LINO}"/>')
    return ''.join(out)


def renacimiento(h=844, suelo=None):
    g = suelo or h - 110
    body = (
        _colinas(g)
        + _cupula(300, g - 2, 130)
        + _cipres(52, g + 2, 110) + _cipres(72, g + 6, 84) + _cipres(236, g + 4, 70)
        + _arcada(g - 330, 118, 4)
        + f'<path d="M0 {g + 60} H390" stroke="{T2}" stroke-width="1"/>'
    )
    return _svg(h, body, 'Escenario del Renacimiento: arcada, cúpula y cipreses')


def _columna_salomonica(x, y0, y1, w=14):
    out = [f'<rect x="{x - w / 2}" y="{y0}" width="{w}" height="{y1 - y0}" fill="{T1}"/>']
    y = y0 + 6
    while y < y1 - 6:
        out.append(f'<path d="M{x - w / 2} {y} q{w / 2} 9 {w} 0" stroke="{T2}" stroke-width="3" fill="none"/>')
        y += 18
    out.append(f'<rect x="{x - w / 2 - 6}" y="{y0 - 10}" width="{w + 12}" height="10" rx="2" fill="{T2}"/>')
    out.append(f'<rect x="{x - w / 2 - 5}" y="{y1}" width="{w + 10}" height="8" rx="2" fill="{T2}"/>')
    return ''.join(out)


def _voluta(x, y, lado=1, s=1):
    d = (f'M{x} {y} c{18 * lado * s} {-4 * s} {30 * lado * s} {-26 * s} {12 * lado * s} {-36 * s} '
         f'c{-10 * lado * s} {-6 * s} {-20 * lado * s} {4 * s} {-12 * lado * s} {12 * s}')
    return f'<path d="{d}" stroke="{T2}" stroke-width="7" stroke-linecap="round" fill="none"/>'


def _nube(cx, cy, s=1):
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="{54 * s}" ry="{20 * s}" fill="{T1}"/>'
            f'<ellipse cx="{cx - 20 * s}" cy="{cy - 10 * s}" rx="{30 * s}" ry="{20 * s}" fill="{T1}"/>'
            f'<ellipse cx="{cx + 22 * s}" cy="{cy - 8 * s}" rx="{26 * s}" ry="{17 * s}" fill="{T1}"/>')


def barroco(h=844, suelo=None):
    g = suelo or h - 110
    f0 = g - 300   # arranque de la fachada
    cx = 195
    body = (
        _nube(70, 150, 1) + _nube(320, 110, .8) + _nube(250, 190, .6)
        # cuerpo de la fachada
        + f'<rect x="{cx - 128}" y="{f0}" width="256" height="{g - f0}" fill="{T1}"/>'
        # frontón partido y curvo
        + f'<path d="M{cx - 150} {f0 + 6} C{cx - 110} {f0 - 60} {cx - 60} {f0 - 72} {cx - 26} {f0 - 60} L{cx - 26} {f0 + 6}Z" fill="{T2}"/>'
        + f'<path d="M{cx + 150} {f0 + 6} C{cx + 110} {f0 - 60} {cx + 60} {f0 - 72} {cx + 26} {f0 - 60} L{cx + 26} {f0 + 6}Z" fill="{T2}"/>'
        + f'<rect x="{cx - 150}" y="{f0 + 2}" width="300" height="10" rx="2" fill="{T2}"/>'
        # óculo oval
        + f'<ellipse cx="{cx}" cy="{f0 + 70}" rx="26" ry="36" fill="{LINO}"/>'
        + f'<ellipse cx="{cx}" cy="{f0 + 70}" rx="26" ry="36" stroke="{T2}" stroke-width="5"/>'
        # volutas laterales
        + _voluta(cx - 128, f0 + 150, -1, 1.4) + _voluta(cx + 128, f0 + 150, 1, 1.4)
        # columnas salomónicas
        + _columna_salomonica(cx - 86, f0 + 140, g - 10) + _columna_salomonica(cx + 86, f0 + 140, g - 10)
        # portada
        + f'<path d="M{cx - 46} {g} V{f0 + 200} A46 46 0 0 1 {cx + 46} {f0 + 200} V{g}Z" fill="{T2}"/>'
        + f'<path d="M{cx - 34} {g} V{f0 + 206} A34 34 0 0 1 {cx + 34} {f0 + 206} V{g}Z" fill="{LINO}"/>'
        # balaustrada
        + f'<rect x="0" y="{g}" width="390" height="8" fill="{T2}"/>'
        + ''.join(f'<rect x="{x}" y="{g + 8}" width="6" height="22" rx="3" fill="{T2}"/>' for x in range(14, 390, 26))
        + f'<rect x="0" y="{g + 30}" width="390" height="6" fill="{T2}"/>'
    )
    return _svg(h, body, 'Escenario del Barroco: fachada con frontón curvo, óculo y columnas salomónicas')


def _ojiva(cx, y0, y1, w, tono=LINO):
    r = w / 2
    return f'<path d="M{cx - r} {y1} V{y0 + r * 1.2} Q{cx - r} {y0} {cx} {y0 - 8} Q{cx + r} {y0} {cx + r} {y0 + r * 1.2} V{y1}Z" fill="{tono}"/>'


def _aguja(cx, base, alto, w=26):
    return (f'<rect x="{cx - w / 2}" y="{base - alto * .55}" width="{w}" height="{alto * .55}" fill="{T1}"/>'
            f'<path d="M{cx - w / 2 - 2} {base - alto * .55} L{cx} {base - alto} L{cx + w / 2 + 2} {base - alto * .55}Z" fill="{T2}"/>'
            + _ojiva(cx, base - alto * .5, base - alto * .2, w * .45, LINO))


def gotico(h=844, suelo=None):
    g = suelo or h - 110
    cx = 195
    y0 = g - 320
    out = [
        _aguja(70, g, 360, 28), _aguja(320, g, 330, 26),
        f'<rect x="{cx - 95}" y="{y0}" width="190" height="{g - y0}" fill="{T1}"/>',
        f'<path d="M{cx - 95} {y0} L{cx} {y0 - 90} L{cx + 95} {y0}Z" fill="{T2}"/>',
        f'<circle cx="{cx}" cy="{y0 + 70}" r="44" fill="{T2}"/>',
        f'<circle cx="{cx}" cy="{y0 + 70}" r="36" fill="{LINO}"/>',
    ]
    for k in range(8):
        import math
        a = math.pi / 4 * k
        out.append(f'<path d="M{cx} {y0 + 70} L{cx + 36 * math.cos(a):.1f} {y0 + 70 + 36 * math.sin(a):.1f}" stroke="{T2}" stroke-width="4"/>')
    out.append(f'<circle cx="{cx}" cy="{y0 + 70}" r="9" fill="{T2}"/>')
    # portada ojival y ventanas
    out.append(_ojiva(cx, y0 + 150, g, 84, T2))
    out.append(_ojiva(cx, y0 + 162, g, 62, LINO))
    out.append(_ojiva(cx - 66, y0 + 150, y0 + 240, 26))
    out.append(_ojiva(cx + 66, y0 + 150, y0 + 240, 26))
    # arbotantes
    for lado in (-1, 1):
        x = cx + 95 * lado
        out.append(f'<path d="M{x} {y0 + 120} Q{x + 40 * lado} {y0 + 150} {x + 62 * lado} {y0 + 230} L{x + 62 * lado} {g} L{x + 48 * lado} {g} L{x + 48 * lado} {y0 + 236} Q{x + 34 * lado} {y0 + 170} {x} {y0 + 150}Z" fill="{T2}" opacity=".8"/>')
    out.append(f'<path d="M0 {g + 60} H390" stroke="{T2}" stroke-width="1"/>')
    return _svg(h, ''.join(out), 'Escenario gótico: catedral con rosetón, agujas y arbotantes')


def norte(h=844, suelo=None):
    """Casas de hastial escalonado: Manierismo y Renacimiento del Norte."""
    g = suelo or h - 110
    out = []
    x = -10
    import random
    rnd = random.Random(7)
    while x < 400:
        w = rnd.choice((54, 62, 70))
        alto = rnd.choice((150, 180, 210))
        tono = T1 if rnd.random() < .6 else T2
        pasos = 4
        d = f'M{x} {g} V{g - alto + 60} '
        for i in range(pasos):
            d += f'H{x + w / 2 - (pasos - i) * (w / 2 / pasos)} V{g - alto + 60 - (i + 1) * 15} '
        d += f'H{x + w / 2 + (w / 2 / pasos)} '
        for i in range(pasos - 1, -1, -1):
            d += f'V{g - alto + 60 - i * 15} H{x + w / 2 + (pasos - i) * (w / 2 / pasos)} '
        d += f'V{g}Z'
        out.append(f'<path d="{d}" fill="{tono}"/>')
        for r in range(3):
            for c in range(2):
                out.append(f'<rect x="{x + 12 + c * (w / 2 - 6)}" y="{g - 30 - r * 36}" width="12" height="18" rx="2" fill="{LINO}"/>')
        x += w + 8
    out.append(f'<rect x="0" y="{g}" width="390" height="4" fill="{T2}"/>')
    return _svg(h, ''.join(out), 'Escenario del Norte: casas de hastial escalonado')


def siluetas(h=844, suelo=None, epoca='renacimiento'):
    """Variante sobria: solo una franja de perfiles al fondo, sin detalle."""
    g = suelo or h - 110
    if epoca == 'barroco':
        d = (f'M0 {g} V{g - 60} H40 V{g - 80} Q60 {g - 130} 80 {g - 80} V{g - 60} H130 V{g - 110} '
             f'C150 {g - 160} 170 {g - 160} 190 {g - 110} V{g - 60} H240 V{g - 100} Q260 {g - 140} 280 {g - 100} V{g - 60} H330 V{g - 90} '
             f'L345 {g - 130} L360 {g - 90} V{g - 60} H390 V{g}Z')
    else:
        d = (f'M0 {g} V{g - 50} H30 V{g - 70} L36 {g - 150} L42 {g - 70} V{g - 50} H110 V{g - 90} '
             f'C120 {g - 150} 180 {g - 150} 190 {g - 90} V{g - 50} H250 V{g - 80} L256 {g - 120} L262 {g - 80} V{g - 50} H300 V{g - 70} '
             f'Q330 {g - 110} 360 {g - 70} V{g - 50} H390 V{g}Z')
    body = (f'<path d="{d}" fill="{T1}"/>'
            f'<path d="M0 {g} H390" stroke="{T2}" stroke-width="1.5"/>')
    return _svg(h, body, 'Variante de siluetas: perfil de la ciudad de la época, sin detalle')


ESCENAS = {'renacimiento': renacimiento, 'barroco': barroco, 'gotico': gotico, 'norte': norte, 'siluetas': siluetas}
