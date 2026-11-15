import '@fontsource-variable/figtree';
import './styles/base.css';
import './styles/table.css';
import './styles/filters.css';
import './styles/landing.css';

import { columnsWithData, exportColumns, type Column } from './lib/columns';
import { CsvError, parseCsv } from './lib/csv';
import { EXAMPLES, exampleSummary, exampleUrl, type Example } from './lib/examples';
import { toCsv } from './lib/export';
import {
  compileFilters,
  describeFilters,
  emptyFilters,
  removeFilter,
  type FilterState,
} from './lib/filters';
import { fmtNumber, formatTotalDuration } from './lib/format';
import { matchesQuery } from './lib/search';
import { nextSort, sortTracks, type SortState } from './lib/sort';
import { likelyOwner, playlistUrl } from './lib/spotify';
import { loadJson, saveJson } from './lib/storage';
import { parseQuery } from './lib/text';
import type { Track } from './types';
import { ColumnsMenu } from './ui/columns-menu';
import { byId, h } from './ui/dom';
import { FiltersPanel } from './ui/filters-panel';
import { infoTip } from './ui/info-tip';
import { brandMark, icon, spotifyMark } from './ui/icons';
import { VirtualTable } from './ui/table';

/** Un CSV de Exportify pesa unos KB; algo mucho más grande no es una playlist. */
const MAX_BYTES = 50 * 1024 * 1024;
// v2: cambió el orden y las columnas visibles por defecto, así que se descartan las elecciones guardadas antes.
const COLUMNS_KEY = 'playlist-viewer:columns:v2';

// ───────────────────────── Estado ─────────────────────────

interface Loaded {
  name: string;
  tracks: Track[];
  /** Solo las columnas para las que el CSV trae datos. */
  columns: Column[];
}

const app = {
  data: null as Loaded | null,
  sort: null as SortState | null,
  query: '',
  filters: emptyFilters(),
  /** Visibilidad elegida por la persona (se recuerda entre visitas). Lo que falta usa el valor por defecto. */
  overrides: loadOverrides(),
  /** Lo que se ve ahora: sirve para exportar exactamente eso. */
  rows: [] as Track[],
  shown: [] as Column[],
};

function loadOverrides(): Record<string, boolean> {
  const raw = loadJson<unknown>(COLUMNS_KEY);
  const out: Record<string, boolean> = {};
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'boolean') out[key] = value;
    }
  }
  return out;
}

const isVisible = (col: Column): boolean => col.kind === 'title' || (app.overrides[col.key] ?? col.defaultVisible);

// ───────────────────────── Elementos ─────────────────────────

const welcome = byId('welcome');
const workspace = byId('workspace');
const btnOpen = byId('btn-open');
const topbarActions = byId('topbar-actions');
const btnChoose = byId('btn-choose');
const fileInput = byId<HTMLInputElement>('file-input');
const heroTitle = byId('hero-title');
const heroSpotify = byId('hero-spotify') as HTMLAnchorElement;
const heroMeta = byId('hero-meta');
const search = byId<HTMLInputElement>('search');
const searchClear = byId('search-clear');
const btnFilters = byId('btn-filters');
const btnExport = byId('btn-export');
const btnClear = byId('btn-clear');
const btnEmptyClear = byId('btn-empty-clear');
const btnCloseFilters = byId('btn-close-filters');
const backdrop = byId('backdrop');
const chipsRow = byId('active-filters');
const status = byId('status');
const tableHost = byId('table-host');
const empty = byId('empty');
const overlay = byId('drop-overlay');
const toast = byId('toast');

// Íconos y marca (se dibujan por código, no vienen del HTML)
byId('brand-mark').append(brandMark(28));
byId('dropzone-icon').append(icon('note', 44));
byId('search-icon').append(icon('search', 20));
searchClear.append(icon('close', 16));
btnCloseFilters.append(icon('close', 20));

const filtersBadge = h('span', { class: 'badge', hidden: true });
btnFilters.append(icon('filters', 18), h('span', { class: 'btn__label' }, 'Filtros'), filtersBadge);
byId('link-exportify').prepend(icon('external', 16));
btnOpen.prepend(icon('upload', 18));
byId('step-exportify').prepend(icon('external', 16));
byId('link-github').prepend(icon('github', 16));
byId('topbar-github').prepend(icon('github', 18));
btnExport.append(icon('download', 18), h('span', { class: 'btn__label' }, 'Exportar CSV'));
btnExport.title = 'Descarga las canciones y columnas que ves ahora';
btnExport.setAttribute('aria-label', 'Exportar CSV');

// ───────────────────────── Componentes ─────────────────────────

const switchWrap = byId('switch-wrap');
const SWITCH_HELP =
  'Con el interruptor activado, hacer clic en una canción la abre en Spotify. En artistas, álbumes y sellos abre la búsqueda en Spotify: el CSV no trae sus enlaces directos. Si lo desactivás, nada es un enlace.';

// Interruptor «Abrir en Spotify»: activa o desactiva todos los enlaces de la tabla (se recuerda entre visitas)
const LINKS_KEY = 'playlist-viewer:spotify-links';
const switchLinks = byId<HTMLButtonElement>('switch-links');
let linksOn = loadJson<unknown>(LINKS_KEY) !== false;

let heroOwner: string | null = null;

function updateHeroLink(): void {
  const name = heroTitle.textContent ?? '';
  const url = linksOn ? playlistUrl(name, heroOwner) : null;
  heroSpotify.hidden = !url;
  if (url) {
    heroSpotify.href = url;
    heroSpotify.title = `Buscar esta playlist en las playlists de Spotify por su nombre${heroOwner ? ' y posible dueño' : ''}`;
  }
}

function applyLinks(on: boolean): void {
  linksOn = on;
  switchLinks.setAttribute('aria-checked', String(on));
  table.setLinks(on);
  updateHeroLink();
}

const table = new VirtualTable((col) => {
  app.sort = nextSort(app.sort, col);
  update(true);
});
tableHost.append(table.element);
applyLinks(linksOn);
switchLinks.addEventListener('click', () => {
  applyLinks(!linksOn);
  saveJson(LINKS_KEY, linksOn);
});
switchWrap.append(infoTip('Abrir en Spotify', SWITCH_HELP));
byId('hero-spotify-icon').append(spotifyMark(20));

const panel = new FiltersPanel(byId('filters-body'), (next) => {
  app.filters = next;
  update(true);
});

function saveOverrides(): void {
  saveJson(COLUMNS_KEY, app.overrides);
}

const columnsMenu = new ColumnsMenu(byId('columns-host'), {
  toggle(key, visible) {
    app.overrides[key] = visible;
    saveOverrides();
    update(false);
  },
  showAll() {
    for (const col of app.data?.columns ?? []) app.overrides[col.key] = true;
    saveOverrides();
    if (app.data) columnsMenu.sync(app.data.columns, isVisible);
    update(false);
  },
  reset() {
    app.overrides = {};
    saveOverrides();
    if (app.data) columnsMenu.sync(app.data.columns, isVisible);
    update(false);
  },
});

// ───────────────────────── Actualización de la vista ─────────────────────────

function plural(n: number): string {
  return `${fmtNumber(n)} ${n === 1 ? 'canción' : 'canciones'}`;
}

function totalDuration(tracks: readonly Track[]): number {
  return tracks.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
}

/** Recalcula qué canciones se ven (búsqueda + filtros + orden) y redibuja. */
function update(resetScroll: boolean): void {
  const data = app.data;
  if (!data) return;

  const shown = data.columns.filter(isVisible);
  // Si se oculta la columna por la que se ordenaba, se vuelve al orden original.
  if (app.sort && !shown.some((col) => col.key === app.sort?.key)) app.sort = null;

  const terms = parseQuery(app.query);
  const passes = compileFilters(app.filters);
  const filtered = data.tracks.filter((t) => passes(t) && matchesQuery(shown, t, terms));
  const sortCol = app.sort ? shown.find((col) => col.key === app.sort?.key) : undefined;
  const rows = sortTracks(filtered, sortCol, app.sort);

  app.rows = rows;
  app.shown = shown;

  table.setData(rows, shown, app.sort, terms, resetScroll);
  tableHost.hidden = rows.length === 0;
  empty.hidden = rows.length !== 0;

  // El total de la playlist ya está en el encabezado: acá solo se informa cuando hay algo filtrado.
  const total = data.tracks.length;
  const duration = totalDuration(rows);
  const count = `${fmtNumber(rows.length)} de ${plural(total)}`;
  status.textContent =
    rows.length === total ? '' : duration > 0 ? `${count} · ${formatTotalDuration(duration)}` : count;

  renderActiveFilters();
}

function renderActiveFilters(): void {
  const active = describeFilters(app.filters);
  chipsRow.hidden = active.length === 0;
  chipsRow.replaceChildren(
    ...active.map((filter) =>
      h(
        'button',
        {
          class: 'fchip',
          type: 'button',
          title: 'Quitar este filtro',
          onclick: () => setFilters(removeFilter(app.filters, filter.id)),
        },
        filter.label,
        icon('close', 12),
      ),
    ),
  );
  // El botón siempre ocupa su lugar (solo se habilita): si apareciera y desapareciera, el panel saltaría.
  (btnClear as HTMLButtonElement).disabled = active.length === 0;
  filtersBadge.hidden = active.length === 0;
  filtersBadge.textContent = String(active.length);
  // En pantallas chicas el botón queda solo con el ícono: el nombre accesible lo da aria-label.
  btnFilters.setAttribute('aria-label', active.length > 0 ? `Filtros (${active.length} activos)` : 'Filtros');
}

function setFilters(next: FilterState): void {
  app.filters = next;
  panel.update(next);
  update(true);
}

function clearAll(): void {
  window.clearTimeout(searchTimer);
  search.value = '';
  searchClear.hidden = true;
  app.query = '';
  setFilters(emptyFilters());
}

btnClear.addEventListener('click', clearAll);
btnEmptyClear.addEventListener('click', clearAll);

// ───────────────────────── Búsqueda ─────────────────────────

let searchTimer = 0;

search.addEventListener('input', () => {
  searchClear.hidden = search.value === '';
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    app.query = search.value;
    update(true);
  }, 90);
});

function clearSearch(): void {
  window.clearTimeout(searchTimer);
  search.value = '';
  searchClear.hidden = true;
  app.query = '';
  update(true);
}

searchClear.addEventListener('click', () => {
  clearSearch();
  search.focus();
});

search.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (search.value) clearSearch();
  else search.blur();
});

// ───────────────────────── Panel de filtros (en pantallas chicas es un cajón) ─────────────────────────

const desktop = window.matchMedia('(min-width: 901px)');

function setFiltersOpen(open: boolean): void {
  workspace.classList.toggle('is-filters-open', open);
  btnFilters.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !(open && !desktop.matches);
}

btnFilters.addEventListener('click', () => setFiltersOpen(!workspace.classList.contains('is-filters-open')));
btnCloseFilters.addEventListener('click', () => setFiltersOpen(false));
backdrop.addEventListener('click', () => setFiltersOpen(false));
desktop.addEventListener('change', () => setFiltersOpen(desktop.matches));

document.addEventListener('keydown', (ev) => {
  if (workspace.hidden) return;
  const target = ev.target;
  const typing =
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

  if (ev.key === '/' && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    ev.preventDefault();
    search.focus();
    search.select();
  } else if (ev.key === 'Escape' && !desktop.matches && workspace.classList.contains('is-filters-open')) {
    setFiltersOpen(false);
  }
});

// ───────────────────────── Carga de archivos ─────────────────────────

let toastTimer = 0;

function showToast(message: string, error = false): void {
  toast.textContent = message;
  toast.classList.toggle('is-error', error);
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}

function playlistName(fileName: string): string {
  return fileName.replace(/\.csv$/i, '').replace(/_+/g, ' ').trim() || 'Playlist';
}

function openPlaylist(name: string, tracks: Track[]): void {
  const columns = columnsWithData(tracks);
  app.data = { name, tracks, columns };
  app.sort = null;
  app.query = '';
  app.filters = emptyFilters();
  search.value = '';
  searchClear.hidden = true;

  heroTitle.textContent = name;
  heroOwner = likelyOwner(tracks.map((t) => t.addedBy));
  updateHeroLink();
  const duration = totalDuration(tracks);
  heroMeta.textContent = duration > 0 ? `${plural(tracks.length)} · ${formatTotalDuration(duration)}` : plural(tracks.length);
  document.title = `${name} · Playlist Viewer`;

  welcome.hidden = true;
  workspace.hidden = false;
  topbarActions.hidden = false;

  columnsMenu.setColumns(columns, isVisible);
  panel.setTracks(tracks);
  setFiltersOpen(desktop.matches);
  update(true);
}

async function loadFile(file: File): Promise<void> {
  if (/\.zip$/i.test(file.name)) {
    showToast('Eso es un ZIP. Descomprimilo y elegí uno de los CSV de adentro.', true);
    return;
  }
  if (file.size > MAX_BYTES) {
    showToast('El archivo es demasiado grande (máximo 50 MB).', true);
    return;
  }
  try {
    openPlaylist(playlistName(file.name), parseCsv(await file.text()));
  } catch (error) {
    showToast(error instanceof CsvError ? error.message : 'No se pudo leer el archivo.', true);
  }
}

function handleFiles(files: FileList | null | undefined): void {
  const first = files?.[0];
  if (!first) return;
  if (files.length > 1) showToast('Se carga una playlist a la vez: abrí solo el primer archivo.');
  void loadFile(first);
}

/** Abre una playlist de ejemplo: se pide a la propia app (mismo origen) y sigue el mismo camino que un archivo elegido. */
async function loadExample(example: Example): Promise<void> {
  try {
    const response = await fetch(exampleUrl(example, import.meta.env.BASE_URL));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    await loadFile(new File([text], `${example.title}.csv`, { type: 'text/csv' }));
  } catch {
    showToast('No se pudo abrir el ejemplo. Probá de nuevo o elegí tu propio CSV.', true);
  }
}

const examplesList = byId('examples-list');
for (const example of EXAMPLES) {
  const button = h(
    'button',
    { class: 'example', type: 'button', 'aria-label': `Abrir el ejemplo ${example.title}` },
    h('span', { class: `example__cover example__cover--${example.accent}` }, icon('note', 26)),
    h('span', { class: 'example__body' }, h('span', { class: 'example__title' }, example.title), h('span', { class: 'example__meta' }, exampleSummary(example))),
    h('span', { class: 'example__go' }, icon('play', 20)),
  );
  button.addEventListener('click', () => {
    button.disabled = true;
    void loadExample(example).finally(() => {
      button.disabled = false;
    });
  });
  examplesList.append(button);
}

btnChoose.addEventListener('click', () => fileInput.click());
btnOpen.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = ''; // permite volver a elegir el mismo archivo
});

// Arrastrar y soltar en cualquier parte de la página
let dragDepth = 0;
const hasFiles = (ev: DragEvent): boolean => ev.dataTransfer?.types.includes('Files') ?? false;

window.addEventListener('dragenter', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth += 1;
  overlay.hidden = false;
});
window.addEventListener('dragover', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', (ev) => {
  if (!hasFiles(ev)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) overlay.hidden = true;
});
window.addEventListener('drop', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth = 0;
  overlay.hidden = true;
  handleFiles(ev.dataTransfer?.files);
});

// ───────────────────────── Exportar ─────────────────────────

btnExport.addEventListener('click', () => {
  const data = app.data;
  if (!data) return;
  if (app.rows.length === 0) {
    showToast('No hay canciones para exportar con los filtros actuales.', true);
    return;
  }
  const slug = data.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'playlist';
  const url = URL.createObjectURL(new Blob([toCsv(exportColumns(app.shown, app.rows), app.rows)], { type: 'text/csv;charset=utf-8' }));
  const link = h('a', { href: url, download: `${slug}-vista.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});
