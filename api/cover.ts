/**
 * Función de Vercel: pide la carátula de una canción al oEmbed público de Spotify y devuelve solo el dato necesario.
 * Se hace desde el servidor porque oEmbed no envía cabeceras CORS de forma confiable (el navegador lo bloquea).
 * No guarda nada: solo deja que la CDN de Vercel conserve la respuesta una hora.
 */
const TRACK_ID = /^[A-Za-z0-9]{22}$/;

const json = (body: unknown, status = 200, cache = 'public, s-maxage=3600, stale-while-revalidate=600'): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  });

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  if (!TRACK_ID.test(id)) return json({ error: 'id inválido' }, 400, 'no-store');

  try {
    const upstream = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`,
      { signal: AbortSignal.timeout(6000), headers: { accept: 'application/json' } },
    );
    const data: unknown = await upstream.json().catch(() => null);
    if (params.get('debug') === '1') {
      return json(
        {
          status: upstream.status,
          cors: upstream.headers.get('access-control-allow-origin'),
          keys: data && typeof data === 'object' ? Object.keys(data) : null,
          thumbnail_url: (data as { thumbnail_url?: unknown } | null)?.thumbnail_url ?? null,
        },
        200,
        'no-store',
      );
    }
    if (!upstream.ok) return json({ thumbnail_url: null }, 200, 'public, s-maxage=60');
    const url = (data as { thumbnail_url?: unknown } | null)?.thumbnail_url;
    return json({ thumbnail_url: typeof url === 'string' ? url : null });
  } catch {
    return json({ thumbnail_url: null }, 200, 'no-store');
  }
}
