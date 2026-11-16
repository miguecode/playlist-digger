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
  /** Solo para el BPM: el valor se corrigió porque parecía contado al doble o a la mitad. */
  adjusted?: boolean;
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

export interface Highlight {
  id: 'danceable' | 'acoustic' | 'energetic' | 'happy';
  title: string;
  song: TrackRef;
}

export interface AddedByMonth {
  /** Del mes más viejo al más nuevo (máximo 12, los últimos). */
  list: { label: string; year: string; count: number }[];
  top: { label: string; year: string; count: number };
  /** Cuántos meses con datos quedaron afuera por antigüedad. */
  hidden: number;
}

export interface GenreFlavor {
  /** El género tal como viene en el CSV. */
  name: string;
  /** Qué suele pasar con la vibra en ese tipo de música. */
  note: string;
}

export interface Tonality {
  /** Tonalidad más repetida (nota + modo) y cuántas canciones la tienen. */
  favorite: { name: string; count: number };
  /** Cuántas canciones tienen cada nota (0 = Do … 11 = Si), sin importar el modo. */
  perKey: { label: string; count: number }[];
  /** Nota de la tonalidad favorita (para resaltarla en el gráfico). */
  favoriteKey: number;
  /** Porcentaje (0–100) de canciones en modo mayor. */
  majorShare: number;
  known: number;
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
    /** Género más repetido y lo que suele esperarse de él; null si no hay géneros. */
    genre: GenreFlavor | null;
    tonality: Tonality | null;
  } | null;
  /** Las canciones más populares (hasta 10). */
  topSongs: TrackRef[];
  /** Canciones que más se destacan en un rasgo de audio (valor en porcentaje); null si no hay datos. */
  highlights: Highlight[];
  /** Quiénes agregaron más canciones; solo si hubo más de 2 colaboradores. */
  adders: Ranked[] | null;
  /** Cuántas canciones se agregaron en cada mes; null si hay menos de 2 meses con datos. */
  addedByMonth: AddedByMonth | null;
  tempo: {
    average: number;
    /** Cuántas canciones tenían un BPM dudoso (al doble o a la mitad) y se corrigieron. */
    adjusted: number;
    min: number;
    max: number;
    fastest: TrackRef;
    slowest: TrackRef;
    /** Canciones por tramo de BPM, de lento a rápido. */
    buckets: { label: string; count: number }[];
    verdict: Verdict;
  } | null;
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
  if (average >= 75) return { label: 'Súper mainstream', text: '¡Tu playlist está llena de hits! Casi todo lo que escuchás lo conoce medio mundo.' };
  if (average >= 60) return { label: 'Bastante mainstream', text: '¡Tus canciones son muy populares! Mezclás hits con algún que otro tesoro.' };
  if (average >= 45) return { label: 'Equilibrada', text: 'Ni puro hit ni puro under: un buen balance entre lo conocido y lo que no tanto.' };
  if (average >= 30) return { label: 'Un poco edgy', text: 'Escuchás cosas que no conoce todo el mundo: tu playlist tiene su toque edgy.' };
  return { label: 'Muy edgy', text: '¡Casi nadie más escucha lo que tenés en esta playlist!' };
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

/** Notas en español, indexadas como en Spotify (0 = Do … 11 = Si). */
export const KEY_NAMES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'] as const;

/**
 * Qué se espera de la vibra según el género dominante. Está escrito a mano a propósito:
 * se busca el primer grupo cuyas palabras aparezcan en el nombre del género.
 */
const GENRE_NOTES: readonly { words: readonly string[]; note: string }[] = [
  { words: ['hip hop', 'rap', 'trap', 'drill'], note: 'En el rap y el hip hop la positividad suele ser baja y las letras muy habladas: es parte del género, no un mal ánimo.' },
  { words: ['reggaeton', 'urbano', 'dembow', 'latin'], note: 'Es música hecha para bailar: la bailabilidad alta es lo esperable.' },
  { words: ['cumbia', 'cuarteto', 'salsa', 'merengue', 'bachata', 'tropical'], note: 'Ritmo y fiesta por definición: se espera mucha bailabilidad y buena onda.' },
  { words: ['metal', 'punk', 'hardcore', 'grunge', 'hard rock'], note: 'Géneros de mucha energía y tono oscuro: la positividad baja no es tristeza, es actitud.' },
  { words: ['rock'], note: 'El rock suele tener bastante energía y una positividad más bien media.' },
  { words: ['electr', 'house', 'techno', 'edm', 'dance', 'trance'], note: 'Música electrónica: energía y bailabilidad suelen ir arriba, con poca letra.' },
  { words: ['r&b', 'soul', 'funk'], note: 'El r&b y el soul combinan ritmo con un tono más sensual y relajado.' },
  { words: ['jazz', 'blues', 'clasic', 'classical', 'ambient', 'lo-fi', 'lofi', 'chill', 'acoust', 'folk', 'bolero'], note: 'Género tranquilo: la energía baja es lo normal acá.' },
  { words: ['indie', 'alternativ'], note: 'El indie y lo alternativo suelen moverse entre lo melancólico y lo soñador.' },
  { words: ['pop'], note: 'El pop busca gustar: suele andar parejo en energía, ritmo y buen ánimo.' },
];

export function genreFlavor(genre: string): GenreFlavor {
  const g = genre.toLowerCase();
  const match = GENRE_NOTES.find((group) => group.words.some((w) => g.includes(w)));
  return match ? { name: genre, note: match.note } : { name: genre, note: '' };
}

/** Tonalidad más repetida y reparto mayor/menor. Spotify usa key −1 y mode vacío cuando no hay dato. */
export function computeTonality(tracks: readonly Track[]): Tonality | null {
  const combos = new Map<string, number>();
  const perKey = KEY_NAMES.map((label) => ({ label, count: 0 }));
  let major = 0;
  let known = 0;
  for (const t of tracks) {
    const key = t.key;
    const mode = t.mode;
    if (key === null || mode === null || !Number.isInteger(key) || key < 0 || key > 11 || (mode !== 0 && mode !== 1)) continue;
    known += 1;
    if (mode === 1) major += 1;
    (perKey[key] as { count: number }).count += 1;
    const id = `${key}:${mode}`;
    combos.set(id, (combos.get(id) ?? 0) + 1);
  }
  if (known === 0) return null;
  const [best] = [...combos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!best) return null;
  const [keyText, modeText] = best[0].split(':');
  const key = Number(keyText);
  return {
    favorite: { name: `${KEY_NAMES[key]} ${modeText === '1' ? 'mayor' : 'menor'}`, count: best[1] },
    perKey,
    favoriteKey: key,
    majorShare: Math.round((major / known) * 100),
    known,
  };
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

/** Tramos de BPM para el histograma: <80, 80–99, 100–119, 120–139, 140–159 y 160+. */
export function tempoBuckets(bpms: readonly number[]): { label: string; count: number }[] {
  const edges = [80, 100, 120, 140, 160];
  const buckets = [`<${edges[0]}`, ...edges.slice(0, -1).map((e, i) => `${e}–${(edges[i + 1] ?? 0) - 1}`), `${edges[edges.length - 1]}+`].map((label) => ({ label, count: 0 }));
  for (const bpm of bpms) {
    const i = edges.findIndex((edge) => bpm < edge);
    const bucket = buckets[i === -1 ? buckets.length - 1 : i];
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

/**
 * Spotify a veces estima el BPM al doble o a la mitad. Solo se corrigen los casos casi seguros:
 * más de 190 se lleva a la mitad y menos de 60 al doble (siempre que el resultado quede entre 60 y 190).
 * Un tema de 178 BPM puede ser real, así que no se toca.
 */
export function normalizeBpm(bpm: number): { value: number; adjusted: boolean } {
  if (bpm > 190 && bpm / 2 >= 60) return { value: bpm / 2, adjusted: true };
  if (bpm < 60 && bpm * 2 >= 60 && bpm * 2 <= 190) return { value: bpm * 2, adjusted: true };
  return { value: bpm, adjusted: false };
}

const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** Meses en los que se agregaron canciones (usa el día local de cada canción). */
export function computeAddedByMonth(tracks: readonly Track[], maxMonths = 12): AddedByMonth | null {
  const counts = new Map<number, number>();
  for (const t of tracks) {
    if (t.addedAt === null) continue;
    const d = new Date(t.addedAt);
    const index = d.getFullYear() * 12 + d.getMonth();
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  if (counts.size < 2) return null;
  const first = Math.min(...counts.keys());
  const last = Math.max(...counts.keys());
  const all: AddedByMonth['list'] = [];
  for (let i = first; i <= last; i++) {
    all.push({ label: MONTH_NAMES[i % 12] ?? '', year: String(Math.floor(i / 12)), count: counts.get(i) ?? 0 });
  }
  const top = all.reduce((best, m) => (m.count > best.count ? m : best), all[0] as AddedByMonth['list'][number]);
  const list = all.slice(-maxMonths);
  return { list, top, hidden: Math.max(0, all.length - list.length) };
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

  const topSongs = tracks
    .filter((t) => t.popularity !== null)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || a.name.localeCompare(b.name, 'es'))
    .slice(0, 10)
    .map((t) => ref(t, t.popularity ?? 0));

  // Audio
  const avgPct = (pick: (t: Track) => number | null): number | null => {
    const m = mean(tracks.map(pick).filter((v): v is number => v !== null));
    return m === null ? null : Math.round(m * 100);
  };
  const danceability = avgPct((t) => t.danceability);
  const energy = avgPct((t) => t.energy);
  const valence = avgPct((t) => t.valence);
  const topGenre = ranked(genres, 1)[0];
  const tonality = computeTonality(tracks);
  const audio =
    danceability === null && energy === null && valence === null && tonality === null
      ? null
      : {
          danceability,
          energy,
          valence,
          mood: energy !== null && valence !== null ? moodVerdict(energy, valence) : null,
          dance: danceability !== null ? danceVerdict(danceability) : null,
          genre: topGenre ? genreFlavor(topGenre.name) : null,
          tonality,
        };

  // Tempo (un BPM de 0 es un dato faltante; los BPM que parecen al doble o a la mitad se corrigen)
  const fixedBpm = (t: Track): { value: number; adjusted: boolean } | null => (t.tempo && t.tempo > 0 ? normalizeBpm(t.tempo) : null);
  const bpms = tracks.map(fixedBpm).filter((v): v is { value: number; adjusted: boolean } => v !== null);
  const bpmAverage = mean(bpms.map((b) => b.value));
  const bpmValue = (t: Track): number | null => fixedBpm(t)?.value ?? null;
  const fastest = extreme(tracks, bpmValue, 'max');
  const slowest = extreme(tracks, bpmValue, 'min');
  const wasAdjusted = (r: TrackRef): boolean => tracks.some((t) => t.name === r.name && fixedBpm(t)?.adjusted === true && fixedBpm(t)?.value === r.value);
  const tempo =
    bpmAverage === null || !fastest || !slowest
      ? null
      : {
          average: Math.round(bpmAverage),
          adjusted: bpms.filter((b) => b.adjusted).length,
          min: Math.round(Math.min(...bpms.map((b) => b.value))),
          max: Math.round(Math.max(...bpms.map((b) => b.value))),
          fastest: { ...fastest, value: Math.round(fastest.value), adjusted: wasAdjusted(fastest) },
          slowest: { ...slowest, value: Math.round(slowest.value), adjusted: wasAdjusted(slowest) },
          buckets: tempoBuckets(bpms.map((b) => b.value)),
          verdict: tempoVerdict(bpmAverage),
        };

  // Destacadas por rasgo de audio
  const highlightDefs: { id: Highlight['id']; title: string; pick: (t: Track) => number | null }[] = [
    { id: 'danceable', title: 'La más bailable', pick: (t) => t.danceability },
    { id: 'acoustic', title: 'La más acústica', pick: (t) => t.acousticness },
    { id: 'energetic', title: 'La más enérgica', pick: (t) => t.energy },
    { id: 'happy', title: 'La más alegre', pick: (t) => t.valence },
  ];
  const highlights: Highlight[] = [];
  for (const def of highlightDefs) {
    const best = extreme(tracks, def.pick, 'max');
    if (best && best.value > 0) highlights.push({ id: def.id, title: def.title, song: { ...best, value: Math.round(best.value * 100) } });
  }

  // Colaboradores (solo cuentan si hubo más de 2) y meses en que se agregó
  const adders = new Map<string, number>();
  for (const t of tracks) if (t.addedBy) bump(adders, t.addedBy);
  const addersRanked = adders.size > 2 ? ranked(adders, 5) : null;
  const addedByMonth = computeAddedByMonth(tracks);

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
    topGenres: ranked(genres, 10),
    topAlbums: ranked(albums, 10, albumArtist),
    popularity,
    topSongs,
    audio,
    highlights,
    adders: addersRanked,
    addedByMonth,
    tempo,
    duration,
    decades,
    tags: tags.slice(0, 5),
  };
}
