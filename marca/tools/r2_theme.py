# Ronda 2: tokens de diseño (colores, letras) en un solo sitio.

BASE = {
    'lino': '#F7F3EC',      # fondo sereno
    'blanco': '#FFFFFF',    # superficie
    'tinta': '#23201C',     # texto
    'tinta2': '#5E574F',    # texto secundario
    'linea': '#E7E0D5',     # filetes y pistas
    'hueco': '#EFE9E0',     # nodos cerrados
    'hueco_sombra': '#DDD4C7',
    'ok': '#2F6A4C', 'ok_suave': '#E4EEE7', 'ok_sombra': '#214E37',
    'fallo': '#A2461B', 'fallo_suave': '#F6E6DC',
    'oro': '#C9A24A', 'oro_sombra': '#A7832F', 'oro_texto': '#7E5F17',
    'plata': '#AEB4BC', 'plata_sombra': '#8E949C',
    'bronce': '#B9805A', 'bronce_sombra': '#966243',
    'noche': '#1E1A16', 'noche_tinta': '#F2ECE2',
}

ACCENTS = {
    'coral': dict(nombre='Coral contenido', base='#E27D66', sombra='#C4644E', suave='#FBE7E1', sobre='#23201C', texto='#A84A35',
                  nota='Cálido como la piel de los retratos; más apagado que en la ronda 1.'),
    'granate': dict(nombre='Granate laca', base='#7D2735', sombra='#5E1B27', suave='#F3E3E5', sobre='#FFFFFF', texto='#7D2735',
                    nota='El de la ruta A: terciopelo de sala de museo, el más sobrio.'),
    'azul': dict(nombre='Azul lapislázuli', base='#3B5591', sombra='#2A3F6E', suave='#E4E9F4', sobre='#FFFFFF', texto='#3B5591',
                 nota='El pigmento más caro de la historia. Sereno, descansa la vista entre cuadros.'),
}

LETRAS = {
    1: dict(nombre='Fraunces + Figtree', corto='Clásica amable',
            css='family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Figtree:wght@400;500;600',
            tit="'Fraunces', 'Lora', Georgia, serif", tit_w=500, tit_ls='-0.015em',
            nom="'Fraunces', 'Lora', Georgia, serif", nom_w=500,
            ui="'Figtree', 'Inter', system-ui, sans-serif", ui_w=600,
            nota='Serif suave y redonda en titulares; sans limpia para la interfaz.'),
    2: dict(nombre='Outfit', corto='Geométrica suave',
            css='family=Outfit:wght@300;400;500;600',
            tit="'Outfit', 'Poppins', system-ui, sans-serif", tit_w=500, tit_ls='-0.02em',
            nom="'Outfit', 'Poppins', system-ui, sans-serif", nom_w=500,
            ui="'Outfit', 'Poppins', system-ui, sans-serif", ui_w=500,
            nota='Una sola familia, redonda y ligera. La más «app» de las tres.'),
    3: dict(nombre='Instrument Serif + DM Sans', corto='Mezcla',
            css='family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600',
            tit="'DM Sans', 'Inter', system-ui, sans-serif", tit_w=600, tit_ls='-0.02em',
            nom="'Instrument Serif', 'Cardo', 'Crimson Text', serif", nom_w=400,
            ui="'DM Sans', 'Inter', system-ui, sans-serif", ui_w=500,
            nota='Interfaz en sans; serif de revista solo para pintores y cuadros.'),
}

NEUTRA = "'Inter', system-ui, sans-serif"
NEUTRA_CSS = 'family=Inter:wght@400;500;600'

RECOMENDADA = dict(logo=2, letra=1, color='coral')


def lum(h):
    h = h.lstrip('#')
    v = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        v.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def contraste(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def fmt(x):
    return ('%.1f' % x).replace('.', ',') + ':1'
