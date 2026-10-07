import path from 'path';
import { defineConfig } from "vite";

export default defineConfig({
  base: '/tests/assets/test-builds/frameworks/backbone',
  build: {
    outDir: path.resolve(__dirname, '../../../../tests/assets/test-builds/frameworks/backbone'),
    rollupOptions: {
      onwarn(warning, warn) {
        console.log('Vite build failed with rollup warning')
        console.error(warning)
        process.exit(1)
      }
    }
  }
});
