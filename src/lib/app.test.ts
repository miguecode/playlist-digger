import { describe, expect, it } from 'vitest';
import { APP_NAME, APP_URL, shareText } from './app';

describe('shareText', () => {
  it('incluye el nombre de la playlist, el de la app y el link al sitio', () => {
    expect(shareText('flo')).toBe(`¡Mira el resumen de mi Playlist "flo", generado por ${APP_NAME}! ${APP_URL}`);
  });

  it('el link es https y apunta al dominio de la app', () => {
    expect(new URL(APP_URL).protocol).toBe('https:');
  });
});
