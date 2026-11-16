import { CoverLoader } from '../lib/covers';
import type { Track } from '../types';
import { h } from './dom';
import { icon } from './icons';

const loader = new CoverLoader({
  storage: (() => {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  })(),
});

/**
 * Carátula de una canción: un ícono de nota mientras carga (o si no hay imagen) y la imagen cuando llega.
 * Es decorativa: el nombre de la canción ya está en el texto de al lado.
 */
export function coverElement(track: Track, className = 'cover'): HTMLElement {
  const box = h('span', { class: className, 'aria-hidden': 'true' }, icon('note', 24));
  const id = track.trackId;
  if (!id) return box;

  const show = (url: string | null | undefined): void => {
    if (!url || !box.isConnected) return;
    const img = h('img', { class: 'cover__img', src: url, alt: '', decoding: 'async', referrerpolicy: 'no-referrer' });
    img.addEventListener('load', () => box.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => img.remove(), { once: true });
    box.append(img);
  };

  const known = loader.peek(id);
  if (known !== undefined) {
    // Ya la tenemos: se agrega apenas el elemento esté en el documento.
    queueMicrotask(() => show(known));
  } else {
    // Un instante de espera: si se scrollea rápido, las tarjetas que ya no se ven no llegan a pedir nada.
    window.setTimeout(() => void loader.request(id, () => box.isConnected).then(show), 150);
  }
  return box;
}
