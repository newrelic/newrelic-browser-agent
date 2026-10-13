import path from 'path';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: '/tests/assets/test-builds/vite-react-user-frustrations',
  plugins: [react()],
  build: {
    outDir: path.resolve(import.meta.dirname, '../../../tests/assets/test-builds/vite-react-user-frustrations'),
    rollupOptions: {
      onwarn(warning, warn) {
        console.log('Vite build failed with rollup warning')
        console.error(warning)
        process.exit(1)
      }
    }
  }
});
