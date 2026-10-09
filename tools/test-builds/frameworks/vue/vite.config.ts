import path from 'path';
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: '/tests/assets/test-builds/frameworks/vue',
  plugins: [vue()],
  build: {
    outDir: path.resolve(__dirname, '../../../../tests/assets/test-builds/frameworks/vue'),
    rollupOptions: {
      onwarn(warning, warn) {
        console.log('Vite build failed with rollup warning')
        console.error(warning)
        process.exit(1)
      }
    }
  }
});
