import path from 'path';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { RollupError } from 'rollup';

export default defineConfig({
  base: '/tests/assets/test-builds/frameworks/react',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../../../../tests/assets/test-builds/frameworks/react'),
    rollupOptions: {
      onwarn(warning, warn) {
        console.log('Vite build failed with rollup warning')
        console.error(warning)
        process.exit(1)
      }
    }
  }
});
