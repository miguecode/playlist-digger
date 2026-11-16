import { describe, expect, it } from 'vitest';
import { CsvError, normalizeRelease, parseCsv } from './csv';

// Exportify real, recortado a lo justo: BOM en el primer encabezado, comillas y varios artistas/géneros.
const HEADER =
  '\uFEFFTrack URI,ISRC,Track Name,Album Name,Artist Name(s),Release Date,Duration (ms),Popularity,Explicit,Added By,Added At,Genres,Record Label,Danceability,Energy,Key,Loudness,Mode,Speechiness,Acousticness,Instrumentalness,Liveness,Valence,Tempo,Time Signature';
const SAMPLE = [
  HEADER,
  'spotify:track:1CcorUngVSo7k2GX8GLB53,GBUM72204191,"Feature Me","The Lead","Artista Uno",2022-07-08,201621,50,false,usuario-demo,2026-08-06T16:39:13Z,"género uno","Sello Uno",0.731,0.493,6,-4.96,0,0.0581,0.116,0.00000832,0.0619,0.852,127.03,4',
  'spotify:track:36V3yQnFlfRarXVJbh17lE,GBUM72306256,"Pretty Eyes","Otro Álbum","Colab;Artista Uno",2023-07-03,176938,41,false,usuario-demo,2026-07-14T02:37:53Z,"género dos,género uno","Sello Dos",0.49,0.631,1,-5.612,1,0.0854,0.307,0,0.0928,0.631,71.593,3',
].join('\n');

describe('parseCsv con un CSV de Exportify', () => {
  const tracks = parseCsv(SAMPLE);

  it('lee todas las canciones, aunque el primer encabezado traiga BOM', () => {
    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.uri).toBe('spotify:track:1CcorUngVSo7k2GX8GLB53');
  });

  it('convierte los campos a su tipo', () => {
    expect(tracks[0]).toMatchObject({
      position: 1,
      trackId: '1CcorUngVSo7k2GX8GLB53',
      name: 'Feature Me',
      album: 'The Lead',
      artists: ['Artista Uno'],
      releaseDate: '2022-07-08',
      durationMs: 201621,
      popularity: 50,
      explicit: false,
      genres: ['género uno'],
      tempo: 127.03,
      key: 6,
      mode: 0,
      timeSignature: 4,
    });
    expect(tracks[0]?.addedAt).toBe(Date.parse('2026-08-06T16:39:13Z'));
  });

  it('separa varios artistas (;) y varios géneros (,)', () => {
    expect(tracks[1]?.artists).toEqual(['Colab', 'Artista Uno']);
    expect(tracks[1]?.genres).toEqual(['género dos', 'género uno']);
  });
});

describe('parseCsv con casos límite', () => {
  it('rechaza archivos que no son de Exportify', () => {
    expect(() => parseCsv('a,b\n1,2\n')).toThrow(CsvError);
  });

  it('avisa si no hay canciones', () => {
    expect(() => parseCsv('Track URI,Track Name\n')).toThrow('no tiene canciones');
  });

  it('acepta el BOM suelto y campos con comas entre comillas', () => {
    const [t] = parseCsv('﻿Track URI,Track Name\nspotify:track:abc123,"Hola, mundo"\n');
    expect(t?.name).toBe('Hola, mundo');
  });

  it('deja en null los números vacíos en vez de convertirlos en 0', () => {
    const [t] = parseCsv('Track URI,Track Name,Popularity\nspotify:track:abc123,X,\n');
    expect(t?.popularity).toBeNull();
  });

  it('no arma enlace para archivos locales', () => {
    const [t] = parseCsv('Track URI,Track Name\nspotify:local:a:b:c:1,X\n');
    expect(t?.trackId).toBeNull();
  });

  it('no deja pasar IDs con caracteres raros', () => {
    const [t] = parseCsv('Track URI,Track Name\nspotify:track:abc"><script>,X\n');
    expect(t?.trackId).toBeNull();
  });
});

describe('normalizeRelease', () => {
  it('completa mes y día faltantes', () => {
    expect(normalizeRelease('2022')).toBe('2022-01-01');
    expect(normalizeRelease('2022-07')).toBe('2022-07-01');
    expect(normalizeRelease('2022-07-08')).toBe('2022-07-08');
  });

  it('devuelve null si no es una fecha', () => {
    expect(normalizeRelease('')).toBeNull();
    expect(normalizeRelease('ayer')).toBeNull();
  });
});

describe('valores en 0 que en realidad son «sin dato»', () => {
  const header = 'Track URI,Track Name,Popularity,Danceability,Energy,Key,Loudness,Mode,Speechiness,Acousticness,Instrumentalness,Liveness,Valence,Tempo,Time Signature';
  const row = (name: string, values: string) => `spotify:track:AAAAAAAAAAAAAAAAAAAAAA,${name},${values}`;

  it('si todas las medidas de audio vienen en 0, la canción queda sin datos de audio', () => {
    const [t] = parseCsv([header, row('A', '40,0,0,0,0,0,0,0,0,0,0,0,0')].join('\n'));
    expect(t).toMatchObject({ popularity: 40, danceability: null, energy: null, key: null, tempo: null, timeSignature: null });
  });

  it('una canción con audio real conserva sus valores, incluso un 0 legítimo', () => {
    const [t] = parseCsv([header, row('A', '40,0.5,0.7,0,-5.2,1,0,0.1,0,0.1,0.4,120,4')].join('\n'));
    expect(t).toMatchObject({ key: 0, speechiness: 0, instrumentalness: 0, tempo: 120, timeSignature: 4 });
  });

  it('una popularidad en 0 se considera sin información', () => {
    const tracks = parseCsv([header, row('A', '0,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4'), row('B', '0,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4')].join('\n'));
    expect(tracks.map((t) => t.popularity)).toEqual([null, null]);
  });

  it('solo se anulan los 0: las demás popularidades se conservan', () => {
    const tracks = parseCsv([header, row('A', '0,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4'), row('B', '55,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4')].join('\n'));
    expect(tracks.map((t) => t.popularity)).toEqual([null, 55]);
  });
});
