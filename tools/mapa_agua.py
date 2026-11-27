# Agua, puentes y puerta del mapa del camino (lo usa tools/mapa_svg.py y tools/mapa_ramas.py).
#
# Reglas fijas del generador (docs/eval/camino-experto.md):
#  · Los ríos nacen de los puentes del trazado (ui/screens/path-layout.js): cada río cruza el mapa a la altura de su
#    puente, perpendicular al sendero, que ahí va recto. El tablero va alineado con el sendero y es más largo que el río.
#  · El río sale de la pantalla por los dos lados (empieza y acaba fuera del dibujo): nunca se corta en seco.
#  · comprobar() falla si el sendero o el desvío de una rama tocan agua sin puente (ríos y lagos).
#  · En la entrada de cada época, un seto la cruza de lado a lado y el sendero pasa por su puerta (la dibuja la app).

RIO_FUERA = 60          # el río empieza y acaba esta distancia fuera del dibujo, por los dos lados
PUENTE_MARGEN = 5       # el tablero, algo más corto que el paso recto del sendero (sus pretiles los pinta la app)
PUENTE_ANCHO = 42       # tablero: el sendero (26) y un pretil a cada lado (los pone la app)
ESTRIBO = 4             # estribos de piedra en cada orilla, algo más anchos que el tablero
BARCA_AIRE = 54         # una barca, al menos a esta distancia del puente
SETO_PASO = 8
SETO_R = 5.5
PUERTA_HUECO = 28       # medio hueco del seto en la puerta (los pilares los pinta la app)
AIRE_AGUA = 14          # el sendero (medio ancho y algo de aire) no toca agua
DESVIO_AIRE = 8         # el desvío de una rama (medio ancho y algo de aire) no toca un río


def puente_sendero(M, cx, y, largo, ancho=PUENTE_ANCHO):
    """Puente de piedra visto desde arriba, en la dirección del sendero (vertical): estribos, tablero y su sombra en el
    agua. El sendero (en la app) pasa por encima del tablero y la app pone delante los pretiles."""
    x0, y0 = cx - ancho / 2, y - largo / 2
    out = [M.R(x0 + 4, y0 + 6, ancho, largo - 8, M.SOMBRA),
           M.R(x0 - ESTRIBO, y0, ancho + 2 * ESTRIBO, ESTRIBO + 2, M.T3), M.R(x0 - ESTRIBO, y0 + largo - ESTRIBO - 2, ancho + 2 * ESTRIBO, ESTRIBO + 2, M.T3),
           M.R(x0, y0, ancho, largo, M.T2)]
    return (y + largo / 2, ''.join(out))


def rios(M, W, puentes, alto, onda, barcas=()):
    """Un río por puente, de borde a borde y más allá, con su puente alineado con el sendero. barcas: (x, dy, largo)."""
    out = []
    for b in puentes:
        out.append(M.rio(b['y'], alto, -RIO_FUERA, W + RIO_FUERA, onda))
        out.append(M.puente_sendero(b['x'], b['y'], b['len'] - 2 * PUENTE_MARGEN, PUENTE_ANCHO))
        out += [M.barca(x, b['y'] + dy, w) for x, dy, w in barcas if abs(x + w / 2 - b['x']) > BARCA_AIRE]
    return out


def seto(M, W, puerta):
    """Seto de lado a lado en la entrada de la época, con el hueco de la puerta."""
    if not puerta:
        return []
    gx, gy = puerta['x'], puerta['y']
    bolas = [x for x in range(-4, W + 8, SETO_PASO) if abs(x - gx) > PUERTA_HUECO]
    svg = ''.join(M.sombra(x + 2, gy + 1, SETO_R, 1.6) for x in bolas)
    svg += ''.join(M.C(x, gy - SETO_R, SETO_R, M.VERDE2 if i % 2 else M.VERDE) for i, x in enumerate(bolas))
    svg += ''.join(M.C(x - 1.5, gy - SETO_R - 2, SETO_R * .55, M.VERDE) for x in bolas[::2])
    return [(gy, svg)]


def x_en(era, y):
    road, paso = era['road'], era['roadStep']
    k = max(0, min(len(road) - 1, y / paso))
    i = int(k)
    j = min(len(road) - 1, i + 1)
    return road[i] + (road[j] - road[i]) * (k - i)


def comprobar(era, agua):
    """Errores de agua sin puente: el sendero dentro de un río fuera de su puente, o dentro de un lago; un desvío de rama
    que toca agua. agua: [('rio', y, alto) | ('lago', cx, y, rx, ry)]."""
    errores = []
    puentes = era.get('bridges', [])
    sendero = [(x_en(era, y), y) for y in range(0, era['h'] + 1, 2)]
    desvios = [tuple(p) for b in era.get('branches', []) for p in b.get('spur', [])]
    for a in agua:
        if a[0] == 'rio':
            _, ry, alto = a
            banda = (ry - alto / 2 - 2, ry + alto / 2 + 2)
            for x, y in sendero:
                if banda[0] <= y <= banda[1] and not any(abs(b['y'] - ry) < 1 and abs(x - b['x']) <= 3 and b['len'] / 2 >= alto / 2 + 2 for b in puentes):
                    errores.append(f'{era["id"]}: el sendero cruza el río de y={ry:.0f} sin puente (x={x:.0f}, y={y})')
                    break
            if any(banda[0] - DESVIO_AIRE <= y <= banda[1] + DESVIO_AIRE for _, y in desvios):
                errores.append(f'{era["id"]}: el desvío de una rama toca el río de y={ry:.0f}')
        else:
            _, cx, cy, rx, ry = a
            dentro = lambda x, y, m: ((x - cx) / (rx + m)) ** 2 + ((y - cy) / (ry + m)) ** 2 < 1
            if any(dentro(x, y, AIRE_AGUA) for x, y in sendero) or any(dentro(x, y, DESVIO_AIRE) for x, y in desvios):
                errores.append(f'{era["id"]}: el sendero o un desvío pisa el lago de ({cx:.0f}, {cy:.0f})')
    return errores
