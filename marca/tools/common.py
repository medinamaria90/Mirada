# Piezas comunes: rutas (paletas, tipos), contraste, logotipos SVG e iconos.

FONTS = {
    'A': 'family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Figtree:wght@400;500;600;700',
    'B': 'family=Rubik:wght@500;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700',
    'C': 'family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600;700',
    'N': 'family=Inter:wght@400;500;600;700',
}

NEUTRAL = "'Inter', system-ui, sans-serif"


def lum(h):
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = out
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


def fmt(x):
    return ('%.1f' % x).replace('.', ',') + ':1'


R = {
    'A': dict(
        key='A', name='Museo vivo',
        concept='Una sala de museo con las ventanas abiertas: calma, oficio y un granate que da calor.',
        why='Granate y marfil son los colores de las salas clásicas: enmarcan sin competir. El acento solo aparece en lo que se toca.',
        disp="'Fraunces', 'Lora', Georgia, serif", text="'Figtree', 'Inter', system-ui, sans-serif",
        disp_name='Fraunces', text_name='Figtree',
        symbol='Punto de fuga', symbol_note='Un vano de museo y, dentro, el punto donde se juntan las líneas de la perspectiva.',
        light=[('Marfil', '#F7F3EC', 'Fondo'), ('Lienzo', '#FFFDF9', 'Superficie'), ('Tinta sepia', '#221E1A', 'Texto'),
               ('Granate laca', '#7D2735', 'Acento'), ('Verde tierra', '#2F6A4C', 'Acierto'),
               ('Siena tostada', '#A2461B', 'Fallo'), ('Pan de oro', '#B5862E', 'Premio')],
        dark=[('Sala de noche', '#15120F', 'Fondo'), ('Penumbra', '#221D19', 'Superficie'), ('Marfil', '#F2ECE2', 'Texto'),
              ('Granate claro', '#E3949E', 'Acento'), ('Verde', '#8CC9A6', 'Acierto'),
              ('Siena', '#F0A37F', 'Fallo'), ('Oro', '#E3BC68', 'Premio')],
    ),
    'B': dict(
        key='B', name='Juego de mirar',
        concept='Mirar como quien juega a las cartas: formas amables, un coral que invita a tocar y premios que apetecen.',
        why='El coral está en la piel y en los atardeceres de casi cualquier cuadro: acompaña. Los fondos son claros y neutros para que el cuadro mande.',
        disp="'Rubik', 'Poppins', system-ui, sans-serif", text="'DM Sans', 'Inter', system-ui, sans-serif",
        disp_name='Rubik', text_name='DM Sans',
        symbol='Las dos cartas', symbol_note='Dos cuadros que se comparan, como en cada pregunta. Al deslizar, la carta de delante se mueve.',
        light=[('Nube', '#FBF7F2', 'Fondo'), ('Blanco', '#FFFFFF', 'Superficie'), ('Berenjena', '#2A2140', 'Texto'),
               ('Coral', '#F2765C', 'Protagonista'), ('Menta', '#17805C', 'Acierto'),
               ('Frambuesa', '#BE3155', 'Fallo'), ('Mostaza', '#F4B63E', 'Premio')],
        dark=[('Noche violeta', '#1B1628', 'Fondo'), ('Ciruela', '#282038', 'Superficie'), ('Lavanda', '#F5F0FA', 'Texto'),
              ('Coral', '#FF8C71', 'Protagonista'), ('Menta', '#5ED2A8', 'Acierto'),
              ('Frambuesa', '#FF8FA8', 'Fallo'), ('Mostaza', '#FFC85A', 'Premio')],
    ),
    'C': dict(
        key='C', name='Editorial',
        concept='Una revista de arte en el bolsillo: letra con carácter, mucho aire y un solo azul.',
        why='Blanco de galería y negro: el cuadro es el único color de la pantalla. El azul ultramar, el pigmento más caro de la historia, solo marca lo que importa.',
        disp="'Instrument Serif', 'Cardo', 'Crimson Text', serif", text="'Inter Tight', 'Inter', system-ui, sans-serif",
        disp_name='Instrument Serif', text_name='Inter Tight',
        symbol='Encuadre', symbol_note='Dos esquinas que recortan lo que miras y un cuadrado en el centro: el foco.',
        light=[('Papel', '#FFFFFF', 'Fondo'), ('Gris galería', '#F3F2EF', 'Superficie'), ('Negro', '#121212', 'Texto'),
               ('Ultramar', '#2433D1', 'Único color'), ('Verde', '#157A47', 'Acierto'),
               ('Rojo óxido', '#C2361F', 'Fallo'), ('Ocre', '#B08A2E', 'Premio')],
        dark=[('Negro', '#0E0E0E', 'Fondo'), ('Grafito', '#1B1B1B', 'Superficie'), ('Hueso', '#F4F3EF', 'Texto'),
              ('Ultramar claro', '#8C96FF', 'Único color'), ('Verde', '#6CD39C', 'Acierto'),
              ('Rojo', '#FF8B74', 'Fallo'), ('Ocre', '#E6C25A', 'Premio')],
    ),
}


def col(k, i, dark=False):
    return R[k]['dark' if dark else 'light'][i][1]


# ---------- logotipos ----------

def logo_a(c, dot=None, size=48):
    dot = dot or c
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">'
            f'<path d="M12 41V22a12 12 0 0 1 24 0v19" stroke="{c}" stroke-width="4.5" stroke-linecap="round"/>'
            f'<path d="M7 41h34" stroke="{c}" stroke-width="4.5" stroke-linecap="round"/>'
            f'<circle cx="24" cy="29" r="4.4" fill="{dot}"/></svg>')


def logo_b(c1, c2=None, hl=None, size=48):
    c2 = c2 or c1
    h = f'<circle cx="29.5" cy="16.5" r="3.4" fill="{hl}"/>' if hl else ''
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">'
            f'<g transform="rotate(-12 18.5 25)"><rect x="8" y="11" width="21" height="28" rx="6" stroke="{c1}" stroke-width="4"/></g>'
            f'<g transform="rotate(9 29.5 23)"><rect x="19" y="9" width="21" height="28" rx="6" fill="{c2}"/>{h}</g></svg>')


def logo_c(c, dot=None, size=48):
    dot = dot or c
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">'
            f'<path d="M9 22V9h13" stroke="{c}" stroke-width="5.5"/>'
            f'<path d="M39 26v13H26" stroke="{c}" stroke-width="5.5"/>'
            f'<rect x="19.5" y="19.5" width="9" height="9" fill="{dot}"/></svg>')


def symbol(k, dark=False, size=48, mono=None):
    """Símbolo a color de la ruta k (o en una tinta si mono)."""
    if k == 'A':
        if mono:
            return logo_a(mono, size=size)
        return logo_a(col('A', 3, dark), col('A', 6, dark), size)
    if k == 'B':
        if mono:
            return logo_b(mono, size=size)
        return logo_b(col('B', 2, dark), col('B', 3, dark), col('B', 1, dark) if not dark else col('B', 0, dark), size)
    if mono:
        return logo_c(mono, size=size)
    return logo_c(col('C', 2, dark), col('C', 3, dark), size)


def wordmark(k, color, px=30):
    r = R[k]
    if k == 'A':
        return f'<span style="font-family: {r["disp"]}; font-weight: 600; font-size: {px}px; letter-spacing: -0.01em; color: {color}; line-height: 1">Mirada</span>'
    if k == 'B':
        return f'<span style="font-family: {r["disp"]}; font-weight: 800; font-size: {px}px; letter-spacing: -0.03em; color: {color}; line-height: 1">mirada</span>'
    return f'<span style="font-family: {r["disp"]}; font-size: {round(px * 1.18)}px; letter-spacing: -0.02em; color: {color}; line-height: 1">Mirada</span>'


def lockup(k, dark=False, px=30, mono=None):
    ink = mono or col(k, 2, dark)
    s = round(px * 1.35)
    gap = round(px * 0.3)
    return (f'<div style="display: flex; align-items: center; gap: {gap}px">{symbol(k, dark, s, mono)}'
            f'{wordmark(k, ink, px)}</div>')


def app_icon(k, dark=False, size=64):
    rad = round(size * 0.23)
    s = round(size * 0.66)
    if k == 'A':
        bg = col('A', 3) if dark else col('A', 0)
        inner = logo_a(col('A', 0), col('A', 6, True), s) if dark else logo_a(col('A', 3), col('A', 6), s)
    elif k == 'B':
        bg = col('B', 2) if dark else col('B', 3)
        inner = logo_b(col('B', 3), col('B', 0), col('B', 2), s) if dark else logo_b(col('B', 2), col('B', 2), col('B', 3), s)
    else:
        bg = col('C', 3) if dark else '#FFFFFF'
        inner = logo_c('#FFFFFF', '#FFFFFF', s) if dark else logo_c(col('C', 2), col('C', 3), s)
    border = 'box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);' if not dark else ''
    return (f'<div style="width: {size}px; height: {size}px; border-radius: {rad}px; background: {bg}; {border} '
            f'display: flex; align-items: center; justify-content: center; flex: none">{inner}</div>')


# ---------- iconos de trazo ----------
ICONS = {
    'home': '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    'grid': '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    'close': '<path d="M6 6l12 12M18 6L6 18"/>',
    'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    'coin': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
    'gem': '<path d="M7 4h10l4 5.5L12 20 3 9.5z"/><path d="M3 9.5h18"/>',
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'expand': '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
}


def ico(name, color, size=24, sw=2, label=None):
    a = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" {a}>{ICONS[name]}</svg>')
