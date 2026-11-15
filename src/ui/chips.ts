import { h } from './dom';
import { bindTip } from './info-tip';

const GAP = 6; // debe coincidir con el gap de .chips en table.css
const MORE_WIDTH = 44; // lugar que se reserva para el «+N» (con su separación)

/**
 * Cuántas etiquetas entran en `available` px dejando lugar para «+N» si no entran todas.
 * Siempre muestra al menos una (si es muy larga, el CSS la recorta con «…»).
 */
export function chipsThatFit(widths: readonly number[], available: number, gap = GAP, reserve = MORE_WIDTH): number {
  if (widths.length === 0) return 0;
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
  if (total <= available) return widths.length;

  let used = 0;
  let fit = 0;
  for (const width of widths) {
    const next = used + (fit > 0 ? gap : 0) + width;
    if (next + reserve > available) break;
    used = next;
    fit++;
  }
  return Math.max(1, fit);
}

/**
 * Ajusta las etiquetas de cada contenedor: las que no entran se ocultan y se agrega un «+N»
 * que, al pasar el mouse (o tocarlo / enfocarlo), muestra la lista completa.
 * Primero se mide todo y recién después se modifica, para no forzar un recálculo de layout por fila.
 */
export function fitChips(root: ParentNode): void {
  const plans = [...root.querySelectorAll<HTMLElement>('.chips')].map((box) => {
    const chips = [...box.querySelectorAll<HTMLElement>(':scope > .chip:not(.chip--more)')];
    const fit = chipsThatFit(
      chips.map((chip) => chip.offsetWidth),
      box.clientWidth,
    );
    return { box, chips, fit };
  });

  for (const { box, chips, fit } of plans) {
    box.querySelector('.chip--more')?.remove();
    chips.forEach((chip, i) => {
      chip.hidden = i >= fit;
    });
    if (fit >= chips.length) continue;

    const hidden = chips.slice(fit);
    const label = box.dataset.label ?? '';
    const more = h(
      'button',
      {
        class: `chip chip--more${hidden.some((chip) => chip.querySelector('mark')) ? ' is-match' : ''}`,
        type: 'button',
        'aria-label': `${label}: ${hidden.length} más. Ver todos`,
        'aria-expanded': 'false',
      },
      `+${hidden.length}`,
    );
    bindTip(more, label, chips.map((chip) => chip.textContent ?? '').join(', '));
    box.append(more);
  }
}
