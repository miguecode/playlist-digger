/** Nombre de la app: un solo lugar para cambiarlo cuando se renombre (el HTML y el README se actualizan aparte). */
export const APP_NAME = 'Playlist Viewer';

/** Texto que acompaña al resumen cuando se comparte. */
export function shareText(playlistName: string): string {
  return `¡Mira el resumen de mi Playlist "${playlistName}", generado por ${APP_NAME}!`;
}
