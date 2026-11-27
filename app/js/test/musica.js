// Música del test de cultura pictórica: su propia lista (`test`, audio/playlists.js), con las
// preferencias de sonido que la persona tenga en la app (si apagó la música, aquí tampoco suena).
// Solo lee lo guardado; no escribe nada. Arranca en el primer toque, como exige el navegador.
import { audio, applyAudioSettings, loadAudioWhenIdle, bindBackgroundPause } from '../ui/audio-bridge.js';
import { STORAGE_KEY } from '../state/store.js';
import { migrate } from '../state/schema.js';

export const TEST_LIST = 'test';

/** Ajustes de sonido guardados por la app (los de fábrica si no hay nada o no se puede leer). */
export function savedSettings(storage) {
  let raw = null;
  try { raw = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null'); } catch { raw = null; }
  return migrate(raw).settings;
}

export function startTestMusic(win = window) {
  let storage = null;
  try { storage = win.localStorage; } catch { storage = null; }
  const settings = savedSettings(storage);
  applyAudioSettings(settings);
  audio.setEra(TEST_LIST);
  bindBackgroundPause(win.document, win);
  loadAudioWhenIdle();
  const unlockOnce = () => {
    audio.unlock();
    if (settings.music) audio.startMusic();
    win.removeEventListener('pointerup', unlockOnce, true);
    win.removeEventListener('keydown', unlockOnce, true);
  };
  win.addEventListener('pointerup', unlockOnce, true);
  win.addEventListener('keydown', unlockOnce, true);
}
