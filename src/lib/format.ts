import type { PercentField, Track } from '../types';

const pad2 = (n: number): string => String(n).padStart(2, '0');

const numberFormats = new Map<number, Intl.NumberFormat>();

/** Número con coma decimal (es-AR) y una cantidad fija de decimales. */
export function fmtNumber(n: number, digits = 0): string {
  let f = numberFormats.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    numberFormats.set(digits, f);
  }
  return f.format(n);
}

/** 201621 → "3:22". Con una hora o más: "1:02:03". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** Duración total en palabras: "1 h 14 min", "58 min 12 s". */
export function formatTotalDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-07-14" → "14/07/2026". Si no es una fecha ISO, devuelve el texto tal cual. */
export function formatDay(iso: string): string {
  const m = ISO_DAY.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Fecha de lanzamiento respetando la precisión original: "2022", "07/2022" o "08/07/2022". */
export function formatReleaseDate(raw: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(raw);
  if (!m) return raw;
  const [, year, month, day] = m;
  if (day) return `${day}/${month}/${year}`;
  if (month) return `${month}/${year}`;
  return year ?? raw;
}

let addedFormat: Intl.DateTimeFormat | undefined;

/** Fecha y hora local, por ejemplo "6 ago 2026, 13:39". */
export function formatAddedAt(ms: number): string {
  addedFormat ??= new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return addedFormat.format(new Date(ms));
}

const NOTES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

/** key 6 + mode 0 → "Fa♯ menor". Devuelve "" si Spotify no detectó la tonalidad. */
export function keyLabel(key: number | null, mode: number | null): string {
  if (key === null || key < 0 || key > 11) return '';
  const note = NOTES[key];
  if (mode === 1) return `${note} mayor`;
  if (mode === 0) return `${note} menor`;
  return note ?? '';
}

/** Valor 0–1 de audio como porcentaje entero (0–100), o null si falta. */
export function pct(t: Track, field: PercentField): number | null {
  const v = t[field];
  return v === null ? null : Math.round(v * 100);
}

export type DurationClass = 'short' | 'medium' | 'long' | 'podcast';

const MIN = 60_000;

/** Umbrales: una canción típica dura 3–4 min y desde 4:35 ya se siente larga; desde 20 min ya es un set, un mix o un podcast. */
export const DURATION_LIMITS = { short: 2.5 * MIN, medium: 4.5 * MIN + 5000, long: 20 * MIN } as const;

export const DURATION_LABELS: Readonly<Record<DurationClass, string>> = {
  short: 'Corta',
  medium: 'Media',
  long: 'Larga',
  podcast: 'Podcast',
};

/** Clasifica una duración: menos de 2:30 corta, hasta 4:35 media, hasta 20:00 larga y más, podcast. */
export function durationClass(ms: number): DurationClass {
  if (ms < DURATION_LIMITS.short) return 'short';
  if (ms <= DURATION_LIMITS.medium) return 'medium';
  if (ms < DURATION_LIMITS.long) return 'long';
  return 'podcast';
}

/** «hace 5 minutos», «ayer», «hace 3 meses». Para fechas del pasado cercano. */
export function timeAgo(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.round((timestamp - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'recién';
  const rtf = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86_400 * 30) return rtf.format(Math.round(seconds / 86_400), 'day');
  if (abs < 86_400 * 365) return rtf.format(Math.round(seconds / (86_400 * 30)), 'month');
  return rtf.format(Math.round(seconds / (86_400 * 365)), 'year');
}
