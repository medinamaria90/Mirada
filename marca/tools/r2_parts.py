# Ronda 2: logotipos (3 variantes del punto de fuga), iconos propios y piezas comunes.
from r2_theme import BASE, ACCENTS, LETRAS

ARCO_LLENO = ('M10 38V23a14 14 0 0 1 28 0v15a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4Z'
              'M28.6 30.5a4.6 4.6 0 1 0-9.2 0a4.6 4.6 0 1 0 9.2 0Z')


def logo(n, tinta, acento=None, size=48, fase=3):
    """n: 1 tal cual, 2 amable (relleno), 3 emblema animable. fase solo para el 3."""
    acento = acento or tinta
    head = f'<svg width="{size}" height="{size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">'
    if n == 1:
        body = (f'<path d="M12 41V22a12 12 0 0 1 24 0v19" stroke="{tinta}" stroke-width="4.5" stroke-linecap="round"/>'
                f'<path d="M7 41h34" stroke="{tinta}" stroke-width="4.5" stroke-linecap="round"/>'
                f'<circle cx="24" cy="29" r="4.4" fill="{acento}"/>')
    elif n == 2:
        body = f'<path d="{ARCO_LLENO}" fill="{acento}" fill-rule="evenodd"/>'
    else:
        body = f'<path d="M10 42V23a14 14 0 0 1 28 0v19" stroke="{tinta}" stroke-width="4" stroke-linecap="round"/>'
        if fase >= 2:
            body += f'<path d="M18 42V27a6 6 0 0 1 12 0v15" stroke="{tinta}" stroke-width="3" stroke-linecap="round" opacity=".55"/>'
        if fase >= 3:
            body += f'<circle cx="24" cy="33.5" r="3.6" fill="{acento}"/>'
        body += f'<path d="M6 42h36" stroke="{tinta}" stroke-width="4" stroke-linecap="round"/>'
    return head + body + '</svg>'


def wordmark(letra, color, px):
    L = LETRAS[letra]
    return (f'<span style="font-family: {L["tit"] if letra != 3 else L["nom"]}; font-weight: {500 if letra != 3 else 400}; '
            f'font-size: {px if letra != 3 else round(px * 1.15)}px; letter-spacing: -0.01em; color: {color}; line-height: 1">Mirada</span>')


def lockup(n, letra, acc, px=28, mono=None):
    t = mono or BASE['tinta']
    a = mono or ACCENTS[acc]['base']
    return (f'<div style="display: flex; align-items: center; gap: {round(px * .3)}px">{logo(n, t, a, round(px * 1.35))}'
            f'{wordmark(letra, t, px)}</div>')


def app_icon(n, acc, oscuro=False, size=64):
    A = ACCENTS[acc]
    s = round(size * .66)
    if oscuro:
        bg, inner = A['base'], logo(n, BASE['lino'], BASE['oro'] if n != 2 else BASE['lino'], s)
    else:
        bg, inner = BASE['lino'], logo(n, BASE['tinta'], A['base'], s)
    edge = '' if oscuro else 'box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);'
    return (f'<div style="width: {size}px; height: {size}px; border-radius: {round(size * .23)}px; background: {bg}; {edge} '
            f'display: flex; align-items: center; justify-content: center; flex: none">{inner}</div>')


ICONOS = {
    'vela': '<path d="M12 2.8c1.7 2 2.3 3.4 1.1 4.7-.7.7-1.5.8-2.2 0-1.1-1.3-.5-2.7 1.1-4.7z"/><rect x="8.5" y="10" width="7" height="11" rx="1.8"/>',
    'marco': '<rect x="4" y="4" width="16" height="16" rx="2.5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    'arco': '<path d="M6.5 20.5V11a5.5 5.5 0 0 1 11 0v9.5"/><path d="M4 20.5h16"/><circle cx="12" cy="14.5" r="1.6"/>',
    'perfil': '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    'cofre': '<path d="M4 11.5V9.5a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/><rect x="4" y="11.5" width="16" height="8.5" rx="2"/><path d="M11 13.5h2v3h-2z"/>',
    'candado': '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    'cerrar': '<path d="M6 6l12 12M18 6L6 18"/>',
    'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'ajustes': '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    'punto': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/>',
    'ampliar': '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
}


def ico(name, color, size=24, sw=1.8, label=None):
    a = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" {a}>{ICONOS[name]}</svg>')


def medalla(material, size=52, cerrada=False):
    """Sello redondo con el arco en relieve: oro, plata o bronce."""
    if cerrada:
        return (f'<div style="width: {size}px; height: {size}px; border-radius: 99px; background: {BASE["hueco"]}; '
                f'box-shadow: inset 0 0 0 2px {BASE["linea"]}; display: flex; align-items: center; justify-content: center">'
                f'{ico("candado", "#9A9086", 18)}</div>')
    c, s = BASE[material], BASE[material + '_sombra']
    return (f'<div style="width: {size}px; height: {size}px; border-radius: 99px; background: {c}; '
            f'box-shadow: inset 0 -4px 0 {s}, inset 0 0 0 3px rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center">'
            f'{ico("arco", "#FFFFFF", round(size * .5), 2)}</div>')
