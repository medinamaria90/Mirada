// Test de cultura pictórica: los efectos de sonido de la app (toque, acierto, fallo y final), con el ajuste
// «Sonidos» y el volumen que haya guardados en la app (state/store.js; sin estado, los de siempre). La música no
// suena en el test. El motor de audio se carga en reposo (ui/audio-bridge.js) y se desbloquea en cada toque.

import { audio, applyAudioSettings, loadAudioWhenIdle } from '../ui/audio-bridge.js';
import { createStore } from '../state/store.js';

const LOAD_DELAY_MS = 1200; // tras pintar la portada: cuando se pulse «Empezar», ya está listo

export function setupSound(storage) {
  const { sfx, volume } = createStore({ storage }).get().settings;
  applyAudioSettings({ music: false, sfx, volume });
  if (sfx) loadAudioWhenIdle(LOAD_DELAY_MS);
}

// name: 'tap' | 'correct' | 'wrong' | 'complete' (audio/sfx.js). Siempre dentro de un gesto del usuario.
export function play(name) {
  audio.unlock();
  audio.sfx(name);
}
