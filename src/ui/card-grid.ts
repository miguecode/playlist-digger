import { COLUMNS } from '../lib/columns';
import type { Track } from '../types';
import { renderCell } from './cells';
import { coverElement, prefetchCovers } from './cover';
import { h, highlight } from './dom';

/** Medidas de la grilla (tienen que coincidir con .cards__* en cards.css). */
export const CARD_H = 148;
export const CARD_GAP = 12;
export const CARD_MIN_W = 280;
const OVERSCAN_ROWS = 3;
/** Filas de tarjetas que se precargan más allá de las que ya se dibujan. */
const PREFETCH_ROWS = 4;

/** Cuántas tarjetas entran por fila en `width` px y cuántas filas hacen falta. */
export function gridMetrics(width: number, count: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.floor((width + CARD_GAP) / (CARD_MIN_W + CARD_GAP)));
  return { cols, rows: Math.ceil(count / cols) };
}

const column = (key: string) => COLUMNS.find((c) => c.key === key);

/**
 * Grilla de tarjetas con scroll virtual (como la tabla): solo se dibujan las filas de tarjetas que se ven.
 * Cada tarjeta muestra lo principal; al tocarla se abre el detalle con todos los datos.
 */
export class CardGrid {
  readonly element: HTMLElement;

  private readonly scroller: HTMLElement;
  private readonly inner: HTMLElement;
  private readonly rowsEl: HTMLElement;

  private tracks: readonly Track[] = [];
  private terms: readonly string[] = [];
  private cols = 1;
  private start = -1;
  private end = -1;
  private frame = 0;

  constructor(private readonly onOpen: (track: Track) => void) {
    this.rowsEl = h('div', { class: 'cards__rows', role: 'group', 'aria-label': 'Canciones, en tarjetas' });
    this.inner = h('div', { class: 'cards__inner' }, this.rowsEl);
    this.scroller = h('div', { class: 'cards__scroll' }, this.inner);
    this.element = h('div', { class: 'cards' }, this.scroller);
    this.scroller.addEventListener('scroll', () => this.schedule(), { passive: true });
    new ResizeObserver(() => this.schedule(true)).observe(this.scroller);
  }

  setData(tracks: readonly Track[], terms: readonly string[], resetScroll: boolean): void {
    this.tracks = tracks;
    this.terms = terms;
    if (resetScroll) this.scroller.scrollTop = 0;
    this.layout();
    this.render(true);
  }

  private schedule(relayout = false): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (relayout) this.layout();
      this.render(relayout);
    });
  }

  /** Calcula las columnas según el ancho disponible y la altura total. */
  private layout(): void {
    const width = this.scroller.clientWidth - CARD_GAP * 2; // el relleno de los costados
    const { cols, rows } = gridMetrics(Math.max(width, 0), this.tracks.length);
    this.cols = cols;
    this.inner.style.height = `${rows * (CARD_H + CARD_GAP) + CARD_GAP}px`;
    this.rowsEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  }

  private render(force: boolean): void {
    const stride = CARD_H + CARD_GAP;
    const total = Math.ceil(this.tracks.length / this.cols);
    const firstRow = Math.max(0, Math.floor(this.scroller.scrollTop / stride) - OVERSCAN_ROWS);
    const lastRow = Math.min(
      total,
      Math.ceil((this.scroller.scrollTop + this.scroller.clientHeight) / stride) + OVERSCAN_ROWS,
    );
    const start = firstRow * this.cols;
    const end = Math.min(this.tracks.length, lastRow * this.cols);
    if (!force && start === this.start && end === this.end) return;
    this.start = start;
    this.end = end;

    this.rowsEl.style.transform = `translateY(${CARD_GAP + firstRow * stride}px)`;
    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const track = this.tracks[i];
      if (track) fragment.append(this.card(track));
    }
    this.rowsEl.replaceChildren(fragment);
    prefetchCovers(this.tracks.slice(end, end + this.cols * PREFETCH_ROWS));
  }

  private card(track: Track): HTMLElement {
    const open = (): void => this.onOpen(track);
    const year = track.releaseRaw ? track.releaseRaw.slice(0, 4) : '';
    const duration = column('duration');
    const popularity = column('popularity');
    return h(
      'div',
      {
        class: 'card',
        role: 'button',
        tabindex: '0',
        'aria-label': `Ver el detalle de ${track.name}`,
        onclick: open,
        onkeydown: (ev: Event) => {
          const key = (ev as KeyboardEvent).key;
          if (key === 'Enter' || key === ' ') {
            ev.preventDefault();
            open();
          }
        },
      },
      h(
        'div',
        { class: 'card__top' },
        coverElement(track, 'cover card__cover'),
        h(
          'div',
          { class: 'card__body' },
          h(
            'div',
            { class: 'card__head' },
            h('span', { class: 'card__title', title: track.name }, highlight(track.name, this.terms)),
            track.explicit ? h('span', { class: 'card__e', 'aria-label': 'Explícita' }, 'E') : null,
          ),
          h('p', { class: 'card__artists' }, highlight(track.artists.join(', ') || 'Sin artista', this.terms)),
          h('p', { class: 'card__album' }, highlight([track.album, year].filter(Boolean).join(' · '), this.terms)),
        ),
      ),
      h(
        'div',
        { class: 'card__foot' },
        duration && track.durationMs !== null ? renderCell(duration, track, { terms: [], linksOn: false }) : h('span'),
        popularity && track.popularity !== null ? renderCell(popularity, track, { terms: [], linksOn: false }) : null,
      ),
    );
  }
}
