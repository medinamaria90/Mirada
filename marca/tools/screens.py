# Pantallas de móvil (390 x 844) maquetadas con cada ruta.
from common import R, col, symbol, wordmark, lockup, ico, logo_b

W = 'width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden'


def nav(items, active, ink, acc, bg, font, style='A'):
    cells = []
    for i, (icon, label) in enumerate(items):
        on = i == active
        c = acc if on else ink
        if style == 'B':
            pill = f'background: {acc}22;' if on else ''
            cells.append(f'<a href="#" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 14px; border-radius: 16px; {pill} color: {c}; font-size: 12px; font-weight: 700">{ico(icon, c, 24, 2.2)}{label}</a>')
        elif style == 'C':
            u = f'box-shadow: inset 0 -2px 0 {acc};' if on else ''
            cells.append(f'<a href="#" style="text-decoration: none; padding: 10px 2px; {u} color: {c}; font-size: 14px; font-weight: {600 if on else 500}">{label}</a>')
        else:
            cells.append(f'<a href="#" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; gap: 3px; color: {c}; font-size: 12px; font-weight: {700 if on else 500}">{ico(icon, c, 24, 1.8)}{label}</a>')
    jc = 'space-around' if style != 'C' else 'space-between'
    pad = '10px 12px 22px' if style != 'C' else '6px 28px 22px'
    return (f'<nav style="position: absolute; left: 0; right: 0; bottom: 0; background: {bg}; display: flex; justify-content: {jc}; '
            f'align-items: center; padding: {pad}; box-shadow: 0 -1px 0 rgba(0,0,0,.07); font-family: {font}">{"".join(cells)}</nav>')


NAV = [('home', 'Camino'), ('grid', 'Colección'), ('user', 'Perfil')]

# ======================= RUTA A =======================

def a_inicio():
    r = R['A']
    bg, sf, ink, acc, ok, bad, gold = [col('A', i) for i in range(7)]
    D = r['disp']

    def node(img, name, years, state):
        arch = 'border-radius: 999px 999px 6px 6px'
        if state == 'lock':
            thumb = f'<div style="width: 52px; height: 64px; {arch}; box-shadow: inset 0 0 0 1.5px #D8CFC1; display: flex; align-items: center; justify-content: center; background: {bg}">{ico("lock", "#8A8178", 18, 1.8)}</div>'
        else:
            ring = f'box-shadow: 0 0 0 3px {bg}, 0 0 0 5px {acc};' if state == 'now' else ''
            thumb = f'<div style="position: relative; width: 52px; height: 64px; flex: none"><img src="img/{img}.jpg" alt="" style="width: 52px; height: 64px; object-fit: cover; {arch}; {ring} display: block">'
            if state == 'done':
                thumb += f'<span style="position: absolute; right: -6px; bottom: -4px; width: 22px; height: 22px; border-radius: 99px; background: {gold}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px {bg}">{ico("check", ink, 13, 3)}</span>'
            thumb += '</div>'
        nc = ink if state != 'lock' else '#6E665D'
        tail = ''
        if state == 'now':
            tail = f'<span style="font-size: 14px; font-weight: 700; color: {acc}">Siguiente</span>'
        return (f'<div style="display: flex; align-items: center; gap: 16px; padding: 7px 0">{thumb}'
                f'<div style="display: flex; flex-direction: column; gap: 1px; flex: 1"><span style="font-family: {D}; font-weight: 600; font-size: 20px; color: {nc}">{name}</span>'
                f'<span style="font-size: 13px; color: {nc}">{years}</span></div>{tail}</div>')

    path = ''.join([
        node('b11', 'Caravaggio', '1571–1610', 'done'),
        node('a175', 'Velázquez', '1599–1660', 'now'),
        node(None, 'Rembrandt', '1606–1669', 'lock'),
        node(None, 'Vermeer', '1632–1675', 'lock'),
        node(None, 'Murillo', '1617–1682', 'lock'),
    ])
    return f'''
<div style="{W}; background: {bg}; font-family: {r['text']}; color: {ink}">
<header style="display: flex; align-items: center; justify-content: space-between; padding: 22px 20px 10px">
{lockup('A', False, 24)}
<div style="display: flex; gap: 14px; font-size: 15px; font-weight: 700">
<span style="display: flex; align-items: center; gap: 4px">{ico('sun', acc, 20, 2)}12</span>
<span style="display: flex; align-items: center; gap: 4px">{ico('coin', gold, 20, 2)}340</span>
</div>
</header>
<section style="margin: 12px 20px 0; background: {acc}; border-radius: 22px; padding: 18px; display: flex; gap: 16px; align-items: center">
<img src="img/a62.jpg" alt="Las meninas" style="width: 92px; height: 112px; object-fit: cover; object-position: 30% 30%; border-radius: 999px 999px 8px 8px; flex: none">
<div style="display: flex; flex-direction: column; gap: 8px; color: #FFF7F2">
<span style="font-size: 13px; font-weight: 600; opacity: .9">Hoy</span>
<span style="font-family: {D}; font-weight: 600; font-size: 25px; line-height: 1.05">Conoce a Velázquez</span>
<button type="button" style="align-self: flex-start; height: 40px; padding: 0 18px; border: 0; border-radius: 12px; background: {bg}; color: {acc}; font-weight: 700; font-size: 15px; font-family: {r['text']}">Empezar</button>
</div>
</section>
<section style="padding: 26px 20px 0">
<div style="display: flex; align-items: baseline; justify-content: space-between">
<h2 style="margin: 0; font-family: {D}; font-weight: 600; font-size: 28px; letter-spacing: -0.01em">Barroco</h2>
<span style="font-size: 14px; font-weight: 600">1 de 6</span>
</div>
<p style="margin: 4px 0 0; font-size: 14px; color: {ink}; opacity: .85">Siglo XVII. Luz y sombra, teatro y verdad.</p>
<div style="height: 4px; border-radius: 4px; background: #E6DED2; margin: 12px 0 10px"><div style="width: 17%; height: 4px; border-radius: 4px; background: {acc}"></div></div>
<div style="display: flex; flex-direction: column">{path}</div>
</section>
{nav(NAV, 0, '#5E564D', acc, sf, r['text'])}
</div>'''


def a_pregunta():
    r = R['A']
    bg, sf, ink, acc, ok, bad, gold = [col('A', i) for i in range(7)]
    D = r['disp']

    def opt(t, state=None):
        if state == 'ok':
            st = f'background: #E4EEE7; box-shadow: inset 0 0 0 2px {ok}; color: {ok}'
            mark = ico('check', ok, 20, 2.6)
        else:
            st = f'background: {sf}; box-shadow: inset 0 0 0 1px #E2D9CC; color: {ink}; opacity: .55'
            mark = ''
        return (f'<button type="button" style="height: 52px; border: 0; border-radius: 14px; {st}; display: flex; align-items: center; justify-content: space-between; '
                f'padding: 0 16px; font-family: {r["text"]}; font-size: 16px; font-weight: 600">{t}{mark}</button>')
    return f'''
<div style="{W}; background: {bg}; font-family: {r['text']}; color: {ink}">
<header style="display: flex; align-items: center; gap: 16px; padding: 20px 20px 8px">
<button type="button" aria-label="Cerrar" style="border: 0; background: none; padding: 0; width: 28px; height: 28px">{ico('close', ink, 24, 2)}</button>
<div style="flex: 1; height: 6px; border-radius: 6px; background: #E6DED2"><div style="width: 42%; height: 6px; border-radius: 6px; background: {acc}"></div></div>
</header>
<div style="padding: 14px 20px 0; display: flex; flex-direction: column; gap: 14px">
<span style="font-size: 13px; font-weight: 600; color: {acc}">Cuadro nuevo</span>
<h1 style="margin: -6px 0 0; font-family: {D}; font-weight: 600; font-size: 32px; letter-spacing: -0.02em; line-height: 1.05">¿Quién lo pintó?</h1>
<div style="background: #FFFFFF; padding: 9px; border-radius: 4px; box-shadow: 0 1px 2px rgba(40,25,10,.12), 0 12px 28px -14px rgba(40,25,10,.45)">
<img src="img/a200.jpg" alt="El nacimiento de Venus" style="display: block; width: 100%; height: 250px; object-fit: cover">
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 4px">
{opt('Botticelli', 'ok')}{opt('Rafael')}{opt('Tiziano')}{opt('Leonardo')}
</div>
</div>
<section style="position: absolute; left: 0; right: 0; bottom: 0; background: #E4EEE7; border-radius: 24px 24px 0 0; padding: 22px 20px 26px; display: flex; flex-direction: column; gap: 10px">
<div style="display: flex; align-items: center; gap: 10px">
<span style="width: 32px; height: 32px; border-radius: 99px; background: {ok}; display: flex; align-items: center; justify-content: center">{ico('check', '#FFFFFF', 18, 3)}</span>
<span style="font-family: {D}; font-weight: 600; font-size: 26px; color: {ok}">Exacto.</span>
<span style="margin-left: auto; font-size: 15px; font-weight: 700; color: {ok}">+10</span>
</div>
<p style="margin: 0; font-size: 16px; line-height: 1.45; color: {ink}">Botticelli. Mira el contorno: sus figuras flotan, casi sin peso.</p>
<button type="button" style="margin-top: 6px; height: 54px; border: 0; border-radius: 14px; background: {acc}; color: #FFFFFF; font-family: {r['text']}; font-size: 17px; font-weight: 700">Continuar</button>
</section>
</div>'''


def a_ficha():
    r = R['A']
    dbg, dsf, dink, dacc = [col('A', i, True) for i in range(4)]
    D = r['disp']
    seg = ''.join(f'<div style="flex: 1; height: 3px; border-radius: 3px; background: {"#F2ECE2" if i == 0 else "rgba(242,236,226,.3)"}"></div>' for i in range(3))
    return f'''
<div style="{W}; background: {dbg}; font-family: {r['text']}; color: {dink}">
<div style="display: flex; gap: 5px; padding: 16px 16px 0">{seg}</div>
<header style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px">
<div style="display: flex; align-items: center; gap: 10px">{symbol('A', True, 28)}<span style="font-size: 14px; font-weight: 600">Ficha · Barroco</span></div>
<button type="button" aria-label="Cerrar" style="border: 0; background: none; padding: 0">{ico('close', dink, 24, 2)}</button>
</header>
<div style="padding: 4px 16px 0">
<img src="img/a62.jpg" alt="Las meninas, de Velázquez" style="display: block; width: 100%; height: 420px; object-fit: cover; object-position: 30% 35%; border-radius: 180px 180px 10px 10px">
</div>
<div style="padding: 22px 22px 0; display: flex; flex-direction: column; gap: 10px">
<span style="font-size: 14px; color: {dink}; opacity: .85">Diego Velázquez · <em>Las meninas</em>, 1656</span>
<h1 style="margin: 0; font-family: {D}; font-weight: 600; font-size: 31px; line-height: 1.08; letter-spacing: -0.015em">Se pintó a sí mismo dentro del cuadro.</h1>
<p style="margin: 0; font-size: 16px; line-height: 1.5">Búscalo a la izquierda, pincel en mano, mirando hacia fuera.</p>
</div>
<div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; gap: 10px">
<button type="button" style="flex: 1; height: 52px; border: 0; border-radius: 14px; background: {dink}; color: {col('A', 3)}; font-family: {r['text']}; font-size: 16px; font-weight: 700">Siguiente</button>
</div>
</div>'''


# ======================= RUTA B =======================

def b_chip(icon, n, c, ink):
    return (f'<span style="display: flex; align-items: center; gap: 5px; height: 36px; padding: 0 12px; border-radius: 99px; background: #FFFFFF; '
            f'box-shadow: 0 1px 0 #EAE2D8, inset 0 0 0 1.5px #EFE8DF; font-size: 15px; font-weight: 800; color: {ink}">{ico(icon, c, 19, 2.4)}{n}</span>')


def b_inicio():
    r = R['B']
    bg, sf, ink, acc, ok, bad, gold = [col('B', i) for i in range(7)]
    D = r['disp']

    def node(x, img=None, state='lock'):
        size = 76 if state == 'now' else 64
        if state == 'lock':
            inner = f'<div style="width: {size}px; height: {size}px; border-radius: 99px; background: #EEE7DE; box-shadow: 0 5px 0 #DDD3C6; display: flex; align-items: center; justify-content: center">{ico("lock", "#9C9184", 22, 2.2)}</div>'
        elif state == 'chest':
            inner = (f'<div style="width: {size}px; height: {size}px; border-radius: 22px; background: {gold}; box-shadow: 0 5px 0 #CF9520; display: flex; align-items: center; justify-content: center; transform: rotate(-6deg)">'
                     f'{logo_b(ink, "#FFFFFF", gold, 38)}</div>')
        else:
            ring = f'box-shadow: 0 0 0 5px {bg}, 0 0 0 9px {acc}, 0 10px 0 4px #E9DED3' if state == 'now' else f'box-shadow: 0 5px 0 #DDD3C6'
            inner = f'<div style="position: relative"><img src="img/{img}.jpg" alt="" style="display: block; width: {size}px; height: {size}px; border-radius: 99px; object-fit: cover; {ring}">'
            if state == 'done':
                inner += f'<span style="position: absolute; right: -4px; bottom: -2px; width: 24px; height: 24px; border-radius: 99px; background: {ok}; box-shadow: 0 0 0 3px {bg}; display: flex; align-items: center; justify-content: center">{ico("check", "#FFFFFF", 14, 3.2)}</span>'
            inner += '</div>'
        bubble = ''
        if state == 'now':
            bubble = (f'<div style="position: absolute; left: calc(100% + 18px); top: 50%; transform: translateY(-50%); white-space: nowrap; background: #FFFFFF; color: {ink}; '
                      f'font-weight: 800; font-size: 15px; padding: 8px 14px; border-radius: 14px; box-shadow: 0 3px 0 #E6DDD2, inset 0 0 0 2px #EDE5DB; font-family: {D}">Empezar</div>')
        return f'<div style="position: relative; display: flex; justify-content: center; margin-left: {x}px; width: {size}px">{bubble}{inner}</div>'

    path = (node(163, 'b11', 'done') + node(95, 'a175', 'done') + node(150, 'a115', 'now') + node(230, None, 'chest') + node(163) )
    return f'''
<div style="{W}; background: {bg}; font-family: {r['text']}; color: {ink}">
<header style="display: flex; align-items: center; justify-content: space-between; padding: 20px 18px 6px">
{lockup('B', False, 22)}
<div style="display: flex; gap: 8px">{b_chip('sun', '12', acc, ink)}{b_chip('gem', '340', '#D99A1E', ink)}</div>
</header>
<section style="margin: 12px 18px 0; background: {acc}; border-radius: 24px; padding: 18px 18px 18px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 5px 0 #D85F47">
<div style="flex: 1; display: flex; flex-direction: column; gap: 4px; color: {ink}">
<span style="font-size: 14px; font-weight: 700">Barroco · Etapa 3</span>
<span style="font-family: {D}; font-weight: 800; font-size: 24px; letter-spacing: -0.03em; line-height: 1.05">Conoce a Vermeer</span>
</div>
<img src="img/a109.jpg" alt="La joven de la perla" style="width: 64px; height: 76px; border-radius: 16px; object-fit: cover; transform: rotate(6deg); box-shadow: 0 0 0 3px #FFFFFF">
</section>
<div style="display: flex; align-items: center; gap: 12px; padding: 30px 18px 0"><span style="flex: 1; height: 2px; background: #EDE5DB"></span><span style="font-family: {D}; font-weight: 700; font-size: 15px; color: #6D6478">Barroco</span><span style="flex: 1; height: 2px; background: #EDE5DB"></span></div>
<div style="display: flex; flex-direction: column; gap: 26px; padding-top: 26px">{path}</div>
{nav(NAV, 0, '#6D6478', acc, '#FFFFFF', r['text'], 'B')}
</div>'''


def b_pregunta():
    r = R['B']
    bg, sf, ink, acc, ok, bad, gold = [col('B', i) for i in range(7)]
    D = r['disp']

    def opt(t, state=None):
        if state == 'ok':
            st = f'background: #DDF3EA; color: {ok}; box-shadow: 0 4px 0 {ok}, inset 0 0 0 2px {ok}'
        else:
            st = f'background: #FFFFFF; color: {ink}; box-shadow: 0 4px 0 #E4DDD3, inset 0 0 0 2px #E9E2D9; opacity: .6'
        return f'<button type="button" style="height: 56px; border: 0; border-radius: 18px; {st}; font-family: {D}; font-size: 17px; font-weight: 700">{t}</button>'
    return f'''
<div style="{W}; background: {bg}; font-family: {r['text']}; color: {ink}">
<header style="display: flex; align-items: center; gap: 14px; padding: 20px 18px 8px">
<button type="button" aria-label="Cerrar" style="border: 0; background: none; padding: 0; width: 28px; height: 28px">{ico('close', '#8D8597', 26, 2.6)}</button>
<div style="flex: 1; height: 14px; border-radius: 14px; background: #EEE7DE"><div style="width: 60%; height: 14px; border-radius: 14px; background: {acc}; box-shadow: inset 0 -4px 0 #E2614A"></div></div>
<span style="display: flex; align-items: center; gap: 4px; font-weight: 800; color: {acc}; font-size: 15px">{ico('sun', acc, 20, 2.4)}3</span>
</header>
<div style="padding: 16px 18px 0; display: flex; flex-direction: column; gap: 16px">
<h1 style="margin: 0; font-family: {D}; font-weight: 800; font-size: 27px; letter-spacing: -0.03em; line-height: 1.1">¿Quién pintó esta?</h1>
<div style="position: relative">
<img src="img/a115.jpg" alt="La lechera" style="display: block; width: 100%; height: 300px; object-fit: cover; object-position: 50% 30%; border-radius: 24px">
<span style="position: absolute; right: 12px; bottom: 12px; width: 38px; height: 38px; border-radius: 12px; background: rgba(42,33,64,.7); display: flex; align-items: center; justify-content: center">{ico('expand', '#FFFFFF', 20, 2.2)}</span>
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
{opt('Vermeer', 'ok')}{opt('Rembrandt')}{opt('Velázquez')}{opt('Murillo')}
</div>
</div>
<section style="position: absolute; left: 0; right: 0; bottom: 0; background: #DDF3EA; padding: 20px 18px 26px; display: flex; flex-direction: column; gap: 8px; border-radius: 26px 26px 0 0">
<div style="display: flex; align-items: center; gap: 10px">
<span style="width: 34px; height: 34px; border-radius: 99px; background: {ok}; display: flex; align-items: center; justify-content: center">{ico('check', '#FFFFFF', 19, 3.2)}</span>
<span style="font-family: {D}; font-weight: 800; font-size: 24px; letter-spacing: -0.02em; color: {ok}">¡Ojo fino!</span>
<span style="margin-left: auto; font-family: {D}; font-weight: 800; font-size: 16px; color: {ok}">+10</span>
</div>
<p style="margin: 0; font-size: 16px; line-height: 1.4; color: {ink}">Vermeer y su luz de ventana, casi siempre desde la izquierda.</p>
<button type="button" style="margin-top: 8px; height: 54px; border: 0; border-radius: 18px; background: {ok}; color: #FFFFFF; font-family: {D}; font-size: 18px; font-weight: 800; box-shadow: 0 4px 0 #0F5E43">Seguir</button>
</section>
</div>'''


def b_premio():
    r = R['B']
    dbg, dsf, dink, dacc, dok, dbad, dgold = [col('B', i, True) for i in range(7)]
    ink = col('B', 2)
    D = r['disp']
    cards = (
        f'<img src="img/a204.jpg" alt="" style="position: absolute; left: 34px; top: 34px; width: 150px; height: 196px; object-fit: cover; border-radius: 20px; transform: rotate(-14deg); box-shadow: 0 0 0 4px #FFFFFF, 0 18px 30px rgba(0,0,0,.35)">'
        f'<img src="img/a200.jpg" alt="" style="position: absolute; right: 30px; top: 30px; width: 150px; height: 196px; object-fit: cover; border-radius: 20px; transform: rotate(12deg); box-shadow: 0 0 0 4px #FFFFFF, 0 18px 30px rgba(0,0,0,.35)">'
        f'<img src="img/a109.jpg" alt="" style="position: absolute; left: 87px; top: 8px; width: 162px; height: 212px; object-fit: cover; border-radius: 22px; transform: rotate(-2deg); box-shadow: 0 0 0 4px #FFFFFF, 0 22px 36px rgba(0,0,0,.4)">'
    )
    dots = ''.join(f'<span style="position: absolute; left: {x}px; top: {y}px; width: {s}px; height: {s}px; border-radius: {s}px; background: {c}"></span>'
                   for x, y, s, c in [(30, 120, 10, dgold), (330, 150, 8, dacc), (60, 330, 7, dok), (318, 300, 11, dgold), (180, 96, 6, dacc), (350, 90, 6, dok)])
    return f'''
<div style="{W}; background: {dbg}; font-family: {r['text']}; color: {dink}">
{dots}
<div style="padding: 120px 0 0; display: flex; flex-direction: column; align-items: center">
<div style="position: relative; width: 340px; height: 260px">{cards}</div>
<span style="margin-top: 34px; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border-radius: 99px; background: {dgold}; color: {ink}; font-weight: 800; font-size: 14px">{ico('gem', ink, 16, 2.4)}+50</span>
<h1 style="margin: 16px 0 0; font-family: {D}; font-weight: 800; font-size: 38px; letter-spacing: -0.035em; line-height: 1.02; text-align: center">Barroco,<br>completado</h1>
<p style="margin: 10px 0 0; font-size: 17px; text-align: center; color: {dink}">Tres cuadros nuevos en tu colección.</p>
</div>
<div style="position: absolute; left: 20px; right: 20px; bottom: 26px; display: flex; flex-direction: column; gap: 10px">
<button type="button" style="height: 56px; border: 0; border-radius: 18px; background: {dacc}; color: {ink}; font-family: {D}; font-size: 18px; font-weight: 800; box-shadow: 0 4px 0 #D4664E">Ver mi colección</button>
<button type="button" style="height: 48px; border: 0; background: none; color: {dink}; font-family: {D}; font-size: 16px; font-weight: 700">Seguir jugando</button>
</div>
</div>'''


# ======================= RUTA C =======================

def c_inicio():
    r = R['C']
    bg, sf, ink, acc, ok, bad, gold = [col('C', i) for i in range(7)]
    D = r['disp']

    def row(name, years, state):
        if state == 'done':
            right = ico('check', ink, 18, 2.2)
            c = ink
            w = 500
        elif state == 'now':
            right = f'<span style="font-size: 13px; font-weight: 600; color: {acc}">Ahora</span>'
            c = acc
            w = 600
        else:
            right = ico('lock', '#77746E', 16, 1.8)
            c = '#6B6862'
            w = 500
        return (f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 14px; align-items: baseline; padding: 11px 0; border-top: 1px solid #E4E2DD">'
                f'<span style="font-family: {D}; font-size: 25px; line-height: 1; color: {c}">{name}</span>'
                f'<span style="font-size: 13px; color: {c}; font-weight: {w}; font-variant-numeric: tabular-nums">{years}</span>{right}</div>')
    rows = row('Caravaggio', '1571–1610', 'done') + row('Velázquez', '1599–1660', 'now') + row('Rembrandt', '1606–1669', 'lock') + row('Vermeer', '1632–1675', 'lock') + row('Murillo', '1617–1682', 'lock')
    return f'''
<div style="{W}; background: {bg}; font-family: {r['text']}; color: {ink}">
<header style="display: flex; align-items: center; justify-content: space-between; padding: 22px 20px 0">
{lockup('C', False, 24)}
<span style="font-size: 14px; font-weight: 600">Racha <span style="color: {acc}">12</span></span>
</header>
<div style="padding: 22px 20px 14px">
<span style="font-size: 13px; font-weight: 500">Siglo XVII · 1 de 6</span>
<h1 style="margin: 2px 0 0; font-family: {D}; font-size: 92px; line-height: .9; letter-spacing: -0.03em">Barroco</h1>
</div>
<figure style="margin: 0; position: relative">
<img src="img/a62.jpg" alt="Las meninas" style="display: block; width: 100%; height: 236px; object-fit: cover; object-position: 50% 32%">
<figcaption style="padding: 8px 20px 0; font-size: 13px; color: #55524C"><em>Las meninas</em>, Velázquez, 1656</figcaption>
</figure>
<div style="padding: 14px 20px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px">
<span style="font-family: {D}; font-size: 26px; line-height: 1.05">Conoce a Velázquez</span>
<button type="button" aria-label="Empezar" style="flex: none; width: 52px; height: 52px; border: 0; border-radius: 99px; background: {acc}; display: flex; align-items: center; justify-content: center">{ico('arrow', '#FFFFFF', 22, 2.2)}</button>
</div>
<div style="padding: 14px 20px 0">{rows}</div>
{nav(NAV, 0, '#3A3835', acc, bg, r['text'], 'C')}
</div>'''


def c_pregunta():
    r = R['C']
    bg, sf, ink, acc, ok, bad, gold = [col('C', i) for i in range(7)]
    D = r['disp']

    def opt(t, state=None):
        if state == 'bad':
            return (f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 13px 0; border-top: 1px solid #E4E2DD; color: {bad}">'
                    f'<span style="font-size: 17px; font-weight: 500; text-decoration: line-through">{t}</span>{ico("close", bad, 18, 2.4)}</div>')
        if state == 'ok':
            return (f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 13px 0; border-top: 1px solid #E4E2DD; color: {ink}">'
                    f'<span style="font-size: 17px; font-weight: 700">{t}</span>{ico("check", ok, 20, 2.6)}</div>')
        return (f'<div style="display: flex; align-items: center; padding: 13px 0; border-top: 1px solid #E4E2DD; color: #75726C">'
                f'<span style="font-size: 17px; font-weight: 500">{t}</span></div>')
    return f'''
<div style="{W}; background: {bg}; font-family: {r['text']}; color: {ink}">
<div style="height: 3px; background: #ECEBE7"><div style="width: 55%; height: 3px; background: {acc}"></div></div>
<header style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px">
<button type="button" aria-label="Cerrar" style="border: 0; background: none; padding: 0">{ico('close', ink, 24, 1.8)}</button>
<span style="font-size: 13px; font-weight: 500">6 de 10</span>
</header>
<img src="img/a204.jpg" alt="Impresión, sol naciente" style="display: block; width: 100%; height: 280px; object-fit: cover">
<div style="padding: 18px 20px 0">
<h1 style="margin: 0 0 12px; font-family: {D}; font-size: 44px; line-height: .95; letter-spacing: -0.02em">¿Quién lo pintó?</h1>
{opt('J. M. W. Turner', 'bad')}{opt('Claude Monet', 'ok')}{opt('Édouard Manet')}{opt('Gustave Courbet')}
</div>
<section style="position: absolute; left: 0; right: 0; bottom: 0; background: {ink}; color: #FFFFFF; padding: 22px 20px 26px; display: flex; flex-direction: column; gap: 8px">
<span style="font-family: {D}; font-size: 30px; line-height: 1">No. Es Monet.</span>
<p style="margin: 0; font-size: 15px; line-height: 1.45; color: #E8E7E3">La niebla lo delata. Este cuadro dio nombre al impresionismo, en 1872.</p>
<button type="button" style="margin-top: 8px; height: 52px; border: 0; border-radius: 999px; background: #FFFFFF; color: {ink}; font-family: {r['text']}; font-size: 16px; font-weight: 600">Seguir</button>
</section>
</div>'''


def c_ficha():
    r = R['C']
    bg, sf, ink, acc = [col('C', i) for i in range(4)]
    D = r['disp']
    seg = ''.join(f'<div style="flex: 1; height: 2px; background: {"#FFFFFF" if i < 2 else "rgba(255,255,255,.45)"}"></div>' for i in range(4))
    return f'''
<div style="{W}; background: {bg}; font-family: {r['text']}; color: {ink}">
<div style="position: relative">
<img src="img/a109.jpg" alt="La joven de la perla, de Vermeer" style="display: block; width: 100%; height: 470px; object-fit: cover; object-position: 50% 30%">
<div style="position: absolute; left: 0; right: 0; top: 0; padding: 14px 16px 30px; background: linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,0))">
<div style="display: flex; gap: 4px">{seg}</div>
<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; color: #FFFFFF">
<span style="font-size: 13px; font-weight: 600">Vermeer · 3 de 4</span>
<button type="button" aria-label="Cerrar" style="border: 0; background: none; padding: 0">{ico('close', '#FFFFFF', 22, 2)}</button>
</div>
</div>
</div>
<div style="padding: 22px 20px 0; display: flex; flex-direction: column; gap: 12px">
<span style="font-size: 13px; font-weight: 500"><em>La joven de la perla</em>, c. 1665</span>
<h1 style="margin: 0; font-family: {D}; font-size: 42px; line-height: .98; letter-spacing: -0.02em">La perla no tiene contorno. Son dos toques de luz.</h1>
<p style="margin: 0; font-size: 15px; line-height: 1.5; color: #3A3835">Un brillo arriba y el reflejo del cuello abajo. El ojo hace el resto.</p>
</div>
<button type="button" aria-label="Siguiente" style="position: absolute; right: 20px; bottom: 26px; width: 56px; height: 56px; border: 0; border-radius: 99px; background: {acc}; display: flex; align-items: center; justify-content: center">{ico('arrow', '#FFFFFF', 24, 2.2)}</button>
</div>'''


SCREENS = {
    'A': [('inicio', 'Inicio', a_inicio), ('pregunta', 'Pregunta', a_pregunta), ('ficha', 'Ficha', a_ficha)],
    'B': [('inicio', 'Inicio', b_inicio), ('pregunta', 'Pregunta', b_pregunta), ('premio', 'Recompensa', b_premio)],
    'C': [('inicio', 'Inicio', c_inicio), ('pregunta', 'Pregunta', c_pregunta), ('ficha', 'Ficha', c_ficha)],
}
