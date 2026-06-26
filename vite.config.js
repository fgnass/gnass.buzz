import { defineConfig } from 'vite';

// Multi-page app: one input per HTML entry. URLs stay '/' and '/projects/'.
// appType 'mpa' disables the SPA history fallback in dev, so the dev server
// resolves /projects/ to projects/index.html the same way Pages serves it.
//
// Shared, paint-blocking assets (buzz.js, the buzz sounds, fonts, CNAME,
// .nojekyll) live in public/ and are copied to dist/ verbatim at their
// absolute paths. buzz.js in particular must stay a classic blocking <script>
// so rollPalette() runs before first paint — bundling would defer it as a
// module and reintroduce the colour flash.
export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        projects: 'projects/index.html',
      },
    },
  },
});
