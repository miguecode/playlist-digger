import { h } from './dom';
import { SimpleDialog } from './simple-dialog';

/** Atajos de teclado de la tabla. Se usan también para decidir qué tecla hace qué (ver main.ts). */
export const SHORTCUTS: readonly { keys: string; text: string }[] = [
  { keys: '/', text: 'Buscar en la tabla' },
  { keys: 'F', text: 'Mostrar u ocultar los filtros' },
  { keys: 'R', text: 'Ver el resumen de la playlist' },
  { keys: 'D', text: 'Ver las canciones repetidas (si hay)' },
  { keys: '← →', text: 'Cambiar de tarjeta en el resumen' },
  { keys: 'Esc', text: 'Cerrar una ventana o borrar la búsqueda' },
  { keys: '?', text: 'Mostrar esta ayuda' },
];

export class ShortcutsModal {
  private readonly dlg = new SimpleDialog('Atajos de teclado', 'sdlg--keys');

  constructor() {
    this.dlg.body.append(
      h(
        'dl',
        { class: 'keys' },
        ...SHORTCUTS.flatMap((s) => [h('dt', {}, ...s.keys.split(' ').map((k) => h('kbd', {}, k))), h('dd', {}, s.text)]),
      ),
    );
  }

  open(): void {
    this.dlg.open();
  }
}
