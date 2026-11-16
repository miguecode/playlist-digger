import { describe, expect, it, vi } from 'vitest';
import { CoverLoader, parseCover } from './covers';

const ID = '4cOdK2wGLETKBW3PvgPWqT';
const ID2 = '7ouMYWpwJ422jRcDASZB7P';
const ok = (url: string): Response => new Response(JSON.stringify({ thumbnail_url: url }), { status: 200 });

describe('parseCover', () => {
  it('acepta imágenes https del CDN de Spotify', () => {
    expect(parseCover({ thumbnail_url: 'https://i.scdn.co/image/abc' })).toBe('https://i.scdn.co/image/abc');
  });

  it('acepta el CDN actual de Spotify (spotifycdn.com)', () => {
    const url = 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e021925df742e08c0f40bd73208';
    expect(parseCover({ thumbnail_url: url })).toBe(url);
  });

  it.each([
    ['http', 'http://i.scdn.co/image/abc'],
    ['otro dominio', 'https://evil.example/x.png'],
    ['dominio parecido', 'https://scdn.co.evil.example/x.png'],
    ['sufijo engañoso', 'https://evilspotifycdn.com/x.png'],
    ['javascript:', 'javascript:alert(1)'],
    ['basura', 'no es una url'],
  ])('rechaza %s', (_name, url) => {
    expect(parseCover({ thumbnail_url: url })).toBeNull();
  });

  it('rechaza respuestas sin thumbnail_url', () => {
    expect(parseCover({})).toBeNull();
    expect(parseCover(null)).toBeNull();
    expect(parseCover({ thumbnail_url: 3 })).toBeNull();
  });
});

describe('CoverLoader', () => {
  it('pide la carátula una sola vez aunque se pida varias', async () => {
    const fetchFn = vi.fn(async () => ok('https://i.scdn.co/image/a'));
    const loader = new CoverLoader({ fetchFn });
    const [a, b] = await Promise.all([loader.request(ID), loader.request(ID)]);
    expect(a).toBe('https://i.scdn.co/image/a');
    expect(b).toBe(a);
    await loader.request(ID);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(loader.peek(ID)).toBe('https://i.scdn.co/image/a');
  });

  it('ante un error recuerda que no hay carátula y no insiste', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 429 }));
    const loader = new CoverLoader({ fetchFn });
    expect(await loader.request(ID)).toBeNull();
    expect(await loader.request(ID)).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('un fallo de red no rompe nada', async () => {
    const loader = new CoverLoader({ fetchFn: async () => Promise.reject(new TypeError('CORS')) });
    expect(await loader.request(ID)).toBeNull();
  });

  it('ignora IDs inválidos sin salir a la red', async () => {
    const fetchFn = vi.fn();
    const loader = new CoverLoader({ fetchFn });
    expect(await loader.request('../../x')).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('descarta los pedidos que ya no se ven, sin recordarlos', async () => {
    const fetchFn = vi.fn(async () => ok('https://i.scdn.co/image/a'));
    const loader = new CoverLoader({ fetchFn });
    expect(await loader.request(ID, () => false)).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(loader.peek(ID)).toBeUndefined();
    expect(await loader.request(ID)).toBe('https://i.scdn.co/image/a');
  });

  it('respeta el máximo de pedidos simultáneos', async () => {
    let running = 0;
    let peak = 0;
    const fetchFn = vi.fn(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return ok('https://i.scdn.co/image/a');
    });
    const loader = new CoverLoader({ fetchFn, concurrency: 2 });
    const ids = Array.from({ length: 6 }, (_, i) => `${ID.slice(0, 21)}${'abcdef'[i]}`);
    await Promise.all(ids.map((id) => loader.request(id)));
    expect(fetchFn).toHaveBeenCalledTimes(6);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('lo que se ve pasa antes que la precarga', async () => {
    const order: string[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      order.push(decodeURIComponent(String(input)).split('/track/')[1] ?? '');
      await new Promise((r) => setTimeout(r, 2));
      return ok('https://i.scdn.co/image/a');
    });
    const loader = new CoverLoader({ fetchFn, concurrency: 1 });
    const ids = ['a', 'b', 'c', 'd'].map((c) => `${ID.slice(0, 21)}${c}`);
    const jobs = [
      loader.request(ids[0] as string, () => true, false), // sale ya: hay un lugar libre
      loader.request(ids[1] as string, () => true, false),
      loader.request(ids[2] as string, () => true, false),
      loader.request(ids[3] as string), // urgente: se cuela antes de las precargas que esperan
    ];
    await Promise.all(jobs);
    expect(order[0]).toBe(ids[0]);
    expect(order[1]).toBe(ids[3]);
  });

  it('guarda y recupera desde el almacenamiento de la pestaña', async () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    await new CoverLoader({ fetchFn: async () => ok('https://i.scdn.co/image/a'), storage }).request(ID);
    const fetchFn = vi.fn();
    const again = new CoverLoader({ fetchFn, storage });
    expect(again.peek(ID)).toBe('https://i.scdn.co/image/a');
    expect(again.peek(ID2)).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('descarta valores sospechosos guardados', () => {
    const storage = { getItem: () => 'https://evil.example/x.png', setItem: () => undefined };
    expect(new CoverLoader({ storage }).peek(ID)).toBeUndefined();
  });
});
