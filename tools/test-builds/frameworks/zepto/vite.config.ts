import path from 'path';
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: '/tests/assets/test-builds/frameworks/zepto',
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'node_modules/zepto/dist/zepto.js', dest: 'lib/zepto', rename: { stripBase: 3 } }
      ]
    })
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, '../../../../tests/assets/test-builds/frameworks/zepto'),
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
