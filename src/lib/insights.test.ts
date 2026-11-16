import { describe, expect, it } from 'vitest';
import {
  computeInsights,
  computeTonality,
  genreFlavor,
  danceVerdict,
  tempoBuckets,
  durationVerdict,
  moodVerdict,
  popularityVerdict,
  tempoVerdict,
} from './insights';
import { makeTrack } from './test-utils';

const t = (overrides: Parameters<typeof makeTrack>[0]) => makeTrack(overrides);

describe('computeInsights', () => {
  const tracks = [
    t({ name: 'A', artists: ['Eminem', 'Dr. Dre'], album: 'Alb1', genres: ['rap', 'hip hop'], popularity: 80, durationMs: 200_000, releaseDate: '2010-05-01', explicit: true, tempo: 100, danceability: 0.8, energy: 0.7, valence: 0.6 }),
    t({ name: 'B', artists: ['Eminem'], album: 'Alb1', genres: ['rap'], popularity: 60, durationMs: 400_000, releaseDate: '2012-01-01', explicit: true, tempo: 140, danceability: 0.6, energy: 0.5, valence: 0.4 }),
    t({ name: 'C', artists: ['Dua Lipa'], album: 'Alb2', genres: ['pop'], popularity: 70, durationMs: 100_000, releaseDate: '1999-01-01', explicit: false, tempo: 0 }),
  ];
  const r = computeInsights(tracks);

  it('cuenta canciones, artistas distintos y duración', () => {
    expect(r.trackCount).toBe(3);
    expect(r.distinctArtists).toBe(3);
    expect(r.totalDurationMs).toBe(700_000);
  });
  it('rankea artistas, géneros y álbumes (los colaboradores cuentan para cada uno)', () => {
    expect(r.topArtists[0]).toEqual({ name: 'Eminem', count: 2 });
    expect(r.topGenres[0]).toEqual({ name: 'rap', count: 2 });
    expect(r.topAlbums[0]).toEqual({ name: 'Alb1', count: 2, detail: 'Eminem' });
  });
  it('desempata por nombre', () => {
    expect(r.topArtists.slice(1).map((a) => a.name)).toEqual(['Dr. Dre', 'Dua Lipa']);
  });
  it('promedia popularidad y marca la más popular', () => {
    expect(r.popularity?.average).toBe(70);
    expect(r.popularity?.top).toEqual({ name: 'A', artist: 'Eminem', value: 80 });
    expect(r.popularity?.hitsShare).toBe(67);
  });
  it('promedia audio en porcentaje y calcula el ánimo', () => {
    expect(r.audio?.danceability).toBe(70);
    expect(r.audio?.energy).toBe(60);
    expect(r.audio?.valence).toBe(50);
    expect(r.audio?.mood?.label).toBe('Fiesta total');
  });
  it('ignora un BPM de 0 y marca la más rápida y la más lenta', () => {
    expect(r.tempo).toMatchObject({ average: 120, min: 100, max: 140 });
    expect(r.tempo?.fastest).toEqual({ name: 'B', artist: 'Eminem', value: 140 });
    expect(r.tempo?.slowest).toEqual({ name: 'A', artist: 'Eminem', value: 100 });
  });
  it('arma el ranking de canciones más populares', () => {
    expect(r.topSongs.map((s) => [s.name, s.value])).toEqual([['A', 80], ['C', 70], ['B', 60]]);
  });
  it('duración: promedio, extremos y reparto por tipo', () => {
    expect(r.duration?.longest.value).toBe(400_000);
    expect(r.duration?.shortest.name).toBe('C');
    expect(r.duration?.byClass).toEqual({ short: 1, medium: 1, long: 1, podcast: 0 });
  });
  it('épocas: incluye las décadas intermedias vacías y elige la favorita', () => {
    expect(r.decades?.list.map((d) => [d.label, d.count])).toEqual([['1990s', 1], ['2000s', 0], ['2010s', 2]]);
    expect(r.decades?.favorite.label).toBe('2010s');
    expect(r.decades?.oldest.value).toBe(1999);
    expect(r.decades?.newest.value).toBe(2012);
  });
  it('porcentaje de explícitas', () => {
    expect(r.explicitShare).toBe(67);
  });
  it('arma etiquetas de cabecera', () => {
    expect(r.tags).toContain('Fiesta total');
    expect(r.tags.length).toBeLessThanOrEqual(5);
  });
});

describe('computeInsights con datos faltantes', () => {
  it('sin datos de audio, popularidad, fecha ni duración no inventa nada', () => {
    const r = computeInsights([t({ name: 'X', artists: ['Z'] })]);
    expect(r.popularity).toBeNull();
    expect(r.audio).toBeNull();
    expect(r.tempo).toBeNull();
    expect(r.duration).toBeNull();
    expect(r.decades).toBeNull();
    expect(r.explicitShare).toBeNull();
    expect(r.topAlbums).toEqual([]);
    expect(r.tags).toEqual([]);
  });
  it('una playlist vacía no rompe', () => {
    const r = computeInsights([]);
    expect(r.trackCount).toBe(0);
    expect(r.topArtists).toEqual([]);
  });
});

describe('frases', () => {
  it('popularidad por tramos', () => {
    expect(popularityVerdict(80).label).toBe('Súper mainstream');
    expect(popularityVerdict(65).label).toBe('Bastante mainstream');
    expect(popularityVerdict(50).label).toBe('Equilibrada');
    expect(popularityVerdict(35).label).toBe('Un poco edgy');
    expect(popularityVerdict(10).label).toBe('Muy edgy');
  });
  it('ánimo, baile, ritmo y duración', () => {
    expect(moodVerdict(80, 80).label).toBe('Fiesta total');
    expect(moodVerdict(80, 20).label).toBe('Intensa');
    expect(moodVerdict(30, 80).label).toBe('Buena vibra');
    expect(moodVerdict(30, 20).label).toBe('Melancólica');
    expect(danceVerdict(75).label).toBe('Para bailar');
    expect(danceVerdict(40).label).toBe('Para escuchar');
    expect(tempoVerdict(80).label).toBe('Ritmo tranquilo');
    expect(tempoVerdict(150).label).toBe('Ritmo acelerado');
    expect(durationVerdict(150_000).label).toBe('Temas cortitos');
    expect(durationVerdict(200_000).label).toBe('Duración clásica');
    expect(durationVerdict(274_000).label).toBe('Duración clásica'); // 4:34, igual que la etiqueta «Media»
    expect(durationVerdict(300_000).label).toBe('Temas largos');
  });
});

describe('tempoBuckets', () => {
  it('reparte por tramos y deja los bordes en el tramo de arriba', () => {
    const counts = tempoBuckets([70, 79.9, 80, 99, 100, 125, 140, 159, 160, 200]).map((b) => b.count);
    expect(counts).toEqual([2, 2, 1, 1, 2, 2]);
    expect(tempoBuckets([]).map((b) => b.label)).toEqual(['<80', '80–99', '100–119', '120–139', '140–159', '160+']);
  });
});

describe('tonalidad', () => {
  it('cuenta la tonalidad más repetida (nota + modo) y el reparto mayor/menor', () => {
    const ton = computeTonality([
      t({ key: 0, mode: 1 }),
      t({ key: 0, mode: 1 }),
      t({ key: 9, mode: 0 }),
      t({ key: null, mode: null }),
    ]);
    expect(ton?.favorite).toEqual({ name: 'Do mayor', count: 2 });
    expect(ton?.known).toBe(3);
    expect(ton?.majorShare).toBe(67);
    expect(ton?.perKey[9]).toEqual({ label: 'La', count: 1 });
  });
  it('ignora notas fuera de rango y devuelve null si no hay datos', () => {
    expect(computeTonality([t({ key: -1, mode: 1 }), t({ key: 12, mode: 0 })])).toBeNull();
  });
});

describe('género dominante', () => {
  it('reconoce familias por palabra', () => {
    expect(genreFlavor('hip hop old school').note).toMatch(/rap y el hip hop/);
    expect(genreFlavor('rock argentino').note).toMatch(/rock/);
  });
  it('un género desconocido igual se informa, sin nota', () => {
    expect(genreFlavor('xyz raro')).toEqual({ name: 'xyz raro', note: '' });
  });
  it('queda en el audio del resumen', () => {
    const r = computeInsights([t({ genres: ['rap'], energy: 0.7, valence: 0.3, danceability: 0.6 })]);
    expect(r.audio?.genre?.name).toBe('rap');
  });
});
