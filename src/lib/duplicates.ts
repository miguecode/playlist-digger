import type { Track } from '../types';
import { fold } from './text';

/**
 * - same-id: es literalmente la misma canción (mismo ID de Spotify) agregada más de una vez.
 * - same-song: mismo nombre y mismos artistas pero con distinto ID: típicamente el single y el mismo tema dentro de un álbum.
 */
export type DuplicateKind = 'same-id' | 'same-song';

export interface DuplicateGroup {
  kind: DuplicateKind;
  /** Las canciones repetidas, en el orden de la playlist. */
  tracks: Track[];
}

const clean = (text: string): string => fold(text).replace(/\s+/g, ' ').trim();

/** Clave «mismo nombre + mismos artistas» (sin importar mayúsculas, tildes ni el orden de los artistas). */
export function songKey(t: Track): string | null {
  const name = clean(t.name);
  if (!name) return null;
  const artists = [...new Set(t.artists.map(clean).filter(Boolean))].sort();
  return `${name}|${artists.join(';')}`;
}

/** Busca canciones repetidas por ID y por nombre + artistas. Cada canción queda en un solo grupo. */
export function findDuplicates(tracks: readonly Track[]): DuplicateGroup[] {
  // Unión de conjuntos: las canciones se juntan si comparten ID o clave de nombre + artistas.
  const parent = tracks.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root] as number;
    while (parent[i] !== root) {
      const next = parent[i] as number;
      parent[i] = root;
      i = next;
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };

  const seen = new Map<string, number>();
  const link = (key: string, i: number): void => {
    const other = seen.get(key);
    if (other === undefined) seen.set(key, i);
    else union(i, other);
  };
  tracks.forEach((t, i) => {
    if (t.trackId) link(`id:${t.trackId}`, i);
    const key = songKey(t);
    if (key) link(`song:${key}`, i);
  });

  const groups = new Map<number, Track[]>();
  tracks.forEach((t, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), t]);
  });

  return [...groups.values()]
    .filter((g) => g.length >= 2)
    .map((group) => {
      const ids = new Set(group.map((t) => t.trackId));
      const sameId = ids.size === 1 && !ids.has(null);
      return { kind: sameId ? ('same-id' as const) : ('same-song' as const), tracks: group };
    })
    .sort((a, b) => (a.tracks[0]?.position ?? 0) - (b.tracks[0]?.position ?? 0));
}

/** Cuántas canciones «sobran»: todas las de cada grupo menos una. */
export const extraCopies = (groups: readonly DuplicateGroup[]): number => groups.reduce((sum, g) => sum + g.tracks.length - 1, 0);
