import '@fontsource-variable/figtree';
import './styles/base.css';
import './styles/table.css';
import './styles/filters.css';
import './styles/landing.css';
import './styles/insights.css';
import './styles/dialogs.css';
import './styles/cards.css';

import { columnsWithData, exportColumns, type Column } from './lib/columns';
import { CsvError, parseCsv } from './lib/csv';
import { extraCopies, findDuplicates, type DuplicateGroup } from './lib/duplicates';
import { EXAMPLES, exampleSummary, exampleUrl, type Example } from './lib/examples';
import { toCsv } from './lib/export';
import { compileFilters, describeFilters, emptyFilters, removeFilter, type FilterState } from './lib/filters';
import { fmtNumber, formatTotalDuration } from './lib/format';
import { matchesQuery } from './lib/search';
import { nextSort, sortTracks, type SortState } from './lib/sort';
import {
  HISTORY_MAX_CSV_CHARS,
  clearHistory,
  historyId,
  listHistory,
  loadHistoryCsv,
  removeFromHistory,
  saveToHistory,
  type HistoryEntry,
} from './lib/history';
import { likelyOwner, playlistUrl } from './lib/spotify';
import { loadJson, saveJson } from './lib/storage';
import { parseQuery } from './lib/text';
import type { Track } from './types';
import { ColumnsMenu } from './ui/columns-menu';
import { byId, h } from './ui/dom';
import { DuplicatesModal } from './ui/duplicates-modal';
import { FiltersPanel } from './ui/filters-panel';
import { HistoryMenu, historyCard } from './ui/history';
import { InsightsModal } from './ui/insights-modal';
import { hideInfoTip, infoTip } from './ui/info-tip';
import { brandMark, icon, spotifyMark } from './ui/icons';
import { ShortcutsModal } from './ui/shortcuts-modal';
import { CardGrid } from './ui/card-grid';
import { TrackModal } from './ui/track-modal';
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
const btnDups = byId('btn-dups');
const btnShortcuts = byId('btn-shortcuts');
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
const cardsHost = byId('cards-host');
const viewTable = byId('view-table');
const viewCards = byId('view-cards');
const viewToggle = byId('view-toggle');
const btnFocus = byId('btn-focus');
const btnFocusExit = byId('btn-focus-exit');
const sortbox = byId('sortbox');
const sortSelect = byId<HTMLSelectElement>('sort-select');
const sortDir = byId<HTMLButtonElement>('sort-dir');
const appRoot = byId('app');
const overlay = byId('drop-overlay');
const toast = byId('toast');

// Íconos y marca (se dibujan por código, no vienen del HTML)
byId('brand-mark').append(brandMark(28));
byId('dropzone-icon').append(icon('note', 44));
byId('search-icon').append(icon('search', 20));
searchClear.append(icon('close', 16));
btnCloseFilters.append(icon('close', 20));
byId('btn-collapse-filters').append(icon('collapse', 20));

const filtersBadge = h('span', { class: 'badge', hidden: true });
btnFilters.append(icon('filters', 18), h('span', { class: 'btn__label' }, 'Filtros'), filtersBadge);
byId('link-exportify').prepend(icon('external', 16));
btnOpen.prepend(icon('upload', 18));
byId('step-exportify').prepend(icon('external', 16));
byId('link-github').prepend(icon('github', 16));
byId('link-spotify').prepend(spotifyMark(16));
byId('btn-insights').prepend(icon('sparkle', 24));
btnShortcuts.append(icon('keyboard', 20));
byId('topbar-github').prepend(icon('github', 18));
btnExport.append(icon('download', 18), h('span', { class: 'btn__label' }, 'Exportar CSV'));
btnExport.title = 'Descarga las canciones y columnas que ves ahora';
btnExport.setAttribute('aria-label', 'Exportar CSV');

// ───────────────────────── Componentes ─────────────────────────

const switchWrap = byId('switch-wrap');
const SWITCH_HELP =
  'Con el interruptor activado, hacer clic en una canción la abre en Spotify. En artistas, álbumes y sellos abre la búsqueda en Spotify: el CSV no trae sus enlaces directos. Si lo desactivás, nada es un enlace.';

// Interruptor «Enlaces»: activa o desactiva todos los enlaces de la tabla (se recuerda entre visitas)
const LINKS_KEY = 'playlist-viewer:spotify-links';
const switchLinks = byId<HTMLButtonElement>('switch-links');
let linksOn = loadJson<unknown>(LINKS_KEY) !== false;

let heroOwner: string | null = null;

function updateHeroLink(): void {
  const name = heroTitle.textContent ?? '';
  const url = playlistUrl(name, heroOwner); // no depende del interruptor: el botón siempre está
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
}

const table = new VirtualTable((col) => {
  app.sort = nextSort(app.sort, col);
  update(true);
});
tableHost.append(table.element);
const trackModal = new TrackModal();
const cards = new CardGrid((track) => trackModal.open(track, app.shown, linksOn));
cardsHost.append(cards.element);
applyLinks(linksOn);
switchLinks.addEventListener('click', () => {
  applyLinks(!linksOn);
  saveJson(LINKS_KEY, linksOn);
});
switchWrap.append(infoTip('Enlaces', SWITCH_HELP));
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

// ───────────────────────── Vista: tabla o tarjetas, y modo «solo la lista» ─────────────────────────

type View = 'table' | 'cards';
const VIEW_KEY = 'playlist-viewer:view';
let view: View = loadJson<unknown>(VIEW_KEY) === 'cards' ? 'cards' : 'table';

function applyView(next: View): void {
  view = next;
  viewToggle.classList.toggle('is-cards', next === 'cards');
  viewTable.setAttribute('aria-pressed', String(next === 'table'));
  viewCards.setAttribute('aria-pressed', String(next === 'cards'));
}

viewTable.append(icon('list', 18));
viewCards.append(icon('cards', 18));

/** En tarjetas no hay encabezados para ordenar: se ordena con este selector. */
function renderSortbox(shown: readonly Column[]): void {
  sortbox.hidden = view !== 'cards';
  if (view !== 'cards') return;
  const sortable = shown.filter((col) => col.kind !== 'index');
  sortSelect.replaceChildren(
    h('option', { value: '' }, 'Original'),
    ...sortable.map((col) => h('option', { value: col.key }, col.label)),
  );
  sortSelect.value = app.sort?.key ?? '';
  const desc = app.sort?.dir === 'desc';
  sortDir.disabled = !app.sort;
  sortDir.replaceChildren(icon('arrow', 16));
  sortDir.classList.toggle('is-desc', desc);
  sortDir.title = desc ? 'Descendente (tocá para invertir)' : 'Ascendente (tocá para invertir)';
  sortDir.setAttribute('aria-label', sortDir.title);
}

sortSelect.addEventListener('change', () => {
  const col = app.shown.find((c) => c.key === sortSelect.value);
  app.sort = col ? { key: col.key, dir: col.defaultDir } : null;
  update(true);
});
sortDir.addEventListener('click', () => {
  if (!app.sort) return;
  app.sort = {
    key: app.sort.key,
    dir: app.sort.dir === 'asc' ? 'desc' : 'asc',
  };
  update(true);
});

function chooseView(next: View): void {
  if (next === view) return;
  applyView(next);
  saveJson(VIEW_KEY, view);
  update(false);
}
viewTable.addEventListener('click', () => chooseView('table'));
viewCards.addEventListener('click', () => chooseView('cards'));
applyView(view);

// «Solo la lista»: en el celular oculta todo lo de arriba (solo se aplica con pantalla angosta; no se recuerda entre visitas)
const narrow = window.matchMedia('(max-width: 760px)');
btnFocus.append(icon('hideTop', 20));
btnFocusExit.append(icon('showTop', 18), h('span', {}, 'Mostrar todo'));

function setFocus(on: boolean): void {
  appRoot.classList.toggle('is-focus', on && narrow.matches);
  btnFocusExit.hidden = !(on && narrow.matches);
}
btnFocus.addEventListener('click', () => setFocus(true));
btnFocusExit.addEventListener('click', () => {
  setFocus(false);
  btnFocus.focus();
});
narrow.addEventListener('change', () => {
  if (!narrow.matches) setFocus(false);
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

  if (view === 'cards') cards.setData(rows, terms, resetScroll);
  else table.setData(rows, shown, app.sort, terms, resetScroll);
  tableHost.hidden = view === 'cards' || rows.length === 0;
  cardsHost.hidden = view !== 'cards' || rows.length === 0;
  renderSortbox(shown);
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

// ───────────────────────── Resumen de la playlist ─────────────────────────

const insightsModal = new InsightsModal();
let duplicates: DuplicateGroup[] = [];
const duplicatesModal = new DuplicatesModal((text) => {
  search.value = text;
  search.dispatchEvent(new Event('input'));
  search.focus();
});
const shortcutsModal = new ShortcutsModal();
btnDups.addEventListener('click', () => {
  hideInfoTip();
  duplicatesModal.open(duplicates);
});
btnShortcuts.addEventListener('click', () => {
  hideInfoTip();
  shortcutsModal.open();
});
const btnInsights = byId('btn-insights');
btnInsights.addEventListener('click', () => {
  if (!app.data) return;
  hideInfoTip();
  insightsModal.open(app.data.name, app.data.tracks);
});

// ───────────────────────── Pantalla completa ─────────────────────────

const btnFullscreen = byId<HTMLButtonElement>('btn-fullscreen');

function paintFullscreen(): void {
  const on = document.fullscreenElement !== null;
  btnFullscreen.replaceChildren(icon(on ? 'compress' : 'expand', 18));
  const label = on ? 'Salir de pantalla completa' : 'Pantalla completa';
  btnFullscreen.setAttribute('aria-label', label);
  btnFullscreen.title = label;
}

if (document.fullscreenEnabled) {
  paintFullscreen();
  btnFullscreen.addEventListener('click', () => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    request.catch(() => showToast('Tu navegador no permitió la pantalla completa.', true));
  });
  document.addEventListener('fullscreenchange', paintFullscreen);
} else {
  btnFullscreen.hidden = true; // p. ej. iPhone: Safari no la ofrece
}

// ───────────────────────── Panel de filtros (en pantallas chicas es un cajón) ─────────────────────────

const desktop = window.matchMedia('(min-width: 901px)');

function setFiltersOpen(open: boolean): void {
  workspace.classList.toggle('is-filters-open', open);
  btnFilters.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !(open && !desktop.matches);
}

btnFilters.addEventListener('click', () => setFiltersOpen(!workspace.classList.contains('is-filters-open')));
btnCloseFilters.addEventListener('click', () => setFiltersOpen(false));
byId('btn-collapse-filters').addEventListener('click', () => setFiltersOpen(false));
backdrop.addEventListener('click', () => setFiltersOpen(false));
desktop.addEventListener('change', () => setFiltersOpen(desktop.matches));

document.addEventListener('keydown', (ev) => {
  if (workspace.hidden) return;
  const target = ev.target;
  const typing =
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

  const plain = !ev.ctrlKey && !ev.metaKey && !ev.altKey;
  const dialogOpen = document.querySelector('dialog[open]') !== null;

  if (ev.key === '/' && !typing && plain && !dialogOpen) {
    ev.preventDefault();
    search.focus();
    search.select();
  } else if (!typing && plain && !dialogOpen && !ev.repeat && ['f', 'r', 'd', '?'].includes(ev.key.toLowerCase())) {
    const key = ev.key.toLowerCase();
    ev.preventDefault();
    if (key === 'f') setFiltersOpen(!workspace.classList.contains('is-filters-open'));
    else if (key === 'r') btnInsights.click();
    else if (key === 'd') {
      if (!btnDups.hidden) btnDups.click();
    } else btnShortcuts.click();
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
  return (
    fileName
      .replace(/\.csv$/i, '')
      .replace(/_+/g, ' ')
      .trim() || 'Playlist'
  );
}

function openPlaylist(name: string, tracks: Track[]): void {
  setFocus(false);
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
  heroMeta.textContent =
    duration > 0 ? `${plural(tracks.length)} · ${formatTotalDuration(duration)}` : plural(tracks.length);
  document.title = `${name} · Playlist Viewer`;
  duplicates = findDuplicates(tracks);
  const extra = extraCopies(duplicates);
  btnDups.hidden = duplicates.length === 0;
  btnDups.replaceChildren(
    icon('warning', 16),
    `${extra === 1 ? '1 canción repetida' : `${extra} canciones repetidas`}`,
  );
  btnDups.title = 'Ver qué canciones están repetidas en la playlist';

  welcome.hidden = true;
  workspace.hidden = false;
  topbarActions.hidden = false;

  columnsMenu.setColumns(columns, isVisible);
  panel.setTracks(tracks);
  setFiltersOpen(desktop.matches);
  update(true);
}

// ───────────────────────── Qué playlist se está viendo y el historial ─────────────────────────

type Origin = { kind: 'file' } | { kind: 'example'; id: string } | { kind: 'history'; id: string };

/** Se guarda por pestaña (sessionStorage): con F5 sigue la playlist, pero una visita nueva empieza en la landing. */
const CURRENT_KEY = 'playlist-viewer:current';
const baseTitle = document.title;
let currentHistoryId: string | null = null;
let history: HistoryEntry[] = [];

function rememberCurrent(origin: Exclude<Origin, { kind: 'file' }> | null): void {
  try {
    if (origin) sessionStorage.setItem(CURRENT_KEY, JSON.stringify(origin));
    else sessionStorage.removeItem(CURRENT_KEY);
  } catch {
    /* sin almacenamiento de sesión: con F5 se vuelve a la landing */
  }
}

function readCurrent(): Exclude<Origin, { kind: 'file' }> | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(CURRENT_KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      const { kind, id } = raw as Record<string, unknown>;
      if ((kind === 'example' || kind === 'history') && typeof id === 'string') return { kind, id };
    }
  } catch {
    /* valor ilegible: se ignora */
  }
  return null;
}

const historySection = byId('history-section');
const historyList = byId('history-list');
const historyHandlers = {
  open: (entry: HistoryEntry): void => void openFromHistory(entry),
  remove: (entry: HistoryEntry): void => {
    void removeFromHistory(entry.id).then(() => {
      if (currentHistoryId === entry.id) currentHistoryId = null;
      return refreshHistory();
    });
  },
};
const historyMenu = new HistoryMenu(byId('history-host'), {
  ...historyHandlers,
  clearAll: () => clearAllHistory(),
});

/** En la landing se ven las más recientes; el resto, con «Ver todas». */
const HISTORY_LANDING_LIMIT = 6;
let historyExpanded = false;
const historyMore = byId('history-more');
historyMore.addEventListener('click', () => {
  historyExpanded = !historyExpanded;
  renderHistory();
});

function renderHistory(): void {
  const now = Date.now();
  historySection.hidden = history.length === 0;
  const hasMore = history.length > HISTORY_LANDING_LIMIT;
  if (!hasMore) historyExpanded = false;
  const visible = historyExpanded ? history : history.slice(0, HISTORY_LANDING_LIMIT);
  historyList.replaceChildren(...visible.map((entry) => historyCard(entry, historyHandlers, now)));
  historyMore.hidden = !hasMore;
  historyMore.textContent = historyExpanded ? 'Ver menos' : `Ver todas (${history.length})`;
  historyMore.setAttribute('aria-expanded', String(historyExpanded));
  historyMenu.setEntries(history, currentHistoryId, now);
}

async function refreshHistory(): Promise<void> {
  history = await listHistory();
  renderHistory();
}

function clearAllHistory(): void {
  if (!window.confirm('¿Borrar todas las playlists guardadas en este navegador?')) return;
  void clearHistory().then(() => {
    currentHistoryId = null;
    rememberCurrent(null);
    return refreshHistory();
  });
}

byId('clear-history-landing').addEventListener('click', clearAllHistory);

/** Abre un CSV ya leído y recuerda de dónde vino. Los archivos propios se guardan en el historial. */
async function openCsv(name: string, text: string, origin: Origin): Promise<void> {
  const tracks = parseCsv(text); // si el CSV no sirve, lanza CsvError antes de cambiar nada
  openPlaylist(name, tracks);

  if (origin.kind === 'file') {
    currentHistoryId = null;
    rememberCurrent(null);
    if (text.length > HISTORY_MAX_CSV_CHARS) {
      showToast('La playlist se abrió, pero es demasiado grande para guardarla en el historial.');
    } else {
      const id = historyId(name);
      try {
        await saveToHistory(
          {
            id,
            name,
            savedAt: Date.now(),
            tracks: tracks.length,
            durationMs: totalDuration(tracks),
          },
          text,
        );
        currentHistoryId = id;
        rememberCurrent({ kind: 'history', id });
      } catch {
        showToast('La playlist se abrió, pero tu navegador no permitió guardarla en el historial.');
      }
    }
    history = await listHistory();
  } else {
    currentHistoryId = origin.kind === 'history' ? origin.id : null;
    rememberCurrent(origin);
  }
  renderHistory();
}

async function openFromHistory(entry: HistoryEntry): Promise<void> {
  const text = await loadHistoryCsv(entry.id);
  if (text === null) {
    showToast('Esa playlist ya no está guardada en el historial.', true);
    await refreshHistory();
    return;
  }
  try {
    await openCsv(entry.name, text, { kind: 'history', id: entry.id });
  } catch (error) {
    showToast(error instanceof CsvError ? error.message : 'No se pudo abrir la playlist guardada.', true);
  }
}

/** Vuelve a la pantalla inicial (el logo). */
function goHome(): void {
  setFocus(false);
  rememberCurrent(null);
  currentHistoryId = null;
  hideInfoTip();
  historyMenu.setOpen(false);
  backdrop.hidden = true;
  workspace.hidden = true;
  topbarActions.hidden = true;
  welcome.hidden = false;
  document.title = baseTitle;
  renderHistory();
  window.scrollTo(0, 0);
}

document.querySelector('.brand')?.addEventListener('click', (ev) => {
  if (workspace.hidden) return;
  ev.preventDefault();
  goHome();
});

// ───────────────────────── Carga de archivos ─────────────────────────

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
    await openCsv(playlistName(file.name), await file.text(), { kind: 'file' });
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

async function fetchExample(example: Example): Promise<string> {
  const response = await fetch(exampleUrl(example, import.meta.env.BASE_URL));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/** Abre una playlist de ejemplo: se pide a la propia app (mismo origen). Los ejemplos no van al historial. */
async function loadExample(example: Example): Promise<void> {
  try {
    await openCsv(example.title, await fetchExample(example), {
      kind: 'example',
      id: example.id,
    });
  } catch {
    showToast('No se pudo abrir el ejemplo. Probá de nuevo o elegí tu propio CSV.', true);
  }
}

const examplesList = byId('examples-list');
for (const example of EXAMPLES) {
  const button = h(
    'button',
    {
      class: 'example',
      type: 'button',
      'aria-label': `Abrir el ejemplo ${example.title}`,
    },
    h('span', { class: `example__cover example__cover--${example.accent}` }, icon('note', 26)),
    h(
      'span',
      { class: 'example__body' },
      h('span', { class: 'example__title' }, example.title),
      h('span', { class: 'example__meta' }, exampleSummary(example)),
    ),
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

// ───────────────────────── Al abrir la página ─────────────────────────

/** Con F5 vuelve a abrir lo que se estaba viendo; si ya no se puede, muestra la landing. */
async function restoreCurrent(current: Exclude<Origin, { kind: 'file' }>): Promise<boolean> {
  try {
    if (current.kind === 'example') {
      const example = EXAMPLES.find((e) => e.id === current.id);
      if (!example) return false;
      await openCsv(example.title, await fetchExample(example), current);
      return true;
    }
    const entry = history.find((e) => e.id === current.id);
    const text = entry ? await loadHistoryCsv(entry.id) : null;
    if (!entry || text === null) return false;
    await openCsv(entry.name, text, current);
    return true;
  } catch {
    return false;
  }
}

async function boot(): Promise<void> {
  const current = readCurrent();
  if (current) welcome.hidden = true; // evita que la landing parpadee mientras se recupera la playlist
  await refreshHistory();
  if (current && !(await restoreCurrent(current))) {
    rememberCurrent(null);
    welcome.hidden = false;
  }
}

void boot();

// ───────────────────────── Exportar ─────────────────────────

btnExport.addEventListener('click', () => {
  const data = app.data;
  if (!data) return;
  if (app.rows.length === 0) {
    showToast('No hay canciones para exportar con los filtros actuales.', true);
    return;
  }
  const slug =
    data.name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'playlist';
  const url = URL.createObjectURL(
    new Blob([toCsv(exportColumns(app.shown, app.rows), app.rows)], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const link = h('a', { href: url, download: `${slug}-vista.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});
