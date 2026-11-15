import { historySummary, type HistoryEntry } from '../lib/history';
import { h } from './dom';
import { icon } from './icons';

export interface HistoryHandlers {
  open(entry: HistoryEntry): void;
  remove(entry: HistoryEntry): void;
}

const ACCENTS = ['green', 'purple', 'pink'] as const;

/** Mismo nombre → mismo color de portada. */
function accentFor(id: string): (typeof ACCENTS)[number] {
  let sum = 0;
  for (const ch of id) sum += ch.codePointAt(0) ?? 0;
  return ACCENTS[sum % ACCENTS.length] ?? 'green';
}

/** Tarjeta de la landing: un clic abre la playlist; la ✕ la quita del historial. */
export function historyCard(entry: HistoryEntry, handlers: HistoryHandlers, now: number): HTMLElement {
  const open = h(
    'button',
    { class: 'example', type: 'button', 'aria-label': `Abrir ${entry.name}`, onclick: () => handlers.open(entry) },
    h('span', { class: `example__cover example__cover--${accentFor(entry.id)}` }, icon('note', 26)),
    h(
      'span',
      { class: 'example__body' },
      h('span', { class: 'example__title', title: entry.name }, entry.name),
      h('span', { class: 'example__meta' }, historySummary(entry, now)),
    ),
    h('span', { class: 'example__go' }, icon('play', 20)),
  );
  const remove = h(
    'button',
    {
      class: 'icon-btn hcard__remove',
      type: 'button',
      'aria-label': `Quitar «${entry.name}» del historial`,
      title: 'Quitar del historial',
      onclick: () => handlers.remove(entry),
    },
    icon('close', 16),
  );
  return h('div', { class: 'hcard' }, open, remove);
}

export interface HistoryMenuHandlers extends HistoryHandlers {
  clearAll(): void;
}

/** Botón «Historial» de la barra superior: despliega las otras playlists guardadas. */
export class HistoryMenu {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private readonly clearButton: HTMLButtonElement;

  constructor(
    private readonly host: HTMLElement,
    private readonly handlers: HistoryMenuHandlers,
  ) {
    this.button = h(
      'button',
      {
        class: 'btn btn--ghost',
        type: 'button',
        'aria-label': 'Historial de playlists',
        'aria-haspopup': 'true',
        'aria-expanded': 'false',
        onclick: () => this.setOpen(Boolean(this.panel.hidden)),
      },
      icon('history', 18),
      h('span', { class: 'topbar__label' }, 'Historial'),
    );
    this.list = h('div', { class: 'popover__list' });
    this.clearButton = h(
      'button',
      { class: 'btn btn--text', type: 'button', onclick: () => handlers.clearAll() },
      'Borrar historial',
    );
    this.panel = h(
      'div',
      { class: 'popover popover--history', role: 'dialog', 'aria-label': 'Playlists guardadas en este navegador', hidden: true },
      this.list,
      h('div', { class: 'popover__foot' }, h('span', { class: 'popover__note' }, 'Solo en este navegador'), this.clearButton),
    );
    this.host.replaceChildren(this.button, this.panel);

    document.addEventListener('pointerdown', (ev) => {
      if (!this.panel.hidden && ev.target instanceof Node && !this.host.contains(ev.target)) this.setOpen(false);
    });
    this.host.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !this.panel.hidden) {
        this.setOpen(false);
        this.button.focus();
      }
    });
  }

  setOpen(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
  }

  /** Muestra las playlists guardadas, menos la que se está viendo. */
  setEntries(entries: readonly HistoryEntry[], currentId: string | null, now: number = Date.now()): void {
    const others = entries.filter((e) => e.id !== currentId);
    this.clearButton.hidden = entries.length === 0;
    if (others.length === 0) {
      this.list.replaceChildren(
        h('p', { class: 'hmenu__empty' }, entries.length === 0 ? 'Todavía no cargaste playlists propias.' : 'No hay otras playlists guardadas.'),
      );
      return;
    }
    this.list.replaceChildren(
      ...others.map((entry) =>
        h(
          'div',
          { class: 'hmenu__item' },
          h(
            'button',
            {
              class: 'hmenu__open',
              type: 'button',
              onclick: () => {
                this.setOpen(false);
                this.handlers.open(entry);
              },
            },
            h('span', { class: 'hmenu__name', title: entry.name }, entry.name),
            h('span', { class: 'hmenu__meta' }, historySummary(entry, now)),
          ),
          h(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              'aria-label': `Quitar «${entry.name}» del historial`,
              title: 'Quitar del historial',
              onclick: () => this.handlers.remove(entry),
            },
            icon('close', 16),
          ),
        ),
      ),
    );
  }
}
