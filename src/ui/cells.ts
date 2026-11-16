import type { Column } from '../lib/columns';
import { columnHelp } from '../lib/help';
import { cellText } from '../lib/search';
import { trackUrl } from '../lib/spotify';
import type { Track } from '../types';
import { h, highlight } from './dom';
import { starsRow } from './icons';
import { bindTip } from './info-tip';

export interface CellOptions {
  /** Términos de la búsqueda, para resaltarlos. */
  terms: readonly string[];
  /** Si es true, canción, artistas, álbum y sello son enlaces a Spotify. */
  linksOn: boolean;
}

/** «E» de contenido explícito, a la derecha de la canción; al pasar el mouse explica qué significa. */
export function explicitTag(): HTMLElement {
  const tag = h(
    'button',
    { class: 'tag-e', type: 'button', 'aria-label': 'Explícita: qué significa', 'aria-expanded': 'false' },
    'E',
  );
  bindTip(tag, 'Explícita', columnHelp('explicit') ?? '');
  return tag;
}

/** Celda de texto con enlaces a Spotify (uno por artista); null si no corresponde. */
function renderLinked(col: Column, track: Track, { terms, linksOn }: CellOptions): Node | null {
  const items = linksOn ? (col.links?.(track) ?? []) : [];
  if (!items.some((item) => item.url)) return null;
  const nodes: Node[] = [];
  items.forEach((item, i) => {
    if (i > 0) nodes.push(document.createTextNode(', '));
    nodes.push(
      item.url
        ? h(
            'a',
            {
              class: 'cell-link',
              href: item.url,
              target: '_blank',
              rel: 'noopener noreferrer',
              title: `Buscar «${item.text}» en Spotify`,
            },
            highlight(item.text, terms),
          )
        : highlight(item.text, terms),
    );
  });
  return h('span', { class: 'cell-text' }, ...nodes);
}

/** Contenido de una celda (de la tabla o del detalle de una canción). */
export function renderCell(col: Column, track: Track, options: CellOptions): Node {
  const { terms, linksOn } = options;
  const text = cellText(col, track);
  if (text === '' && col.kind !== 'index') {
    return col.unknown
      ? h('span', { class: 'muted unknown' }, col.unknown)
      : h('span', { class: 'muted', 'aria-label': 'sin dato' }, '–');
  }

  switch (col.kind) {
    case 'index':
      return h('span', { class: 'cell-index' }, highlight(text, terms));

    case 'title': {
      const url = linksOn ? trackUrl(track) : null;
      const content = highlight(text, terms);
      const title = url
        ? h(
            'a',
            {
              class: 'cell-title',
              href: url,
              target: '_blank',
              rel: 'noopener noreferrer',
              title: `${text} · abrir en Spotify`,
            },
            content,
          )
        : h('span', { class: 'cell-title', title: text }, content);
      return track.explicit ? h('div', { class: 'title-cell' }, title, explicitTag()) : title;
    }

    case 'num': {
      const value = h('span', { class: 'cell-num' }, highlight(text, terms));
      const tag = col.tag?.(track);
      return tag
        ? h('div', { class: 'num-tag' }, h('span', { class: `tag tag--${tag.tone}` }, tag.label), value)
        : value;
    }

    case 'bar': {
      const fill = h('div', { class: 'bar__fill' });
      fill.style.width = `${Math.round((col.bar?.(track) ?? 0) * 100)}%`;
      return h(
        'div',
        { class: 'bar' },
        h('span', { class: 'bar__value' }, highlight(text, terms)),
        h('div', { class: 'bar__track' }, fill),
      );
    }

    case 'stars': {
      const fraction = Math.min(1, Math.max(0, col.bar?.(track) ?? 0));
      const fill = h('span', { class: 'stars__fill' }, starsRow());
      fill.style.width = `${fraction * 100}%`;
      return h(
        'div',
        { class: 'stars', role: 'img', 'aria-label': `${col.label}: ${text} de 100` },
        h('span', { class: 'stars__value' }, highlight(text, terms)),
        h('span', { class: 'stars__row' }, h('span', { class: 'stars__base' }, starsRow()), fill),
      );
    }

    case 'chips':
      return h(
        'div',
        { class: 'chips', 'data-label': col.label },
        ...(col.items?.(track) ?? []).map((item) => h('span', { class: 'chip' }, highlight(item, terms))),
      );

    default:
      return (
        renderLinked(col, track, options) ?? h('span', { class: 'cell-text', title: text }, highlight(text, terms))
      );
  }
}
