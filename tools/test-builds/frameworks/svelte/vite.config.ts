import path from 'path';
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  base: '/tests/assets/test-builds/frameworks/svelte',
  plugins: [svelte()],
  build: {
    outDir: path.resolve(import.meta.dirname, '../../../../tests/assets/test-builds/frameworks/svelte'),
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, warn) {
        console.log('Vite build failed with rollup warning')
        console.error(warning)
        process.exit(1)
      }
    }
  }
});
