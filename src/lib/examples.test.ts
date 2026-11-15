import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';
import { EXAMPLES, exampleSummary, exampleUrl } from './examples';

const read = (id: string) => parseCsv(readFileSync(`public/examples/${id}.csv`, 'utf8'));

describe('playlists de ejemplo', () => {
  it('arma la URL respetando la base', () => {
    expect(exampleUrl({ id: 'pop' }, '/')).toBe('/examples/pop.csv');
    expect(exampleUrl({ id: 'a b' }, '/app/')).toBe('/app/examples/a%20b.csv');
  });

  it('los ids y los títulos son únicos', () => {
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length);
    expect(new Set(EXAMPLES.map((e) => e.title)).size).toBe(EXAMPLES.length);
  });

  it('el resumen muestra la cantidad y dos intérpretes', () => {
    expect(exampleSummary(EXAMPLES[0]!)).toBe('193 canciones · Dua Lipa, Doja Cat y más');
  });

  it.each(EXAMPLES.map((e) => [e.id, e]))('«%s» existe, es válido y coincide con lo que dice la tarjeta', (_id, example) => {
    const tracks = read(example.id);
    expect(tracks).toHaveLength(example.tracks);
    const artists = new Set(tracks.flatMap((t) => t.artists));
    for (const name of example.artists) expect(artists.has(name), name).toBe(true);
  });

  it('no incluyen usuarios reales en «Added By»', () => {
    for (const { id } of EXAMPLES) {
      expect(read(id).every((t) => t.addedBy === '' || t.addedBy === '31kzfm4wqpgv2v2cf3s7lyxuo4ke'), id).toBe(true);
    }
  });
});
