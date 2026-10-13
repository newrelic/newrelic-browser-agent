import path from 'path';
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: '/tests/assets/test-builds/frameworks/angularjs',
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'node_modules/angular/angular.js', dest: 'lib/angular', rename: { stripBase: 2 } }
      ]
    })
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, '../../../../tests/assets/test-builds/frameworks/angularjs'),
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
