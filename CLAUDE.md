# PlaylistDigger

Visor de playlists de Spotify exportadas a CSV con [Exportify](https://exportify.net/): tabla y tarjetas con búsqueda, filtros, resumen estilo Wrapped y portadas. Todo corre en el navegador; el CSV nunca se sube. Idioma de la interfaz, los textos y los commits: español (rioplatense).

- Repo: `miguecode/playlist-digger` (rama `master`).
- Producción: https://playlistdigger.vercel.app (proyecto de Vercel `playlistdigger`, equipo `miguecode-projects`). Cada push a `master` despliega solo.
- El nombre de la app vive en `src/lib/app.ts` (`APP_NAME`, `APP_HOST`, `APP_URL`) y en `index.html` (título, landing, textos legales y metas Open Graph).

## Stack

Vite + TypeScript estricto, **sin framework**. PapaParse para el CSV, tipografía Figtree, Vitest para los tests. Sin backend.

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm test            # Vitest (todos los tests)
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + build a dist/
npm run preview     # sirve dist/ (para probar lo que se despliega)
```

Antes de cada commit: `npm run typecheck && npm test`, y `npx vite build` si se tocó CSS, `index.html` o `vercel.json`.

## Estructura

- `src/lib/`: lógica pura y testeada (CSV, filtros, orden, insights, portadas, historial). Cada módulo tiene su `*.test.ts` al lado.
- `src/ui/`: componentes de DOM a mano. `table.ts` y `card-grid.ts` usan scroll virtual; `insights-modal.ts` + `share-image.ts` arman el resumen y su imagen.
- `src/styles/`: CSS por pantalla. `src/main.ts` conecta todo.
- `public/`: favicon, `icon.svg` (ícono completo), `apple-touch-icon.png`, `og.png` (vista previa al compartir el link).

## Reglas que no hay que romper

- **CSP estricta** en `vercel.json`: nada de `style="..."` ni `<style>` inline ni scripts inline. Los estilos dinámicos se asignan por CSSOM (`el.style.x = ...`). Cualquier dominio nuevo (imágenes, fetch) hay que sumarlo a la política o el navegador lo bloquea; probarlo siempre con `vite preview`, no solo con `dev`.
- **Privacidad:** lo único que sale del navegador son los pedidos de carátulas a `open.spotify.com/oembed` (ID de canción). No agregar analítica ni otros pedidos externos.
- **Claves de almacenamiento** `playlist-viewer:*` (localStorage/sessionStorage/IndexedDB): se conservan con ese nombre aunque la app se llame distinto; renombrarlas haría perder el historial y las preferencias de los usuarios.
- **Carátulas:** salen del oEmbed de Spotify (`src/lib/covers.ts`, `src/ui/cover.ts`), solo hosts `*.scdn.co` y `*.spotifycdn.com`. Para dibujarlas en un canvas se piden con CORS y, si falla, se omiten (nunca contaminar el canvas).
- **Mobile:** punto de corte `(max-width: 760px)`. Ahí la vista por defecto son tarjetas, los enlaces están siempre activos y solo el título de la canción es enlace (los de artista, álbum y sello no funcionan en la app de Spotify).
- **Textos accesibles:** los botones solo con ícono llevan `aria-label` y `title`.

## Estilo de código

- Prettier **solo** con `--single-quote --print-width 120` (no es dependencia: `npx prettier ...`). Ojo: `src/lib/insights.ts`, `src/ui/insights-modal.ts` y `src/ui/share-image.ts` **no** están formateados con prettier; no correrles `--write` o el diff se llena de ruido. Para archivos nuevos o ya formateados, usar `--check`.
- Comentarios en español, solo cuando explican el porqué. Nada de secretos en el código.
- Si se agrega una función en `src/lib/`, va con su test. El resumen y las vistas de DOM se prueban a mano en el navegador (ver abajo).

## Probar la interfaz

No hay tests de extremo a extremo en el repo. Se prueba con Playwright contra `vite preview`:

1. `npx vite build && npx vite preview --port 4173`.
2. Cargar un CSV de Exportify en `#file-input`, abrir `#btn-insights` y recorrer las slides.
3. Para mobile, viewport de 390 px de ancho con `isMobile` y `hasTouch`.
4. Para la imagen del resumen, reemplazar `navigator.share`/`canShare` y leer el PNG que recibe.
5. Fuera de la red de Spotify, simular `https://open.spotify.com/oembed**` con `page.route` (404 para ver el caso sin carátula).

## Commits, push y deploy

- Autor: **Miguel** `<103081146+miguecode@users.noreply.github.com>` (se configura con `git config author.name` y `author.email` en el repo); el *committer* queda como Claude. Se mantiene la línea `Co-Authored-By` de Claude. No reescribir el historial anterior.
- Mensajes en español: una línea de resumen y, si hace falta, una lista con el detalle.
- Después de `git push origin master`, verificar que `git rev-parse --short HEAD` coincida con el último commit de `master` en GitHub y esperar a que el despliegue de Vercel quede en `READY` (suele tardar 1 a 2 minutos).
- Si el remote vuelve a apuntar al nombre viejo (`spotify-playlist-viewer`), corregirlo con `git remote set-url origin https://github.com/miguecode/playlist-digger`.
