// Dónde estaba la vista de cada mapa (la portada y cada pantalla de rama), para volver EXACTAMENTE ahí: al cerrar un
// cartel, la ficha de un pintor, una historia o una ronda abierta desde un punto antiguo del camino. El mapa invita a
// pasear y repasar, así que ninguna vuelta recentra a la fuerza en la parada actual: eso solo pasa al abrir la app o
// con el botón «Tu parada».
// La posición se guarda anclada a un tramo del mapa (su número de orden y la fracción de su alto que había en el centro
// de la pantalla), no en píxeles: así sobrevive a que las épocas lejanas se pinten más tarde o cambie el ancho.
// Solo vive en memoria (una sesión de la app).

const spots = new Map();

// items: los tramos del mapa en orden, con su caja en la ventana ({ top, height }); viewH: alto de la ventana.
// Devuelve el ancla { index, frac } del punto en el centro de la pantalla, o null.
export function anchorOf(items, viewH) {
  if (!items.length) return null;
  const line = viewH / 2;
  let index = items.findIndex((r) => r.top <= line && line < r.top + r.height);
  if (index < 0) index = line < items[0].top ? 0 : items.length - 1;
  const r = items[index];
  const frac = r.height ? Math.min(1, Math.max(0, (line - r.top) / r.height)) : 0;
  return { index, frac };
}

// Desplazamiento de la ventana que deja el ancla otra vez en el centro. item: caja actual de su tramo.
export function scrollForAnchor(anchor, item, scrollY, viewH) {
  return Math.max(0, Math.round(scrollY + item.top + anchor.frac * item.height - viewH / 2));
}

const mapItems = (map) => [...map.children].filter((c) => c.tagName === 'LI');
const boxes = (map) => mapItems(map).map((li) => { const r = li.getBoundingClientRect(); return { top: r.top, height: r.height }; });

// Guarda dónde está la vista del mapa de la pantalla `key` (la portada, «inicio»; una rama, «rama-<id>»).
export function rememberMap(key, map) {
  if (!map?.isConnected) return;
  const anchor = anchorOf(boxes(map), window.innerHeight);
  if (anchor) spots.set(key, anchor);
}

export const recallMap = (key) => spots.get(key) || null;
export const forgetMap = (key) => spots.delete(key);

// Desplazamiento para volver al ancla guardada en el mapa dado (null si ya no casa: otro número de tramos).
export function restoreTop(map, anchor) {
  const items = mapItems(map);
  const li = items[anchor.index];
  if (!li) return null;
  const r = li.getBoundingClientRect();
  return scrollForAnchor(anchor, { top: r.top, height: r.height }, window.scrollY, window.innerHeight);
}
