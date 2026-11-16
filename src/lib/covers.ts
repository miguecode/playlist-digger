/**
 * Carátulas de las canciones, a partir del endpoint público oEmbed de Spotify (sin cuenta de desarrollador ni inicio de sesión).
 * Solo se piden las que se ven en pantalla, de a pocas a la vez, y se guardan mientras la pestaña esté abierta:
 * los términos de Spotify permiten cachear carátulas de forma temporal, no armar una base propia.
 */

const OEMBED = 'https://open.spotify.com/oembed?url=';
const TRACK_ID = /^[A-Za-z0-9]{22}$/;
const STORE_PREFIX = 'pv:cover:';

/** Solo se aceptan imágenes del CDN de Spotify, por https (la URL viene de un tercero). */
export function parseCover(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = (data as { thumbnail_url?: unknown }).thumbnail_url;
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && (url.hostname === 'scdn.co' || url.hostname.endsWith('.scdn.co'))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export interface CoverOptions {
  fetchFn?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Pedidos simultáneos como máximo. */
  concurrency?: number;
  timeoutMs?: number;
}

interface Job {
  id: string;
  wanted: () => boolean;
  resolve: (url: string | null | undefined) => void;
}

export class CoverLoader {
  private readonly cache = new Map<string, string | null>();
  private readonly pending = new Map<string, Promise<string | null | undefined>>();
  private readonly queue: Job[] = [];
  private active = 0;

  private readonly fetchFn: typeof fetch;
  private readonly storage: CoverOptions['storage'];
  private readonly concurrency: number;
  private readonly timeoutMs: number;

  constructor({ fetchFn, storage = null, concurrency = 4, timeoutMs = 8000 }: CoverOptions = {}) {
    this.fetchFn = fetchFn ?? ((input, init) => fetch(input, init));
    this.storage = storage;
    this.concurrency = concurrency;
    this.timeoutMs = timeoutMs;
  }

  /** Lo que ya se sabe: la URL, null si no hay carátula, o undefined si todavía no se pidió. */
  peek(trackId: string): string | null | undefined {
    if (this.cache.has(trackId)) return this.cache.get(trackId);
    const saved = this.read(trackId);
    if (saved) this.cache.set(trackId, saved);
    return saved ?? undefined;
  }

  /**
   * Pide la carátula. `wanted` se consulta justo antes de salir a la red: si el elemento ya no está en pantalla
   * (por ejemplo, se scrolleó rápido) el pedido se descarta y se resuelve con undefined, sin recordarlo.
   */
  request(trackId: string, wanted: () => boolean = () => true): Promise<string | null | undefined> {
    if (!TRACK_ID.test(trackId)) return Promise.resolve(null);
    const known = this.peek(trackId);
    if (known !== undefined) return Promise.resolve(known);
    const inFlight = this.pending.get(trackId);
    if (inFlight) return inFlight;

    const promise = new Promise<string | null | undefined>((resolve) => {
      this.queue.push({ id: trackId, wanted, resolve });
    }).finally(() => this.pending.delete(trackId));
    this.pending.set(trackId, promise);
    this.pump();
    return promise;
  }

  private pump(): void {
    while (this.active < this.concurrency) {
      const job = this.queue.shift();
      if (!job) return;
      if (!job.wanted()) {
        job.resolve(undefined);
        continue;
      }
      this.active++;
      void this.load(job.id).then((url) => {
        this.active--;
        job.resolve(url);
        this.pump();
      });
    }
  }

  private async load(trackId: string): Promise<string | null> {
    try {
      const target = `https://open.spotify.com/track/${trackId}`;
      const res = await this.fetchFn(`${OEMBED}${encodeURIComponent(target)}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!res.ok) throw new Error(`oEmbed ${res.status}`);
      const url = parseCover((await res.json()) as unknown);
      this.cache.set(trackId, url);
      if (url) this.write(trackId, url);
      return url;
    } catch {
      // Sin red, bloqueo o límite de Spotify: se muestra el ícono y no se insiste en esta sesión.
      this.cache.set(trackId, null);
      return null;
    }
  }

  private read(trackId: string): string | null {
    try {
      return parseCover({ thumbnail_url: this.storage?.getItem(STORE_PREFIX + trackId) });
    } catch {
      return null;
    }
  }

  private write(trackId: string, url: string): void {
    try {
      this.storage?.setItem(STORE_PREFIX + trackId, url);
    } catch {
      /* almacenamiento lleno o bloqueado: no pasa nada */
    }
  }
}
