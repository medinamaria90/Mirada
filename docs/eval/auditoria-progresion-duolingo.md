# Cómo «machaca sin deprimir» Duolingo, y qué copiar en Mirada (24/11/2026)

Auditoría con fuentes primarias. Motivo: María teme que, al pasar a ~1.000 obras, el avance deje de
sentirse rápido; quiere más repetición «sin deprimir al personal».

## Mecanismos de Duolingo
| Mecanismo | Qué hace | Por qué no deprime | Fuente |
|---|---|---|---|
| Half-life regression (2016) | Vida media de la memoria por palabra: repasa «cuando estás a punto de olvidar» | Ni lo sabido (aburre) ni lo imposible (frustra). +12 % actividad diaria, +9,5 % retención | blog.duolingo.com/how-we-learn-how-you-learn · aclanthology.org/P16-1174 |
| Birdbrain (2020) | Predice si acertarás y ajusta la dificultad | Zona «ni fácil ni difícil»: con i+20 «te desanimas»; con i+0 «te aburres» | blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain |
| Path (2022), fin de las «cracked skills» | Ruta única; los niveles de práctica van intercalados en el camino | El repaso es parte del avance, no una deuda visible; el decaimiento punitivo se retiró | blog.duolingo.com/new-duolingo-home-screen-design |
| Errores al final de la lección + «Mistakes» | Lo fallado vuelve al cierre y luego en el Practice Hub (gratis desde 2024) | «Review things you got wrong sooner» | blog.duolingo.com/spaced-repetition-for-learning · blog.duolingo.com/guide-to-duolingo-practice-hub |
| Review exercises «de contrabando» | 1 ejercicio de una parte anterior en cada lección (≈300.000/día) | No se anuncian como repaso; avanzar refuerza lo anterior | blog.duolingo.com/review-exercises-help-measure-learner-recall |
| Niveles por unidad + Legendary | Repetir una unidad en varios niveles; Legendary sin pistas, 40 XP frente a 5 | Repetir como reto etiquetado: «si fallo no me siento mal, me avisaste de que era difícil» | blog.duolingo.com/ways-to-practice-in-duolingo · blog.duolingo.com/duolingo-difficult-exercises |
| Racha desacoplada de la meta | La racha se mantiene con 1 lección | +3,3 % retención D14, +10,5 % usuarios diarios | blog.duolingo.com/improving-the-streak |
| Streak freeze / amuleto | Perdona 1-2 días | Perder la racha es motivo de abandono; 7 días de racha → 3,6× más probabilidad de acabar | blog.duolingo.com/how-duolingo-streak-builds-habit · growth.design/case-studies/duolingo-user-retention |
| Corazones → energía (2025) | Dejan de quitar vida por error | «Mistakes are a natural part of learning»; la energía genera rechazo | blog.duolingo.com/duolingo-energy |
| Ligas | Grupos de 30 | +17 % tiempo, pero ansiedad, XP farming y trampas | lennysnewsletter.com/p/how-duolingo-reignited-user-growth · arxiv.org/abs/2203.16175 |

No publicado: cuántas veces se repite una palabra, intervalos concretos, % de repaso por sesión, ni el
porcentaje de aciertos objetivo de Birdbrain.

## Propuesta para Mirada (por impacto/coste)
1. **Un cuadro de repaso «de contrabando» por ronda**: al menos 1 pregunta de un pintor dominado hace
   > 5 días, elegida por el `srs`, sin anunciarla. Coste casi cero.
2. **Errores que vuelven**: cuadro fallado → pregunta extra al final de la misma ronda (no cuenta para el
   75 %) y cola `fallados` que alimenta la siguiente ronda y el reto diario.
3. **Mezcla 60/40 nuevo/repaso al pasar a 1.000 obras**: menos etapas con más cuadros propios; el
   40 % de cada ronda, repaso del pintor y de anteriores. El avance sigue (siempre hay pintor nuevo).
4. **Niveles por pintor**: corona 1 = dominado; corona 2 = ronda solo con cuadros suyos no vistos;
   «Legendario» = sin pistas ni título, XP doble. Repetir como reto opcional y etiquetado.
5. **Pintor «dormido» a los 7-10 días**: el nodo pierde saturación y dice «¿Lo recuerdas?»; nunca
   bloquea ni quita el dominado.
6. **Sesión de repaso puro de 5 preguntas, opcional**, visible en el mapa y al cerrar ronda; elige el
   `srs`; da XP y cuenta para meta y racha.
7. **Racha por una ronda cualquiera, meta de XP aparte**; 1-2 días de gracia semanales que se recargan.
8. **Dificultad por rendimiento**: > 85 % en 2 rondas → distractores más cercanos; < 60 % → más lejanos
   y un cuadro recién visto más.
9. **Cierre con sensación de hecho**: tras la meta diaria, pantalla con lo aprendido y «la próxima
   vez: Sorolla», sin más llamadas.
10. **Repaso de movimiento como «Legendario» de sección**, también cada N etapas, sin pistas, recompensa alta.

## Qué no copiar
Corazones/energía (castigan el error; Duolingo los retiró), ligas (ansiedad y trampas; con poco público
quedan vacías; si algo social, compararse con uno mismo), notificaciones pasivo-agresivas («funcionan
porque sientan mal»), decaimiento que destruye progreso (retirado con el path).
