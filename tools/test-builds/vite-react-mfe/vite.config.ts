import path from 'path';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { RollupError } from 'rollup';

export default defineConfig({
  base: '/tests/assets/test-builds/vite-react-mfe',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../../../tests/assets/test-builds/vite-react-mfe'),
    rollupOptions: {
      onwarn(warning, warn) {
        console.log('Vite build failed with rollup warning')
        console.error(warning)
        process.exit(1)
      }
    }
  }
});
