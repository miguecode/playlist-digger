import type { Column } from '../lib/columns';
import { columnHelp } from '../lib/help';
import type { SortState } from '../lib/sort';
import type { Track } from '../types';
import { renderCell } from './cells';
import { h } from './dom';
import { icon } from './icons';
import { fitChips } from './chips';
import { hideInfoTip, infoTip } from './info-tip';

const ROW_H = 52;
const HEAD_H = 40;
const OVERSCAN = 8;

/**
 * Tabla con scroll virtual: solo se dibujan las filas que se ven (más un margen),
 * así una playlist de miles de canciones se mueve igual de fluida que una de veinte.
 */
export class VirtualTable {
  readonly element: HTMLElement;

  private readonly scroller: HTMLElement;
  private readonly inner: HTMLElement;
  private readonly head: HTMLElement;
  private readonly body: HTMLElement;
  private readonly rowsEl: HTMLElement;

  private rows: readonly Track[] = [];
  private columns: readonly Column[] = [];
  private sort: SortState | null = null;
  private terms: readonly string[] = [];
  /** Columnas que quedan fijas al desplazar en horizontal → su posición "left". */
  private readonly compact = window.matchMedia('(max-width: 760px)');
  private sticky = new Map<string, number>();
  private stickyEdge = '';
  /** Huella de lo que dibuja el encabezado (columnas + orden). */
  private headKey = '';
  /** Si es true, canción, artistas, álbum y sello son enlaces a Spotify. */
  private linksOn = true;

  private start = -1;
  private end = -1;
  private frame = 0;

  constructor(private readonly onSort: (col: Column) => void) {
    this.head = h('div', { class: 'table__head', role: 'row', 'aria-rowindex': 1 });
    this.rowsEl = h('div', { class: 'table__rows' });
    this.body = h('div', { class: 'table__body', role: 'rowgroup' }, this.rowsEl);
    this.inner = h('div', { class: 'table__inner' }, this.head, this.body);
    this.scroller = h('div', { class: 'table__scroll' }, this.inner);
    this.element = h('div', { class: 'table', role: 'table', 'aria-label': 'Canciones de la playlist' }, this.scroller);

    this.scroller.addEventListener('scroll', () => this.schedule(), { passive: true });
    new ResizeObserver(() => this.schedule()).observe(this.scroller);
    // En pantallas chicas las columnas fijas ocupan demasiado lugar y no dejan ver lo que está a la derecha.
    this.compact.addEventListener('change', () => {
      if (this.columns.length === 0) return;
      this.computeSticky();
      this.renderHead();
      this.render(true);
    });
  }

  setData(
    rows: readonly Track[],
    columns: readonly Column[],
    sort: SortState | null,
    terms: readonly string[],
    resetScroll: boolean,
  ): void {
    this.rows = rows;
    this.columns = columns;
    this.sort = sort;
    this.terms = terms;
    this.computeSticky();

    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    this.inner.style.width = `${totalWidth}px`;
    this.body.style.height = `${rows.length * ROW_H}px`;
    this.element.setAttribute('aria-rowcount', String(rows.length + 1));

    // Los encabezados solo cambian con las columnas o el orden; no hace falta rehacerlos en cada tecla de la búsqueda.
    const headKey = `${columns.map((c) => c.key).join(',')}|${sort ? `${sort.key}:${sort.dir}` : ''}`;
    if (headKey !== this.headKey) {
      this.headKey = headKey;
      this.renderHead();
    }
    if (resetScroll) this.scroller.scrollTop = 0;
    this.render(true);
  }

  /** Activa o desactiva los enlaces a Spotify y vuelve a dibujar las filas visibles. */
  setLinks(on: boolean): void {
    if (this.linksOn === on) return;
    this.linksOn = on;
    if (this.rows.length > 0) this.render(true);
  }

  private computeSticky(): void {
    this.sticky = new Map();
    this.stickyEdge = '';
    if (this.compact.matches) return;
    let left = 0;
    for (const col of this.columns) {
      if (col.kind !== 'index' && col.kind !== 'title') break;
      this.sticky.set(col.key, left);
      this.stickyEdge = col.key;
      left += col.width;
    }
  }

  private box(el: HTMLElement, col: Column): void {
    el.style.width = `${col.width}px`;
    const left = this.sticky.get(col.key);
    if (left !== undefined) {
      el.classList.add('is-sticky');
      el.style.left = `${left}px`;
      if (col.key === this.stickyEdge) el.classList.add('is-edge');
    }
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render(false);
    });
  }

  private renderHead(): void {
    hideInfoTip(); // los encabezados se vuelven a crear: un globo abierto quedaría huérfano
    const cells = this.columns.map((col) => {
      const dir = this.sort?.key === col.key ? this.sort.dir : null;
      const arrow = icon('arrow', 14);
      arrow.classList.add('th__arrow');
      const button = h(
        'button',
        {
          class: 'th__btn',
          type: 'button',
          title: `Ordenar por ${col.label}`,
          onclick: () => this.onSort(col),
        },
        h('span', { class: 'th__label' }, col.label),
        arrow,
      );
      const help = columnHelp(col.key);
      const th = h(
        'div',
        {
          class: `th${col.kind === 'num' ? ' th--end' : ''}${dir ? ' is-sorted' : ''}${dir === 'desc' ? ' is-desc' : ''}${help ? ' has-info' : ''}`,
          role: 'columnheader',
          'aria-sort': dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none',
        },
        button,
        // Fuera del botón de orden: son dos acciones distintas (ordenar / ver qué es).
        help ? infoTip(col.label, help) : null,
      );
      this.box(th, col);
      return th;
    });
    this.head.replaceChildren(...cells);
  }

  private render(force: boolean): void {
    const total = this.rows.length;
    const top = this.scroller.scrollTop;
    const viewport = this.scroller.clientHeight;
    const start = Math.max(0, Math.floor((top - HEAD_H) / ROW_H) - OVERSCAN);
    const end = Math.min(total, Math.ceil((top + viewport) / ROW_H) + OVERSCAN);
    if (!force && start === this.start && end === this.end) return;
    this.start = start;
    this.end = end;

    this.rowsEl.style.transform = `translateY(${start * ROW_H}px)`;
    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const track = this.rows[i];
      if (track) fragment.append(this.renderRow(track, i));
    }
    this.rowsEl.replaceChildren(fragment);
    fitChips(this.rowsEl);
  }

  private renderRow(track: Track, index: number): HTMLElement {
    const row = h('div', { class: 'row', role: 'row', 'aria-rowindex': index + 2 });
    for (const col of this.columns) {
      const cell = h('div', { class: 'td', role: 'cell' }, this.renderCell(col, track));
      this.box(cell, col);
      row.append(cell);
    }
    return row;
  }

  private renderCell(col: Column, track: Track): Node {
    return renderCell(col, track, { terms: this.terms, linksOn: this.linksOn, covers: true });
  }
}
