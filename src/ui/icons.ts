// Íconos propios (path en una grilla de 24×24). Son constantes del código, no vienen del CSV.
const PATHS = {
  search:
    '<path d="M10.5 3a7.5 7.5 0 1 0 4.55 13.46l4.74 4.75 1.41-1.42-4.74-4.74A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z"/>',
  close:
    '<path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/>',
  filters:
    '<path d="M3 6h9.1a3 3 0 0 1 5.8 0H21v2h-3.1a3 3 0 0 1-5.8 0H3zm12 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM3 16h3.1a3 3 0 0 1 5.8 0H21v2h-9.1a3 3 0 0 1-5.8 0H3zm6 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>',
  columns: '<path d="M4 4h4.5v16H4zm5.75 0h4.5v16h-4.5zM15.5 4H20v16h-4.5z"/>',
  download: '<path d="M11 3h2v9.17l3.59-3.58L18 10l-6 6-6-6 1.41-1.41L11 12.17zM5 19h14v2H5z"/>',
  upload: '<path d="M11 21h2v-9.17l3.59 3.58L18 14l-6-6-6 6 1.41 1.41L11 11.83zM5 3h14v2H5z"/>',
  share:
    '<path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>',
  copy: '<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>',
  warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
  keyboard:
    '<path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>',
  list: '<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>',
  cards:
    '<path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7zM6 6v3h3V6H6zm9 0v3h3V6h-3zM6 15v3h3v-3H6zm9 0v3h3v-3h-3z"/>',
  hideTop: '<path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>',
  showTop: '<path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>',
  external: '<path d="M8 6v2h7.59L5 18.59 6.41 20 17 9.41V17h2V6z"/>',
  arrow: '<path d="M12 4.5 18.5 12H14v7.5h-4V12H5.5z"/>',
  chevron: '<path d="m7.4 9.6 4.6 4.6 4.6-4.6L18 11l-6 6-6-6z"/>',
  info: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"/>',
  play: '<path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z"/>',
  github:
    '<path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/>',
  chevronLeft: '<path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>',
  chevronRight: '<path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>',
  grid: '<path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>',
  slideshow:
    '<path d="M10 8v8l5-4-5-4zm9-5H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>',
  sparkle:
    '<path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>',
  history:
    '<path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z"/>',
  expand: '<path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z"/>',
  compress: '<path d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/>',
  collapse: '<path d="M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/>',
  note: '<path d="M19 3v12.5a3.5 3.5 0 1 1-2-3.16V7.3L9 9v8.5a3.5 3.5 0 1 1-2-3.16V6z"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** Devuelve un <svg> nuevo listo para insertar. Hereda el color del texto (currentColor). */
export function icon(name: IconName, size = 20): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
    `fill="currentColor" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
  return template.content.firstElementChild as SVGSVGElement;
}

/** Marca de la app (mismo dibujo que el favicon). */
export function brandMark(size = 32): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false">` +
    '<rect width="32" height="32" rx="8" fill="#060a07"/><line x1="20" y1="20" x2="26" y2="26.2" stroke="#34e47a" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="14" cy="14" r="7.6" fill="#060a07" stroke="#34e47a" stroke-width="3"/>' +
    '<path d="M12 10.6v6.8l5.6-3.4z" fill="#34e47a" stroke="#34e47a" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  return template.content.firstElementChild as SVGSVGElement;
}

/** Isotipo de Spotify (círculo con tres ondas). Solo se usa en el enlace que lleva a contenido de Spotify. */
export function spotifyMark(size = 20): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">` +
    '<circle cx="12" cy="12" r="12" fill="#1ed760"/>' +
    '<g fill="none" stroke="#121212" stroke-linecap="round">' +
    '<path d="M5.4 8.6c4.3-1.2 9-.8 13.1 1.5" stroke-width="2.1"/>' +
    '<path d="M6.1 12.2c3.6-1 7.5-.6 10.7 1.3" stroke-width="1.8"/>' +
    '<path d="M6.8 15.5c2.9-.8 5.8-.5 8.3 1" stroke-width="1.5"/></g></svg>';
  return template.content.firstElementChild as SVGSVGElement;
}

const STAR = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

/** Cinco estrellas pegadas, de color currentColor: sirven de fondo y de relleno de la puntuación. */
export function starsRow(height = 14): SVGSVGElement {
  const paths = Array.from({ length: 5 }, (_, i) => `<path transform="translate(${i * 24} 0)" d="${STAR}"/>`).join('');
  const template = document.createElement('template');
  template.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 24" width="${height * 5}" height="${height}" ` +
    `fill="currentColor" aria-hidden="true" focusable="false">${paths}</svg>`;
  return template.content.firstElementChild as SVGSVGElement;
}
