import { fmtNumber, formatTotalDuration } from '../lib/format';
import type { Insights, Ranked } from '../lib/insights';

/** Imagen vertical (formato «historia») con lo más importante del resumen, lista para guardar y compartir. */
const W = 1080;
const H = 1920;
const PAD = 72;
const FONT = '"Figtree Variable", "Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

type Ctx = CanvasRenderingContext2D;

const font = (ctx: Ctx, weight: number, size: number): void => {
  ctx.font = `${weight} ${size}px ${FONT}`;
};

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Recorta el texto con «…» hasta que entre en `maxWidth`. */
function fit(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/** Achica la letra hasta que el texto entre en una línea (con un mínimo, y recorte si hace falta). */
function fitTitle(ctx: Ctx, text: string, maxWidth: number): { text: string; size: number } {
  for (let size = 132; size >= 64; size -= 4) {
    font(ctx, 900, size);
    if (ctx.measureText(text).width <= maxWidth) return { text, size };
  }
  font(ctx, 900, 64);
  return { text: fit(ctx, text, maxWidth), size: 64 };
}

function background(ctx: Ctx): void {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#0e6b3a');
  gradient.addColorStop(0.5, '#1b4fa0');
  gradient.addColorStop(1, '#7a2a9a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  // Dos círculos translúcidos para darle profundidad.
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(W - 120, 260, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(120, H - 380, 420, 0, Math.PI * 2);
  ctx.fill();
}

function panel(ctx: Ctx, y: number, height: number, title: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  roundRect(ctx, PAD, y, W - PAD * 2, height, 36);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  font(ctx, 800, 26);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title.toUpperCase(), PAD + 40, y + 62);
}

function bar(ctx: Ctx, x: number, y: number, w: number, fraction: number, color = '#ffffff'): void {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x, y, w, 12, 6);
  ctx.fill();
  const filled = Math.max(12, w * Math.min(1, Math.max(0, fraction)));
  ctx.fillStyle = color;
  roundRect(ctx, x, y, filled, 12, 6);
  ctx.fill();
}

function drawRanking(ctx: Ctx, items: readonly Ranked[], y: number): void {
  const left = PAD + 40;
  const right = W - PAD - 40;
  const max = items[0]?.count ?? 1;
  items.forEach((item, i) => {
    const rowY = y + i * 88;
    ctx.fillStyle = i === 0 ? '#ffffff' : 'rgba(255,255,255,0.65)';
    font(ctx, 900, i === 0 ? 44 : 36);
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1), left, rowY + 38);
    ctx.fillStyle = '#ffffff';
    font(ctx, i === 0 ? 900 : 800, i === 0 ? 40 : 34);
    const count = fmtNumber(item.count);
    font(ctx, 800, 34);
    const countWidth = ctx.measureText(count).width;
    font(ctx, i === 0 ? 900 : 800, i === 0 ? 40 : 34);
    ctx.fillText(fit(ctx, item.name, right - left - 70 - countWidth - 24), left + 70, rowY + 38);
    font(ctx, 800, 34);
    ctx.textAlign = 'right';
    ctx.fillText(count, right, rowY + 38);
    ctx.textAlign = 'left';
    bar(ctx, left + 70, rowY + 54, right - left - 70, item.count / max);
  });
}

const METER_PITCH = 62;

function drawMeters(ctx: Ctx, meters: readonly { label: string; value: number }[], y: number): void {
  const left = PAD + 40;
  const right = W - PAD - 40;
  meters.forEach((m, i) => {
    const rowY = y + i * METER_PITCH;
    ctx.fillStyle = '#ffffff';
    font(ctx, 800, 32);
    ctx.textAlign = 'left';
    ctx.fillText(m.label, left, rowY + 30);
    ctx.textAlign = 'right';
    ctx.fillText(`${m.value}%`, right, rowY + 30);
    ctx.textAlign = 'left';
    bar(ctx, left, rowY + 46, right - left, m.value / 100);
  });
}

function pill(ctx: Ctx, text: string, x: number, y: number): number {
  font(ctx, 800, 30);
  const width = ctx.measureText(text).width + 56;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, x, y, width, 60, 30);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 28, y + 40);
  return width;
}

/** Dibuja la imagen y la devuelve como PNG. */
export async function renderShareImage(name: string, data: Insights): Promise<Blob> {
  // La tipografía de la página tiene que estar cargada antes de dibujar con ella.
  try {
    await Promise.all([900, 800].map((weight) => document.fonts.load(`${weight} 40px "Figtree Variable"`)));
  } catch {
    /* si no carga, se usa la tipografía del sistema */
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no pudo crear la imagen.');

  background(ctx);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Cabecera
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  font(ctx, 800, 28);
  ctx.fillText('TU PLAYLIST EN RESUMEN', PAD, 130);
  const title = fitTitle(ctx, name, W - PAD * 2);
  ctx.fillStyle = '#ffffff';
  font(ctx, 900, title.size);
  ctx.fillText(title.text, PAD, 130 + 30 + title.size);

  let y = 130 + 30 + title.size + 56;
  const stats: [string, string][] = [
    [fmtNumber(data.trackCount), data.trackCount === 1 ? 'canción' : 'canciones'],
    [fmtNumber(data.distinctArtists), data.distinctArtists === 1 ? 'artista' : 'artistas'],
  ];
  if (data.totalDurationMs > 0) stats.push([formatTotalDuration(data.totalDurationMs), 'de música']);
  let x = PAD;
  for (const [value, label] of stats) {
    ctx.fillStyle = '#ffffff';
    font(ctx, 900, 64);
    ctx.fillText(value, x, y + 52);
    const valueWidth = ctx.measureText(value).width;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    font(ctx, 700, 28);
    ctx.fillText(label, x, y + 92);
    x += Math.max(valueWidth, ctx.measureText(label).width) + 64;
  }
  y += 140;

  // Etiquetas (en filas, sin salirse del ancho)
  let tagX = PAD;
  for (const tag of data.tags) {
    font(ctx, 800, 30);
    const needed = ctx.measureText(tag).width + 56;
    if (tagX + needed > W - PAD) {
      tagX = PAD;
      y += 76;
    }
    tagX += pill(ctx, tag, tagX, y) + 16;
  }
  if (data.tags.length > 0) y += 60 + 48;

  // Paneles (solo los que tienen datos). Si la vibra no entra, se acortan primero los rankings.
  const meters: { label: string; value: number }[] = [];
  if (data.audio?.danceability != null) meters.push({ label: 'Bailabilidad', value: data.audio.danceability });
  if (data.audio?.energy != null) meters.push({ label: 'Energía', value: data.audio.energy });
  if (data.audio?.valence != null) meters.push({ label: 'Positividad', value: data.audio.valence });
  if (data.popularity) meters.push({ label: 'Popularidad', value: data.popularity.average });

  let artistRows = Math.min(5, data.topArtists.length);
  let genreRows = Math.min(3, data.topGenres.length);
  const rankingHeight = (rows: number): number => (rows > 0 ? 96 + rows * 88 + 16 + 32 : 0);
  const metersHeight = meters.length > 0 ? 96 + meters.length * METER_PITCH + 24 + 32 : 0;
  const limit = H - 120;
  while (y + rankingHeight(artistRows) + rankingHeight(genreRows) + metersHeight > limit && (artistRows > 3 || genreRows > 2)) {
    if (artistRows > 3) artistRows--;
    else genreRows--;
  }

  if (artistRows > 0) {
    const items = data.topArtists.slice(0, artistRows);
    const height = 96 + items.length * 88 + 16;
    panel(ctx, y, height, 'Artistas más repetidos');
    drawRanking(ctx, items, y + 96);
    y += height + 32;
  }

  if (genreRows > 0) {
    const items = data.topGenres.slice(0, genreRows);
    const height = 96 + items.length * 88 + 16;
    panel(ctx, y, height, 'Géneros top');
    drawRanking(ctx, items, y + 96);
    y += height + 32;
  }

  if (meters.length > 0 && y + metersHeight - 32 < limit) {
    const height = metersHeight - 32;
    panel(ctx, y, height, 'La vibra');
    drawMeters(ctx, meters, y + 100);
    y += height + 32;
  }

  // Pie
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  font(ctx, 800, 30);
  ctx.textAlign = 'center';
  ctx.fillText('Hecho con Playlist Viewer', W / 2, H - 72);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))), 'image/png');
  });
}

/** Nombre de archivo seguro a partir del nombre de la playlist. */
export function shareFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'playlist'}-resumen.png`;
}
