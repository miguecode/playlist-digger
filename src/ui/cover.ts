import { CoverLoader } from '../lib/covers';
import type { Track } from '../types';
import { h } from './dom';
import { icon } from './icons';

const loader = new CoverLoader({
  concurrency: 6,
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
export function coverElement(track: { trackId?: string | null }, className = 'cover'): HTMLElement {
  const box = h('span', { class: className, 'aria-hidden': 'true' }, icon('note', 24));
  const id = track.trackId ?? null;
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
    window.setTimeout(() => void loader.request(id, () => box.isConnected).then(show), 80);
  }
  return box;
}

let prefetchRun = 0;

/**
 * Pide por adelantado las carátulas de las canciones que están por aparecer al scrollear.
 * Va detrás de lo que se ve y se descarta sola si, mientras espera, se vuelve a llamar (el usuario ya se movió).
 */
export function prefetchCovers(tracks: readonly Track[]): void {
  const run = ++prefetchRun;
  for (const track of tracks) {
    if (track.trackId && loader.peek(track.trackId) === undefined) {
      void loader.request(track.trackId, () => run === prefetchRun, false);
    }
  }
}

/**
 * Carátula como imagen lista para dibujar en un canvas (la imagen del resumen), o null si no se pudo conseguir.
 * Se pide con CORS: si el CDN no lo permite, la carga falla y no se dibuja nada, en vez de «contaminar» el canvas.
 */
export async function coverImage(trackId: string, timeoutMs = 4000): Promise<HTMLImageElement | null> {
  const url = await loader.request(trackId, () => true).catch(() => null);
  if (!url) return null;
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}
