import { describe, expect, it } from 'vitest';
import { APP_NAME, shareText } from './app';

describe('shareText', () => {
  it('incluye el nombre de la playlist y el de la app', () => {
    expect(shareText('flo')).toBe(`¡Mira el resumen de mi Playlist "flo", generado por ${APP_NAME}!`);
  });
});
