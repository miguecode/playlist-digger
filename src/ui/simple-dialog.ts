import { h } from './dom';
import { icon } from './icons';
import { play } from './motion';

/** Ventana chica con <dialog> nativo (foco, Esc y fondo bloqueado) y animación al abrir y cerrar. */
export class SimpleDialog {
  readonly dialog: HTMLDialogElement;
  readonly body = h('div', { class: 'sdlg__body' });
  private readonly titleEl = h('h2', { class: 'sdlg__title', id: `sdlg-title-${SimpleDialog.next}` });
  private static counter = 0;
  private closing = false;

  private static get next(): number {
    SimpleDialog.counter += 1;
    return SimpleDialog.counter;
  }

  constructor(title: string, extraClass = '') {
    this.titleEl.textContent = title;
    const close = h('button', { class: 'icon-btn sdlg__close', type: 'button', 'aria-label': 'Cerrar', onclick: () => void this.close() }, icon('close', 20));
    this.dialog = h(
      'dialog',
      { class: `sdlg ${extraClass}`.trim(), 'aria-labelledby': this.titleEl.id },
      h('div', { class: 'sdlg__bar' }, this.titleEl, close),
      this.body,
    ) as HTMLDialogElement;
    this.dialog.addEventListener('click', (ev) => {
      if (ev.target === this.dialog) void this.close();
    });
    this.dialog.addEventListener('cancel', (ev) => {
      ev.preventDefault();
      void this.close();
    });
    document.body.append(this.dialog);
  }

  setTitle(text: string): void {
    this.titleEl.textContent = text;
  }

  open(): void {
    this.closing = false;
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
    void play(this.dialog, [{ opacity: 0, transform: 'translateY(14px) scale(0.98)' }, { opacity: 1, transform: 'none' }], 240);
    void play(this.dialog, [{ opacity: 0 }, { opacity: 1 }], 240, '::backdrop');
  }

  async close(): Promise<void> {
    if (this.closing || !this.dialog.open) return;
    this.closing = true;
    await Promise.all([
      play(this.dialog, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(0.98)' }], 180),
      play(this.dialog, [{ opacity: 1 }, { opacity: 0 }], 180, '::backdrop'),
    ]);
    this.dialog.getAnimations().forEach((a) => a.cancel());
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else this.dialog.removeAttribute('open');
    this.closing = false;
  }
}
