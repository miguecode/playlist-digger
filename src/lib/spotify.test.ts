import { describe, expect, it } from 'vitest';
import { albumUrl, artistUrl, labelUrl, likelyOwner, playlistUrl, searchUrl } from './spotify';

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

describe('playlistUrl', () => {
  it('busca el nombre en la pestaña de playlists, codificado', () => {
    expect(playlistUrl(' Rap & Trap/90 ')).toBe('https://open.spotify.com/search/Rap%20%26%20Trap%2F90/playlists');
  });
  it('sin nombre → null', () => {
    expect(playlistUrl('   ')).toBeNull();
  });
});

describe('playlistUrl con dueño', () => {
  it('suma el dueño a la búsqueda', () => {
    expect(playlistUrl('Rap', 'migue')).toBe('https://open.spotify.com/search/Rap%20migue/playlists');
  });
  it('sin nombre pero con dueño sigue buscando por el dueño; sin ambos → null', () => {
    expect(playlistUrl(' ', null)).toBeNull();
  });
});

describe('likelyOwner', () => {
  it('elige a quien más agregó', () => {
    expect(likelyOwner(['ana', 'migue', 'migue', '', 'ana', 'migue'])).toBe('migue');
  });
  it('quita el prefijo spotify:user:', () => {
    expect(likelyOwner(['spotify:user:migue', 'spotify:user:migue'])).toBe('migue');
  });
  it('sin datos (playlists de Spotify) → null', () => {
    expect(likelyOwner(['', ''])).toBeNull();
    expect(likelyOwner([])).toBeNull();
  });
  it('acepta el ID largo que Exportify da para algunas cuentas', () => {
    expect(likelyOwner(['31kzfm4wqpgv2v2cf3s7lyxuo4ke'])).toBe('31kzfm4wqpgv2v2cf3s7lyxuo4ke');
  });
  it('un usuario corto con números sigue valiendo', () => {
    expect(likelyOwner(['migue123'])).toBe('migue123');
  });
});
