import { DURATION_LABELS, displayGenre, fmtNumber, formatDuration, formatTotalDuration, type DurationClass } from '../lib/format';
import { computeInsights, type Insights, type Ranked, type TrackRef, type Verdict } from '../lib/insights';
import type { Track } from '../types';
import { h } from './dom';
import { icon, starsRow } from './icons';
import { play } from './motion';
import { renderShareImage, shareFileName } from './share-image';

type Accent = 'green' | 'pink' | 'purple' | 'blue' | 'orange' | 'gold';
type Child = Node | string | null;

/** Acciones que se disparan una vez abierto el modal, para que las barras se llenen con animación. */
type Animations = Array<() => void>;

const card = (accent: Accent, title: string, ...body: Child[]): HTMLElement =>
  h('section', { class: `ins-card ins-card--${accent}` }, h('h3', { class: 'ins-card__title' }, title), ...body);

const headline = (verdict: Verdict): HTMLElement =>
  h('div', { class: 'ins-verdict' }, h('p', { class: 'ins-verdict__label' }, verdict.label), h('p', { class: 'ins-text' }, verdict.text));

const song = (t: TrackRef, value: string): HTMLElement =>
  h(
    'p',
    { class: 'ins-song' },
    h('span', { class: 'ins-song__name', title: t.name }, t.name),
    h('span', { class: 'ins-song__meta' }, [t.artist, value].filter(Boolean).join(' · ')),
  );

function rankList(items: readonly Ranked[], anim: Animations, scale?: number): HTMLElement {
  const max = scale ?? items[0]?.count ?? 1;
  // Sin línea de apoyo (artista), las filas quedan bajitas: se separan más para que respiren.
  const plain = items.every((item) => !item.detail);
  return h(
    'ol',
    { class: plain ? 'rank rank--roomy' : 'rank' },
    ...items.map((item, i) => {
      const fill = h('span', { class: 'rank__fill' });
      anim.push(() => {
        fill.style.width = `${Math.max(6, Math.round((item.count / max) * 100))}%`;
      });
      return h(
        'li',
        { class: 'rank__item' },
        h('span', { class: 'rank__pos' }, String(i + 1)),
        h(
          'span',
          { class: 'rank__main' },
          h('span', { class: 'rank__name', title: item.name }, item.name),
          item.detail ? h('span', { class: 'rank__detail' }, item.detail) : null,
          h('span', { class: 'rank__bar' }, fill),
        ),
        h('span', { class: 'rank__count' }, fmtNumber(item.count)),
      );
    }),
  );
}

function meter(label: string, value: number | null, anim: Animations): HTMLElement | null {
  if (value === null) return null;
  const fill = h('span', { class: 'rank__fill' });
  anim.push(() => {
    fill.style.width = `${Math.max(2, value)}%`;
  });
  return h(
    'div',
    { class: 'meter' },
    h('div', { class: 'meter__head' }, h('span', {}, label), h('strong', {}, `${value}%`)),
    h('span', { class: 'rank__bar' }, fill),
  );
}

// ───────────────────────── Tarjetas ─────────────────────────

function hero(data: Insights, _anim: Animations, name: string): HTMLElement {
  const stat = (value: string, label: string): HTMLElement =>
    h('div', { class: 'ins-stat' }, h('span', { class: 'ins-stat__value' }, value), h('span', { class: 'ins-stat__label' }, label));
  const stats: HTMLElement[] = [
    stat(fmtNumber(data.trackCount), data.trackCount === 1 ? 'canción' : 'canciones'),
    stat(fmtNumber(data.distinctArtists), data.distinctArtists === 1 ? 'artista distinto' : 'artistas distintos'),
  ];
  if (data.totalDurationMs > 0) stats.push(stat(formatTotalDuration(data.totalDurationMs), 'de música'));
  if (data.explicitShare !== null && data.explicitShare > 0) stats.push(stat(`${data.explicitShare}%`, 'explícitas'));
  return h(
    'div',
    { class: 'ins-hero' },
    h('p', { class: 'ins-hero__eyebrow' }, 'Tu playlist en resumen'),
    h('h2', { class: 'ins-hero__title', id: 'ins-title' }, name),
    h('div', { class: 'ins-stats' }, ...stats),
    data.tags.length > 0 ? h('ul', { class: 'ins-tags' }, ...data.tags.map((tag) => h('li', {}, tag))) : null,
    h('p', { class: 'ins-note' }, `Calculado con las ${fmtNumber(data.trackCount)} canciones de la playlist, sin filtros.`),
  );
}

function artistsCard(data: Insights, anim: Animations): HTMLElement | null {
  if (data.topArtists.length === 0) return null;
  const el = card(
    'green',
    'Tus artistas más repetidos',
    h('p', { class: 'ins-caption' }, 'Cantidad de canciones de cada uno'),
    rankList(data.topArtists, anim),
  );
  // Con pocas filas no se estiran: quedarían muy separadas.
  if (data.topArtists.length >= 6) el.classList.add('ins-card--fill');
  return el;
}

function genresCard(data: Insights, anim: Animations): HTMLElement | null {
  if (data.topGenres.length === 0) return null;
  const el = card(
    'pink',
    'Géneros más repetidos',
    h('p', { class: 'ins-caption' }, 'Cantidad de canciones de cada uno'),
    rankList(data.topGenres.map((g) => ({ ...g, name: displayGenre(g.name) })), anim),
  );
  if (data.topGenres.length >= 6) el.classList.add('ins-card--fill');
  return el;
}

function albumsCard(data: Insights, anim: Animations): HTMLElement | null {
  // Un álbum con una sola canción no es un ranking: solo entran los que se repiten.
  const repeated = data.topAlbums.filter((a) => a.count >= 2);
  if (repeated.length === 0) return null;
  return card('blue', `Top ${repeated.length} álbumes`, rankList(repeated, anim));
}

function songsCard(data: Insights, anim: Animations): HTMLElement | null {
  if (data.topSongs.length === 0) return null;
  const items: Ranked[] = data.topSongs.map((t) => ({ name: t.name, count: t.value, detail: t.artist }));
  return card(
    'orange',
    `Top ${items.length} canciones más populares`,
    h('p', { class: 'ins-caption' }, 'Popularidad de 0 a 100'),
    rankList(items, anim, 100),
  );
}

function popularityCard(data: Insights, anim: Animations): HTMLElement | null {
  const pop = data.popularity;
  if (!pop) return null;
  const fill = h('span', { class: 'stars__fill' }, starsRow(30));
  anim.push(() => {
    fill.style.width = `${pop.average}%`;
  });
  const partial = pop.known < data.trackCount;
  return card(
    'gold',
    'Popularidad',
    h('p', { class: 'ins-big' }, String(pop.average), h('small', {}, '/ 100')),
    h('span', { class: 'stars__row ins-stars', role: 'img', 'aria-label': `Popularidad promedio: ${pop.average} de 100` }, h('span', { class: 'stars__base' }, starsRow(30)), fill),
    headline(pop.verdict),
    h('p', { class: 'ins-fact' }, `${pop.hitsShare}% de tus canciones tienen 70 o más.`),
    song(pop.top, `popularidad ${pop.top.value}`),
    partial ? h('p', { class: 'ins-note' }, `Calculado con las ${fmtNumber(pop.known)} canciones que traen el dato.`) : null,
  );
}

function tonalityBlock(audio: NonNullable<Insights['audio']>, anim: Animations): HTMLElement | null {
  const ton = audio.tonality;
  if (!ton) return null;
  const max = Math.max(...ton.perKey.map((k) => k.count), 1);
  const cols = ton.perKey.map((k, i) => {
    const bar = h('span', { class: `hist__bar${i === ton.favoriteKey ? ' is-top' : ''}` });
    anim.push(() => {
      bar.style.height = k.count === 0 ? '3px' : `${Math.max(6, Math.round((k.count / max) * 100))}%`;
    });
    return h(
      'div',
      { class: 'hist__col' },
      h('span', { class: 'hist__count' }, ''),
      h('div', { class: 'hist__well' }, bar),
      h('span', { class: 'hist__label hist__label--key' }, k.label),
    );
  });
  const minorShare = 100 - ton.majorShare;
  const majorSeg = h('span', { class: 'seg seg--medium', title: `Mayor: ${ton.majorShare}%` });
  const minorSeg = h('span', { class: 'seg seg--long', title: `Menor: ${minorShare}%` });
  anim.push(() => {
    majorSeg.style.width = `${ton.majorShare}%`;
    minorSeg.style.width = `${minorShare}%`;
  });
  return h(
    'div',
    { class: 'ins-ton' },
    h('p', { class: 'ins-fact' }, 'Tonalidad más repetida'),
    h('p', { class: 'ins-big ins-big--md' }, ton.favorite.name, h('small', {}, `${fmtNumber(ton.favorite.count)} ${ton.favorite.count === 1 ? 'canción' : 'canciones'}`)),
    h('div', { class: 'hist hist--compact hist--keys' }, ...cols),
    h('div', { class: 'stack' }, majorSeg, minorSeg),
    h(
      'ul',
      { class: 'legend' },
      h('li', {}, h('i', { class: 'dot dot--medium' }), `Mayor · ${ton.majorShare}% (más luminosa)`),
      h('li', {}, h('i', { class: 'dot dot--long' }), `Menor · ${minorShare}% (más sentimental)`),
    ),
  );
}

function vibeCard(data: Insights, anim: Animations): HTMLElement | null {
  const audio = data.audio;
  if (!audio) return null;
  const hasMeters = audio.danceability !== null || audio.energy !== null || audio.valence !== null;
  return card(
    'pink',
    'La vibra',
    audio.mood ? headline(audio.mood) : null,
    audio.genre
      ? h(
          'p',
          { class: 'ins-genre' },
          h('strong', {}, `Género dominante: ${displayGenre(audio.genre.name)}. `),
          audio.genre.note,
        )
      : null,
    hasMeters
      ? h('div', { class: 'meters' }, meter('Bailabilidad', audio.danceability, anim), meter('Energía', audio.energy, anim), meter('Positividad', audio.valence, anim))
      : null,
    audio.dance ? h('p', { class: 'ins-fact' }, `${audio.dance.label}: ${audio.dance.text}`) : null,
    tonalityBlock(audio, anim),
  );
}

function tempoCard(data: Insights, anim: Animations): HTMLElement | null {
  const tempo = data.tempo;
  if (!tempo) return null;
  const max = Math.max(...tempo.buckets.map((b) => b.count), 1);
  const top = tempo.buckets.reduce((best, b) => (b.count > best.count ? b : best), tempo.buckets[0] ?? { label: '', count: 0 });
  const cols = tempo.buckets.map((b) => {
    const bar = h('span', { class: `hist__bar${b === top ? ' is-top' : ''}` });
    anim.push(() => {
      bar.style.height = b.count === 0 ? '3px' : `${Math.max(6, Math.round((b.count / max) * 100))}%`;
    });
    return h(
      'div',
      { class: 'hist__col' },
      h('span', { class: 'hist__count' }, b.count > 0 ? fmtNumber(b.count) : ''),
      h('div', { class: 'hist__well' }, bar),
      h('span', { class: 'hist__label' }, b.label),
    );
  });
  return card(
    'blue',
    'El ritmo',
    h('p', { class: 'ins-big' }, String(tempo.average), h('small', {}, 'BPM promedio')),
    headline(tempo.verdict),
    h('p', { class: 'ins-caption' }, 'Canciones según su BPM'),
    h('div', { class: 'hist hist--compact' }, ...cols),
    h(
      'div',
      { class: 'ins-pair' },
      h('div', {}, h('p', { class: 'ins-fact' }, 'La más rápida'), song(tempo.fastest, `${tempo.fastest.value} BPM${tempo.fastest.adjusted ? ' (ajustado)' : ''}`)),
      h('div', {}, h('p', { class: 'ins-fact' }, 'La más lenta'), song(tempo.slowest, `${tempo.slowest.value} BPM${tempo.slowest.adjusted ? ' (ajustado)' : ''}`)),
    ),
    h(
      'p',
      { class: 'ins-note' },
      tempo.adjusted > 0
        ? `El BPM es una estimación automática. Corregimos ${fmtNumber(tempo.adjusted)} ${tempo.adjusted === 1 ? 'canción' : 'canciones'} que parecían contadas al doble o a la mitad.`
        : 'El BPM es una estimación automática: a veces sale al doble o a la mitad.',
    ),
  );
}

function highlightsCard(data: Insights): HTMLElement | null {
  if (data.highlights.length === 0) return null;
  return card(
    'orange',
    'Las destacadas',
    ...data.highlights.map((hl) =>
      h('div', { class: 'ins-highlight' }, h('p', { class: 'ins-fact' }, hl.title), song(hl.song, `${hl.song.value}%`)),
    ),
  );
}

const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] as const;
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

function monthsCard(data: Insights, anim: Animations): HTMLElement | null {
  const months = data.addedByMonth;
  if (!months) return null;
  const max = Math.max(...months.list.map((m) => m.count), 1);
  const cols = months.list.map((m, i) => {
    const isTop = m.label === months.top.label && m.year === months.top.year;
    const bar = h('span', { class: `hist__bar${isTop ? ' is-top' : ''}` });
    anim.push(() => {
      bar.style.height = m.count === 0 ? '3px' : `${Math.max(6, Math.round((m.count / max) * 100))}%`;
    });
    const showYear = i === 0 || m.label === 'ene';
    return h(
      'div',
      { class: 'hist__col' },
      h('span', { class: 'hist__count' }, m.count > 0 ? fmtNumber(m.count) : ''),
      h('div', { class: 'hist__well' }, bar),
      h('span', { class: 'hist__label hist__label--month' }, m.label, h('small', {}, showYear ? m.year.slice(2) : '')),
    );
  });
  const monthIndex = MONTHS_SHORT.indexOf(months.top.label as (typeof MONTHS_SHORT)[number]);
  const topName = `${MONTHS_LONG[monthIndex] ?? months.top.label} de ${months.top.year}`;
  return card(
    'gold',
    'Cuándo agregaste canciones',
    h('p', { class: 'ins-big ins-big--md' }, fmtNumber(months.top.count), h('small', {}, 'en tu mes más activo')),
    h('p', { class: 'ins-text' }, `Fue ${topName}.`),
    h('div', { class: 'hist hist--compact hist--keys' }, ...cols),
    months.hidden > 0 ? h('p', { class: 'ins-note' }, `Se muestran los últimos ${months.list.length} meses.`) : null,
  );
}

function addersCard(data: Insights, anim: Animations): HTMLElement | null {
  if (!data.adders) return null;
  return card(
    'blue',
    'Top colaboradores',
    h('p', { class: 'ins-caption' }, 'Canciones que agregó cada persona'),
    rankList(data.adders, anim),
  );
}

const CLASS_ORDER: readonly DurationClass[] = ['short', 'medium', 'long', 'podcast'];

function durationCard(data: Insights, anim: Animations): HTMLElement | null {
  const dur = data.duration;
  if (!dur) return null;
  const total = CLASS_ORDER.reduce((sum, key) => sum + dur.byClass[key], 0) || 1;
  const parts = CLASS_ORDER.filter((key) => dur.byClass[key] > 0);
  const segments = parts.map((key) => {
    const seg = h('span', { class: `seg seg--${key}`, title: `${DURATION_LABELS[key]}: ${dur.byClass[key]}` });
    anim.push(() => {
      seg.style.width = `${(dur.byClass[key] / total) * 100}%`;
    });
    return seg;
  });
  const legend = parts.map((key) =>
    h('li', {}, h('i', { class: `dot dot--${key}` }), `${DURATION_LABELS[key]} · ${fmtNumber(dur.byClass[key])}`),
  );
  return card(
    'purple',
    'La duración',
    h('p', { class: 'ins-big' }, formatDuration(dur.averageMs), h('small', {}, 'en promedio')),
    headline(dur.verdict),
    h('div', { class: 'stack' }, ...segments),
    h('ul', { class: 'legend' }, ...legend),
    h('p', { class: 'ins-fact' }, 'La más larga'),
    song(dur.longest, formatDuration(dur.longest.value)),
    h('p', { class: 'ins-fact' }, 'La más corta'),
    song(dur.shortest, formatDuration(dur.shortest.value)),
  );
}

function decadesCard(data: Insights, anim: Animations): HTMLElement | null {
  const dec = data.decades;
  if (!dec) return null;
  const max = Math.max(...dec.list.map((d) => d.count), 1);
  const cols = dec.list.map((d) => {
    const bar = h('span', { class: `hist__bar${d.decade === dec.favorite.decade ? ' is-top' : ''}` });
    anim.push(() => {
      bar.style.height = d.count === 0 ? '3px' : `${Math.max(6, Math.round((d.count / max) * 100))}%`;
    });
    return h(
      'div',
      { class: 'hist__col' },
      h('span', { class: 'hist__count' }, d.count > 0 ? fmtNumber(d.count) : ''),
      h('div', { class: 'hist__well' }, bar),
      h('span', { class: 'hist__label' }, d.label),
    );
  });
  return h(
    'section',
    { class: 'ins-card ins-card--green' },
    h('h3', { class: 'ins-card__title' }, 'Tu época'),
    headline(dec.verdict),
    h('div', { class: 'hist' }, ...cols),
    h(
      'div',
      { class: 'ins-pair' },
      h('div', {}, h('p', { class: 'ins-fact' }, 'La más antigua'), song(dec.oldest, String(dec.oldest.value))),
      h('div', {}, h('p', { class: 'ins-fact' }, 'La más nueva'), song(dec.newest, String(dec.newest.value))),
    ),
  );
}

// ───────────────────────── Modal ─────────────────────────

type Mode = 'slides' | 'global';
type Builder = (data: Insights, anim: Animations, name: string) => HTMLElement | null;

/** Orden de las tarjetas: es el de las slides y el de la vista global. */
const BUILDERS: readonly Builder[] = [
  hero,
  artistsCard,
  genresCard,
  albumsCard,
  songsCard,
  popularityCard,
  vibeCard,
  highlightsCard,
  tempoCard,
  durationCard,
  decadesCard,
  monthsCard,
  addersCard,
];

const SWIPE_MIN_PX = 48;

/** Ventana con un resumen «a lo Wrapped»: slides de a una, o todas juntas en la vista global. */
export class InsightsModal {
  private readonly dialog: HTMLDialogElement;
  private readonly body = h('div', { class: 'ins__body' });
  private readonly nav = h('footer', { class: 'ins__nav' });
  private readonly dots = h('div', { class: 'ins__dots', role: 'tablist', 'aria-label': 'Tarjetas del resumen' });
  private readonly prevBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly modeBtn: HTMLButtonElement;
  private readonly saveBtn: HTMLButtonElement;
  private readonly shareBtn: HTMLButtonElement;
  /** La imagen se dibuja una sola vez por apertura: descargar y compartir usan la misma. */
  private image: Promise<Blob> | null = null;
  private readonly status = h('p', { class: 'ins__status', role: 'status' });

  private name = '';
  private data: Insights | null = null;
  private mode: Mode = 'slides';
  private index = 0;
  private count = 0;
  private token = 0;
  private closing = false;
  private touchX: number | null = null;

  constructor() {
    this.prevBtn = h('button', { class: 'ins__arrow', type: 'button', 'aria-label': 'Tarjeta anterior', onclick: () => this.step(-1) }, icon('chevronLeft', 26)) as HTMLButtonElement;
    this.nextBtn = h('button', { class: 'ins__arrow', type: 'button', 'aria-label': 'Tarjeta siguiente', onclick: () => this.step(1) }, icon('chevronRight', 26)) as HTMLButtonElement;
    this.modeBtn = h('button', { class: 'ins__pill', type: 'button', onclick: () => void this.toggleMode() }) as HTMLButtonElement;
    this.saveBtn = h('button', { class: 'ins__pill', type: 'button', onclick: () => void this.saveImage() }) as HTMLButtonElement;
    this.saveBtn.append(icon('download', 18), h('span', { class: 'ins__pill-label' }, 'Descargar'));
    this.saveBtn.title = 'Descargar el resumen como imagen';
    this.saveBtn.setAttribute('aria-label', 'Descargar el resumen como imagen');
    const canShare = InsightsModal.canShareFiles();
    this.shareBtn = h('button', { class: 'ins__pill', type: 'button', onclick: () => void this.shareImage() }) as HTMLButtonElement;
    this.shareBtn.append(icon(canShare ? 'share' : 'copy', 18), h('span', { class: 'ins__pill-label' }, canShare ? 'Compartir' : 'Copiar imagen'));
    this.shareBtn.title = canShare ? 'Compartir el resumen como imagen' : 'Copiar el resumen como imagen para pegarlo en otra app';
    this.shareBtn.setAttribute('aria-label', this.shareBtn.title);
    const close = h('button', { class: 'icon-btn ins__close', type: 'button', 'aria-label': 'Cerrar resumen', onclick: () => void this.close() }, icon('close', 20));

    const bar = h('div', { class: 'ins__bar' }, h('span', { class: 'ins__bar-title' }, 'Resumen'), this.modeBtn, this.shareBtn, this.saveBtn, close);
    this.nav.append(this.prevBtn, this.dots, this.nextBtn);
    this.dialog = h('dialog', { class: 'ins', 'aria-label': 'Resumen de tu playlist' }, bar, this.body, this.status, this.nav) as HTMLDialogElement;

    this.dialog.addEventListener('click', (ev) => {
      if (ev.target === this.dialog) void this.close();
    });
    // Esc: se intercepta para poder animar el cierre.
    this.dialog.addEventListener('cancel', (ev) => {
      ev.preventDefault();
      void this.close();
    });
    this.dialog.addEventListener('keydown', (ev) => {
      if (this.mode !== 'slides') return;
      if (ev.key === 'ArrowRight') this.step(1);
      else if (ev.key === 'ArrowLeft') this.step(-1);
      else return;
      ev.preventDefault();
    });
    this.body.addEventListener('touchstart', (ev) => {
      this.touchX = ev.touches[0]?.clientX ?? null;
    }, { passive: true });
    this.body.addEventListener('touchend', (ev) => {
      const start = this.touchX;
      this.touchX = null;
      const end = ev.changedTouches[0]?.clientX;
      if (this.mode !== 'slides' || start === null || end === undefined) return;
      if (Math.abs(end - start) >= SWIPE_MIN_PX) this.step(end < start ? 1 : -1);
    }, { passive: true });
    document.body.append(this.dialog);
  }

  open(name: string, tracks: readonly Track[]): void {
    this.name = name;
    this.data = computeInsights(tracks);
    this.image = null;
    this.mode = 'slides';
    this.index = 0;
    this.closing = false;
    this.setStatus('');
    this.count = this.build().length;
    this.renderDots();

    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
    void play(this.dialog, [{ opacity: 0, transform: 'translateY(18px) scale(0.97)' }, { opacity: 1, transform: 'none' }], 320);
    void play(this.dialog, [{ opacity: 0 }, { opacity: 1 }], 320, '::backdrop');
    void this.render(0);
  }

  async close(): Promise<void> {
    if (this.closing || !this.dialog.open) return;
    this.closing = true;
    this.token++;
    await Promise.all([
      play(this.dialog, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(14px) scale(0.97)' }], 220),
      play(this.dialog, [{ opacity: 1 }, { opacity: 0 }], 220, '::backdrop'),
    ]);
    this.dialog.getAnimations({ subtree: false }).forEach((a) => a.cancel());
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else this.dialog.removeAttribute('open');
    this.closing = false;
  }

  /** Construye todas las tarjetas, cada una con sus propias animaciones de barras. */
  private build(): Array<{ el: HTMLElement; anim: Animations }> {
    const out: Array<{ el: HTMLElement; anim: Animations }> = [];
    for (const b of BUILDERS) {
      const anim: Animations = [];
      const el = b(this.data as Insights, anim, this.name);
      if (el) out.push({ el, anim });
    }
    return out;
  }

  private step(delta: 1 | -1): void {
    if (this.mode !== 'slides') return;
    const next = this.index + delta;
    if (next < 0) return;
    if (next >= this.count) void this.setMode('global'); // se terminaron las slides: vista global
    else void this.render(next, delta);
  }

  private async toggleMode(): Promise<void> {
    await this.setMode(this.mode === 'slides' ? 'global' : 'slides');
  }

  private async setMode(mode: Mode): Promise<void> {
    this.mode = mode;
    if (mode === 'slides') this.index = 0;
    await this.render(this.index, 1, true);
  }

  private async render(index: number, dir: 1 | -1 = 1, modeChange = false): Promise<void> {
    const data = this.data;
    if (!data) return;
    const token = ++this.token;
    const slides = this.mode === 'slides';
    const shift = slides && !modeChange;

    const current = this.body.firstElementChild;
    if (current) {
      const out = shift ? `translateX(${-dir * 36}px)` : 'scale(0.97)';
      await play(current, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: out }], 180);
      if (token !== this.token) return;
    }

    this.index = index;
    const anim: Animations = [];
    let view: HTMLElement;
    if (slides) {
      const slide = this.build()[index];
      if (!slide) return;
      view = h('div', { class: 'ins__stage' }, slide.el);
      anim.push(...slide.anim);
    } else {
      const col = (...els: Array<HTMLElement | null>): HTMLElement => h('div', { class: 'ins__col' }, ...els.filter((e): e is HTMLElement => e !== null));
      const header = hero(data, anim, this.name);
      view = h(
        'div',
        { class: 'ins__scroll', tabindex: '0', role: 'region', 'aria-label': 'Resumen completo' },
        header,
        h(
          'div',
          { class: 'ins__grid' },
          col(artistsCard(data, anim), songsCard(data, anim)),
          col(genresCard(data, anim), albumsCard(data, anim)),
          ...this.pairs(
            popularityCard(data, anim),
            vibeCard(data, anim),
            tempoCard(data, anim),
            durationCard(data, anim),
            decadesCard(data, anim),
            highlightsCard(data),
            monthsCard(data, anim),
            addersCard(data, anim),
          ),
        ),
      );
    }
    this.dialog.classList.toggle('ins--slides', slides);
    this.dialog.classList.toggle('ins--global', !slides);
    this.body.replaceChildren(view);
    // Si la tarjeta no entra entera (pantallas chicas) tiene que poder desplazarse con el teclado.
    const card = view.firstElementChild;
    if (slides && card instanceof HTMLElement && card.scrollHeight > card.clientHeight + 1) {
      card.tabIndex = 0;
      card.setAttribute('aria-label', 'Tarjeta del resumen');
    }
    this.nav.hidden = !slides;
    this.updateControls();

    // Dos cuadros de espera: las barras parten de cero y recién después se llenan (si no, no hay animación).
    requestAnimationFrame(() => requestAnimationFrame(() => anim.forEach((run) => run())));
    await play(view, [{ opacity: 0, transform: shift ? `translateX(${dir * 36}px)` : 'scale(0.97)' }, { opacity: 1, transform: 'none' }], 320);
  }

  /** Tarjetas sueltas de la grilla: si queda una sola en la última fila, ocupa todo el ancho. */
  private pairs(...cards: Array<HTMLElement | null>): HTMLElement[] {
    const list = cards.filter((c): c is HTMLElement => c !== null);
    if (list.length % 2 === 1) list[list.length - 1]?.classList.add('ins-card--wide');
    return list;
  }

  private updateControls(): void {
    const slides = this.mode === 'slides';
    this.prevBtn.disabled = this.index === 0;
    // En la última slide, «siguiente» lleva a la vista global.
    this.nextBtn.setAttribute('aria-label', this.index === this.count - 1 ? 'Ir a la vista global' : 'Tarjeta siguiente');
    this.modeBtn.replaceChildren(icon(slides ? 'grid' : 'slideshow', 18), h('span', { class: 'ins__pill-label' }, slides ? 'Vista global' : 'Ver de a una'));
    this.modeBtn.title = slides ? 'Ver todas las tarjetas juntas' : 'Volver a ver las tarjetas de a una';
    this.dots.querySelectorAll('button').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === this.index);
      dot.setAttribute('aria-selected', String(i === this.index));
    });
  }

  private renderDots(): void {
    this.dots.replaceChildren(
      ...Array.from({ length: this.count }, (_, i) =>
        h('button', { class: 'ins__dot', type: 'button', role: 'tab', 'aria-label': `Tarjeta ${i + 1} de ${this.count}`, onclick: () => void this.goTo(i) }),
      ),
    );
  }

  private async goTo(i: number): Promise<void> {
    if (this.mode !== 'slides' || i === this.index) return;
    await this.render(i, i > this.index ? 1 : -1);
  }

  private setStatus(msg: string): void {
    this.status.textContent = msg;
    this.status.hidden = msg === '';
  }

  private static canShareFiles(): boolean {
    try {
      const probe = new File([''], 'probe.png', { type: 'image/png' });
      return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }

  private makeImage(): Promise<Blob> {
    if (!this.image && this.data) this.image = renderShareImage(this.name, this.data);
    if (!this.image) return Promise.reject(new Error('Sin datos'));
    // Si falla, la próxima vez se vuelve a intentar.
    this.image.catch(() => {
      this.image = null;
    });
    return this.image;
  }

  /** Deshabilita los botones de imagen mientras se trabaja y muestra el resultado en el modal (los avisos de la página quedan detrás). */
  private async withImage(busy: string, work: (blob: Blob) => Promise<string>): Promise<void> {
    if (this.saveBtn.disabled) return;
    this.saveBtn.disabled = true;
    this.shareBtn.disabled = true;
    this.setStatus(busy);
    try {
      this.setStatus(await work(await this.makeImage()));
    } catch (err) {
      // Cancelar el menú de compartir no es un error.
      this.setStatus(err instanceof DOMException && err.name === 'AbortError' ? '' : 'No se pudo generar la imagen. Probá de nuevo.');
    } finally {
      this.saveBtn.disabled = false;
      this.shareBtn.disabled = false;
    }
  }

  private download(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: shareFileName(this.name) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return '¡Listo! La imagen se descargó.';
  }

  private saveImage(): Promise<void> {
    return this.withImage('Preparando la imagen…', async (blob) => this.download(blob));
  }

  private shareImage(): Promise<void> {
    return this.withImage('Preparando la imagen…', async (blob) => {
      const file = new File([blob], shareFileName(this.name), { type: 'image/png' });
      if (InsightsModal.canShareFiles()) {
        await navigator.share({ files: [file], title: this.name });
        return '';
      }
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          return '¡Imagen copiada! Pegala donde quieras compartirla.';
        } catch {
          /* sin permiso para el portapapeles: se descarga */
        }
      }
      return `Tu navegador no permite copiar la imagen. ${this.download(blob)}`;
    });
  }
}
