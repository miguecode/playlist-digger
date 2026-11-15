import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';
import { EXAMPLES, exampleUrl } from './examples';

describe('playlists de ejemplo', () => {
  it('arma la URL respetando la base', () => {
    expect(exampleUrl({ id: 'flo', title: 'flo', description: '' }, '/')).toBe('/examples/flo.csv');
    expect(exampleUrl({ id: 'a b', title: '', description: '' }, '/app/')).toBe('/app/examples/a%20b.csv');
  });

  it('los ids son únicos', () => {
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length);
  });

  it.each(EXAMPLES.map((e) => [e.id]))('«%s» existe y es un CSV válido', (id) => {
    const text = readFileSync(`public/examples/${id}.csv`, 'utf8');
    expect(parseCsv(text).length).toBeGreaterThan(0);
  });

  it('no incluyen datos personales en «Added By»', () => {
    for (const { id } of EXAMPLES) {
      const text = readFileSync(`public/examples/${id}.csv`, 'utf8');
      const tracks = parseCsv(text);
      expect(tracks.every((t) => t.addedBy === '' || t.addedBy === 'usuario-demo')).toBe(true);
    }
  });
});
