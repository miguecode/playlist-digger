/** Playlists de ejemplo incluidas en la app (carpeta public/examples). Son CSV de Exportify con el usuario anonimizado. */
export interface Example {
  /** Nombre del archivo en public/examples, sin extensión. */
  readonly id: string;
  /** Título visible; también es el nombre de la playlist al abrirla. */
  readonly title: string;
  /** Cantidad de canciones: se muestra en la tarjeta y un test comprueba que coincida con el CSV. */
  readonly tracks: number;
  /** Intérpretes que más aparecen, para dar una idea del contenido. */
  readonly artists: readonly string[];
  /** Color de la portada de la tarjeta. */
  readonly accent: 'green' | 'purple' | 'pink';
}

export const EXAMPLES: readonly Example[] = [
  { id: 'pop', title: 'pop', tracks: 193, artists: ['Dua Lipa', 'Doja Cat', 'Sabrina Carpenter'], accent: 'pink' },
  { id: 'rap', title: 'rap', tracks: 103, artists: ['Eminem', 'Dr. Dre', 'The Notorious B.I.G.'], accent: 'purple' },
  { id: 'rock', title: 'rock int', tracks: 119, artists: ['Three Days Grace', 'Linkin Park', 'Shinedown'], accent: 'green' },
];

/** Texto de la segunda línea de la tarjeta: «193 canciones · Dua Lipa, Doja Cat y más». */
export function exampleSummary(example: Example): string {
  return `${example.tracks} canciones · ${example.artists.slice(0, 2).join(', ')} y más`;
}

/** URL del CSV de un ejemplo, respetando la base de despliegue. */
export function exampleUrl(example: Pick<Example, 'id'>, base: string): string {
  return `${base}examples/${encodeURIComponent(example.id)}.csv`;
}
