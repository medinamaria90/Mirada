// Historia compartida (#historia-<pintor>-<nivel>, la abre h/<pintor>-1.html): la ve cualquiera, juegue o no, sin tocar su partida
// (no se marca como vista). Quien ya juega la ve y sigue en su camino; quien no, al terminarla o cerrarla, ve una invitación a
// jugar: «Empezar a jugar» empieza la partida (como «Empezar» en la bienvenida) y «Ahora no» le deja en la bienvenida.

import { esc, accentStyle } from './dom.js';
import { mediaHtml } from './story-card.js';
import { isShareable } from '../engine/stories.js';

const INVITE = Object.freeze({ PLAY: 'play', LATER: 'later' });

// La tarjeta final para quien no juega: el último cuadro que ha visto, de fondo. Devuelve INVITE. Entra en el historial: atrás
// la cierra como «Ahora no».
function invite(ctx, artist, work) {
  return new Promise((resolve) => {
    const name = artist.short || artist.name;
    const dlg = document.createElement('dialog');
    dlg.className = 'story story-invite';
    dlg.setAttribute('aria-labelledby', 'story-invite-title');
    dlg.setAttribute('style', accentStyle(ctx.index.movement(artist.movementId)?.accent));
    dlg.innerHTML = `<div class="story-frame">
      <div class="story-media">${mediaHtml(work, null, 0, artist.name)}</div>
      <div class="story-bottom">
        <div class="story-copy">
          <h2 class="story-ask" id="story-invite-title">¿Te ha gustado?</h2>
          <p class="story-text">Aprende a reconocer a ${esc(name)} y a los grandes maestros jugando.</p>
        </div>
        <div class="story-actions">
          <button type="button" class="btn story-more" data-st="later">Ahora no</button>
          <button type="button" class="btn btn-primary" data-st="play">Empezar a jugar</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(dlg);
    let pushed = false;
    try { history.pushState({ sfInvite: true }, ''); pushed = true; } catch { /* sin historial: los botones y Esc bastan */ }
    let done = false;
    const onPop = () => finish(INVITE.LATER, true);
    function finish(choice, fromPop = false) {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', onPop);
      if (dlg.open) dlg.close();
      dlg.remove();
      if (pushed && !fromPop) {
        window.addEventListener('popstate', () => resolve(choice), { once: true });
        history.back();
      } else resolve(choice);
    }
    window.addEventListener('popstate', onPop);
    dlg.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-st]');
      if (!b) return;
      ctx.audio.sfx('tap');
      finish(b.dataset.st === 'play' ? INVITE.PLAY : INVITE.LATER);
    });
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); finish(INVITE.LATER); });
    try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
    dlg.querySelector('[data-st="play"]').focus();
  });
}

export async function playSharedStory(ctx, artistId, level) {
  const artist = ctx.index.artist(artistId);
  if (!artist || !isShareable(level)) { ctx.toast('Ese enlace no vale'); return; }
  const { playStory, STORY_END } = await import('./story-viewer.js');
  const { shown, ended } = await playStory(ctx, artistId, level, { force: true, guest: true, onPlay: false, onMore: false });
  if (ended === STORY_END.NONE) { ctx.toast('Ese enlace no vale'); return; }
  await inviteToPlay(ctx, artist, ctx.index.artwork(shown[shown.length - 1]));
}

// Para quien aún no juega (también al acabar el Cuadro del día que le han compartido): la invitación con ese cuadro de fondo.
// «Empezar a jugar» empieza la partida y lleva al camino; «Ahora no» le deja donde está. Devuelve true si empieza.
export async function inviteToPlay(ctx, artist, work, { home = 'inicio' } = {}) {
  if (ctx.store.get().onboarded || !artist || !work) return false;
  if ((await invite(ctx, artist, work)) !== INVITE.PLAY) return false;
  ctx.audio.unlock();
  ctx.store.update((s) => ({ ...s, onboarded: true }));
  ctx.go(home);
  return true;
}
