import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import locatorBabelJsx from '@locator/babel-jsx';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig(({ mode }) => ({
  root: path.join(__dirname, 'src/renderer'),
  publicDir: path.join(__dirname, 'src/renderer/public'),
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@preload': path.resolve(__dirname, 'src/preload'),
    },
  },
  plugins: [
    react({
      babel: {
        plugins: mode === 'development' ? [locatorBabelJsx] : [],
      },
    }),
    electron([
      {
        entry: path.join(__dirname, 'src/main/index.ts'),
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist-electron/main'),
            emptyOutDir: true,
            rollupOptions: {
              external: [
                'electron',
                'better-sqlite3',
                'uiohook-napi',
                'active-win',
                'node-mac-permissions',
              ],
            },
          },
        },
      },
      {
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist-electron/preload'),
            emptyOutDir: true,
            lib: {
              entry: path.join(__dirname, 'src/preload/index.ts'),
              formats: ['cjs'],
              fileName: () => 'index.cjs',
            },
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/dist/**', '**/dist-electron/**', '**/release/**', '**/node_modules/**'],
    },
  },
}));
