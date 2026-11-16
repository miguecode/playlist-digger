import type { Track } from '../types';
import { DURATION_LIMITS, durationClass, type DurationClass } from './format';

/** Un elemento de un ranking (artista, género o álbum) y cuántas canciones lo tienen. */
export interface Ranked {
  name: string;
  count: number;
  /** Texto de apoyo (por ejemplo, el artista de un álbum). */
  detail?: string;
}

/** Una canción destacada con el valor que la destaca (popularidad, duración o año). */
export interface TrackRef {
  name: string;
  artist: string;
  value: number;
}

/** Título corto + frase para mostrar en las tarjetas del resumen. */
export interface Verdict {
  label: string;
  text: string;
}

export interface Decade {
  decade: number;
  label: string;
  count: number;
}

export interface Insights {
  trackCount: number;
  totalDurationMs: number;
  distinctArtists: number;
  /** Porcentaje (0–100) de canciones explícitas entre las que tienen el dato; null si no hay datos. */
  explicitShare: number | null;
  topArtists: Ranked[];
  topGenres: Ranked[];
  topAlbums: Ranked[];
  popularity: {
    average: number;
    /** Cuántas canciones traen el dato. */
    known: number;
    /** Porcentaje de las que lo traen con 70 o más. */
    hitsShare: number;
    top: TrackRef;
    verdict: Verdict;
  } | null;
  audio: {
    danceability: number | null;
    energy: number | null;
    valence: number | null;
    mood: Verdict | null;
    dance: Verdict | null;
  } | null;
  tempo: { average: number; min: number; max: number; verdict: Verdict } | null;
  duration: {
    averageMs: number;
    longest: TrackRef;
    shortest: TrackRef;
    byClass: Record<DurationClass, number>;
    verdict: Verdict;
  } | null;
  decades: { list: Decade[]; favorite: Decade; oldest: TrackRef; newest: TrackRef; verdict: Verdict } | null;
  /** Etiquetas cortas que resumen la playlist, para la cabecera. */
  tags: string[];
}

// ───────────────────────── Frases según los números ─────────────────────────

export function popularityVerdict(average: number): Verdict {
  if (average >= 75) return { label: 'Pura fama', text: '¡Tu playlist está llena de hits! Casi todo lo que escuchás lo conoce medio mundo.' };
  if (average >= 60) return { label: 'Muy popular', text: '¡Tus canciones son muy populares! Mezclás hits con algún que otro tesoro.' };
  if (average >= 45) return { label: 'Equilibrada', text: 'Ni puro hit ni puro under: un buen balance entre lo conocido y lo que no tanto.' };
  if (average >= 30) return { label: 'Con onda edgy', text: 'Tu playlist es bastante edgy: escuchás cosas que no conoce todo el mundo.' };
  return { label: 'Súper under', text: '¡Muy edgy! Casi nadie más escucha lo que tenés en esta playlist.' };
}

export function moodVerdict(energy: number, valence: number): Verdict {
  if (energy >= 60 && valence >= 50) return { label: 'Fiesta total', text: 'Energía y buena onda: música para arrancar el día o prender la noche.' };
  if (energy >= 60) return { label: 'Intensa', text: 'Mucha energía con un tono más oscuro: ideal para descargar.' };
  if (valence >= 50) return { label: 'Buena vibra', text: 'Alegre y sin apuro: ideal para acompañar el día.' };
  return { label: 'Melancólica', text: 'Tranquila y con sentimiento: para escuchar con calma.' };
}

export function danceVerdict(danceability: number): Verdict {
  if (danceability >= 70) return { label: 'Para bailar', text: 'Pensada para mover el cuerpo toda la noche.' };
  if (danceability >= 55) return { label: 'Se deja bailar', text: 'Tiene ritmo para animarse a bailar.' };
  return { label: 'Para escuchar', text: 'Más para escuchar con atención que para bailar.' };
}

export function tempoVerdict(average: number): Verdict {
  if (average < 90) return { label: 'Ritmo tranquilo', text: 'Temas lentos y relajados.' };
  if (average < 120) return { label: 'Ritmo medio', text: 'Un pulso cómodo, ideal para caminar.' };
  if (average < 140) return { label: 'Ritmo movido', text: 'Temas con pulso rápido que dan ganas de moverse.' };
  return { label: 'Ritmo acelerado', text: '¡Playlist a mil por hora!' };
}

export function durationVerdict(averageMs: number): Verdict {
  if (averageMs < 165_000) return { label: 'Temas cortitos', text: 'Vas al hueso: canciones que no se hacen largas.' };
  if (averageMs <= DURATION_LIMITS.medium) return { label: 'Duración clásica', text: 'La medida de una canción de radio.' };
  return { label: 'Temas largos', text: 'Te gusta que las canciones se tomen su tiempo.' };
}

// ───────────────────────── Cálculo ─────────────────────────

function ranked(counts: Map<string, number>, limit: number, detail?: Map<string, string>): Ranked[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, limit)
    .map(([name, count]) => {
      const extra = detail?.get(name);
      return extra ? { name, count, detail: extra } : { name, count };
    });
}

const bump = (counts: Map<string, number>, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

const mean = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;

const ref = (t: Track, value: number): TrackRef => ({ name: t.name, artist: t.artists[0] ?? '', value });

/** Extremo (mayor o menor) de una lista de canciones según un valor numérico. */
function extreme(tracks: readonly Track[], value: (t: Track) => number | null, pick: 'max' | 'min'): TrackRef | null {
  let best: { t: Track; v: number } | null = null;
  for (const t of tracks) {
    const v = value(t);
    if (v === null) continue;
    if (!best || (pick === 'max' ? v > best.v : v < best.v)) best = { t, v };
  }
  return best ? ref(best.t, best.v) : null;
}

const yearOf = (t: Track): number | null => (t.releaseDate ? Number(t.releaseDate.slice(0, 4)) : null);

export function computeInsights(tracks: readonly Track[]): Insights {
  const artists = new Map<string, number>();
  const genres = new Map<string, number>();
  const albums = new Map<string, number>();
  const albumArtist = new Map<string, string>();
  for (const t of tracks) {
    for (const name of new Set(t.artists)) bump(artists, name);
    for (const name of new Set(t.genres)) bump(genres, name);
    if (t.album) {
      bump(albums, t.album);
      if (!albumArtist.has(t.album) && t.artists[0]) albumArtist.set(t.album, t.artists[0]);
    }
  }

  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);

  const explicitKnown = tracks.filter((t) => t.explicit !== null);
  const explicitShare =
    explicitKnown.length === 0 ? null : Math.round((explicitKnown.filter((t) => t.explicit).length / explicitKnown.length) * 100);

  // Popularidad
  const pops = tracks.map((t) => t.popularity).filter((v): v is number => v !== null);
  const topPop = extreme(tracks, (t) => t.popularity, 'max');
  const popAverage = mean(pops);
  const popularity =
    popAverage !== null && topPop
      ? {
          average: Math.round(popAverage),
          known: pops.length,
          hitsShare: Math.round((pops.filter((v) => v >= 70).length / pops.length) * 100),
          top: topPop,
          verdict: popularityVerdict(popAverage),
        }
      : null;

  // Audio
  const avgPct = (pick: (t: Track) => number | null): number | null => {
    const m = mean(tracks.map(pick).filter((v): v is number => v !== null));
    return m === null ? null : Math.round(m * 100);
  };
  const danceability = avgPct((t) => t.danceability);
  const energy = avgPct((t) => t.energy);
  const valence = avgPct((t) => t.valence);
  const audio =
    danceability === null && energy === null && valence === null
      ? null
      : {
          danceability,
          energy,
          valence,
          mood: energy !== null && valence !== null ? moodVerdict(energy, valence) : null,
          dance: danceability !== null ? danceVerdict(danceability) : null,
        };

  // Tempo (un BPM de 0 es un dato faltante)
  const bpms = tracks.map((t) => t.tempo).filter((v): v is number => v !== null && v > 0);
  const bpmAverage = mean(bpms);
  const tempo =
    bpmAverage === null
      ? null
      : { average: Math.round(bpmAverage), min: Math.round(Math.min(...bpms)), max: Math.round(Math.max(...bpms)), verdict: tempoVerdict(bpmAverage) };

  // Duración
  const durations = tracks.map((t) => t.durationMs).filter((v): v is number => v !== null && v > 0);
  const longest = extreme(tracks, (t) => t.durationMs, 'max');
  const shortest = extreme(tracks, (t) => t.durationMs, 'min');
  const durAverage = mean(durations);
  const byClass: Record<DurationClass, number> = { short: 0, medium: 0, long: 0, podcast: 0 };
  for (const ms of durations) byClass[durationClass(ms)] += 1;
  const duration =
    durAverage === null || !longest || !shortest
      ? null
      : { averageMs: durAverage, longest, shortest, byClass, verdict: durationVerdict(durAverage) };

  // Épocas
  const years = tracks.map(yearOf).filter((v): v is number => v !== null && Number.isFinite(v));
  let decades: Insights['decades'] = null;
  const oldest = extreme(tracks, (t) => yearOf(t), 'min');
  const newest = extreme(tracks, (t) => yearOf(t), 'max');
  if (years.length > 0 && oldest && newest) {
    const counts = new Map<number, number>();
    for (const y of years) counts.set(Math.floor(y / 10) * 10, (counts.get(Math.floor(y / 10) * 10) ?? 0) + 1);
    const first = Math.min(...counts.keys());
    const last = Math.max(...counts.keys());
    const list: Decade[] = [];
    for (let d = first; d <= last; d += 10) list.push({ decade: d, label: `${d}s`, count: counts.get(d) ?? 0 });
    const favorite = [...list].sort((a, b) => b.count - a.count || b.decade - a.decade)[0];
    if (favorite) {
      const share = Math.round((favorite.count / years.length) * 100);
      decades = {
        list,
        favorite,
        oldest,
        newest,
        verdict: { label: `Los ${favorite.label}`, text: `Tu playlist vive en los ${favorite.label}: ${share}% de las canciones son de esa década.` },
      };
    }
  }

  const tags: string[] = [];
  if (popularity) tags.push(popularity.verdict.label);
  if (audio?.mood) tags.push(audio.mood.label);
  if (audio?.dance && (audio.danceability ?? 0) >= 70) tags.push(audio.dance.label);
  if (tempo) tags.push(tempo.verdict.label);
  if (decades) tags.push(decades.verdict.label);

  return {
    trackCount: tracks.length,
    totalDurationMs,
    distinctArtists: artists.size,
    explicitShare,
    topArtists: ranked(artists, 10),
    topGenres: ranked(genres, 5),
    topAlbums: ranked(albums, 5, albumArtist),
    popularity,
    audio,
    tempo,
    duration,
    decades,
    tags: tags.slice(0, 5),
  };
}
