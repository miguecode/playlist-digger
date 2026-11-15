import { describe, expect, it } from 'vitest';
import { chipsThatFit } from './chips';

describe('chipsThatFit', () => {
  it('muestra todas si entran', () => {
    expect(chipsThatFit([50, 60, 70], 300, 6, 44)).toBe(3);
  });

  it('justo al límite todavía entran todas (no hace falta «+N»)', () => {
    expect(chipsThatFit([50, 60, 70], 50 + 6 + 60 + 6 + 70, 6, 44)).toBe(3);
  });

  it('si no entran todas, deja lugar para el «+N»', () => {
    // 50 + 6 + 60 = 116, más 44 de reserva = 160 > 150 → entra solo una
    expect(chipsThatFit([50, 60, 70, 80], 150, 6, 44)).toBe(1);
    // 50 + 6 + 60 + 44 = 160 <= 170 → entran dos
    expect(chipsThatFit([50, 60, 70, 80], 170, 6, 44)).toBe(2);
  });

  it('siempre muestra al menos una, aunque no entre', () => {
    expect(chipsThatFit([500, 60], 100, 6, 44)).toBe(1);
  });

  it('sin etiquetas no muestra nada', () => {
    expect(chipsThatFit([], 100)).toBe(0);
  });
});
