const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const prefersReducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Anima y espera a que termine (o se cancele). Con «reducir movimiento» no anima. */
export async function play(target: Element, frames: Keyframe[], ms: number, pseudo?: string): Promise<void> {
  if (prefersReducedMotion() || typeof target.animate !== 'function') return;
  const options: KeyframeAnimationOptions & { pseudoElement?: string } = { duration: ms, easing: EASE, fill: 'both' };
  if (pseudo) options.pseudoElement = pseudo;
  try {
    await target.animate(frames, options).finished;
  } catch {
    /* animación cancelada: no pasa nada */
  }
}
