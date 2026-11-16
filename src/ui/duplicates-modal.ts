import { type DuplicateGroup, extraCopies } from '../lib/duplicates';
import { fmtNumber } from '../lib/format';
import { h } from './dom';
import { SimpleDialog } from './simple-dialog';

const KIND_TEXT = {
  'same-id': {
    title: 'La misma canción, agregada más de una vez',
    hint: 'Tienen exactamente el mismo ID de Spotify.',
  },
  'same-song': {
    title: 'Mismo nombre y mismos artistas, pero en otro álbum',
    hint: 'Suele ser un tema que salió como single y después dentro de un álbum: para Spotify son canciones distintas, pero es la misma.',
  },
} as const;

/** Lista las canciones repetidas de la playlist para que el usuario note el «error» (y la borre desde Spotify). */
export class DuplicatesModal {
  private readonly dlg = new SimpleDialog('Canciones repetidas', 'sdlg--dups');

  /** `onFind` recibe el nombre de una canción para buscarla en la tabla. */
  constructor(private readonly onFind: (text: string) => void) {}

  open(groups: readonly DuplicateGroup[]): void {
    const extra = extraCopies(groups);
    const rows = groups.map((group) => {
      const info = KIND_TEXT[group.kind];
      const first = group.tracks[0];
      return h(
        'section',
        { class: 'dup' },
        h('h3', { class: 'dup__title' }, `${info.title} (${group.tracks.length} veces)`),
        h('p', { class: 'dup__hint' }, info.hint),
        h(
          'ul',
          { class: 'dup__list' },
          ...group.tracks.map((t) =>
            h(
              'li',
              { class: 'dup__row' },
              h('span', { class: 'dup__pos', title: 'Posición en la playlist' }, `#${fmtNumber(t.position)}`),
              h(
                'span',
                { class: 'dup__main' },
                h('span', { class: 'dup__name' }, t.name),
                h('span', { class: 'dup__meta' }, [t.artists.join(', '), t.album].filter(Boolean).join(' · ')),
              ),
            ),
          ),
        ),
        first
          ? h(
              'button',
              {
                class: 'btn btn--ghost dup__find',
                type: 'button',
                onclick: () => {
                  void this.dlg.close();
                  this.onFind(first.name);
                },
              },
              'Buscar en la tabla',
            )
          : null,
      );
    });
    this.dlg.body.replaceChildren(
      h(
        'p',
        { class: 'sdlg__lead' },
        `Encontramos ${fmtNumber(groups.length)} ${groups.length === 1 ? 'canción repetida' : 'canciones repetidas'}: ${fmtNumber(extra)} ${extra === 1 ? 'copia de más' : 'copias de más'}. Podés borrarlas desde Spotify.`,
      ),
      ...rows,
    );
    this.dlg.open();
  }
}
