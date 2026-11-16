import type { Column } from '../lib/columns';
import { cellText } from '../lib/search';
import { trackUrl } from '../lib/spotify';
import type { Track } from '../types';
import { renderCell } from './cells';
import { coverElement } from './cover';
import { h } from './dom';
import { icon } from './icons';
import { SimpleDialog } from './simple-dialog';

/** Detalle de una canción: todos sus datos, tal como están en las columnas del CSV. */
export class TrackModal {
  private readonly dlg = new SimpleDialog('Canción', 'sdlg--track');

  open(track: Track, columns: readonly Column[], linksOn: boolean): void {
    this.dlg.setTitle(track.name);
    const url = trackUrl(track);
    const rows = columns
      .filter((col) => col.kind !== 'index' && col.kind !== 'title' && cellText(col, track) !== '')
      .flatMap((col) => [h('dt', {}, col.label), h('dd', {}, renderCell(col, track, { terms: [], linksOn }))]);
    const link = url
      ? h(
          'a',
          { class: 'btn btn--primary tdet__open', href: url, target: '_blank', rel: 'noopener noreferrer' },
          icon('external', 16),
          h('span', {}, 'Abrir en Spotify'),
        )
      : null;
    this.dlg.body.replaceChildren(
      h(
        'div',
        { class: 'tdet__top' },
        coverElement(track, 'cover tdet__cover'),
        h(
          'div',
          { class: 'tdet__intro' },
          h(
            'p',
            { class: 'tdet__lead' },
            [track.artists.join(', '), track.album].filter(Boolean).join(' · '),
            track.explicit ? h('span', { class: 'card__e tdet__e', 'aria-label': 'Explícita' }, 'E') : null,
          ),
          link,
        ),
      ),
      h('dl', { class: 'tdet' }, ...rows),
    );
    this.dlg.open();
  }
}
