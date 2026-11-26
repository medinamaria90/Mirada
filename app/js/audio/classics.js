// Registro de clásicos de dominio público por época (arreglos propios en classics/<era>.js).
// Cada uno es una variante más ({ id, name, label, character, piece }) con `source` (obra y autor)
// y `arrangement`. Entran en la rotación de su época junto a la original y las variantes compuestas.
import { RENAISSANCE_CLASSICS } from './classics/renaissance.js';
import { BAROQUE_CLASSICS } from './classics/baroque.js';
import { ROCOCO_CLASSICS } from './classics/rococo.js';
import { ROMANTIC_CLASSICS } from './classics/romantic.js';
import { REALISM_CLASSICS } from './classics/realism.js';

export const CLASSICS = {
  renaissance: RENAISSANCE_CLASSICS, baroque: BAROQUE_CLASSICS, rococo: ROCOCO_CLASSICS,
  romantic: ROMANTIC_CLASSICS, realism: REALISM_CLASSICS,
};
