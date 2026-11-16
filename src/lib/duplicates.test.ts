import { describe, expect, it } from 'vitest';
import { extraCopies, findDuplicates } from './duplicates';
import { makeTrack } from './test-utils';

const t = (position: number, name: string, artists: string[], trackId: string | null, album = 'A') =>
  makeTrack({ position, name, artists, trackId, album, uri: `spotify:track:${trackId ?? 'x'}` });

describe('findDuplicates', () => {
  it('detecta la misma canción (mismo ID) agregada dos veces', () => {
    const groups = findDuplicates([t(1, 'Hola', ['X'], 'id1'), t(2, 'Otra', ['Y'], 'id2'), t(3, 'Hola', ['X'], 'id1')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe('same-id');
    expect(groups[0]?.tracks.map((x) => x.position)).toEqual([1, 3]);
  });

  it('detecta el single y el álbum: mismo nombre y artistas, distinto ID', () => {
    const groups = findDuplicates([t(1, 'Hola', ['X'], 'id1', 'Single'), t(2, 'Hola', ['X'], 'id9', 'Álbum')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe('same-song');
  });

  it('ignora mayúsculas, tildes y el orden de los artistas', () => {
    const groups = findDuplicates([t(1, 'Canción', ['B', 'A'], 'i1'), t(2, 'CANCION', ['a', 'b'], 'i2')]);
    expect(groups).toHaveLength(1);
  });

  it('mismo nombre con otros artistas NO es repetida', () => {
    expect(findDuplicates([t(1, 'Hola', ['X'], 'i1'), t(2, 'Hola', ['Y'], 'i2')])).toEqual([]);
  });

  it('una canción no cae en dos grupos: ID repetido + versión de álbum es un solo grupo', () => {
    const groups = findDuplicates([t(1, 'Hola', ['X'], 'i1'), t(2, 'Hola', ['X'], 'i1'), t(3, 'Hola', ['X'], 'i2')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.tracks).toHaveLength(3);
    expect(groups[0]?.kind).toBe('same-song');
    expect(extraCopies(groups)).toBe(2);
  });

  it('archivos locales (sin ID) se comparan por nombre y artistas', () => {
    expect(findDuplicates([t(1, 'Demo', ['Yo'], null), t(2, 'Demo', ['Yo'], null)])).toHaveLength(1);
  });

  it('sin repetidas devuelve una lista vacía', () => {
    expect(findDuplicates([t(1, 'A', ['X'], 'i1'), t(2, 'B', ['X'], 'i2')])).toEqual([]);
  });
});
