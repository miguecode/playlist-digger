import { DURATION_LABELS, fmtNumber, formatDuration, formatTotalDuration, type DurationClass } from '../lib/format';
import { computeInsights, type Insights, type Ranked, type TrackRef, type Verdict } from '../lib/insights';
import type { Track } from '../types';
import { h } from './dom';
import { icon, starsRow } from './icons';

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

function rankList(items: readonly Ranked[], anim: Animations): HTMLElement {
  const max = items[0]?.count ?? 1;
  return h(
    'ol',
    { class: 'rank' },
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

function hero(name: string, data: Insights): HTMLElement {
  const stat = (value: string, label: string): HTMLElement =>
    h('div', { class: 'ins-stat' }, h('span', { class: 'ins-stat__value' }, value), h('span', { class: 'ins-stat__label' }, label));
  const stats: HTMLElement[] = [
    stat(fmtNumber(data.trackCount), data.trackCount === 1 ? 'canción' : 'canciones'),
    stat(fmtNumber(data.distinctArtists), data.distinctArtists === 1 ? 'artista distinto' : 'artistas distintos'),
  ];
  if (data.totalDurationMs > 0) stats.push(stat(formatTotalDuration(data.totalDurationMs), 'de música'));
  if (data.explicitShare !== null && data.explicitShare > 0) stats.push(stat(`${data.explicitShare}%`, 'explícitas'));
  return h(
    'header',
    { class: 'ins-hero' },
    h('p', { class: 'ins-hero__eyebrow' }, 'Tu playlist en resumen'),
    h('h2', { class: 'ins-hero__title', id: 'ins-title' }, name),
    h('div', { class: 'ins-stats' }, ...stats),
    data.tags.length > 0 ? h('ul', { class: 'ins-tags' }, ...data.tags.map((tag) => h('li', {}, tag))) : null,
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
  el.classList.add('ins-card--fill');
  return el;
}

function genresCard(data: Insights, anim: Animations): HTMLElement | null {
  if (data.topGenres.length === 0) return null;
  return card('pink', 'Tus géneros top 5', rankList(data.topGenres, anim));
}

function albumsCard(data: Insights, anim: Animations): HTMLElement | null {
  // Si ningún álbum se repite, un ranking no dice nada.
  if ((data.topAlbums[0]?.count ?? 0) < 2) return null;
  return card('blue', 'Tus álbumes top 5', rankList(data.topAlbums, anim));
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

function vibeCard(data: Insights, anim: Animations): HTMLElement | null {
  const audio = data.audio;
  if (!audio) return null;
  return card(
    'pink',
    'La vibra',
    audio.mood ? headline(audio.mood) : null,
    h('div', { class: 'meters' }, meter('Bailabilidad', audio.danceability, anim), meter('Energía', audio.energy, anim), meter('Positividad', audio.valence, anim)),
    audio.dance ? h('p', { class: 'ins-fact' }, `${audio.dance.label}: ${audio.dance.text}`) : null,
  );
}

function tempoCard(data: Insights): HTMLElement | null {
  const tempo = data.tempo;
  if (!tempo) return null;
  return card(
    'blue',
    'El ritmo',
    h('p', { class: 'ins-big' }, String(tempo.average), h('small', {}, 'BPM promedio')),
    headline(tempo.verdict),
    h('p', { class: 'ins-fact' }, `Del más lento (${tempo.min}) al más rápido (${tempo.max}).`),
    h('p', { class: 'ins-note' }, 'El BPM es una estimación automática: a veces sale al doble o a la mitad.'),
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
    { class: 'ins-card ins-card--green ins-card--wide' },
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

/** Ventana grande con un resumen «a lo Wrapped» de la playlist. Usa el <dialog> nativo (foco, Esc y fondo bloqueado). */
export class InsightsModal {
  private readonly dialog: HTMLDialogElement;
  private readonly content: HTMLElement;

  constructor() {
    this.content = h('div', { class: 'ins__scroll' });
    const close = h(
      'button',
      { class: 'icon-btn ins__close', type: 'button', 'aria-label': 'Cerrar resumen', onclick: () => this.close() },
      icon('close', 20),
    );
    this.dialog = h('dialog', { class: 'ins', 'aria-labelledby': 'ins-title' }, close, this.content) as HTMLDialogElement;
    // Un clic en el fondo oscuro llega al propio <dialog>.
    this.dialog.addEventListener('click', (ev) => {
      if (ev.target === this.dialog) this.close();
    });
    document.body.append(this.dialog);
  }

  open(name: string, tracks: readonly Track[]): void {
    const data = computeInsights(tracks);
    const anim: Animations = [];
    const col = (...cards: (HTMLElement | null)[]): HTMLElement => h('div', { class: 'ins__col' }, ...cards.filter((c) => c !== null));
    const grid = h(
      'div',
      { class: 'ins__grid' },
      col(artistsCard(data, anim)),
      col(genresCard(data, anim), albumsCard(data, anim)),
      popularityCard(data, anim),
      vibeCard(data, anim),
      tempoCard(data),
      durationCard(data, anim),
      decadesCard(data, anim),
    );
    this.content.replaceChildren(
      hero(name, data),
      grid,
      h('p', { class: 'ins__foot' }, `Calculado con las ${fmtNumber(data.trackCount)} canciones de la playlist, sin filtros.`),
    );

    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
    this.content.scrollTop = 0;
    // Dos cuadros de espera: las barras parten de cero y recién después se llenan (si no, no hay animación).
    requestAnimationFrame(() => requestAnimationFrame(() => anim.forEach((run) => run())));
  }

  close(): void {
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else this.dialog.removeAttribute('open');
  }
}
