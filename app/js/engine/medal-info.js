// Nombre y subtítulo de cada medalla (resultado, perfil y medallas). Puro.

export function medalInfo(id, index) {
  const [kind, ...rest] = id.split('-');
  const ref = rest.join('-');
  if (kind === 'artist') return { title: index.artist(ref)?.name || ref, sub: 'Ya lo reconoces' };
  if (kind === 'movement') return { title: index.movement(ref)?.name || ref, sub: 'Época completa' };
  if (kind === 'streak') return { title: `${ref} días`, sub: 'Racha' };
  if (kind === 'eye') {
    const a = index.artist(ref);
    return { title: `Ojo de ${a ? a.short || a.name : ref}`, sub: 'Reconoces todos sus cuadros' };
  }
  if (id === 'weekly-1') return { title: 'Primer reto semanal', sub: 'Reto' };
  if (id === 'goal-1') return { title: 'Primera meta del día', sub: 'Meta diaria' };
  if (id === 'daily-1') return { title: 'Primer reto diario', sub: 'Reto' };
  if (id === 'daily-perfect') return { title: 'Reto diario perfecto', sub: 'Reto' };
  if (id === 'challenge-1') return { title: 'Primer duelo', sub: 'Reto a un amigo' };
  if (id === 'new-1') return { title: 'Primer cuadro nuevo', sub: 'Lo has reconocido sin verlo antes' };
  return { title: id, sub: '' };
}
