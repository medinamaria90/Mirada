// Traslado del progreso desde la dirección antigua (mirada.onrender.com → sfumato-arte.onrender.com).
// El navegador guarda los datos por dirección, así que la página de redirección de la antigua manda el
// estado guardado en el fragmento «#importar=<base64url>». El fragmento nunca se envía al servidor.
// Se importa solo si trae más progreso (XP) que el que ya hay aquí; schema.migrate lo traduce después.

import { migrate } from './schema.js';

export const IMPORT_PREFIX = '#importar=';

export function encodeImport(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeImport(hash) {
  if (typeof hash !== 'string' || !hash.startsWith(IMPORT_PREFIX)) return null;
  try {
    const b64 = hash.slice(IMPORT_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const text = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

const xpOf = (raw) => {
  try {
    return Number(migrate(raw).progress?.xp) || 0;
  } catch {
    return 0;
  }
};

// Devuelve true si ha importado. `storage` puede ser null (sin almacenamiento: no hace nada).
export function importFromHash(storage, key, hash) {
  const incoming = decodeImport(hash);
  if (!incoming || !storage) return false;
  let current = null;
  try {
    const raw = storage.getItem(key);
    current = raw ? JSON.parse(raw) : null;
  } catch {
    current = null;
  }
  if (xpOf(incoming) <= xpOf(current)) return false;
  try {
    storage.setItem(key, JSON.stringify(incoming));
    return true;
  } catch {
    return false;
  }
}
