import { describe, expect, it } from 'vitest';
import {
  durationClass,
  fmtNumber,
  formatDay,
  formatDuration,
  formatReleaseDate,
  formatTotalDuration,
  keyLabel,
  pct,
} from './format';
import { makeTrack } from './test-utils';

describe('formatDuration', () => {
  it('muestra minutos y segundos', () => {
    expect(formatDuration(201621)).toBe('3:22');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('agrega horas cuando corresponde', () => {
    expect(formatDuration(3_723_000)).toBe('1:02:03');
  });
});

describe('formatTotalDuration', () => {
  it('usa la unidad que mejor se lee', () => {
    expect(formatTotalDuration(3_840_000)).toBe('1 h 4 min');
    expect(formatTotalDuration((58 * 60 + 12) * 1000)).toBe('58 min 12 s');
    expect(formatTotalDuration(45_000)).toBe('45 s');
  });
});

describe('fechas', () => {
  it('formatDay pasa de ISO a dd/mm/aaaa', () => {
    expect(formatDay('2026-07-14')).toBe('14/07/2026');
    expect(formatDay('otra cosa')).toBe('otra cosa');
  });

  it('formatReleaseDate respeta la precisión original', () => {
    expect(formatReleaseDate('2022')).toBe('2022');
    expect(formatReleaseDate('2022-07')).toBe('07/2022');
    expect(formatReleaseDate('2022-07-08')).toBe('08/07/2022');
  });
});

describe('keyLabel', () => {
  it('traduce nota y modo', () => {
    expect(keyLabel(6, 0)).toBe('Fa♯ menor');
    expect(keyLabel(0, 1)).toBe('Do mayor');
    expect(keyLabel(5, null)).toBe('Fa');
  });

  it('devuelve vacío si no se detectó', () => {
    expect(keyLabel(-1, 1)).toBe('');
    expect(keyLabel(null, null)).toBe('');
  });
});

describe('números', () => {
  it('fmtNumber usa formato argentino', () => {
    expect(fmtNumber(1234.5, 1)).toBe('1.234,5');
  });

  it('pct redondea a entero', () => {
    expect(pct(makeTrack({ danceability: 0.731 }), 'danceability')).toBe(73);
    expect(pct(makeTrack(), 'danceability')).toBeNull();
  });
});

describe('durationClass', () => {
  const m = (min: number, sec = 0): number => (min * 60 + sec) * 1000;
  it('clasifica por tramos', () => {
    expect(durationClass(m(1, 45))).toBe('short');
    expect(durationClass(m(3, 22))).toBe('medium');
    expect(durationClass(m(7, 10))).toBe('long');
    expect(durationClass(m(45))).toBe('podcast');
  });
  it('los límites pertenecen al tramo siguiente', () => {
    expect(durationClass(m(2, 29) + 999)).toBe('short');
    expect(durationClass(m(2, 30))).toBe('medium');
    expect(durationClass(m(5))).toBe('long');
    expect(durationClass(m(20))).toBe('podcast');
  });
});
