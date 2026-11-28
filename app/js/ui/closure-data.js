// Frases puente de los cierres de época y de rama (data/cierres.json): { eras: { id: { to?, text, source } }, branches: {…} }.
// Las usan la pantalla de cierre (ui/screens/era-end.js) y «Fuentes y créditos». Solo se recuerda lo que llega bien.

let pending = null;

export function loadBridges() {
  pending ||= fetch(new URL('../../data/cierres.json', import.meta.url), { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}

// Frase puente de un cierre ({ type, id }): { to?, text, source } o null.
export const bridgeOf = (data, closure) => (closure.type === 'branch' ? data?.branches : data?.eras)?.[closure.id] || null;
