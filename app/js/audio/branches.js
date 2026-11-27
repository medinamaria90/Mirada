// Piezas de las ramas del catálogo (claves de rama de app/data/catalog.json → branches): primero las
// compuestas para la app (variants/ramas-*.js) y después los clásicos que había, que siguen en el
// catálogo «fuera de lista» para escucharlos en el modo secreto. También el test de cultura
// pictórica (variants/test.js), que no es rama pero tiene su música como cualquier otro sitio.
import { BRANCH_CLASSICS } from './classics.js';
import { SCHOOL_PIECES } from './variants/ramas-escuelas.js';
import { DISCOVER_PIECES } from './variants/ramas-descubre.js';
import { SCHOOL_ALT_PIECES } from './variants/ramas-secundarias.js';
import { TEST_PIECES } from './variants/test.js';

const own = { ...DISCOVER_PIECES, ...TEST_PIECES };
for (const [list, pieces] of Object.entries(SCHOOL_PIECES)) own[list] = [...pieces, ...(SCHOOL_ALT_PIECES[list] || [])];

export const BRANCH_PIECES = Object.fromEntries([...new Set([...Object.keys(own), ...Object.keys(BRANCH_CLASSICS)])]
  .map((list) => [list, [...(own[list] || []), ...(BRANCH_CLASSICS[list] || [])]]));
