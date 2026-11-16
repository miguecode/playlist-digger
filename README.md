# Playlist Viewer

Visor de playlists de Spotify exportadas a CSV con [Exportify](https://exportify.net/).
Arrastrás el CSV y obtenés una tabla interactiva con búsqueda, orden, columnas a elección y filtros.

**Todo corre en el navegador**: el archivo no se sube a ningún servidor.

## Qué hace

- **Cargar un CSV**: arrastrándolo a cualquier parte de la página o con el botón "Elegir archivo".
- **Tabla**
  - Búsqueda que ignora mayúsculas y tildes, y resalta en verde lo que coincide. Se puede escribir más de una palabra.
  - Clic en un encabezado para ordenar: ascendente → descendente → sin orden.
  - Menú "Columnas" para ocultar o mostrar (se recuerda entre visitas). Por defecto se ven Canción, Artista(s), Álbum, Lanzamiento, Duración, Género y Popularidad.
  - Las canciones explícitas llevan una "E" a la derecha del título, con su explicación al pasar el mouse.
  - Si Spotify no entregó un dato (popularidad, BPM, audio...), la celda dice "Sin dato" en vez de un 0 engañoso.
  - Scroll virtual: fluida con miles de canciones.
  - La duración lleva una etiqueta (Corta, Media, Larga, Podcast) y la popularidad se muestra con cinco estrellas que se llenan según el valor exacto, junto al número.
  - Clic en el nombre de una canción para abrirla en Spotify. Artistas, álbumes y sellos también son enlaces, pero abren una **búsqueda** en Spotify: el CSV de Exportify trae el ID de la canción y no el de los artistas, álbumes ni sellos.
  - El interruptor «Abrir en Spotify» de la barra de herramientas activa o desactiva todos esos enlaces (se recuerda entre visitas).
  - Con una playlist abierta, arriba aparece el enlace al GitHub del autor.
  - **Resumen de la playlist:** el botón «Ver resumen de tu playlist» (arriba a la derecha de la tabla) abre una ventana estilo Wrapped con el top 10 de artistas, top 5 de géneros y de álbumes, popularidad promedio con estrellas, la «vibra» (bailabilidad, energía y positividad), BPM, duración y época. Las frases («Muy popular», «Fiesta total»…) salen de umbrales en `src/lib/insights.ts`. Se calcula con toda la playlist, sin filtros, y si falta un dato (por ejemplo la popularidad) esa tarjeta no aparece.
  - **Historial:** las playlists que cargás desde un archivo quedan guardadas en este navegador (IndexedDB), hasta 20 (la landing muestra las 6 más recientes y un botón «Ver todas»); al pasar el límite se descartan las más viejas, y cargar otra con el mismo nombre la actualiza. Se ven en la landing y en el botón «Historial» de la barra superior, y se pueden quitar una a una o todas. Los ejemplos no se guardan, y una playlist de más de ~8 MB se abre pero no se guarda.
  - **F5** mantiene la playlist que estabas viendo (se recuerda por pestaña); el logo vuelve a la landing.
  - Junto al nombre de la playlist hay un botón «Buscar en Spotify» que busca ese nombre junto con quien más canciones agregó (dueño probable) entre las playlists; el CSV no trae el ID ni el dueño reales.
- **Filtros** (solo aparecen los que el CSV permite)
  - Fecha de lanzamiento (con atajos por década) y fecha en que se agregó (últimos 7 / 30 días, este año).
  - Artista, género, álbum, sello, tonalidad, compás y "agregada por", con buscador y contadores.
  - Contenido explícito.
  - Rangos: popularidad, duración, BPM, sonoridad y todas las características de audio (bailabilidad, energía, positividad, etc.).
  - Etiquetas con los filtros activos, "Limpiar todo" y exportación de la vista filtrada a CSV.
- Ícono ⓘ en cada columna y cada filtro con una explicación corta (qué es y de dónde sale el dato); funciona con mouse, toque y teclado.
- Atajo `/` para ir a la búsqueda.

## Playlists de ejemplo

La pantalla inicial explica el proceso en tres pasos y ofrece abrir una playlist de ejemplo con un clic
(Pop, Rap y Rock internacional). Para sumar una: copiá el CSV de Exportify a `public/examples/<id>.csv`,
revisá la columna "Added By" (identifica a una persona y estos archivos son públicos: en los ejemplos solo figura el usuario del autor, con su permiso)
y agregala a `EXAMPLES` en `src/lib/examples.ts`. Un test comprueba que cada ejemplo exista, sea un CSV válido,
coincida con la cantidad de canciones e intérpretes de su tarjeta y no tenga usuarios ajenos.

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm test           # tests de la lógica (CSV, formato, búsqueda, orden, filtros)
npm run build      # revisa tipos y genera dist/
```

Stack: Vite + TypeScript sin framework, [PapaParse](https://www.papaparse.com/) para leer el CSV y la fuente Figtree.

```
src/
  lib/      lógica pura y testeada (parseo, formato, búsqueda, orden, filtros)
  ui/       componentes de interfaz (tabla virtual, panel de filtros, menú de columnas)
  styles/   CSS
  main.ts   une todo
```

## Seguridad y privacidad

- El texto del CSV siempre se inserta como texto, nunca como HTML.
- `vercel.json` define una Content-Security-Policy estricta (sin scripts ni estilos en línea).
- Al exportar, los valores que empiezan con `=`, `+`, `-` o `@` se escapan para que Excel o Sheets no los interpreten como fórmulas.

## Aviso

Proyecto independiente, sin relación con Spotify. Se inspira en su estética. El único uso del isotipo de Spotify es el botón que lleva a contenido de Spotify, según sus pautas de marca.
