import { describe, expect, it } from 'vitest';
import { albumUrl, artistUrl, labelUrl, searchUrl } from './spotify';

describe('enlaces de búsqueda en Spotify', () => {
  it('codifica el texto y apunta siempre a open.spotify.com', () => {
    expect(artistUrl('Kanye West')).toBe('https://open.spotify.com/search/Kanye%20West');
    expect(artistUrl('Guns N\' Roses & más/otros?')).toBe(
      'https://open.spotify.com/search/Guns%20N\'%20Roses%20%26%20m%C3%A1s%2Fotros%3F',
    );
  });

  it('no se puede inyectar otro destino desde el CSV', () => {
    const url = new URL(artistUrl('https://evil.example/ ../x')!);
    expect(url.origin).toBe('https://open.spotify.com');
    expect(url.pathname.startsWith('/search/')).toBe(true);
  });

  it('álbum: suma el artista cuando hay', () => {
    expect(albumUrl('Graduation', 'Kanye West')).toBe('https://open.spotify.com/search/Graduation%20Kanye%20West');
    expect(albumUrl('Graduation')).toBe('https://open.spotify.com/search/Graduation');
  });

  it('sello: usa el filtro label: y descarta comillas', () => {
    expect(labelUrl('Shady Records')).toBe('https://open.spotify.com/search/label%3A%22Shady%20Records%22');
    expect(labelUrl('Say "Hi" Records')).toBe('https://open.spotify.com/search/label%3A%22Say%20Hi%20Records%22');
  });

  it('sin texto no hay enlace', () => {
    expect(searchUrl('   ')).toBeNull();
    expect(labelUrl('""')).toBeNull();
    expect(albumUrl('')).toBeNull();
  });
});
