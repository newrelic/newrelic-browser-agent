import path from 'path';
import { defineConfig } from "vite";

export default defineConfig({
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        strict: path.resolve(__dirname, 'index.strict.html')
      },
      onwarn(warning, warn) {
        console.log('Vite build failed with rollup warning')
        console.error(warning)
        process.exit(1)
      }
    }
  }
});
