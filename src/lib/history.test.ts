import { describe, expect, it } from 'vitest';
import { timeAgo } from './format';
import { historyId, historySummary, planSave, type HistoryEntry } from './history';

const entry = (id: string, savedAt: number, tracks = 10): HistoryEntry => ({ id, name: id, savedAt, tracks, durationMs: 1000 });

describe('historyId', () => {
  it('ignora mayúsculas, tildes y espacios de más', () => {
    expect(historyId('Rock  Int')).toBe('rock int');
    expect(historyId('  ROCK int ')).toBe('rock int');
    expect(historyId('Canción')).toBe('cancion');
  });
  it('un nombre vacío no rompe', () => {
    expect(historyId('   ')).toBe('playlist');
  });
});

describe('planSave', () => {
  it('pone la nueva primera', () => {
    const { kept } = planSave([entry('a', 1), entry('b', 2)], entry('c', 3));
    expect(kept.map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });
  it('si ya existe la reemplaza, sin duplicarla ni contarla como descartada', () => {
    const { kept, evicted } = planSave([entry('a', 1), entry('b', 2)], entry('a', 9, 99));
    expect(kept.map((e) => e.id)).toEqual(['a', 'b']);
    expect(kept[0]?.tracks).toBe(99);
    expect(evicted).toEqual([]);
  });
  it('al pasar el máximo descarta las más viejas', () => {
    const { kept, evicted } = planSave([entry('a', 1), entry('b', 2), entry('c', 3)], entry('d', 4), 3);
    expect(kept.map((e) => e.id)).toEqual(['d', 'c', 'b']);
    expect(evicted).toEqual(['a']);
  });
});

describe('timeAgo / historySummary', () => {
  const now = Date.UTC(2026, 10, 15, 12, 0, 0);
  it('formatea en español', () => {
    expect(timeAgo(now - 20_000, now)).toBe('recién');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('hace 5 minutos');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('hace 3 horas');
    expect(timeAgo(now - 86_400_000, now)).toBe('ayer');
    expect(timeAgo(now - 3 * 86_400_000, now)).toBe('hace 3 días');
    expect(timeAgo(now - 60 * 86_400_000, now)).toBe('hace 2 meses');
  });
  it('resume cantidad y antigüedad, con singular', () => {
    expect(historySummary(entry('a', now - 3 * 86_400_000, 1200), now)).toBe('1.200 canciones · hace 3 días');
    expect(historySummary(entry('a', now, 1), now)).toBe('1 canción · recién');
  });
});
