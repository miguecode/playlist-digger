import type { Track } from '../types';

/** Enlace para abrir la canción en Spotify. El ID ya viene validado (solo letras y números). */
export function trackUrl(track: Track): string | null {
  return track.trackId ? `https://open.spotify.com/track/${track.trackId}` : null;
}

const SEARCH_BASE = 'https://open.spotify.com/search/';

/**
 * El CSV de Exportify trae el ID de la canción pero no los de artistas, álbumes ni sellos, así que para
 * ellos no hay enlace directo: se abre la búsqueda en Spotify, cuyo primer resultado suele ser el correcto.
 */
export function searchUrl(query: string): string | null {
  const q = query.trim();
  return q ? `${SEARCH_BASE}${encodeURIComponent(q)}` : null;
}

export const artistUrl = (name: string): string | null => searchUrl(name);

/** Álbum + primer artista, para distinguir álbumes con el mismo nombre. */
export const albumUrl = (album: string, artist?: string): string | null =>
  searchUrl(artist ? `${album} ${artist}` : album);

/** Usa el filtro `label:` que Spotify documenta para su buscador. */
export const labelUrl = (label: string): string | null => {
  const name = label.replaceAll('"', '').trim();
  return name ? searchUrl(`label:"${name}"`) : null;
};

/**
 * Quien más canciones agregó: es lo más probable que sea el dueño de la playlist (no hay certeza en las colaborativas).
 * Devuelve null si no hay datos o si el valor parece un ID opaco (p. ej. «31abc…» de 24+ caracteres con números),
 * que no sirve para buscar porque Spotify no lo conoce como texto.
 */
export function likelyOwner(addedBy: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const raw of addedBy) {
    const name = raw.replace(/^spotify:user:/i, '').trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [name, n] of counts) {
    if (n > max) {
      best = name;
      max = n;
    }
  }
  return best && !/^(?=.*\d)[a-z0-9]{24,}$/i.test(best) ? best : null;
}

/** Búsqueda de playlists por nombre (+ dueño probable). El CSV no trae el ID de la playlist. */
export const playlistUrl = (name: string, owner?: string | null): string | null => {
  const q = [name.trim(), owner?.trim()].filter(Boolean).join(' ');
  return q ? `${SEARCH_BASE}${encodeURIComponent(q)}/playlists` : null;
};
