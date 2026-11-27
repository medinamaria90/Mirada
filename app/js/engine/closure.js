// Cierre de una ronda: lo que ha dejado en la colección. Puro.

// Cuadros que la ronda ha añadido a la colección (reconocidos por primera vez): los que tiene `after` y no tenía `before`.
export function newWorksCount(before, after) {
  const had = before?.collection || {};
  return Object.keys(after?.collection || {}).filter((id) => !had[id]).length;
}
