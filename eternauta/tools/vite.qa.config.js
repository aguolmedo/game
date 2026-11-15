// Configuracion solo para QA headless: sin HMR, asi otros procesos que editan
// src/ no recargan la pagina a mitad de un recorrido.
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  server: { hmr: false },
});
