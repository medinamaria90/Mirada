// Mudanza de dirección (sfumato-arte.onrender.com → sfumato.dibulios.com). Las dos sirven la misma app, pero el
// navegador guarda los datos por dirección: en la nueva se empezaría de cero. La antigua (ui/move-redirect.js) se pasa
// sola a la nueva, en la misma ruta, y si hay algo guardado lo lleva en el fragmento «#mudanza=<formato>.<base64url>»
// (el fragmento nunca llega al servidor) junto con el fragmento original, para no perder a qué pantalla iba.
// Formato «z»: JSON comprimido (deflate-raw); «j»: JSON tal cual, si el navegador no comprime.
// La nueva valida, migra (schema.migrate), se queda con el progreso más avanzado y vuelve al fragmento original.
// Puro salvo `storage` inyectado.

import { migrate } from './schema.js';

export const OLD_HOST = 'sfumato-arte.onrender.com';
export const NEW_HOST = 'sfumato.dibulios.com';
export const NEW_ORIGIN = `https://${NEW_HOST}`;
// Lo que se pide a la nueva para saber si ya responde antes de ofrecer la mudanza.
export const NEW_PROBE_URL = `${NEW_ORIGIN}/manifest.webmanifest`;
export const MOVE_PREFIX = '#mudanza=';
export const PAYLOAD_VERSION = 1;

// Chrome (también en Android) admite direcciones de hasta 2 MB; se deja margen para el origen.
export const MAX_URL_CHARS = 2 * 1024 * 1024;
const URL_MARGIN = 256;
// Tope de lo que se acepta al recibir (texto ya descomprimido) y de cada clave suelta.
export const MAX_JSON_CHARS = 4 * 1024 * 1024;
export const MAX_KEY_CHARS = 64 * 1024;
// Fragmento original (la pantalla a la que iba): tope de largo.
export const MAX_ROUTE_CHARS = 2048;
const OTHER_TRANSFER = '#importar=';

const COMPRESSED = 'z';
const PLAIN = 'j';
const COMPRESSION = 'deflate-raw';

// Claves sueltas de localStorage que viajan con el estado: ajustes y marcas propias (sfumato.*) y el test de cultura.
const KEY_PREFIX = 'sfumato.';
const EXTRA_KEYS = new Set(['mirada.test.last', 'mirada.test.recent']);
// sfumato.recarga es de la sesión (recuperación tras un fallo de carga): no se lleva.
const SKIP_KEYS = new Set(['sfumato.recarga']);

export function isMovableKey(key) {
  if (typeof key !== 'string' || SKIP_KEYS.has(key)) return false;
  return EXTRA_KEYS.has(key) || (key.startsWith(KEY_PREFIX) && key.length > KEY_PREFIX.length);
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ¿Hay algo que llevarse? XP o algún pintor empezado.
export function hasProgress(state) {
  const p = state?.progress;
  return (Number(p?.xp) || 0) > 0 || (isPlain(p?.artists) && Object.keys(p.artists).length > 0);
}

// Cuánto ha avanzado: XP y, a igualdad, pintores empezados.
function advance(state) {
  const p = state?.progress || {};
  return [Number(p.xp) || 0, isPlain(p.artists) ? Object.keys(p.artists).length : 0];
}

export function isAhead(a, b) {
  const [xa, na] = advance(a);
  const [xb, nb] = advance(b);
  return xa > xb || (xa === xb && na > nb);
}

// ---------- Lo que se lleva ----------

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storageKeys(storage) {
  const keys = [];
  try {
    for (let i = 0; i < storage.length; i += 1) keys.push(storage.key(i));
  } catch {
    return [];
  }
  return keys;
}

// Fragmento original que viaja con el paquete: uno normal de la app, nunca otro traslado.
export function cleanRoute(hash) {
  if (typeof hash !== 'string' || !hash.startsWith('#') || hash.length > MAX_ROUTE_CHARS) return '';
  return hash.startsWith(MOVE_PREFIX) || hash.startsWith(OTHER_TRANSFER) ? '' : hash;
}

// Paquete con el estado guardado, las claves sueltas que importan y el fragmento original.
export function collectPayload(storage, stateKey, hash = '') {
  const k = {};
  for (const key of storageKeys(storage)) {
    if (!isMovableKey(key)) continue;
    try {
      const v = storage.getItem(key);
      if (typeof v === 'string' && v.length <= MAX_KEY_CHARS) k[key] = v;
    } catch {
      // clave ilegible: se queda atrás
    }
  }
  const s = readJson(storage, stateKey);
  return { v: PAYLOAD_VERSION, s: isPlain(s) ? s : null, k, h: cleanRoute(hash) };
}

// ¿Hay algo guardado que llevarse? Progreso o alguna clave suelta (ajustes, test de cultura…).
export const hasCargo = (payload) => hasProgress(migrate(payload.s)) || Object.keys(payload.k).length > 0;

// ---------- Codificación ----------

function toBase64Url(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('base64url no válido');
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

// Fragmento «#mudanza=…» o null si no cabe en una dirección.
export async function encodeMove(payload, { compress = canCompress() } = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const body = compress
    ? `${COMPRESSED}.${toBase64Url(await pipe(bytes, new CompressionStream(COMPRESSION)))}`
    : `${PLAIN}.${toBase64Url(bytes)}`;
  const hash = MOVE_PREFIX + body;
  return NEW_ORIGIN.length + 1 + hash.length <= MAX_URL_CHARS - URL_MARGIN ? hash : null;
}

// La misma página en la casa nueva: ruta, query y fragmento.
export function newHomeUrl({ pathname = '/', search = '', hash = '' } = {}) {
  return `${NEW_ORIGIN}${pathname}${search}${cleanRoute(hash)}`;
}

// Adónde ir: { url, carried }. Con algo guardado, el fragmento lleva el paquete (con el fragmento original dentro);
// sin nada, o si no cabe en una dirección, la misma página tal cual (carried: false).
export async function moveTarget(storage, stateKey, loc, options) {
  const plain = { url: newHomeUrl(loc), carried: false };
  const payload = collectPayload(storage, stateKey, loc?.hash);
  if (!hasCargo(payload)) return plain;
  const hash = await encodeMove(payload, options).catch(() => null);
  return hash ? { url: `${NEW_ORIGIN}${loc?.pathname || '/'}${loc?.search || ''}${hash}`, carried: true } : plain;
}

// Paquete validado { state (ya migrado), keys, route } o null si no vale.
export async function decodeMove(hash) {
  if (typeof hash !== 'string' || !hash.startsWith(MOVE_PREFIX)) return null;
  try {
    const body = hash.slice(MOVE_PREFIX.length);
    const dot = body.indexOf('.');
    if (dot < 0) return null;
    const format = body.slice(0, dot);
    let bytes = fromBase64Url(body.slice(dot + 1));
    if (format === COMPRESSED) bytes = await pipe(bytes, new DecompressionStream(COMPRESSION));
    else if (format !== PLAIN) return null;
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.length > MAX_JSON_CHARS) return null;
    return validatePayload(JSON.parse(text));
  } catch {
    return null;
  }
}

export function validatePayload(data) {
  if (!isPlain(data) || data.v !== PAYLOAD_VERSION || !(isPlain(data.s) || data.s === null)) return null;
  const keys = {};
  if (isPlain(data.k)) {
    for (const [key, value] of Object.entries(data.k)) {
      if (isMovableKey(key) && typeof value === 'string' && value.length <= MAX_KEY_CHARS) keys[key] = value;
    }
  }
  return { state: migrate(data.s), keys, route: cleanRoute(data.h) };
}

// ---------- Llegada ----------

// Aplica un paquete ya validado. Si aquí no hay progreso, entra entero; si lo hay, gana el más avanzado
// (a igualdad, el de aquí). Las claves sueltas siguen al estado ganador; si gana el de aquí, solo se añaden
// las que falten. Devuelve 'traido' | 'conservado' | 'nada'.
export function applyMove(storage, stateKey, incoming) {
  if (!storage || !incoming) return 'nada';
  const local = migrate(readJson(storage, stateKey));
  const take = hasProgress(incoming.state) && (!hasProgress(local) || isAhead(incoming.state, local));
  try {
    if (take) storage.setItem(stateKey, JSON.stringify(incoming.state));
    for (const [key, value] of Object.entries(incoming.keys)) {
      if (take || storage.getItem(key) === null) storage.setItem(key, value);
    }
  } catch {
    return 'nada';
  }
  if (take) return 'traido';
  return hasProgress(incoming.state) ? 'conservado' : 'nada';
}

// Llegada completa: { result: 'traido' | 'conservado' | 'nada', route: fragmento al que volver ('' si ninguno) }.
export async function receiveMove(storage, stateKey, hash) {
  const incoming = await decodeMove(hash);
  return { result: applyMove(storage, stateKey, incoming), route: incoming?.route || '' };
}
