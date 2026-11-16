import { describe, expect, it } from 'vitest';
import { CARD_GAP, CARD_MIN_W, gridMetrics } from './card-grid';

describe('gridMetrics', () => {
  it('siempre hay al menos una columna', () => {
    expect(gridMetrics(100, 10).cols).toBe(1);
    expect(gridMetrics(0, 10).cols).toBe(1);
  });

  it('calcula las columnas según el ancho', () => {
    expect(gridMetrics(CARD_MIN_W * 2 + CARD_GAP, 10).cols).toBe(2);
    expect(gridMetrics(CARD_MIN_W * 2 + CARD_GAP - 1, 10).cols).toBe(1);
  });

  it('calcula las filas (redondeando hacia arriba)', () => {
    expect(gridMetrics(CARD_MIN_W * 3 + CARD_GAP * 2, 7)).toEqual({ cols: 3, rows: 3 });
    expect(gridMetrics(500, 0).rows).toBe(0);
  });
});
