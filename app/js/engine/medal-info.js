// Nombre y subtítulo de cada medalla (resultado, perfil y medallas). Puro.

export function medalInfo(id, index) {
  const [kind, ...rest] = id.split('-');
  const ref = rest.join('-');
  if (kind === 'artist') return { title: index.artist(ref)?.name || ref, sub: 'Ya reconoces sus cuadros' };
  if (kind === 'movement') return { title: index.movement(ref)?.name || ref, sub: 'Época completa' };
  if (kind === 'streak') return { title: `${ref} días`, sub: 'Racha' };
  if (kind === 'eye') {
    const a = index.artist(ref);
    return { title: `Ojo de ${a ? a.short || a.name : ref}`, sub: 'Reconoces todos sus cuadros' };
  }
  if (id === 'weekly-1') return { title: 'Primer reto semanal', sub: 'Reto' };
  if (id === 'goal-1') return { title: 'Primera meta del día', sub: 'Meta diaria' };
  if (id === 'daily-1') return { title: 'Primer cuadro del día', sub: 'Cuadro del día' };
  if (id === 'daily-perfect') return { title: 'A la primera', sub: 'Cuadro del día' };
  if (id === 'challenge-1') return { title: 'Primer duelo', sub: 'Reto a un amigo' };
  if (id === 'new-1') return { title: 'Primer cuadro nuevo', sub: 'Lo has reconocido sin verlo antes' };
  return { title: id, sub: '' };
}
