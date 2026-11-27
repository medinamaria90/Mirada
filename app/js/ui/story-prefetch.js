// Precarga de historias en el mapa (portada y ramas): la de la parada actual y las de los pintores con niveles que están
// a la vista o a punto de estarlo. Su tarjeta (ui/level-card.js) pinta los círculos con la portada de cada historia, y
// entrar en un pintor abre su historia: así ninguno de los dos espera a la red. De una en una, en ratos libres, y cada
// historia una sola vez (ui/story-data.js, que se carga en el primer rato libre: no cuenta en el arranque).

const NEAR = '50% 0px';            // «a punto de verse»: media pantalla por arriba y por abajo
const IDLE_TIMEOUT_MS = 2000;
const CURRENT = '.stage-spot.is-current .stage[data-id]';
const WITH_CARD = '.stage[data-card][data-id]';

const idle = (fn) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS }) : setTimeout(fn, 0));

// root: la pantalla del mapa. Devuelve { refresh, stop }: refresh tras pintar más paradas o aros; stop al salir.
export function watchStoryPrefetch(root) {
  const asked = new Set();
  const queue = [];
  let busy = false;
  let stopped = false;
  const pump = () => {
    if (busy || stopped || !queue.length) return;
    busy = true;
    idle(() => {
      const id = queue.shift();
      const done = () => { busy = false; pump(); };
      if (stopped || !id) return done();
      return import('./story-data.js').then((m) => m.loadStory(id)).catch((err) => console.info('Precarga de historia omitida:', err.message)).finally(done);
    });
  };
  const want = (id) => {
    if (!id || asked.has(id)) return;
    asked.add(id);
    queue.push(id);
    pump();
  };
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        want(e.target.dataset.id);
      }
    }, { rootMargin: NEAR })
    : null;
  const refresh = () => {
    if (stopped) return;
    want(root.querySelector(CURRENT)?.dataset.id);
    for (const node of root.querySelectorAll(WITH_CARD)) {
      if (asked.has(node.dataset.id)) continue;
      if (io) io.observe(node);
      else want(node.dataset.id);
    }
  };
  refresh();
  return {
    refresh,
    stop: () => {
      stopped = true;
      queue.length = 0;
      io?.disconnect();
    },
  };
}
