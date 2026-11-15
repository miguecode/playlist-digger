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

/** Búsqueda de playlists por nombre (el CSV no trae el ID ni el dueño de la playlist). */
export const playlistUrl = (name: string): string | null => {
  const q = name.trim();
  return q ? `${SEARCH_BASE}${encodeURIComponent(q)}/playlists` : null;
};
