import { describe, expect, it } from 'vitest';
import {
  computeInsights,
  computeAddedByMonth,
  computeTonality,
  normalizeBpm,
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
    expect(r.popularity?.top).toMatchObject({ name: 'A', artist: 'Eminem', value: 80 });
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
    expect(r.tempo?.fastest).toMatchObject({ name: 'B', artist: 'Eminem', value: 140 });
    expect(r.tempo?.slowest).toMatchObject({ name: 'A', artist: 'Eminem', value: 100 });
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

describe('normalizeBpm', () => {
  it('corrige solo los casos casi seguros (al doble o a la mitad)', () => {
    expect(normalizeBpm(200)).toEqual({ value: 100, adjusted: true });
    expect(normalizeBpm(45)).toEqual({ value: 90, adjusted: true });
  });
  it('no toca los valores plausibles, aunque sean rápidos o lentos', () => {
    expect(normalizeBpm(178)).toEqual({ value: 178, adjusted: false });
    expect(normalizeBpm(72)).toEqual({ value: 72, adjusted: false });
  });
  it('no corrige si el resultado quedaría fuera de rango', () => {
    expect(normalizeBpm(25)).toEqual({ value: 25, adjusted: false });
  });
  it('el resumen usa el BPM corregido y avisa cuántos ajustó', () => {
    const r = computeInsights([t({ tempo: 200, name: 'Rápida' }), t({ tempo: 100 })]);
    expect(r.tempo?.average).toBe(100);
    expect(r.tempo?.adjusted).toBe(1);
    expect(r.tempo?.fastest).toMatchObject({ name: 'Rápida', value: 100, adjusted: true });
  });
});

describe('agregadas por mes y colaboradores', () => {
  const at = (iso: string) => Date.parse(iso);
  it('cuenta por mes, resalta el que más y respeta el orden', () => {
    const r = computeAddedByMonth([
      t({ addedAt: at('2026-01-15T12:00:00') }),
      t({ addedAt: at('2026-03-10T12:00:00') }),
      t({ addedAt: at('2026-03-20T12:00:00') }),
    ]);
    expect(r?.list.map((m) => [m.label, m.count])).toEqual([['ene', 1], ['feb', 0], ['mar', 2]]);
    expect(r?.top).toMatchObject({ label: 'mar', count: 2 });
  });
  it('hasta un año de diferencia va mes por mes', () => {
    const tracks = Array.from({ length: 12 }, (_, i) => t({ addedAt: new Date(2025, i, 10, 12).getTime() }));
    const r = computeAddedByMonth(tracks);
    expect(r?.unit).toBe('month');
    expect(r?.list).toHaveLength(12);
  });
  it('con más de un año cuenta todo el historial, año por año', () => {
    const tracks = [
      ...Array.from({ length: 30 }, () => t({ addedAt: new Date(2022, 2, 10, 12).getTime() })),
      ...Array.from({ length: 30 }, () => t({ addedAt: new Date(2025, 2, 12, 12).getTime() })),
    ];
    const r = computeAddedByMonth(tracks);
    expect(r?.unit).toBe('year');
    expect(r?.list.map((y) => [y.label, y.count])).toEqual([['2022', 30], ['2023', 0], ['2024', 0], ['2025', 30]]);
    expect(r?.topMonth).toMatchObject({ label: 'mar', year: '2022', count: 30 });
  });
  it('el período con más canciones se resalta aunque no sea el último', () => {
    const tracks = [
      ...Array.from({ length: 3 }, () => t({ addedAt: new Date(2019, 5, 1, 12).getTime() })),
      t({ addedAt: new Date(2021, 0, 5, 12).getTime() }),
    ];
    const r = computeAddedByMonth(tracks);
    expect(r?.top).toMatchObject({ label: '2019', count: 3 });
  });
  it('con un solo mes (o sin fechas) no hay gráfico', () => {
    expect(computeAddedByMonth([t({ addedAt: at('2026-01-15T12:00:00') })])).toBeNull();
    expect(computeAddedByMonth([t({})])).toBeNull();
  });
  it('los colaboradores aparecen solo con más de 2 personas', () => {
    expect(computeInsights([t({ addedBy: 'a' }), t({ addedBy: 'b' })]).adders).toBeNull();
    const r = computeInsights([t({ addedBy: 'a' }), t({ addedBy: 'a' }), t({ addedBy: 'b' }), t({ addedBy: 'c' })]);
    expect(r.adders?.[0]).toEqual({ name: 'a', count: 2 });
  });
});

describe('destacadas', () => {
  it('elige la más bailable, acústica, enérgica y alegre (en porcentaje)', () => {
    const r = computeInsights([
      t({ name: 'A', danceability: 0.9, acousticness: 0.1, energy: 0.2, valence: 0.3 }),
      t({ name: 'B', danceability: 0.5, acousticness: 0.8, energy: 0.9, valence: 0.7 }),
    ]);
    const by = Object.fromEntries(r.highlights.map((h) => [h.id, h.song]));
    expect(by.danceable).toMatchObject({ name: 'A', value: 90 });
    expect(by.acoustic).toMatchObject({ name: 'B', value: 80 });
    expect(by.energetic?.name).toBe('B');
    expect(by.happy?.name).toBe('B');
  });
  it('no inventa destacadas si el valor es 0 o falta', () => {
    expect(computeInsights([t({ acousticness: 0 }), t({})]).highlights).toEqual([]);
  });
});
