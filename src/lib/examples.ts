/** Playlists de ejemplo incluidas en la app (carpeta public/examples). Son CSV de Exportify con datos sin información personal. */
export interface Example {
  /** Nombre del archivo sin extensión; también es el título de la playlist al abrirla. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export const EXAMPLES: readonly Example[] = [
  { id: 'flo', title: 'flo', description: 'FLO · R&B británico · 24 canciones' },
];

/** URL del CSV de un ejemplo, respetando la base de despliegue. */
export function exampleUrl(example: Example, base: string): string {
  return `${base}examples/${encodeURIComponent(example.id)}.csv`;
}
