/** Nombre de la app: un solo lugar para cambiarlo cuando se renombre (el HTML y el README se actualizan aparte). */
export const APP_NAME = 'PlaylistDigger';

/** Dirección pública de la app (se muestra en la imagen del resumen y acompaña al texto de compartir). */
export const APP_HOST = 'playlistdigger.vercel.app';
export const APP_URL = `https://${APP_HOST}`;

/** Texto que acompaña al resumen cuando se comparte. */
export function shareText(playlistName: string): string {
  return `¡Mira el resumen de mi Playlist "${playlistName}", generado por ${APP_NAME}! ${APP_URL}`;
}
